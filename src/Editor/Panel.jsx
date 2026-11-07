/*!
 * Open Historia Map Editor
 * Copyright (c) 2026 Nicholas Krol - AGPL-3.0-or-later (see LICENSE).
 */

// Reusable side-panel shell: titled, closable, scrollable body.

import Icon from "./Icon.jsx";
import { panelSurface } from "./editorStyles.js";

const Panel = ({ title, icon, onClose, side = "left", width = 340, footer, children }) => (
  <div
    style={{
      ...panelSurface,
      position: "fixed",
      top: "var(--editor-top, 12px)",
      [side]: `calc(var(--editor-dock-${side === "right" ? "right" : "left"}, 0px) + 12px)`,
      // Never wider than the screen (phones).
      width: `min(${width}px, calc(100vw - var(--editor-dock-left, 0px) - var(--editor-dock-right, 0px) - 24px))`,
      maxHeight: "calc(100vh - var(--editor-top, 12px) - var(--editor-bottom, 12px))",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 35,
    }}
  >
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px 12px 14px",
        borderBottom: "1px solid color-mix(in srgb, var(--oh-ink, #fff) 7%, transparent)",
      }}
    >
      {icon && (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, flexShrink: 0, borderRadius: 9, background: "color-mix(in srgb, var(--oh-ink, #fff) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--oh-ink, #fff) 8%, transparent)" }}>
          <Icon name={icon} size={15} />
        </span>
      )}
      <span style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: "-0.01em", flex: 1, minWidth: 0 }}>{title}</span>
      {onClose && (
        <button
          onClick={onClose}
          title="Close"
          style={{
            alignItems: "center",
            background: "color-mix(in srgb, var(--oh-ink, #fff) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--oh-ink, #fff) 10%, transparent)",
            borderRadius: 9,
            color: "color-mix(in srgb, var(--oh-ink, #fff) 80%, transparent)",
            cursor: "pointer",
            display: "flex",
            flexShrink: 0,
            height: 28,
            justifyContent: "center",
            width: 28,
          }}
        >
          <Icon name="close" size={15} />
        </button>
      )}
    </header>
    <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      {children}
    </div>
    {footer && (
      <div style={{ borderTop: "1px solid color-mix(in srgb, var(--oh-ink, #fff) 7%, transparent)", padding: "12px 14px" }}>{footer}</div>
    )}
  </div>
);

export default Panel;
