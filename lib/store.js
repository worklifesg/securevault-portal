// Persistent scan results. Stored in .securevault/results.json keyed by repo
// full name (GitHub) or absolute path (local). Lets repo cards show real
// risk/findings/secrets that survive restarts.

const fs = require('fs');
const path = require('path');
const { STATE_DIR } = require('./config');

const RESULTS_FILE = path.join(STATE_DIR, 'results.json');

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

function loadResults() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveResult(key, data) {
  ensureStateDir();
  const all = loadResults();
  all[key] = {
    repo: key,
    findings: data.findings || [],
    secrets: data.secrets || [],
    status: data.status || 'completed',
    completedAt: data.completedAt || new Date().toISOString(),
    durationMs: data.durationMs || 0,
    tools: data.tools || [],
  };
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(all, null, 2));
  return all[key];
}

function getResultFor(key) {
  return loadResults()[key] || null;
}

// Deterministic composite risk score (0–100) from severity-weighted findings.
const SEV_WEIGHT = { critical: 25, high: 12, medium: 5, low: 2 };

function computeRisk(findings = [], secrets = []) {
  let score = 0;
  for (const f of findings) score += SEV_WEIGHT[(f.severity || 'medium').toLowerCase()] ?? 5;
  for (const s of secrets) score += s.verified ? 30 : 10;
  return Math.min(100, Math.round(score));
}

function relativeTime(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

// Merge persisted scan data onto a repo record (name = GitHub full name, path = local abs path).
function statsForRepo({ name, path: repoPath }) {
  const entry = getResultFor(name) || (repoPath && getResultFor(repoPath)) || null;
  if (!entry) {
    return { risk: 0, findings: 0, secrets: 0, drift: 0, lastScan: 'never', lastScanAt: null };
  }
  return {
    risk: computeRisk(entry.findings, entry.secrets),
    findings: (entry.findings || []).length,
    secrets: (entry.secrets || []).length,
    drift: 0,
    lastScan: relativeTime(entry.completedAt),
    lastScanAt: entry.completedAt || null,
  };
}

module.exports = {
  RESULTS_FILE,
  loadResults,
  saveResult,
  getResultFor,
  computeRisk,
  relativeTime,
  statsForRepo,
};
