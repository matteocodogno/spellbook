import { SearchBar } from "./SearchBar";
import type { Phase } from "../data/phases";
import { useScrolled } from "../hooks/useScrolled";

import { useWorkflow } from '../hooks/useWorkflow.tsx';

interface HeaderProps {
  presenterMode: boolean;
  showShortcuts: boolean;
  onTogglePresenterMode: () => void;
  onToggleShortcuts: () => void;
  phases: Phase[];
}

export function Header({
  presenterMode,
  showShortcuts,
  onTogglePresenterMode,
  onToggleShortcuts,
  phases,
}: HeaderProps) {
  const workflow = useWorkflow();
  const scrolled = useScrolled();

  return (
    <>
      {/* Sticky top nav — slides in on scroll */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 99,
        background: "rgba(10,14,26,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.07)" : "transparent"}`,
        transform: scrolled ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), border-color 0.28s ease",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          height: 52,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#64FFDA", boxShadow: "0 0 6px #64FFDA",
            }} />
            <span style={{
              fontSize: 15, fontWeight: 800, color: "#E6EDF3",
              letterSpacing: -0.5,
            }}>🪄 spellbook</span>
          </div>
          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
          <button
            onClick={onTogglePresenterMode}
            title="Presenter mode (p)"
            style={{
              background: presenterMode ? "rgba(255,209,102,0.12)" : "none",
              border: `1px solid ${presenterMode ? "rgba(255,209,102,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 5, padding: "2px 8px", cursor: "pointer",
              color: presenterMode ? "#FFD166" : "#555E6D",
              fontSize: 11, fontFamily: "inherit", flexShrink: 0,
              transition: "all 0.15s", letterSpacing: 0.3,
            }}
            onMouseEnter={e => { if (!presenterMode) { e.currentTarget.style.color = "#8B949E"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}}
            onMouseLeave={e => { if (!presenterMode) { e.currentTarget.style.color = "#555E6D"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}}
          >{presenterMode ? "⬡ present" : "⬡ present"}</button>
          <button
            onClick={onToggleShortcuts}
            title="Keyboard shortcuts (?)"
            style={{
              background: showShortcuts ? "rgba(100,255,218,0.1)" : "none",
              border: `1px solid ${showShortcuts ? "rgba(100,255,218,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 5, padding: "2px 8px", cursor: "pointer",
              color: showShortcuts ? "#64FFDA" : "#555E6D",
              fontSize: 12, fontFamily: "inherit", flexShrink: 0,
              transition: "all 0.15s", lineHeight: 1,
            }}
            onMouseEnter={e => { if (!showShortcuts) { e.currentTarget.style.color = "#8B949E"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}}
            onMouseLeave={e => { if (!showShortcuts) { e.currentTarget.style.color = "#555E6D"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}}
          >?</button>
          {/* Inline search */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar allSteps={workflow.allSteps} phases={phases} onNavigate={workflow.navigateToStep} compact />
          </div>
        </div>
      </div>

      {/* Presenter mode banner */}
      {presenterMode && (
        <div style={{
          position: "fixed", top: scrolled ? 52 : 0, left: 0, right: 0,
          zIndex: 98,
          background: "rgba(255,209,102,0.08)",
          borderBottom: "1px solid rgba(255,209,102,0.2)",
          padding: "5px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          transition: "top 0.28s ease",
        }}>
          <span style={{ fontSize: 10, color: "#FFD166", letterSpacing: 2, textTransform: "uppercase" }}>
            ⬡ Presenter mode — code blocks hidden
          </span>
          <button
            onClick={onTogglePresenterMode}
            style={{
              background: "none", border: "1px solid rgba(255,209,102,0.25)",
              borderRadius: 4, padding: "1px 8px", cursor: "pointer",
              color: "#FFD166", fontSize: 10, fontFamily: "inherit",
            }}
          >exit</button>
        </div>
      )}

      {/* Hero header */}
      <div style={{
        maxWidth: 900, margin: "0 auto",
        overflow: "hidden",
        maxHeight: scrolled ? 0 : 400,
        opacity: scrolled ? 0 : 1,
        marginBottom: scrolled ? 0 : 48,
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, margin-bottom 0.35s ease",
        pointerEvents: scrolled ? "none" : "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#64FFDA", boxShadow: "0 0 8px #64FFDA"
          }} />
          <span style={{ fontSize: 11, color: "#64FFDA", letterSpacing: 4, textTransform: "uppercase" }}>
            Claude Code · Full Stack Workflow
          </span>
        </div>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          color: "#E6EDF3",
          lineHeight: 1.1,
          letterSpacing: -2,
        }}>
          🪄 spellbook
        </h1>
        <p style={{ margin: "8px 0 4px", fontSize: 13, color: "#8B949E", lineHeight: 1.6 }}>
          From Idea to Running Code
        </p>
        <p style={{ margin: "0", fontSize: 11, color: "#555E6D", lineHeight: 1.6 }}>
          PDR → Spec → tasks.md → ⑃ Autonomous (03A) or Controlled (03B) &nbsp;·&nbsp; click any step to expand
        </p>
      </div>

      {/* Search — hidden when top nav is active */}
      <div style={{
        overflow: "hidden",
        maxHeight: scrolled ? 0 : 120,
        opacity: scrolled ? 0 : 1,
        transition: "max-height 0.3s ease, opacity 0.2s ease",
        pointerEvents: scrolled ? "none" : "auto",
      }}>
        <SearchBar allSteps={workflow.allSteps} phases={phases} onNavigate={workflow.navigateToStep} />
      </div>
    </>
  );
}
