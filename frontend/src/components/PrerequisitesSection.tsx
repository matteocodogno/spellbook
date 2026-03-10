import { useState } from "react";
import { ToolRow } from "./ToolRow";
import { prereqs, osLabels } from "../data/prereqs";

export function PrerequisitesSection() {
  const [activeOs, setActiveOs] = useState("macos");
  const tools = prereqs[activeOs];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto 48px" }}>
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 10, color: "#8B949E", letterSpacing: 3, marginBottom: 4, textTransform: "uppercase" }}>
            Prerequisites
          </div>
          <div style={{ fontSize: 12, color: "#555E6D", marginBottom: 16 }}>
            Install these tools before starting Phase 00
          </div>
          {/* OS Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {Object.entries(osLabels).map(([os, label]) => (
              <button
                key={os}
                onClick={() => setActiveOs(os)}
                style={{
                  padding: "8px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeOs === os ? "#64FFDA" : "transparent"}`,
                  color: activeOs === os ? "#64FFDA" : "#555E6D",
                  fontSize: 12,
                  fontFamily: "inherit",
                  fontWeight: activeOs === os ? 700 : 400,
                  cursor: "pointer",
                  marginBottom: -1,
                  transition: "all 0.15s",
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool rows */}
        <div style={{ padding: "8px 16px 16px" }}>
          {tools.map((tool, i) => (
            <ToolRow key={i} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
}
