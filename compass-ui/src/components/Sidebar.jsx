import React from "react";
import { createPortal } from "react-dom";
import {
  Activity, BarChart3, BookOpen, Database, FlaskConical, Brain, Layers,
  PanelLeft, PanelLeftClose, WifiOff, X,
} from "lucide-react";
import { T, FONT, MONO } from "../tokens";
import { useIsMobile } from "../hooks/useIsMobile";

const NAV = [
  { section: "Design", items: [
    { id: "home", label: "Home", icon: Activity },
    { id: "methods", label: "Methods", icon: BookOpen },
    { id: "results", label: "Results", icon: BarChart3 },
  ]},
  { section: "Library", items: [
    { id: "panels", label: "Panels", icon: Layers },
    { id: "mutations", label: "Mutations", icon: Database },
  ]},
  { section: "Models", items: [
    { id: "scoring", label: "Scoring", icon: Brain },
    { id: "research", label: "Research", icon: FlaskConical },
  ]},
];

const Sidebar = ({ page, setPage, connected, mobileOpen, setMobileOpen, collapsed, setCollapsed }) => {
  const mobile = useIsMobile();
  const handleNav = (id) => { setPage(id); if (mobile) setMobileOpen(false); };
  const isCollapsed = !mobile && collapsed;

  const inner = (
    <aside style={{
      width: mobile ? "280px" : (isCollapsed ? 56 : 220), background: T.sidebar,
      borderRight: mobile ? "none" : `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      transition: "width 0.2s ease",
      ...(mobile ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 9998 } : {}),
    }}>
      {/* Logo + Toggle */}
      <div style={{ padding: isCollapsed ? "16px 0" : "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between", gap: "8px" }}>
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/compass-logo.png" alt="COMPASS" style={{ height: "20px", objectFit: "contain" }} />
            {!connected && (
              <span style={{ fontSize: "10px", color: T.danger, fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                <WifiOff size={10} /> offline
              </span>
            )}
          </div>
        )}
        {isCollapsed && (
          <button onClick={() => setCollapsed(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", borderRadius: "4px" }} title="Expand sidebar">
            <PanelLeft size={18} color={T.textSec} />
          </button>
        )}
        {mobile ? (
          <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginLeft: "auto" }}><X size={20} color={T.textSec} /></button>
        ) : !isCollapsed && (
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", borderRadius: "4px" }} title="Collapse sidebar">
            <PanelLeftClose size={16} color={T.textTer} />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: isCollapsed ? "12px 6px" : "8px 12px", overflowY: "auto" }}>
        {NAV.map((g) => (
          <div key={g.section} style={{ marginBottom: "20px" }}>
            {!isCollapsed && <div style={{ fontSize: "11px", fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: "0.04em", padding: "0 8px", marginBottom: "4px" }}>{g.section}</div>}
            {g.items.map((it) => {
              const active = page === it.id;
              return (
                <button key={it.id} onClick={() => handleNav(it.id)} title={isCollapsed ? it.label : undefined} style={{
                  display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: "8px", width: "100%", padding: isCollapsed ? "8px 0" : "8px 12px",
                  borderRadius: "4px", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: "13px",
                  fontWeight: active ? 500 : 400, background: active ? T.sidebarActive : "transparent",
                  color: active ? T.primary : T.sidebarText, marginBottom: "2px",
                  borderLeft: "2px solid transparent",
                  transition: "background 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out",
                }}>
                  <it.icon size={16} strokeWidth={active ? 2 : 1.5} />
                  {!isCollapsed && it.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {/* Footer */}
      {!isCollapsed && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, fontSize: "10px", color: T.borderStrong, textAlign: "center", fontFamily: MONO }}>
          v2.0
        </div>
      )}
    </aside>
  );

  if (mobile) {
    if (!mobileOpen) return null;
    return createPortal(
      <>
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9997 }} />
        {inner}
      </>,
      document.body
    );
  }
  return inner;
};

export { NAV, Sidebar };
