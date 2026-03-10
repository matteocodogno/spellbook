const items = [
  { icon: "↔", label: "MCP tool call (JSON-RPC over stdio)", color: "#64FFDA" },
  { icon: "⚙", label: "Subagent / spawned process", color: "#FFD166" },
  { icon: "⛔", label: "Hard gate — Claude waits for human input", color: "#FF9F43" },
  { icon: "✦", label: "Human action required", color: "#A8DAFF" },
];

export function FooterLegend() {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto 0", display: "flex", gap: 24, flexWrap: "wrap" }}>
      {items.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8B949E" }}>
          <span style={{ color: l.color }}>{l.icon}</span>
          {l.label}
        </div>
      ))}
    </div>
  );
}
