# Features — Phase 5: Polish, PWA & Production

> **Timeline**: Week 9–10
> **Goal**: Production-grade polish, offline support, mobile UX, and launch readiness.
> **Depends on**: All previous phases

---

## F5.1 — Progressive Web App (PWA)

The entire app works offline — the ultimate advantage of a 100% browser-native architecture.

### Acceptance Criteria
- [ ] `manifest.json` with:
  - App name, short name, description
  - Icons: 192px, 512px (generated)
  - Theme color matching design system
  - `display: standalone`
  - `start_url: /editor`
- [ ] Service worker (`sw.js`):
  - Cache-first for static assets (JS, CSS, WASM, fonts)
  - Network-first for HTML (for updates)
  - WASM binary pre-cached on install
  - BG removal ONNX model cached only after first use
- [ ] Install prompt: custom "Install App" banner on landing page
- [ ] Offline indicator: subtle badge when working offline
- [ ] Full functionality without internet:
  - Upload, vectorize, process, transform, export — all work offline
  - Only BG removal requires the ONNX model to have been downloaded once

---

## F5.2 — Mobile Responsive Design

### Acceptance Criteria
- [ ] **Mobile (<640px)**:
  - Single-column layout: preview on top, controls below
  - Settings panel as bottom sheet (swipe up to expand)
  - Touch-friendly sliders (larger hit targets, 44px minimum)
  - Pinch-to-zoom on preview
  - Upload via camera (capture attribute on file input)
- [ ] **Tablet (640–1024px)**:
  - Side panel can be collapsed to icon rail
  - Preview takes majority of space
- [ ] **Desktop (>1024px)**:
  - Full split-pane layout
  - All panels visible simultaneously
- [ ] No horizontal scroll at any breakpoint
- [ ] All touch interactions have equivalent mouse interactions

---

## F5.3 — Keyboard Shortcuts

### Acceptance Criteria
- [ ] Global shortcuts:
  | Shortcut | Action |
  |---|---|
  | `Ctrl/Cmd + Z` | Undo |
  | `Ctrl/Cmd + Shift + Z` | Redo |
  | `Ctrl/Cmd + S` | Download SVG |
  | `Ctrl/Cmd + V` | Paste image from clipboard |
  | `Ctrl/Cmd + O` | Open file picker |
  | `Space` | Toggle preview mode (split/SVG/original) |
  | `+` / `-` | Zoom in/out |
  | `0` | Fit to viewport |
  | `1`–`5` | Select preset (Logo, Photo, Sketch, Pixel Art, Minimal) |
  | `Escape` | Close open panel/modal |
  | `?` | Show shortcuts reference |

- [ ] Shortcuts reference modal (triggered by `?` key)
- [ ] Shortcuts work only when no text input is focused

---

## F5.4 — Drag-to-Compare Overlay

### Acceptance Criteria
- [ ] Vertical divider line that user drags left/right
- [ ] Left side: original raster image
- [ ] Right side: SVG output
- [ ] Smooth, low-latency dragging (CSS clip-path, not re-rendering)
- [ ] Handle: visible grabber with hover state
- [ ] Touch support: drag on mobile
- [ ] Synchronized zoom/pan with the compare view

---

## F5.5 — Recent Files

### Acceptance Criteria
- [ ] Store last 10 processed images in IndexedDB:
  - Original image thumbnail (resized to 200px)
  - SVG output (full)
  - Settings used
  - Timestamp
- [ ] "Recent" section on editor page (collapsed sidebar or top bar)
- [ ] Click a recent item → reload image + SVG + settings
- [ ] Clear history button
- [ ] LRU eviction when over 10 items
- [ ] Storage budget: ~50MB total for recent files

---

## F5.6 — Performance Optimization

### Acceptance Criteria
- [ ] Audit all processing paths for performance bottlenecks
- [ ] WASM binary: ensure SIMD is enabled in VTracer build (if compiling from source)
- [ ] Large image handling:
  - Images >4MP: auto-suggest downscaling before vectorization
  - Images >10MP: force downscale with option to override
- [ ] Memory management:
  - Release pixel buffers after use (garbage collection friendly)
  - Limit history memory to 50MB
  - Release BG removal model from memory when not in use
- [ ] Bundle optimization:
  - Code-split editor page from landing page
  - Lazy-load SVGO, code editor, and CNC modules
  - Tree-shake all imports
- [ ] Lighthouse score targets:
  | Metric | Target |
  |---|---|
  | Performance | >90 |
  | Accessibility | >95 |
  | Best Practices | >95 |
  | SEO | >95 |

---

## F5.7 — Landing Page Polish

### Acceptance Criteria
- [ ] **Animated hero demo**: Auto-playing conversion of a sample image
  - Cycle through 3-4 examples (logo, illustration, sketch, pixel art)
  - Smooth CSS transitions between examples
- [ ] **Comparison showcase**: Grid of before/after pairs demonstrating quality
  - Each pair: raster input → SVG output → file size reduction stat
- [ ] **Feature deep-dives**: Expandable sections for each major feature
  - Pre-processing pipeline
  - Semantic grouping
  - CNC/plotter export
- [ ] **FAQ section**: Common questions about privacy, limitations, browser support
- [ ] **Footer**: GitHub link, license info, tech stack credits

---

## F5.8 — Accessibility

### Acceptance Criteria
- [ ] All interactive elements keyboard-navigable
- [ ] Focus indicators on all focusable elements
- [ ] ARIA labels on icon buttons and sliders
- [ ] Color contrast: all text meets WCAG AA (4.5:1 minimum)
- [ ] Screen reader friendly:
  - Processing status announced via aria-live regions
  - Slider values read aloud
  - Image descriptions where applicable
- [ ] Reduced motion: respect `prefers-reduced-motion` (disable animations)
- [ ] No seizure-inducing animations (nothing flashing >3 times/second)

---

## F5.9 — Error Handling & Edge Cases

### Acceptance Criteria
- [ ] Corrupt/invalid image upload → clear error message with suggested fix
- [ ] Extremely large SVG output (>5MB) → warning with suggestion to increase quantization/speckle
- [ ] Browser out of memory → graceful degradation, suggest reducing image size
- [ ] WASM not supported → clear message listing supported browsers
- [ ] WebGPU not available → silent fallback to WASM (no error shown)
- [ ] All errors dismissible, never block the UI permanently
- [ ] Error boundary at app root catching unexpected React errors

---

## F5.10 — Analytics & Sharing

### Acceptance Criteria
- [ ] Privacy-respecting analytics (Plausible or Umami, no cookies)
  - Track: page views, conversions (editor visits), exports (by format)
  - Do NOT track: image content, file names, user identity
- [ ] Share button:
  - Copy link to app (simple, just the URL)
  - "Share result" → generate a self-contained HTML file with embedded SVG
  - Social meta tags (OG image, Twitter card) for the landing page
