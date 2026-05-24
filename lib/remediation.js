// Remediation status tracking. Two sources of truth, merged on read:
//   1. Manual overrides — set in the UI, persisted to .securevault/remediation.json
//   2. GitHub PR detection — open PRs whose title/body reference a finding's
//      package or CVE flip that finding to "pr_open" with a link to the PR.
// Manual overrides always win over auto-detected PR status.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { STATE_DIR, getGhEnv } = require('./config');

const STATUS_FILE = path.join(STATE_DIR, 'remediation.json');

const VALID_STATUSES = ['open', 'acknowledged', 'pr_open', 'resolved', 'wont_fix'];

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

// Stable key from raw finding fields. Must match the key the frontend builds.
function findingKey(repo, pkg, cve) {
  return `${repo || ''}::${pkg || ''}::${cve || ''}`;
}

function loadStatuses() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeStatuses(all) {
  ensureStateDir();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(all, null, 2));
}

function setStatus(key, patch) {
  const all = loadStatuses();
  all[key] = { ...all[key], ...patch, updatedAt: new Date().toISOString() };
  writeStatuses(all);
  return all[key];
}

function clearStatus(key) {
  const all = loadStatuses();
  delete all[key];
  writeStatuses(all);
}

// Fetch open PRs for a GitHub repo (owner/name). Local paths are skipped.
function fetchOpenPRs(repoFullName) {
  if (!repoFullName || !repoFullName.includes('/') || repoFullName.startsWith('/')) return [];
  try {
    const raw = execSync(
      `gh pr list --repo ${repoFullName} --state open --json number,title,body,headRefName,url --limit 50 2>/dev/null`,
      { encoding: 'utf-8', env: getGhEnv(), timeout: 15000 }
    );
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

// Does any open PR reference this package or CVE in its title/body/branch?
function matchPR(prs, pkg, cve) {
  const pkgLow = (pkg || '').toLowerCase();
  const cveLow = (cve || '').toLowerCase();
  return prs.find(pr => {
    const hay = `${pr.title || ''} ${pr.body || ''} ${pr.headRefName || ''}`.toLowerCase();
    if (cveLow && cveLow.length > 3 && hay.includes(cveLow)) return true;
    if (pkgLow && pkgLow.length > 2 && hay.includes(pkgLow)) return true;
    return false;
  });
}

// Walk all findings, group by GitHub repo, fetch open PRs once per repo, and
// flip matching findings to pr_open (unless a manual status already exists).
// Returns { matched, reposChecked }.
function syncPRStatus(findings) {
  const byRepo = new Map();
  for (const f of findings) {
    if (!f.repo || !f.repo.includes('/') || f.repo.startsWith('/')) continue; // github only
    if (!byRepo.has(f.repo)) byRepo.set(f.repo, []);
    byRepo.get(f.repo).push(f);
  }

  const manual = loadStatuses();
  let matched = 0;

  for (const [repo, repoFindings] of byRepo) {
    const prs = fetchOpenPRs(repo);
    if (!prs.length) continue;
    for (const f of repoFindings) {
      const key = findingKey(f.repo, f.pkg, f.cve);
      const existing = manual[key];
      // Don't overwrite a manual decision (acknowledged/resolved/wont_fix).
      if (existing && existing.source === 'manual') continue;
      const pr = matchPR(prs, f.pkg, f.cve);
      if (pr) {
        setStatus(key, { status: 'pr_open', source: 'github', pr: `#${pr.number}`, prUrl: pr.url });
        matched++;
      }
    }
  }

  return { matched, reposChecked: byRepo.size };
}

module.exports = {
  STATUS_FILE,
  VALID_STATUSES,
  findingKey,
  loadStatuses,
  setStatus,
  clearStatus,
  syncPRStatus,
};
