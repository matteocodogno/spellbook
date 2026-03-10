import { useState, useRef, useCallback, useEffect } from "react";

export function usePhaseTimers(activePhase: string | null) {
  const [phaseTimers, setPhaseTimers] = useState<Record<string, { elapsed: number; startedAt: number | null }>>({});
  const [tick, setTick] = useState(0);
  const prevActivePhaseRef = useRef<string | null>(null);

  // Global 1-second tick for live timer display
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Start / stop phase timers when activePhase changes
  useEffect(() => {
    const prev = prevActivePhaseRef.current;
    const now = Date.now();
    setPhaseTimers(pt => {
      const next = { ...pt };
      if (prev && next[prev]?.startedAt != null) {
        next[prev] = {
          elapsed: (next[prev].elapsed || 0) + Math.floor((now - (next[prev].startedAt as number)) / 1000),
          startedAt: null,
        };
      }
      if (activePhase) {
        next[activePhase] = {
          elapsed: next[activePhase]?.elapsed || 0,
          startedAt: now,
        };
      }
      return next;
    });
    prevActivePhaseRef.current = activePhase;
  }, [activePhase]);

  const getPhaseElapsed = useCallback((phaseId: string) => {
    const t = phaseTimers[phaseId];
    if (!t) return 0;
    const base = t.elapsed || 0;
    return t.startedAt != null ? base + Math.floor((Date.now() - t.startedAt) / 1000) : base;
  }, [phaseTimers, tick]); // tick dependency forces recalculation every second

  const formatElapsed = (secs: number): string => {
    if (secs < 60) return `${secs}s`;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h\u00a0${m}min`;
  };

  const resetTimers = useCallback(() => {
    setPhaseTimers({});
  }, []);

  return { getPhaseElapsed, formatElapsed, resetTimers };
}
