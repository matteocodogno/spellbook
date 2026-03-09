import { useEffect } from "react";
import type { Phase } from "../data/phases";
import { CodeBlock } from "./CodeBlock";
import { TroubleshootingPanel } from "./TroubleshootingPanel";
import { NoteBox } from "./NoteBox";
import { useWorkflow } from '../hooks/useWorkflow.tsx';
import { useNotes } from '../hooks/useNotes.tsx';

interface SpotlightOverlayProps {
  spotlitStep: string | null;
  setSpotlitStep: (step: string | null) => void;
  phases: Phase[];
  presenterMode: boolean;
}

export function SpotlightOverlay({ spotlitStep, setSpotlitStep, phases, presenterMode }: SpotlightOverlayProps) {
  const workflow = useWorkflow();
  const { notes, setNote } = useNotes();
  useEffect(() => {
    document.body.style.overflow = spotlitStep ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [spotlitStep]);

  if (!spotlitStep) return null;

  const stepMeta = workflow.allSteps.find(s => s.key === spotlitStep);
  if (!stepMeta) return null;
  const phase = phases.find(p => p.id === stepMeta.phaseId);
  if (!phase) return null;
  const step = phase.steps[stepMeta.stepNum];
  if (!step) return null;
  const isDone = workflow.completedSteps.has(spotlitStep);

  return (
    <div
      onClick={() => setSpotlitStep(null)}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(5,8,18,0.88)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 780,
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 14,
          border: `1px solid ${phase.color}`,
          background: "#0D1117",
          boxShadow: `0 0 0 4px ${phase.color}20, 0 32px 80px rgba(0,0,0,0.7)`,
          animation: "spotlightIn 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px",
          borderBottom: `1px solid ${phase.color}20`,
        }}>
          <button
            onClick={e => { e.stopPropagation(); workflow.toggleCompleted(spotlitStep); }}
            title={isDone ? "Mark as not done" : "Mark as done"}
            style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: 5,
              border: `1.5px solid ${isDone ? phase.color : "rgba(255,255,255,0.2)"}`,
              background: isDone ? phase.color : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, transition: "all 0.15s",
            }}
          >
            {isDone && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0A0E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span style={{ fontSize: 16, color: phase.color }}>{step.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#555E6D", marginBottom: 2, letterSpacing: 0.5 }}>{step.tool}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#E6EDF3" }}>{step.action}</div>
          </div>
          <span style={{
            fontSize: 9, color: phase.color, border: `1px solid ${phase.color}`,
            background: `${phase.color}15`, padding: "2px 8px", borderRadius: 10,
            letterSpacing: 1.5, textTransform: "uppercase",
            animation: "pulse 2s ease-in-out infinite",
          }}>◉ spotlight</span>
          <button
            onClick={() => setSpotlitStep(null)}
            title="Exit spotlight (Esc)"
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 5, padding: "3px 9px", cursor: "pointer",
              color: "#555E6D", fontSize: 11, fontFamily: "inherit",
              transition: "all 0.15s", marginLeft: 4,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#E6EDF3"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#555E6D"; }}
          >esc</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {!presenterMode && <CodeBlock code={step.code} color={phase.color} />}
          <p style={{
            margin: "0 0 16px", fontSize: presenterMode ? 14 : 13,
            color: presenterMode ? "#CDD6F4" : "#A8B3C1",
            lineHeight: 1.75,
            padding: "12px 16px",
            background: presenterMode ? `${phase.color}08` : "rgba(255,255,255,0.03)",
            borderRadius: 6,
            borderLeft: `3px solid ${phase.color}${presenterMode ? "90" : "60"}`,
          }}>{step.detail}</p>
          {!presenterMode && <TroubleshootingPanel tips={step.troubleshooting} color={phase.color} />}
          <NoteBox stepKey={spotlitStep} color={phase.color} notes={notes} setNote={setNote} />
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "flex-end", gap: 12,
        }}>
          <span style={{ fontSize: 10, color: "#2D3340" }}>
            click outside or press <kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 5px", fontFamily: "inherit", fontSize: 10, background: "rgba(255,255,255,0.03)", color: "#555E6D" }}>esc</kbd> to exit
          </span>
        </div>
      </div>
    </div>
  );
}
