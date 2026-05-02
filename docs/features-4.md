# Features — Phase 4: SVG Transform Panel & CNC Export

> **Timeline**: Week 7–8
> **Goal**: Powerful direct-manipulation SVG editing and CNC/plotter-optimized export.
> **Depends on**: Phase 1 (core), Phase 2 (post-processing), Phase 3 (layers)

---

## F4.1 — SVG Transform Panel

A deterministic, instant-feedback editing panel. Every transform operates directly on the SVG DOM — no AI, no latency, no surprises.

### Transforms

#### Color Transforms
- [ ] **Reduce colors**: Re-quantize SVG fill values to N colors (slider: 2–64)
  - Collect all unique fill colors → Median Cut to target count → remap
- [ ] **Monochrome**: Convert all fills to shades of a single hue
  - Color picker for base hue, map luminance to shade gradient
- [ ] **Invert colors**: Swap all fill values to their complement
- [ ] **Grayscale**: Convert all fills to grayscale equivalents (luminance-weighted)
- [ ] **Custom palette**: Upload or pick a color palette, remap fills to nearest match

#### Path Transforms
- [ ] **Simplify paths**: Global tolerance slider (0–100%), affects all paths
  - Show before/after node count
- [ ] **Remove small elements**: Filter out paths with bounding box area below threshold
  - Slider: minimum area in px² (0–500)
  - Preview: highlight elements that will be removed (red tint)
- [ ] **Smooth corners**: Increase `rx`/`ry` on rects, apply spline smoothing on path corners
- [ ] **Outline only**: Strip all fills, add uniform stroke
  - Stroke width slider (0.5–10px)
  - Stroke color picker
- [ ] **Fill only**: Remove all strokes, keep fills (inverse of outline)

#### Global Transforms
- [ ] **Scale**: Set output dimensions (width × height) or scale factor
  - Lock aspect ratio toggle
  - Updates SVG `viewBox` and `width`/`height` attributes
- [ ] **Add border**: Insert `<rect>` frame around content
  - Border width, color, padding controls
- [ ] **Background**: Set explicit background color or transparent
- [ ] **Stroke width (global)**: Override all stroke widths to uniform value

### UI Requirements
- [ ] All transforms produce instant (<50ms) visual feedback
- [ ] Each transform has a toggle (enable/disable) and reset button
- [ ] Transforms are composable — multiple can be active simultaneously
- [ ] Order doesn't matter (transforms are applied independently)
- [ ] "Reset All Transforms" button

---

## F4.2 — Undo/Redo History

### Acceptance Criteria
- [ ] Every state-changing action creates a history entry
- [ ] Undo: Ctrl+Z / Cmd+Z (up to 50 steps)
- [ ] Redo: Ctrl+Shift+Z / Cmd+Shift+Z
- [ ] History stored as lightweight SVG snapshots (string diffs or full copies for small SVGs)
- [ ] Visual history panel (optional, collapsible):
  - List of actions with timestamps
  - Click any entry to jump to that state
- [ ] History cleared on new image upload (with confirmation if unsaved)

### Technical Notes
- For SVGs <100KB: store full SVG string per step
- For SVGs >100KB: store diffs (compute string diff, apply/reverse)
- Memory budget: cap at ~50MB total for history

---

## F4.3 — SVG Code View

### Acceptance Criteria
- [ ] Toggle to show raw SVG code alongside visual preview
- [ ] Syntax highlighting (XML/SVG)
- [ ] Code is live-synced with preview:
  - Edit code → preview updates
  - Use transform panel → code updates
- [ ] Line numbers
- [ ] Search/find (Ctrl+F)
- [ ] Copy all button
- [ ] Read-only mode toggle (prevent accidental edits)
- [ ] Code view can be resized (drag handle)

### Technical Notes
- Use a lightweight code editor: CodeMirror 6 (tree-shakeable, ~30KB)
- Parse code changes, validate SVG, apply to preview on debounce

---

## F4.4 — CNC/Plotter Optimization Mode

A dedicated mode that transforms SVG output for CNC machines, laser cutters, pen plotters, and vinyl cutters.

### Acceptance Criteria
- [ ] "CNC Mode" toggle in the toolbar
- [ ] When enabled, the following transformations are applied:

#### a) Fill-to-Outline Conversion
- [ ] Convert all filled shapes to stroke-only paths
- [ ] Preserve shape boundaries as closed paths
- [ ] Remove all fill attributes, add uniform stroke

#### b) Overlap Removal
- [ ] Detect overlapping path segments
- [ ] Remove hidden/covered portions
- [ ] Result: no double-cutting on any line

#### c) Path Planning (TSP Optimization)
- [ ] Reorder paths to minimize pen-up / rapid-traverse distance
- [ ] Algorithm: greedy nearest-neighbor
  ```
  1. Start at (0, 0)
  2. Find the path whose start or end point is nearest to current position
  3. If end is closer, reverse the path
  4. Traverse the path, update current position to its far end
  5. Repeat until all paths traversed
  ```
- [ ] Display stats: total draw distance, total rapid distance, estimated time
- [ ] Option to reverse: allow user to choose different starting point

#### d) Continuous Stroke Merging
- [ ] If two paths' endpoints are within tolerance (configurable, default 0.5px):
  - Join them into a single continuous path
- [ ] Result: fewer pen lifts, smoother output

### CNC Settings Panel
- [ ] Stroke width: slider (0.1–5mm)
- [ ] Join tolerance: slider (0.1–5px)
- [ ] Path planning: toggle on/off
- [ ] Preview: show travel lines (pen-up moves) as dashed gray lines

---

## F4.5 — Plotter Path Simulator

Animated visualization of the pen/laser path.

### Acceptance Criteria
- [ ] "Simulate" button in CNC mode
- [ ] Animation shows:
  - A dot/cursor following the tool path
  - Drawn lines appear progressively (pen-down: solid, pen-up: dashed gray)
  - Current progress percentage
- [ ] Playback controls: play, pause, speed (0.5x, 1x, 2x, 5x)
- [ ] Scrubber: drag to jump to any point in the path
- [ ] Stats overlay during simulation:
  - Total paths
  - Current path number
  - Draw distance so far
  - Estimated remaining time (at given feed rate)

---

## F4.6 — Multi-Format Export

### Acceptance Criteria

#### SVG Export (enhanced from Phase 1)
- [ ] Optimized SVG with all transforms, grouping, and optimization applied
- [ ] Option: include/exclude metadata comments
- [ ] Option: minified (no whitespace) vs pretty-printed

#### PNG Export
- [ ] Rasterize SVG to PNG at custom resolution
- [ ] DPI selector: 72, 150, 300, or custom
- [ ] Transparent background option
- [ ] Max output: 8192×8192px

#### DXF Export (for CNC/CAD)
- [ ] Convert SVG paths to DXF entities (LINE, ARC, POLYLINE)
- [ ] Flatten all curves to line segments (configurable tolerance)
- [ ] Units: mm or inches (user selectable)
- [ ] Compatible with: AutoCAD, Fusion 360, LaserGRBL, LightBurn

#### G-Code Export (for plotters/lasers)
- [ ] Convert SVG paths to G-Code commands
- [ ] `G0` for rapid moves (pen up), `G1` for draw moves (pen down)
- [ ] Configurable:
  - Feed rate (mm/min)
  - Pen up/down commands (M3/M5 or servo angles)
  - Work area dimensions
  - Origin position
- [ ] G-Code preview (scrollable text view)
- [ ] Download as `.gcode` or `.nc` file
