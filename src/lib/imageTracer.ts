/**
 * ImageTracer Engine — Alternative vectorizer using color quantization + contour tracing.
 *
 * Runs imagetracerjs in a Web Worker to prevent UI freezing.
 * Different algorithm than VTracer — often better for detailed UI/text content
 * because it uses k-means color quantization rather than hierarchical clustering.
 */

export interface ImageTracerOptions {
  /** Number of colors in the palette (2-256) */
  numberofcolors: number;
  /** Color sampling method: 0=disabled, 1=random, 2=deterministic */
  colorsampling: number;
  /** Number of color quantization cycles (higher = more accurate) */
  colorquantcycles: number;
  /** Line tracing threshold */
  ltres: number;
  /** Quadratic spline tracing threshold */
  qtres: number;
  /** Path omit: discard paths shorter than this */
  pathomit: number;
  /** Blur radius (0-5) */
  blurradius: number;
  /** Blur delta (0-1024) */
  blurdelta: number;
}

export const IMAGETRACER_DEFAULTS: ImageTracerOptions = {
  numberofcolors: 64,
  colorsampling: 2,
  colorquantcycles: 5,
  ltres: 0.5,
  qtres: 0.5,
  pathomit: 4,
  blurradius: 0,
  blurdelta: 20,
};

/** High-fidelity preset for detailed images */
export const IMAGETRACER_HIGH: ImageTracerOptions = {
  numberofcolors: 128,
  colorsampling: 2,
  colorquantcycles: 8,
  ltres: 0.1,
  qtres: 0.1,
  pathomit: 2,
  blurradius: 0,
  blurdelta: 20,
};

// Worker management
let worker: Worker | null = null;
let messageId = 0;
const pendingRequests = new Map<
  number,
  { resolve: (v: { svg: string; timeMs: number }) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/imagetracer-worker.js");
    worker.onmessage = (e) => {
      const { id, svg, timeMs, error } = e.data;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve({ svg, timeMs });
      }
    };
    worker.onerror = (e) => {
      // Reject all pending
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error(e.message || "Worker error"));
        pendingRequests.delete(id);
      }
    };
  }
  return worker;
}

/**
 * Vectorize an ImageData using ImageTracerJS in a Web Worker.
 *
 * @returns SVG string + timing
 */
export async function vectorizeWithImageTracer(
  imageData: ImageData,
  options: Partial<ImageTracerOptions> = {},
): Promise<{ svg: string; timeMs: number }> {
  const w = getWorker();
  const id = ++messageId;
  const opts = { ...IMAGETRACER_DEFAULTS, ...options };

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });

    // Timeout after 60s to prevent hanging
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("ImageTracer timed out (60s)"));
        // Kill and recreate worker
        worker?.terminate();
        worker = null;
      }
    }, 60000);

    const wrappedResolve = (v: { svg: string; timeMs: number }) => {
      clearTimeout(timeout);
      resolve(v);
    };
    const wrappedReject = (e: Error) => {
      clearTimeout(timeout);
      reject(e);
    };

    pendingRequests.set(id, { resolve: wrappedResolve, reject: wrappedReject });

    w.postMessage({ id, imageData, options: opts });
  });
}
