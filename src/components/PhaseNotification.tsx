import { useState, useEffect } from "react";
import type { Phase } from "../data/phases";

interface PhaseNotificationProps {
  phase: Phase;
  onDone: () => void;
}

export function PhaseNotification({ phase, onDone }: PhaseNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: visible ? 24 : -120,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 999,
      transition: "top 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      pointerEvents: "none",
    }}>
      <div style={{
        background: "rgba(10,14,26,0.95)",
        border: `1px solid ${phase.color}60`,
        borderRadius: 14,
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${phase.color}30`,
        backdropFilter: "blur(16px)",
        minWidth: 280,
        textAlign: "center",
      }}>
        <span style={{ fontSize: 22 }}>🎉</span>
        <div>
          <div style={{ fontSize: 13, color: "#E6EDF3", fontWeight: 700, marginBottom: 4 }}>
            All {phase.steps.length} steps done!
          </div>
          <div style={{ fontSize: 10, color: phase.color, letterSpacing: 2, textTransform: "uppercase" }}>
            {phase.number} · {phase.label}
          </div>
        </div>
        <span style={{ fontSize: 22 }}>🎉</span>
      </div>
    </div>
  );
}
