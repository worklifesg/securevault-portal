<p align="center">
  <img src="public/logo.svg" alt="SecureVault" width="72" height="72" />
</p>

# Contributing to SecureVault

Thanks for your interest in improving SecureVault. This guide gets you from a fresh
clone to a running dev environment and explains how the project is laid out so you
can find your way around quickly.

---

## 1. Onboarding — get it running

```bash
# 1. Fork on GitHub, then clone your fork
git clone https://github.com/<your-username>/securevault-portal.git
cd securevault-portal

# 2. Install dependencies
npm install

# 3. (optional) install the security scanners
bash scripts/install-scanners.sh

# 4. Start in watch mode (auto-restarts on file changes)
npm run dev
```

Open <http://localhost:3000>, go to **Settings**, connect GitHub (`gh` CLI or a
token) and add a local scan directory. You're ready to develop.

> You do **not** need scanners installed to work on the UI or API plumbing — the app
> detects what's available and skips the rest. Install them only when you're working
> on scanning logic.

### Keeping your fork in sync

`develop` is the integration branch you'll branch from and target.

```bash
git remote add upstream https://github.com/worklifesg/securevault-portal.git
git fetch upstream
git checkout develop
git merge upstream/develop
```

---

## 2. How the project is built

SecureVault is deliberately **build-step-free**. There is no webpack/vite/tsc — the
browser compiles JSX at runtime via Babel-standalone loaded from a CDN.

```
Browser ──(loads)──> index.html ──> *.jsx compiled in-browser by Babel
   │
   └──(fetch /api/*)──> Express (server.js) ──> lib/ + api/ ──> scanners + GitHub
```

What that means for you:

- **No compile step.** Edit a `.jsx` file, refresh the browser. Done.
- **Plain React 18** via `React.createElement` / JSX. No hooks libraries, no router —
  view switching is hand-rolled in `app.jsx`.
- **Backend is vanilla Node + Express.** No ORM, no framework magic.

### Layout

| Path | Responsibility |
|---|---|
| `server.js` | Express entry point, `/api/health`, `/api/config` |
| `lib/config.js` | Persistent config + GitHub auth detection |
| `lib/store.js` | Scan-result persistence + deterministic risk scoring |
| `lib/remediation.js` | Builds read-only remediation plans |
| `api/repos.js` | GitHub repo listing + local project discovery |
| `api/scan.js` | The scanning engine (npm audit, grype, gitleaks, …) |
| `api/events.js` | GitHub activity + SSE stream |
| `api/remediation.js` | Remediation plan endpoints |
| `public/*.jsx` | The dashboard UI (one file per view) |
| `public/styles.css` | The design system |
| `scripts/install-scanners.sh` | Installs scanner binaries to `~/.local/bin` |

Local state (config + results) lives under `.securevault/` and is gitignored.

---

## 3. Conventions

These are the rules that keep the project coherent — please follow them.

- **Real data only.** Every number, chart, and table must come from a real fetched
  API response. No demo values, no `Math.random()` placeholders, no dead buttons.
  If there's no data yet, render an honest empty state.
- **No hardcoded identity.** Never bake in a GitHub username, org, or absolute home
  path. Read the user from config (`lib/config.js`) and use `os.homedir()` for paths.
- **Read-only to the user's repos.** SecureVault must never write to, commit to, or
  open PRs against a scanned repository. Remediation produces a *plan* the user
  applies themselves.
- **Secrets stay redacted.** Never log or persist a full secret value — first 4 +
  last 4 characters only.
- **Scanners are optional.** Any feature that depends on a scanner must degrade
  gracefully when that tool is missing.
- **Keep it dependency-light.** The whole point is a small, auditable, self-hostable
  tool. Discuss before adding a runtime dependency.

---

## 4. Adding a scanner

1. Add detection + version lookup in `api/scan.js` (see how `grype`/`gitleaks` are
   probed) so it shows up in `GET /api/scan/tools`.
2. Add the invocation in the scan pipeline and normalize its output into the common
   finding shape used by `lib/store.js`.
3. Add the install step to `scripts/install-scanners.sh`.
4. Document it in the README scanner table.

---

## 5. Branching model & submitting changes

SecureVault uses a two-branch model with protected branches — **nobody pushes
directly to `main` or `develop`**. All work flows through pull requests.

```
main      ←─ release branch. protected. only updated via PR from develop.
develop   ←─ integration branch (default). protected. PRs land here for review.
feature/* ←─ your work. branched from develop, merged back via PR.
```

Workflow:

1. Branch from `develop`:
   ```bash
   git checkout develop && git pull
   git checkout -b feat/short-description   # or fix/… , chore/… , docs/…
   ```
2. Make your change and test it in the browser against a real repo/scan.
3. Keep commits focused; write a clear message describing the *why*.
4. Push your branch and open a PR **targeting `develop`** (the default base).
   Add a short description and, for UI changes, a screenshot.
5. CI (`.github/workflows/ci.yml`) runs and at least one approving review is
   required before merge. Direct pushes are rejected by branch protection.

Before opening the PR, confirm:

- `npm start` boots with no console errors.
- The view you touched renders with real data and a sane empty state.
- No secrets, tokens, or absolute personal paths are committed.

Releases are cut by merging `develop` → `main` via PR.

---

## 6. Reporting bugs & security issues

- **Bugs / features:** open a GitHub issue with steps to reproduce.
- **Security vulnerabilities:** please follow [SECURITY.md](SECURITY.md) — do not file
  a public issue for a vulnerability.

Thanks for contributing!
