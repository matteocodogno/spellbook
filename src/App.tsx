import { useState, useCallback, useEffect, useRef } from "react";
import { phases } from "./data/phases";

const commFlow = [
  { from: "You", to: "Claude Code CLI", label: "natural language" },
  { from: "Claude Code CLI", to: "MCP Servers", label: "JSON-RPC over stdio" },
  { from: "MCP Servers", to: "Browser", label: "CDP protocol" },
  { from: "MCP Servers", to: "GitHub API", label: "REST / GraphQL" },
  { from: "GitHub MCP", to: "GitHub Issues", label: "create / label / close" },
  { from: "tasks.md <!-- gh:#N -->", to: "GitHub Issues", label: "Closes #N in commit footer" },
  { from: "Claude Code", to: "mise", label: "generates .mise.toml from design.md" },
  { from: "mise", to: "runtimes", label: "installs pinned versions" },
  { from: "cc-sdd (spec-impl)", to: "tasks.md", label: "ticks - [x] checkboxes" },
  { from: "cc-sdd (spec-status)", to: "tasks.md", label: "reads checkbox state" },
  { from: "Claude Code (plan)", to: "You", label: "plan proposal → awaits approval" },
  { from: "You", to: "Claude Code (impl)", label: "explicit go-ahead" },
  { from: "Claude Code (impl)", to: "You", label: "diff + tests → awaits approval" },
  { from: "cc-sdd", to: ".kiro/specs/*.md", label: "writes spec files" },
  { from: "openspec init", to: "openspec/project.md + AGENTS.md", label: "project context files" },
  { from: "/openspec:proposal", to: "openspec/changes/<id>/", label: "proposal + tasks + spec delta" },
  { from: "/openspec:apply", to: "tasks.md", label: "ticks - [x] checkboxes" },
  { from: "/openspec:archive", to: "openspec/specs/*.md", label: "merges spec deltas → living specs" },
];

// ── Confetti engine ───────────────────────────────────────────────
function useConfetti() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  const launch = useCallback((color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const palette = [color, "#ffffff", "#FFD166", "#A8DAFF", "#FF9F43", color];
    const count = 160;

    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: -10,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * 6 + 3,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        w: Math.random() * 10 + 5,
        h: Math.random() * 5 + 3,
        color: palette[Math.floor(Math.random() * palette.length)],
        opacity: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.05);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.99;
        p.rot += p.rotV;
        p.opacity -= 0.012;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        if (p.shape === "rect") ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  return { canvasRef, launch };
}

// ── Phase completion notification ─────────────────────────────────
function PhaseNotification({ phase, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: visible ? 24 : -120,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 999,
      transition: "top 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      pointerEvents: "none",
    }}>
      <div style={{
        background: "rgba(10,14,26,0.95)",
        border: `1px solid ${phase.color}60`,
        borderRadius: 14,
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${phase.color}30`,
        backdropFilter: "blur(16px)",
        minWidth: 280,
        textAlign: "center",
      }}>
        <span style={{ fontSize: 22 }}>🎉</span>
        <div>
          <div style={{ fontSize: 13, color: "#E6EDF3", fontWeight: 700, marginBottom: 4 }}>
            All {phase.steps.length} steps done!
          </div>
          <div style={{ fontSize: 10, color: phase.color, letterSpacing: 2, textTransform: "uppercase" }}>
            {phase.number} · {phase.label}
          </div>
        </div>
        <span style={{ fontSize: 22 }}>🎉</span>
      </div>
    </div>
  );
}

const prereqs = {
  macos: [
    {
      name: "Homebrew",
      why: "Package manager — installs everything else",
      check: "brew --version",
      install: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`,
    },
    {
      name: "Node.js 22+",
      why: "Runtime for Claude Code CLI and MCP servers",
      check: "node --version",
      install: "brew install node",
    },
    {
      name: "Git",
      why: "Version control — required by every workflow step",
      check: "git --version",
      install: "brew install git",
    },
    {
      name: "mise",
      why: "Pins runtimes per project (Node, Python, Java…)",
      check: "mise --version",
      install: "brew install mise && mise activate zsh >> ~/.zshrc",
    },
    {
      name: "Claude Code",
      why: "The AI coding agent — orchestrates the entire workflow",
      check: "claude --version",
      install: "npm install -g @anthropic-ai/claude-code",
    },
    {
      name: "GitHub CLI",
      why: "Required by GitHub MCP server for PR / issue operations",
      check: "gh --version",
      install: "brew install gh && gh auth login",
    },
    {
      name: "Docker Desktop",
      why: "Needed for Module 0 infrastructure (LiteLLM, Langfuse, etc.)",
      check: "docker --version",
      install: "brew install --cask docker",
    },
  ],
  windows: [
    {
      name: "winget / Windows Package Manager",
      why: "Built-in package manager (Windows 10 1709+) — installs everything else",
      check: "winget --version",
      install: "# Pre-installed on Windows 11. On Windows 10:\n# Open Microsoft Store → search 'App Installer' → Install",
    },
    {
      name: "Node.js 22+",
      why: "Runtime for Claude Code CLI and MCP servers",
      check: "node --version",
      install: "winget install OpenJS.NodeJS.LTS",
    },
    {
      name: "Git",
      why: "Version control — required by every workflow step",
      check: "git --version",
      install: "winget install Git.Git",
    },
    {
      name: "mise",
      why: "Pins runtimes per project (Node, Python, Java…)",
      check: "mise --version",
      install: "# Via PowerShell:\nwinget install jdx.mise\n# Add mise shims to PATH and activate:\nmise activate pwsh >> $PROFILE",
    },
    {
      name: "Claude Code",
      why: "The AI coding agent — orchestrates the entire workflow",
      check: "claude --version",
      install: "# Requires Node 22+ (see above)\nnpm install -g @anthropic-ai/claude-code",
    },
    {
      name: "GitHub CLI",
      why: "Required by GitHub MCP server for PR / issue operations",
      check: "gh --version",
      install: "winget install GitHub.cli\ngh auth login",
    },
    {
      name: "Docker Desktop",
      why: "Needed for Module 0 infrastructure (LiteLLM, Langfuse, etc.)",
      check: "docker --version",
      install: "winget install Docker.DockerDesktop\n# Enable WSL 2 backend in Docker Desktop settings",
    },
    {
      name: "WSL 2",
      why: "Recommended shell environment — Claude Code works best on Unix",
      check: "wsl --version",
      install: "wsl --install\n# Restart, then install Ubuntu from Microsoft Store",
    },
  ],
  linux: [
    {
      name: "curl + build-essential",
      why: "Base tools needed by installers below",
      check: "curl --version && gcc --version",
      install: "sudo apt update && sudo apt install -y curl build-essential",
    },
    {
      name: "Node.js 22+",
      why: "Runtime for Claude Code CLI and MCP servers",
      check: "node --version",
      install: "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -\nsudo apt install -y nodejs",
    },
    {
      name: "Git",
      why: "Version control — required by every workflow step",
      check: "git --version",
      install: "sudo apt install -y git",
    },
    {
      name: "mise",
      why: "Pins runtimes per project (Node, Python, Java…)",
      check: "mise --version",
      install: "curl https://mise.run | sh\necho 'eval \"$(~/.local/bin/mise activate bash)\"' >> ~/.bashrc\nsource ~/.bashrc",
    },
    {
      name: "Claude Code",
      why: "The AI coding agent — orchestrates the entire workflow",
      check: "claude --version",
      install: "npm install -g @anthropic-ai/claude-code",
    },
    {
      name: "GitHub CLI",
      why: "Required by GitHub MCP server for PR / issue operations",
      check: "gh --version",
      install: "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg\necho \"deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\" | sudo tee /etc/apt/sources.list.d/github-cli.list\nsudo apt update && sudo apt install gh\ngh auth login",
    },
    {
      name: "Docker Engine",
      why: "Needed for Module 0 infrastructure (LiteLLM, Langfuse, etc.)",
      check: "docker --version",
      install: "curl -fsSL https://get.docker.com | sh\nsudo usermod -aG docker $USER\nnewgrp docker",
    },
  ],
};

const osLabels = { macos: "🍎  macOS", windows: "🪟  Windows", linux: "🐧  Linux" };

function SearchBar({ allSteps, phases, onNavigate, compact = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const index = allSteps.map(s => {
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

  // Reset highlight whenever results change
  useEffect(() => { setHighlightedIdx(-1); }, [query]);

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightedIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIdx];
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIdx]);

  const commit = (s) => {
    onNavigate(s);
    setOpen(false);
    setQuery("");
    setHighlightedIdx(-1);
  };

  const highlight = (text, q) => {
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
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e) => {
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

function PrerequisitesSection() {
  const [activeOs, setActiveOs] = useState("macos");
  const tools = prereqs[activeOs];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto 48px" }}>
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 10, color: "#8B949E", letterSpacing: 3, marginBottom: 4, textTransform: "uppercase" }}>
            Prerequisites
          </div>
          <div style={{ fontSize: 12, color: "#555E6D", marginBottom: 16 }}>
            Install these tools before starting Phase 00
          </div>
          {/* OS Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {Object.entries(osLabels).map(([os, label]) => (
              <button
                key={os}
                onClick={() => setActiveOs(os)}
                style={{
                  padding: "8px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeOs === os ? "#64FFDA" : "transparent"}`,
                  color: activeOs === os ? "#64FFDA" : "#555E6D",
                  fontSize: 12,
                  fontFamily: "inherit",
                  fontWeight: activeOs === os ? 700 : 400,
                  cursor: "pointer",
                  marginBottom: -1,
                  transition: "all 0.15s",
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tool rows */}
        <div style={{ padding: "8px 16px 16px" }}>
          {tools.map((tool, i) => (
            <ToolRow key={i} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolRow({ tool }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      marginTop: 8,
      borderRadius: 8,
      border: `1px solid ${open ? "rgba(100,255,218,0.2)" : "rgba(255,255,255,0.05)"}`,
      background: open ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.02)",
      overflow: "hidden",
      transition: "all 0.15s",
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", cursor: "pointer",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          color: open ? "#64FFDA" : "#8B949E",
          minWidth: 160,
        }}>{tool.name}</span>
        <span style={{ flex: 1, fontSize: 11, color: "#555E6D" }}>{tool.why}</span>
        <code style={{
          fontSize: 10, color: "#A8FF78", background: "rgba(168,255,120,0.07)",
          padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
        }}>{tool.check}</code>
        <span style={{ fontSize: 10, color: open ? "#64FFDA" : "#444C56", marginLeft: 8 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ fontSize: 10, color: "#555E6D", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>
            Install
          </div>
          <CodeBlock code={tool.install} color="#64FFDA" />
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code, color }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      navigator.clipboard?.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [code]);

  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <pre style={{
        margin: 0,
        padding: "14px 16px",
        paddingRight: 80,
        background: "#0D1117",
        borderRadius: 8,
        fontSize: 11,
        color: "#A8FF78",
        overflowX: "auto",
        lineHeight: 1.7,
        border: "1px solid rgba(168,255,120,0.1)",
      }}>{code}</pre>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          background: copied ? "rgba(100,255,218,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${copied ? "rgba(100,255,218,0.4)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 6,
          color: copied ? "#64FFDA" : "#8B949E",
          fontSize: 10,
          fontFamily: "inherit",
          letterSpacing: 1,
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "✓ copied" : "⎘ copy"}
      </button>
    </div>
  );
}

function TroubleshootingPanel({ tips, color }) {
  const [open, setOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState(null);
  if (!tips || tips.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: open ? "rgba(255,159,67,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${open ? "rgba(255,159,67,0.25)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 7, padding: "7px 12px",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,159,67,0.04)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      >
        <span style={{ fontSize: 12 }}>⚠</span>
        <span style={{ fontSize: 11, color: open ? "#FF9F43" : "#8B949E", fontWeight: 600, flex: 1, textAlign: "left" }}>
          Troubleshooting · {tips.length} common issue{tips.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 10, color: "#555E6D" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          border: "1px solid rgba(255,159,67,0.15)", borderTop: "none",
          borderRadius: "0 0 7px 7px", overflow: "hidden",
        }}>
          {tips.map((tip, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "9px 14px", cursor: "pointer",
                    background: isOpen ? "rgba(255,159,67,0.05)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 10, color: "#FF9F43", marginTop: 1, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 11, color: isOpen ? "#E6EDF3" : "#A8B3C1", flex: 1, lineHeight: 1.5 }}>
                    {tip.err}
                  </span>
                  <span style={{ fontSize: 9, color: "#555E6D", flexShrink: 0, marginTop: 1 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div style={{
                    padding: "8px 14px 10px 34px",
                    background: "rgba(0,0,0,0.2)",
                    borderTop: "1px solid rgba(255,159,67,0.1)",
                  }}>
                    <span style={{ fontSize: 10, color: "#64FFDA", marginRight: 6 }}>→</span>
                    <span style={{ fontSize: 11, color: "#8B949E", lineHeight: 1.6 }}>{tip.fix}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteBox({ stepKey, color, notes, setNote }) {
  const [open, setOpen] = useState(false);
  const val = notes[stepKey] ?? "";
  const taRef = useRef(null);

  // Auto-open if note already exists
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current && val) { setOpen(true); firstRender.current = false; }
    else { firstRender.current = false; }
  }, []);

  useEffect(() => {
    if (open && taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = taRef.current.scrollHeight + "px";
    }
  }, [open, val]);

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 0", fontFamily: "inherit",
          color: open || val ? color : "#555E6D",
          fontSize: 11, letterSpacing: 0.5,
          transition: "color 0.15s",
        }}
      >
        <span style={{ fontSize: 12 }}>{open ? "▾" : "▸"}</span>
        {val && !open
          ? <span style={{ fontStyle: "italic", opacity: 0.7, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val.split("\n")[0]}</span>
          : <span>✎ my note</span>
        }
      </button>
      {open && (
        <textarea
          ref={taRef}
          value={val}
          placeholder={"Jot your token, project name, what you changed…\nThis note is saved to your browser storage."}
          onChange={e => {
            setNote(stepKey, e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          style={{
            display: "block",
            width: "100%",
            minHeight: 72,
            marginTop: 6,
            padding: "10px 12px",
            background: "rgba(255,209,102,0.04)",
            border: `1px solid ${color}30`,
            borderRadius: 6,
            color: "#CDD6F4",
            fontSize: 12,
            fontFamily: "inherit",
            lineHeight: 1.6,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
            overflowY: "hidden",
          }}
          onFocus={e => { e.target.style.borderColor = color + "70"; }}
          onBlur={e => { e.target.style.borderColor = color + "30"; }}
        />
      )}
    </div>
  );
}

function SpotlightOverlay({ spotlitStep, setSpotlitStep, phases, allSteps, presenterMode, completedSteps, toggleCompleted, notes, setNote }) {
  if (!spotlitStep) return null;

  const stepMeta = allSteps.find(s => s.key === spotlitStep);
  if (!stepMeta) return null;
  const phase = phases.find(p => p.id === stepMeta.phaseId);
  if (!phase) return null;
  const step = phase.steps[stepMeta.stepNum];
  if (!step) return null;
  const isDone = completedSteps.has(spotlitStep);

  return (
    <div
      onClick={() => setSpotlitStep(null)}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(5,8,18,0.88)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 780,
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 14,
          border: `1px solid ${phase.color}`,
          background: "#0D1117",
          boxShadow: `0 0 0 4px ${phase.color}20, 0 32px 80px rgba(0,0,0,0.7)`,
          animation: "spotlightIn 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px",
          borderBottom: `1px solid ${phase.color}20`,
        }}>
          <button
            onClick={e => { e.stopPropagation(); toggleCompleted(spotlitStep); }}
            title={isDone ? "Mark as not done" : "Mark as done"}
            style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: 5,
              border: `1.5px solid ${isDone ? phase.color : "rgba(255,255,255,0.2)"}`,
              background: isDone ? phase.color : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, transition: "all 0.15s",
            }}
          >
            {isDone && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0A0E1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span style={{ fontSize: 16, color: phase.color }}>{step.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#555E6D", marginBottom: 2, letterSpacing: 0.5 }}>{step.tool}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#E6EDF3" }}>{step.action}</div>
          </div>
          <span style={{
            fontSize: 9, color: phase.color, border: `1px solid ${phase.color}`,
            background: `${phase.color}15`, padding: "2px 8px", borderRadius: 10,
            letterSpacing: 1.5, textTransform: "uppercase",
            animation: "pulse 2s ease-in-out infinite",
          }}>◉ spotlight</span>
          <button
            onClick={() => setSpotlitStep(null)}
            title="Exit spotlight (Esc)"
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 5, padding: "3px 9px", cursor: "pointer",
              color: "#555E6D", fontSize: 11, fontFamily: "inherit",
              transition: "all 0.15s", marginLeft: 4,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#E6EDF3"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#555E6D"; }}
          >esc</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {!presenterMode && <CodeBlock code={step.code} color={phase.color} />}
          <p style={{
            margin: "0 0 16px", fontSize: presenterMode ? 14 : 13,
            color: presenterMode ? "#CDD6F4" : "#A8B3C1",
            lineHeight: 1.75,
            padding: "12px 16px",
            background: presenterMode ? `${phase.color}08` : "rgba(255,255,255,0.03)",
            borderRadius: 6,
            borderLeft: `3px solid ${phase.color}${presenterMode ? "90" : "60"}`,
          }}>{step.detail}</p>
          {!presenterMode && <TroubleshootingPanel tips={step.troubleshooting} color={phase.color} />}
          <NoteBox stepKey={spotlitStep} color={phase.color} notes={notes} setNote={setNote} />
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "flex-end", gap: 12,
        }}>
          <span style={{ fontSize: 10, color: "#2D3340" }}>
            click outside or press <kbd style={{ border: "1px solid #2D3340", borderRadius: 3, padding: "1px 5px", fontFamily: "inherit", fontSize: 10, background: "rgba(255,255,255,0.03)", color: "#555E6D" }}>esc</kbd> to exit
          </span>
        </div>
      </div>
    </div>
  );
}

function PhaseCard({ phase, activePhase, activeStep, setActivePhase, setActiveStep, allSteps, focusedStep, completedSteps, toggleCompleted, notes, setNote, getPhaseElapsed, formatElapsed, presenterMode, spotlitStep, setSpotlitStep, copyFlash, setCopyFlash }) {
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
                  {isRunning ? "⏱ " : ""}{formatElapsed(elapsed)}
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
                      setSpotlitStep(prev => prev === stepKey ? null : stepKey);
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
                  const navigate = (target) => {
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

function copyText(text, onSuccess) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      legacyCopy(text, onSuccess);
    });
  } else {
    legacyCopy(text, onSuccess);
  }
}

function legacyCopy(text, onSuccess) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    onSuccess();
  } catch (_) {}
  document.body.removeChild(ta);
}


export default function App() {
  const [activePhase, setActivePhase] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [focusedStep, setFocusedStep] = useState(null);
  const [maxReached, setMaxReached] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [notes, setNotes] = useState({});           // { [stepKey]: string }
  const notesDebounceRef = useRef(null);
  const notesReadyRef = useRef(false);

  // ── Persistent storage (window.storage artifact API) ───────────
  const STORAGE_KEY = "ai4dev-workflow-progress";
  const NOTES_KEY   = "ai4dev-workflow-notes";

  // Load on mount
  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) {
          const saved = JSON.parse(result.value);
          if (typeof saved.maxReached === "number") setMaxReached(saved.maxReached);
          if (Array.isArray(saved.expandedSteps)) setExpandedSteps(new Set(saved.expandedSteps));
          if (Array.isArray(saved.completedSteps)) setCompletedSteps(new Set(saved.completedSteps));
          if (saved.activePhase) setActivePhase(saved.activePhase);
        }
      } catch (_) {
        // storage unavailable or key not found — start fresh
      } finally {
        setStorageReady(true);
      }
      try {
        const nr = await window.storage.get(NOTES_KEY);
        if (nr?.value) setNotes(JSON.parse(nr.value));
      } catch (_) {}
      notesReadyRef.current = true;
    };
    load();
  }, []);

  // Save whenever progress state changes (but only after initial load)
  useEffect(() => {
    if (!storageReady) return;
    const save = async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({
          maxReached,
          expandedSteps: [...expandedSteps],
          completedSteps: [...completedSteps],
          activePhase,
        }));
      } catch (_) {}
    };
    save();
  }, [maxReached, expandedSteps, completedSteps, activePhase, storageReady]);

  const setNote = useCallback((key, value) => {
    setNotes(prev => {
      const next = { ...prev };
      if (value.trim() === "") delete next[key];
      else next[key] = value;
      // debounced save
      if (notesReadyRef.current) {
        clearTimeout(notesDebounceRef.current);
        notesDebounceRef.current = setTimeout(async () => {
          try { await window.storage.set(NOTES_KEY, JSON.stringify(next)); } catch (_) {}
        }, 800);
      }
      return next;
    });
  }, []);
  const [celebration, setCelebration] = useState(null); // { phase }
  const [scrolled, setScrolled] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [spotlitStep, setSpotlitStep] = useState(null);
  const [copyFlash, setCopyFlash] = useState(null); // stepKey that just got copied
  const [copyToast, setCopyToast] = useState(null); // { text } global toast
  const [phaseTimers, setPhaseTimers] = useState({}); // { [phaseId]: { elapsed, startedAt } }
  const [tick, setTick] = useState(0);                // increments every second → forces re-render
  const prevActivePhaseRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when a step is spotlit
  useEffect(() => {
    document.body.style.overflow = spotlitStep ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [spotlitStep]);

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
          elapsed: (next[prev].elapsed || 0) + Math.floor((now - next[prev].startedAt) / 1000),
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

  const getPhaseElapsed = useCallback((phaseId) => {
    const t = phaseTimers[phaseId];
    if (!t) return 0;
    const base = t.elapsed || 0;
    return t.startedAt != null ? base + Math.floor((Date.now() - t.startedAt) / 1000) : base;
  }, [phaseTimers, tick]); // tick dependency forces recalculation every second

  const formatElapsed = (secs) => {
    if (secs < 60) return `${secs}s`;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h\u00a0${m}min`;
  };
  const { canvasRef, launch } = useConfetti();

  const allSteps = phases.flatMap(phase =>
    phase.steps.map((step, si) => ({
      key: `${phase.id}-${si}`,
      phaseId: phase.id,
      phaseNumber: phase.number,
      stepNum: si,
      action: step.action,
      time: step.time,
    }))
  );

  // Unified step dispatch — accepts { type, key } | { type: expand_all/collapse_all, keys } | null
  const handleSetActiveStep = useCallback((action) => {
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
        // close `from`, always open `to`
        next.delete(action.from);
        next.add(action.to);
      } else if (action.type === "expand_all") {
        action.keys.forEach(k => next.add(k));
      } else if (action.type === "collapse_all") {
        action.keys.forEach(k => next.delete(k));
      }
      return next;
    });
    // maxReached tracking: use key from toggle actions
    if (action.type === "toggle" && action.key) {
      const idx = allSteps.findIndex(s => s.key === action.key);
      if (idx > maxReached) setMaxReached(idx);
    }
  }, [allSteps, maxReached]);

  const progress = allSteps.length > 0
    ? Math.round((completedSteps.size / allSteps.length) * 100)
    : 0;

  const parseMins = (t) => {
    if (!t || t === "automated" || t === "ongoing") return 0;
    const match = t.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };
  const remainingMins = allSteps.reduce((acc, s) =>
    completedSteps.has(s.key) ? acc : acc + parseMins(s.time), 0);
  const formatRemaining = (mins) => {
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `~${m}min`;
    return m === 0 ? `~${h}h` : `~${h}h ${m}min`;
  };
  const remainingLabel = progress < 100 ? formatRemaining(remainingMins) : null;
  const lastExpanded = allSteps.slice().reverse().find(s => expandedSteps.has(s.key));
  const currentStep = lastExpanded ?? allSteps.find(s => s.key === focusedStep);

  // Track previous completedSteps to detect phase completion transitions
  const prevCompletedRef = useRef(new Set());
  useEffect(() => {
    const prev = prevCompletedRef.current;
    for (const phase of phases) {
      const phaseKeys = allSteps.filter(s => s.phaseId === phase.id).map(s => s.key);
      if (phaseKeys.length === 0) continue;
      const wasAllDone = phaseKeys.every(k => prev.has(k));
      const isAllDone  = phaseKeys.every(k => completedSteps.has(k));
      if (!wasAllDone && isAllDone) {
        setCelebration(phase);
        launch(phase.color);
        break;
      }
    }
    prevCompletedRef.current = new Set(completedSteps);
  }, [completedSteps]);

  const toggleCompleted = useCallback((key) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const navigateToStep = useCallback((target) => {
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

  // ── Keyboard shortcuts ──────────────────────────────────────────
  // j / ↓  → move cursor to next step (opens its phase, scrolls)
  // k / ↑  → move cursor to prev step
  // Enter  → expand focused step / collapse if already open
  // Esc    → collapse open step or clear focus
  useEffect(() => {
    const handler = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

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
  }, [focusedStep, expandedSteps, allSteps, handleSetActiveStep, toggleCompleted, jumpToNextIncomplete, showShortcuts, spotlitStep, copyFlash]);

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
      {/* Confetti canvas */}
      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 998,
      }} />

      {/* Phase completion notification */}
      {celebration && (
        <PhaseNotification
          phase={celebration}
          onDone={() => setCelebration(null)}
        />
      )}

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
            onClick={() => setPresenterMode(s => !s)}
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
            onClick={() => setShowShortcuts(s => !s)}
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
            <SearchBar allSteps={allSteps} phases={phases} onNavigate={navigateToStep} compact />
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
            onClick={() => setPresenterMode(false)}
            style={{
              background: "none", border: "1px solid rgba(255,209,102,0.25)",
              borderRadius: 4, padding: "1px 8px", cursor: "pointer",
              color: "#FFD166", fontSize: 10, fontFamily: "inherit",
            }}
          >exit</button>
        </div>
      )}

      {/* Spotlight overlay */}
      <SpotlightOverlay
        spotlitStep={spotlitStep}
        setSpotlitStep={setSpotlitStep}
        phases={phases}
        allSteps={allSteps}
        presenterMode={presenterMode}
        completedSteps={completedSteps}
        toggleCompleted={toggleCompleted}
        notes={notes}
        setNote={setNote}
      />

      {/* Header */}
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
        <SearchBar allSteps={allSteps} phases={phases} onNavigate={navigateToStep} />
      </div>

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

      {/* Shortcuts modal */}
      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0D1117",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "28px 32px",
              minWidth: 340,
              maxWidth: 480,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E6EDF3", letterSpacing: 0.5 }}>
                ⌨ Keyboard Shortcuts
              </span>
              <button
                onClick={() => setShowShortcuts(false)}
                style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, padding: "2px 8px", cursor: "pointer",
                  color: "#555E6D", fontSize: 11, fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#E6EDF3"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#555E6D"; }}
              >esc</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { keys: ["n"],        label: "Jump to next incomplete step" },
                { keys: ["j"],        label: "Move cursor down" },
                { keys: ["k"],        label: "Move cursor up" },
                { keys: ["↵"],        label: "Expand / collapse focused step" },
                { keys: ["x"],        label: "Mark focused step done" },
                { keys: ["/"],        label: "Open search" },
                { keys: ["esc"],      label: "Collapse / dismiss" },
                { keys: ["?"],        label: "Toggle this modal" },
                { keys: ["p"],        label: "Toggle presenter mode" },
                { keys: ["s"],        label: "Spotlight focused step" },
                { keys: ["c"],        label: "Copy code of focused step" },
              ].map(({ keys, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ fontSize: 12, color: "#8B949E" }}>{label}</span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {keys.map(k => (
                      <kbd key={k} style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 5, padding: "3px 9px",
                        fontFamily: "inherit", fontSize: 11,
                        background: "rgba(255,255,255,0.05)",
                        color: "#CDD6F4",
                        boxShadow: "0 1px 0 rgba(255,255,255,0.1)",
                      }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prerequisites */}
      <PrerequisitesSection />

      {/* Communication map */}
      <div style={{ maxWidth: 900, margin: "0 auto 48px" }}>
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "20px 24px",
        }}>
          <div style={{ fontSize: 10, color: "#8B949E", letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>
            Tool communication map
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {commFlow.map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 11,
              }}>
                <span style={{ color: "#CDD6F4" }}>{c.from}</span>
                <span style={{ color: "#444C56" }}>──</span>
                <span style={{ color: "#8B949E", fontStyle: "italic" }}>{c.label}</span>
                <span style={{ color: "#444C56" }}>──▶</span>
                <span style={{ color: "#CDD6F4" }}>{c.to}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phases */}
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {(() => {
          const elements = [];
          let i = 0;
          while (i < phases.length) {
            const phase = phases[i];
            // Detect start of a fork group
            if (phase.fork) {
              const forkPhases = [];
              while (i < phases.length && phases[i].fork === phase.fork) {
                forkPhases.push(phases[i]);
                i++;
              }
              // Group phases into tracks by forkGroup (or by phase id if none)
              const tracks = [];
              let curTrack = [];
              let curKey = null;
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
                            <PhaseCard
                              key={fp.id}
                              phase={fp}
                              activePhase={activePhase}
                              activeStep={expandedSteps}
                              setActivePhase={setActivePhase}
                              setActiveStep={handleSetActiveStep}
                              allSteps={allSteps}
                              focusedStep={focusedStep}
                              completedSteps={completedSteps}
                              toggleCompleted={toggleCompleted}
                              notes={notes}
                              setNote={setNote}
                              getPhaseElapsed={getPhaseElapsed}
                              formatElapsed={formatElapsed}
                              presenterMode={presenterMode}
                              spotlitStep={spotlitStep}
                              setSpotlitStep={setSpotlitStep}
                              copyFlash={copyFlash}
                              setCopyFlash={setCopyFlash}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else {
              elements.push(
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  activePhase={activePhase}
                  activeStep={expandedSteps}
                  setActivePhase={setActivePhase}
                  setActiveStep={handleSetActiveStep}
                  allSteps={allSteps}
                  focusedStep={focusedStep}
                  completedSteps={completedSteps}
                  toggleCompleted={toggleCompleted}
                  notes={notes}
                  setNote={setNote}
                  getPhaseElapsed={getPhaseElapsed}
                  formatElapsed={formatElapsed}
                  presenterMode={presenterMode}
                  spotlitStep={spotlitStep}
                  setSpotlitStep={setSpotlitStep}
                  copyFlash={copyFlash}
                  setCopyFlash={setCopyFlash}
                />
              );
              i++;
            }
          }
          return elements;
        })()}
      </div>

      {/* Footer legend */}
      <div style={{ maxWidth: 900, margin: "40px auto 0", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          { icon: "↔", label: "MCP tool call (JSON-RPC over stdio)", color: "#64FFDA" },
          { icon: "⚙", label: "Subagent / spawned process", color: "#FFD166" },
          { icon: "⛔", label: "Hard gate — Claude waits for human input", color: "#FF9F43" },
          { icon: "✦", label: "Human action required", color: "#A8DAFF" },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8B949E" }}>
            <span style={{ color: l.color }}>{l.icon}</span>
            {l.label}
          </div>
        ))}
      </div>

      {/* Sticky progress bar */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        background: "rgba(10,14,26,0.92)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        zIndex: 100,
        padding: "10px 24px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Labels row — breadcrumb */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            {/* Left: breadcrumb */}
            {currentStep ? (() => {
              const phase = phases.find(p => p.id === currentStep.phaseId);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, minWidth: 0, overflow: "hidden" }}>
                  <span style={{
                    color: phase?.color ?? "#64FFDA",
                    fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>
                    {phase?.number}
                  </span>
                  <span style={{ color: "#2D3340" }}>›</span>
                  <span style={{
                    color: phase?.color ?? "#64FFDA",
                    opacity: 0.7,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    maxWidth: 140,
                    letterSpacing: 0.5, textTransform: "uppercase", fontSize: 9,
                  }}>
                    {phase?.label}
                  </span>
                  <span style={{ color: "#2D3340" }}>›</span>
                  <span style={{
                    color: "#8B949E",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    maxWidth: 260,
                  }}>
                    <span style={{ color: "#64FFDA", marginRight: 4 }}>
                      step {currentStep.stepNum + 1}
                    </span>
                    {currentStep.action}
                  </span>
                </div>
              );
            })() : (
              <div style={{ fontSize: 10, color: "#555E6D", letterSpacing: 1.5, textTransform: "uppercase" }}>
                Progress
              </div>
            )}

            {/* Right: next button + time remaining + percentage */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              {remainingLabel && (
                <span style={{
                  fontSize: 10, color: "#8B949E",
                  letterSpacing: 0.5, whiteSpace: "nowrap",
                }}>
                  {remainingLabel} remaining
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: progress === 100 ? "#64FFDA" : "#CDD6F4",
                minWidth: 36, textAlign: "right",
              }}>
                {progress}%
              </span>
              {progress < 100 && (
                <button
                  onClick={jumpToNextIncomplete}
                  title="Jump to next incomplete step (n)"
                  style={{
                    background: "rgba(100,255,218,0.08)",
                    border: "1px solid rgba(100,255,218,0.25)",
                    borderRadius: 5, padding: "2px 10px",
                    cursor: "pointer", color: "#64FFDA",
                    fontSize: 10, fontFamily: "inherit",
                    flexShrink: 0, transition: "all 0.15s",
                    letterSpacing: 0.5, whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,255,218,0.15)"; e.currentTarget.style.borderColor = "rgba(100,255,218,0.5)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(100,255,218,0.08)"; e.currentTarget.style.borderColor = "rgba(100,255,218,0.25)"; }}
                >
                  → next
                </button>
              )}
            </div>
            {(maxReached > 0 || completedSteps.size > 0) && (
              <button
                onClick={async () => {
                  setMaxReached(0);
                  setExpandedSteps(new Set());
                  setCompletedSteps(new Set());
                  setActivePhase(null);
                  setNotes({});
                  setPhaseTimers({});
                  try { await window.storage.delete(STORAGE_KEY); } catch (_) {}
                  try { await window.storage.delete(NOTES_KEY); } catch (_) {}
                }}
                title="Reset progress"
                style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, padding: "2px 7px", cursor: "pointer",
                  color: "#444C56", fontSize: 10, fontFamily: "inherit",
                  flexShrink: 0, transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#FF6B6B"; e.currentTarget.style.borderColor = "rgba(255,107,107,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444C56"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                ↺ reset
              </button>
            )}
          </div>
          {/* Bar track */}
          <div style={{
            height: 3,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 99,
              background: progress === 100
                ? "#64FFDA"
                : "linear-gradient(90deg, #64FFDA, #A8DAFF)",
              boxShadow: progress > 0 ? "0 0 8px rgba(100,255,218,0.4)" : "none",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
          {/* Phase markers */}
          <div style={{ position: "relative", height: 12, marginTop: 2 }}>
            {phases.map(phase => {
              const firstIdx = allSteps.findIndex(s => s.phaseId === phase.id);
              const pct = Math.round((firstIdx / (allSteps.length - 1)) * 100);
              const phaseStepKeys = allSteps.filter(s => s.phaseId === phase.id).map(s => s.key);
              const reached = firstIdx <= maxReached || phaseStepKeys.some(k => completedSteps.has(k));
              return (
                <div key={phase.id} style={{
                  position: "absolute",
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: reached ? phase.color : "rgba(255,255,255,0.12)",
                    boxShadow: reached ? `0 0 5px ${phase.color}80` : "none",
                    transition: "all 0.3s",
                  }} />
                  <span style={{
                    fontSize: 8, color: reached ? phase.color : "#2D3340",
                    letterSpacing: 0.5, fontWeight: 700,
                    transition: "color 0.3s",
                  }}>{phase.number}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spacer so content isn't hidden behind sticky bar */}
      <div style={{ height: 64 }} />
    </div>
  );
}
