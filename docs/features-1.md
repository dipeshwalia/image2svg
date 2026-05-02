# Features — Phase 1: Core Vectorizer MVP

> **Timeline**: Week 1–2
> **Goal**: Ship a beautiful, functional app that vectorizes images locally in the browser using VTracer WASM.
> **Depends on**: Nothing (greenfield)

---

## F1.1 — Project Setup & Design System

### Acceptance Criteria
- [ ] Next.js 16 project initialized with App Router, TypeScript strict mode
- [ ] CSS design system with custom properties:
  - Color tokens: background, surface, text, primary, accent, border, error, success
  - Dark mode (default) and light mode via `prefers-color-scheme` + manual toggle
  - Spacing scale: 4px base (--space-1 through --space-12)
  - Border radius scale: --radius-sm (4px), --radius-md (8px), --radius-lg (16px)
  - Shadow scale: --shadow-sm, --shadow-md, --shadow-lg
  - Transition tokens: --ease-out, --duration-fast (150ms), --duration-normal (300ms)
- [ ] Typography: Inter from Google Fonts, weight 400/500/600/700
- [ ] Base components: Button (primary/secondary/ghost), Slider, Toggle, Select, Tooltip
- [ ] Responsive breakpoints: mobile (<640px), tablet (640–1024px), desktop (>1024px)

### Design Direction
- Dark-first with deep navy/charcoal backgrounds (#0a0a0f, #12121a)
- Accent color: vibrant cyan (#00d4ff) or electric violet (#8b5cf6)
- Glassmorphism on panels (backdrop-blur, semi-transparent backgrounds)
- Subtle grid/dot pattern on canvas area
- Micro-animations on all interactive elements (hover, focus, active states)

---

## F1.2 — Landing Page

### Acceptance Criteria
- [ ] Hero section with:
  - Headline communicating instant, private, browser-based vectorization
  - Animated demo showing image → SVG conversion (can be pre-recorded or live)
  - Primary CTA: "Start Converting" → navigates to `/editor`
- [ ] Feature grid (3-4 cards):
  - ⚡ Instant (runs in your browser)
  - 🔒 Private (images never leave your device)
  - 💰 Free (no API keys, no limits)
  - 🌐 Offline (works without internet)
- [ ] Before/After comparison section with interactive slider
- [ ] SEO: `<title>`, `<meta description>`, OG tags, single `<h1>`, semantic HTML

---

## F1.3 — Image Upload

### Acceptance Criteria
- [ ] Drag-and-drop zone with visual feedback (border highlight, icon change)
- [ ] Click to browse file picker
- [ ] Paste from clipboard (Ctrl+V / Cmd+V)
- [ ] Supported formats: PNG, JPG/JPEG, WebP, BMP, GIF (first frame)
- [ ] Max file size: 20MB (show error for larger files)
- [ ] Image validation: must be raster image, show dimensions and file size
- [ ] Thumbnail preview after upload with option to clear/replace
- [ ] Loading state while image is being read into Canvas

### Technical Notes
- Use `FileReader.readAsArrayBuffer()` → decode to `ImageBitmap` → draw to `OffscreenCanvas`
- Extract raw RGBA pixel data via `getImageData()`
- Store original image in memory for re-processing with different settings

---

## F1.4 — VTracer WASM Integration

### Acceptance Criteria
- [ ] VTracer WASM module loaded and initialized
- [ ] Vectorization runs in a dedicated Web Worker (never blocks UI)
- [ ] Worker accepts: RGBA pixel buffer (transferable), width, height, config object
- [ ] Worker returns: SVG string (or error message)
- [ ] Processing time displayed to user (e.g., "Converted in 340ms")
- [ ] Auto-vectorize on upload with default preset
- [ ] Re-vectorize when any setting changes (debounced, 300ms)

### VTracer Parameters (all exposed)
```typescript
interface VTracerConfig {
  mode: 'pixel' | 'polygon' | 'spline';     // Curve fitting
  colorMode: 'color' | 'bw';                 // Full color or binary
  filterSpeckle: number;                      // 0–100, remove small patches
  colorPrecision: number;                     // 1–8, bits per channel
  cornerThreshold: number;                    // 0–180, degrees
  segmentLength: number;                      // 1–100, max px before subdivide
  spliceThreshold: number;                    // 0–180, degrees
  gradientStep: number;                       // 0–255, color diff between layers
  hierarchical: 'stacked' | 'cutout';         // Layering strategy
  pathPrecision: number;                      // 0–8, decimal places in path d attr
}
```

### Error Handling
- WASM load failure → show error with browser compatibility message
- Worker crash → auto-restart worker, retry once, then show error
- Timeout (>30s) → abort, suggest reducing image size

---

## F1.5 — Presets

### Acceptance Criteria
- [ ] Preset bar with one-click buttons (horizontally scrollable on mobile)
- [ ] Active preset highlighted
- [ ] Changing any advanced setting deactivates preset (shows "Custom")
- [ ] Presets:

| Preset | Icon | mode | colorMode | filterSpeckle | colorPrecision | cornerThreshold | segmentLength | gradientStep | hierarchical |
|---|---|---|---|---|---|---|---|---|---|
| **Logo** | 🎨 | spline | color | 4 | 6 | 60 | 4 | 64 | stacked |
| **Photo** | 📸 | spline | color | 4 | 8 | 60 | 4 | 16 | stacked |
| **Sketch** | ✏️ | spline | bw | 2 | 6 | 60 | 4 | 0 | stacked |
| **Pixel Art** | 🎮 | pixel | color | 0 | 8 | 90 | 4 | 0 | stacked |
| **Minimal** | ◽ | polygon | color | 10 | 4 | 45 | 8 | 128 | stacked |

---

## F1.6 — Advanced Settings Panel

### Acceptance Criteria
- [ ] Collapsible panel (collapsed by default, "Advanced" toggle to expand)
- [ ] Each parameter rendered as a labeled slider with:
  - Parameter name and current value displayed
  - Min/max range
  - Tooltip explaining what it does
- [ ] Real-time preview: changing any slider triggers re-vectorization (debounced 300ms)
- [ ] "Reset to preset" button to restore current preset defaults
- [ ] Settings persist in localStorage between sessions

---

## F1.7 — Split Preview

### Acceptance Criteria
- [ ] Two-pane layout: original image (left) ↔ SVG output (right)
- [ ] Toggle between: split view, SVG only, original only
- [ ] Zoom: scroll wheel, pinch-to-zoom, zoom buttons (+/-)
- [ ] Pan: click-and-drag when zoomed in
- [ ] Zoom/pan synchronized between both panes
- [ ] Fit-to-viewport button to reset zoom
- [ ] Checkered background behind SVG (shows transparency)
- [ ] Canvas/SVG area has subtle dot-grid or checkered pattern

### Technical Notes
- Render SVG via `<img src="data:image/svg+xml,...">` or inline `<svg>` element
- Use CSS `transform: scale() translate()` for zoom/pan (GPU-accelerated)
- Debounce zoom events for smooth performance

---

## F1.8 — SVG Download

### Acceptance Criteria
- [ ] Download button: click → downloads `.svg` file
- [ ] Filename defaults to original image name with `.svg` extension
- [ ] SVG includes XML declaration and proper namespace
- [ ] File size displayed on download button (e.g., "Download SVG (42 KB)")
- [ ] Copy SVG code to clipboard button (with success toast)

---

## F1.9 — Performance Budget

| Metric | Target |
|---|---|
| WASM load time | <500ms (cached), <2s (first load) |
| Vectorization (1MP image, Logo preset) | <500ms |
| Vectorization (4MP image, Photo preset) | <3s |
| UI frame rate during vectorization | 60fps (worker-based) |
| Landing page LCP | <1.5s |
| Bundle size (JS) | <200KB gzipped (excluding WASM) |
