import React, { useEffect } from "react";
import { Cpu } from "lucide-react";
import { T } from "../tokens";
import { useIsMobile } from "../hooks/useIsMobile";

const EX = {
  bg: T.bgSub,
  text: "#111111",
  textSec: "#888888",
  textTer: "#999999",
  line: "#e0e0e0",
  lineDone: "#111111",
  nodeUp: "#cccccc",
  nodeDone: "#111111",
  desc: "#666666",
};

/* ═══════════════════════════════════════════════════════════════════
   PIPELINE PAGE; Redirects to Home (execution is now inline)
   ═══════════════════════════════════════════════════════════════════ */
const PipelinePage = ({ jobId, connected, goTo }) => {
  const mobile = useIsMobile();
  useEffect(() => { goTo("home"); }, []);
  return (
    <div style={{ padding: mobile ? "16px" : "36px 40px", textAlign: "center" }}>
      <div style={{ padding: "80px 24px" }}>
        <Cpu size={28} color="#999" strokeWidth={1.5} />
        <div style={{ fontSize: "14px", color: "#999", marginTop: "12px" }}>Redirecting to Home…</div>
      </div>
    </div>
  );
};

export { EX, PipelinePage };
