import type { Phase } from "../data/phases";
import { PhaseCard } from "./PhaseCard";
import { useWorkflow } from '../hooks/useWorkflow.tsx';
import { useNotes } from '../hooks/useNotes.tsx';

interface PhaseListProps {
  phases: Phase[];
  getPhaseElapsed: (phaseId: string) => number;
  formatElapsed: (secs: number) => string;
  presenterMode: boolean;
  spotlitStep: string | null;
  setSpotlitStep: (step: string | null) => void;
  copyFlash: string | null;
  setCopyFlash: (key: string | null) => void;
}

export function PhaseList({
  phases,
  getPhaseElapsed,
  formatElapsed,
  presenterMode,
  spotlitStep,
  setSpotlitStep,
  copyFlash,
  setCopyFlash,
}: PhaseListProps) {
  const workflow = useWorkflow();
  const { notes, setNote } = useNotes();

  const sharedCardProps = {
    activePhase: workflow.activePhase,
    activeStep: workflow.expandedSteps,
    setActivePhase: workflow.setActivePhase,
    setActiveStep: workflow.handleSetActiveStep,
    allSteps: workflow.allSteps,
    focusedStep: workflow.focusedStep,
    completedSteps: workflow.completedSteps,
    toggleCompleted: workflow.toggleCompleted,
    notes,
    setNote,
    getPhaseElapsed,
    formatElapsed,
    presenterMode,
    spotlitStep,
    setSpotlitStep,
    copyFlash,
    setCopyFlash,
  };

  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < phases.length) {
    const phase = phases[i];
    if (phase.fork) {
      const forkPhases: Phase[] = [];
      while (i < phases.length && phases[i].fork === phase.fork) {
        forkPhases.push(phases[i]);
        i++;
      }
      // Group phases into tracks by forkGroup (or by phase id if none)
      const tracks: Phase[][] = [];
      let curTrack: Phase[] = [];
      let curKey: string | null = null;
      for (const fp of forkPhases) {
        const key = fp.forkGroup ?? fp.id;
        if (key !== curKey) {
          if (curTrack.length > 0) tracks.push(curTrack);
          curTrack = [fp];
          curKey = key;
        } else {
          curTrack.push(fp);
        }
      }
      if (curTrack.length > 0) tracks.push(curTrack);
      const bannerText = phase.fork === "execution"
        ? "Choose your execution path"
        : phase.fork === "specTool"
          ? "Choose your spec framework"
          : "Choose your path";
      elements.push(
        <div key={`fork-${phase.fork}`}>
          {/* Fork banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            marginBottom: 16,
          }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.12))" }} />
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 20px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 24,
              background: "rgba(255,255,255,0.03)",
              margin: "0 16px",
            }}>
              <span style={{ fontSize: 14 }}>⑃</span>
              <span style={{ fontSize: 11, color: "#8B949E", letterSpacing: 2, textTransform: "uppercase" }}>
                {bannerText}
              </span>
              <span style={{ fontSize: 14 }}>⑂</span>
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.12))" }} />
          </div>
          {/* Fork tracks — OR between tracks, sequential within a track */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tracks.map((track, ti) => (
              <div key={ti}>
                {ti > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 16,
                    margin: "8px 0",
                  }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: "#444C56",
                      letterSpacing: 3,
                      padding: "4px 14px",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                    }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {track.map((fp) => (
                    <PhaseCard key={fp.id} phase={fp} {...sharedCardProps} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      elements.push(
        <PhaseCard key={phase.id} phase={phase} {...sharedCardProps} />
      );
      i++;
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {elements}
    </div>
  );
}
