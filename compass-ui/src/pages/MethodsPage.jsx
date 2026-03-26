import React, { useState, useRef } from "react";
import {
  BookOpen, Brain, ChevronDown, ChevronRight, ExternalLink, Layers, Map, Settings,
  Shield, TrendingUp, Zap,
} from "lucide-react";
import { T, FONT, HEADING, MONO } from "../tokens";
import { useIsMobile } from "../hooks/useIsMobile";
import { BIBLIOGRAPHY } from "../mockData";

const MethodsPage = () => {
  const mobile = useIsMobile();
  const [openSections, setOpenSections] = useState({ pipeline: false, narsilml: false, architecture: false, clinical: false, discrimination: false, nuclease: false, defaults: false, limitations: false, references: false });
  const sectionRefs = useRef({});

  const toggle = (k) => setOpenSections(prev => {
    const willOpen = !prev[k];
    if (willOpen) {
      setTimeout(() => {
        sectionRefs.current[k]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
    return { ...prev, [k]: willOpen };
  });

  /* ── Reusable section card; grey header bar, collapsible body ── */
  const Section = ({ id, title, subtitle, badge, children }) => {
    const isOpen = openSections[id];
    return (
      <div ref={el => { sectionRefs.current[id] = el; }} style={{ marginBottom: "12px", border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden", background: T.bg }}>
        <button onClick={() => toggle(id)} style={{
          display: "flex", alignItems: "center", width: "100%", padding: "14px 20px",
          background: T.bgSub, border: "none", cursor: "pointer", fontFamily: FONT,
          gap: "10px", textAlign: "left",
        }}>
          <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isOpen ? <ChevronDown size={14} color={T.textSec} /> : <ChevronRight size={14} color={T.textSec} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: T.text, fontFamily: HEADING }}>{title}</span>
              {badge && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "3px", background: badge.bg || T.primaryLight, color: badge.color || T.primary, fontFamily: FONT }}>{badge.text}</span>}
            </div>
            {subtitle && <div style={{ fontSize: "12px", color: T.textSec, marginTop: "2px", lineHeight: 1.4 }}>{subtitle}</div>}
          </div>
          <span style={{ fontSize: "10px", color: T.textTer, flexShrink: 0 }}>{isOpen ? "collapse" : "expand"}</span>
        </button>
        {isOpen && <div style={{ padding: mobile ? "16px" : "20px 24px", borderTop: `1px solid ${T.border}` }}>{children}</div>}
      </div>
    );
  };

  /* ── Key-value row ── */
  const KV = ({ label, value, mono }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "12px", padding: "8px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <span style={{ fontSize: "12px", color: T.textTer, fontWeight: 500, minWidth: mobile ? 90 : 130, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color: T.text, fontFamily: mono ? MONO : FONT }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: mobile ? "24px 16px" : "32px 40px" }}>

      {/* ═══ Page Header ═══ */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, color: T.text, fontFamily: HEADING, margin: 0, letterSpacing: "-0.01em" }}>Methods</h1>
        <p style={{ fontSize: "13px", color: T.textSec, marginTop: "4px", lineHeight: 1.5 }}>
          How COMPASS designs, scores, and validates CRISPR-Cas12a diagnostic panels for drug-resistant tuberculosis.
        </p>
      </div>

      {/* ═══════════ 1. PIPELINE ═══════════ */}
      <Section id="pipeline" title="Pipeline" subtitle="End-to-end from WHO mutation catalogue to validated diagnostic panel" badge={{ text: "4 stages", bg: T.primaryLight, color: T.primary }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(4, 1fr)", gap: "0", border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
          {[
            { n: "01", icon: Map, title: "Define targets", desc: "Resolve WHO catalogue mutations to H37Rv genomic coordinates, codon context, and drug class annotations.", color: T.primary },
            { n: "02", icon: Brain, title: "Score candidates", desc: "Scan PAM sites, generate crRNAs, and predict activity with Compass-ML trained on Kim et al. 2018 high-throughput AsCas12a indel data (~15K targets).", color: T.primary },
            { n: "03", icon: Zap, title: "Optimise panel", desc: "Simulated annealing over candidate assignments with co-designed AS-RPA primers and multiplex constraints.", color: T.primaryDark },
            { n: "04", icon: Shield, title: "Assess clinically", desc: "Evaluate against WHO TPP thresholds for per-drug sensitivity, specificity, and three operating modes.", color: T.success },
          ].map((c, i) => (
            <div key={c.n} style={{ padding: "20px", borderLeft: i > 0 && !mobile ? `1px solid ${T.border}` : "none", borderTop: i > 0 && mobile ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: T.bgSub, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <c.icon size={16} color={c.color} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: T.textTer, fontFamily: MONO }}>{c.n}</span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, fontFamily: HEADING, marginBottom: "6px" }}>{c.title}</div>
              <div style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ 2. COMPASS-ML ═══════════ */}
      <Section id="narsilml" title="Compass-ML" subtitle="Dual-branch neural network predicting Cas12a guide efficiency and mismatch discrimination" badge={{ text: "235K params", bg: T.primaryLight, color: T.primary }}>

        {/* Metric strip */}
        <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
          {[
            { label: "PARAMETERS", value: "235K" },
            { label: "VAL \u03c1", value: "0.750" },
            { label: "DISC \u03c1 (XGB)", value: "0.57" },
            { label: "PAM", value: "9-class encoding" },
            { label: "INFERENCE", value: "<1ms" },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, padding: "14px 12px", textAlign: "center", borderLeft: i > 0 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: "10px", fontWeight: 500, color: T.textTer, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 600, color: T.text, fontFamily: MONO }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Three branches */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {[
            { tag: "CNN", title: "Target DNA Branch", desc: "Multi-scale convolutions (k=3,5,7) scan the 34-nt target context for PAM quality, seed composition, and dinucleotide patterns." },
            { tag: "RNA-FM", title: "Guide RNA Branch", desc: "Pre-trained foundation model (~23.7M non-coding RNA sequences) captures folding stability and accessibility governing Cas12a loading." },
            { tag: "RLPA", title: "R-Loop Propagation", desc: "Directional attention encodes PAM-proximal to distal R-loop propagation. Ablation: +0.1% over CNN+PAM+RNA-FM (consistent across 3 seeds)." },
          ].map(c => (
            <div key={c.tag} style={{ padding: "16px", border: `1px solid ${T.border}`, borderRadius: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: T.primary, padding: "2px 6px", borderRadius: "3px", background: T.primaryLight, fontFamily: MONO, display: "inline-block", marginBottom: "10px" }}>{c.tag}</span>
              <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, fontFamily: HEADING, marginBottom: "6px" }}>{c.title}</div>
              <div style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Multi-task callout */}
        <div style={{ background: T.primaryLight, border: `1px solid ${T.primary}25`, borderRadius: "4px", padding: "12px 16px", fontSize: "13px", color: T.primaryDark, lineHeight: 1.6, marginBottom: "20px" }}>
          <strong>Multi-task learning:</strong> Efficiency and discrimination are predicted jointly. Discrimination (the MUT/WT cleavage ratio) determines whether a guide can distinguish resistant from susceptible bacteria at single-nucleotide resolution.
        </div>

        {/* Technical details table */}
        <div style={{ fontSize: "11px", fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "8px" }}>Technical details</div>
        <div style={{ marginBottom: "16px" }}>
          {[
            ["Architecture", "Dual-branch CNN + RNA-FM with RLPA + 9-class PAM encoding"],
            ["Training data", "Kim 2018 (15K cis) + flanking shuffle augmentation"],
            ["Val \u03c1 (production)", "0.750 (best of 3 seeds, Kim 2018 HT1-2)"],
            ["Training protocol", "AdamW + CosineWarmRestarts + Huber + soft Spearman"],
            ["Multi-task heads", "Efficiency (sigmoid) + Discrimination (Softplus)"],
            ["Attention", "R-Loop Propagation Attention (RLPA), directional propagation bias"],
          ].map(([k, v]) => <KV key={k} label={k} value={v} />)}
        </div>

        {/* Benchmark callout */}
        <div style={{ background: T.bgSub, border: `1px solid ${T.border}`, borderRadius: "4px", padding: "12px 16px", fontSize: "12px", color: T.textSec, lineHeight: 1.65 }}>
          <strong style={{ color: T.text }}>Benchmark:</strong> Full architecture (CNN + PAM + RNA-FM + RLPA) achieves {"\u03c1"} = 0.750 on Kim 2018 HT1-2 validation (best of 3 seeds). Ablation: CNN-only {"\u03c1"} = 0.740, +PAM = 0.741, +RNA-FM = 0.744, +RLPA = 0.745. DeepCpf1 baseline (Kim 2018, Spearman, re-evaluated on HT1-2) {"\u03c1"} = 0.71.
        </div>
      </Section>

      {/* ═══════════ 3. ARCHITECTURE DETAIL ═══════════ */}
      <Section id="architecture" title="Architecture Detail" subtitle="Full layer-by-layer breakdown of the Compass-ML network">
        {[
          { label: "Branch 1", title: "Multi-Scale CNN", input: "34-nt one-hot encoded target (4 PAM + 20 protospacer + 10 flanking).", process: "Three parallel conv paths (k=3,5,7), 40 channels each, BN + dropout(0.3). Projected to 64-dim via 1\u00d71 conv.", output: "64-dim per position: dinucleotide preferences, seed complementarity, PAM patterns." },
          { label: "Branch 2", title: "RNA-FM Projection", input: "Guide RNA (20\u201323 nt). Processed by frozen RNA-FM (23M sequences, masked LM).", process: "640-dim per-nucleotide embeddings \u2192 trainable linear \u2192 64-dim. Zero-padded to 34 positions.", output: "64-dim structural embedding: folding, stability, 5\u2032 accessibility." },
          { label: "Fusion", title: "R-Loop Propagation Attention", input: "Concatenated 128-dim (64 CNN + 64 RNA-FM) at each of 34 positions.", process: "Single-head attention, 32-dim Q/K/V, directional propagation bias (PAM-proximal \u2192 distal), learnable 34\u00d734 positional bias.", output: "Attention-weighted 128-dim features re-weighted by positional importance." },
          { label: "Output", title: "Multi-Task Heads", input: "RLPA-weighted representation, globally pooled.", process: "Efficiency: 128\u219264\u219232\u21921 (sigmoid). Discrimination: 547\u219264\u219232\u21921 (Softplus).", output: "Two scalars: efficiency (0\u20131) and discrimination ratio (fold-change MUT/WT)." },
        ].map((block, idx, arr) => (
          <div key={block.title} style={{ padding: "16px 0", borderBottom: idx < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: T.primary, background: T.primaryLight, padding: "2px 8px", borderRadius: "3px", fontFamily: MONO, textTransform: "uppercase" }}>{block.label}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: T.text, fontFamily: HEADING }}>{block.title}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: "16px" }}>
              {[{ l: "Input", t: block.input }, { l: "Process", t: block.process }, { l: "Output", t: block.output }].map(col => (
                <div key={col.l}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>{col.l}</div>
                  <div style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6 }}>{col.t}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* ═══════════ 4. CLINICAL ASSESSMENT ═══════════ */}
      <Section id="clinical" title="Clinical Assessment" subtitle="WHO Target Product Profile compliance for drug susceptibility testing">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
          {[
            { icon: TrendingUp, title: "Per-drug sensitivity", desc: "WHO TPP minimums: \u226595% RIF, \u226590% INH/FQ, \u226580% EMB/PZA/AG." },
            { icon: Shield, title: "Specificity estimate", desc: "Discrimination ratio predicts false-positive rates. \u22653\u00d7 diagnostic-grade, \u226510\u00d7 reference-lab." },
            { icon: Settings, title: "Three operating modes", desc: "High Sensitivity (field), Balanced (WHO TPP), High Specificity (reference lab)." },
            { icon: Layers, title: "Ranked alternatives", desc: "3\u20135 backup candidates per target with documented efficiency-discrimination tradeoffs." },
          ].map(c => (
            <div key={c.title} style={{ display: "flex", gap: "14px", padding: "16px", border: `1px solid ${T.border}`, borderRadius: "4px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "6px", flexShrink: 0, background: T.bgSub, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <c.icon size={16} color={T.primary} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, fontFamily: HEADING, marginBottom: "4px" }}>{c.title}</div>
                <div style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ 5. DISCRIMINATION THRESHOLDS ═══════════ */}
      <Section id="discrimination" title="Discrimination Thresholds" subtitle="Mismatch discrimination determines clinical deployment tier">
        <p style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6, margin: "0 0 16px" }}>
          For Direct candidates: Cas12a cleavage ratio (MUT/WT) predicted by XGBoost on 18 thermodynamic features (Spearman \u03c1 = 0.57, trained on 6,136 paired MUT/WT measurements curated from Huang et al. 2024, LbCas12a). For Proximity candidates: AS-RPA primer selectivity.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "0", border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
          {[
            { label: "Excellent", val: "\u2265 10\u00d7", desc: "Single-plex clinical use. Robust across sample types.", color: T.success },
            { label: "Good", val: "\u2265 3\u00d7", desc: "Multiplex panel. Electrochemical and lateral flow.", color: T.primary },
            { label: "Acceptable", val: "\u2265 2\u00d7", desc: "Requires confirmatory readout or dual-target.", color: T.warning },
            { label: "Insufficient", val: "< 2\u00d7", desc: "Synthetic mismatch enhancement needed.", color: T.danger },
          ].map((t, i) => (
            <div key={t.label} style={{ padding: "16px 16px", borderLeft: i > 0 && !mobile ? `1px solid ${T.border}` : "none", borderTop: i >= 2 && mobile ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: "18px", fontWeight: 600, color: T.text, fontFamily: MONO, marginBottom: "2px" }}>{t.val}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: t.color, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px" }}>{t.label}</div>
              <div style={{ fontSize: "11px", color: T.textSec, lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* Synthetic mismatch enhancement */}
        <div style={{ background: T.bgSub, border: `1px solid ${T.border}`, borderRadius: "4px", padding: "12px 16px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: T.text, marginBottom: "4px" }}>Synthetic Mismatch Enhancement</div>
          <div style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6 }}>
            For candidates with insufficient discrimination, deliberate mismatches within the seed region (positions 1{"\u2013"}8) destabilize wildtype binding while preserving mutant recognition. Kohabir et al. (2024, Cell Reports Methods) demonstrated improvements of 6{"\u2013"}7.5{"\u00d7"} at PAM+4 (Kohabir et al. 2024), with up to {">"}10{"\u00d7"} in favourable seed contexts (Chen et al. 2018; Teng et al. 2019).
          </div>
        </div>
      </Section>

      {/* ═══════════ 6. NUCLEASE REFERENCE ═══════════ */}
      <Section id="nuclease" title="Cas12a (Cpf1) Reference" subtitle="Class 2, Type V-A CRISPR effector for isothermal reporter-based detection">
        <p style={{ fontSize: "12px", color: T.textSec, lineHeight: 1.6, margin: "0 0 14px" }}>
          Recognises T-rich PAM upstream, generates staggered DSBs, and activates non-specific ssDNase (trans-cleavage) for isothermal reporter-based detection at 37{"\u00b0"}C.
        </p>
        <div>
          {[
            ["Variant", "WT AsCas12a / enAsCas12a (selectable)"],
            ["PAM", "TTTV (canonical) + expanded non-canonical PAMs (enAsCas12a, Kleinstiver et al. 2019)"],
            ["crRNA", "20 nt scaffold (pseudoknot) + 20\u201323 nt spacer"],
            ["Trans-cleavage", "Non-specific ssDNase (reporter activation)"],
            ["Temperature", "37\u00b0C (RPA-compatible)"],
            ["Readouts", "Electrochemical (SWV on LIG-E) \u00b7 lateral flow \u00b7 fluorescence"],
          ].map(([k, v]) => <KV key={k} label={k} value={v} />)}
        </div>
      </Section>

      {/* ═══════════ 7. PIPELINE DEFAULTS ═══════════ */}
      <Section id="defaults" title="Pipeline Defaults" subtitle="Default parameters for guide design, filtering, and panel optimisation">
        <div>
          {[
            ["PAM", "TTTV + 8 expanded", "enAsCas12a: 9 PAM variants with activity penalties"],
            ["Spacer length", "20\u201323 nt", "20 canonical; 21\u201323 for high-GC targets"],
            ["GC range", "40\u201385%", "TB-adjusted (genome 65.6% GC)"],
            ["Max homopolymer", "4 nt", "Poly-runs \u22655 risk polymerase slippage during RPA and crRNA misfolding"],
            ["Off-target", "\u22643 mismatches", "Bowtie2 against full genome"],
            ["RPA amplicon", "80\u2013120 bp", "Optimised for blood cfDNA (~140 bp median)"],
            ["Discrimination min", "2.0\u00d7", "\u22653.0\u00d7 for electrochemical/LFA"],
          ].map(([param, value, rationale], i, arr) => (
            <div key={param} style={{ display: "flex", alignItems: "baseline", gap: "12px", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: T.text, minWidth: mobile ? 90 : 130, flexShrink: 0 }}>{param}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: T.primary, minWidth: 90, flexShrink: 0, fontFamily: MONO }}>{value}</span>
              <span style={{ fontSize: "11px", color: T.textTer, flex: 1 }}>{rationale}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ 8. LIMITATIONS ═══════════ */}
      <Section id="limitations" title="Limitations" subtitle="All predictions are in silico estimates. Experimental validation is required before diagnostic deployment.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
          {[
            { title: "Discrimination prediction", text: "XGBoost (18 features) r=0.57 on 6,136 EasyDesign pairs. pam_to_mm_distance is top feature. Heuristic baseline r\u22480.30." },
            { title: "Training domain shift", text: "Efficiency trained on AsCas12a (Kim 2018), discrimination on LbCas12a (Huang 2024), deployed on enAsCas12a. Human cell lines \u2192 M.tb (65.6% GC). Cross-enzyme generalisation assumed but not experimentally validated." },
            { title: "AS-RPA specificity", text: "Boltzmann thermodynamic estimates, not experimentally validated. Ratios >100\u00d7 are capped." },
            { title: "Multiplex compatibility", text: "Cross-reactivity by sequence homology. Primer dimer stability predicted but not yet in SA cost function." },
            { title: "Blood cfDNA variability", text: "M.tb cfDNA is detectable in only ~50-60% of smear-positive patients (Lancet Microbe 2022). Paucibacillary and HIV-coinfected cases may have undetectable levels. cfDNA fragment sizes may differ from the ~140 bp human nucleosomal fragments used to set the 120 bp amplicon cap." },
            { title: "Shared amplicons", text: "Targets in same gene region may share amplicons. Cannot resolve specific amino acid changes without distinct crRNA reporters." },
            { title: "Amplicon folding", text: "No \u0394G_fold calculation. GC-rich M.tb amplicons risk stable hairpins blocking recombinase invasion." },
            { title: "Specificity estimates", text: "Theoretical upper bound (1\u22121/D) assuming zero signal variance. Real specificity on LIG-E electrodes will be lower due to intra-device CV (~5% RSD) and electrode-to-electrode variability." },
            { title: "Reporter independence", text: "Compass-ML predicts Cas12a trans-cleavage, not reporter chemistry. Absolute signal is platform-dependent." },
            { title: "Bedaquiline (BDQ) not covered", text: "The 2024 WHO TPP update added BDQ as a minimum criterion for next-generation DST. The current 14-plex panel does not include BDQ resistance markers (Rv0678, atpE). Future panel revisions should incorporate BDQ targets." },
          ].map((item, i) => (
            <div key={i} style={{ padding: "14px 16px", border: `1px solid ${T.borderLight}`, borderRadius: "4px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: T.text, marginBottom: "4px" }}>{item.title}</div>
              <div style={{ fontSize: "11px", color: T.textSec, lineHeight: 1.6 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════ 9. REFERENCES ═══════════ */}
      <Section id="references" title={`References (${BIBLIOGRAPHY.length})`} subtitle="Primary literature supporting COMPASS pipeline design and validation">
        {(() => {
          const categories = [...new Set(BIBLIOGRAPHY.map(b => b.category))];
          return categories.map((cat, catIdx) => (
            <div key={cat} style={{ marginBottom: catIdx < categories.length - 1 ? "16px" : 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: T.primary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px", paddingBottom: "6px", borderBottom: `1px solid ${T.borderLight}` }}>{cat}</div>
              {BIBLIOGRAPHY.filter(b => b.category === cat).map((b, i, arr) => (
                <div key={b.id} style={{
                  padding: "8px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none",
                  display: "flex", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "center",
                  gap: "12px", flexDirection: mobile ? "column" : "row",
                }}>
                  <div style={{ flex: 1, fontSize: "12px", lineHeight: 1.5, color: T.textSec }}>
                    <strong style={{ color: T.text }}>{b.authors} ({b.year}).</strong>{" "}
                    {b.title}.{" "}
                    <span style={{ color: T.textTer }}>{b.journal}.</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {b.doi && <a href={`https://doi.org/${b.doi}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: T.primary, textDecoration: "none", fontWeight: 600, padding: "2px 6px", borderRadius: "3px", background: T.primaryLight }}>DOI</a>}
                    {b.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${b.pmid}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: T.primary, textDecoration: "none", fontWeight: 600, padding: "2px 6px", borderRadius: "3px", background: T.primaryLight }}>PubMed</a>}
                    {!b.doi && !b.pmid && b.url && <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: T.primary, textDecoration: "none", fontWeight: 600, padding: "2px 6px", borderRadius: "3px", background: T.primaryLight }}>Link</a>}
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}
      </Section>

      <div style={{ height: "32px" }} />
    </div>
  );
};


export { MethodsPage };
