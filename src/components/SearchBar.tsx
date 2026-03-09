import { useState, useEffect, useRef } from "react";
import type { Phase, StepMeta } from "../data/phases";

interface SearchResult extends StepMeta {
  phaseLabel: string;
  phaseColor: string;
  tool: string;
  detail: string;
  code: string;
}

interface SearchBarProps {
  allSteps: StepMeta[];
  phases: Phase[];
  onNavigate: (step: StepMeta) => void;
  compact?: boolean;
}

export function SearchBar({ allSteps, phases, onNavigate, compact = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const index: SearchResult[] = allSteps.map(s => {
    const phase = phases.find(p => p.id === s.phaseId);
    const step = phase?.steps[s.stepNum];
    return {
      ...s,
      phaseLabel: phase?.label ?? "",
      phaseColor: phase?.color ?? "#64FFDA",
      tool: step?.tool ?? "",
      detail: step?.detail ?? "",
      code: step?.code ?? "",
    };
  });

  const results = query.trim().length < 2 ? [] : (() => {
    const q = query.toLowerCase();
    return index
      .filter(s =>
        s.action.toLowerCase().includes(q) ||
        s.tool.toLowerCase().includes(q) ||
        s.phaseLabel.toLowerCase().includes(q) ||
        s.detail.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      )
      .slice(0, 8);
  })();

  // Reset highlight index when query changes
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setHighlightedIdx(-1);
  }

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightedIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIdx]);

  const commit = (s: SearchResult) => {
    onNavigate(s);
    setOpen(false);
    setQuery("");
    setHighlightedIdx(-1);
  };

  const highlight = (text: string, q: string) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "rgba(100,255,218,0.25)", color: "#64FFDA", borderRadius: 2 }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setHighlightedIdx(-1);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx(i => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx(i => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = highlightedIdx >= 0 ? results[highlightedIdx] : results[0];
      if (target) commit(target);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", maxWidth: compact ? "100%" : 900, margin: compact ? 0 : "0 auto 32px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${open ? "rgba(100,255,218,0.35)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10, padding: "10px 16px", transition: "border-color 0.15s",
      }}>
        <span style={{ color: "#555E6D", fontSize: 14 }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search steps, tools, commands…"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#E6EDF3", fontSize: 13, fontFamily: "inherit" }}
        />
        {query ? (
          <button onClick={() => { setQuery(""); setHighlightedIdx(-1); setOpen(false); inputRef.current?.focus(); }}
                  style={{ background: "none", border: "none", color: "#555E6D", cursor: "pointer", fontSize: 14, padding: 0 }}>
            ✕
          </button>
        ) : (
          <kbd style={{ fontSize: 10, color: "#444C56", border: "1px solid #2D3340", borderRadius: 4, padding: "2px 6px", letterSpacing: 1 }}>/</kbd>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, overflow: "hidden", zIndex: 200,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}>
          <div ref={listRef}>
            {results.map((s, i) => {
              const isHl = i === highlightedIdx;
              return (
                <div
                  key={s.key}
                  onClick={() => commit(s)}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  onMouseLeave={() => setHighlightedIdx(-1)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", cursor: "pointer",
                    borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    background: isHl ? "rgba(100,255,218,0.06)" : "transparent",
                    borderLeft: `2px solid ${isHl ? "#64FFDA" : "transparent"}`,
                    transition: "background 0.08s",
                  }}
                >
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                    color: s.phaseColor, border: `1px solid ${s.phaseColor}40`,
                    borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap", minWidth: 28, textAlign: "center",
                  }}>{s.phaseNumber}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: isHl ? "#E6EDF3" : "#C9D1D9", fontWeight: 600, marginBottom: 2 }}>
                      {highlight(s.action, query)}
                    </div>
                    <div style={{ fontSize: 10, color: "#555E6D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.tool}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: isHl ? "#64FFDA" : "#2D3340", whiteSpace: "nowrap" }}>
                    step {s.stepNum + 1}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "6px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 10, color: "#2D3340", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span><kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 4px" }}>↑</kbd> <kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 4px" }}>↓</kbd> navigate</span>
            <span>·</span>
            <span><kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 4px" }}>↵</kbd> open</span>
            <span>·</span>
            <span><kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 4px" }}>esc</kbd> close</span>
          </div>
        </div>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "16px", zIndex: 200,
          fontSize: 12, color: "#555E6D", textAlign: "center",
        }}>
          No steps match <em style={{ color: "#8B949E" }}>"{query}"</em>
        </div>
      )}
    </div>
  );
}
