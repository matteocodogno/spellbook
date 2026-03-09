import type { Phase, StepMeta, StepAction } from "../data/phases";
import { CodeBlock } from "./CodeBlock";
import { TroubleshootingPanel } from "./TroubleshootingPanel";
import { NoteBox } from "./NoteBox";
import { copyText } from "../utils/copyText";

interface PhaseCardProps {
  phase: Phase;
  activePhase: string | null;
  activeStep: Set<string>;
  setActivePhase: (id: string | null) => void;
  setActiveStep: (action: StepAction) => void;
  allSteps: StepMeta[];
  focusedStep: string | null;
  completedSteps: Set<string>;
  toggleCompleted: (key: string) => void;
  notes: Record<string, string>;
  setNote: (key: string, value: string) => void;
  getPhaseElapsed: (phaseId: string) => number;
  formatElapsed: (secs: number) => string;
  presenterMode: boolean;
  spotlitStep: string | null;
  setSpotlitStep: (step: string | null) => void;
  copyFlash: string | null;
  setCopyFlash: (key: string | null) => void;
}

export function PhaseCard({ phase, activePhase, activeStep, setActivePhase, setActiveStep, allSteps, focusedStep, completedSteps, toggleCompleted, notes, setNote, getPhaseElapsed, formatElapsed, presenterMode, spotlitStep, setSpotlitStep, copyFlash, setCopyFlash }: PhaseCardProps) {
  const isPhaseOpen = activePhase === phase.id;
  const phaseKeys = phase.steps.map((_, si) => `${phase.id}-${si}`);
  const openCount = phaseKeys.filter(k => activeStep.has(k)).length;
  const completedCount = phaseKeys.filter(k => completedSteps.has(k)).length;
  const allExpandedAlready = openCount === phase.steps.length;

  return (
    <div style={{
      border: `1px solid ${phase.border}`,
      borderRadius: 14,
      background: phase.bg,
      overflow: "hidden",
    }}>
      {/* Phase header */}
      <div
        onClick={() => setActivePhase(isPhaseOpen ? null : phase.id)}
        style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "16px 24px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{
          fontSize: 28, fontWeight: 800,
          color: phase.color,
          opacity: 0.4,
          letterSpacing: -2,
          minWidth: 44,
        }}>{phase.number}</span>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: phase.color,
            letterSpacing: 3,
            textTransform: "uppercase",
            display: "block",
          }}>{phase.label}</span>
          {phase.forkLabel && (
            <span style={{ fontSize: 11, color: "#8B949E", marginTop: 3, display: "block" }}>
              {phase.forkLabel}
            </span>
          )}
        </div>

        {/* Expand all / Collapse all */}
        {isPhaseOpen && (
          <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActiveStep({ type: allExpandedAlready ? "collapse_all" : "expand_all", phaseId: phase.id, keys: phaseKeys })}
              title={allExpandedAlready ? "Collapse all steps" : "Expand all steps"}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${allExpandedAlready ? "rgba(255,255,255,0.08)" : phase.color + "40"}`,
                borderRadius: 6, padding: "3px 10px",
                fontSize: 10, color: allExpandedAlready ? "#8B949E" : phase.color,
                cursor: "pointer", letterSpacing: 0.5, fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = allExpandedAlready ? "rgba(255,255,255,0.08)" : `${phase.color}18`}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >
              {allExpandedAlready ? "⊟ collapse all" : "⊞ expand all"}
            </button>
          </div>
        )}

        {(() => {
          const estimateMins = phase.steps.reduce((acc, s) => {
            if (!s.time || s.time === "automated" || s.time === "ongoing") return acc;
            const match = s.time.match(/\d+/);
            const m = match ? parseInt(match[0], 10) : NaN;
            return isNaN(m) ? acc : acc + m;
          }, 0);
          const estimateSecs = estimateMins * 60;
          const elapsed = getPhaseElapsed(phase.id);
          const isRunning = activePhase === phase.id;
          const isOver = estimateSecs > 0 && elapsed > estimateSecs;

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Timer badge — shown once phase has been opened */}
              {elapsed > 0 && (
                <span style={{
                  fontSize: 11,
                  color: isOver ? "#FF6B6B" : isRunning ? phase.color : "#8B949E",
                  background: isOver ? "rgba(255,107,107,0.08)" : isRunning ? `${phase.color}12` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isOver ? "rgba(255,107,107,0.25)" : isRunning ? `${phase.color}35` : "rgba(255,255,255,0.07)"}`,
                  padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  transition: "color 0.3s, background 0.3s",
                }}>
                  {isRunning ? "⏱ " : ""}{formatElapsed(elapsed)}
                  {estimateMins > 0 && (
                    <span style={{ opacity: 0.5, marginLeft: 4 }}>/ ~{estimateMins}min</span>
                  )}
                </span>
              )}
              {/* Progress ring */}
              {(() => {
                const total = phase.steps.length;
                const done  = completedCount;
                const r = 10;
                const circ = 2 * Math.PI * r;
                const pct  = total > 0 ? done / total : 0;
                const dash = pct * circ;
                const allDone = done === total;
                const ringColor = allDone ? "#64FFDA" : done > 0 ? phase.color : "rgba(255,255,255,0.15)";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }} title={`${done} / ${total} steps done`}>
                    <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
                      {/* Track */}
                      <circle cx="14" cy="14" r={r}
                              fill="none"
                              stroke="rgba(255,255,255,0.07)"
                              strokeWidth="2.5"
                      />
                      {/* Progress arc */}
                      <circle cx="14" cy="14" r={r}
                              fill="none"
                              stroke={ringColor}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray={`${dash} ${circ}`}
                              transform="rotate(-90 14 14)"
                              style={{ transition: "stroke-dasharray 0.4s cubic-bezier(0.4,0,0.2,1), stroke 0.3s" }}
                      />
                      {/* Centre label */}
                      <text x="14" y="14"
                            dominantBaseline="central" textAnchor="middle"
                            fontSize="6.5" fontWeight="700"
                            fill={done > 0 ? ringColor : "rgba(255,255,255,0.25)"}
                            style={{ fontFamily: "inherit", transition: "fill 0.3s" }}
                      >
                        {allDone ? "✓" : done > 0 ? `${done}/${total}` : total}
                      </text>
                    </svg>
                    {elapsed === 0 && estimateMins > 0 && (
                      <span style={{ fontSize: 10, color: "#555E6D", whiteSpace: "nowrap" }}>~{estimateMins}min</span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}
        <span style={{ color: phase.color, opacity: 0.6, fontSize: 16 }}>
          {isPhaseOpen ? "▲" : "▼"}
        </span>
      </div>

      {/* Steps */}
      {isPhaseOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          {phase.steps.map((step, si) => {
            const stepKey = `${phase.id}-${si}`;
            const isOpen = activeStep.has(stepKey);
            const isFocused = focusedStep === stepKey;
            const isDone = completedSteps.has(stepKey);
            const isSpotlit = spotlitStep === stepKey;
            const isDimmed = spotlitStep !== null && !isSpotlit;
            return (
              <div
                key={si}
                id={stepKey}
                style={{
                  marginBottom: 8,
                  borderRadius: 10,
                  border: isSpotlit
                    ? `1px solid ${phase.color}`
                    : `1px solid ${isDone ? phase.color + "35" : isOpen ? phase.color + "50" : isFocused ? phase.color + "70" : "rgba(255,255,255,0.05)"}`,
                  background: isSpotlit
                    ? `${phase.bg}`
                    : isOpen ? "rgba(0,0,0,0.3)" : isFocused ? `${phase.bg}` : "rgba(255,255,255,0.02)",
                  transition: "all 0.25s",
                  overflow: "hidden",
                  outline: isSpotlit ? `2px solid ${phase.color}60` : isFocused && !isOpen ? `2px solid ${phase.color}40` : "none",
                  outlineOffset: -1,
                  boxShadow: isSpotlit
                    ? `0 0 0 3px ${phase.color}30, 0 0 24px ${phase.color}20`
                    : isFocused ? `0 0 0 2px ${phase.color}20` : "none",
                  opacity: isDimmed ? 0.2 : isSpotlit ? 0.4 : 1,
                  filter: isDimmed ? "blur(0.5px)" : "none",
                  pointerEvents: isDimmed ? "none" : "auto",
                }}
              >
                <div
                  onClick={(e) => {
                    if (e.shiftKey) {
                      e.stopPropagation();
                      setSpotlitStep(spotlitStep === stepKey ? null : stepKey);
                    } else {
                      setActiveStep({ type: "toggle", key: stepKey });
                    }
                  }}
                  title={spotlitStep === stepKey ? "Shift+click to clear spotlight" : "Shift+click to spotlight this step"}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                  }}
                >
                  {/* Done checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleCompleted(stepKey); }}
                    title={isDone ? "Mark as not done" : "Mark as done"}
                    style={{
                      flexShrink: 0,
                      width: 18, height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${isDone ? phase.color : "rgba(255,255,255,0.15)"}`,
                      background: isDone ? phase.color : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, transition: "all 0.15s",
                      boxShadow: isDone ? `0 0 6px ${phase.color}50` : "none",
                    }}
                    onMouseEnter={e => { if (!isDone) { e.currentTarget.style.borderColor = phase.color; e.currentTarget.style.background = `${phase.color}18`; }}}
                    onMouseLeave={e => { if (!isDone) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "transparent"; }}}
                  >
                    {isDone && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#0A0E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <span style={{
                    fontSize: 16,
                    color: isDone ? phase.color : phase.color,
                    opacity: isDone ? 0.5 : 1,
                    minWidth: 24,
                    textAlign: "center",
                  }}>{step.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#8B949E", marginBottom: 2 }}>
                      {step.tool}
                    </div>
                    <div style={{ fontSize: 13, color: isDone ? "#555E6D" : "#E6EDF3", fontWeight: 600, textDecoration: isDone ? "line-through" : "none", textDecorationColor: "rgba(255,255,255,0.2)" }}>
                      {step.action}
                    </div>
                  </div>
                  {step.time && (
                    <span style={{
                      fontSize: 9,
                      color: step.time === "automated" ? "#64FFDA"
                        : step.time === "ongoing"   ? "#FFD166"
                          : "#8B949E",
                      background: step.time === "automated" ? "rgba(100,255,218,0.07)"
                        : step.time === "ongoing"   ? "rgba(255,209,102,0.07)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        step.time === "automated" ? "rgba(100,255,218,0.2)"
                          : step.time === "ongoing"   ? "rgba(255,209,102,0.2)"
                            : "rgba(255,255,255,0.07)"}`,
                      padding: "2px 7px", borderRadius: 10,
                      whiteSpace: "nowrap", letterSpacing: 0.3,
                    }}>
                      {step.time === "automated" ? "⚙ auto"
                        : step.time === "ongoing"   ? "↻ ongoing"
                          : `⏱ ${step.time}`}
                    </span>
                  )}
                  {notes[stepKey] && !isOpen && (
                    <span title="Has a note" style={{
                      fontSize: 9, color: "#FFD166",
                      border: "1px solid rgba(255,209,102,0.25)",
                      background: "rgba(255,209,102,0.06)",
                      padding: "2px 7px", borderRadius: 10,
                      whiteSpace: "nowrap", letterSpacing: 0.3,
                    }}>✎ note</span>
                  )}
                  <span style={{
                    fontSize: 9, color: phase.color,
                    border: `1px solid ${phase.color}40`,
                    padding: "2px 8px", borderRadius: 10,
                    letterSpacing: 1.5, textTransform: "uppercase",
                  }}>
                    {isOpen ? "collapse" : "expand"}
                  </span>
                  {isSpotlit && (
                    <span style={{
                      fontSize: 9, color: phase.color,
                      border: `1px solid ${phase.color}`,
                      background: `${phase.color}15`,
                      padding: "2px 8px", borderRadius: 10,
                      letterSpacing: 1.5, textTransform: "uppercase",
                      animation: "pulse 2s ease-in-out infinite",
                    }}>◉ spotlight</span>
                  )}
                  {isOpen && step.code && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        copyText(step.code, () => {
                          setCopyFlash(stepKey);
                          setTimeout(() => setCopyFlash(null), 1500);
                        });
                      }}
                      title="Copy code (c)"
                      style={{
                        background: copyFlash === stepKey ? `${phase.color}20` : "none",
                        border: `1px solid ${copyFlash === stepKey ? phase.color + "50" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 5, padding: "2px 8px", cursor: "pointer",
                        color: copyFlash === stepKey ? phase.color : "#555E6D",
                        fontSize: 10, fontFamily: "inherit",
                        transition: "all 0.15s", whiteSpace: "nowrap",
                      }}
                    >
                      {copyFlash === stepKey ? "✓ copied" : "⌘ copy"}
                    </button>
                  )}
                  {isFocused && (
                    <span style={{
                      fontSize: 9, color: phase.color, opacity: 0.6,
                      display: "flex", gap: 4, alignItems: "center",
                    }}>
                      <kbd style={{ border: `1px solid ${phase.color}40`, borderRadius: 3, padding: "1px 4px" }}>↵</kbd>
                    </span>
                  )}
                </div>
                {isOpen && (() => {
                  const currentIdx = allSteps.findIndex(s => s.key === stepKey);
                  const prev = allSteps[currentIdx - 1];
                  const next = allSteps[currentIdx + 1];
                  const navigate = (target: StepMeta) => {
                    setActivePhase(target.phaseId);
                    setActiveStep({ type: "navigate", from: stepKey, to: target.key });
                    setTimeout(() => {
                      const el = document.getElementById(target.key);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                  };
                  return (
                    <div style={{ padding: "0 16px 16px" }}>
                      {!presenterMode && <CodeBlock code={step.code} color={phase.color} />}
                      <p style={{
                        margin: "0 0 16px",
                        fontSize: presenterMode ? 13 : 12,
                        color: presenterMode ? "#CDD6F4" : "#A8B3C1",
                        lineHeight: 1.7,
                        padding: "10px 14px",
                        background: presenterMode ? `${phase.color}08` : "rgba(255,255,255,0.03)",
                        borderRadius: 6,
                        borderLeft: `3px solid ${phase.color}${presenterMode ? "90" : "60"}`,
                      }}>{step.detail}</p>
                      {!presenterMode && <TroubleshootingPanel tips={step.troubleshooting} color={phase.color} />}
                      <NoteBox stepKey={stepKey} color={phase.color} notes={notes} setNote={setNote} />
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <button
                          onClick={() => prev && navigate(prev)}
                          disabled={!prev}
                          style={{
                            flex: 1,
                            padding: "8px 14px",
                            background: prev ? "rgba(255,255,255,0.04)" : "transparent",
                            border: `1px solid ${prev ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)"}`,
                            borderRadius: 8,
                            color: prev ? "#8B949E" : "#2D3340",
                            fontSize: 11,
                            fontFamily: "inherit",
                            cursor: prev ? "pointer" : "default",
                            textAlign: "left",
                            letterSpacing: 0.5,
                            transition: "all 0.15s",
                          }}
                        >
                          {prev ? `← ${prev.phaseNumber}·${prev.stepNum + 1}  ${prev.action}` : "← start"}
                        </button>
                        <button
                          onClick={() => next && navigate(next)}
                          disabled={!next}
                          style={{
                            flex: 1,
                            padding: "8px 14px",
                            background: next ? `${phase.color}12` : "transparent",
                            border: `1px solid ${next ? phase.color + "40" : "rgba(255,255,255,0.03)"}`,
                            borderRadius: 8,
                            color: next ? phase.color : "#2D3340",
                            fontSize: 11,
                            fontFamily: "inherit",
                            cursor: next ? "pointer" : "default",
                            textAlign: "right",
                            letterSpacing: 0.5,
                            transition: "all 0.15s",
                          }}
                        >
                          {next ? `${next.phaseNumber}·${next.stepNum + 1}  ${next.action} →` : "end →"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
