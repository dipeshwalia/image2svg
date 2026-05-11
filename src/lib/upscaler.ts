/**
 * Image Upscaler — Stage 1 of the pipeline
 *
 * Uses high-quality Canvas bicubic upscale + sharpen.
 *
 * The goal is to produce a pristine, high-res raster with razor-sharp color
 * demarcations so VTracer's curve-fitting won't be distracted by JPEG
 * artifacts, blur, or anti-aliasing noise.
 */

export interface UpscaleResult {
  imageData: ImageData;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  scale: number;
  method: "canvas";
  timeMs: number;
}

/**
 * Upscale an image using Canvas.
 *
 * @param imageData - Source image data
 * @param scale - Target upscale factor (2x or 4x recommended)
 * @param useAI - Kept for API compatibility; currently ignored
 */
export async function upscaleImage(
  imageData: ImageData,
  scale: number = 2,
  useAI: boolean = true,
): Promise<UpscaleResult> {
  void useAI;
  const startTime = performance.now();
  const originalWidth = imageData.width;
  const originalHeight = imageData.height;

  // Limit max dimensions to prevent OOM
  const maxDim = 4096;
  const effectiveScale = Math.min(scale, maxDim / Math.max(originalWidth, originalHeight));

  const result = upscaleWithCanvas(imageData, effectiveScale);
  return {
    ...result,
    originalWidth,
    originalHeight,
    scale: effectiveScale,
    method: "canvas",
    timeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * High-quality canvas upscale with sharpening.
 *
 * Uses multi-step downscaling for quality (Lanczos-like via browser's
 * imageSmoothingQuality: "high"), then applies an unsharp mask to
 * restore edge definition that VTracer needs.
 */
function upscaleWithCanvas(
  imageData: ImageData,
  scale: number,
): { imageData: ImageData; upscaledWidth: number; upscaledHeight: number } {
  const newWidth = Math.round(imageData.width * scale);
  const newHeight = Math.round(imageData.height * scale);

  // Source canvas
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) {
    throw new Error("Failed to create 2D canvas context for upscale source.");
  }
  srcCtx.putImageData(imageData, 0, 0);

  // Upscale canvas
  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = newWidth;
  dstCanvas.height = newHeight;
  const dstCtx = dstCanvas.getContext("2d");
  if (!dstCtx) {
    throw new Error("Failed to create 2D canvas context for upscale destination.");
  }
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = "high";
  dstCtx.drawImage(srcCanvas, 0, 0, newWidth, newHeight);

  // Get upscaled image data
  let upscaled = dstCtx.getImageData(0, 0, newWidth, newHeight);

  // Apply unsharp mask for edge sharpening
  upscaled = unsharpMask(upscaled, 1.0, 0.5);

  return {
    imageData: upscaled,
    upscaledWidth: newWidth,
    upscaledHeight: newHeight,
  };
}

/**
 * Simple unsharp mask: sharpen edges without amplifying noise.
 * amount: strength (0-2), radius controls blur kernel.
 */
function unsharpMask(
  imageData: ImageData,
  amount: number = 1.0,
  threshold: number = 0.0,
): ImageData {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data);

  // Box blur approximation (3x3 kernel)
  const blurred = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += data[((y + dy) * width + (x + dx)) * 4 + c];
          }
        }
        blurred[(y * width + x) * 4 + c] = sum / 9;
      }
      blurred[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }

  // Unsharp mask: original + amount * (original - blurred)
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = data[i + c] - blurred[i + c];
      if (Math.abs(diff) > threshold * 255) {
        output[i + c] = Math.min(255, Math.max(0, data[i + c] + amount * diff));
      }
    }
    output[i + 3] = data[i + 3]; // preserve alpha
  }

  return new ImageData(output, width, height);
}
