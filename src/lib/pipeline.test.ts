import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PIPELINE, runPipeline } from "./pipeline";
import { upscaleImage } from "./upscaler";
import { optimizeSvg } from "./svgOptimizer";

vi.mock("./upscaler", () => ({
  upscaleImage: vi.fn(),
}));

vi.mock("./svgOptimizer", () => ({
  optimizeSvg: vi.fn(),
}));

describe("runPipeline", () => {
  const baseImage = {
    width: 100,
    height: 50,
    data: new Uint8ClampedArray(100 * 50 * 4),
  } as unknown as ImageData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs vectorization and optimization when upscale disabled", async () => {
    const vectorizeFn = vi.fn().mockResolvedValue("<svg>raw</svg>");
    vi.mocked(optimizeSvg).mockReturnValue({
      svg: "<svg>optimized</svg>",
      originalSize: 20,
      optimizedSize: 10,
      savings: 50,
      timeMs: 2,
    });

    const result = await runPipeline(baseImage, DEFAULT_PIPELINE, vectorizeFn);

    expect(upscaleImage).not.toHaveBeenCalled();
    expect(vectorizeFn).toHaveBeenCalledWith(baseImage);
    expect(optimizeSvg).toHaveBeenCalledWith("<svg>raw</svg>", {
      precision: DEFAULT_PIPELINE.optimize.precision,
      mergePaths: DEFAULT_PIPELINE.optimize.mergePaths,
    });
    expect(result.svg).toBe("<svg>optimized</svg>");
  });

  it("runs upscale stage when enabled", async () => {
    const upscaledImage = {
      width: 200,
      height: 100,
      data: new Uint8ClampedArray(200 * 100 * 4),
    } as unknown as ImageData;

    const config = {
      ...DEFAULT_PIPELINE,
      upscale: { ...DEFAULT_PIPELINE.upscale, enabled: true, scale: 2 },
      optimize: { ...DEFAULT_PIPELINE.optimize, enabled: false },
    };

    vi.mocked(upscaleImage).mockResolvedValue({
      imageData: upscaledImage,
      originalWidth: 100,
      originalHeight: 50,
      upscaledWidth: 200,
      upscaledHeight: 100,
      scale: 2,
      method: "canvas",
      timeMs: 5,
    });

    const vectorizeFn = vi.fn().mockResolvedValue("<svg>upscaled</svg>");

    const result = await runPipeline(baseImage, config, vectorizeFn);

    expect(upscaleImage).toHaveBeenCalledWith(baseImage, 2, config.upscale.useAI);
    expect(vectorizeFn).toHaveBeenCalledWith(upscaledImage);
    expect(result.svg).toBe("<svg>upscaled</svg>");
    expect(result.upscale?.method).toBe("canvas");
  });
});
