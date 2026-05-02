# Features — Phase 3: Background Removal & Semantic Grouping

> **Timeline**: Week 5–6
> **Goal**: Subject isolation before vectorization and intelligent SVG structure after.
> **Depends on**: Phase 1 (core vectorizer), Phase 2 (post-processing pipeline)

---

## F3.1 — Background Removal

Isolate the subject from messy backgrounds before vectorizing. Uses `@imgly/background-removal` — a lightweight ONNX segmentation model (~40MB) that runs entirely in-browser.

### Acceptance Criteria
- [ ] "Remove Background" button in pre-processing panel
- [ ] First use: show download progress for ONNX model (~40MB)
- [ ] Model cached in OPFS — subsequent uses are instant
- [ ] Processing runs in a dedicated Web Worker
- [ ] Progress indicator during inference (indeterminate if no progress events)
- [ ] Result preview: subject on checkered transparency background
- [ ] Accept/reject: user confirms before proceeding to vectorization
- [ ] Undo: button to restore original image
- [ ] WebGPU used if available (10-20x faster), WASM fallback otherwise
- [ ] Processing time: <3s on desktop with WebGPU, <10s with WASM fallback

### Configuration
- [ ] Model variant selector: "Fast" (small/quantized) vs "Quality" (medium)
- [ ] Edge refinement: toggle soft vs hard edges on the mask
- [ ] Manual touch-up: user can paint over missed areas with brush tool (optional, stretch goal)

### Error Handling
- Model download failure → retry button, show error with network diagnostics
- Worker crash → restart, retry once
- Unsupported browser → hide feature, show tooltip explaining requirements

---

## F3.2 — Interactive Region Selection

For users who don't want model-based BG removal — a fully manual, zero-download alternative.

### Acceptance Criteria
- [ ] "Select Region" tool: user draws a freeform lasso or rectangular selection
- [ ] Selected region is extracted and vectorized (rest is discarded)
- [ ] Lasso: click to add polygon points, double-click to close
- [ ] Rectangle: click-drag to define box
- [ ] Invert selection button
- [ ] Multiple regions: hold Shift to add additional areas
- [ ] Clear selection button
- [ ] Selected area shown with darkened/blurred background for contrast

---

## F3.3 — Semantic Path Grouping (DBSCAN)

Automatically group SVG paths into meaningful `<g>` elements based on spatial proximity and color similarity. Replaces AI-based "semantic layering" with a deterministic algorithm.

### Acceptance Criteria
- [ ] DBSCAN clustering implemented in pure TS
- [ ] Feature vector per path: `[x_center_norm, y_center_norm, L, a, b]`
  - `x_center_norm`, `y_center_norm`: bounding box center, normalized 0–1
  - `L, a, b`: fill color converted to CIELAB color space
- [ ] User-controlled parameters:
  - **Sensitivity** slider (maps to DBSCAN `epsilon`): low = many small groups, high = few large groups
  - **Min group size** (maps to `minPoints`): minimum paths per group
- [ ] Output: paths wrapped in `<g id="group-N">` elements
- [ ] Auto-generated group IDs based on dominant characteristic:
  - Position: "top-left", "center", "bottom-right"
  - Color: "red-group", "blue-group", "dark-group"
  - Combined: "top-left-red", "center-blue"
- [ ] Groups applied as a post-processing step (after SVGO, before export)
- [ ] Toggle: enable/disable grouping

### Technical Implementation
```
1. Parse SVG DOM → extract all <path> elements
2. For each path:
   a. getBBox() → compute center (cx, cy)
   b. getComputedStyle().fill → parse RGB → convert to CIELAB
   c. Normalize spatial coords to [0, 1] range
3. Build feature matrix: N paths × 5 features
4. Weight features: spatial × w_spatial, color × w_color
   (default: w_spatial = 0.5, w_color = 0.5)
5. Run DBSCAN(epsilon, minPoints) → cluster assignments
6. For each cluster:
   a. Create <g id="..."> element
   b. Move member paths into the group
   c. Generate descriptive ID from dominant position + color
7. Ungrouped paths (noise) remain at top level
```

---

## F3.4 — Layer Panel

Visual management of semantic groups.

### Acceptance Criteria
- [ ] Sidebar panel listing all `<g>` groups (and ungrouped paths)
- [ ] Each group shows:
  - Group ID / auto-name
  - Path count
  - Dominant color swatch
  - Visibility toggle (eye icon)
  - Lock toggle (prevent edits)
- [ ] Click group → highlight all member paths in preview (outline glow)
- [ ] Drag to reorder groups (changes SVG render order / z-index)
- [ ] Rename: double-click group name to edit
- [ ] Merge: select multiple groups → merge into one
- [ ] Ungroup: dissolve a group back to individual paths
- [ ] Color override: change fill color for entire group
- [ ] Collapse/expand panel

---

## F3.5 — Path Inspector

Individual path selection and inspection.

### Acceptance Criteria
- [ ] Click any path in the SVG preview → highlights it
- [ ] Inspector shows:
  - Path index and parent group
  - Fill color (with color picker to change)
  - Stroke color and width
  - Bounding box dimensions
  - Node/point count
  - Raw `d` attribute (truncated, expandable)
- [ ] Delete path button (with undo)
- [ ] Isolate: show only this path (dim all others)
- [ ] Keyboard: Tab to cycle through paths, Delete to remove
