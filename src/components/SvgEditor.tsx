"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import styles from "./SvgEditor.module.css";

interface SvgEditorProps {
  svg: string;
  onSvgChange: (newSvg: string) => void;
}

interface SvgElementInfo {
  index: number;
  tag: string;
  fill: string;
  stroke: string;
  pathLength: number;
  bbox: { x: number; y: number; width: number; height: number } | null;
}

export default function SvgEditor({ svg, onSvgChange }: SvgEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [codeValue, setCodeValue] = useState(svg);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  // Sync code value when svg prop changes
  useEffect(() => {
    setCodeValue(svg);
  }, [svg]);

  // Parse SVG stats
  const stats = useMemo(() => {
    const pathCount = (svg.match(/<path[\s/]/g) || []).length;
    const circleCount = (svg.match(/<circle[\s/]/g) || []).length;
    const rectCount = (svg.match(/<rect[\s/]/g) || []).length;
    const ellipseCount = (svg.match(/<ellipse[\s/]/g) || []).length;
    const lineCount = (svg.match(/<line[\s/]/g) || []).length;
    const polygonCount = (svg.match(/<polygon[\s/]/g) || []).length;
    const totalElements =
      pathCount + circleCount + rectCount + ellipseCount + lineCount + polygonCount;
    const sizeKB = (new Blob([svg]).size / 1024).toFixed(1);

    return { pathCount, circleCount, rectCount, totalElements, sizeKB };
  }, [svg]);

  // Get all interactive SVG elements
  const getElements = useCallback((): SVGElement[] => {
    const container = svgContainerRef.current;
    if (!container) return [];
    const svgEl = container.querySelector("svg");
    if (!svgEl) return [];
    return Array.from(
      svgEl.querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line"),
    ) as SVGElement[];
  }, []);

  // Handle click on SVG element
  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as SVGElement;
      const elements = getElements();

      // Find the clicked element's index
      const index = elements.indexOf(target);
      if (index >= 0) {
        setSelectedIndex(index);
        e.stopPropagation();
      } else {
        setSelectedIndex(null);
      }
    },
    [getElements],
  );

  const handleSvgMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as SVGElement;
      const elements = getElements();
      const index = elements.indexOf(target);
      if (index >= 0) {
        setHoveredIndex(index);
      }
    },
    [getElements],
  );

  const handleSvgMouseOut = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Get info about selected element
  const selectedInfo = useMemo((): SvgElementInfo | null => {
    if (selectedIndex === null) return null;
    const elements = getElements();
    const el = elements[selectedIndex];
    if (!el) return null;

    const fill = el.getAttribute("fill") || getComputedStyle(el).fill || "none";
    const stroke = el.getAttribute("stroke") || "none";
    const d = el.getAttribute("d") || "";

    let bbox = null;
    try {
      const b = (el as SVGGraphicsElement).getBBox();
      bbox = {
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
      };
    } catch {
      // getBBox can throw if element is not rendered
    }

    return {
      index: selectedIndex,
      tag: el.tagName.toLowerCase(),
      fill,
      stroke,
      pathLength: d.length,
      bbox,
    };
  }, [selectedIndex, getElements]);

  // Apply highlight styles
  useEffect(() => {
    const elements = getElements();

    // Reset all
    elements.forEach((el, i) => {
      el.style.cursor = "pointer";
      el.style.outline = "none";
      el.style.outlineOffset = "0";
      el.style.transition = "opacity 150ms ease";

      if (i === selectedIndex) {
        el.style.outline = "2px solid #7c5cfc";
        el.style.outlineOffset = "1px";
        el.style.opacity = "1";
      } else if (i === hoveredIndex) {
        el.style.outline = "1px dashed rgba(124, 92, 252, 0.5)";
        el.style.outlineOffset = "1px";
        el.style.opacity = "1";
      } else if (selectedIndex !== null) {
        el.style.opacity = "0.4";
      } else {
        el.style.opacity = "1";
      }
    });
  }, [selectedIndex, hoveredIndex, getElements, svg]);

  // Delete selected element
  const deleteSelected = useCallback(() => {
    if (selectedIndex === null) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;

    const elements = Array.from(
      svgEl.querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line"),
    );

    if (elements[selectedIndex]) {
      elements[selectedIndex].remove();
      const serializer = new XMLSerializer();
      const newSvg = serializer.serializeToString(svgEl);
      onSvgChange(newSvg);
      setSelectedIndex(null);
    }
  }, [selectedIndex, svg, onSvgChange]);

  // Change fill color
  const changeFill = useCallback(
    (color: string) => {
      if (selectedIndex === null) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      const elements = Array.from(
        svgEl.querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line"),
      );

      if (elements[selectedIndex]) {
        elements[selectedIndex].setAttribute("fill", color);
        const serializer = new XMLSerializer();
        const newSvg = serializer.serializeToString(svgEl);
        onSvgChange(newSvg);
      }
    },
    [selectedIndex, svg, onSvgChange],
  );

  // Change opacity
  const changeOpacity = useCallback(
    (opacity: number) => {
      if (selectedIndex === null) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      const elements = Array.from(
        svgEl.querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line"),
      );

      if (elements[selectedIndex]) {
        elements[selectedIndex].setAttribute("opacity", String(opacity));
        const serializer = new XMLSerializer();
        const newSvg = serializer.serializeToString(svgEl);
        onSvgChange(newSvg);
      }
    },
    [selectedIndex, svg, onSvgChange],
  );

  // Apply code changes
  const applyCode = useCallback(() => {
    // Validate SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(codeValue, "image/svg+xml");
    const errors = doc.querySelector("parsererror");
    if (errors) {
      alert("Invalid SVG markup. Please fix errors before applying.");
      return;
    }
    onSvgChange(codeValue);
    setSelectedIndex(null);
  }, [codeValue, onSvgChange]);

  // Remove small paths (cleanup)
  const removeSmallPaths = useCallback(
    (minArea: number = 4) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      // Temporarily render to get bboxes
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.visibility = "hidden";
      tempContainer.innerHTML = svg;
      document.body.appendChild(tempContainer);

      const tempSvg = tempContainer.querySelector("svg");
      if (!tempSvg) {
        document.body.removeChild(tempContainer);
        return;
      }

      const tempElements = Array.from(
        tempSvg.querySelectorAll("path, circle, rect, ellipse, polygon, polyline"),
      ) as SVGGraphicsElement[];

      const toRemove: number[] = [];
      tempElements.forEach((el, i) => {
        try {
          const bbox = el.getBBox();
          if (bbox.width * bbox.height < minArea) {
            toRemove.push(i);
          }
        } catch {
          // skip
        }
      });

      document.body.removeChild(tempContainer);

      // Remove from the parsed doc
      const docElements = Array.from(
        svgEl.querySelectorAll("path, circle, rect, ellipse, polygon, polyline"),
      );
      // Remove in reverse order to preserve indices
      for (let i = toRemove.length - 1; i >= 0; i--) {
        docElements[toRemove[i]]?.remove();
      }

      const serializer = new XMLSerializer();
      const newSvg = serializer.serializeToString(svgEl);
      onSvgChange(newSvg);
      setSelectedIndex(null);
    },
    [svg, onSvgChange],
  );

  return (
    <div className={styles.editor}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <strong>{stats.totalElements}</strong> elements
            </span>
            <span className={styles.statDivider}>·</span>
            <span className={styles.stat}>
              <strong>{stats.pathCount}</strong> paths
            </span>
            <span className={styles.statDivider}>·</span>
            <span className={styles.stat}>
              <strong>{stats.sizeKB}</strong> KB
            </span>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={`${styles.toolBtn} ${showCode ? styles.toolBtnActive : ""}`}
            onClick={() => setShowCode(!showCode)}
            title="Toggle SVG code editor"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Code
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => removeSmallPaths(4)}
            title="Remove tiny elements (area < 4px²)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
            Clean
          </button>
        </div>
      </div>

      {/* Selected element properties */}
      {selectedInfo && (
        <div className={styles.properties}>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>
              &lt;{selectedInfo.tag}&gt; #{selectedInfo.index}
            </span>
            {selectedInfo.bbox && (
              <span className={styles.propDim}>
                {selectedInfo.bbox.width}×{selectedInfo.bbox.height}
              </span>
            )}
          </div>
          <div className={styles.propRow}>
            <label className={styles.propLabel}>Fill</label>
            <div className={styles.colorInputWrap}>
              <input
                type="color"
                value={
                  selectedInfo.fill.startsWith("rgb")
                    ? rgbToHex(selectedInfo.fill)
                    : selectedInfo.fill === "none"
                      ? "#000000"
                      : selectedInfo.fill
                }
                onChange={(e) => changeFill(e.target.value)}
                className={styles.colorInput}
              />
              <span className={styles.colorValue}>{selectedInfo.fill}</span>
            </div>
          </div>
          <div className={styles.propActions}>
            <button className={styles.actionBtn} onClick={deleteSelected} title="Delete element">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => changeOpacity(0.5)}
              title="Set 50% opacity"
            >
              50%
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => changeFill("none")}
              title="Set fill to none"
            >
              No Fill
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => setSelectedIndex(null)}
              title="Deselect"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div
        ref={svgContainerRef}
        className={styles.svgCanvas}
        onClick={handleSvgClick}
        onMouseOver={handleSvgMouseOver}
        onMouseOut={handleSvgMouseOut}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* Code Editor */}
      {showCode && (
        <div className={styles.codePanel}>
          <div className={styles.codePanelHeader}>
            <span>SVG Source</span>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className={styles.actionBtn} onClick={applyCode}>
                Apply Changes
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setCodeValue(svg);
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <textarea
            ref={codeRef}
            className={styles.codeEditor}
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            spellCheck={false}
            wrap="off"
          />
        </div>
      )}
    </div>
  );
}

// Helper: rgb(r, g, b) → #hex
function rgbToHex(rgb: string): string {
  const match = rgb.match(/(\d+)/g);
  if (!match || match.length < 3) return "#000000";
  const r = parseInt(match[0]).toString(16).padStart(2, "0");
  const g = parseInt(match[1]).toString(16).padStart(2, "0");
  const b = parseInt(match[2]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
