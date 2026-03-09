import { useState, useRef, useEffect } from "react";
import type { Phase, StepMeta } from "../data/phases";
import { useConfetti } from "../hooks/useConfetti";
import { PhaseNotification } from "./PhaseNotification";

interface PhaseCompletionCelebrationProps {
  phases: Phase[];
  allSteps: StepMeta[];
  completedSteps: Set<string>;
}

export function PhaseCompletionCelebration({ phases, allSteps, completedSteps }: PhaseCompletionCelebrationProps) {
  const [celebration, setCelebration] = useState<Phase | null>(null);
  const { canvasRef, launch } = useConfetti();
  const prevCompletedRef = useRef(new Set<string>());

  useEffect(() => {
    const prev = prevCompletedRef.current;
    for (const phase of phases) {
      const phaseKeys = allSteps.filter(s => s.phaseId === phase.id).map(s => s.key);
      if (phaseKeys.length === 0) continue;
      const wasAllDone = phaseKeys.every(k => prev.has(k));
      const isAllDone = phaseKeys.every(k => completedSteps.has(k));
      if (!wasAllDone && isAllDone) {
        setCelebration(phase);
        launch(phase.color);
        break;
      }
    }
    prevCompletedRef.current = new Set(completedSteps);
  }, [completedSteps]);

  return (
    <>
      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 998,
      }} />
      {celebration && (
        <PhaseNotification
          phase={celebration}
          onDone={() => setCelebration(null)}
        />
      )}
    </>
  );
}
