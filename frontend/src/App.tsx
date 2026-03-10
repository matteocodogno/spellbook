import { useState } from "react";
import { phases } from "./data/phases";
import { useScrolled } from "./hooks/useScrolled";
import { usePhaseTimers } from "./hooks/usePhaseTimers";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { WorkflowProvider } from "./contexts/WorkflowContext";
import { NotesProvider } from "./contexts/NotesContext";
import { PrerequisitesSection } from "./components/PrerequisitesSection";
import { SpotlightOverlay } from "./components/SpotlightOverlay";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { Header } from "./components/Header";
import { CommunicationMap } from "./components/CommunicationMap";
import { FooterLegend } from "./components/FooterLegend";
import { ProgressBar } from "./components/ProgressBar";
import { PhaseList } from "./components/PhaseList";
import { PhaseCompletionCelebration } from "./components/PhaseCompletionCelebration";
import { useWorkflow } from './hooks/useWorkflow.tsx';

function AppContent() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [spotlitStep, setSpotlitStep] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<{ text: string } | null>(null);

  const scrolled = useScrolled();
  const workflow = useWorkflow();
  const { getPhaseElapsed, formatElapsed, resetTimers } = usePhaseTimers(workflow.activePhase);

  const handleReset = async () => {
    await workflow.reset();
    resetTimers();
  };

  useKeyboardShortcuts({
    focusedStep: workflow.focusedStep,
    setFocusedStep: workflow.setFocusedStep,
    expandedSteps: workflow.expandedSteps,
    allSteps: workflow.allSteps,
    setActivePhase: workflow.setActivePhase,
    handleSetActiveStep: workflow.handleSetActiveStep,
    toggleCompleted: workflow.toggleCompleted,
    jumpToNextIncomplete: workflow.jumpToNextIncomplete,
    showShortcuts,
    setShowShortcuts,
    spotlitStep,
    setSpotlitStep,
    setCopyFlash,
    setCopyToast,
    setPresenterMode,
  });

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      background: "#0A0E1A",
      minHeight: "100vh",
      color: "#CDD6F4",
      padding: `${scrolled ? 96 : 40}px 24px 40px`,
      boxSizing: "border-box",
      transition: "padding-top 0.3s ease",
    }}>
      {/* Global copy toast */}
      {copyToast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%",
          transform: "translateX(-50%)",
          zIndex: 400,
          background: "#0D1117",
          border: "1px solid rgba(100,255,218,0.4)",
          borderRadius: 8,
          padding: "8px 18px",
          fontSize: 12, color: "#64FFDA",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          pointerEvents: "none",
          animation: "spotlightIn 0.15s ease",
          whiteSpace: "nowrap",
        }}>
          ✓ {copyToast.text}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        @keyframes spotlightIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
      `}</style>

      <PhaseCompletionCelebration
        phases={phases}
        allSteps={workflow.allSteps}
        completedSteps={workflow.completedSteps}
      />

      <Header
        presenterMode={presenterMode}
        showShortcuts={showShortcuts}
        onTogglePresenterMode={() => setPresenterMode(s => !s)}
        onToggleShortcuts={() => setShowShortcuts(s => !s)}
        phases={phases}
      />

      <SpotlightOverlay
        spotlitStep={spotlitStep}
        setSpotlitStep={setSpotlitStep}
        phases={phases}
        presenterMode={presenterMode}
      />

      {/* ? trigger pill — always visible, opens shortcuts modal */}
      <div style={{ maxWidth: 900, margin: "-16px auto 32px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowShortcuts(s => !s)}
          title="Keyboard shortcuts (?)"
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20, padding: "3px 12px", cursor: "pointer",
            color: "#444C56", fontSize: 10, fontFamily: "inherit",
            letterSpacing: 1, transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#8B949E"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#444C56"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
        >
          keyboard shortcuts <kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 5px", marginLeft: 6, fontSize: 10, fontFamily: "inherit", background: "rgba(255,255,255,0.03)", color: "#8B949E" }}>?</kbd>
        </button>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <PrerequisitesSection />

      <CommunicationMap />

      <PhaseList
        phases={phases}
        getPhaseElapsed={getPhaseElapsed}
        formatElapsed={formatElapsed}
        presenterMode={presenterMode}
        spotlitStep={spotlitStep}
        setSpotlitStep={setSpotlitStep}
        copyFlash={copyFlash}
        setCopyFlash={setCopyFlash}
      />

      <FooterLegend />

      {/* Sticky progress bar */}
      <ProgressBar
        phases={phases}
        onReset={handleReset}
      />

      {/* Spacer so content isn't hidden behind a sticky bar */}
      <div style={{ height: 64 }} />
    </div>
  );
}

export default function App() {
  return (
    <WorkflowProvider>
      <NotesProvider>
        <AppContent />
      </NotesProvider>
    </WorkflowProvider>
  );
}
