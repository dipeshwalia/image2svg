/**
 * Vectorization Pipeline Orchestrator
 *
 * 3-stage pipeline that simulates deep learning comprehension:
 *   Stage 1: Upscale + Denoise (Canvas sharpen)
 *   Stage 2: Mathematical Vectorization (VTracer WASM)
 *   Stage 3: Topological Optimization (SVGO)
 *
 * Each stage can be independently toggled. The pipeline produces
 * output structurally equivalent to premium commercial APIs.
 */

import { upscaleImage, type UpscaleResult } from "./upscaler";
import { optimizeSvg, type OptimizeResult } from "./svgOptimizer";

export interface PipelineConfig {
  /** Stage 1: Upscale before tracing */
  upscale: {
    enabled: boolean;
    scale: number; // 2 or 4
    useAI: boolean; // Kept for API compatibility
  };
  /** Stage 3: Optimize SVG after tracing */
  optimize: {
    enabled: boolean;
    precision: number;
    mergePaths: boolean;
  };
}

export const DEFAULT_PIPELINE: PipelineConfig = {
  upscale: {
    enabled: false,
    scale: 2,
    useAI: true,
  },
  optimize: {
    enabled: true,
    precision: 1,
    mergePaths: true,
  },
};

export type PipelineStage = "idle" | "upscaling" | "vectorizing" | "optimizing" | "done" | "error";

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  /** 0-1 overall progress */
  progress: number;
}

export interface PipelineResult {
  /** Final SVG string */
  svg: string;
  /** ImageData that was actually vectorized (may be upscaled) */
  vectorizedImageData: ImageData;
  /** Stage results for display */
  upscale?: UpscaleResult;
  optimize?: OptimizeResult;
  /** Total pipeline time */
  totalTimeMs: number;
}

/**
 * Run the full vectorization pipeline.
 *
 * @param imageData - Raw source image
 * @param pipelineConfig - Which stages to enable
 * @param vectorizeFn - The VTracer vectorize function (Stage 2)
 * @param onProgress - Progress callback
 */
export async function runPipeline(
  imageData: ImageData,
  pipelineConfig: PipelineConfig,
  vectorizeFn: (imageData: ImageData) => Promise<string>,
  onProgress?: (progress: PipelineProgress) => void,
): Promise<PipelineResult> {
  const startTime = performance.now();
  let currentImageData = imageData;
  let upscaleResult: UpscaleResult | undefined;
  let optimizeResult: OptimizeResult | undefined;

  // ---- Stage 1: AI Upscale ----
  if (pipelineConfig.upscale.enabled) {
    onProgress?.({
      stage: "upscaling",
      message: "Upscaling with sharpening…",
      progress: 0.1,
    });

    upscaleResult = await upscaleImage(
      imageData,
      pipelineConfig.upscale.scale,
      pipelineConfig.upscale.useAI,
    );
    currentImageData = upscaleResult.imageData;
  }

  // ---- Stage 2: VTracer ----
  onProgress?.({
    stage: "vectorizing",
    message: `Tracing ${currentImageData.width}×${currentImageData.height} image…`,
    progress: 0.4,
  });

  const svg = await vectorizeFn(currentImageData);

  // ---- Stage 3: SVGO Optimize ----
  let finalSvg = svg;

  if (pipelineConfig.optimize.enabled) {
    onProgress?.({
      stage: "optimizing",
      message: "Optimizing SVG topology…",
      progress: 0.85,
    });

    optimizeResult = optimizeSvg(svg, {
      precision: pipelineConfig.optimize.precision,
      mergePaths: pipelineConfig.optimize.mergePaths,
    });
    finalSvg = optimizeResult.svg;
  }

  onProgress?.({
    stage: "done",
    message: "Pipeline complete",
    progress: 1.0,
  });

  return {
    svg: finalSvg,
    vectorizedImageData: currentImageData,
    upscale: upscaleResult,
    optimize: optimizeResult,
    totalTimeMs: Math.round(performance.now() - startTime),
  };
}
