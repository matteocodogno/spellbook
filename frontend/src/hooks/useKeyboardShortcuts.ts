import { useEffect } from "react";
import { phases } from "../data/phases";
import type { StepMeta, StepAction } from "../data/phases";
import { copyText } from "../utils/copyText";

interface UseKeyboardShortcutsOptions {
  focusedStep: string | null;
  setFocusedStep: (key: string | null) => void;
  expandedSteps: Set<string>;
  allSteps: StepMeta[];
  setActivePhase: (id: string | null) => void;
  handleSetActiveStep: (action: StepAction) => void;
  toggleCompleted: (key: string) => void;
  jumpToNextIncomplete: () => void;
  showShortcuts: boolean;
  setShowShortcuts: (value: boolean | ((prev: boolean) => boolean)) => void;
  spotlitStep: string | null;
  setSpotlitStep: (step: string | null | ((prev: string | null) => string | null)) => void;
  setCopyFlash: (key: string | null) => void;
  setCopyToast: (toast: { text: string } | null) => void;
  setPresenterMode: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function useKeyboardShortcuts({
  focusedStep,
  setFocusedStep,
  expandedSteps,
  allSteps,
  setActivePhase,
  handleSetActiveStep,
  toggleCompleted,
  jumpToNextIncomplete,
  showShortcuts,
  setShowShortcuts,
  spotlitStep,
  setSpotlitStep,
  setCopyFlash,
  setCopyToast,
  setPresenterMode,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)) return;

      const cursor = focusedStep ?? [...expandedSteps].pop();
      const curIdx = allSteps.findIndex(s => s.key === cursor);

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = allSteps[curIdx === -1 ? 0 : curIdx + 1];
        if (!next) return;
        setFocusedStep(next.key);
        setActivePhase(next.phaseId);
        setTimeout(() => {
          document.getElementById(next.key)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 40);
      }

      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = curIdx > 0 ? allSteps[curIdx - 1] : null;
        if (!prev) return;
        setFocusedStep(prev.key);
        setActivePhase(prev.phaseId);
        setTimeout(() => {
          document.getElementById(prev.key)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 40);
      }

      if (e.key === "Enter") {
        const target = focusedStep ?? [...expandedSteps].pop();
        if (!target) return;
        const step = allSteps.find(s => s.key === target);
        if (step) {
          setActivePhase(step.phaseId);
          handleSetActiveStep({ type: "toggle", key: target });
          setTimeout(() => {
            document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 40);
        }
      }

      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (spotlitStep !== null) { setSpotlitStep(null); return; }
        if (expandedSteps.size > 0) handleSetActiveStep(null);
        else setFocusedStep(null);
      }

      if (e.key === "x") {
        const target = focusedStep ?? [...expandedSteps].pop();
        if (target) toggleCompleted(target);
      }

      if (e.key === "n") {
        e.preventDefault();
        jumpToNextIncomplete();
      }

      if (e.key === "?") {
        setShowShortcuts(s => !s);
      }

      if (e.key === "p") {
        setPresenterMode(s => !s);
      }

      if (e.key === "s") {
        const target = focusedStep ?? [...expandedSteps].pop();
        if (target) setSpotlitStep(prev => prev === target ? null : target);
      }

      if (e.key === "c") {
        const target = spotlitStep ?? focusedStep ?? [...expandedSteps].pop();
        if (!target) return;
        const [phaseId, siStr] = target.split("-");
        const ph = phases.find(p => p.id === phaseId);
        const step = ph?.steps[parseInt(siStr, 10)];
        if (step?.code) {
          copyText(step.code, () => {
            setCopyFlash(target);
            setTimeout(() => setCopyFlash(null), 1500);
            setCopyToast({ text: "Code copied!" });
            setTimeout(() => setCopyToast(null), 1800);
          });
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusedStep, expandedSteps, allSteps, handleSetActiveStep, toggleCompleted, jumpToNextIncomplete, showShortcuts, spotlitStep]);
}
