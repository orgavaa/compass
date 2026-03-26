import React from "react";
import { FONT, MONO, T } from "../../tokens";

export const DRUG_COLORS = {
  RIF: { bg: "transparent", text: "#1E3A5F", border: "#1E3A5F" }, INH: { bg: "transparent", text: "#D97706", border: "#D97706" },
  EMB: { bg: "transparent", text: "#059669", border: "#059669" }, FQ: { bg: "transparent", text: "#DC2626", border: "#DC2626" },
  AG: { bg: "transparent", text: "#7C3AED", border: "#7C3AED" }, PZA: { bg: "transparent", text: "#0891B2", border: "#0891B2" },
};
export const DEFAULT_DRUG = { bg: "transparent", text: "#6B7280", border: "#E5E7EB" };

export const Badge = ({ children, variant = "default" }) => {
  const s = {
    default: { background: "transparent", color: "#6B7280", border: `1px solid #E5E7EB` },
    primary: { background: T.primaryLight, color: T.primary, border: `1px solid ${T.primary}` },
    success: { background: "#ECFDF5", color: "#059669", border: "1px solid #059669" },
    warning: { background: "#FFFBEB", color: "#D97706", border: "1px solid #D97706" },
    danger: { background: "#FEF2F2", color: "#DC2626", border: "1px solid #DC2626" },
    purple: { background: "#F5F3FF", color: "#7C3AED", border: "1px solid #7C3AED" },
  };
  return (
    <span style={{ ...(s[variant] || s.default), padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 500, fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>{children}</span>
  );
};

export const DrugBadge = ({ drug }) => {
  const c = DRUG_COLORS[drug] || DEFAULT_DRUG;
  return <span style={{ background: "transparent", color: c.text, border: `1px solid ${c.border || c.text}`, padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 600, fontFamily: FONT, display: "inline-block" }}>{drug}</span>;
};

export const Seq = ({ s: str }) => (
  <span style={{ fontFamily: MONO, fontSize: "12px", letterSpacing: "1px" }}>
    {str?.split("").map((c, i) => (
      <span key={i} style={{ color: c === "A" ? "#059669" : c === "T" ? "#DC2626" : c === "G" ? "#D97706" : "#4338CA", fontWeight: 400 }}>{c}</span>
    ))}
  </span>
);

export const Btn = ({ children, variant = "primary", onClick, disabled, icon: Icon, full, size = "md" }) => {
  const styles = {
    primary: { background: T.primary, color: "#fff", border: "none" },
    secondary: { background: "#fff", color: T.text, border: `1px solid ${T.border}` },
    ghost: { background: "transparent", color: T.textSec, border: "none" },
    danger: { background: T.danger, color: "#fff", border: "none" },
  };
  const sizes = { sm: { padding: "6px 12px", fontSize: "12px" }, md: { padding: "10px 20px", fontSize: "14px" }, lg: { padding: "12px 24px", fontSize: "14px" } };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], ...sizes[size], borderRadius: "6px", fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex",
      alignItems: "center", gap: "8px", fontFamily: FONT, opacity: disabled ? 0.5 : 1,
      width: full ? "100%" : "auto", justifyContent: "center",
      transition: "background 120ms ease-out, border-color 120ms ease-out, opacity 120ms ease-out",
    }}>{Icon && <Icon size={14} />}{children}</button>
  );
};

export const tooltipStyle = { background: "#fff", border: `1px solid ${T.border}`, borderRadius: "4px", fontSize: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", fontFamily: MONO };

/* Gaussian KDE for smooth density estimation */
export function gaussianKDE(data, bandwidth = 0.05, nPoints = 100) {
  const min = 0, max = 1;
  const step = (max - min) / nPoints;
  const points = [];
  for (let x = min; x <= max; x += step) {
    let density = 0;
    for (const d of data) {
      const z = (x - d) / bandwidth;
      density += Math.exp(-0.5 * z * z) / (bandwidth * Math.sqrt(2 * Math.PI));
    }
    density /= data.length;
    points.push({ x: parseFloat(x.toFixed(3)), density: parseFloat(density.toFixed(4)) });
  }
  return points;
}

export function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length - 1));
}
