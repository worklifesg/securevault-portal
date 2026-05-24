// Persistent config + GitHub auth detection.
// Config lives in .securevault/config.json (gitignored) and overrides .env defaults.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STATE_DIR = path.join(ROOT, '.securevault');
const CONFIG_FILE = path.join(STATE_DIR, 'config.json');

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

function readFileConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

// Effective config: file overrides env, env provides defaults.
function getConfig() {
  const file = readFileConfig();
  const home = require('os').homedir();

  const githubUsername = file.githubUsername || process.env.GITHUB_USERNAME || '';
  const githubToken = file.githubToken || process.env.GITHUB_TOKEN || '';

  let scanDirs = file.scanDirs;
  if (!Array.isArray(scanDirs) || scanDirs.length === 0) {
    scanDirs = process.env.SCAN_DIRS ? process.env.SCAN_DIRS.split(',').map(s => s.trim()) : [home];
  }

  return { githubUsername, githubToken, scanDirs };
}

// Merge a partial update into the on-disk config.
function saveConfig(partial) {
  ensureStateDir();
  const file = readFileConfig();

  if (typeof partial.githubUsername === 'string') file.githubUsername = partial.githubUsername.trim();

  // Token: empty string clears it; undefined leaves it untouched.
  if (typeof partial.githubToken === 'string') {
    const t = partial.githubToken.trim();
    if (t) file.githubToken = t;
    else delete file.githubToken;
  }

  if (Array.isArray(partial.scanDirs)) {
    file.scanDirs = partial.scanDirs.map(s => String(s).trim()).filter(Boolean);
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(file, null, 2));
  return getConfig();
}

// Environment for spawning `gh` — injects the configured token when present.
function getGhEnv() {
  const { githubToken } = getConfig();
  if (!githubToken) return process.env;
  return { ...process.env, GH_TOKEN: githubToken, GITHUB_TOKEN: githubToken };
}

// Detect whether `gh` CLI is installed and logged in.
function detectGhCli() {
  try {
    execSync('gh --version', { encoding: 'utf-8', timeout: 5000 });
  } catch {
    return { installed: false, authed: false, user: null };
  }
  try {
    const out = execSync('gh api user --jq .login', {
      encoding: 'utf-8',
      timeout: 8000,
      env: process.env, // gh CLI's own keyring auth, not the stored token
    }).trim();
    return { installed: true, authed: !!out, user: out || null };
  } catch {
    return { installed: true, authed: false, user: null };
  }
}

// Validate the stored PAT by resolving its login via the GitHub API.
function detectToken() {
  const { githubToken } = getConfig();
  if (!githubToken) return { configured: false, valid: false, user: null };
  try {
    const out = execSync('gh api user --jq .login', {
      encoding: 'utf-8',
      timeout: 8000,
      env: { ...process.env, GH_TOKEN: githubToken, GITHUB_TOKEN: githubToken },
    }).trim();
    return { configured: true, valid: !!out, user: out || null };
  } catch {
    return { configured: true, valid: false, user: null };
  }
}

// Full auth picture for the Settings UI. Never returns the token value itself.
function getAuthStatus() {
  const cfg = getConfig();
  const ghCli = detectGhCli();
  const token = detectToken();

  // Effective user: a valid token wins, then gh CLI, then the configured name.
  const effectiveUser = (token.valid && token.user) || (ghCli.authed && ghCli.user) || cfg.githubUsername || null;
  const connected = token.valid || ghCli.authed;
  const method = token.valid ? 'token' : ghCli.authed ? 'gh-cli' : null;

  return {
    connected,
    method,
    effectiveUser,
    ghCli,                       // { installed, authed, user }
    tokenConfigured: token.configured,
    tokenValid: token.valid,
  };
}

module.exports = {
  STATE_DIR,
  getConfig,
  saveConfig,
  getGhEnv,
  detectGhCli,
  getAuthStatus,
};
