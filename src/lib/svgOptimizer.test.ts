import { describe, expect, it } from "vitest";
import { optimizeSvg } from "./svgOptimizer";

describe("optimizeSvg", () => {
  it("returns optimized SVG metadata", () => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><g><path d="M0 0 L10 10"/></g></svg>`;

    const result = optimizeSvg(rawSvg, { precision: 1, mergePaths: true });

    expect(result.svg).toContain("<svg");
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.optimizedSize).toBeGreaterThan(0);
    expect(result.timeMs).toBeGreaterThanOrEqual(0);
    expect(result.savings).toBeGreaterThanOrEqual(-100);
    expect(result.savings).toBeLessThanOrEqual(100);
  });

  it("falls back to original SVG when optimize throws", () => {
    const invalidSvg = "<svg><path d='M 0 0'";

    const result = optimizeSvg(invalidSvg);

    expect(result.svg).toBe(invalidSvg);
    expect(result.savings).toBe(0);
    expect(result.optimizedSize).toBe(result.originalSize);
  });
});
