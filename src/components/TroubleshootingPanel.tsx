import { useState } from "react";
import type { TroubleshootingTip } from "../data/phases";

interface TroubleshootingPanelProps {
  tips?: TroubleshootingTip[];
  color: string;
}

export function TroubleshootingPanel({ tips }: TroubleshootingPanelProps) {
  const [open, setOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!tips || tips.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: open ? "rgba(255,159,67,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${open ? "rgba(255,159,67,0.25)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 7, padding: "7px 12px",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,159,67,0.04)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      >
        <span style={{ fontSize: 12 }}>⚠</span>
        <span style={{ fontSize: 11, color: open ? "#FF9F43" : "#8B949E", fontWeight: 600, flex: 1, textAlign: "left" }}>
          Troubleshooting · {tips.length} common issue{tips.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 10, color: "#555E6D" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          border: "1px solid rgba(255,159,67,0.15)", borderTop: "none",
          borderRadius: "0 0 7px 7px", overflow: "hidden",
        }}>
          {tips.map((tip, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "9px 14px", cursor: "pointer",
                    background: isOpen ? "rgba(255,159,67,0.05)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 10, color: "#FF9F43", marginTop: 1, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 11, color: isOpen ? "#E6EDF3" : "#A8B3C1", flex: 1, lineHeight: 1.5 }}>
                    {tip.err}
                  </span>
                  <span style={{ fontSize: 9, color: "#555E6D", flexShrink: 0, marginTop: 1 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div style={{
                    padding: "8px 14px 10px 34px",
                    background: "rgba(0,0,0,0.2)",
                    borderTop: "1px solid rgba(255,159,67,0.1)",
                  }}>
                    <span style={{ fontSize: 10, color: "#64FFDA", marginRight: 6 }}>→</span>
                    <span style={{ fontSize: 11, color: "#8B949E", lineHeight: 1.6 }}>{tip.fix}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
