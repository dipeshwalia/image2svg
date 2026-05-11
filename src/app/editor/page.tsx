"use client";

import { useCallback, useRef, useEffect } from "react";
import { useEditorMachine } from "@/hooks/useEditorMachine";
import type { VTracerConfig } from "@/lib/vtracer/config";
import { optimizeSvg } from "@/lib/svgOptimizer";
import type { ViewMode } from "@/lib/editorMachine";
import SvgEditor from "@/components/SvgEditor";
import styles from "./page.module.css";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function EditorPage() {
  const {
    snapshot,
    send,
    ctx,
    svg,
    isProcessing,
    timeMs,
    loadImage,
    toggleRemoveText,
    toggleUpscale,
    updateConfig,
    resetConfig,
    switchEngine,
    setQuality,
    showToast,
  } = useEditorMachine();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });

  // ── Clipboard paste ──────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) loadImage(file);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [loadImage]);

  // ── Drag & Drop ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    send({ type: "ui.dragOver", active: true });
  }, [send]);

  const handleDragLeave = useCallback(() => {
    send({ type: "ui.dragOver", active: false });
  }, [send]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      send({ type: "ui.dragOver", active: false });
      const file = e.dataTransfer.files[0];
      if (file) loadImage(file);
    },
    [loadImage, send],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage],
  );

  // ── Zoom & Pan ───────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      send({ type: "ui.zoom", zoom: Math.min(Math.max(ctx.zoom * delta, 0.1), 10) });
    },
    [ctx.zoom, send],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) {
      isPanningRef.current = true;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      send({ type: "ui.pan", pan: { x: ctx.pan.x + dx, y: ctx.pan.y + dy } });
    },
    [ctx.pan, send],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // ── Export ───────────────────────────────────────────────────
  const downloadSvg = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ctx.image ? ctx.image.name.replace(/\.[^.]+$/, ".svg") : "converted.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, [svg, ctx.image]);

  const copySvg = useCallback(async () => {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      showToast("SVG code copied to clipboard!");
    } catch {
      showToast("Failed to copy to clipboard.");
    }
  }, [svg, showToast]);

  // ── Derived ──────────────────────────────────────────────────
  const svgSize = svg ? new Blob([svg]).size : 0;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const svgDataUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
  const error = ctx.vectorError;
  const hasImage = snapshot.hasTag("hasImage");

  return (
    <div className={styles.editor}>
      {/* Header */}
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backBtn} aria-label="Back to home">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Link>
          <img src="/logo.png" alt="Image2SVG Logo" width={24} height={24} className={styles.editorLogo} />
          <span className={styles.editorTitle}>Image2SVG</span>
          {ctx.image && (
            <span className={styles.fileName}>
              {ctx.image.name} · {ctx.image.width}×{ctx.image.height} · {formatSize(ctx.image.size)}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          {isProcessing && (
            <div className={styles.processingBadge}>
              <div className="spinner" />
              <span>Converting…</span>
            </div>
          )}
          {timeMs !== null && !isProcessing && svg && (
            <span className={styles.timeBadge}>⚡ {timeMs}ms</span>
          )}
          {svg && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copySvg} id="copy-svg-btn">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy SVG
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={downloadSvg} id="download-svg-btn">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download ({formatSize(svgSize)})
              </button>
            </>
          )}
        </div>
      </header>

      <div className={styles.editorBody}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <h3>Pipeline</h3>
              {ctx.isUpscaling && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--accent)", fontWeight: 500 }}>⬆️ Upscaling</span>
              )}
            </div>

            {/* Quality Slider */}
            <div style={{ padding: "0 var(--space-1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-1)" }}>
                <label htmlFor="quality-slider" style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Quality
                </label>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {ctx.quality === 1 ? "Minimal" : ctx.quality === 2 ? "Low" : ctx.quality === 3 ? "Balanced" : ctx.quality === 4 ? "High" : "Ultra"}
                </span>
              </div>
              <input
                id="quality-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={ctx.quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                <span>Small file</span>
                <span>High fidelity</span>
              </div>
            </div>

            {/* Engine Selector */}
            <div style={{ padding: "0 var(--space-1)" }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "var(--space-1)" }}>
                Engine
              </span>
              <div style={{ display: "flex", gap: "4px", background: "var(--bg-tertiary)", borderRadius: "6px", padding: "2px" }}>
                {(["vtracer", "imagetracer"] as const).map((eng) => (
                  <button
                    key={eng}
                    type="button"
                    onClick={() => switchEngine(eng)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: ctx.engine === eng ? "var(--accent)" : "transparent",
                      color: ctx.engine === eng ? "#fff" : "var(--text-secondary)",
                      transition: "all 150ms ease",
                    }}
                  >
                    {eng === "vtracer" ? "VTracer" : "ImageTracer"}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "4px", display: "block" }}>
                {ctx.engine === "vtracer"
                  ? "Hierarchical clustering — best for simple graphics"
                  : "Color quantization — best for detailed/photo content"}
              </span>
            </div>

            {/* Stage 1: AI Upscale */}
            <div className={styles.toggleGroup}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span>AI Upscale</span>
                <span style={{ fontSize: "var(--text-xs)", color: ctx.isUpscaling ? "var(--accent)" : "var(--text-tertiary)" }}>
                  {ctx.isUpscaling ? "Upscaling…" : `${ctx.pipelineConfig.upscale.useAI ? "ESRGAN" : "Canvas"} ${ctx.pipelineConfig.upscale.scale}×`}
                </span>
              </div>
              <label className="toggle" aria-label="Toggle AI upscale">
                <input
                  id="ai-upscale-toggle"
                  type="checkbox"
                  checked={ctx.pipelineConfig.upscale.enabled}
                  onChange={(e) => toggleUpscale(e.target.checked)}
                  disabled={ctx.isUpscaling}
                />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>

            {ctx.pipelineConfig.upscale.enabled && (
              <div className={styles.toggleGroup} style={{ paddingLeft: "var(--space-2)" }}>
                <label htmlFor="upscale-scale-select" style={{ fontSize: "var(--text-xs)" }}>Scale</label>
                <select
                  id="upscale-scale-select"
                  className={styles.select}
                  value={ctx.pipelineConfig.upscale.scale}
                  onChange={(e) =>
                    send({
                      type: "pipeline.update",
                      config: { ...ctx.pipelineConfig, upscale: { ...ctx.pipelineConfig.upscale, scale: Number(e.target.value) } },
                    })
                  }
                  style={{ width: "70px" }}
                >
                  <option value={2}>2×</option>
                  <option value={4}>4×</option>
                </select>
              </div>
            )}

            {/* Remove Text */}
            <div className={styles.toggleGroup}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span>Remove Text</span>
                {ctx.isDetectingText && <span style={{ fontSize: "var(--text-xs)", color: "var(--accent)" }}>Detecting…</span>}
                {!ctx.isDetectingText && ctx.detectedRegions.length > 0 && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>{ctx.detectedRegions.length} regions removed</span>
                )}
              </div>
              <label className="toggle" aria-label="Toggle text removal">
                <input
                  type="checkbox"
                  checked={ctx.removeText}
                  onChange={(e) => toggleRemoveText(e.target.checked)}
                  disabled={ctx.isDetectingText}
                />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>

            {/* Stage 3: SVGO Optimize */}
            <div className={styles.toggleGroup}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span>Optimize SVG</span>
                {ctx.pipelineResult?.optimize && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>
                    −{ctx.pipelineResult.optimize.savings}% ({(ctx.pipelineResult.optimize.optimizedSize / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
              <label className="toggle" aria-label="Toggle SVG optimization">
                <input
                  type="checkbox"
                  checked={ctx.pipelineConfig.optimize.enabled}
                  onChange={(e) => {
                    const updated = { ...ctx.pipelineConfig, optimize: { ...ctx.pipelineConfig.optimize, enabled: e.target.checked } };
                    send({ type: "pipeline.update", config: updated });
                    if (ctx.rawSvg) {
                      if (e.target.checked) {
                        const result = optimizeSvg(ctx.rawSvg, {
                          precision: updated.optimize.precision,
                          mergePaths: updated.optimize.mergePaths,
                        });
                        send({ type: "svg.optimized", svg: result.svg, result });
                      } else {
                        send({ type: "svg.edited", svg: ctx.rawSvg });
                      }
                    }
                  }}
                />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className={styles.sidebarSection}>
            <button
              type="button"
              className={styles.sectionToggle}
              onClick={() => send({ type: "ui.showAdvanced", show: !ctx.showAdvanced })}
              id="toggle-advanced"
            >
              <h3>Advanced Settings</h3>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: ctx.showAdvanced ? "rotate(180deg)" : "rotate(0)", transition: "transform var(--duration-normal) var(--ease-out)" }}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {ctx.showAdvanced && (
              <div className={styles.advancedPanel}>
                <div className={styles.selectGroup}>
                  <label className={styles.selectLabel} htmlFor="advanced-mode-select">Mode</label>
                  <select
                    id="advanced-mode-select"
                    className={styles.select}
                    value={ctx.config.mode}
                    onChange={(e) => updateConfig({ mode: e.target.value as VTracerConfig["mode"] })}
                  >
                    <option value="spline">Spline (smooth curves)</option>
                    <option value="polygon">Polygon (sharp edges)</option>
                    <option value="pixel">Pixel (blocky)</option>
                  </select>
                </div>

                <div className={styles.toggleGroup}>
                  <span>Black &amp; White</span>
                  <label className="toggle" aria-label="Toggle black and white mode">
                    <input
                      id="advanced-binary-toggle"
                      type="checkbox"
                      checked={ctx.config.binary}
                      onChange={(e) => updateConfig({ binary: e.target.checked })}
                    />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>

                <div className={styles.selectGroup}>
                  <label className={styles.selectLabel} htmlFor="advanced-layering-select">Layering</label>
                  <select
                    id="advanced-layering-select"
                    className={styles.select}
                    value={ctx.config.hierarchical}
                    onChange={(e) => updateConfig({ hierarchical: e.target.value as VTracerConfig["hierarchical"] })}
                  >
                    <option value="stacked">Stacked (overlapping)</option>
                    <option value="cutout">Cutout (no overlap)</option>
                  </select>
                </div>

                <SliderParam label="Filter Speckle" tooltip="Remove clusters smaller than this area (px²)" value={ctx.config.filterSpeckle} min={0} max={100} step={1} onChange={(v) => updateConfig({ filterSpeckle: v })} />
                <SliderParam label="Color Precision" tooltip="Bits per channel. Higher = more colors (max 7, WASM limit)" value={ctx.config.colorPrecision} min={0} max={7} step={1} onChange={(v) => updateConfig({ colorPrecision: v })} />
                <SliderParam label="Layer Difference" tooltip="Color difference between layers. Higher = fewer layers" value={ctx.config.layerDifference} min={0} max={255} step={1} onChange={(v) => updateConfig({ layerDifference: v })} />
                <SliderParam label="Corner Threshold" tooltip="Angle threshold for corner detection (degrees)" value={ctx.config.cornerThreshold} min={0} max={180} step={1} unit="°" onChange={(v) => updateConfig({ cornerThreshold: v })} />
                <SliderParam label="Segment Length" tooltip="Max segment length before subdivision" value={ctx.config.lengthThreshold} min={1} max={100} step={0.5} onChange={(v) => updateConfig({ lengthThreshold: v })} />
                <SliderParam label="Splice Threshold" tooltip="Angle threshold for path splicing (degrees)" value={ctx.config.spliceThreshold} min={0} max={180} step={1} unit="°" onChange={(v) => updateConfig({ spliceThreshold: v })} />
                <SliderParam label="Path Precision" tooltip="Decimal places in SVG path coordinates" value={ctx.config.pathPrecision} min={0} max={8} step={1} onChange={(v) => updateConfig({ pathPrecision: v })} />

                <button type="button" className="btn btn-ghost btn-sm" onClick={resetConfig} style={{ width: "100%", marginTop: "var(--space-2)" }}>
                  Reset to Defaults
                </button>
              </div>
            )}
          </div>

          {/* View Mode */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <h3>View</h3>
            </div>
            <div className={styles.viewModeGroup}>
              {(["split", "original", "svg", "edit"] as ViewMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`${styles.viewModeBtn} ${ctx.viewMode === mode ? styles.viewModeActive : ""}`}
                  onClick={() => send({ type: "ui.viewMode", mode })}
                  disabled={mode === "edit" && !svg}
                >
                  {mode === "split" ? "Split" : mode === "original" ? "Original" : mode === "svg" ? "SVG" : "✏️ Edit"}
                </button>
              ))}
            </div>
            <div className={styles.zoomControls}>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => send({ type: "ui.zoom", zoom: Math.max(ctx.zoom * 0.8, 0.1) })}>−</button>
              <span className={styles.zoomValue}>{Math.round(ctx.zoom * 100)}%</span>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => send({ type: "ui.zoom", zoom: Math.min(ctx.zoom * 1.2, 10) })}>+</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => send({ type: "ui.resetView" })} style={{ marginLeft: "auto" }}>Fit</button>
            </div>
          </div>

          <div style={{ marginTop: "auto" }}>
            <Footer />
          </div>
        </aside>

        {/* Main Canvas */}
        <main className={styles.canvas}>
          {!hasImage ? (
            <button
              type="button"
              className={`${styles.uploadZone} ${ctx.isDragOver ? styles.uploadZoneDragOver : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              id="upload-zone"
            >
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" onChange={handleFileSelect} style={{ display: "none" }} />
              <div className={styles.uploadIcon}>
                <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
              <h2 className={styles.uploadTitle}>Drop an image here</h2>
              <p className={styles.uploadDesc}>or click to browse · paste from clipboard (Cmd+V)</p>
              <p className={styles.uploadFormats}>PNG, JPG, WebP, BMP, GIF · Max 20MB</p>
            </button>
          ) : ctx.viewMode === "edit" && svg ? (
            <SvgEditor svg={svg} onSvgChange={(s) => send({ type: "svg.edited", svg: s })} />
          ) : (
            <section
              className={`${styles.previewArea} dot-grid`}
              aria-label="Image preview area"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={styles.previewContent}
                style={{ transform: `translate(calc(-50% + ${ctx.pan.x}px), calc(-50% + ${ctx.pan.y}px)) scale(${ctx.zoom})` }}
              >
                {(ctx.viewMode === "split" || ctx.viewMode === "original") && (
                  <div className={styles.previewPane}>
                    <div className={styles.paneLabel}>Original</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ctx.image!.objectUrl} alt="Original" className={styles.previewImage} draggable={false} />
                  </div>
                )}
                {ctx.viewMode === "split" && <div className={styles.splitDivider} />}
                {(ctx.viewMode === "split" || ctx.viewMode === "svg") && (
                  <div className={`${styles.previewPane} checkered`}>
                    <div className={styles.paneLabel}>SVG</div>
                    {isProcessing ? (
                      <div className={styles.processingOverlay}>
                        <div className="spinner spinner-lg" />
                        <span>Converting…</span>
                      </div>
                    ) : svgDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={svgDataUrl} alt="SVG output" className={styles.previewImage} draggable={false} />
                    ) : error ? (
                      <div className={styles.errorOverlay}>
                        <span>⚠️ {error}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <button type="button" className={styles.replaceBtn} onClick={() => fileInputRef.current?.click()} title="Replace image">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                Replace
              </button>
            </section>
          )}
        </main>
      </div>

      {/* Toast */}
      <div className={`toast ${ctx.toast ? "visible" : ""}`}>{ctx.toast}</div>
    </div>
  );
}

// ── Slider sub-component (unchanged) ────────────────────────────
function SliderParam({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-container">
      <div className="slider-header">
        <div className="tooltip-wrapper">
          <span className="slider-label">{label}</span>
          <div className="tooltip-content">{tooltip}</div>
        </div>
        <span className="slider-value">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          {unit ?? ""}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
