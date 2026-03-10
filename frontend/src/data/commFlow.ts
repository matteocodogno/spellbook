export interface CommFlowItem {
  from: string;
  to: string;
  label: string;
}

export const commFlow: CommFlowItem[] = [
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
