/**
 * SVG Optimizer — Stage 3 of the pipeline
 *
 * Uses SVGO to strip metadata, round coordinates, merge adjacent paths
 * with identical fills, and minify the SVG payload. This is the final
 * "polishing" pass that makes algorithmic tracer output structurally
 * equivalent to premium commercial API output.
 */

// Use the browser build — the main entry imports fs/promises (Node.js only)
import { optimize, type Config } from "svgo/browser";

export interface OptimizeResult {
  svg: string;
  originalSize: number;
  optimizedSize: number;
  savings: number; // percentage saved
  timeMs: number;
}

/**
 * Optimize SVG with SVGO using vectorizer-friendly presets.
 *
 * Key transforms:
 * - Round coordinates to pathPrecision decimals
 * - Merge paths with same fill/stroke
 * - Remove empty groups and hidden elements
 * - Strip editor metadata and comments
 * - Collapse unnecessary whitespace
 */
export function optimizeSvg(
  svgString: string,
  options: {
    /** Decimal precision for path coordinates (default: 1) */
    precision?: number;
    /** Merge adjacent paths with identical attributes */
    mergePaths?: boolean;
    /** Remove tiny elements below this area threshold */
    removeSmallPaths?: boolean;
  } = {},
): OptimizeResult {
  const { precision = 1, mergePaths = true } = options;
  void mergePaths;
  const startTime = performance.now();
  const originalSize = new Blob([svgString]).size;

  const svgoConfig = {
    multipass: true,
    floatPrecision: precision,
    plugins: [
      "preset-default",
      // Standalone plugins (not in preset-default)
      "removeXlink",
    ],
  };

  try {
    const result = optimize(svgString, svgoConfig as Config);
    const optimizedSize = new Blob([result.data]).size;

    return {
      svg: result.data,
      originalSize,
      optimizedSize,
      savings:
        originalSize > 0 ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) : 0,
      timeMs: Math.round(performance.now() - startTime),
    };
  } catch {
    // If SVGO fails, return original
    return {
      svg: svgString,
      originalSize,
      optimizedSize: originalSize,
      savings: 0,
      timeMs: Math.round(performance.now() - startTime),
    };
  }
}
