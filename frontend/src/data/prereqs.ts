export interface PrereqTool {
  name: string;
  why: string;
  check: string;
  install: string;
}

export const prereqs: Record<string, PrereqTool[]> = {
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

export const osLabels: Record<string, string> = { macos: "🍎  macOS", windows: "🪟  Windows", linux: "🐧  Linux" };
