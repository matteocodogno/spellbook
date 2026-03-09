import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import type { PrereqTool } from "../data/prereqs";

interface ToolRowProps {
  tool: PrereqTool;
}

export function ToolRow({ tool }: ToolRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      marginTop: 8,
      borderRadius: 8,
      border: `1px solid ${open ? "rgba(100,255,218,0.2)" : "rgba(255,255,255,0.05)"}`,
      background: open ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.02)",
      overflow: "hidden",
      transition: "all 0.15s",
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", cursor: "pointer",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          color: open ? "#64FFDA" : "#8B949E",
          minWidth: 160,
        }}>{tool.name}</span>
        <span style={{ flex: 1, fontSize: 11, color: "#555E6D" }}>{tool.why}</span>
        <code style={{
          fontSize: 10, color: "#A8FF78", background: "rgba(168,255,120,0.07)",
          padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
        }}>{tool.check}</code>
        <span style={{ fontSize: 10, color: open ? "#64FFDA" : "#444C56", marginLeft: 8 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ fontSize: 10, color: "#555E6D", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            Install
          </div>
          <CodeBlock code={tool.install} color="#64FFDA" />
        </div>
      )}
    </div>
  );
}
