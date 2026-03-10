interface ShortcutsModalProps {
  onClose: () => void;
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0D1117",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: "28px 32px",
          minWidth: 340,
          maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E6EDF3", letterSpacing: 0.5 }}>
            ⌨ Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 5, padding: "2px 8px", cursor: "pointer",
              color: "#555E6D", fontSize: 11, fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#E6EDF3"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#555E6D"; }}
          >esc</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { keys: ["n"],   label: "Jump to next incomplete step" },
            { keys: ["j"],   label: "Move cursor down" },
            { keys: ["k"],   label: "Move cursor up" },
            { keys: ["↵"],   label: "Expand / collapse focused step" },
            { keys: ["x"],   label: "Mark focused step done" },
            { keys: ["/"],   label: "Open search" },
            { keys: ["esc"], label: "Collapse / dismiss" },
            { keys: ["?"],   label: "Toggle this modal" },
            { keys: ["p"],   label: "Toggle presenter mode" },
            { keys: ["s"],   label: "Spotlight focused step" },
            { keys: ["c"],   label: "Copy code of focused step" },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 12, color: "#8B949E" }}>{label}</span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {keys.map(k => (
                  <kbd key={k} style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 5, padding: "3px 9px",
                    fontFamily: "inherit", fontSize: 11,
                    background: "rgba(255,255,255,0.05)",
                    color: "#CDD6F4",
                    boxShadow: "0 1px 0 rgba(255,255,255,0.1)",
                  }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
