import { commFlow } from "../data/commFlow";

export function CommunicationMap() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto 48px" }}>
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "20px 24px",
      }}>
        <div style={{ fontSize: 10, color: "#8B949E", letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>
          Tool communication map
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {commFlow.map((c, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
            }}>
              <span style={{ color: "#CDD6F4" }}>{c.from}</span>
              <span style={{ color: "#444C56" }}>──</span>
              <span style={{ color: "#8B949E", fontStyle: "italic" }}>{c.label}</span>
              <span style={{ color: "#444C56" }}>──▶</span>
              <span style={{ color: "#CDD6F4" }}>{c.to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
