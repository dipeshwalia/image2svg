import { setup, assign, fromPromise, fromCallback, assertEvent } from "xstate";
import type { VTracerConfig } from "@/lib/vtracer/config";
import type { PipelineConfig, PipelineResult } from "@/lib/pipeline";
import type { TextRegion } from "@/lib/textRemoval";

// ────────────────────────────────────────────────────────────
// Domain types
// ────────────────────────────────────────────────────────────

export type ViewMode = "split" | "original" | "svg" | "edit";
export type Engine = "vtracer" | "imagetracer";

export interface UploadedImage {
  name: string;
  width: number;
  height: number;
  size: number;
  imageData: ImageData;
  objectUrl: string;
}

/** Output produced by a vectorization run */
export interface VectorOutput {
  svg: string;
  timeMs: number;
}

/** What the vtracer worker sends back */
export interface WorkerResponse {
  id: string;
  type: "result" | "progress" | "error";
  payload: {
    svg?: string;
    progress?: number;
    error?: string;
    timeMs?: number;
  };
}

// ────────────────────────────────────────────────────────────
// Machine context
// ────────────────────────────────────────────────────────────

export interface EditorContext {
  // Image
  image: UploadedImage | null;
  // Vectorization config
  config: VTracerConfig;
  quality: number;
  engine: Engine;
  // SVG output
  rawSvg: string | null;
  editedSvg: string | null;
  vectorTimeMs: number | null;
  vectorError: string | null;
  // ImageTracer specific (separate from vtracer worker)
  itSvg: string | null;
  itTimeMs: number | null;
  // Text removal
  removeText: boolean;
  isDetectingText: boolean;
  detectedRegions: TextRegion[];
  cleanedImageData: ImageData | null;
  // Pipeline
  pipelineConfig: PipelineConfig;
  pipelineResult: PipelineResult | null;
  upscaledImageData: ImageData | null;
  isUpscaling: boolean;
  // UI
  viewMode: ViewMode;
  showAdvanced: boolean;
  isDragOver: boolean;
  zoom: number;
  pan: { x: number; y: number };
  toast: string | null;
  // vtracer worker progress (0–1)
  vtracerProgress: number;
}

// ────────────────────────────────────────────────────────────
// Events
// ────────────────────────────────────────────────────────────

export type EditorEvent =
  // Image lifecycle
  | { type: "image.loaded"; image: UploadedImage }
  | { type: "image.replaced" }
  // Vectorization
  | { type: "vectorize.start" }
  | { type: "vectorize.progress"; progress: number }
  | { type: "vectorize.done"; svg: string; timeMs: number }
  | { type: "vectorize.error"; error: string }
  | { type: "vectorize.cancel" }
  | { type: "vectorize.retry" }
  // Config
  | { type: "config.update"; updates: Partial<VTracerConfig> }
  | { type: "config.reset" }
  | { type: "quality.set"; level: number; config: VTracerConfig }
  | { type: "engine.set"; engine: Engine }
  // SVG editing
  | { type: "svg.edited"; svg: string }
  | { type: "svg.optimized"; svg: string; result: NonNullable<PipelineResult>["optimize"] }
  // Text removal
  | { type: "textRemoval.toggle"; enabled: boolean }
  | { type: "textRemoval.detecting" }
  | { type: "textRemoval.done"; regions: TextRegion[]; cleanedImageData: ImageData }
  | { type: "textRemoval.error" }
  // Upscale
  | { type: "upscale.toggle"; enabled: boolean }
  | { type: "upscale.start" }
  | {
      type: "upscale.done";
      imageData: ImageData;
      upscaledWidth: number;
      upscaledHeight: number;
      timeMs: number;
    }
  | { type: "upscale.error" }
  // Pipeline config
  | { type: "pipeline.update"; config: PipelineConfig }
  | { type: "pipeline.stageChange"; stage: string }
  // ImageTracer (runs via promise, not worker)
  | { type: "imagetracer.done"; svg: string; timeMs: number }
  | { type: "imagetracer.error"; error: string }
  // UI
  | { type: "ui.viewMode"; mode: ViewMode }
  | { type: "ui.showAdvanced"; show: boolean }
  | { type: "ui.dragOver"; active: boolean }
  | { type: "ui.zoom"; zoom: number }
  | { type: "ui.pan"; pan: { x: number; y: number } }
  | { type: "ui.resetView" }
  | { type: "ui.toast"; message: string | null };

// ────────────────────────────────────────────────────────────
// Machine
// ────────────────────────────────────────────────────────────

import { DEFAULT_CONFIG, configForQuality } from "@/lib/vtracer/config";
import { DEFAULT_PIPELINE } from "@/lib/pipeline";

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },

  actions: {
    // Image
    setImage: assign({
      image: ({ event }) => {
        assertEvent(event, "image.loaded");
        return event.image;
      },
      zoom: () => 1,
      pan: () => ({ x: 0, y: 0 }),
      detectedRegions: () => [],
      cleanedImageData: () => null,
      rawSvg: () => null,
      editedSvg: () => null,
      vectorError: () => null,
      vectorTimeMs: () => null,
      vtracerProgress: () => 0,
    }),

    // Config
    applyConfigUpdate: assign({
      config: ({ context, event }) => {
        assertEvent(event, "config.update");
        return { ...context.config, ...event.updates };
      },
    }),
    resetConfig: assign({
      config: () => DEFAULT_CONFIG,
    }),
    applyQuality: assign({
      quality: ({ event }) => {
        assertEvent(event, "quality.set");
        return event.level;
      },
      config: ({ event }) => {
        assertEvent(event, "quality.set");
        return event.config;
      },
    }),
    setEngine: assign({
      engine: ({ event }) => {
        assertEvent(event, "engine.set");
        return event.engine;
      },
    }),

    // SVG
    setRawSvg: assign({
      rawSvg: ({ event }) => {
        assertEvent(event, "vectorize.done");
        return event.svg;
      },
      vectorTimeMs: ({ event }) => {
        assertEvent(event, "vectorize.done");
        return event.timeMs;
      },
      vectorError: () => null,
      vtracerProgress: () => 1,
    }),
    setEditedSvg: assign({
      editedSvg: ({ event }) => {
        assertEvent(event, "svg.edited");
        return event.svg;
      },
    }),
    applyOptimizedSvg: assign({
      editedSvg: ({ event }) => {
        assertEvent(event, "svg.optimized");
        return event.svg;
      },
      pipelineResult: ({ context, event }) => {
        assertEvent(event, "svg.optimized");
        const prev = context.pipelineResult;
        return prev ? { ...prev, optimize: event.result } : null;
      },
    }),

    // Error
    setVectorError: assign({
      vectorError: ({ event }) => {
        assertEvent(event, "vectorize.error");
        return event.error;
      },
      vtracerProgress: () => 0,
    }),

    // Progress
    setProgress: assign({
      vtracerProgress: ({ event }) => {
        assertEvent(event, "vectorize.progress");
        return event.progress ?? 0;
      },
    }),

    // Text removal
    setDetecting: assign({ isDetectingText: () => true }),
    applyTextRemoval: assign({
      detectedRegions: ({ event }) => {
        assertEvent(event, "textRemoval.done");
        return event.regions;
      },
      cleanedImageData: ({ event }) => {
        assertEvent(event, "textRemoval.done");
        return event.cleanedImageData;
      },
      isDetectingText: () => false,
    }),
    clearTextRemoval: assign({
      isDetectingText: () => false,
    }),
    setRemoveText: assign({
      removeText: ({ event }) => {
        assertEvent(event, "textRemoval.toggle");
        return event.enabled;
      },
    }),

    // Upscale
    setUpscaling: assign({ isUpscaling: () => true }),
    applyUpscale: assign({
      upscaledImageData: ({ event }) => {
        assertEvent(event, "upscale.done");
        return event.imageData;
      },
      isUpscaling: () => false,
    }),
    clearUpscale: assign({
      isUpscaling: () => false,
      upscaledImageData: () => null,
    }),

    // Pipeline
    updatePipelineConfig: assign({
      pipelineConfig: ({ event }) => {
        assertEvent(event, "pipeline.update");
        return event.config;
      },
    }),

    // ImageTracer
    setItSvg: assign({
      itSvg: ({ event }) => {
        assertEvent(event, "imagetracer.done");
        return event.svg;
      },
      itTimeMs: ({ event }) => {
        assertEvent(event, "imagetracer.done");
        return event.timeMs;
      },
    }),

    // UI
    setViewMode: assign({
      viewMode: ({ event }) => {
        assertEvent(event, "ui.viewMode");
        return event.mode;
      },
    }),
    setShowAdvanced: assign({
      showAdvanced: ({ event }) => {
        assertEvent(event, "ui.showAdvanced");
        return event.show;
      },
    }),
    setDragOver: assign({
      isDragOver: ({ event }) => {
        assertEvent(event, "ui.dragOver");
        return event.active;
      },
    }),
    setZoom: assign({
      zoom: ({ event }) => {
        assertEvent(event, "ui.zoom");
        return event.zoom;
      },
    }),
    setPan: assign({
      pan: ({ event }) => {
        assertEvent(event, "ui.pan");
        return event.pan;
      },
    }),
    resetView: assign({
      zoom: () => 1,
      pan: () => ({ x: 0, y: 0 }),
    }),
    setToast: assign({
      toast: ({ event }) => {
        assertEvent(event, "ui.toast");
        return event.message;
      },
    }),
  },

  guards: {
    hasImage: ({ context }) => context.image !== null,
    hasRawSvg: ({ context }) => context.rawSvg !== null,
  },
}).createMachine({
  id: "editor",
  initial: "idle",

  context: {
    image: null,
    config: configForQuality(1),
    quality: 1,
    engine: "vtracer",
    rawSvg: null,
    editedSvg: null,
    vectorTimeMs: null,
    vectorError: null,
    itSvg: null,
    itTimeMs: null,
    removeText: false,
    isDetectingText: false,
    detectedRegions: [],
    cleanedImageData: null,
    pipelineConfig: DEFAULT_PIPELINE,
    pipelineResult: null,
    upscaledImageData: null,
    isUpscaling: false,
    viewMode: "split",
    showAdvanced: false,
    isDragOver: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    toast: null,
    vtracerProgress: 0,
  },

  // These events are accepted in every state
  on: {
    "ui.dragOver": { actions: ["setDragOver"] },
    "ui.zoom": { actions: ["setZoom"] },
    "ui.pan": { actions: ["setPan"] },
    "ui.resetView": { actions: ["resetView"] },
    "ui.toast": { actions: ["setToast"] },
    "ui.showAdvanced": { actions: ["setShowAdvanced"] },
    "pipeline.update": { actions: ["updatePipelineConfig"] },
    "svg.edited": { actions: ["setEditedSvg"] },
    "svg.optimized": { actions: ["applyOptimizedSvg"] },
    "textRemoval.detecting": { actions: ["setDetecting"] },
    "textRemoval.done": { actions: ["applyTextRemoval"] },
    "textRemoval.error": { actions: ["clearTextRemoval"] },
    "upscale.done": { actions: ["applyUpscale"] },
    "upscale.error": { actions: ["clearUpscale"] },
    "upscale.start": { actions: ["setUpscaling"] },
    "imagetracer.done": { actions: ["setItSvg"] },
  },

  states: {
    idle: {
      tags: ["noImage"],
      on: {
        "image.loaded": {
          target: "ready",
          actions: ["setImage"],
        },
      },
    },

    ready: {
      tags: ["hasImage"],
      on: {
        "image.loaded": {
          // Replace image
          target: "ready",
          actions: ["setImage"],
        },
        "vectorize.start": {
          target: "processing",
        },
        "config.update": { actions: ["applyConfigUpdate"] },
        "config.reset": { actions: ["resetConfig"] },
        "quality.set": { actions: ["applyQuality"] },
        "engine.set": { actions: ["setEngine"] },
        "textRemoval.toggle": { actions: ["setRemoveText"] },
        "ui.viewMode": { actions: ["setViewMode"] },
      },
    },

    processing: {
      tags: ["hasImage", "loading"],
      on: {
        "image.loaded": {
          // Allow replacing mid-flight — go back to ready
          target: "ready",
          actions: ["setImage"],
        },
        "vectorize.progress": { actions: ["setProgress"] },
        "vectorize.done": {
          target: "done",
          actions: ["setRawSvg"],
        },
        "vectorize.error": {
          target: "error",
          actions: ["setVectorError"],
        },
        "vectorize.cancel": {
          target: "ready",
        },
        "config.update": { actions: ["applyConfigUpdate"] },
        "quality.set": { actions: ["applyQuality"] },
        "engine.set": { actions: ["setEngine"] },
        "textRemoval.toggle": { actions: ["setRemoveText"] },
        "ui.viewMode": { actions: ["setViewMode"] },
      },
    },

    done: {
      tags: ["hasImage", "hasSvg"],
      on: {
        "image.loaded": {
          target: "ready",
          actions: ["setImage"],
        },
        "vectorize.start": {
          target: "processing",
        },
        "config.update": { actions: ["applyConfigUpdate"] },
        "config.reset": { actions: ["resetConfig"] },
        "quality.set": { actions: ["applyQuality"] },
        "engine.set": { actions: ["setEngine"] },
        "textRemoval.toggle": { actions: ["setRemoveText"] },
        "ui.viewMode": { actions: ["setViewMode"] },
      },
    },

    error: {
      tags: ["hasImage"],
      on: {
        "vectorize.retry": {
          target: "processing",
        },
        "image.loaded": {
          target: "ready",
          actions: ["setImage"],
        },
        "config.update": { actions: ["applyConfigUpdate"] },
        "engine.set": { actions: ["setEngine"] },
        "ui.viewMode": { actions: ["setViewMode"] },
      },
    },
  },
});
