import React from "react";
import { Copy, X } from "lucide-react";
import { T, FONT, HEADING, MONO, NUC } from "../tokens";
import { useIsMobile } from "../hooks/useIsMobile";
import { useToast } from "./Toast";
import { Badge, DrugBadge, Seq } from "./ui/index.jsx";
import { SCORING_FEATURES } from "../mockData";

const AmpliconMap = ({ r }) => {
  const W = 640, H = 100, pad = 40;
  const track = W - 2 * pad;
  const ampLen = r.amplicon || 150;
  const scale = track / ampLen;
  const mutPos = Math.floor(ampLen * 0.55);
  const spacerStart = mutPos - Math.floor(r.spacer.length / 2);
  const spacerEnd = spacerStart + r.spacer.length;
  const pamStart = spacerStart - 4;
  const fwdEnd = 30;
  const revStart = ampLen - 30;
  const x = (pos) => pad + pos * scale;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: MONO }}>
      <line x1={pad} y1={45} x2={W - pad} y2={45} stroke={T.border} strokeWidth={2} />
      {r.fwd && <rect x={x(0)} y={36} width={fwdEnd * scale} height={18} rx={3} fill="#059669" fillOpacity={0.15} stroke="#059669" strokeWidth={1} />}
      {r.fwd && <text x={x(fwdEnd / 2)} y={32} textAnchor="middle" fontSize={8} fill="#059669" fontWeight={600}>FWD</text>}
      {r.rev && <rect x={x(revStart)} y={36} width={30 * scale} height={18} rx={3} fill="#4338CA" fillOpacity={0.15} stroke="#4338CA" strokeWidth={1} />}
      {r.rev && <text x={x(revStart + 15)} y={32} textAnchor="middle" fontSize={8} fill="#4338CA" fontWeight={600}>REV</text>}
      <rect x={x(pamStart)} y={36} width={4 * scale} height={18} rx={2} fill={T.warning} fillOpacity={0.3} stroke={T.warning} strokeWidth={1} />
      <text x={x(pamStart + 2)} y={72} textAnchor="middle" fontSize={8} fill={T.warning} fontWeight={600}>PAM</text>
      <rect x={x(spacerStart)} y={36} width={r.spacer.length * scale} height={18} rx={3} fill={T.primary} fillOpacity={0.25} stroke={T.primary} strokeWidth={1.5} />
      <text x={x((spacerStart + spacerEnd) / 2)} y={47} textAnchor="middle" fontSize={8} fill={T.primaryDark} fontWeight={600}>crRNA spacer</text>
      <line x1={x(mutPos)} y1={28} x2={x(mutPos)} y2={62} stroke={T.danger} strokeWidth={2} strokeDasharray="3 2" />
      <circle cx={x(mutPos)} cy={24} r={4} fill={T.danger} />
      <text x={x(mutPos)} y={78} textAnchor="middle" fontSize={8} fill={T.danger} fontWeight={600}>{r.ref}{r.pos}{r.alt}</text>
      <text x={pad} y={92} fontSize={8} fill={T.textTer}>{r.gene} locus</text>
      <text x={W - pad} y={92} textAnchor="end" fontSize={8} fill={T.textTer}>{ampLen} bp amplicon</text>
    </svg>
  );
};

const MismatchProfile = ({ spacer, wtSpacer, strategy }) => {
  if (!spacer || !wtSpacer || wtSpacer.length !== spacer.length) {
    if (strategy === "Proximity") {
      return (
        <div style={{ fontSize: "12px", color: T.purple, lineHeight: 1.6, padding: "8px 0" }}>
          <strong>Proximity detection:</strong> discrimination is provided by the AS-RPA primers, not by crRNA mismatch. The crRNA binds a conserved region near the mutation site.
        </div>
      );
    }
    return (
      <div style={{ fontSize: "12px", color: T.textTer, lineHeight: 1.6, padding: "8px 0" }}>
        WT spacer not available. Mismatch profile cannot be displayed.
      </div>
    );
  }
  return (
    <div style={{ fontFamily: MONO, fontSize: "12px", lineHeight: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
        <span style={{ width: 40, fontSize: "10px", color: T.textTer, fontWeight: 600 }}>MUT</span>
        {spacer.split("").map((c, i) => {
          const mm = c !== wtSpacer[i];
          return (<span key={`m${i}`} style={{ width: 18, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", fontWeight: 600, fontSize: "11px", background: mm ? NUC[c] : "transparent", color: mm ? "#FFFFFF" : NUC[c], border: mm ? "none" : `1px solid ${T.borderLight}` }}>{c}</span>);
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
        <span style={{ width: 40 }} />
        {spacer.split("").map((c, i) => (<span key={`d${i}`} style={{ width: 18, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: c !== wtSpacer[i] ? T.danger : T.borderLight, fontWeight: 600 }}>{c !== wtSpacer[i] ? "▼" : "·"}</span>))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ width: 40, fontSize: "10px", color: T.textTer, fontWeight: 600 }}>WT</span>
        {wtSpacer.split("").map((c, i) => {
          const mm = c !== spacer[i];
          return (<span key={`w${i}`} style={{ width: 18, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", fontWeight: 600, fontSize: "11px", background: mm ? "#F3F4F6" : "transparent", color: mm ? T.textSec : NUC[c], border: mm ? `1px solid ${T.border}` : `1px solid ${T.borderLight}` }}>{c}</span>);
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
        <span style={{ width: 40 }} />
        {spacer.split("").map((_, i) => (<span key={`p${i}`} style={{ width: 18, textAlign: "center", fontSize: "8px", color: [1, 2, 3, 4, 5, 6, 7, 8].includes(i + 1) ? T.primary : T.textTer, fontWeight: [1, 2, 3, 4, 5, 6, 7, 8].includes(i + 1) ? 700 : 400 }}>{i + 1}</span>))}
      </div>
      <div style={{ fontSize: "10px", color: T.textTer, marginTop: "6px" }}>Positions 1–8 (blue) = PAM-proximal seed region. Mismatches here have strongest effect on Cas12a discrimination.</div>
    </div>
  );
};

const CandidateViewer = ({ r, onClose }) => {
  if (!r) return null;
  const mobile = useIsMobile();
  const toast = useToast();
  const ref = r.refs;
  const discColor = r.disc >= 3 ? T.success : r.disc >= 2 ? T.primary : r.disc >= 1.5 ? T.warning : T.danger;
  // Use SM-enhanced spacer when available (the actual crRNA to synthesize)
  const displaySpacer = (r.hasSM && r.smSpacer) ? r.smSpacer : r.spacer;

  /* Compute per-feature scores deterministically from candidate data */
  const computeFeatures = () => {
    if (r.scoringBreakdown) {
      /* Real API data; use actual per-feature scores from pipeline HeuristicScore */
      const sb = r.scoringBreakdown;
      return [
        { ...SCORING_FEATURES[0], raw: +(1 - (sb.seed_position_score || 0)).toFixed(3), weighted: +((1 - (sb.seed_position_score || 0)) * 0.35).toFixed(4) },
        { ...SCORING_FEATURES[1], raw: +(1 - (sb.gc_penalty || 0)).toFixed(3), weighted: +((1 - (sb.gc_penalty || 0)) * 0.20).toFixed(4) },
        { ...SCORING_FEATURES[2], raw: +(1 - (sb.structure_penalty || 0)).toFixed(3), weighted: +((1 - (sb.structure_penalty || 0)) * 0.20).toFixed(4) },
        { ...SCORING_FEATURES[3], raw: +(1 - (sb.homopolymer_penalty || 0)).toFixed(3), weighted: +((1 - (sb.homopolymer_penalty || 0)) * 0.10).toFixed(4) },
        { ...SCORING_FEATURES[4], raw: +(1 - (sb.offtarget_penalty || 0)).toFixed(3), weighted: +((1 - (sb.offtarget_penalty || 0)) * 0.15).toFixed(4) },
      ];
    }
    /* Mock data; simulate deterministically from spacer */
    const seed = r.spacer.charCodeAt(0) + r.spacer.charCodeAt(1);
    return SCORING_FEATURES.map((f, i) => {
      let raw;
      if (f.key === "gc") raw = 1 - Math.abs(r.gc - 0.5) * 4;
      else if (f.key === "offtarget") raw = r.ot === 0 ? 1.0 : r.ot <= 1 ? 0.6 : 0.2;
      else raw = 0.4 + ((seed * (i + 7) * 13) % 60) / 100;
      raw = Math.max(0, Math.min(1, raw));
      return { ...f, raw: +raw.toFixed(3), weighted: +(raw * f.weight).toFixed(4) };
    });
  };
  const features = computeFeatures();
  const compositeCalc = features.reduce((a, f) => a + f.weighted, 0);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: mobile ? "100%" : 720, background: T.bg, boxShadow: "none", zIndex: 10000, overflow: "auto", borderLeft: mobile ? "none" : `1px solid ${T.border}` }}>
      <div style={{ padding: mobile ? "16px 16px" : "24px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: T.bg, zIndex: 1 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: mobile ? "6px" : "10px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: mobile ? "16px" : "20px", fontWeight: 600, fontFamily: MONO, color: T.text }}>{r.gene}</span>
            <span style={{ fontSize: mobile ? "13px" : "16px", fontFamily: MONO, color: T.textSec }}>{r.ref}{r.pos}{r.alt}</span>
            <DrugBadge drug={r.drug} />
            <Badge variant={r.strategy === "Direct" ? "success" : "purple"}>{r.strategy}</Badge>
          </div>
          <div style={{ fontSize: "12px", color: T.textSec }}>{r.drugFull} resistance · WHO Tier {r.tier} · {r.conf} confidence</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}><X size={20} color={T.textSec} /></button>
      </div>

      <div style={{ padding: mobile ? "16px" : "24px 28px" }}>
        {/* Key metrics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: mobile ? "8px" : "0", background: T.bg, border: `1px solid ${T.border}`, borderRadius: "4px", padding: mobile ? "12px" : "16px", marginBottom: "24px" }}>
          {[
            { l: "Activity", v: (r.cnnCalibrated ?? r.score).toFixed(3), c: (r.cnnCalibrated ?? r.score) > 0.7 ? T.primary : (r.cnnCalibrated ?? r.score) > 0.5 ? T.warning : T.danger },
            ...(r.pamAdjusted != null && r.pamPenalty != null && r.pamPenalty < 1.0 ? [{ l: "PAM-adjusted", v: `${r.pamAdjusted.toFixed(3)} (${r.pamPenalty}×)`, c: T.textSec }] : []),
            { l: r.strategy === "Proximity" ? "Disc (AS-RPA)" : "Discrimination", v: r.strategy === "Proximity" ? (r.asrpaDiscrimination ? (r.asrpaDiscrimination.block_class === "none" ? "1× (no mismatch)" : `${r.asrpaDiscrimination.disc_ratio >= 100 ? "≥100" : r.asrpaDiscrimination.disc_ratio.toFixed(0)}× ${r.asrpaDiscrimination.terminal_mismatch}`) : "AS-RPA") : r.gene === "IS6110" ? "N/A (control)" : `${typeof r.disc === "number" ? r.disc.toFixed(1) : r.disc}×`, c: r.strategy === "Proximity" ? (r.asrpaDiscrimination?.block_class === "none" ? T.danger : T.purple) : r.gene === "IS6110" ? T.textTer : discColor },
            ...(r.strategy === "Proximity" && r.proximityDistance ? [{ l: "Distance", v: `${r.proximityDistance} bp`, c: T.purple }] : []),
            { l: "Activity QC", v: r.activityQc != null ? r.activityQc.toFixed(3) : (r.score ?? 0).toFixed(3), c: T.textTer },
            ...(r.discriminationQc != null ? [{ l: "Disc QC", v: r.discriminationQc.toFixed(3), c: r.discriminationQc > 0.6 ? T.success : r.discriminationQc > 0.3 ? T.warning : T.danger }] : []),
            { l: "GC%", v: `${(r.gc * 100).toFixed(0)}%`, c: T.text },
            { l: "Off-targets", v: r.ot, c: r.ot === 0 ? T.success : T.warning },
            { l: "PAM", v: r.pam, c: T.text, badge: r.pamVariant && r.pamVariant !== "TTTV" ? r.pamVariant : null, penalty: r.pamPenalty },
          ].map((s, i) => (
            <div key={s.l} style={{ flex: mobile ? "1 1 40%" : 1, textAlign: "center", borderLeft: !mobile && i > 0 ? `1px dashed ${T.border}` : "none", minWidth: mobile ? "30%" : "auto" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{s.l}</div>
              <div style={{ fontSize: mobile ? "15px" : "18px", fontWeight: 600, color: s.c, fontFamily: FONT }}>{s.v}</div>
              {s.badge && <div style={{ marginTop: "3px", display: "inline-block", padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: 600, fontFamily: FONT, background: s.penalty >= 0.5 ? "#FEF3C7" : "#FEF2F2", color: s.penalty >= 0.5 ? "#1D4ED8" : "#DC2626" }}>{s.badge} {s.penalty != null ? `${s.penalty}×` : ""}</div>}
            </div>
          ))}
        </div>

        {/* PROXIMITY explanation block */}
        {r.strategy === "Proximity" && (
          <div style={{ background: T.purpleLight, border: `1px solid ${T.purple}33`, borderRadius: "4px", padding: "16px 20px", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: T.purple, fontFamily: HEADING, marginBottom: "6px" }}>Proximity Detection: PAM Desert Region</div>
            <div style={{ fontSize: "12px", color: "#2563EB", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 6px" }}>
                The <strong>{r.gene} {r.ref}{r.pos}{r.alt}</strong> mutation sits in a high-GC region with no Cas12a PAM placing the SNP within any spacer.
                Instead, the crRNA binds a conserved site <strong>{r.proximityDistance ? `${r.proximityDistance} bp` : "nearby"}</strong> from the mutation.
              </p>
              <p style={{ margin: 0 }}>
                Discrimination is provided by <strong>allele-specific RPA (AS-RPA) primers</strong> whose 3′ terminal nucleotide matches only the resistance allele.
                The crRNA confirms the amplified region is the correct locus.
              </p>
            </div>
          </div>
        )}

        {/* Amplicon Map */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "8px" }}>Amplicon Map</div>
          <div style={{ background: T.bgSub, borderRadius: "4px", padding: "12px 8px", border: `1px solid ${T.borderLight}` }}>
            <AmpliconMap r={r} />
          </div>
        </div>

        {/* crRNA Spacer */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "8px" }}>crRNA Spacer</div>
          <div style={{ background: T.bgSub, borderRadius: "4px", padding: "12px 14px", border: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "10px", color: T.textTer, marginRight: "6px" }}>5'→</span>
              <Seq s={displaySpacer} />
              <span style={{ fontSize: "10px", color: T.textTer, marginLeft: "6px" }}>→3'</span>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(displaySpacer); toast("Spacer copied to clipboard"); }} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: T.textSec }}>
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>

        {/* Mismatch Profile */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "4px" }}>MUT vs WT Mismatch Profile</div>
          <div style={{ fontSize: "11px", color: T.textSec, marginBottom: "10px" }}>Mismatched positions between mutant and wildtype spacer alignment</div>
          <div style={{ background: T.bgSub, borderRadius: "4px", padding: "14px", border: `1px solid ${T.borderLight}`, overflowX: "auto" }}>
            <MismatchProfile spacer={displaySpacer} wtSpacer={r.wtSpacer} strategy={r.strategy} />
          </div>
        </div>

        {/* Evidence */}
        {ref && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "10px" }}>Evidence</div>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
              {[
                ["WHO Classification", ref.who, ref.who === "Associated" ? "success" : "warning"],
                ["WHO Catalogue", ref.catalogue, null],
                ["Clinical Frequency", ref.freq, null],
                ["CRyPTIC Dataset", ref.cryptic || "N/A", null],
              ].map(([k, v, type], i, arr) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none", fontSize: "12px" }}>
                  <span style={{ color: T.textSec }}>{k}</span>
                  {type === "success" || type === "warning" ? <Badge variant={type}>{v}</Badge>
                   : <span style={{ fontWeight: 600, color: T.text }}>{v}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Oligo Sequences */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "10px" }}>Oligo Sequences</div>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
            {[
              { name: `${r.gene}_${r.ref}${r.pos}${r.alt}_crRNA`, seq: `AATTTCTACTCTTGTAGAT${displaySpacer}`, note: "Direct repeat + spacer (IVT template)" },
              ...(r.fwd ? [{ name: `${r.gene}_${r.ref}${r.pos}${r.alt}_FWD`, seq: r.fwd, note: "RPA forward primer" }] : []),
              ...(r.rev ? [{ name: `${r.gene}_${r.ref}${r.pos}${r.alt}_REV`, seq: r.rev, note: "RPA reverse primer" }] : []),
            ].map((o, i, arr) => (
              <div key={o.name} style={{ padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: MONO, color: T.text }}>{o.name}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(o.seq); toast(`${o.name} copied`); }} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: "5px", padding: "3px 6px", cursor: "pointer", fontSize: "10px", color: T.textSec, display: "flex", alignItems: "center", gap: "3px" }}><Copy size={10} /> Copy</button>
                </div>
                <Seq s={o.seq} />
                <div style={{ fontSize: "10px", color: T.textTer, marginTop: "3px" }}>{o.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Breakdown; 5 real pipeline features */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "4px" }}>Scoring Breakdown</div>
          <div style={{ fontSize: "11px", color: T.textSec, marginBottom: "10px" }}>Per-feature contribution to composite score (heuristic model)</div>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
            {features.map((f, i) => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", borderBottom: i < features.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
                <div style={{ width: 130, fontSize: "11px", fontWeight: 600, color: T.text, flexShrink: 0 }}>{f.name}</div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, height: 6, background: T.bgSub, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${f.raw * 100}%`, height: "100%", background: f.raw > 0.7 ? T.primary : f.raw > 0.4 ? T.warning : T.danger, borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: T.textSec, width: 36, textAlign: "right" }}>{(f.raw * 100).toFixed(0)}%</span>
                </div>
                <div style={{ width: 40, textAlign: "right", fontSize: "10px", color: T.textTer, fontFamily: FONT }}>×{(f.weight * 100).toFixed(0)}%</div>
                <div style={{ width: 50, textAlign: "right", fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: T.text }}>{f.weighted.toFixed(3)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", padding: "10px 14px", background: T.bgSub }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: T.textSec }}>Composite Score</span>
              <span style={{ fontFamily: FONT, fontSize: "14px", fontWeight: 600, color: T.text }}>{compositeCalc.toFixed(3)}</span>
              <span style={{ fontSize: "10px", color: T.textTer }}>(actual: {(r.score ?? 0).toFixed(3)})</span>
            </div>
          </div>
        </div>

        {/* Amplicon details */}
        {r.hasPrimers && (
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "8px" }}>Amplicon Details</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ flex: "1 1 auto", minWidth: mobile ? "100%" : 0, background: T.bgSub, borderRadius: "4px", padding: "12px", fontSize: "12px" }}>
                <div style={{ color: T.textTer, marginBottom: "4px" }}>Amplicon length</div>
                <div style={{ fontWeight: 600, fontFamily: FONT, color: T.text }}>{r.amplicon} bp</div>
              </div>
              <div style={{ flex: "1 1 auto", minWidth: mobile ? "45%" : 0, background: T.bgSub, borderRadius: "4px", padding: "12px", fontSize: "12px" }}>
                <div style={{ color: T.textTer, marginBottom: "4px" }}>Strategy</div>
                <div style={{ fontWeight: 600, color: T.text }}>{r.strategy}</div>
              </div>
              <div style={{ flex: "1 1 auto", minWidth: mobile ? "45%" : 0, background: r.hasSM ? T.primaryLight : T.bgSub, borderRadius: "4px", padding: "12px", fontSize: "12px" }}>
                <div style={{ color: T.textTer, marginBottom: "4px" }}>Synthetic mismatch</div>
                <div style={{ fontWeight: 600, color: r.hasSM ? T.primaryDark : T.textTer }}>{r.hasSM ? "Applied" : "None"}</div>
              </div>
            </div>
            {/* Shared amplicon warning for same-codon targets */}
            {(() => {
              const codonGroups = { "rpoB_RRDR": ["rpoB_S531L", "rpoB_H526Y", "rpoB_D516V"], "embB_M306": ["embB_M306V", "embB_M306I"] };
              for (const [, group] of Object.entries(codonGroups)) {
                if (group.includes(r.label)) {
                  const siblings = group.filter(l => l !== r.label);
                  return (
                    <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "4px", fontSize: "11px", color: T.textSec, lineHeight: 1.6 }}>
                      <strong style={{ color: T.warning }}>Shared amplicon:</strong> This target shares the same amplicon region with {siblings.join(", ")}. In a single-pot assay both mutations produce a positive drug-class signal, but the specific amino acid change cannot be resolved without additional crRNA reporters.
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export { AmpliconMap, MismatchProfile, CandidateViewer };
