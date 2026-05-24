<p align="center">
  <img src="public/logo.svg" alt="SecureVault logo" width="104" height="104" />
</p>

<h1 align="center">SecureVault</h1>

<p align="center">
  <strong>Self-hosted vulnerability portal for developers who ship from WSL.</strong>
</p>

<p align="center">
  Index your GitHub repos &amp; local projects · scan for vulnerable dependencies and leaked secrets · all on <code>localhost</code>.
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="Node 18+" src="https://img.shields.io/badge/node-%3E%3D18-3c873a.svg" />
  <img alt="Self-hosted" src="https://img.shields.io/badge/hosting-self--hosted-0ea5e9.svg" />
  <img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-34d399.svg" />
</p>

---

SecureVault indexes your GitHub repos and local WSL projects, scans them for dependency vulnerabilities and leaked secrets, and presents everything in a single dashboard. No cloud service, no SaaS vendor — it runs on `localhost` and talks directly to your GitHub account.

```
                  ┌───────────────────────────────┐
                  │       SecureVault Portal       │
                  │     http://localhost:3000      │
                  └──────────────┬────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
     GitHub API           Local WSL scan         Scanner tools
     ─ repo list          ─ scan dirs            ─ grype
     ─ events stream      ─ package.json         ─ gitleaks
     ─ dependabot         ─ requirements.txt     ─ trufflehog
                          ─ go.mod / Cargo.toml  ─ syft / npm / pip-audit
```

Everything is configured from the **Settings** page in the UI — connect GitHub, point it at your
WSL workspace, and your repos and scan results show up in the dashboard.

---

## What it does

| Feature | How |
|---|---|
| **Repo index** | Lists all your GitHub repos (public + private) and local WSL projects with a `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc. |
| **On-demand scanning** | Click **Scan now** on any repo. Runs `npm audit`, `grype`, and `gitleaks`; maps findings to CVE IDs with CVSS scores. |
| **Secret detection** | Runs `gitleaks` on the filesystem (and `trufflehog` on git history) to find leaked API keys, tokens, and credentials — previews are redacted. |
| **Persistent results** | Findings are saved to `.securevault/results.json` and feed real risk/finding/secret counts back into each repo card — surviving restarts. |
| **Live activity feed** | Streams your GitHub push/PR/branch events via SSE. |
| **Tool status** | Shows which scanners are installed and their versions; missing tools are skipped during scans. |
| **Risk scoring** | Deterministic composite risk score per repo, weighted by finding severity and verified secrets. |

---

## Quick start

### Prerequisites

| Requirement | Minimum | Check |
|---|---|---|
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **GitHub CLI** *(or a token)* | 2.x | `gh --version` |
| **Git** | 2.x | `git --version` |

### 1. Get the code and install

**Just want to run it?** Clone directly:

```bash
git clone https://github.com/worklifesg/securevault-portal.git
cd securevault-portal
npm install
```

**Planning to contribute or customize?** [Fork it on GitHub](https://github.com/worklifesg/securevault-portal/fork) first, then clone your fork:

```bash
git clone https://github.com/<your-username>/securevault-portal.git
cd securevault-portal
npm install
```

Nothing is hardcoded to a specific account — you connect your own GitHub and point it at your own folders from the **Settings** page (step 4). No code editing required to use it against your own workspace.

### 2. Install scanning tools (optional but recommended)

```bash
bash scripts/install-scanners.sh
```

Installs security scanners to `~/.local/bin`:

| Tool | What it scans |
|---|---|
| [gitleaks](https://github.com/gitleaks/gitleaks) | Secrets in files (150+ patterns: AWS keys, tokens, passwords) |
| [grype](https://github.com/anchore/grype) | Dependency vulnerabilities via SBOM analysis |
| [syft](https://github.com/anchore/syft) | Software Bill of Materials (CycloneDX / SPDX) |
| [trufflehog](https://github.com/trufflesecurity/trufflehog) | Secrets in git history (verified against live APIs) |
| [pip-audit](https://github.com/pypa/pip-audit) | Python package vulnerabilities |

`npm audit` is built into Node.js — no extra install needed.

> **All scanners are optional.** SecureVault works without them — the dashboard shows which are installed and skips unavailable tools during scans.

### 3. Run

```bash
npm start          # or: npm run dev  (auto-restart on changes)
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Connect in the UI

Open **Settings** (bottom of the sidebar):

1. **GitHub connection** — if the `gh` CLI is logged in, SecureVault detects it automatically. Otherwise paste a personal access token (scopes: `repo`, `read:user`).
2. **Local scan directories** — add the folders that contain your WSL projects (e.g. `/home/you/projects`).
3. **Save** — your repos and local projects appear in **Repository Posture**. Hit **Scan now** on any card to populate findings.

That's it — no file editing required. Settings are saved to `.securevault/config.json` (gitignored).

---

## Configuration

Configuration is managed from the **Settings** page and persisted to `.securevault/config.json`.
You can also provide defaults via a `.env` file (see `.env.example`); the saved config overrides `.env`.

| Setting | Source | Default | Description |
|---|---|---|---|
| GitHub username | Settings / `GITHUB_USERNAME` | detected user | Used for the activity feed |
| GitHub token | Settings / `GITHUB_TOKEN` | — | Optional PAT; used when set, otherwise `gh` CLI auth is used |
| Scan directories | Settings / `SCAN_DIRS` | `$HOME` | Folders scanned for local projects |
| `PORT` | `.env` | `3000` | Server port |
| `SCANNER_BIN_PATH` | `.env` | `~/.local/bin` | Where scanner binaries live |

### GitHub authentication

SecureVault auto-detects auth in this order:

1. **Personal access token** saved in Settings (or `GITHUB_TOKEN` in `.env`) — used if present.
2. **`gh` CLI** — if you've run `gh auth login`, it's used automatically.

Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` and `read:user` scopes if you don't use the CLI.

---

## Dashboard views

### Overview
Composite risk score, severity breakdown, live activity feed, top repos by risk, and real scan-coverage metrics (repos indexed, repos scanned, open findings). Empty until you connect and scan.

### Vulnerabilities
Filterable, sortable table of every finding across scanned repos. Filter by severity, status, ecosystem, or repo. Expand a row for the CVE, CVSS, scanner, and a suggested version bump. Select findings and click **Remediate selected** to get a per-repo remediation plan.

### Secrets & Exposure
Detected secrets with redacted previews (first 4 + last 4 chars — full values are never stored). Shows file path, line, commit SHA (for history findings), and whether the credential was verified live.

### Repository Posture
Card grid of every repo: risk score, visibility, finding/secret counts, and a per-repo **Scan now** button. Includes a drift timeline and a workspace-composition summary derived from your real repos.

### Remediation
Kanban board grouping findings by status (Open / Acknowledged / PR open / Regression / Resolved / Won't fix). Cards show CVE, package, and target fix version.

### Drift & Events
Live SSE stream of your GitHub activity — pushes, PRs, branch changes, visibility changes — classified as Critical / Warning / Info / Benign, with a real breakdown of the recent events.

### Scan Management
Real metrics (repos in scope, repos scanned, total findings/secrets), the scan queue for the current session, and live scanner version/status detection.

### Settings
Connect GitHub (gh CLI or token), manage local scan directories, and view scanner tool status.

---

## API reference

All endpoints return JSON.

### Config & system
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + connection status |
| `GET` | `/api/config` | Effective config + auth status (never returns the token value) |
| `PUT` | `/api/config` | Update config (`{ githubUsername?, githubToken?, scanDirs? }`) |

### Repos
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/repos` | GitHub repos + local WSL projects, with persisted scan stats merged in |
| `GET` | `/api/repos/:owner/:repo` | Detailed repo metadata |
| `GET` | `/api/repos/:owner/:repo/vulnerabilities` | Dependabot alerts |

### Scanning
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/scan/tools` | Installed scanner tools and versions |
| `POST` | `/api/scan/repo` | Scan a GitHub repo (`{ "repoFullName": "owner/repo" }`) |
| `POST` | `/api/scan/local` | Scan a local directory (`{ "projectPath": "/path" }`) |
| `GET` | `/api/scan/results` | All scan results (persisted + in-flight) |
| `GET` | `/api/scan/result/:scanId` | A specific scan result |

### Events
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | Recent GitHub activity |
| `GET` | `/api/events/stream` | SSE stream of activity |

---

## How scanning works

### GitHub repos
1. The repo is shallow-cloned (`--depth 1`) to a temp dir (using your token or `gh` auth).
2. `npm audit` runs if `package.json` exists.
3. `grype` runs against the directory (cross-ecosystem SBOM scan).
4. `gitleaks` runs against the filesystem (secret patterns).
5. Results are normalized, **persisted to `.securevault/results.json`**, and the temp dir is deleted.

### Local WSL projects
Scanning happens in place (no clone) against the project path. Projects are auto-discovered by looking for manifest files (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`) in your configured scan directories.

Risk score = severity-weighted findings (critical 25 / high 12 / medium 5 / low 2) plus secrets (verified 30 / unverified 10), capped at 100.

---

## Project structure

```
securevault-portal/
├── server.js               Express entry point + /api/config, /api/health
├── lib/
│   ├── config.js           Persistent config + GitHub auth detection
│   └── store.js            Scan-result persistence + risk scoring
├── api/
│   ├── repos.js            Repo listing + local discovery (stats merged in)
│   ├── scan.js             Scanning engine (persists results)
│   └── events.js           GitHub activity + SSE stream
├── public/
│   ├── index.html          App shell (React via CDN)
│   ├── styles.css          Design system
│   ├── data.jsx            Live data layer (fetch + state)
│   ├── shared.jsx          Icons, badges, gauges, charts
│   ├── chrome.jsx          Sidebar + header
│   ├── overview.jsx        Home dashboard
│   ├── vulnerabilities.jsx Findings table + remediation plan modal
│   ├── views.jsx           Posture, Remediation, Drift, Secrets, Scans
│   ├── settings.jsx        Settings view (connect GitHub, scan dirs, tools)
│   ├── app.jsx             Root component + view switching
│   └── tweaks-panel.jsx    Accent + density controls
├── scripts/install-scanners.sh
├── .securevault/           Local state (gitignored): config.json, results.json
├── .env.example
└── package.json
```

---

## Security considerations

- **Localhost only** — the server binds to `localhost`; it is not exposed to the network.
- **Redacted secrets** — detected secrets show only first 4 + last 4 chars; full values are never persisted.
- **Local-only state** — config and results live under `.securevault/` (gitignored). If you enter a PAT in Settings it is stored there in plaintext; prefer `gh` CLI auth if you'd rather not store a token.
- **Read-only to your repos** — SecureVault never writes to or opens PRs against your repositories. The Remediation view produces a plan you apply yourself.
- **Temp files cleaned up** — cloned repos are deleted immediately after scanning.

---

## Troubleshooting

**Not connected to GitHub** — open Settings and either log in with `gh auth login` (then click *Re-check*) or paste a token.

**`gh: command not found`** — install the GitHub CLI (`sudo apt install gh` / `brew install gh`) and run `gh auth login`, or use a token in Settings.

**Scanners not detected** — ensure `~/.local/bin` is on your PATH, then re-run `bash scripts/install-scanners.sh`:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

**grype slow / empty on first run** — it downloads a vulnerability DB (~100MB) on first use. Run `grype db update` once.

**Port 3000 in use** — `PORT=4000 npm start`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | React 18 (CDN) + custom CSS design system |
| GitHub integration | `gh` CLI / personal access token |
| Vuln scanning | grype, npm audit, pip-audit |
| Secret detection | gitleaks, trufflehog |
| SBOM generation | syft |

## Contributing

Contributions are welcome. The [CONTRIBUTING guide](CONTRIBUTING.md) walks you from a
fresh fork to a running dev environment, explains the (deliberately build-step-free)
architecture, and lists the conventions — chief among them: **real data only**, **no
hardcoded identity**, and **read-only to your repos**.

**Branching model:** `main` is the protected release branch and `develop` is the
protected integration branch (and default). Both reject direct pushes — cut a
`feature/*` branch from `develop`, then open a PR into `develop`; it needs CI to pass
and one approving review before merging. Releases are cut by PR'ing `develop` → `main`.

- **Found a bug / want a feature?** Open a [GitHub issue](https://github.com/worklifesg/securevault-portal/issues).
- **Found a security vulnerability?** Please report it privately — see [SECURITY.md](SECURITY.md).

---

## Maintenance

SecureVault is small and self-hostable on purpose, so upkeep is light.

| Task | Cadence | How |
|---|---|---|
| **Update the vuln database** | Weekly-ish | `grype db update` (grype also auto-updates on use) |
| **Update scanner binaries** | Monthly | Re-run `bash scripts/install-scanners.sh` |
| **Update dependencies** | As needed | `npm outdated` → `npm update`; review `npm audit` |
| **Refresh GitHub auth** | When it expires | `gh auth login`, or paste a new token in Settings |
| **Clear stale local state** | Rarely | Delete `.securevault/` to reset config + results |

**Versioning.** Releases follow [SemVer](https://semver.org/). The current version
lives in `package.json`.

**Backups.** All meaningful state is in `.securevault/` (config + scan results). It's
gitignored, so back it up separately if you want to preserve scan history.

**Health check.** `curl http://localhost:3000/api/health` returns server + GitHub
connection status — handy for scripts or a watchdog.

---

## License

Released under the [MIT License](LICENSE) © 2026 Shraman Gupta.
