/**
 * Text Detection & Removal Pipeline
 *
 * Loads Tesseract.js from CDN at runtime to avoid bundler issues
 * (tesseract.js uses Node.js-specific worker spawning internally).
 *
 * Strategy: Load the UMD build via script tag → use global Tesseract.recognize()
 * → extract word bounding boxes → inpaint with edge-sampled colors.
 */

export interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export interface TextDetectionResult {
  regions: TextRegion[];
  count: number;
  timeMs: number;
}

// CDN script loading
let loadPromise: Promise<void> | null = null;

function loadTesseractFromCDN(): Promise<void> {
  if (loadPromise) return loadPromise;

  // Check if already loaded
  if ((window as unknown as Record<string, unknown>).Tesseract) {
    return Promise.resolve();
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Tesseract.js from CDN"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

interface TesseractGlobal {
  createWorker: (
    lang: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<{
    recognize: (image: HTMLCanvasElement) => Promise<{
      data: {
        blocks?: Array<{
          paragraphs: Array<{
            lines: Array<{
              words: Array<{
                text: string;
                confidence: number;
                bbox: { x0: number; y0: number; x1: number; y1: number };
              }>;
            }>;
          }>;
        }>;
      };
    }>;
    terminate: () => Promise<void>;
  }>;
}

/**
 * Detect text regions in an image using Tesseract OCR.
 */
export async function detectText(
  imageData: ImageData,
  minConfidence: number = 40,
): Promise<TextDetectionResult> {
  const startTime = performance.now();

  // Load Tesseract.js from CDN
  await loadTesseractFromCDN();
  const Tess = (window as unknown as Record<string, unknown>).Tesseract as TesseractGlobal;

  if (!Tess) {
    throw new Error("Tesseract.js not available");
  }

  // Convert ImageData to canvas
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  // Create worker and recognize
  const worker = await Tess.createWorker("eng");
  const result = await worker.recognize(canvas);
  await worker.terminate();

  const regions: TextRegion[] = [];
  const page = result.data;

  if (page.blocks) {
    for (const block of page.blocks) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const word of line.words) {
            if (word.confidence >= minConfidence && word.text.trim().length > 0) {
              regions.push({
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0,
                text: word.text,
                confidence: word.confidence,
              });
            }
          }
        }
      }
    }
  }

  return {
    regions,
    count: regions.length,
    timeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Remove text regions by inpainting with edge-sampled background colors.
 */
export function removeTextRegions(
  imageData: ImageData,
  regions: TextRegion[],
  padding: number = 2,
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );
  const data = output.data;
  const w = imageData.width;
  const h = imageData.height;

  for (const region of regions) {
    const x0 = Math.max(0, region.x - padding);
    const y0 = Math.max(0, region.y - padding);
    const x1 = Math.min(w - 1, region.x + region.width + padding);
    const y1 = Math.min(h - 1, region.y + region.height + padding);

    const bgColor = sampleEdgeColor(data, w, h, x0, y0, x1, y1);

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = bgColor.r;
        data[idx + 1] = bgColor.g;
        data[idx + 2] = bgColor.b;
        data[idx + 3] = bgColor.a;
      }
    }
  }

  return output;
}

function sampleEdgeColor(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { r: number; g: number; b: number; a: number } {
  const samples: { r: number; g: number; b: number; a: number }[] = [];
  const offset = 3;

  for (let x = x0; x <= x1; x += 2) {
    const y = Math.max(0, y0 - offset);
    const idx = (y * imgW + x) * 4;
    samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] });
  }
  for (let x = x0; x <= x1; x += 2) {
    const y = Math.min(imgH - 1, y1 + offset);
    const idx = (y * imgW + x) * 4;
    samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] });
  }
  for (let y = y0; y <= y1; y += 2) {
    const x = Math.max(0, x0 - offset);
    const idx = (y * imgW + x) * 4;
    samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] });
  }
  for (let y = y0; y <= y1; y += 2) {
    const x = Math.min(imgW - 1, x1 + offset);
    const idx = (y * imgW + x) * 4;
    samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] });
  }

  if (samples.length === 0) {
    return { r: 255, g: 255, b: 255, a: 255 };
  }

  samples.sort((a, b) => a.r + a.g + a.b - (b.r + b.g + b.b));
  return samples[Math.floor(samples.length / 2)];
}

/**
 * Merge overlapping/adjacent text regions.
 */
export function mergeOverlappingRegions(regions: TextRegion[], mergeGap: number = 4): TextRegion[] {
  if (regions.length <= 1) return regions;

  const sorted = [...regions].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: TextRegion[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    const overlapsX =
      current.x <= last.x + last.width + mergeGap && current.x + current.width >= last.x - mergeGap;
    const overlapsY =
      current.y <= last.y + last.height + mergeGap &&
      current.y + current.height >= last.y - mergeGap;

    if (overlapsX && overlapsY) {
      const newX = Math.min(last.x, current.x);
      const newY = Math.min(last.y, current.y);
      merged[merged.length - 1] = {
        x: newX,
        y: newY,
        width: Math.max(last.x + last.width, current.x + current.width) - newX,
        height: Math.max(last.y + last.height, current.y + current.height) - newY,
        text: last.text + " " + current.text,
        confidence: Math.min(last.confidence, current.confidence),
      };
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Full pipeline: detect text → merge regions → remove text → return clean ImageData
 */
export async function detectAndRemoveText(
  imageData: ImageData,
  options: {
    minConfidence?: number;
    padding?: number;
    mergeGap?: number;
  } = {},
): Promise<{
  cleanedImageData: ImageData;
  regions: TextRegion[];
  timeMs: number;
}> {
  const { minConfidence = 40, padding = 3, mergeGap = 4 } = options;

  const detection = await detectText(imageData, minConfidence);
  const merged = mergeOverlappingRegions(detection.regions, mergeGap);
  const cleanedImageData = removeTextRegions(imageData, merged, padding);

  return {
    cleanedImageData,
    regions: merged,
    timeMs: detection.timeMs,
  };
}
