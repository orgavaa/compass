import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { T, FONT } from "../tokens";

const CollapsibleSection = ({ title, children, defaultOpen = false, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "12px", border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "12px 16px",
        background: T.bgSub, border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "13px",
        fontWeight: 600, color: T.text, textAlign: "left", justifyContent: "space-between",
        transition: "background 120ms ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 200ms ease-out" }} />
          {title}
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: "3px", background: badge.bg || T.primaryLight, color: badge.color || T.primary, fontFamily: FONT }}>{badge.text}</span>
          )}
        </div>
        <span style={{ fontSize: 10, color: T.textTer, fontWeight: 400 }}>{open ? "collapse" : "expand"}</span>
      </button>
      {open && <div style={{ padding: "16px", borderTop: `1px solid ${T.border}` }}>{children}</div>}
    </div>
  );
};

/* Collapsible figure wrapper for Overview tab; open by default, click to toggle */
const FigureSection = ({ title, subtitle, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "24px" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none",
        cursor: "pointer", padding: "4px 0", marginBottom: open ? (subtitle ? "2px" : "8px") : 0, fontFamily: FONT,
        fontSize: "11px", fontWeight: 600, color: T.textTer, textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        <ChevronDown size={12} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
        {title}
      </button>
      {open && subtitle && <div style={{ fontSize: "11px", color: T.textTer, marginBottom: "8px", lineHeight: 1.5 }}>{subtitle}</div>}
      {open && children}
    </div>
  );
};

export { CollapsibleSection, FigureSection };
