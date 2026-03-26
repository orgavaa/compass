import React, { useState, useEffect } from "react";
import { Menu, WifiOff } from "lucide-react";
import { T, FONT } from "./tokens";
import { useIsMobile } from "./hooks/useIsMobile";
import { ToastProvider } from "./components/Toast";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./pages/HomePage";
import { MethodsPage } from "./pages/MethodsPage";
import { PipelinePage } from "./pages/PipelinePage";
import { ResultsPage } from "./pages/ResultsPage";
import { PanelsPage } from "./pages/PanelsPage";
import { MutationsPage } from "./pages/MutationsPage";
import { ScoringPage } from "./pages/ScoringPage";
import { ResearchPage } from "./pages/ResearchPage";
import { healthCheck } from "./api";

/* ═══════════════════════════════════════════════════════════════════
   COMPASS PLATFORM; Root component
   ═══════════════════════════════════════════════════════════════════ */
const COMPASSPlatform = () => {
  const mobile = useIsMobile();
  const [page, setPage] = useState("home");
  const [connected, setConnected] = useState(false);
  const [pipelineJobId, setPipelineJobId] = useState(null);
  const [resultsJobId, setResultsJobId] = useState(null);
  const [resultsScorer, setResultsScorer] = useState("heuristic");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* Check API connectivity */
  useEffect(() => {
    healthCheck().then(({ data, error }) => {
      setConnected(!error && !!data);
    });
    const iv = setInterval(() => {
      healthCheck().then(({ data, error }) => {
        setConnected(!error && !!data);
      });
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const goTo = (pg, opts) => {
    if (opts?.jobId && pg === "pipeline") setPipelineJobId(opts.jobId);
    if (opts?.jobId && pg === "results") setResultsJobId(opts.jobId);
    if (opts?.scorer && pg === "results") setResultsScorer(opts.scorer);
    setPage(pg);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: FONT, color: T.text, background: T.bgSub }}>
      {/* Mobile top bar */}
      {mobile && (
        <header style={{
          display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px",
          background: T.sidebar, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <Menu size={22} color={T.text} />
          </button>
          <img src="/compass-logo.png" alt="COMPASS" style={{ height: "18px", objectFit: "contain" }} />
          {!connected && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: T.danger, fontWeight: 600 }}>
              <WifiOff size={10} /> API disconnected
            </div>
          )}
        </header>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar page={page} setPage={setPage} connected={connected} mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        <main style={{ flex: 1, overflow: "auto" }}>
          <div key={page} style={{ animation: "pageIn 0.15s ease-out" }}>
            {page === "home" && <HomePage goTo={goTo} connected={connected} />}
            {page === "methods" && <MethodsPage />}
            {page === "pipeline" && <PipelinePage jobId={pipelineJobId} connected={connected} goTo={goTo} />}
            {page === "results" && <ResultsPage connected={connected} jobId={resultsJobId} scorer={resultsScorer} goTo={goTo} />}
            {page === "panels" && <PanelsPage connected={connected} />}
            {page === "mutations" && <MutationsPage />}
            {page === "scoring" && <ScoringPage connected={connected} />}
            {page === "research" && <ResearchPage connected={connected} />}
          </div>
        </main>
      </div>

      {/* Global styles */}
      <style>{`
        /* font loaded via index.html preload */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pageIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulseDot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
        @keyframes stepSlideIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes stepSwipeUp { from { opacity: 0; } to { opacity: 1; } }
        @keyframes substepSwipe { from { opacity: 0; } to { opacity: 1; } }
        @keyframes statReveal { from { opacity: 0; } to { opacity: 1; } }
        @keyframes subtlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes indeterminateProgress { 0% { width: 0%; margin-left: 0%; } 50% { width: 60%; margin-left: 20%; } 100% { width: 0%; margin-left: 100%; } }
        @keyframes statFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textTer}; }
        input, textarea, button, select { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

const COMPASSApp = () => (
  <ToastProvider>
    <COMPASSPlatform />
  </ToastProvider>
);

export default COMPASSApp;
