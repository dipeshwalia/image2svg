"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VTracerConfig } from "@/lib/vtracer/config";

export interface VTracerState {
  svg: string | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  timeMs: number | null;
}

interface WorkerResponse {
  id: string;
  type: "result" | "progress" | "error";
  payload: {
    svg?: string;
    progress?: number;
    error?: string;
    timeMs?: number;
  };
}

interface UseVTracerReturn extends VTracerState {
  vectorize: (imageData: ImageData, config: VTracerConfig) => void;
  cancel: () => void;
}

let requestCounter = 0;

export function useVTracer(): UseVTracerReturn {
  const workerRef = useRef<Worker | null>(null);
  const currentRequestId = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<VTracerState>({
    svg: null,
    isProcessing: false,
    progress: 0,
    error: null,
    timeMs: null,
  });

  // Initialize worker from public/ directory
  useEffect(() => {
    const worker = new Worker("/vtracer-worker.js");

    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const { id, type, payload } = event.data;

      // Ignore responses for stale requests
      if (id !== currentRequestId.current && id !== "__init__") return;

      switch (type) {
        case "progress":
          setState((prev) => ({ ...prev, progress: payload.progress ?? 0 }));
          break;

        case "result":
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setState({
            svg: payload.svg ?? null,
            isProcessing: false,
            progress: 1,
            error: null,
            timeMs: payload.timeMs ?? null,
          });
          currentRequestId.current = null;
          break;

        case "error":
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            progress: 0,
            error: payload.error ?? "Unknown error",
          }));
          currentRequestId.current = null;
          break;
      }
    });

    worker.addEventListener("error", (event) => {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: `Worker error: ${event.message}`,
      }));
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const vectorize = useCallback((imageData: ImageData, config: VTracerConfig) => {
    if (!workerRef.current) return;

    const id = `req_${++requestCounter}_${Date.now()}`;
    currentRequestId.current = id;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setState({
      svg: null,
      isProcessing: true,
      progress: 0,
      error: null,
      timeMs: null,
    });

    // Extract pixel data as transferable ArrayBuffer
    const pixelBuffer = imageData.data.buffer.slice(0);

    workerRef.current.postMessage(
      {
        id,
        type: "vectorize",
        payload: {
          imageData: pixelBuffer,
          width: imageData.width,
          height: imageData.height,
          config,
        },
      },
      [pixelBuffer],
    );

    // 30s timeout
    timeoutRef.current = setTimeout(() => {
      if (currentRequestId.current === id) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: "Vectorization timed out (>30s). Try reducing image size or simpler settings.",
        }));
        currentRequestId.current = null;
      }
    }, 30000);
  }, []);

  const cancel = useCallback(() => {
    currentRequestId.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState((prev) => ({
      ...prev,
      isProcessing: false,
      progress: 0,
    }));
  }, []);

  return {
    ...state,
    vectorize,
    cancel,
  };
}
