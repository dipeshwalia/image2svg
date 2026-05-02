# Features — Phase 2: Pre & Post Processing Pipeline

> **Timeline**: Week 3–4
> **Goal**: Dramatically improve SVG quality by enhancing VTracer's input and output with algorithmic processing.
> **Depends on**: Phase 1 (core vectorizer working)

---

## F2.1 — Color Quantization (Pre-Processing)

The single most impactful enhancement. Reducing an image from millions of colors to a controlled palette before vectorization produces drastically cleaner, smaller SVGs.

### Acceptance Criteria
- [ ] Median Cut algorithm implemented in pure JS/TS (runs on Canvas ImageData)
- [ ] User-controlled color count: slider from 2 to 256 (default: 32)
- [ ] Live palette preview: show the extracted color palette as swatches
- [ ] Before/after preview: original image vs quantized image (before vectorization)
- [ ] Option to lock/unlock individual colors in the palette
- [ ] Toggle: "Auto-quantize before vectorization" (on by default for Photo preset)
- [ ] Performance: quantize a 2MP image in <200ms

### Technical Notes
- Median Cut: recursively split the color space along the axis of greatest range
- Operate on RGB channels, split the box with the widest range
- After clustering, map each pixel to nearest centroid color
- Apply dithering option: None (flat) or Floyd-Steinberg (textured)

---

## F2.2 — Image Denoising (Pre-Processing)

JPEG artifacts destroy vectorization quality. A bilateral filter smooths noise while preserving edges.

### Acceptance Criteria
- [ ] Bilateral filter implemented via Canvas pixel manipulation
- [ ] User-controlled strength: slider 0 (off) to 100 (heavy smoothing)
- [ ] Spatial sigma and range sigma derived from single "strength" slider
- [ ] Before/after preview toggle
- [ ] Auto-detect JPEG (by file extension or header) and suggest denoising
- [ ] Performance: process a 2MP image in <500ms

### Technical Notes
- Bilateral filter: weight neighbors by both spatial distance AND intensity similarity
- Kernel size: 5x5 or 7x7 (user-configurable or derived from strength)
- For performance: approximate bilateral filter using separable passes

---

## F2.3 — Auto-Contrast Enhancement (Pre-Processing)

Improve edge detection by stretching the histogram.

### Acceptance Criteria
- [ ] Auto-levels: stretch each RGB channel to use full 0–255 range
- [ ] User toggle: on/off
- [ ] Clip percentage: ignore top/bottom 1% of histogram (prevents outlier skew)
- [ ] Before/after preview
- [ ] Works on both color and B/W images

---

## F2.4 — SVGO Optimization (Post-Processing)

Run the industry-standard SVG optimizer on VTracer output.

### Acceptance Criteria
- [ ] SVGO integrated as browser-compatible build
- [ ] Applied automatically after every vectorization
- [ ] Plugins enabled:
  - `preset-default` (safe defaults)
  - `mergePaths` (combine compatible paths)
  - `convertPathData` (relative coords, shorthand notation)
  - `removeEmptyContainers` (clean up)
  - `removeUselessStrokeAndFill`
- [ ] Before/after file size shown (e.g., "SVGO: 142KB → 98KB, -31%")
- [ ] Toggle to disable SVGO if user wants raw VTracer output
- [ ] SVG validity guaranteed: always validate output renders correctly

---

## F2.5 — Path Simplification (Post-Processing)

Reduce Bézier node count while preserving visual fidelity.

### Acceptance Criteria
- [ ] `simplify-svg-path` (or Paper.js simplify) integrated
- [ ] User-controlled tolerance: slider 0 (no simplification) to 100 (aggressive)
- [ ] Path count and total node count displayed before/after
- [ ] Visual diff: overlay simplified paths on original to show deviation
- [ ] Simplification runs after SVGO in the pipeline
- [ ] Large tolerance values show warning: "May lose fine detail"

---

## F2.6 — SVG Statistics Dashboard

### Acceptance Criteria
- [ ] Stats panel showing:
  - Total path count
  - Total node/point count
  - Unique colors used
  - File size (raw and optimized)
  - Image dimensions (viewBox)
  - Processing time breakdown (quantize + vectorize + optimize)
- [ ] Stats update in real-time as settings change
- [ ] Compact display that doesn't dominate the UI

---

## F2.7 — Before/After Comparison

### Acceptance Criteria
- [ ] Drag slider overlay: original image on left, SVG on right, draggable divider
- [ ] Synchronized zoom/pan between both sides
- [ ] Toggle between: split view, slider overlay, flicker (toggle on click)
- [ ] Works on both desktop (mouse) and mobile (touch)

---

## F2.8 — Batch Processing

### Acceptance Criteria
- [ ] Multi-file upload: drag multiple files or select multiple in picker
- [ ] Queue display showing each file with:
  - Thumbnail
  - Status: queued / processing / done / error
  - Individual file size
- [ ] All files processed with same settings (current preset + config)
- [ ] Download all as ZIP (using JSZip or similar, browser-side)
- [ ] Option to process sequentially (lower memory) or parallel (faster)
- [ ] Max batch size: 50 files
- [ ] Total progress bar

---

## F2.9 — Processing Pipeline UI

### Acceptance Criteria
- [ ] Visual pipeline indicator showing the active processing steps:
  ```
  Upload → [Quantize] → [Denoise] → [Contrast] → VTracer → [SVGO] → [Simplify] → Output
  ```
- [ ] Each step is a toggle (enable/disable)
- [ ] Steps in brackets are optional, VTracer is always on
- [ ] Active steps shown as highlighted nodes in a horizontal flow
- [ ] Click a step to expand its settings
