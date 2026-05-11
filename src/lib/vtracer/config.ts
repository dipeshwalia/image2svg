/**
 * VTracer WASM configuration types.
 *
 * Derived from jsscheller/vtracer-wasm Rust source (lib.rs):
 *   - Config struct uses `#[serde(rename_all = "camelCase")]`
 *   - cornerThreshold & spliceThreshold are in RADIANS in the Rust side
 *   - We expose degrees in UI and convert at the boundary
 */

export interface VTracerConfig {
  /** If true, converts to binary (B/W) before tracing */
  binary: boolean;
  /** Path simplification mode */
  mode: "polygon" | "spline" | "pixel";
  /** Layering strategy for color output */
  hierarchical: "stacked" | "cutout";
  /** Corner detection threshold in degrees (converted to radians for WASM) */
  cornerThreshold: number;
  /** Minimum segment length before subdivision */
  lengthThreshold: number;
  /** Max iterations for path simplification */
  maxIterations: number;
  /** Splice threshold in degrees (converted to radians for WASM) */
  spliceThreshold: number;
  /** Remove clusters smaller than this area (in pixels²) */
  filterSpeckle: number;
  /** Color precision: higher = more colors preserved (0-7). WASM asserts < 8. */
  /* Maps to is_same_color_a — the bit-shift for color comparison */
  colorPrecision: number;
  /** Color difference between layers. 0 = diagonal mode. Higher = fewer layers */
  layerDifference: number;
  /** Decimal precision for path coordinates (0-8) */
  pathPrecision: number;
}

/**
 * Convert UI-facing config (degrees) to WASM-ready config (radians).
 * The WASM module expects cornerThreshold and spliceThreshold in radians.
 */
export function toWasmConfig(config: VTracerConfig): VTracerConfig {
  return {
    ...config,
    cornerThreshold: (config.cornerThreshold * Math.PI) / 180,
    spliceThreshold: (config.spliceThreshold * Math.PI) / 180,
  };
}

/** Default configuration — balanced quality/size (level 3) */
export const DEFAULT_CONFIG: VTracerConfig = {
  binary: false,
  mode: "spline",
  hierarchical: "stacked",
  cornerThreshold: 60,
  lengthThreshold: 4.0,
  maxIterations: 10,
  spliceThreshold: 45,
  filterSpeckle: 4,
  colorPrecision: 6,
  layerDifference: 16,
  pathPrecision: 2,
};

/**
 * Quality levels 1-5. Each level trades file size for visual fidelity.
 *
 *  1 = Minimal   — tiny SVG, heavy posterization, good for simple shapes
 *  2 = Low       — small SVG, some detail loss
 *  3 = Balanced  — good fidelity, reasonable file size (default)
 *  4 = High      — high fidelity, larger files
 *  5 = Ultra     — maximum color depth, largest files
 */
export const QUALITY_LEVELS: Record<number, Partial<VTracerConfig>> = {
  1: {
    mode: "polygon",
    filterSpeckle: 10,
    colorPrecision: 4,
    layerDifference: 128,
    pathPrecision: 1,
    lengthThreshold: 8,
    cornerThreshold: 45,
  },
  2: {
    mode: "polygon",
    filterSpeckle: 6,
    colorPrecision: 5,
    layerDifference: 48,
    pathPrecision: 1,
    lengthThreshold: 6,
    cornerThreshold: 50,
  },
  3: {
    mode: "spline",
    filterSpeckle: 4,
    colorPrecision: 6,
    layerDifference: 16,
    pathPrecision: 2,
    lengthThreshold: 4,
    cornerThreshold: 60,
  },
  4: {
    mode: "spline",
    filterSpeckle: 1,
    colorPrecision: 7,
    layerDifference: 2,
    pathPrecision: 3,
    lengthThreshold: 2,
    cornerThreshold: 120,
  },
  5: {
    mode: "spline",
    filterSpeckle: 0,
    colorPrecision: 7,
    layerDifference: 0, // diagonal mode — maximum color separation
    pathPrecision: 4,
    lengthThreshold: 1,
    cornerThreshold: 180,
  },
};

/** Get a full config for a quality level */
export function configForQuality(level: number): VTracerConfig {
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  return { ...DEFAULT_CONFIG, ...QUALITY_LEVELS[clamped] };
}
