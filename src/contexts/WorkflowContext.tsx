import { createContext, type ReactNode, useCallback, useEffect, useState } from "react";
import type { StepAction, StepMeta } from "../data/phases";
import { phases } from "../data/phases";

interface WorkflowState {
  activePhase: string | null;
  expandedSteps: Set<string>;
  completedSteps: Set<string>;
  focusedStep: string | null;
  maxReached: number;
  allSteps: StepMeta[];
  progress: number;
  remainingMins: number;
  remainingLabel: string | null;
  currentStep: StepMeta | undefined;
}

interface WorkflowActions {
  setActivePhase: (id: string | null) => void;
  setFocusedStep: (key: string | null) => void;
  handleSetActiveStep: (action: StepAction) => void;
  toggleCompleted: (key: string) => void;
  navigateToStep: (target: StepMeta) => void;
  jumpToNextIncomplete: () => void;
  reset: () => Promise<void>;
}

type WorkflowContextValue = WorkflowState & WorkflowActions;

// eslint-disable-next-line react-refresh/only-export-components
export const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

const STORAGE_KEY = "ai4dev-workflow-progress";

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [focusedStep, setFocusedStep] = useState<string | null>(null);
  const [maxReached, setMaxReached] = useState(0);
  const [storageReady, setStorageReady] = useState(false);

  // Compute allSteps once
  const allSteps: StepMeta[] = phases.flatMap(phase =>
    phase.steps.map((step, si) => ({
      key: `${phase.id}-${si}`,
      phaseId: phase.id,
      phaseNumber: phase.number,
      stepNum: si,
      action: step.action,
      time: step.time,
    }))
  );

  // Load from storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        // @ts-expect-error — window.storage is a Claude artifact API
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) {
          const saved = JSON.parse(result.value);
          if (typeof saved.maxReached === "number") setMaxReached(saved.maxReached);
          if (Array.isArray(saved.expandedSteps)) setExpandedSteps(new Set(saved.expandedSteps));
          if (Array.isArray(saved.completedSteps)) setCompletedSteps(new Set(saved.completedSteps));
          if (saved.activePhase) setActivePhase(saved.activePhase);
        }
      } catch {
        // storage unavailable or key not found — start fresh
      } finally {
        setStorageReady(true);
      }
    };
    load();
  }, []);

  // Save to storage whenever state changes
  useEffect(() => {
    if (!storageReady) return;
    const save = async () => {
      try {
        // @ts-expect-error — window.storage is a Claude artifact API
        await window.storage.set(STORAGE_KEY, JSON.stringify({
          maxReached,
          expandedSteps: [...expandedSteps],
          completedSteps: [...completedSteps],
          activePhase,
        }));
      } catch { /* ignore */ }
    };
    save();
  }, [maxReached, expandedSteps, completedSteps, activePhase, storageReady]);

  const handleSetActiveStep = useCallback((action: StepAction) => {
    if (action === null) {
      setExpandedSteps(new Set());
      return;
    }
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (action.type === "toggle") {
        if (next.has(action.key)) next.delete(action.key);
        else next.add(action.key);
      } else if (action.type === "navigate") {
        next.delete(action.from);
        next.add(action.to);
      } else if (action.type === "expand_all") {
        action.keys.forEach(k => next.add(k));
      } else if (action.type === "collapse_all") {
        action.keys.forEach(k => next.delete(k));
      }
      return next;
    });
    if (action.type === "toggle" && action.key) {
      const idx = allSteps.findIndex(s => s.key === action.key);
      if (idx > maxReached) setMaxReached(idx);
    }
  }, [allSteps, maxReached]);

  const toggleCompleted = useCallback((key: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const navigateToStep = useCallback((target: StepMeta) => {
    setActivePhase(target.phaseId);
    handleSetActiveStep({ type: "toggle", key: target.key });
    setTimeout(() => {
      const el = document.getElementById(target.key);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [handleSetActiveStep]);

  const jumpToNextIncomplete = useCallback(() => {
    const next = allSteps.find(s => !completedSteps.has(s.key));
    if (!next) return;
    setActivePhase(next.phaseId);
    setFocusedStep(next.key);
    handleSetActiveStep({ type: "toggle", key: next.key });
    setTimeout(() => {
      document.getElementById(next.key)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [allSteps, completedSteps, handleSetActiveStep]);

  const reset = useCallback(async () => {
    setMaxReached(0);
    setExpandedSteps(new Set());
    setCompletedSteps(new Set());
    setActivePhase(null);
    try {
      // @ts-expect-error — window.storage is a Claude artifact API
      await window.storage.delete(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  // Computed values
  const progress = allSteps.length > 0
    ? Math.round((completedSteps.size / allSteps.length) * 100)
    : 0;

  const parseMins = (t: string) => {
    if (!t || t === "automated" || t === "ongoing") return 0;
    const match = t.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const remainingMins = allSteps.reduce((acc, s) =>
    completedSteps.has(s.key) ? acc : acc + parseMins(s.time), 0);

  const formatRemaining = (mins: number) => {
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `~${m}min`;
    return m === 0 ? `~${h}h` : `~${h}h ${m}min`;
  };

  const remainingLabel = progress < 100 ? formatRemaining(remainingMins) : null;

  const lastExpanded = allSteps.slice().reverse().find(s => expandedSteps.has(s.key));
  const currentStep = lastExpanded ?? allSteps.find(s => s.key === focusedStep);

  const value: WorkflowContextValue = {
    activePhase,
    expandedSteps,
    completedSteps,
    focusedStep,
    maxReached,
    allSteps,
    progress,
    remainingMins,
    remainingLabel,
    currentStep,
    setActivePhase,
    setFocusedStep,
    handleSetActiveStep,
    toggleCompleted,
    navigateToStep,
    jumpToNextIncomplete,
    reset,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}
