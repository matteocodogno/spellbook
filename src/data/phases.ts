export interface TroubleshootingTip {
  err: string;
  fix: string;
}

export interface Step {
  tool: string;
  icon: string;
  action: string;
  time: string;
  code: string;
  detail: string;
  troubleshooting?: TroubleshootingTip[];
}

export interface Phase {
  id: string;
  number: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  steps: Step[];
  fork?: string;
  forkGroup?: string;
  forkLabel?: string;
}

export interface StepMeta {
  key: string;
  phaseId: string;
  phaseNumber: string;
  stepNum: number;
  action: string;
  time: string;
}

export type StepAction =
  | null
  | { type: 'toggle'; key: string }
  | { type: 'navigate'; from: string; to: string }
  | { type: 'expand_all'; phaseId: string; keys: string[] }
  | { type: 'collapse_all'; phaseId: string; keys: string[] };

export const phases: Phase[] = [
  {
    id: "phase0",
    number: "00",
    label: "INFRA SETUP · AI GOVERNANCE",
    color: "#43FFAB",
    bg: "rgba(67,255,171,0.07)",
    border: "rgba(67,255,171,0.3)",
    steps: [
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Install prerequisite tools",
        time: "~15 min",
        code: `# macOS — install everything in one pass
# docs ─ mise (runtime manager): https://mise.jdx.dev/getting-started.html
# docs ─ just (task runner):     https://github.com/casey/just
# docs ─ direnv (env loader):    https://direnv.net
# docs ─ gitleaks (secret scan): https://github.com/gitleaks/gitleaks
brew install mise docker git just direnv gitleaks
# docs ─ Infisical CLI:          https://infisical.com/docs/cli/overview
# docs ─ 1Password CLI:          https://developer.1password.com/docs/cli/get-started/
brew install infisical/get-cli/infisical   # or: brew install 1password-cli

# Verify
mise --version && docker --version && just --version
direnv --version && gitleaks version && infisical --version`,
        detail: "These seven tools are the full prerequisite set. mise manages every runtime version, Docker runs the AI infrastructure, gitleaks blocks secret commits, direnv auto-loads env vars per directory, and Infisical (or 1Password) is the secret store. Install all before touching anything else.",
        troubleshooting: [
          { err: "brew: command not found", fix: "Install Homebrew first: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" },
          { err: "Docker Desktop not starting", fix: "Make sure virtualisation is enabled in BIOS, or use OrbStack (brew install orbstack) as a faster alternative on macOS" },
          { err: "infisical: command not found after brew install", fix: "Run: brew link infisical. If still missing: brew reinstall infisical/get-cli/infisical" },
        ],
      },
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Configure mise — pin Java, Maven, Kotlin globally",
        time: "~5 min",
        code: `# docs ─ mise shell activation: https://mise.jdx.dev/getting-started.html#shell-setup
# docs ─ mise global config:    https://mise.jdx.dev/configuration.html
# Activate mise in your shell
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# Install global runtimes
mise use --global java@25.0.2
mise use --global maven@3.9.12
mise use --global kotlin@2.3.10

# Verify
mise list
java -version   # → 25.x
mvn -version    # → 3.9.x
kotlin -version # → 2.x`,
        detail: "mise pins every runtime to an exact version in ~/.config/mise/config.toml. All subagents and CI pipelines that run mise install will get an identical environment — no 'works on my machine'. Bash users: replace zsh with bash in the echo command.",
        troubleshooting: [
          { err: "mise: command not found after brew install", fix: "Close and reopen terminal, or run: source ~/.zshrc" },
          { err: "java -version shows wrong version after mise install", fix: "Run: mise activate && cd . (triggers re-activation). Check ~/.zshrc has the eval line." },
        ],
      },
      {
        tool: "Infisical / 1Password",
        icon: "✦",
        action: "Store API keys and infra secrets in your secret manager",
        time: "~10 min",
        code: `# docs ─ Infisical CLI commands: https://infisical.com/docs/cli/commands
# docs ─ Infisical secrets:     https://infisical.com/docs/cli/commands/secrets
# Infisical (recommended)
infisical login
infisical init   # select your org → AI4Dev project

# Store all required secrets
infisical secrets set OPENAI_API_KEY="sk-..."
infisical secrets set ANTHROPIC_API_KEY="sk-ant-..."
infisical secrets set GEMINI_API_KEY="..."
infisical secrets set NEXTAUTH_SECRET="$(openssl rand -hex 32)"
infisical secrets set ENCRYPTION_KEY="$(openssl rand -hex 32)"
infisical secrets set LANGFUSE_USER_PASSWORD="your-password"
infisical secrets set LITELLM_MASTER_KEY="sk-local-$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Optional: randomise infra passwords (do this once)
infisical secrets set POSTGRES_PASSWORD="$(openssl rand -hex 16)"
infisical secrets set CLICKHOUSE_PASSWORD="$(openssl rand -hex 16)"
infisical secrets set REDIS_AUTH="$(openssl rand -hex 16)"
infisical secrets set MINIO_ROOT_PASSWORD="$(openssl rand -hex 16)"

# Verify
infisical secrets get OPENAI_API_KEY`,
        detail: "Secrets never live in .env files on disk. Infisical stores them encrypted in its cloud vault and injects them into the shell at runtime via the .envrc eval command in the next step. If your org already uses 1Password, run: op run --env-file=.env.tpl -- <command> instead.",
        troubleshooting: [
          { err: "infisical login: ECONNREFUSED", fix: "Check network/VPN. Infisical cloud is at app.infisical.com — ensure it's reachable." },
          { err: "infisical secrets set: project not initialised", fix: "Run: infisical init in ~/.ai/ to bind the directory to your project." },
        ],
      },
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Create ~/.ai/ — global AI infrastructure directory",
        time: "~5 min",
        code: `mkdir -p ~/.ai/{config,prompts/templates,scripts,data}
cd ~/.ai

# Create .envrc — loads secrets from Infisical, sets env vars
cat > .envrc << 'EOF'
# Load all secrets from Infisical into the shell environment
eval "$(infisical export --format=dotenv-export)"

# LiteLLM
export LITELLM_MASTER_KEY="sk-local-$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Database URLs (docker service names as hostnames)
export DATABASE_URL="postgresql://postgres:\${POSTGRES_PASSWORD:-postgres}@postgres:5432/postgres"
export CLICKHOUSE_MIGRATION_URL="clickhouse://clickhouse:9000"
export CLICKHOUSE_URL="http://clickhouse:8123"

# Langfuse & OTEL
export LANGFUSE_HOST="http://langfuse-web:3000"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
EOF

# Install direnv shell hook if not done yet
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
direnv allow ~/.ai

# Verify secrets are loading
echo $POSTGRES_PASSWORD   # → should print the value from Infisical`,
        detail: "~/.ai/ is the single home for all AI infrastructure. It lives outside any project repo so it's shared across all your courses and side projects. The .envrc is never committed — it's a runtime loader, not a secret store. direnv auto-runs it every time you cd into ~/.ai/.",
        troubleshooting: [
          { err: "direnv: error loading .envrc: exit status 1", fix: "Run the .envrc manually to see the real error: bash -x ~/.ai/.envrc" },
          { err: "$POSTGRES_PASSWORD is empty after direnv allow", fix: "Ensure infisical is authenticated: infisical login. Then: direnv reload" },
        ],
      },
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Install Docker Compose stack (LiteLLM · Langfuse · OTEL · Postgres · ClickHouse · Redis · MinIO)",
        time: "~30 min",
        code: `cd ~/.ai

# docker-compose.yaml contains all 8 services.
# Full file available in the course repo or Module 0 Notion page.
# Key services and ports:
#
# docs ─ LiteLLM proxy:    https://docs.litellm.ai/docs/proxy/quick_start
# docs ─ Langfuse self-host: https://langfuse.com/docs/deployment/self-host
# docs ─ OTEL Collector:     https://opentelemetry.io/docs/collector/
#   litellm       :4000   — model router + cost tracking
#   langfuse-web  :3000   — observability UI
#   langfuse-worker:3030  — async trace processor
#   otel-collector:4317/4318 — telemetry ingest
#   postgres      :5432   — Langfuse metadata
#   clickhouse    :8123   — analytics timeseries
#   redis         :6379   — job queues
#   minio         :9090   — S3-compatible object storage

# Copy configs from course repo, then start:
docker compose up -d

# Wait for all services to become healthy (~60s)
docker compose ps   # all should show "Up (healthy)"

# Quick smoke test
curl -s http://localhost:4000/health | jq .
open http://localhost:3000  # Langfuse UI`,
        detail: "The full docker-compose.yaml with all environment variable wiring is provided in the course repo under infra/docker-compose.yaml. Copy it to ~/.ai/ before running. First startup takes longer (~5 min) because ClickHouse runs migrations and MinIO creates the langfuse bucket. Subsequent starts are ~10 seconds.",
        troubleshooting: [
          { err: "langfuse-web: unhealthy after 2 min", fix: "Postgres or ClickHouse may still be migrating. Run: docker compose logs langfuse-web | tail -30. Wait another 60s and retry docker compose ps." },
          { err: "port 4000 already in use", fix: "Another service is on that port. Run: lsof -i :4000 to find it. Change LiteLLM's port in docker-compose.yaml: '4001:4000' and update LITELLM_URL in your Justfile." },
          { err: "minio: unhealthy", fix: "MinIO needs the langfuse bucket pre-created. The entrypoint command does this automatically. If it fails: docker compose restart minio" },
          { err: "clickhouse: permission denied on /var/lib/clickhouse", fix: "ClickHouse runs as uid 101. The compose file sets user: 101:101. If the data volume was created by root first, run: docker compose down -v then docker compose up -d" },
        ],
      },
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Configure LiteLLM model routing (~/.ai/config/litellm.yaml)",
        time: "~10 min",
        code: `# docs ─ LiteLLM proxy config:   https://docs.litellm.ai/docs/proxy/configs
# docs ─ LiteLLM model routing:  https://docs.litellm.ai/docs/proxy/load_balancing
# docs ─ LiteLLM virtual keys:   https://docs.litellm.ai/docs/proxy/virtual_keys
# litellm.yaml assigns model roles (writer, reviewer, architect, tester)
# and routes each to the right provider + temperature.
# Full file in course repo under infra/config/litellm.yaml. Key structure:

model_list:
  - model_name: writer        # creative, contextual
    litellm_params:
      model: claude-sonnet-4-20250514
      api_key: os.environ/ANTHROPIC_API_KEY
      temperature: 0.3

  - model_name: reviewer      # analytical, critical
    litellm_params:
      model: gpt-4-turbo
      api_key: os.environ/OPENAI_API_KEY
      temperature: 0.1

  - model_name: architect     # reasoning, documentation
    litellm_params:
      model: gemini/gemini-2.0-flash-thinking-exp
      api_key: os.environ/GEMINI_API_KEY
      temperature: 0.2

  - model_name: tester        # edge cases, coverage
    litellm_params:
      model: gpt-4-turbo
      api_key: os.environ/OPENAI_API_KEY
      temperature: 0.4

  - model_name: committer     # fast, cheap, commit messages
    litellm_params:
      model: gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
      temperature: 0.1

litellm_settings:
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]
  num_retries: 2
  max_budget: 100   # USD/month hard cap

# Reload LiteLLM after editing
docker compose restart litellm`,
        detail: "Role-based routing is the key architectural decision here: callers use model: writer/reviewer/architect rather than hardcoding model names. This lets you swap underlying models without touching application code. The Langfuse success/failure callbacks ensure every request is traced regardless of provider.",
        troubleshooting: [
          { err: "litellm: model 'writer' not found", fix: "Check litellm.yaml is mounted correctly in docker-compose.yaml volumes section. Verify path: ~/.ai/config/litellm.yaml exists." },
          { err: "litellm: APIConnectionError for anthropic", fix: "Run: docker compose exec litellm env | grep ANTHROPIC — if blank, the secret isn't propagating. Check .envrc exports ANTHROPIC_API_KEY and direnv allow was run." },
        ],
      },
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Install the ai CLI helper script and verify full stack",
        time: "~5 min",
        code: `# Copy ai script from course repo to ~/.ai/scripts/ai
# (full source in infra/scripts/ai)
chmod +x ~/.ai/scripts/ai
echo 'export PATH="$HOME/.ai/scripts:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify everything works
ai status          # → all services ✅
ai test            # → LiteLLM returns "Hello from AI4Dev!"
ai cost            # → shows $0.00 (no usage yet)

# Open Langfuse dashboard
open http://localhost:3000
# Login: matteo.codogno@welld.ch / <LANGFUSE_USER_PASSWORD from Infisical>`,
        detail: "The ai CLI wraps docker compose with friendly verbs: ai start / stop / restart / logs / test / cost / reset. It's the daily driver for infrastructure management. After ai test you should see a trace appear in Langfuse — that's the first end-to-end proof that LiteLLM → OTEL → Langfuse is working.",
        troubleshooting: [
          { err: "ai: command not found", fix: "Ensure ~/.ai/scripts is in PATH: echo $PATH | tr ':' '\\n' | grep ai. If not there: source ~/.zshrc" },
          { err: "ai test: curl returns 401 Unauthorized", fix: "LITELLM_MASTER_KEY mismatch. The key in .envrc must match what LiteLLM was started with. Run: docker compose restart litellm after fixing .envrc." },
          { err: "No traces in Langfuse after ai test", fix: "Check OTEL collector: docker compose logs otel-collector | tail -20. Verify litellm.yaml has success_callback: ['langfuse'] and Langfuse keys are set in the litellm service env." },
        ],
      },
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Setup gitleaks pre-commit hook — block secrets from ever reaching Git",
        time: "~5 min",
        code: `# docs ─ gitleaks config:         https://github.com/gitleaks/gitleaks#configuration
# docs ─ git templatedir (hooks): https://git-scm.com/docs/git-init#_template_directory
# Global gitleaks config
mkdir -p ~/.config/gitleaks
# Copy gitleaks.toml from course repo → ~/.config/gitleaks/gitleaks.toml
# (covers Infisical tokens, LiteLLM keys, Langfuse keys + allow patterns)

# Global pre-commit hook
mkdir -p ~/.git-template/hooks
cat > ~/.git-template/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Scanning for secrets with gitleaks..."
if ! gitleaks protect --staged --config="$HOME/.config/gitleaks/gitleaks.toml" --verbose; then
    echo "❌ COMMIT REJECTED: secrets detected!"
    echo "   Move secret to .envrc → Infisical, then retry."
    exit 1
fi
echo "✅ No secrets detected"
EOF

chmod +x ~/.git-template/hooks/pre-commit
git config --global init.templatedir ~/.git-template

# For repos that already exist, copy the hook manually:
cp ~/.git-template/hooks/pre-commit ~/projects/tinder-for-dogs/.git/hooks/

# Scan full history once (first-time audit)
cd ~/projects/tinder-for-dogs
gitleaks detect --source . --report-path gitleaks-report.json
# Add gitleaks-report.json to .gitignore`,
        detail: "gitleaks as a pre-commit hook is the last line of defense before a secret hits the remote. The global template means every new git init automatically gets the hook — no manual setup per project. The detect scan on full history catches anything that snuck in before the hook was installed.",
        troubleshooting: [
          { err: "gitleaks: false positive on a placeholder in README", fix: "Add to .gitleaksignore: echo 'README.md:line_number' >> .gitleaksignore. Or use the allowlist.regexes in gitleaks.toml for patterns like sk-xxx-placeholder." },
          { err: "pre-commit hook not running after git config --global init.templatedir", fix: "The template only applies to new repos. For existing repos, manually: cp ~/.git-template/hooks/pre-commit .git/hooks/" },
        ],
      },
    ],
  },
  {
    id: "phase1",
    number: "01",
    label: "BOOTSTRAP",
    color: "#64FFDA",
    bg: "rgba(100,255,218,0.07)",
    border: "rgba(100,255,218,0.3)",
    steps: [
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Install Claude Code globally",
        time: "~1 min",
        troubleshooting: [
          { err: `node: command not found`, fix: `Node.js 22+ is required. Run \`node --version\` to check. Install via \`mise install node@22\` or from nodejs.org.` },
          { err: `EACCES permission denied`, fix: `Don't use sudo. Fix npm permissions: \`mkdir ~/.npm-global && npm config set prefix '~/.npm-global'\` then add \`~/.npm-global/bin\` to your PATH.` },
          { err: `claude: command not found after install`, fix: `Your PATH doesn't include npm globals. Add \`export PATH="$HOME/.npm-global/bin:$PATH"\` to \`~/.zshrc\` or \`~/.bashrc\`, then \`source\` it.` },
        ],
        code: "# docs ─ Claude Code overview: https://docs.anthropic.com/en/docs/claude-code/overview\n# docs ─ Claude Code quickstart: https://docs.anthropic.com/en/docs/claude-code/quickstart\n# npm pkg:                       https://www.npmjs.com/package/@anthropic-ai/claude-code\nnpm install -g @anthropic-ai/claude-code",
        detail: "Claude Code CLI lands on your Mac. This is the orchestration brain for everything that follows.",
      },
      {
        tool: "Claude Code CLI",
        icon: "◈",
        action: "Add MCP servers",
        time: "~3 min",
        troubleshooting: [
          { err: `MCP server fails to start`, fix: `Run \`npx @modelcontextprotocol/server-sequential-thinking\` manually to see the raw error. Usually a missing Node version or network issue fetching the package.` },
          { err: `GitHub MCP: 401 Unauthorized`, fix: `Your token is missing the required scopes. Re-generate it with Contents, Issues, Pull requests, and Metadata permissions enabled.` },
          { err: `GitHub MCP: URL not reachable`, fix: `The Copilot MCP endpoint requires a GitHub account with Copilot access. Verify at github.com/settings/copilot.` },
          { err: `claude mcp list shows no servers`, fix: `MCP config is stored per-project in \`.claude/settings.json\`. Run the \`claude mcp add\` commands from inside the project root.` },
        ],
        code: `# docs ─ Claude Code MCP guide:     https://docs.anthropic.com/en/docs/claude-code/mcp
# docs ─ Sequential Thinking MCP:   https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
# docs ─ Playwright MCP:             https://github.com/microsoft/playwright-mcp
# docs ─ GitHub MCP (official):      https://github.com/github/github-mcp-server
claude mcp add sequential-thinking \\
  -- npx @modelcontextprotocol/server-sequential-thinking

claude mcp add playwright \\
  -- npx @playwright/mcp

# GitHub MCP (official Copilot endpoint — HTTP transport):
# First create a GitHub Personal Access Token with these permissions:
#
# Repository permissions (read/write unless noted):
#   Contents          ← read/write files, commits, branches
#   Issues            ← create, update, close issues
#   Pull requests     ← open, review, merge PRs
#   Metadata          ← read repo info (required)
#   Actions           ← trigger/read workflow runs (optional)
#   Checks            ← read CI status on PRs (optional)
#
# Then add the MCP server:
claude mcp add-json github '{
  "type": "http",
  "url": "https://api.githubcopilot.com/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_GITHUB_TOKEN"
  }
}'

# Verify all three servers are registered:
claude mcp list`,
        detail: "stdio is the default transport so no --transport flag needed for sequential-thinking and playwright. GitHub now uses the official Copilot MCP endpoint over HTTP — the deprecated @modelcontextprotocol/server-github package is replaced by this. The token needs Contents + Issues + Pull requests + Metadata at minimum; Actions and Checks are optional but useful for CI feedback in the controlled execution path.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Add prd-writer skill to the project",
        time: "~2 min",
        troubleshooting: [
          { err: `skill not triggered`, fix: `The skill file must be at exactly \`.claude/skills/prd-writer/SKILL.md\`. Check for typos with \`ls .claude/skills/prd-writer/\`.` },
          { err: `heredoc ends prematurely`, fix: `If copy-pasting, ensure the closing \`SKILLEOF\` is on its own line with no leading spaces.` },
        ],
        code: `mkdir -p .claude/skills/prd-writer

cat > .claude/skills/prd-writer/SKILL.md << 'SKILLEOF'
---
name: prd-writer
description: >
  Full product discovery-to-PRD pipeline. Use this skill whenever a user wants
  to turn a raw product idea into a complete Product Requirements Document (PRD).
  Triggers include: "write a PRD", "generate a PRD", "create product requirements",
  "help me define my product", "turn my idea into a spec", or any situation where a
  product concept needs to be systematically explored and documented. The skill runs
  a Socratic discovery interview to gather all required inputs, then synthesises them
  — including auto-derived Non-Functional Requirements — into a structured PRD.md file.
  Use proactively whenever a product idea exists but has no formal specification yet,
  even if the user didn't explicitly say "PRD".
---

# PRD Writer

A two-phase skill:

1. **Discovery** — Socratic interview that surfaces the full product context.
2. **Synthesis** — Compile interview outputs + auto-extracted NFRs into PRD.md.

---

## Phase 1 — Discovery Interview

### Core behavior
- **One question per turn.** Never stack questions.
- **Ask only — never advise.** No architecture recommendations, no solution hints.
- **Build on answers.** Each question connects to what was just shared.
- **Explore "what/why" before "how."**
- If the user asks for advice: *"I'm here to help you think through your product by asking questions. Let me ask you…"* — then continue.

### Kick-off
- **Message contains a product idea** → start immediately with a foundational question about the problem space or target users.
- **No idea yet** → ask: *"I'd love to help you explore your product idea! What are you thinking of building?"*

### Discovery areas — cover all eight
Track which areas have been addressed and steer toward uncovered ones.

| # | Area | Key questions to resolve |
|---|---|---|
| 1 | **Problem Space** | What problem? How severe? How do people solve it today? |
| 2 | **Users & Stakeholders** | Who uses this? Multiple user types? Key pain points? |
| 3 | **Value Proposition** | What unique value? How is it different from alternatives? |
| 4 | **Features & Functionality** | Essential capabilities? What must users be able to do? |
| 5 | **User Workflows** | Day-to-day interactions? Main user journeys? |
| 6 | **Success Metrics** | How is success measured? Expected outcomes? |
| 7 | **Constraints & Requirements** | Technical / business / regulatory limits? Must-haves vs. nice-to-haves? |
| 8 | **Scope & Priorities** | What's in v1? What's deferred? |

### Question cadence
- **Turn 1** — Foundational: problem space or target users.
- **Turns 2–5** — Deepen what was just shared.
- **Turns 6+** — Branch into uncovered areas, always connecting to prior answers.

### Ending the interview
After all eight areas have been touched (or the user signals they're done), say:

> *"Great — I think I have a solid picture of your product. Ready for me to compile the PRD?"*

Wait for explicit confirmation before moving to Phase 2.

---

## Phase 2 — PRD Synthesis

### Step 1 — Internal NFR extraction (silent)
Before writing, perform three passes over everything learned in Phase 1:

**Pass 1 — Explicit NFRs:** Statements that directly express a quality constraint
(e.g., "must respond in under 2 seconds", "GDPR compliant", "99.9% uptime").

**Pass 2 — Implicit NFRs:** Functional statements carrying hidden quality requirements:
- "users share their location" → Privacy + Security
- "launch in multiple markets simultaneously" → Scalability + Availability
- "AI scores compatibility" → Performance + Observability
- "stores health/financial records" → Compliance + Security

**Pass 3 — Unaddressed NFRs:** Flag categories with no coverage that are expected
given the domain and scale. Mark these as \`unaddressed\`.

NFR categories: Performance · Scalability · Security · Availability · Reliability ·
Compliance · Observability · Usability · Maintainability · Portability

Priority rules:
- **P0** — Cannot go to production without this.
- **P1** — Must be addressed before first public release.
- **P2** — Should be addressed before scale or regulated use.

Quality rules:
- Every NFR must have a **measurable** acceptance criterion with a concrete threshold
  (number, percentage, time unit, standard name, or boolean condition).
- "Should be fast" or "must be secure" are NOT valid acceptance criteria.
- If the product involves user data, location, health, or financial info →
  Security and Compliance are always at least P1.

### Step 2 — Write PRD.md
Produce a single Markdown document with this exact structure:

\`\`\`markdown
# PRD — [Product Name]

> **Version:** 1.0 · **Status:** Draft · **Date:** [today]

---

## Problem Statement
[2–4 sentences: the problem, who has it, and why it matters now.]

---

## Target Users & Personas

### Persona 1 — [Name / Role]
- **Profile:** ...
- **Pain points:** ...
- **Goals:** ...

### Persona 2 — [Name / Role]  *(if applicable)*
...

---

## Value Proposition
[2–3 sentences: the unique value this product delivers and what makes it
different from existing alternatives.]

---

## Feature List

### F-01  [Feature Name]  · Priority: P0
**Description:** ...
**Personas served:** ...
**User story:** As a [persona], I want [capability] so that [outcome].
**Success metrics:** ...
**Constraints / notes:** ...

### F-02  [Feature Name]  · Priority: P0
...

### F-03  [Feature Name]  · Priority: P1
...

*(Continue for all features, ordered P0 → P1 → P2.)*

---

## Non-Functional Requirements

| ID | Category | Requirement | Acceptance Criterion | Priority | Source |
|---|---|---|---|---|---|
| NFR-01 | Performance | ... | ... | P0 | implicit |
| NFR-02 | Security | ... | ... | P0 | implicit |

### Unaddressed Categories
The following NFR categories have no coverage in the current spec:
- [Category] — [brief note on why it may matter]

### Open Questions
- **Q1 [Category]:** [question]
  *Impact:* [what decision depends on this answer]

---

## Out of Scope — v1
- [Item deferred to a later iteration]
- ...

---

## Open Questions
- [Any open strategic or product question from the discovery conversation]
- ...
\`\`\`

### Step 3 — Output
- Save the document as \`PRD.md\` in the output directory.
- Present it to the user via \`present_files\`.
- Briefly summarise what was produced (2–3 sentences max) — the user can read the doc for details.

---

## Tone
Warm, curious, professional throughout the interview.
Direct and structured in the synthesis output.

SKILLEOF

git add .claude/skills/
git commit -m "chore(dx): add prd-writer skill for product discovery"

# Usage — in any Claude.ai conversation:
# Just describe your product idea or say "I want to write a PRD"
# Claude picks up the skill automatically and starts the interview.
#
# Or trigger it explicitly:
# "Use the prd-writer skill to help me define my product."`,
        detail: "The full prd-writer skill is embedded above — copy the cat block into your terminal to create the file, or paste the SKILL.md content directly. Once committed, every team member gets the same product discovery process. The skill runs in Claude.ai, produces PRD.md, which is committed to the project root before cc-sdd spec work begins.",
      },
      {
        tool: "Claude Code CLI",
        icon: "◈",
        action: "Install cc-sdd (spec workflow)",
        time: "~1 min",
        troubleshooting: [
          { err: `npx hangs or times out`, fix: `Likely a registry connectivity issue. Try \`npm ping registry.npmjs.org\`. If behind a proxy, set \`npm config set proxy http://your-proxy\`.` },
          { err: `/kiro: commands don't appear in Claude Code`, fix: `Run \`npx cc-sdd@latest --claude\` from the project root, not a parent directory. The \`.claude/commands/kiro/\` folder must be inside your project.` },
          { err: `Permission denied writing .claude/`, fix: `The current user doesn't own the directory. Run \`sudo chown -R $(whoami) .claude/\` to fix ownership.` },
        ],
        code: "# docs ─ cc-sdd GitHub: https://github.com/gotalab/cc-sdd\n# docs ─ cc-sdd npm:    https://www.npmjs.com/package/cc-sdd\n# docs ─ command ref:   https://github.com/gotalab/cc-sdd#command-reference\ncd your-project && npx cc-sdd@latest --claude",
        detail: "Drops spec-related slash commands into .claude/commands/: /kiro:spec-init, /kiro:spec-requirements, /kiro:spec-design, /kiro:spec-tasks. The /kiro:spec-stories command is added manually in Phase 01 — it's a custom command you version-control with your repo.",
      },
      {
        tool: "Claude Code CLI",
        icon: "◈",
        action: "Configure approval gates in CLAUDE.md",
        time: "~5 min",
        troubleshooting: [
          { err: `Claude ignores CLAUDE.md rules`, fix: `CLAUDE.md must be in the project root (same level as \`.git/\`). Confirm with \`ls CLAUDE.md\`. Sub-directory CLAUDE.md files are not loaded automatically.` },
          { err: `Rules conflict with cc-sdd built-in commands`, fix: `cc-sdd's built-in \`/kiro:\` commands run their own hardcoded prompts and ignore CLAUDE.md. Override by creating a matching file in \`.claude/commands/kiro/\`.` },
        ],
        code: `# docs ─ Claude Code memory / CLAUDE.md: https://docs.anthropic.com/en/docs/claude-code/memory
# docs ─ Conventional Commits:            https://www.conventionalcommits.org/en/v1.0.0/
# Add to CLAUDE.md in your project root:
## Execution rules
- Before implementing any task: show a plan and wait for explicit approval
- After each task: stop, show git diff summary + test results, wait for GO/NO
- Never move to the next task without a human "go ahead"
- If tests fail: surface the failure, propose a fix, wait for approval before applying

## GitHub Issues sync rules
- When tasks.md is finalized: create one GitHub Issue per task
  - Title: task title from tasks.md
  - Body: acceptance criteria + link to .kiro/specs/<feature>/tasks.md
  - Label: "spec-task", milestone = feature name
  - Save the issue number back into tasks.md as a comment: <!-- gh:#42 -->
- When starting a task: add label "in-progress" to its issue
- When a task checkbox is ticked - [x]: close the issue with "Closes #N" in the commit footer
- Never close an issue without the corresponding checkbox being ticked first
- Never tick a checkbox without closing the issue (keep them atomic)

## Commit message rules (Conventional Commits)
- Format: <type>(<scope>): <description>
- Types: feat | fix | docs | style | refactor | test | chore | perf | ci
- scope = task ID or module name, e.g. feat(task-7): or fix(auth):
- Description: imperative, lowercase, no period, max 72 chars
- Breaking changes: add BREAKING CHANGE: in footer
- Examples:
    feat(stripe): add webhook signature validation
    fix(auth): handle 401 on token refresh
    test(pdf): add export edge case coverage
    chore(deps): upgrade stripe-node to v14
- NEVER use generic messages like "fix bug" or "update code"

## Pre-commit checklist (run in order, block commit if any fail)
# Note: linting runs automatically via git pre-commit hook
1. mise run test        ← all tests must pass
2. Update README.md     ← reflect any changed public API, commands, or config
3. git add -A && git commit ...

## README rules
- README.md is generated from design.md at the start of Phase 03
- Update README.md before every commit — this is mandatory, not optional
- Update only the sections affected by that task
- Sections to maintain: Overview, Prerequisites, Installation, Usage,
  Configuration, API/CLI reference, Architecture, Contributing
- Never remove a section — add a "Coming soon" note if not yet implemented
## Steering update (run after every task)
- Run /kiro:steering after each completed task
- Capture: new patterns, naming conventions, or tech decisions made during impl
- Never modify CLAUDE.md autonomously — propose changes to the human instead`,
        detail: "CLAUDE.md is read at every session start. Lint runs automatically via the git pre-commit hook — Claude never needs to call it manually. The README update rule applies to every commit in every execution path: no commit lands without a README that reflects what was just built. Steering is updated after each task so project memory stays sharp across sessions — but CLAUDE.md itself is never touched by Claude autonomously.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "rules/ears-format.md — interview + NFR rules",
        time: "~3 min",
        troubleshooting: [
          { err: `Claude asks multiple questions at once`, fix: `The one-question-per-turn rule is in \`rules/ears-format.md\`. Check the file was committed and Claude has loaded the project context (run \`/kiro:steering\` to refresh).` },
          { err: `Interview output is vague`, fix: `Seed Claude with your domain context: 'You are interviewing a PM for a fintech SaaS'. More domain context → sharper questions.` },
        ],
        code: `# ears-format.md already exists after cc-sdd install.
# Append the full discovery interviewer behaviour and analysis rules:

cat >> .kiro/settings/rules/ears-format.md << 'EOF'

---

# Product Discovery Interviewer

You are an expert software architect specializing in **product discovery**.
Your role is to help users deeply understand their own feature through
systematic, Socratic questioning.

## Core Behavior

- **Ask questions ONLY.** Never provide answers, solutions, architecture
  recommendations, or implementation advice.
- **One question at a time.** Never ask multiple questions in a single turn.
- **Build on previous answers.** Each question should connect to what the
  user just shared.
- **Explore "what" and "why" before "how".** Don't jump to implementation.
- **Be conversational and encouraging.** Make the user feel heard and supported.

If the user asks for advice or answers, respond:
  "I'm here to help you think through your product by asking questions.
  Let me ask you…" — then continue with a relevant question.

## Starting the Conversation

- If the user's first message contains a feature idea, jump straight into
  discovery with one foundational question about the problem space or
  target users.
- If it does NOT contain a feature idea, ask:
  "I'd love to help you explore this feature! What are you thinking of building?"

## Discovery Areas

Systematically cover all of these. Track what has been explored and always
move toward uncovered areas:

1. **Problem Space** — What problem is being solved? How severe is it?
   How do people currently handle it?
2. **Users & Stakeholders** — Who will use this? Characteristics, needs,
   pain points? Multiple user types?
3. **Core Value Proposition** — What unique value does this provide?
   What makes it different from alternatives?
4. **Key Features & Functionality** — What are the essential capabilities?
   What must users be able to do?
5. **User Workflows** — How will users interact with the product day-to-day?
   What are the main journeys?
6. **Success Metrics** — How will success be measured? What outcomes expected?
7. **Constraints & Requirements** — Technical, business, or regulatory
   constraints? Must-haves vs. nice-to-haves?
8. **Scope & Priorities** — What's in scope for v1? What comes later?

## Question Cadence

- **Turn 1**: One foundational question about the problem space or target users.
- **Turns 2–5**: Follow-up questions deepening what's been shared.
- **Turns 6+**: Branch into unexplored areas, connecting to prior answers.

When all 8 areas are covered, say:
  "I think we have a solid foundation. Here's a summary of what we've
  explored: [summary]. Running analysis before writing requirements.md."

## Tone

Warm, curious, professional. Think of yourself as a thoughtful colleague
in a discovery workshop — someone who genuinely wants to understand
before suggesting anything.

---

## Pre-write Analysis (run after interview, before writing)

### Ambiguity Report
Flag every statement that is vague, contradictory, or open to multiple
interpretations. For each:
- Quote the original statement
- Explain why it is ambiguous
- Propose a clarified rewrite
- Mark as BLOCKING (must resolve before design) or NON-BLOCKING

Present BLOCKING items to the user and wait for resolution.
Only proceed once all BLOCKING items are resolved.

### NFR Extraction
Extract all non-functional requirements — explicit or implied.
Embed in requirements.md under ## Non-Functional Requirements:
- Performance   (latency, throughput, SLA targets)
- Security      (auth, encryption, compliance, data residency)
- Scalability   (load, concurrency, storage growth)
- Reliability   (uptime, RTO, RPO, failover)
- Observability (logging, tracing, alerting)
- Usability     (accessibility, browser/device support)
- Constraints   (tech stack mandates, budget, team skills)
For each NFR: source area, acceptance threshold, priority (P0/P1/P2).

### Open Questions
List every decision that cannot be made from current answers.
Embed in requirements.md under ## Open Questions:
- Q: [question]
  Impact: [what gets blocked until answered]
  Owner: [product / tech / legal]
EOF

git add .kiro/settings/rules/ears-format.md
git commit -m "chore(dx): extend ears-format with discovery interview + ambiguity + NFR rules"`,
        detail: "Rules files control how the agent behaves — templates only control what it writes. The full discovery interviewer prompt goes here so spec-requirements actually asks questions before writing. Appending preserves cc-sdd's existing EARS format rules and layers the interview behaviour, ambiguity detection, and NFR extraction on top.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "templates/requirements.md — NFR + open questions",
        time: "~2 min",
        troubleshooting: [
          { err: `NFR table is empty after generation`, fix: `The NFR extraction pass runs from \`rules/ears-format.md\`. If it's missing or misconfigured, the table stays blank. Check the file exists and re-run the interview.` },
          { err: `Open questions not populated`, fix: `Open questions are only added if the interview reveals ambiguities. Try prompting: 'What decisions are still unresolved based on my answers?'` },
        ],
        code: `# requirements.md template already exists after cc-sdd install.
# Append the NFR tables and open questions section structure.
# The interview behaviour lives in ears-format.md (rules) — not here.

cat >> .kiro/settings/templates/specs/requirements.md << 'EOF'

## Non-Functional Requirements

### Performance
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

### Security
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

### Scalability
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

### Reliability
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

### Observability
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

### Usability
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

### Constraints
| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
|        |             |           |          |            |

## Open Questions

| # | Question | Impact | Owner | Status |
|---|----------|--------|-------|--------|
|   |          |        |       | Open   |
EOF

git add .kiro/settings/templates/specs/requirements.md
git commit -m "chore(dx): extend requirements template with NFR and open questions sections"`,
        detail: "Templates define output structure — the agent fills them in. Interview behaviour is controlled by ears-format.md (rules), not here. These sections ensure every requirements.md has a consistent NFR table and open questions log regardless of who runs the command.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Extend rules/design-principles.md",
        time: "~2 min",
        troubleshooting: [
          { err: `Design agent ignores ADR context`, fix: `Verify \`rules/design-principles.md\` was committed and that Claude loaded it. Run \`/kiro:steering\` to force a context refresh before running \`/kiro:spec-design\`.` },
          { err: `Corner cases section is empty`, fix: `Corner cases require design.md to exist. Run \`/kiro:spec-design\` first, then check this section is generated.` },
        ],
        code: `# Append to the file cc-sdd already created — never overwrites it.
# Adds behavioral rules: architecture evaluation, ADR decision context,
# corner case taxonomy.
# ADR format instructions  → templates/specs/research.md
# Sequence Diagram scaffold → templates/specs/design.md

cat >> .kiro/settings/rules/design-principles.md << 'EOF'

---

## Architecture Evaluation
Before proposing a design, evaluate at least 3 architectures that
could satisfy the same requirements:
- For each: list exactly 3 advantages and 3 disadvantages
  given the stated constraints — no generic trade-offs
- State which you recommend and why — be specific
- Do NOT recommend a pattern without explaining what it costs
- Every consequence must be measurable or observable
  (never write "increases complexity" without quantifying it)

## Architecture Decision Record
For the most significant architectural choice, produce an ADR.

### Decision context
- System: [name and brief description]
- Problem: [what architectural problem needs solving]
- Constraints: [team size, budget, performance targets, regulatory]
- Option chosen: [the decision made]
- Alternatives considered: [what else was evaluated]
- NFRs affected: [list relevant NFR IDs from requirements.md]

→ For the exact ADR output format, follow the template in:
  .kiro/settings/templates/specs/research.md  (## ADR Format section)

## Corner Cases
After the architecture is chosen, identify system-level corner cases
and include a ## Corner Cases section in design.md.
The full list of categories and output format is defined in:
  .kiro/settings/rules/design-discovery-full.md

→ For the Sequence Diagram scaffold, follow the template in:
  .kiro/settings/templates/specs/design.md  (## Sequence Diagram section)
EOF

git add .kiro/settings/rules/design-principles.md
git commit -m "chore(dx): extend design-principles with architecture eval, ADR context, corner cases"`,
        detail: "Appends to the file cc-sdd already created — never overwrites it. Behavioral rules only: how to evaluate architectures, what context to capture for ADRs, which corner case categories to cover. The exact output formats (ADR schema, Mermaid scaffold) live in the templates, keeping rules and format cleanly separated.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Extend rules/design-discovery-full.md",
        time: "~1 min",
        troubleshooting: [
          { err: `Full discovery outputs don't match expected format`, fix: `Check that research.md template exists at \`.kiro/settings/templates/specs/research.md\`. The pointer in this rule file is only effective if the template file is present.` },
        ],
        code: `# Append to the existing cc-sdd file — do NOT overwrite.
# Adds a pointer to the output format requirements in research.md.
# cc-sdd's own discovery trigger logic stays intact.

cat >> .kiro/settings/rules/design-discovery-full.md << 'EOF'

---

## Corner Cases (Full — all 5 categories)
Write a ## Corner Cases section in design.md covering:

### Input boundary cases
- Empty, null, zero, negative, max-length, special characters
- Concurrent identical requests / malformed payloads

### State & timing edge cases
- Race conditions, partial failures mid-transaction
- Clock skew, DST transitions, out-of-order operations

### Integration failure modes
For every external dependency: slow / errors / unavailable scenarios.
Include cascade failure chains.

### Security edge cases
- Auth bypass, privilege escalation, injection vectors
- Token expiry during a long-running operation

### Data edge cases
- Existing data violating new constraints (migration risk)
- What breaks first at 10x current load?

For each case: scenario, expected behaviour, requirement coverage.
EOF

git add .kiro/settings/rules/design-discovery-full.md
git commit -m "chore(dx): extend design-discovery-full with corner cases output spec"`,
        detail: "A single pointer block appended to cc-sdd's existing file. This keeps cc-sdd's own trigger conditions and discovery workflow intact while directing the agent to the consolidated output format in templates/research.md.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Extend rules/design-discovery-light.md",
        time: "~1 min",
        troubleshooting: [
          { err: `Light discovery skips sequence diagram`, fix: `The pointer only works if research.md exists and contains the Light Discovery section. Verify with \`grep -n "Light Discovery" .kiro/settings/templates/specs/research.md\`.` },
        ],
        code: `# Append to the existing cc-sdd file — do NOT overwrite.
# Same append-only pattern as design-discovery-full.md.

cat >> .kiro/settings/rules/design-discovery-light.md << 'EOF'

---

## Sequence Diagram (Light)
Always generate docs/diagrams/[feature]-sequence.md.
Follow the Sequence Diagram scaffold in templates/design.md.
Include integration points with the existing system.

## Corner Cases (Light — focused)
Write a ## Corner Cases section in design.md covering only:

### Integration failure modes
For every new external dependency or integration point:
- What happens if it is slow / errors / unavailable?
- What is the fallback or degraded behaviour?

### Security edge cases
- Any new auth bypass or privilege escalation vectors?
- Token or session expiry during the extended operation?

Omit input boundary, state/timing, and data edge cases unless
full discovery has been triggered.

## Research Log (Light)
Append to docs/research/[feature]-research.md:
- New dependencies added with versions and rationale
- Integration risks and mitigations
- Any compatibility issues found
- References for technology choices
EOF

git add .kiro/settings/rules/design-discovery-light.md
git commit -m "chore(dx): extend design-discovery-light with sequence diagram, corner cases, research log"`,
        detail: "Same append-only pattern as design-discovery-full.md. cc-sdd's trigger logic (which features qualify for light vs. full discovery) remains untouched — only the output format pointer is added.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Extend templates/specs/research.md with ADR format",
        time: "~1 min",
        troubleshooting: [
          { err: `ADR format instructions not found by agent`, fix: `Verify the append landed: \`grep "# ADR Format" .kiro/settings/templates/specs/research.md\`. If missing, re-run the cat >> command.` },
          { err: `Agent writes discovery notes into design.md instead of research.md`, fix: `Ensure research.md exists in templates/specs/ and the pointer in design-principles.md is present. Re-run \`/kiro:steering\` to refresh agent context.` },
        ],
        code: `# Append to the file cc-sdd already created — never overwrites it.
# Adds the ADR format instructions referenced by design-principles.md.

cat >> .kiro/settings/templates/specs/research.md << 'EOF'

---

# ADR Format

When design-principles.md instructs you to produce an ADR,
write docs/adr/ADR-001-[decision-slug].md with this exact format:

- **Status**: Proposed
- **Context**: 2-3 sentences max — only facts that drove the decision
- **Decision**: 1 sentence for the choice + bullet points for implementation
- **Consequences**:
  - ✔ at least 3 — specific to this system, measurable or observable
  - ✘ at least 2 — specific to this system, measurable or observable
  - No generic trade-offs (never write "increases complexity" without quantifying)
- **Alternatives**: WHY each was rejected, not just that it was
- **References**: link to spec files and NFR IDs from requirements.md
EOF

mkdir -p docs/adr docs/diagrams docs/research
git add .kiro/settings/templates/specs/research.md docs/
git commit -m "chore(dx): extend research.md template with ADR format instructions"`,
        detail: "Appends to the research.md template cc-sdd already created — never overwrites it. The ADR Format section is the single source of truth for how ADRs should be written: design-principles.md references it by name, so both the rule and the format stay in sync without duplication.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "templates/design.md — ADR + corner cases + diagrams",
        time: "~3 min",
        troubleshooting: [
          { err: `design.md is generated without ADR section`, fix: `The ADR template is appended to \`templates/design.md\`. Check the file with \`cat templates/design.md\` — the ADR scaffold must be present before you run \`/kiro:spec-design\`.` },
        ],
        code: `# design.md template already exists after cc-sdd install.
# Append the section structure:

cat >> .kiro/settings/templates/specs/design.md << 'EOF'

## Architecture Options Considered

### Option 1: [name]
**Advantages:** (3 items, specific to stated constraints)
**Disadvantages:** (3 items, measurable or observable)

### Option 2: [name]
**Advantages:** (3 items, specific to stated constraints)
**Disadvantages:** (3 items, measurable or observable)

### Option 3: [name]
**Advantages:** (3 items, specific to stated constraints)
**Disadvantages:** (3 items, measurable or observable)

**Recommendation:** [chosen option] — [specific reason tied to constraints]

## Architecture Decision Record

See: docs/adr/ADR-001-[decision-slug].md

## Corner Cases

### Input boundary cases
<!-- empty, null, max-length, concurrent identical requests -->

### State & timing edge cases
<!-- race conditions, partial failures, clock skew -->

### Integration failure modes
<!-- per dependency: slow / error / unavailable -->

### Security edge cases
<!-- auth bypass, injection, token expiry mid-operation -->

### Data edge cases
<!-- migration risk, 10x load breaking point -->

## Sequence Diagram

<!-- Save to: docs/diagrams/[feature]-sequence.md -->

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API
    participant Service
    participant DB

    Client->>API: [primary request]
    API->>Service: [delegate call]
    Service->>DB: [data operation]
    DB-->>Service: [result]
    Service-->>API: [response]
    API-->>Client: [final response]

    Note over API,Service: async boundary — queue here if needed
\`\`\`

<!-- Rules:
     - Happy path only — one linear scenario
     - Mark every async boundary with a Note
     - Name participants using domain terms from CLAUDE.md
     - One diagram per feature; complex features may have one per sub-flow
-->
EOF

git add .kiro/settings/templates/specs/design.md
git commit -m "chore(dx): extend design template with architecture options + ADR + corner cases + diagram"`,
        detail: "The template enforces the output structure. With these sections present, the design agent must fill them in — it cannot produce a design.md that skips architecture comparison or corner cases because the template scaffolds them as required sections.",
      },
    ],
  },
  {
    id: "phase2",
    number: "02",
    label: "REQUIREMENTS · PRODUCT DISCOVERY",
    color: "#FFD166",
    bg: "rgba(255,209,102,0.07)",
    border: "rgba(255,209,102,0.3)",
    fork: "specTool",
    forkGroup: "ccsdd",
    forkLabel: "Best when: structured teams, PRD-driven process, deep audit trail. Full /kiro: pipeline.",
    steps: [
      {
        tool: "You → Claude.ai  ·  prd-writer skill",
        icon: "✦",
        action: "Run the prd-writer skill to generate PRD.md",
        time: "~20 min",
        troubleshooting: [
          { err: `Interview stops after one question`, fix: `Ensure the prd-writer SKILL.md includes the one-question-per-turn instruction. Check \`.claude/skills/prd-writer/SKILL.md\`.` },
          { err: `PRD.md output is missing NFRs`, fix: `The skill runs three silent passes at the end. If interrupted early, NFRs may be missing. Re-run from the analysis step: 'Skip the interview. Run only the NFR extraction on my answers.'` },
          { err: `PRD saved to wrong location`, fix: `Copy to \`.kiro/steering/prd.md\`, not the project root. cc-sdd reads the \`steering/\` folder automatically — a root PRD.md is invisible to it.` },
        ],
        code: `# Open Claude.ai — this is a product conversation, outside Claude Code.
# The prd-writer skill runs in two phases automatically:
#
# ── Phase 1: Discovery interview ──────────────────────────────────
# One question per turn. Claude covers 8 areas in order:
#
#   1. Problem Space    — what problem, how severe, how solved today?
#   2. Users & Personas — who uses it, multiple types, pain points?
#   3. Value Proposition — unique value, different from alternatives?
#   4. Features         — essential capabilities, what must users do?
#   5. User Workflows   — day-to-day interactions, main journeys?
#   6. Success Metrics  — how is success measured, expected outcomes?
#   7. Constraints      — technical/business/regulatory, must-haves?
#   8. Scope & Priorities — what's in v1? what's deferred?
#
# Claude never gives advice — only asks. When all 8 areas are covered:
# "Great — I think I have a solid picture. Ready to compile the PRD?"
# → Confirm, then Phase 2 runs automatically.
#
# ── Phase 2: PRD synthesis (silent NFR extraction first) ──────────
# Three internal passes before writing:
#   Pass 1 — Explicit NFRs from what you said
#   Pass 2 — Implicit NFRs derived from features
#             ("AI scores compatibility" → Performance + Observability)
#   Pass 3 — Unaddressed categories flagged with a note
#
# NFR acceptance criteria rules:
#   ✔ "API responds in < 200ms at p95"
#   ✘ "must be fast" — rejected, too vague
#
# ── Output: PRD.md ────────────────────────────────────────────────
# # PRD — [Product Name]
# ## Problem Statement
# ## Target Users & Personas
# ## Value Proposition
# ## Feature List          ← ordered P0 → P1 → P2
#   ### F-01  [name]  · Priority: P0
#     Description · Personas served · User story
#     Success metrics · Constraints
#   ### F-02  [name]  · Priority: P0
#   ### F-03  [name]  · Priority: P1
# ## Non-Functional Requirements
#   | ID | Category | Requirement | Acceptance Criterion | Priority | Source |
# ## Out of Scope — v1
# ## Open Questions
#
# Save directly to .kiro/steering/ so every cc-sdd command reads it:
mkdir -p .kiro/steering
cp ~/Downloads/PRD.md .kiro/steering/prd.md
git add .kiro/steering/prd.md
git commit -m "docs: add product PRD to project steering memory"`,
        detail: "Saving PRD.md directly to .kiro/steering/prd.md means every cc-sdd command — spec-init, spec-requirements, spec-design — reads it automatically on every run. No explicit steering step needed, no drift risk between a root PRD.md and a separate steering file. The feature list, personas, NFRs, and scope are all available to every agent from the first command.",
      },

      {
        tool: "You → Claude Code",
        icon: "✦",
        action: "Scaffold the top P0 feature — short label is enough",
        time: "~1 min",
        troubleshooting: [
          { err: `/kiro:spec-init not found`, fix: `cc-sdd wasn't installed correctly. Re-run \`npx cc-sdd@latest --claude\` from the project root and check \`.claude/commands/kiro/\` exists.` },
          { err: `spec.json is empty or malformed`, fix: `This is a cc-sdd bug — delete the folder and re-run spec-init. The folder name must be a valid slug (lowercase, hyphens only, no spaces).` },
        ],
        code: `# docs ─ cc-sdd /kiro:spec-init: https://github.com/gotalab/cc-sdd#kirospec-init
# docs ─ cc-sdd steering:        https://github.com/gotalab/cc-sdd#steering
# .kiro/steering/prd.md is read automatically — a short feature
# label or ID is all spec-init needs. Claude reads the PRD from
# steering, finds the matching feature, and uses its full description,
# personas, success metrics, and constraints to scaffold the spec.

/kiro:spec-init "F-01"
# or match by name:
/kiro:spec-init "invoicing-platform"

# Creates:
# .kiro/specs/invoicing-platform/
#   └── spec.json   ← scaffolded from PRD F-01 context in steering

# Work one feature at a time — never open F-02 before F-01 is done:
# /kiro:spec-init "F-02"
# /kiro:spec-init "F-03"`,
        detail: "Because .kiro/steering/prd.md is read automatically by every cc-sdd command, spec-init only needs a short label. Claude matches it against the PRD feature list and scaffolds the spec with the full context — no copy-pasting required.",
      },
      {
        tool: "cc-sdd Requirements Agent",
        icon: "⚙",
        action: "Generate feature requirements — seed with PRD context",
        time: "~10 min",
        troubleshooting: [
          { err: `Agent ignores PRD context`, fix: `Make sure prd.md is at \`.kiro/steering/prd.md\`. Steering files must be in that exact path to be auto-loaded. Confirm with \`ls .kiro/steering/\`.` },
          { err: `requirements.md is overwritten on re-run`, fix: `cc-sdd overwrites requirements.md if you re-run spec-requirements. Commit your approved requirements first.` },
          { err: `Agent asks questions already answered in PRD`, fix: `Add explicit context: 'Use @.kiro/steering/prd.md as source. Only ask where it is ambiguous or missing.'` },
        ],
        code: `# docs ─ cc-sdd /kiro:spec-requirements: https://github.com/gotalab/cc-sdd#kirospec-requirements
# Always seed the agent with the PRD to avoid re-interviewing:
/kiro:spec-requirements invoicing-platform

# .kiro/steering/prd.md is already loaded — no manual seeding needed.
# To focus the agent on a specific feature, optionally prompt:
# "Focus on F-01 from the PRD in steering.
#  Ask only where the feature detail is ambiguous or underspecified."
#
# The ears-format.md rules (Phase 00) govern the rest:
#   → Interview covers gaps not answered by the PRD
#   → Ambiguity report flags BLOCKING items before writing
#   → NFRs from PRD are inherited + any feature-specific ones added
#
# Output — .kiro/specs/invoicing-platform/requirements.md:
#   Functional requirements in EARS format (numbered)
#   ## Non-Functional Requirements  (PRD NFRs + feature-specific)
#   ## Open Questions               (unresolved items + owners)`,
        detail: "The PRD is product scope; requirements.md is feature-level engineering detail. Seeding the agent with the PRD means it only asks where the specific feature is unclear — not the whole product again. NFRs defined in the PRD flow down into every feature's requirements.md automatically, giving the design agent a complete constraint picture from the start.",
      },
      {
        tool: "You",
        icon: "⛔",
        action: "Review requirements and approve",
        time: "~15 min",
        troubleshooting: [
          { err: `spec-status shows Requirements as unapproved`, fix: `Find the approval field in \`spec.json\` and set it to \`approved\`. The exact field name varies by cc-sdd version — run \`cat .kiro/specs/<feature>/spec.json\` to inspect.` },
          { err: `BLOCKING ambiguity discovered late`, fix: `Go back to requirements.md, fix the ambiguity, and re-run approval. Never proceed to design with an unresolved BLOCKING item.` },
        ],
        code: `# Check current spec state:
/kiro:spec-status invoicing-platform

# Expected output:
# ⏳ Requirements  — pending approval
# ⏳ Design        — not started
# ⏳ Tasks         — not started

# Review the generated file:
cat .kiro/specs/invoicing-platform/requirements.md

# Check for BLOCKING ambiguities flagged by the agent.
# Resolve each one directly in requirements.md before continuing.
# Once satisfied, inspect spec.json to find the approval field:
cat .kiro/specs/invoicing-platform/spec.json

# Set the requirements approval flag to true:
# (field name may vary — check spec.json output above)
# Common field names: "requirementsApproved", "requirements.approved"

# Commit requirements as the explicit approval signal:
git add .kiro/specs/invoicing-platform/requirements.md \\
        .kiro/specs/invoicing-platform/spec.json
git commit -m "docs(spec): approve invoicing-platform requirements"

# Verify approval registered:
/kiro:spec-status invoicing-platform
# ✅ Requirements  — approved
# ⏳ Design        — not started`,
        detail: "The commit is your explicit approval. Resolving every BLOCKING item before committing ensures the design agent starts from unambiguous, agreed-upon requirements. /kiro:spec-status confirms the approval flag is set — if it still shows pending after the commit, inspect spec.json and set the field manually.",
      },
    ],
  },
  {
    id: "phase3",
    number: "03",
    label: "DESIGN · TASKS · GITHUB",
    color: "#FF6B9D",
    bg: "rgba(255,107,157,0.07)",
    border: "rgba(255,107,157,0.3)",
    fork: "specTool",
    forkGroup: "ccsdd",
    steps: [
      {
        tool: "cc-sdd Design Agent",
        icon: "⚙",
        action: "Architecture, ADR, corner cases & sequence diagram",
        time: "~15 min",
        troubleshooting: [
          { err: `design.md is missing ADR section`, fix: `Check \`templates/design.md\` includes the ADR scaffold. The design agent uses it as a template — if the section is absent, it won't be generated.` },
          { err: `Sequence diagram is empty`, fix: `Sequence diagrams require at least one API or integration in the design. If your feature is UI-only with no external calls, the diagram may be skipped.` },
          { err: `design agent contradicts requirements`, fix: `Run \`/kiro:spec-design\` with explicit context: 'requirements.md is the source of truth. Flag any design decision that contradicts it.'` },
        ],
        code: `# docs ─ cc-sdd /kiro:spec-design: https://github.com/gotalab/cc-sdd#kirospec-design
# Standard (interactive, you review before it writes):
/kiro:spec-design invoicing-platform

# With existing PRD — skip approval prompt:
/kiro:spec-design invoicing-platform -y

# Agent reads requirements.md (incl. NFRs) and design-principles.md.
# Produces:
# .kiro/specs/invoicing-platform/design.md
#   ├── 3 evaluated architectures with pros/cons
#   ├── Recommended architecture with specific reasoning
#   ├── Data models, API contracts, component tree
#   ├── ## Corner Cases section (boundary, timing, integration,
#   │     security, data edge cases)
#   └── ## ADR reference
#
# docs/adr/ADR-001-[decision-slug].md
#   ├── Decision context (system, problem, constraints, NFR IDs)
#   ├── Consequences: ≥3 ✔ and ≥2 ✘ — all measurable/observable
#   └── Alternatives: WHY each was rejected, not just that it was
#
# docs/diagrams/invoicing-platform-sequence.md
#   └── Mermaid sequence diagram — happy path, async boundaries marked`,
        detail: "design-principles.md (created in Phase 00) drives the agent to evaluate architectures comparatively, produce a traceable ADR, identify corner cases at the system level, and generate a sequence diagram — all in one pass. The ADR's NFR IDs link directly to requirements.md, maintaining full traceability.",
      },
      {
        tool: "cc-sdd Tasks Agent",
        icon: "⚙",
        action: "Break design into atomic tasks",
        time: "~5 min",
        troubleshooting: [
          { err: `tasks.md has no (P) markers`, fix: `The parallelism markers are added by the tasks agent based on dependency analysis. If all tasks are sequential, the design may have tight coupling — consider splitting.` },
          { err: `Tasks are too coarse`, fix: `Each task should be completable in one session. If a task has more than 5 acceptance criteria, split it into two tasks and re-run spec-tasks for that section.` },
        ],
        code: "# docs ─ cc-sdd /kiro:spec-tasks: https://github.com/gotalab/cc-sdd#kirospec-tasks\n/kiro:spec-tasks invoicing-platform\n# → Writes: specs/tasks.md\n# Each task: title, acceptance criteria,\n#             dependencies, estimate",
        detail: "Tasks are ordered by dependency. Each has a clear completion condition and an empty checkbox — [ ]. /kiro:spec-impl ticks them to [x] as each completes. /kiro:spec-status reads them to report overall progress.",
      },
      {
        tool: "Claude Code → GitHub MCP",
        icon: "↔",
        action: "Mirror tasks.md to GitHub Issues",
        time: "~3 min",
        troubleshooting: [
          { err: `GitHub MCP creates duplicate issues`, fix: `Check tasks.md for existing \`<!-- gh:#N -->\` comments before running. If issues exist, skip re-creation: 'Only create issues for tasks without a gh: comment.'` },
          { err: `Issue numbers not written back to tasks.md`, fix: `The write-back requires explicit instruction. Prompt: 'After creating each issue, append \`<!-- gh:#N -->\` on the same line in tasks.md.'` },
          { err: `Milestone not found`, fix: `The milestone must exist on GitHub before assignment. Create it at github.com/<org>/<repo>/milestones or via: \`gh api repos/<org>/<repo>/milestones -f title='<name>'\`` },
        ],
        code: `# After /kiro:spec-tasks, prompt Claude:
"Read .kiro/specs/invoicing-platform/tasks.md.
For each unchecked task, create a GitHub Issue with:
- title: task title
- body: acceptance criteria from tasks.md
- label: spec-task
- milestone: invoicing-platform
After creating each issue, append the issue number
as an inline comment on the same line in tasks.md."

# tasks.md becomes:
# - [ ] 1.1  Set up Stripe webhook endpoint <!-- #42 -->
# - [ ] 1.2  Add signature validation middleware <!-- #43 -->
# - [ ] 2.1 (P)  Build PDF template engine <!-- #44 -->`,
        detail: "tasks.md stays the single source of truth. GitHub Issues are the public mirror — visible to the team, linkable in PRs, tracked in the project board. The issue number comment is the durable two-way link Claude uses to close issues on task completion.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Review & commit your spec",
        time: "~10 min",
        troubleshooting: [
          { err: `git commit fails: nothing to commit`, fix: `You may have forgotten \`git add\`. Run \`git add .kiro/specs/ docs/adr/ docs/diagrams/\` before committing.` },
          { err: `Spec files contain merge conflicts`, fix: `If working on a team, pull before spec generation. Conflicts in spec files must be resolved manually — don't let git auto-merge them.` },
        ],
        code: `git add .kiro/specs/ docs/adr/ docs/diagrams/ && git commit -m "docs(spec): add invoicing-platform requirements, design, ADR and tasks"
# requirements.md (+ NFRs) → design.md (+ ADR + corner cases) → tasks.md
# docs/adr/ADR-001-*.md · docs/diagrams/*-sequence.md
# Full traceability chain is now version-controlled`,
        detail: "The spec is your source of truth. The chain requirements (with NFRs) → design (with ADR and corner cases) → tasks means every implementation task is traceable back to a requirement. The ADR and sequence diagram live in docs/ and are committed alongside the spec.",
      },
    ],
  },

  {
    id: "phase2b",
    number: "02B",
    label: "OPENSPEC · SPEC GENERATION",
    color: "#FF6EC7",
    bg: "rgba(255,110,199,0.07)",
    border: "rgba(255,110,199,0.3)",
    fork: "specTool",
    forkGroup: "openspec",
    forkLabel: "Best when: brownfield codebase, faster iteration, or 3 commands over 8.",
    steps: [
      {
        tool: "Terminal",
        icon: "⌘",
        action: "Install OpenSpec globally and init for Claude Code",
        time: "~2 min",
        troubleshooting: [
          { err: `openspec: command not found after install`, fix: `Check that npm global bin is on PATH. Run \`npm bin -g\` to find the folder and add it to ~/.zshrc or ~/.bashrc.` },
          { err: `openspec init hangs at tool selection`, fix: `Use arrow keys to highlight "claude" and press Enter. If the terminal renders incorrectly try a standard terminal (not tmux/screen).` },
          { err: `No .claude/commands/openspec* files created`, fix: `You may have selected a different tool during init. Re-run \`openspec init --tools claude --force\` to regenerate for Claude Code.` },
        ],
        code: `# docs ─ OpenSpec GitHub:  https://github.com/Fission-AI/OpenSpec
# docs ─ OpenSpec site:    https://openspec.dev
# docs ─ npm pkg:          https://www.npmjs.com/package/@fission-ai/openspec
npm install -g @fission-ai/openspec@latest

cd your-project
openspec init
# Interactive prompts:
#   Which AI tool?    → select "claude" (Claude Code)
#   Delivery mode?   → slash-commands (default)
#
# Creates:
#   openspec/project.md   ← project context (fill in next step)
#   openspec/AGENTS.md    ← AI instructions, auto-loaded each session
#
# Adds to .claude/commands/:
#   openspec:proposal.md  ← scaffold a change + spec delta
#   openspec:apply.md     ← implement the change
#   openspec:archive.md   ← archive and merge into living specs

openspec --version   # verify install`,
        detail: "Unlike cc-sdd, OpenSpec registers exactly three slash commands in Claude Code. No custom command scaffolding needed — the three cover the entire lifecycle: plan → implement → archive. AGENTS.md is auto-read by Claude at every session start, loading spec awareness and project context before the agent does anything.",
      },
      {
        tool: "You → Claude Code",
        icon: "✦",
        action: "Fill project.md — AI introspects your codebase",
        time: "~5 min",
        troubleshooting: [
          { err: `project.md stays empty or generic`, fix: `Be specific: "Read the source files in src/, the build config, and README, then fill openspec/project.md with the actual stack, module names, and conventions used in this project."` },
          { err: `Claude says it cannot access the files`, fix: `Make sure you launched Claude Code from the project root (\`claude\`). The file lives at openspec/project.md relative to that root.` },
        ],
        code: `# Prompt Claude once after openspec init:
"Read openspec/project.md and introspect the current
codebase — tech stack, architecture, conventions, key
modules, testing setup — then fill it out completely."

# Claude produces a 200-300 line project.md covering:
# - Tech stack and versions  (from package.json / build files)
# - Architecture overview    (modules, layers, patterns used)
# - Key entry points         (and their responsibilities)
# - Coding conventions       (naming, error handling, etc.)
# - Test framework           (and coverage expectations)
# - Deployment setup         (env vars, config, etc.)

# Review, correct any wrong assumptions, then commit:
git add openspec/ && git commit -m "docs(spec): init openspec project context"`,
        detail: "project.md is OpenSpec's equivalent of CLAUDE.md + the cc-sdd constitution combined. Every future /openspec:proposal reads it to understand the system before generating spec deltas. Keep it accurate — correct any wrong architectural assumptions the AI made. It's the single file that makes proposals accurate rather than generic.",
      },
      {
        tool: "Claude Code  ·  /openspec:proposal",
        icon: "⚙",
        action: "Generate change proposal with spec delta",
        time: "~3 min",
        troubleshooting: [
          { err: `Proposal generates duplicate requirements`, fix: `OpenSpec searches existing specs first. If duplication still occurs, your openspec/specs/ folder may be stale. Run \`openspec validate\` to check for structural issues.` },
          { err: `tasks.md has 0 or 1 tasks`, fix: `Your description is too vague. Re-run with more detail: include personas, integration points, and key constraints in the prompt.` },
          { err: `Validation errors logged during generation`, fix: `Non-blocking schema warnings are usually safe to continue with. Run \`openspec validate invoicing-platform\` for the full list — fix any BLOCKING items before applying.` },
        ],
        code: `/openspec:proposal "A multi-tenant SaaS invoicing platform
with Stripe integration and PDF export"

# OpenSpec searches existing specs for context:
#   Searching openspec/specs/ for related requirements...
#   Read(openspec/specs/billing/spec.md)  ← if exists
#   Creating proposal for invoicing-platform...

# Creates: openspec/changes/invoicing-platform/
#   ├── proposal.md    ← what & why, personas, scope
#   ├── tasks.md       ← implementation checklist  [ ] 1.1 ...
#   └── specs/
#       └── invoicing/
#           └── spec.md  ← spec delta (new/changed requirements)

# spec.md uses SHALL syntax + Given/When/Then:
# "The system SHALL generate a PDF invoice for any completed order."
#   Scenario: successful PDF generation
#     GIVEN an order with status "completed"
#     WHEN the admin clicks Generate Invoice
#     THEN a PDF is downloaded within 3 seconds

# Total output: ~250 lines  (vs cc-sdd's ~800)`,
        detail: "The proposal command is brownfield-aware — it reads your existing specs first and only generates new requirements, not duplicates. The spec delta (SHALL statements + scenarios) is what makes code review fast: reviewers see exactly which requirements are added or changed, not just the code diff. Commit the change folder to git so the proposal is reviewable in a PR alongside the code.",
      },
      {
        tool: "You",
        icon: "⛔",
        action: "Review proposal before applying — human gate",
        time: "~10 min",
        troubleshooting: [
          { err: `proposal.md scope is too broad`, fix: `Edit it directly. Remove tasks that don't belong in this change. Smaller proposals = faster, safer applies. Move excess tasks to a new proposal.` },
          { err: `spec delta has wrong SHALL statements`, fix: `Edit openspec/changes/invoicing-platform/specs/invoicing/spec.md directly — it is plain Markdown and you own it entirely.` },
        ],
        code: `# Inspect the generated change:
openspec show invoicing-platform

# Validate structure:
openspec validate invoicing-platform

# Check dashboard:
openspec view
# ════════════════════════════════════════════════
# Summary:
#   ● Active Changes:  1 in progress
#   ● Specifications:  N existing specs
# ════════════════════════════════════════════════

# Review checklist before /openspec:apply:
# ✓ proposal.md reflects exactly what you intend to build
# ✓ tasks.md checkboxes match the implementation plan
# ✓ spec delta shows only new / changed requirements
# ✓ no BLOCKING validation errors

# Edit files directly if anything is wrong:
# openspec/changes/invoicing-platform/proposal.md
# openspec/changes/invoicing-platform/tasks.md
# openspec/changes/invoicing-platform/specs/invoicing/spec.md`,
        detail: "OpenSpec trusts you to read the proposal — there is no BLOCKING/NON-BLOCKING ambiguity classifier like cc-sdd. The proposal is short enough (~250 lines) to read fully in 5 minutes. Take that time. A wrong task at this stage costs nothing to fix; a wrong task found mid-implementation costs hours.",
      },
      {
        tool: "You  ·  ⚠ OPTIONAL — expanded profile",
        icon: "✦",
        action: "Enable expanded profile for design.md + /opsx:* commands",
        time: "~2 min",
        troubleshooting: [
          { err: `/opsx:* commands not appearing after openspec update`, fix: `Run \`openspec config profile\` and confirm expanded is selected. Then run \`openspec update --tools claude\` and restart Claude Code.` },
        ],
        code: `# Core profile (default): proposal.md + tasks.md + spec delta only
# Expanded profile adds: design.md, richer analysis, /opsx:* commands

# Switch to expanded profile:
openspec config profile
# → select "expanded"
openspec update
# → regenerates .claude/commands/ with /opsx:* commands

# Expanded workflow using fast-forward:
/opsx:new invoicing-platform
/opsx:ff
# ✓ proposal.md   ← what & why
# ✓ design.md     ← technical approach and architecture decisions
# ✓ tasks.md      ← implementation checklist
# ✓ specs/        ← spec deltas

# Additional /opsx:* commands:
/opsx:verify        ← checks impl against the spec delta
/opsx:sync          ← sync spec state after manual edits
/opsx:bulk-archive  ← archive multiple completed changes at once`,
        detail: "The expanded profile is the closest OpenSpec gets to cc-sdd's depth — design.md covers architectural decisions similar to cc-sdd's ADR output. Use it for new features, major refactors, or when onboarding developers to a new feature area. Stick with the core profile for small, iterative changes on a well-documented system — you don't need a design doc for a 3-task bug fix.",
      },
      {
        tool: "Claude Code → GitHub MCP",
        icon: "↔",
        action: "Mirror tasks.md to GitHub Issues",
        time: "~3 min",
        troubleshooting: [
          { err: `GitHub MCP not available`, fix: `MCP must be configured in Claude Code (see Bootstrap phase). Run \`claude mcp list\` to verify the github server is present and active.` },
        ],
        code: `# Prompt Claude once after the proposal is reviewed:
"Read openspec/changes/invoicing-platform/tasks.md.
For each unchecked task, create a GitHub Issue with:
- title: task title from tasks.md
- body: relevant spec requirement from the spec delta
- label: openspec-task
- milestone: invoicing-platform
After creating each issue, append the issue number
as an inline comment on the task line in tasks.md."

# tasks.md becomes:
# - [ ] 1.1  Set up Stripe webhook endpoint    <!-- gh:#42 -->
# - [ ] 1.2  Add signature validation middleware <!-- gh:#43 -->
# - [ ] 2.1  Build PDF template engine          <!-- gh:#44 -->`,
        detail: "Same pattern as cc-sdd. tasks.md is the single source of truth; GitHub Issues are the human-visible mirror. The issue number comment is the durable link that lets Claude close issues atomically when ticking checkboxes during /openspec:apply.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Commit the change — proceed to 05A or 05B",
        time: "~1 min",
        troubleshooting: [],
        code: `git add openspec/ && git commit -m "docs(spec): add invoicing-platform openspec change"

# → Go to 05A (autonomous) or 05B (controlled) for implementation.
#
# Key differences from cc-sdd in the execution phases:
#   Replace /kiro:spec-impl  → /openspec:apply
#   Checkbox ticking         → same (tasks.md format is compatible)
#   Post-completion          → run /openspec:archive (see last step
#                              in 05A / 05B for OpenSpec users)`,
        detail: "The change folder lives in openspec/changes/ until you archive it after the PR merges. Everything in 05A and 05B works identically — tasks.md checkboxes, GitHub Issue closing, conventional commits, CLAUDE.md rules — with /openspec:apply replacing /kiro:spec-impl. The archive step at the end of 05A/05B is the one OpenSpec-exclusive action.",
      },
    ],
  },
  {
    id: "phase4",
    number: "04",
    label: "SPEC REVIEW · READY TO BUILD",
    color: "#A8DAFF",
    bg: "rgba(168,218,255,0.07)",
    border: "rgba(168,218,255,0.3)",
    steps: [
      {
        tool: "You",
        icon: "✦",
        action: "Review tasks.md — your implementation queue",
        time: "~5 min",
        troubleshooting: [
          { err: `tasks.md is out of sync with GitHub Issues`, fix: `Closed issues whose checkboxes are still unchecked: tick them manually. Open issues with ticked checkboxes: reopen on GitHub.` },
        ],
        code: `# tasks.md contains numbered checkboxes:
# - [ ] 1.1  Set up Stripe webhook endpoint
# - [ ] 1.2  Add signature validation middleware
# - [ ] 2.1 (P)  Build PDF template engine
# - [ ] 2.2 (P)  Add PDF export route
# - [ ] 3.1  Implement multi-tenant auth guard

# (P) = can run in parallel
# No (P) = sequential, respect dependency order`,
        detail: "This is your single source of truth for implementation progress. You read it to pick tasks (03B) or hand it to Claude for autonomous execution (03A). No external tool needed.",
      },
      {
        tool: "cc-sdd",
        icon: "⚙",
        action: "Check status at any time",
        time: "~1 min",
        troubleshooting: [
          { err: `spec-status shows 0% despite completed tasks`, fix: `spec-status reads checkbox state from tasks.md. If tasks were completed outside of Claude, tick the checkboxes manually.` },
        ],
        code: `# docs ─ cc-sdd /kiro:spec-status: https://github.com/gotalab/cc-sdd#kirospec-status
/kiro:spec-status invoicing-platform

# Output shows:
# ✅ Requirements  — approved
# ✅ Design        — approved
# ⏳ Implementation — 3 / 11 tasks complete (27%)
#    Next: 1.2 Add signature validation middleware`,
        detail: "/kiro:spec-status parses the checkbox state directly from tasks.md. No MCP server, no database — just Markdown. Run it after any session to see exactly where you stand.",
      },
      {
        tool: "Claude Code → GitHub MCP",
        icon: "↔",
        action: "Create one GitHub Issue per task",
        time: "~3 min",
        troubleshooting: [
          { err: `Rate limit hit during bulk creation`, fix: `GitHub API allows 5000 requests/hour. For large specs (50+ tasks) add a delay: 'Wait 1 second between each issue creation.'` },
        ],
        code: `# You prompt Claude once:
"Read .kiro/specs/invoicing-platform/tasks.md.
For every unchecked task, create a GitHub Issue
with the task title, acceptance criteria in the body,
label 'spec-task', and milestone 'invoicing-platform'.
Write each issue number back into tasks.md
as a comment on the task line."

# Claude calls GitHub MCP for each task:
create_issue({
  title: "Add webhook signature validation middleware",
  body: "**Acceptance criteria:**\\n- ...",
  labels: ["spec-task"],
  milestone: "invoicing-platform"
})

# tasks.md becomes:
# - [ ] 1.2  Add signature validation middleware <!-- gh:#42 -->`,
        detail: "The issue number embedded in tasks.md is the sync anchor. Every future status change — start, complete, abandon — goes through that issue number. One source of truth, two views: tasks.md for Claude, GitHub Issues for humans.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Verify board on GitHub and reorder if needed",
        time: "~2 min",
        troubleshooting: [
          { err: `Issues not appearing in project board`, fix: `Issues must be manually added to a GitHub Project board. They appear in the Issues list automatically, but Project board membership is separate.` },
        ],
        code: `# Open your GitHub Issues board:
# github.com/<org>/<repo>/issues?milestone=invoicing-platform

# All tasks land as Open issues with "spec-task" label.
# Drag to reorder priority in the Projects board if you use it.
# Any reordering here is cosmetic — tasks.md order drives implementation.`,
        detail: "GitHub Issues is now your human-readable progress dashboard. PMs, stakeholders, and reviewers track work here. Claude tracks work via the checkboxes in tasks.md. The issue numbers keep both in lockstep.",
      },
      {
        tool: "Claude Code → mise",
        icon: "⚙",
        action: "Generate .mise.toml from design.md tech stack",
        time: "~5 min",
        troubleshooting: [
          { err: `mise install fails: version not found`, fix: `The version string in .mise.toml may be too specific. Use \`22.x\` instead of \`22.3.0\` to allow patch-level flexibility.` },
          { err: `mise exec command not found`, fix: `mise isn't activated in your shell. Add \`eval "$(mise activate zsh)"\` (or bash) to your shell rc file, then restart the shell.` },
          { err: `CI can't find mise`, fix: `Add \`curl https://mise.run | sh\` as the first CI step, then \`mise install\`. Most CI images don't ship with mise pre-installed.` },
        ],
        code: `# docs ─ mise .mise.toml reference: https://mise.jdx.dev/configuration.html
# docs ─ mise tasks:                https://mise.jdx.dev/tasks/
# Prompt Claude:
"Read the tech stack section of
@.kiro/specs/invoicing-platform/design.md.
Generate a .mise.toml at the project root that
pins all required runtimes and tools."

# Example output — .mise.toml:
[tools]
node    = "22.x"
python  = "3.12"
java    = "21"
gradle  = "8.x"

# Optional task shortcuts:
[tasks.dev]
run = "npm run dev"
[tasks.test]
run = "npm test"
[tasks.lint]
run = "npm run lint"

# Lock and install:
mise install
mise run dev     # verify it boots`,
        detail: "mise reads design.md's tech stack and pins every runtime to an exact version in .mise.toml. Every developer and every subagent that runs mise install gets an identical environment — no 'works on my machine'. The task shortcuts are optional but useful for giving Claude consistent commands to invoke dev, test, and lint.",
      },
      {
        tool: "CLAUDE.md",
        icon: "◈",
        action: "Tell Claude to always use mise — never system tools",
        time: "~2 min",
        troubleshooting: [
          { err: `Claude still calls node/python directly`, fix: `The CLAUDE.md rule is only enforced at session start. If Claude was already running, start a new session so the updated CLAUDE.md is re-read.` },
        ],
        code: `# Add to CLAUDE.md:
## Environment
- All runtimes and tools are managed via mise
- Never invoke node, python, java, etc. directly
- Always prefix with: mise run <task>
  or activate env with: mise exec -- <command>
- If a tool is missing: add it to .mise.toml
  and run mise install before proceeding
- Never assume a version — always check .mise.toml first`,
        detail: "Without this rule Claude might pick up a system-level Node or Python that differs from .mise.toml. The CLAUDE.md constraint ensures subagents, tests, and build commands all run in the pinned mise environment, making CI/CD parity automatic.",
      },
      {
        tool: "Claude Code",
        icon: "⚙",
        action: "Generate initial README.md from spec",
        time: "~5 min",
        troubleshooting: [
          { err: `README sections are empty`, fix: `The agent needs both requirements.md and design.md to be present. Run spec-design before generating the README.` },
          { err: `README is overwritten on each commit`, fix: `Claude should only update affected sections, not regenerate the whole file. Prompt: 'Update only the sections affected by task N. Do not modify other sections.'` },
        ],
        code: `# Prompt Claude once before implementation starts:
"Read @.kiro/specs/invoicing-platform/requirements.md
and @.kiro/specs/invoicing-platform/design.md.
Generate a README.md at the project root with these sections:
- Overview & features
- Prerequisites (from .mise.toml)
- Installation
- Usage (placeholder — mark as 'Coming soon' where needed)
- Configuration
- Architecture (from design.md diagrams)
- Contributing"

# Claude generates README.md from the spec.
# Sections not yet implemented are marked:
# > ⚠️ Coming soon — implemented in task 3.1`,
        detail: "Generating README.md from the spec before writing any code creates a north-star document. As each task lands, Claude updates only the relevant sections — so the README reflects what's actually built, not what was planned.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Commit .mise.toml, CLAUDE.md and README.md",
        time: "~1 min",
        troubleshooting: [
          { err: `pre-commit hook fails on first commit`, fix: `The hook may require test infra that doesn't exist yet. Bypass once with \`git commit --no-verify\` and note it in the commit message.` },
        ],
        code: `git add .mise.toml CLAUDE.md README.md
git commit -m "chore(env): add mise toolchain, CLAUDE.md rules and initial README"

# Now pick your execution path:
# → 03A for autonomous (hand off all tasks at once)
# → 03B for controlled (one task at a time, you review each)`,
        detail: ".mise.toml, CLAUDE.md, and README.md committed together before any code means every branch inherits pinned runtimes, agent rules, and a live doc from day one. CI just needs 'mise install && mise run test'.",
      },
    ],
  },
  {
    id: "phase5",
    number: "05A",
    label: "AUTONOMOUS EXECUTION · TRUST THE SPEC",
    color: "#C77DFF",
    bg: "rgba(199,125,255,0.07)",
    border: "rgba(199,125,255,0.3)",
    fork: "execution",
    forkLabel: "Best when: tasks are small, well-specced, low-risk. You want speed over control.",
    steps: [
      {
        tool: "Claude Code (Orchestrator)",
        icon: "◉",
        action: "Hand off all tasks to /kiro:spec-impl",
        time: "~2 min",
        troubleshooting: [
          { err: `spec-impl exits after first task`, fix: `Check tasks.md for BLOCKING comments — spec-impl stops at blocked tasks. Remove or resolve the comment to continue.` },
          { err: `Parallel tasks overwrite each other`, fix: `Race condition on a shared file. Add a note in tasks.md: 'Tasks 2.1 and 2.2 must not touch the same file.' The orchestrator will serialize them.` },
        ],
        code: `# docs ─ cc-sdd /kiro:spec-impl:  https://github.com/gotalab/cc-sdd#kirospec-impl
# docs ─ Claude Code subagents:   https://docs.anthropic.com/en/docs/claude-code/sub-agents
# One prompt triggers the full autonomous run:
/kiro:spec-impl invoicing-platform

# Or target specific tasks:
/kiro:spec-impl invoicing-platform 1.1,1.2,2.1,2.2

# Claude reads tasks.md, respects (P) markers:
Task 1.1  → Agent A  (sequential)
Task 1.2  → Agent A  (sequential)
Task 2.1  → Agent B  (parallel with 2.2)
Task 2.2  → Agent C  (parallel with 2.1)`,
        detail: "spec-impl reads the checkbox list, spawns one subagent per task, and ticks - [x] as each completes. (P)-marked tasks run in parallel subagents; unmarked tasks run sequentially to respect dependencies.",
      },
      {
        tool: "Subagent → Sequential Thinking MCP",
        icon: "↔",
        action: "Multi-step reasoning before coding",
        time: "automated",
        troubleshooting: [
          { err: `Sequential Thinking MCP not invoked`, fix: `The MCP is invoked automatically by the subagent when CLAUDE.md includes a 'think before coding' instruction. Add: '## Reasoning — Before writing any code, use the sequential-thinking MCP to reason through the approach.'` },
        ],
        code: `# docs ─ Sequential Thinking MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
# Each agent internally calls:
sequential_thinking({
  thought: "What are the edge cases for
            webhook signature validation?",
  next_thought_needed: true
})
# Produces a reasoning chain before
# writing a single line of code`,
        detail: "The Sequential Thinking MCP server forces structured reasoning before any file is touched. Agents don't jump to code — they think first, then act.",
      },
      {
        tool: "Subagent → cc-sdd (tasks.md)",
        icon: "⚙",
        action: "Tick checkbox and commit on task completion",
        time: "automated",
        troubleshooting: [
          { err: `Tests fail at commit time`, fix: `Don't bypass with --no-verify. Fix the failing tests first. If they're pre-existing failures unrelated to this task, document them in a GitHub Issue and note it in the commit message.` },
          { err: `README update forgotten`, fix: `Claude should update README before every commit per CLAUDE.md rules. If it's skipping this, re-state the rule: 'Before committing, update any README sections affected by this task.'` },
          { err: `/kiro:steering hangs or is slow`, fix: `Steering writes to \`.kiro/steering/\` files. If the project is large, it may take 30–60 seconds. Wait for it to complete — interrupted steering leads to stale project memory.` },
        ],
        code: `# After each task Claude runs the pre-commit checklist:
# 1. Tests:
mise run test
# → all must pass

# 2. Update README.md for affected sections only
#    (e.g. task adds a new CLI flag → update Usage section)

# 3. Tick checkbox in tasks.md:
#    - [x] 1.1  Set up Stripe webhook endpoint <!-- gh:#41 -->

# 4. Commit atomically (lint hook fires automatically):
git commit -m "feat(stripe): add webhook endpoint and routing

Implements task 1.1 from invoicing-platform spec.
Covers POST /webhooks/stripe with raw body parsing.

Closes #41"

# After commit: update project memory
/kiro:steering`,
        detail: "Tests run first — a failing test blocks the commit. README is updated incrementally after each task so it never drifts from the actual implementation. The git pre-commit hook handles linting automatically when the commit fires. After the commit, /kiro:steering captures any new patterns or decisions made during implementation — keeping project memory sharp for the next session.",
      },
      {
        tool: "Subagent → Playwright MCP",
        icon: "↔",
        action: "Live browser validation",
        time: "automated",
        troubleshooting: [
          { err: `Playwright can't connect to localhost`, fix: `The dev server must be running before Playwright navigates. Add a startup step: \`mise run dev &\` or ensure the server is already up.` },
          { err: `Screenshots are blank`, fix: `The page may still be loading. Add a wait: \`playwright_wait_for_selector({ selector: 'body' })\` before taking the screenshot.` },
        ],
        code: `# docs ─ Playwright MCP actions: https://github.com/microsoft/playwright-mcp#tools
playwright_navigate({ url: "http://localhost:3000" })
playwright_screenshot({ fullPage: true })
playwright_click({ selector: "#generate-invoice" })
# Agent sees the result, fixes CSS/logic issues
# without you lifting a finger`,
        detail: "The Playwright MCP gives Claude a real browser. It navigates, clicks, screenshots, and reads console errors — closing the feedback loop automatically.",
      },
      {
        tool: "Escape hatch  ·  ⚠ OUT-OF-BAND",
        icon: "⛔",
        action: "Manually mark a task done or blocked",
        time: "~2 min",
        code: `# Use when a task was completed outside the normal flow
# (hotfix, manual deploy, external team, etc.)

# Option A — ask Claude (keeps GitHub in sync):
"Mark task 2.1 as complete in tasks.md
and close issue #44 on GitHub with a comment
explaining it was resolved manually."

# Option B — direct file edit (fast, no GitHub sync):
# Edit tasks.md in your editor:
# - [x] 2.1 (P)  Build PDF template engine <!-- gh:#44 -->
# Then close the issue manually on GitHub.

# For blocked tasks — add a note, don't tick:
# - [ ] 3.1  Multi-tenant auth guard <!-- gh:#45 -->
#            <!-- blocked: waiting on IdP config -->
# Claude will skip blocked tasks in spec-impl.`,
        detail: "tasks.md is plain Markdown — you can edit it directly anytime. Option A is always preferred because it keeps the checkbox and the GitHub issue atomic. Option B is the break-glass fallback for when you need to move fast without a Claude session. Either way, never leave a ticked checkbox with an open issue or vice versa.",
      },
      {
        tool: "cc-sdd",
        icon: "⚙",
        action: "Track overall progress",
        time: "~1 min",
        troubleshooting: [
          { err: `validate-impl reports failures after all tasks done`, fix: `Some requirements may not have been addressed by any task. Re-read requirements.md and check if a task was missed or merged into another one.` },
        ],
        code: `# docs ─ cc-sdd /kiro:validate-impl: https://github.com/gotalab/cc-sdd#kirovalid
/kiro:spec-status invoicing-platform
# ✅ Requirements  — approved
# ✅ Design        — approved
# ✅ Implementation — 11 / 11 tasks complete

# Validate quality when done:
/kiro:validate-impl invoicing-platform`,
        detail: "Run /kiro:spec-status at any point to see checkbox progress. When all tasks are done, /kiro:validate-impl checks that the implementation actually satisfies the requirements — a final quality gate before you open a PR.",
      },
      {
        tool: "OpenSpec users  ·  ⚠ POST-EXECUTION",
        icon: "⛔",
        action: "Archive change — merge spec deltas into permanent specs",
        time: "~1 min",
        troubleshooting: [
          { err: `Archive fails with conflict`, fix: `OpenSpec detected overlapping requirements between the spec delta and an existing spec. Review the conflict in openspec/changes/<id>/specs/ and resolve manually before re-running archive.` },
        ],
        code: `# Run once after all tasks are complete and the PR is merged:
/openspec:archive

# OpenSpec merges spec deltas into permanent living specs:
# openspec/changes/invoicing-platform/specs/invoicing/spec.md
# → merged into openspec/specs/invoicing/spec.md

# Moves change to archive:
# openspec/changes/invoicing-platform/
# → openspec/changes/archive/invoicing-platform/

# Dashboard reflects consolidated knowledge:
openspec view
# ════════════════════════════════════════════════
# Summary:
#   ● Specifications: +1 spec, +N requirements
#   ● Completed Changes: 1
# ════════════════════════════════════════════════

git add openspec/ && git commit -m "docs(spec): archive invoicing-platform openspec change"`,
        detail: "This step is unique to OpenSpec — there is no cc-sdd equivalent. It's what makes OpenSpec brownfield-aware: every archived change enriches the permanent specs in openspec/specs/, so future /openspec:proposal calls find existing context and never generate duplicate requirements. Merge the PR first, then archive — the spec should reflect what actually shipped.",
      }
    ],
  },
  {
    id: "phase6",
    number: "05B",
    label: "CONTROLLED EXECUTION · HUMAN IN THE LOOP",
    color: "#FF9F43",
    bg: "rgba(255,159,67,0.07)",
    border: "rgba(255,159,67,0.3)",
    fork: "execution",
    forkLabel: "Best when: new codebase, complex logic, high stakes. You want control over speed.",
    steps: [
      {
        tool: "You → Claude Code",
        icon: "✦",
        action: "Pick one task from tasks.md, ask for a plan",
        time: "~3 min",
        troubleshooting: [
          { err: `Claude starts coding without a plan`, fix: `Re-enforce the plan-first rule: 'Do NOT write any code. Output only a plan in plain text. Wait for my approval before implementing anything.'` },
          { err: `Plan references wrong files`, fix: `Ensure Claude has read the latest design.md. Prompt: 'Re-read @.kiro/specs/<feature>/design.md before planning.'` },
        ],
        code: `# Check what's next:
/kiro:spec-status invoicing-platform

# Pick a task and ask Claude to plan only:
"Read task 1.2 in @.kiro/specs/invoicing-platform/tasks.md
and @.kiro/specs/invoicing-platform/design.md.

Think step by step and write a detailed
implementation plan. Do NOT write any code yet.
Show me: files to create/modify, approach,
risks, test strategy."

# Claude also marks the issue in-progress:
# (GitHub MCP) add_label({ issue: 42, label: "in-progress" })`,
        detail: "Always start from /kiro:spec-status so you pick the right next task respecting dependencies. The plan-first prompt puts Claude in read-only reasoning mode — no file is touched until you approve.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Review the plan — approve or redirect",
        time: "~5 min",
        troubleshooting: [
          { err: `Plan looks right but implementation diverges`, fix: `The plan approval is not a binding contract — Claude may deviate. Add to CLAUDE.md: 'Implement exactly the approved plan. Any deviation requires a new plan approval.'` },
        ],
        code: `# Three possible responses:

# ✅ Approve:
"Looks good, go ahead and implement."

# ✏️  Redirect:
"Don't use a separate service class.
Keep it in the controller for now."

# ❌ Block:
"Stop — this touches the auth module.
Let's finish task-6 first."`,
        detail: "This is your primary control gate. Changing direction here costs zero tokens of implementation work. This single habit eliminates most rework.",
      },
      {
        tool: "Claude Code → Subagent",
        icon: "⚙",
        action: "Implement in an isolated subagent context",
        time: "~15 min",
        troubleshooting: [
          { err: `Subagent modifies files outside task scope`, fix: `This is scope creep. Prompt: 'You are only allowed to touch files listed in the approved plan. Reject any change outside that list.'` },
          { err: `Subagent context lost mid-task`, fix: `Long tasks may exceed context. Split into smaller tasks or use /kiro:steering to write key decisions to disk before the context overflows.` },
        ],
        code: `# Claude spawns a subagent with:
# - The approved plan as its brief
# - A single task scope (no scope creep)
# - Instruction to commit atomically when done

# Subagent works, then surfaces:
"Task complete. Here's what I did:
 - Modified: src/webhooks/stripe.ts (+87 -12)
 - Created:  src/webhooks/stripe.test.ts
 - Tests: 14 passing, 0 failing
 Waiting for your review before closing task."`,
        detail: "Subagents have isolated context windows — they only know about this task. They cannot accidentally refactor something unrelated. The parent Claude holds the overall picture.",
      },
      {
        tool: "You",
        icon: "✦",
        action: "Review diff + tests — approve the commit",
        time: "~5 min",
        troubleshooting: [
          { err: `Tests pass locally but fail in CI`, fix: `Environment drift — likely a runtime version mismatch. Check that \`.mise.toml\` is committed and CI runs \`mise install\` before tests.` },
          { err: `Diff is too large to review meaningfully`, fix: `The task was too broad. Next time, split tasks that touch more than 3 files. For now, review file by file: \`git diff HEAD -- src/filename.ts\`` },
        ],
        code: `# Claude shows you a diff summary.
# You can also run manually:
git diff --stat HEAD
mise run test     # must pass (--coverage for detail)

# Then either:
"Approved. Commit it and mark task done."

# Or:
"The error handling is missing for 401 responses.
Fix that before committing."`,
        detail: "Tests must be green before Claude proposes the commit. Linting fires automatically via the pre-commit hook when the commit runs — you never need to call it manually. You own the final approval on diff and test results.",
      },
      {
        tool: "Claude Code → cc-sdd (tasks.md)",
        icon: "⚙",
        action: "Tick checkbox and commit with conventional message",
        time: "~2 min",
        troubleshooting: [
          { err: `GitHub issue not closed after merge`, fix: `'Closes #N' only auto-closes when the commit lands on the default branch. If merging via PR, the issue closes on PR merge — not on the commit itself.` },
          { err: `Commit message rejected by commitlint`, fix: `Check the type and scope format: \`feat(task-7): description\`. No capital letters, no period at end, scope in parentheses.` },
        ],
        code: `# Pre-commit checklist (Claude runs in order):
mise run test   # ← must pass

# Update README for affected sections:
# (e.g. new config env var → update Configuration section)

# Tick checkbox and commit (lint hook fires automatically):
# - [x] 1.2  Add signature validation middleware <!-- gh:#42 -->

git commit -m "feat(stripe): add webhook signature validation middleware

Implements task 1.2 from invoicing-platform spec.
Uses Stripe-Signature header with HMAC-SHA256.
Rejects replayed events older than 300s.

Closes #42"

# After commit: update project memory
/kiro:steering

# GitHub auto-closes issue #42 when this lands on main.`,
        detail: "test → README → checkbox → commit → steering. Lint runs automatically via the pre-commit hook. /kiro:steering captures patterns and decisions made during this task — so the next session starts with full context. CLAUDE.md itself is never touched autonomously.",
      },
      {
        tool: "Escape hatch  ·  ⚠ OUT-OF-BAND",
        icon: "⛔",
        action: "Manually mark a task done or blocked",
        time: "~2 min",
        code: `# Use when a task was completed outside the normal flow
# (hotfix, manual deploy, external team, etc.)

# Option A — ask Claude (keeps GitHub in sync):
"Mark task 1.2 as complete in tasks.md
and close issue #42 on GitHub with a comment
explaining it was resolved manually."

# Option B — direct file edit (break-glass):
# Edit tasks.md in your editor:
# - [x] 1.2  Add signature validation <!-- gh:#42 -->
# Then close issue #42 manually on GitHub.

# For blocked tasks — add a note, don't tick:
# - [ ] 3.1  Multi-tenant auth guard <!-- gh:#45 -->
#            <!-- blocked: waiting on IdP config -->`,
        detail: "Option A keeps checkbox and GitHub issue atomic — always prefer it. Option B is the break-glass fallback when you need to unblock the queue fast without a Claude session. For blocked tasks, add an inline comment instead of ticking — Claude's spec-impl reads these and skips them automatically.",
      },
      {
        tool: "You → Claude Code",
        icon: "✦",
        action: "Repeat the loop — always you who picks next",
        time: "ongoing",
        troubleshooting: [
          { err: `validate-impl fails with missing coverage`, fix: `A requirement has no corresponding task. Go back to tasks.md, add the missing task, create its GitHub Issue, and implement it before re-running validate-impl.` },
          { err: `Claude self-selects next task`, fix: `Re-state the rule from CLAUDE.md: 'Never self-select the next task. After each commit, stop and wait for explicit instruction.'` },
        ],
        code: `# After each approved commit:
/kiro:spec-status invoicing-platform
# Shows remaining unchecked tasks

# YOU choose the next task:
"Now work on task 2.1: PDF template engine.
Same process — plan first."

# Claude never self-selects the next task.
# You drive the queue.

# When all done, validate:
/kiro:validate-impl invoicing-platform`,
        detail: "The cadence is: you check status → you pick → Claude plans → you approve → Claude implements → you review → commit → repeat. /kiro:validate-impl runs a final compliance check against requirements before you open the PR.",
      },
      {
        tool: "OpenSpec users  ·  ⚠ POST-EXECUTION",
        icon: "⛔",
        action: "Archive change — merge spec deltas into permanent specs",
        time: "~1 min",
        troubleshooting: [
          { err: `Archive fails with conflict`, fix: `OpenSpec detected overlapping requirements between the spec delta and an existing spec. Review the conflict in openspec/changes/<id>/specs/ and resolve manually before re-running archive.` },
        ],
        code: `# Run once after all tasks are complete and the PR is merged:
/openspec:archive

# OpenSpec merges spec deltas into permanent living specs:
# openspec/changes/invoicing-platform/specs/invoicing/spec.md
# → merged into openspec/specs/invoicing/spec.md

# Moves change to archive:
# openspec/changes/invoicing-platform/
# → openspec/changes/archive/invoicing-platform/

# Dashboard reflects consolidated knowledge:
openspec view
# ════════════════════════════════════════════════
# Summary:
#   ● Specifications: +1 spec, +N requirements
#   ● Completed Changes: 1
# ════════════════════════════════════════════════

git add openspec/ && git commit -m "docs(spec): archive invoicing-platform openspec change"`,
        detail: "This step is unique to OpenSpec — there is no cc-sdd equivalent. It's what makes OpenSpec brownfield-aware: every archived change enriches the permanent specs in openspec/specs/, so future /openspec:proposal calls find existing context and never generate duplicate requirements. Merge the PR first, then archive — the spec should reflect what actually shipped.",
      }
    ],
  },
];
