"use client";

import { useEffect, useRef, useCallback } from "react";
import { createActor } from "xstate";
import { useMachine } from "@xstate/react";
import { editorMachine, type WorkerResponse, type UploadedImage } from "@/lib/editorMachine";
import type { VTracerConfig } from "@/lib/vtracer/config";
import { detectAndRemoveText } from "@/lib/textRemoval";
import { upscaleImage } from "@/lib/upscaler";
import { vectorizeWithImageTracer, IMAGETRACER_HIGH } from "@/lib/imageTracer";
import { optimizeSvg } from "@/lib/svgOptimizer";

let requestCounter = 0;

export function useEditorMachine() {
  const [snapshot, send] = useMachine(editorMachine);

  // ── vtracer worker ────────────────────────────────────────────
  const workerRef = useRef<Worker | null>(null);
  const currentReqId = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const worker = new Worker("/vtracer-worker.js");

    worker.addEventListener("message", (ev: MessageEvent<WorkerResponse>) => {
      const { id, type, payload } = ev.data;
      if (id !== currentReqId.current && id !== "__init__") return;

      switch (type) {
        case "progress":
          send({ type: "vectorize.progress", progress: payload.progress ?? 0 });
          break;
        case "result":
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          currentReqId.current = null;
          send({
            type: "vectorize.done",
            svg: payload.svg ?? "",
            timeMs: payload.timeMs ?? 0,
          });
          break;
        case "error":
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          currentReqId.current = null;
          send({ type: "vectorize.error", error: payload.error ?? "Unknown error" });
          break;
      }
    });

    worker.addEventListener("error", (ev) => {
      send({ type: "vectorize.error", error: `Worker error: ${ev.message}` });
    });

    workerRef.current = worker;
    return () => {
      worker.terminate();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [send]);

  // ── After rawSvg changes, run SVGO if enabled ─────────────────
  const rawSvg = snapshot.context.rawSvg;
  const pipelineConfig = snapshot.context.pipelineConfig;

  useEffect(() => {
    if (!rawSvg) return;
    if (pipelineConfig.optimize.enabled) {
      const result = optimizeSvg(rawSvg, {
        precision: pipelineConfig.optimize.precision,
        mergePaths: pipelineConfig.optimize.mergePaths,
      });
      send({ type: "svg.optimized", svg: result.svg, result });
    } else {
      send({ type: "svg.edited", svg: rawSvg });
    }
  }, [rawSvg, pipelineConfig.optimize, send]);

  // ── Internal helpers ──────────────────────────────────────────

  /** Dispatch a vectorize request to the right engine */
  const dispatchVectorize = useCallback(
    (imageData: ImageData, cfg: VTracerConfig, quality: number) => {
      const engine = snapshot.context.engine;

      send({ type: "vectorize.start" });

      if (engine === "vtracer") {
        if (!workerRef.current) return;
        const id = `req_${++requestCounter}_${Date.now()}`;
        currentReqId.current = id;
        const buf = imageData.data.buffer.slice(0);
        workerRef.current.postMessage(
          {
            id,
            type: "vectorize",
            payload: {
              imageData: buf,
              width: imageData.width,
              height: imageData.height,
              config: cfg,
            },
          },
          [buf],
        );
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (currentReqId.current === id) {
            currentReqId.current = null;
            send({
              type: "vectorize.error",
              error: "Vectorization timed out (>30s). Try reducing image size or simpler settings.",
            });
          }
        }, 30_000);
      } else {
        // ImageTracer
        const numColors =
          quality <= 1 ? 16 : quality === 2 ? 24 : quality === 3 ? 32 : quality === 4 ? 48 : 64;

        let inputData = imageData;
        const pixels = imageData.width * imageData.height;
        if (pixels > 500_000) {
          const scale = Math.sqrt(500_000 / pixels);
          const cv = document.createElement("canvas");
          cv.width = Math.round(imageData.width * scale);
          cv.height = Math.round(imageData.height * scale);
          const ctx = cv.getContext("2d")!;
          const src = document.createElement("canvas");
          src.width = imageData.width;
          src.height = imageData.height;
          src.getContext("2d")!.putImageData(imageData, 0, 0);
          ctx.drawImage(src, 0, 0, cv.width, cv.height);
          inputData = ctx.getImageData(0, 0, cv.width, cv.height);
        }

        send({
          type: "ui.toast",
          message: `ImageTracer: ${inputData.width}×${inputData.height}, ${numColors} colors…`,
        });

        vectorizeWithImageTracer(inputData, { ...IMAGETRACER_HIGH, numberofcolors: numColors })
          .then((r) => {
            send({ type: "imagetracer.done", svg: r.svg, timeMs: r.timeMs });
            send({ type: "vectorize.done", svg: r.svg, timeMs: r.timeMs });
            send({ type: "ui.toast", message: `ImageTracer: ${r.timeMs}ms` });
          })
          .catch((err: Error) => {
            send({ type: "vectorize.error", error: err.message });
            send({ type: "ui.toast", message: `ImageTracer failed: ${err.message}` });
          });
      }
    },
    [snapshot.context.engine, send],
  );

  // ── Public API ────────────────────────────────────────────────

  /** Load an image file: validates, parses, then auto-vectorizes */
  const loadImage = useCallback(
    async (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        send({ type: "ui.toast", message: "File too large. Maximum size is 20MB." });
        return;
      }
      if (
        !["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"].includes(file.type)
      ) {
        send({ type: "ui.toast", message: "Unsupported format. Use PNG, JPG, WebP, BMP, or GIF." });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const uploaded: UploadedImage = {
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          imageData,
          objectUrl,
        };

        send({ type: "image.loaded", image: uploaded });

        const { config, quality, removeText } = snapshot.context;

        if (removeText) {
          runTextRemoval(imageData, config, quality);
        } else {
          dispatchVectorize(imageData, config, quality);
        }
      };

      img.onerror = () => {
        send({ type: "ui.toast", message: "Failed to load image. File may be corrupted." });
        URL.revokeObjectURL(objectUrl);
      };

      img.src = objectUrl;
    },
    [snapshot.context, send, dispatchVectorize],
  );

  /** Run text removal then vectorize the cleaned image */
  const runTextRemoval = useCallback(
    async (imageData: ImageData, cfg: VTracerConfig, quality: number) => {
      send({ type: "textRemoval.detecting" });
      try {
        const result = await detectAndRemoveText(imageData, { minConfidence: 40, padding: 3 });
        send({
          type: "textRemoval.done",
          regions: result.regions,
          cleanedImageData: result.cleanedImageData,
        });
        send({
          type: "ui.toast",
          message: `Found ${result.regions.length} text regions (${result.timeMs}ms)`,
        });
        dispatchVectorize(result.cleanedImageData, cfg, quality);
      } catch {
        send({ type: "textRemoval.error" });
        send({ type: "ui.toast", message: "Text detection failed. Vectorizing original." });
        dispatchVectorize(imageData, cfg, quality);
      }
    },
    [send, dispatchVectorize],
  );

  /** Toggle text removal; re-runs vectorization if image is present */
  const toggleRemoveText = useCallback(
    (enabled: boolean) => {
      send({ type: "textRemoval.toggle", enabled });
      const { image, config, quality, cleanedImageData } = snapshot.context;
      if (!image) return;

      if (enabled) {
        runTextRemoval(image.imageData, config, quality);
      } else {
        send({ type: "textRemoval.done", regions: [], cleanedImageData: image.imageData });
        dispatchVectorize(image.imageData, config, quality);
      }
    },
    [snapshot.context, send, dispatchVectorize, runTextRemoval],
  );

  /** Toggle upscale; re-runs vectorization on completion */
  const toggleUpscale = useCallback(
    async (enabled: boolean) => {
      const {
        image,
        config,
        quality,
        pipelineConfig: pc,
        removeText,
        cleanedImageData,
      } = snapshot.context;
      const updated = { ...pc, upscale: { ...pc.upscale, enabled } };
      send({ type: "pipeline.update", config: updated });
      if (!image) return;

      if (enabled) {
        send({ type: "upscale.start" });
        try {
          const result = await upscaleImage(image.imageData, pc.upscale.scale, pc.upscale.useAI);
          send({
            type: "upscale.done",
            imageData: result.imageData,
            upscaledWidth: result.upscaledWidth,
            upscaledHeight: result.upscaledHeight,
            timeMs: result.timeMs,
          });
          send({
            type: "ui.toast",
            message: `Upscaled (Canvas) to ${result.upscaledWidth}×${result.upscaledHeight} in ${result.timeMs}ms`,
          });
          const imgData = removeText && cleanedImageData ? cleanedImageData : result.imageData;
          dispatchVectorize(imgData, config, quality);
        } catch {
          send({ type: "upscale.error" });
          send({ type: "ui.toast", message: "Upscale failed, using original." });
          dispatchVectorize(image.imageData, config, quality);
        }
      } else {
        send({ type: "upscale.error" }); // resets upscaledImageData
        const imgData = removeText && cleanedImageData ? cleanedImageData : image.imageData;
        dispatchVectorize(imgData, config, quality);
      }
    },
    [snapshot.context, send, dispatchVectorize],
  );

  /** Debounced re-vectorize triggered by config changes */
  const updateConfig = useCallback(
    (updates: Partial<VTracerConfig>) => {
      send({ type: "config.update", updates });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const { image, removeText, cleanedImageData, quality } = snapshot.context;
      if (image) {
        const newConfig = { ...snapshot.context.config, ...updates };
        debounceRef.current = setTimeout(() => {
          const imgData = removeText && cleanedImageData ? cleanedImageData : image.imageData;
          dispatchVectorize(imgData, newConfig, quality);
        }, 300);
      }
    },
    [snapshot.context, send, dispatchVectorize],
  );

  /** Reset config to defaults and re-vectorize */
  const resetConfig = useCallback(() => {
    send({ type: "config.reset" });
    const { image, removeText, cleanedImageData, quality } = snapshot.context;
    if (image) {
      const imgData = removeText && cleanedImageData ? cleanedImageData : image.imageData;
      // config is reset inside machine; DEFAULT_CONFIG used here directly
      import("@/lib/vtracer/config").then(({ DEFAULT_CONFIG }) =>
        dispatchVectorize(imgData, DEFAULT_CONFIG, quality),
      );
    }
  }, [snapshot.context, send, dispatchVectorize]);

  /** Switch engine and immediately re-vectorize */
  const switchEngine = useCallback(
    (engine: typeof snapshot.context.engine) => {
      send({ type: "engine.set", engine });
      const { image, config, quality, removeText, cleanedImageData } = snapshot.context;
      if (image) {
        const imgData = removeText && cleanedImageData ? cleanedImageData : image.imageData;
        // dispatchVectorize reads engine from snapshot; engine state update is sync with send
        setTimeout(() => dispatchVectorize(imgData, config, quality), 0);
      }
    },
    [snapshot.context, send, dispatchVectorize],
  );

  /** Set quality level (updates config preset) and debounce re-vectorize */
  const setQuality = useCallback(
    (level: number) => {
      import("@/lib/vtracer/config").then(({ configForQuality }) => {
        const newConfig = configForQuality(level);
        send({ type: "quality.set", level, config: newConfig });
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const { image, removeText, cleanedImageData } = snapshot.context;
        if (image) {
          debounceRef.current = setTimeout(() => {
            const imgData = removeText && cleanedImageData ? cleanedImageData : image.imageData;
            dispatchVectorize(imgData, newConfig, level);
          }, 200);
        }
      });
    },
    [snapshot.context, send, dispatchVectorize],
  );

  /** Cancel an in-flight vtracer request */
  const cancelVectorize = useCallback(() => {
    currentReqId.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    send({ type: "vectorize.cancel" });
  }, [send]);

  /** Show a toast for 3 seconds */
  const showToast = useCallback(
    (message: string) => {
      send({ type: "ui.toast", message });
      setTimeout(() => send({ type: "ui.toast", message: null }), 3000);
    },
    [send],
  );

  // ── Derived state ─────────────────────────────────────────────
  const ctx = snapshot.context;

  /** Active SVG (edited > raw) */
  const svg = ctx.editedSvg ?? ctx.rawSvg;

  /** Whether the active engine is currently running */
  const isProcessing = snapshot.hasTag("loading");

  /** Timing for current output */
  const timeMs = ctx.engine === "vtracer" ? ctx.vectorTimeMs : ctx.itTimeMs;

  return {
    snapshot,
    send,
    // context shortcuts
    ctx,
    svg,
    isProcessing,
    timeMs,
    // actions
    loadImage,
    toggleRemoveText,
    toggleUpscale,
    updateConfig,
    resetConfig,
    switchEngine,
    setQuality,
    cancelVectorize,
    showToast,
  };
}
