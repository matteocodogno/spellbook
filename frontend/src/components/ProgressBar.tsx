import type { Phase } from "../data/phases";

import { useWorkflow } from '../hooks/useWorkflow.tsx';

interface ProgressBarProps {
  phases: Phase[];
  onReset: () => void;
}

export function ProgressBar({
  phases,
  onReset,
}: ProgressBarProps) {
  const workflow = useWorkflow();
  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      background: "rgba(10,14,26,0.92)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      zIndex: 100,
      padding: "10px 24px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Labels row — breadcrumb */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          {/* Left: breadcrumb */}
          {workflow.currentStep ? (() => {
            const currentStep = workflow.currentStep;
            const phase = phases.find(p => p.id === currentStep.phaseId);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, minWidth: 0, overflow: "hidden" }}>
                <span style={{
                  color: phase?.color ?? "#64FFDA",
                  fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  {phase?.number}
                </span>
                <span style={{ color: "#2D3340" }}>›</span>
                <span style={{
                  color: phase?.color ?? "#64FFDA",
                  opacity: 0.7,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  maxWidth: 140,
                  letterSpacing: 0.5, textTransform: "uppercase", fontSize: 9,
                }}>
                  {phase?.label}
                </span>
                <span style={{ color: "#2D3340" }}>›</span>
                <span style={{
                  color: "#8B949E",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  maxWidth: 260,
                }}>
                  <span style={{ color: "#64FFDA", marginRight: 4 }}>
                    step {currentStep.stepNum + 1}
                  </span>
                  {currentStep.action}
                </span>
              </div>
            );
          })() : (
            <div style={{ fontSize: 10, color: "#555E6D", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Progress
            </div>
          )}

          {/* Right: next button + time remaining + percentage */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {workflow.remainingLabel && (
              <span style={{
                fontSize: 10, color: "#8B949E",
                letterSpacing: 0.5, whiteSpace: "nowrap",
              }}>
                {workflow.remainingLabel} remaining
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: workflow.progress === 100 ? "#64FFDA" : "#CDD6F4",
              minWidth: 36, textAlign: "right",
            }}>
              {workflow.progress}%
            </span>
            {workflow.progress < 100 && (
              <button
                onClick={workflow.jumpToNextIncomplete}
                title="Jump to next incomplete step (n)"
                style={{
                  background: "rgba(100,255,218,0.08)",
                  border: "1px solid rgba(100,255,218,0.25)",
                  borderRadius: 5, padding: "2px 10px",
                  cursor: "pointer", color: "#64FFDA",
                  fontSize: 10, fontFamily: "inherit",
                  flexShrink: 0, transition: "all 0.15s",
                  letterSpacing: 0.5, whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,255,218,0.15)"; e.currentTarget.style.borderColor = "rgba(100,255,218,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(100,255,218,0.08)"; e.currentTarget.style.borderColor = "rgba(100,255,218,0.25)"; }}
              >
                → next
              </button>
            )}
          </div>
          {(workflow.maxReached > 0 || workflow.completedSteps.size > 0) && (
            <button
              onClick={onReset}
              title="Reset progress"
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 5, padding: "2px 7px", cursor: "pointer",
                color: "#444C56", fontSize: 10, fontFamily: "inherit",
                flexShrink: 0, transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#FF6B6B"; e.currentTarget.style.borderColor = "rgba(255,107,107,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#444C56"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              ↺ reset
            </button>
          )}
        </div>
        {/* Bar track */}
        <div style={{
          height: 3,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 99,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${workflow.progress}%`,
            borderRadius: 99,
            background: workflow.progress === 100
              ? "#64FFDA"
              : "linear-gradient(90deg, #64FFDA, #A8DAFF)",
            boxShadow: workflow.progress > 0 ? "0 0 8px rgba(100,255,218,0.4)" : "none",
            transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        {/* Phase markers */}
        <div style={{ position: "relative", height: 12, marginTop: 2 }}>
          {phases.map(phase => {
            const firstIdx = workflow.allSteps.findIndex(s => s.phaseId === phase.id);
            const pct = Math.round((firstIdx / (workflow.allSteps.length - 1)) * 100);
            const phaseStepKeys = workflow.allSteps.filter(s => s.phaseId === phase.id).map(s => s.key);
            const reached = firstIdx <= workflow.maxReached || phaseStepKeys.some(k => workflow.completedSteps.has(k));
            return (
              <div key={phase.id} style={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: reached ? phase.color : "rgba(255,255,255,0.12)",
                  boxShadow: reached ? `0 0 5px ${phase.color}80` : "none",
                  transition: "all 0.3s",
                }} />
                <span style={{
                  fontSize: 8, color: reached ? phase.color : "#2D3340",
                  letterSpacing: 0.5, fontWeight: 700,
                  transition: "color 0.3s",
                }}>{phase.number}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
