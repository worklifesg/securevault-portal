require('dotenv').config();
const express = require('express');
const path = require('path');

const scannerBin = process.env.SCANNER_BIN_PATH || `${process.env.HOME}/.local/bin`;
process.env.PATH = `${scannerBin}:${process.env.PATH}`;

const { reposRouter } = require('./api/repos');
const { scanRouter } = require('./api/scan');
const { eventsRouter } = require('./api/events');
const { remediationRouter } = require('./api/remediation');
const { getConfig, saveConfig, getAuthStatus } = require('./lib/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/repos', reposRouter);
app.use('/api/scan', scanRouter);
app.use('/api/events', eventsRouter);
app.use('/api/remediation', remediationRouter);

app.get('/api/health', (_req, res) => {
  const auth = getAuthStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    github_user: auth.effectiveUser || '(not configured)',
    connected: auth.connected,
  });
});

// Effective config + auth status. Never leaks the token value itself.
app.get('/api/config', (_req, res) => {
  const cfg = getConfig();
  const auth = getAuthStatus();
  res.json({
    github_user: auth.effectiveUser || cfg.githubUsername || '',
    scan_dirs: cfg.scanDirs,
    auth,
  });
});

// Persist config changes from the Settings UI.
app.put('/api/config', (req, res) => {
  try {
    const { githubUsername, githubToken, scanDirs } = req.body || {};
    saveConfig({ githubUsername, githubToken, scanDirs });
    const cfg = getConfig();
    const auth = getAuthStatus();
    res.json({ ok: true, github_user: auth.effectiveUser || cfg.githubUsername || '', scan_dirs: cfg.scanDirs, auth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const auth = getAuthStatus();
  console.log(`SecureVault running at http://localhost:${PORT}`);
  if (auth.connected) {
    console.log(`  GitHub: connected as ${auth.effectiveUser} (via ${auth.method})`);
  } else {
    console.warn('  GitHub: not connected — open Settings in the UI to connect.');
  }
  console.log(`  Scanner PATH: ${scannerBin}\n`);
});
