const { Router } = require('express');
const { loadResults } = require('../lib/store');
const {
  VALID_STATUSES,
  findingKey,
  loadStatuses,
  setStatus,
  clearStatus,
  syncPRStatus,
} = require('../lib/remediation');

const router = Router();

// All persisted status overrides, keyed by repo::pkg::cve.
router.get('/status', (_req, res) => {
  res.json({ statuses: loadStatuses() });
});

// Manually set (or update) a finding's status.
router.put('/status', (req, res) => {
  const { repo, pkg, cve, status, note } = req.body || {};
  if (!repo || !status) return res.status(400).json({ error: 'repo and status required' });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
  }
  const key = findingKey(repo, pkg, cve);
  const updated = setStatus(key, { status, note: note || '', source: 'manual' });
  res.json({ key, ...updated });
});

// Reset a finding back to "open" (removes any override).
router.delete('/status', (req, res) => {
  const { repo, pkg, cve } = req.body || {};
  if (!repo) return res.status(400).json({ error: 'repo required' });
  clearStatus(findingKey(repo, pkg, cve));
  res.json({ ok: true });
});

// Scan open GitHub PRs and auto-flip matching findings to pr_open.
router.post('/sync', (_req, res) => {
  const persisted = loadResults();
  const findings = [];
  for (const entry of Object.values(persisted)) {
    for (const f of entry.findings || []) findings.push(f);
  }
  const result = syncPRStatus(findings);
  res.json({ ok: true, ...result });
});

module.exports = { remediationRouter: router };
