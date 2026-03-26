import React, { useState, useMemo } from "react";
import { Database, Search, ExternalLink } from "lucide-react";
import { T, FONT, HEADING, MONO } from "../tokens";
import { useIsMobile } from "../hooks/useIsMobile";
import { Badge, DrugBadge } from "../components/ui/index.jsx";
import { MUTATIONS, WHO_REFS } from "../mockData";

const MutationsPage = () => {
  const mobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [drugFilter, setDrugFilter] = useState("ALL");
  const drugs = ["ALL", ...new Set(MUTATIONS.map((m) => m.drug))];

  const filtered = useMemo(() => {
    let arr = [...MUTATIONS];
    if (drugFilter !== "ALL") arr = arr.filter((m) => m.drug === drugFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((m) => m.gene.toLowerCase().includes(q) || `${m.ref}${m.pos}${m.alt}`.toLowerCase().includes(q));
    }
    return arr;
  }, [search, drugFilter]);

  return (
    <div style={{ padding: mobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: T.primary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>Library</div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: T.text, margin: 0, letterSpacing: "-0.02em", fontFamily: HEADING }}>WHO Mutation Catalogue</h2>
        <p style={{ fontSize: "13px", color: T.textSec, marginTop: "4px" }}>{MUTATIONS.length} target mutations from WHO 2023 v2 catalogue</p>
      </div>

      <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: "10px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textTer }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search genes, mutations…" style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: "4px", border: `1px solid ${T.border}`, fontFamily: FONT, fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {drugs.map((d) => (
            <button key={d} onClick={() => setDrugFilter(d)} style={{
              padding: "6px 12px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: FONT,
              border: `1px solid ${drugFilter === d ? T.primary : T.border}`,
              background: drugFilter === d ? T.primaryLight : T.bg, color: drugFilter === d ? T.primaryDark : T.textSec,
            }}>{d}</button>
          ))}
        </div>
      </div>

      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: 600 }}>
          <thead>
            <tr style={{ background: T.bgSub }}>
              {["Gene", "Mutation", "Drug", "Confidence", "Tier", "WHO Freq"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: T.textSec, borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const key = `${m.gene}_${m.ref}${m.pos}${m.alt}`;
              const ref = WHO_REFS[key];
              return (
                <tr key={key} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: "10px 14px", fontFamily: MONO, fontWeight: 600 }}>{m.gene}</td>
                  <td style={{ padding: "10px 14px", fontFamily: MONO }}>{m.ref}{m.pos}{m.alt}</td>
                  <td style={{ padding: "10px 14px" }}><DrugBadge drug={m.drug} /></td>
                  <td style={{ padding: "10px 14px" }}><Badge variant={m.conf === "High" ? "success" : "warning"}>{m.conf}</Badge></td>
                  <td style={{ padding: "10px 14px", fontFamily: FONT }}>{m.tier}</td>
                  <td style={{ padding: "10px 14px", fontSize: "11px", color: T.textSec }}>{ref?.freq || "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div style={{ padding: "12px 16px", fontSize: "11px", color: T.textTer, borderTop: `1px solid ${T.border}`, background: T.bgSub }}>
          Showing {filtered.length} of {MUTATIONS.length} mutations
        </div>
      </div>
    </div>
  );
};


export { MutationsPage };
