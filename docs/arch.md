# Architecture — Image-to-SVG

> 100% browser-native. Zero server. Zero AI. Pure algorithms.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  React   │◄──►│  Canvas API  │◄──►│     Web Workers       │  │
│  │   UI     │    │  (pixel ops) │    │                       │  │
│  │          │    └──────────────┘    │  ┌─────────────────┐  │  │
│  │ • Upload │                       │  │ VTracer WASM    │  │  │
│  │ • Preview│    ┌──────────────┐   │  │ (vectorization) │  │  │
│  │ • Settings    │  Post-       │   │  └─────────────────┘  │  │
│  │ • Export │◄──►│  Processing  │   │                       │  │
│  │ • Layers │    │  Pipeline    │   │  ┌─────────────────┐  │  │
│  │          │    │              │   │  │ BG Removal      │  │  │
│  └──────────┘    │ • SVGO       │   │  │ (ONNX + WASM)   │  │  │
│                  │ • Simplify   │   │  └─────────────────┘  │  │
│                  │ • Group      │   │                       │  │
│                  │ • CNC        │   └───────────────────────┘  │
│                  └──────────────┘                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Storage: OPFS (model cache) + IndexedDB (history)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   STATIC HOSTING (Vercel/CDN)                   │
│  HTML + JS + CSS + WASM binary + ONNX model (lazy-loaded)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.x | SSG, routing, dev tooling |
| Language | TypeScript | 5.x | Type safety throughout |
| Styling | Vanilla CSS | — | Custom properties, design tokens |
| Vectorization | VTracer | 0.6.x | Rust → WASM, O(n) tracing |
| BG Removal | @imgly/background-removal | latest | ISNet ONNX model, browser-native |
| SVG Optimization | SVGO | 3.x | Plugin-based SVG optimizer |
| Path Simplification | simplify-svg-path | latest | Bézier node reduction |
| Fonts | Inter (Google Fonts) | — | UI typography |

---

## Data Flow

```
Image Upload
    │
    ▼
┌─────────────────────────────────┐
│  OPTIONAL: Background Removal   │
│  @imgly/background-removal      │
│  (Web Worker, ONNX + WASM)      │
│  Input:  ImageData               │
│  Output: ImageData (BG removed)  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  PRE-PROCESSING (Canvas API)    │
│                                 │
│  1. Resize     (Lanczos, ≤2kpx) │
│  2. Denoise    (bilateral)      │
│  3. Quantize   (Median Cut)     │
│  4. Contrast   (auto-levels)    │
│  5. Threshold  (Otsu, B/W only) │
│                                 │
│  Input:  ImageData               │
│  Output: ImageData (optimized)   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  VTRACER WASM (Web Worker)      │
│                                 │
│  Input:  RGBA pixel buffer      │
│  Config: mode, colorMode,       │
│          filterSpeckle,         │
│          colorPrecision,        │
│          cornerThreshold,       │
│          segmentLength,         │
│          spliceThreshold,       │
│          gradientStep,          │
│          hierarchical           │
│  Output: SVG string             │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  POST-PROCESSING PIPELINE       │
│                                 │
│  1. SVGO Optimize               │
│     → remove metadata           │
│     → merge paths               │
│     → optimize path data        │
│                                 │
│  2. Path Simplify               │
│     → Douglas-Peucker           │
│     → Bézier re-fitting         │
│     → user-controlled tolerance │
│                                 │
│  3. Semantic Grouping           │
│     → extract path bbox + fill  │
│     → CIELAB color distance     │
│     → DBSCAN clustering         │
│     → wrap in <g id="...">      │
│                                 │
│  4. CNC Optimize (optional)     │
│     → fill → outline conversion │
│     → flatten curves → segments │
│     → TSP nearest-neighbor      │
│     → merge continuous strokes  │
│                                 │
│  Input:  SVG string             │
│  Output: SVG string (optimized) │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  TRANSFORM PANEL (live edits)   │
│                                 │
│  • Simplify paths (tolerance)   │
│  • Reduce colors (re-quantize)  │
│  • Monochrome (single hue)      │
│  • Outline only (strip fills)   │
│  • Stroke width (global)        │
│  • Remove small elements        │
│  • Invert colors                │
│                                 │
│  All transforms are:            │
│  → Instant (DOM manipulation)   │
│  → Reversible (undo stack)      │
│  → Composable (chain multiple)  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  EXPORT                         │
│                                 │
│  • SVG  (optimized, grouped)    │
│  • PNG  (rasterized, custom DPI)│
│  • DXF  (CNC/CAD)              │
│  • G-Code (plotter/laser)       │
└─────────────────────────────────┘
```

---

## Threading Model

All heavy computation runs off the main thread to keep the UI at 60fps.

| Thread | Responsibility |
|---|---|
| **Main (UI)** | React rendering, user input, preview display |
| **Worker 1: VTracer** | WASM vectorization. Receives pixel buffer, returns SVG string |
| **Worker 2: BG Removal** | ONNX inference. Receives ImageData, returns masked ImageData |
| **Main (deferred)** | Post-processing (SVGO, simplify, grouping) — runs via `requestIdleCallback` for small SVGs, or in a worker for large ones |

### Worker Communication Protocol

```typescript
// Main → Worker
interface WorkerRequest {
  id: string;                  // Unique request ID for response matching
  type: 'vectorize' | 'remove-bg';
  payload: {
    imageData: ArrayBuffer;    // Transferable — zero-copy
    width: number;
    height: number;
    config: VTracerConfig | BgRemovalConfig;
  };
}

// Worker → Main
interface WorkerResponse {
  id: string;
  type: 'result' | 'progress' | 'error';
  payload: {
    svg?: string;              // Vectorization result
    imageData?: ArrayBuffer;   // BG removal result (transferable)
    progress?: number;         // 0-1 progress value
    error?: string;
  };
}
```

All `ArrayBuffer` payloads use `Transferable` objects for zero-copy transfer between threads.

---

## Storage Strategy

| Store | Technology | Contents | Lifetime |
|---|---|---|---|
| **Model cache** | OPFS (Origin Private File System) | BG removal ONNX model (~40MB) | Persistent until cleared |
| **Edit history** | In-memory array | Undo/redo SVG snapshots | Session only |
| **User preferences** | localStorage | Theme, default preset, last-used settings | Persistent |
| **Recent files** | IndexedDB | Last 10 processed images + SVGs | Persistent, LRU eviction |

---

## Directory Structure

```
image2svg/
├── public/
│   ├── sw.js                       # Service worker (PWA)
│   └── manifest.json               # PWA manifest
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: fonts, meta, theme provider
│   │   ├── page.tsx                # Landing page
│   │   └── editor/
│   │       └── page.tsx            # Main editor
│   │
│   ├── components/
│   │   ├── ui/                     # Primitives: Button, Slider, Toggle, etc.
│   │   ├── upload/
│   │   │   └── UploadZone.tsx      # Drag-drop, paste, URL input
│   │   ├── preview/
│   │   │   ├── SplitPreview.tsx    # Side-by-side original ↔ SVG
│   │   │   ├── ZoomPan.tsx         # Pan/zoom container
│   │   │   └── CompareSlider.tsx   # Drag-to-compare overlay
│   │   ├── settings/
│   │   │   ├── PresetBar.tsx       # One-click presets
│   │   │   └── AdvancedPanel.tsx   # All VTracer sliders
│   │   ├── processing/
│   │   │   ├── PreProcessPanel.tsx # Quantize, denoise, contrast
│   │   │   └── PostProcessPanel.tsx# SVGO, simplify, group
│   │   ├── layers/
│   │   │   ├── LayerPanel.tsx      # Semantic group management
│   │   │   └── PathInspector.tsx   # Individual path selection
│   │   ├── transforms/
│   │   │   └── TransformPanel.tsx  # All SVG transforms
│   │   ├── cnc/
│   │   │   ├── CncMode.tsx         # CNC toggle + settings
│   │   │   └── PlotterSim.tsx      # Animated pen path
│   │   ├── export/
│   │   │   └── ExportMenu.tsx      # Multi-format download
│   │   └── bg-removal/
│   │       └── BackgroundRemover.tsx
│   │
│   ├── workers/
│   │   ├── vtracer.worker.ts       # VTracer WASM worker
│   │   └── bgremoval.worker.ts     # BG removal worker
│   │
│   ├── lib/
│   │   ├── vtracer/
│   │   │   ├── api.ts              # WASM wrapper, config types
│   │   │   └── presets.ts          # Preset configurations
│   │   ├── preprocess/
│   │   │   ├── color-quantize.ts   # Median Cut algorithm
│   │   │   ├── denoise.ts          # Bilateral filter
│   │   │   ├── contrast.ts         # Auto-levels
│   │   │   └── threshold.ts        # Otsu's method
│   │   ├── postprocess/
│   │   │   ├── svgo-optimize.ts    # SVGO browser wrapper
│   │   │   ├── path-simplify.ts    # Bézier simplification
│   │   │   ├── semantic-group.ts   # DBSCAN clustering
│   │   │   └── stats.ts            # SVG analysis
│   │   ├── transforms/
│   │   │   ├── recolor.ts          # Color manipulation
│   │   │   ├── outline.ts          # Fill → stroke
│   │   │   └── scale.ts            # Dimension transforms
│   │   ├── cnc/
│   │   │   ├── tsp-solver.ts       # Nearest-neighbor TSP
│   │   │   ├── path-flatten.ts     # Curves → line segments
│   │   │   ├── dxf-export.ts       # SVG → DXF
│   │   │   └── gcode-export.ts     # SVG → G-Code
│   │   ├── geometry/
│   │   │   ├── bbox.ts             # Bounding box math
│   │   │   └── color-distance.ts   # CIELAB ΔE
│   │   ├── storage/
│   │   │   ├── opfs-cache.ts       # OPFS model caching
│   │   │   ├── history.ts          # Undo/redo manager
│   │   │   └── preferences.ts      # localStorage prefs
│   │   └── image-utils.ts          # Canvas helpers
│   │
│   ├── hooks/
│   │   ├── useVTracer.ts           # VTracer worker hook
│   │   ├── useBgRemoval.ts         # BG removal worker hook
│   │   ├── useHistory.ts           # Undo/redo hook
│   │   └── usePreferences.ts       # Settings persistence
│   │
│   └── styles/
│       └── globals.css             # Design tokens + all styles
│
├── feature.md                      # Original feature spec
├── arch.md                         # This file
├── features-1.md                   # Phase 1 spec
├── features-2.md                   # Phase 2 spec
├── features-3.md                   # Phase 3 spec
├── features-4.md                   # Phase 4 spec
├── features-5.md                   # Phase 5 spec
│
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Key Design Decisions

### 1. Why VTracer Over Potrace / ImageTracerJS?

| | VTracer | Potrace | ImageTracerJS |
|---|---|---|---|
| Algorithm | O(n) | O(n²) | O(n) |
| Color support | Full color | B/W only | Full color |
| Output quality | Compact (stacking) | Good (B/W) | Verbose |
| Language | Rust → WASM | C → WASM | Pure JS |
| Performance | Excellent | Good | Slow on large images |
| Active maintenance | Yes (v0.6.4, 2024) | Stable but old | Minimal |

VTracer wins on every axis for our use case.

### 2. Why DBSCAN for Semantic Grouping?

- No need to predefine cluster count (unlike K-Means)
- Naturally handles noise (ungrouped outlier paths)
- Works well with mixed spatial + color features
- O(n log n) with spatial indexing
- Deterministic — same input always produces same groups

### 3. Why Not a Server?

- **Privacy**: Enterprise users won't upload sensitive images to a server
- **Cost**: $0/month at any scale vs ~$500/month for GPU servers
- **Latency**: <500ms local vs 2-5s round-trip
- **Offline**: Full functionality without internet (PWA)
- **Simplicity**: No auth, no rate limiting, no API versioning, no ops

### 4. Pre-Processing: Why Color Quantization Matters

The single most impactful enhancement to VTracer output. Example:

| Input | Path Count | File Size |
|---|---|---|
| Photo (16M colors) | ~5,000 paths | ~2MB SVG |
| Same photo, quantized to 16 colors | ~200 paths | ~80KB SVG |
| Same photo, quantized to 8 colors | ~100 paths | ~40KB SVG |

Median Cut is fast (O(n log n)) and produces perceptually balanced palettes.
