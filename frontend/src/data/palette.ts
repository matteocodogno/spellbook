export interface PhaseColors {
  color: string;
  bg: string;
  border: string;
}

export const palette: Record<string, PhaseColors> = {
  phase0: { color: "#43FFAB", bg: "rgba(67,255,171,0.07)", border: "rgba(67,255,171,0.3)" },
  phase1: { color: "#64FFDA", bg: "rgba(100,255,218,0.07)", border: "rgba(100,255,218,0.3)" },
  phase2: { color: "#FFD166", bg: "rgba(255,209,102,0.07)", border: "rgba(255,209,102,0.3)" },
  phase2b: { color: "#FF6EC7", bg: "rgba(255,110,199,0.07)", border: "rgba(255,110,199,0.3)" },
  phase3: { color: "#FF6B9D", bg: "rgba(255,107,157,0.07)", border: "rgba(255,107,157,0.3)" },
};
