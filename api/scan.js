const { Router } = require('express');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getGhEnv } = require('../lib/config');
const { saveResult, loadResults } = require('../lib/store');
const { invalidateRepoCache } = require('./repos');

const router = Router();

const scanResults = new Map();

function toolAvailable(name) {
  try {
    execSync(`which ${name}`, { encoding: 'utf-8' });
    return true;
  } catch { return false; }
}

function getToolVersions() {
  const tools = [
    { name: 'npm', cmd: 'npm --version' },
    { name: 'pip-audit', cmd: 'pip-audit --version' },
    { name: 'grype', cmd: 'grype version' },
    { name: 'syft', cmd: 'syft version' },
    { name: 'trufflehog', cmd: 'trufflehog --version' },
    { name: 'gitleaks', cmd: 'gitleaks version' },
    { name: 'trivy', cmd: 'trivy --version' },
  ];

  return tools.map(t => {
    const installed = toolAvailable(t.name);
    let version = 'not installed';
    if (installed) {
      try {
        version = execSync(t.cmd, { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0];
      } catch { version = 'installed (version unknown)'; }
    }
    return { name: t.name, installed, version };
  });
}

function npmAudit(projectPath) {
  if (!fs.existsSync(path.join(projectPath, 'package.json'))) return [];

  // Yarn project (yarn.lock present, no package-lock.json) → use yarn audit
  const hasYarnLock = fs.existsSync(path.join(projectPath, 'yarn.lock'));
  const hasNpmLock  = fs.existsSync(path.join(projectPath, 'package-lock.json'));
  if (hasYarnLock && !hasNpmLock && toolAvailable('yarn')) {
    return yarnAudit(projectPath);
  }

  try {
    const raw = execSync('npm audit --json 2>/dev/null || true', {
      encoding: 'utf-8',
      cwd: projectPath,
      timeout: 60000,
    });
    const data = JSON.parse(raw);
    if (!data.vulnerabilities) return [];

    return Object.entries(data.vulnerabilities).map(([pkg, v]) => ({
      pkg,
      severity: v.severity || 'medium',
      title: v.title || `Vulnerability in ${pkg}`,
      url: v.url || '',
      via: Array.isArray(v.via) ? v.via.filter(x => typeof x === 'object').map(x => ({
        cve: x.cve || x.name || '',
        cvss: x.cvss?.score || 0,
        title: x.title || '',
        url: x.url || '',
      })) : [],
      fixAvailable: !!v.fixAvailable,
      range: v.range || '',
      installed: v.version || 'unknown',
    }));
  } catch { return []; }
}

function yarnAudit(projectPath) {
  try {
    // yarn audit --json emits one JSON object per line
    const raw = execSync('yarn npm audit --json 2>/dev/null || true', {
      encoding: 'utf-8',
      cwd: projectPath,
      timeout: 60000,
    });
    const findings = [];
    for (const line of raw.trim().split('\n').filter(Boolean)) {
      try {
        const obj = JSON.parse(line);
        // Yarn audit emits advisory objects with type "auditAdvisory"
        if (obj.type !== 'auditAdvisory') continue;
        const a = obj.data?.advisory || obj.data;
        if (!a) continue;
        findings.push({
          pkg: a.module_name || a.package_name || 'unknown',
          severity: a.severity || 'medium',
          title: a.title || `Vulnerability in ${a.module_name}`,
          url: a.url || a.references || '',
          cve: (a.cves && a.cves[0]) || a.github_advisories?.[0]?.ghsa_id || '',
          cvss: a.cvss?.score || 0,
          via: [],
          fixAvailable: !!(a.patched_versions && a.patched_versions !== '<0.0.0'),
          range: a.vulnerable_versions || '',
          installed: 'unknown',
          scanner: 'yarn-audit',
        });
      } catch { /* skip malformed lines */ }
    }
    return findings;
  } catch { return []; }
}

function gitleaksScan(projectPath) {
  if (!toolAvailable('gitleaks')) return [];
  try {
    const raw = execSync(
      `gitleaks detect --source "${projectPath}" --report-format json --no-git 2>/dev/null || true`,
      { encoding: 'utf-8', timeout: 60000 }
    );
    if (!raw.trim()) return [];
    return JSON.parse(raw).map(s => ({
      type: s.RuleID || 'unknown',
      file: s.File || '',
      line: s.StartLine || 0,
      preview: redact(s.Secret || ''),
      match: s.Match || '',
      entropy: s.Entropy || 0,
    }));
  } catch { return []; }
}

function trufflehogScan(repoUrl) {
  if (!toolAvailable('trufflehog')) return [];
  try {
    const raw = execSync(
      `trufflehog git "${repoUrl}" --json --only-verified 2>/dev/null | head -50 || true`,
      { encoding: 'utf-8', timeout: 120000 }
    );
    if (!raw.trim()) return [];
    return raw.trim().split('\n').filter(Boolean).map(line => {
      try {
        const s = JSON.parse(line);
        return {
          type: s.DetectorName || 'unknown',
          file: s.SourceMetadata?.Data?.Git?.file || '',
          line: s.SourceMetadata?.Data?.Git?.line || 0,
          commit: s.SourceMetadata?.Data?.Git?.commit || '',
          verified: s.Verified || false,
          preview: redact(s.Raw || ''),
        };
      } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

function redact(secret) {
  if (!secret || secret.length < 8) return '****';
  return secret.slice(0, 4) + '…' + secret.slice(-4);
}

function grypeScan(projectPath) {
  if (!toolAvailable('grype')) return [];
  try {
    const raw = execSync(
      `grype dir:"${projectPath}" -o json 2>/dev/null || true`,
      { encoding: 'utf-8', timeout: 120000 }
    );
    if (!raw.trim()) return [];
    const data = JSON.parse(raw);
    return (data.matches || []).map(m => ({
      pkg: m.artifact?.name || 'unknown',
      installed: m.artifact?.version || 'unknown',
      fixed: m.vulnerability?.fix?.versions?.[0] || 'none',
      cve: m.vulnerability?.id || '',
      severity: (m.vulnerability?.severity || 'medium').toLowerCase(),
      title: m.vulnerability?.description || '',
      cvss: m.vulnerability?.cvss?.[0]?.metrics?.baseScore || 0,
      source: 'grype',
    }));
  } catch { return []; }
}

router.get('/tools', (_req, res) => {
  res.json({ tools: getToolVersions() });
});

router.post('/repo', async (req, res) => {
  const { repoFullName } = req.body;
  if (!repoFullName) return res.status(400).json({ error: 'repoFullName required' });

  const scanId = `scan-${Date.now()}`;
  scanResults.set(scanId, { status: 'running', repo: repoFullName, startedAt: new Date().toISOString() });
  res.json({ scanId, status: 'started' });

  const startedAt = Date.now();
  try {
    const tmpDir = `/tmp/securevault-scan-${Date.now()}`;
    execSync(`gh repo clone ${repoFullName} "${tmpDir}" -- --depth 1 2>/dev/null`, { timeout: 60000, env: getGhEnv() });

    const findings = [];
    const secrets = [];

    const isYarn = fs.existsSync(path.join(tmpDir, 'yarn.lock')) && !fs.existsSync(path.join(tmpDir, 'package-lock.json'));
    const auditTool = isYarn ? 'yarn-audit' : 'npm-audit';

    const npmFindings = npmAudit(tmpDir);
    findings.push(...npmFindings.map(f => ({ ...f, scanner: f.scanner || auditTool, repo: repoFullName })));

    const grypeFinding = grypeScan(tmpDir);
    findings.push(...grypeFinding.map(f => ({ ...f, repo: repoFullName })));

    const leaks = gitleaksScan(tmpDir);
    secrets.push(...leaks.map(s => ({ ...s, repo: repoFullName })));

    execSync(`rm -rf "${tmpDir}"`);

    const result = {
      status: 'completed',
      repo: repoFullName,
      findings,
      secrets,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      tools: [auditTool, 'grype', 'gitleaks'],
    };
    scanResults.set(scanId, result);
    saveResult(repoFullName, result);
    invalidateRepoCache();
  } catch (err) {
    scanResults.set(scanId, {
      status: 'failed',
      repo: repoFullName,
      error: err.message,
    });
  }
});

router.post('/local', (req, res) => {
  const { projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'projectPath required' });
  if (!fs.existsSync(projectPath)) return res.status(404).json({ error: 'path not found' });

  const scanId = `scan-local-${Date.now()}`;
  const startedAt = Date.now();
  const findings = [];
  const secrets = [];

  const isYarnLocal = fs.existsSync(path.join(projectPath, 'yarn.lock')) && !fs.existsSync(path.join(projectPath, 'package-lock.json'));
  const auditToolLocal = isYarnLocal ? 'yarn-audit' : 'npm-audit';

  const npmFindings = npmAudit(projectPath);
  findings.push(...npmFindings.map(f => ({ ...f, scanner: f.scanner || auditToolLocal, repo: projectPath })));

  const grypeFinding = grypeScan(projectPath);
  findings.push(...grypeFinding.map(f => ({ ...f, repo: projectPath })));

  const leaks = gitleaksScan(projectPath);
  secrets.push(...leaks.map(s => ({ ...s, repo: projectPath })));

  const result = {
    status: 'completed',
    repo: projectPath,
    findings,
    secrets,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    tools: [auditToolLocal, 'grype', 'gitleaks'],
  };
  scanResults.set(scanId, result);
  saveResult(projectPath, result);
  invalidateRepoCache();

  res.json({ scanId, status: 'completed', findings: findings.length, secrets: secrets.length });
});

router.get('/result/:scanId', (req, res) => {
  const result = scanResults.get(req.params.scanId);
  if (!result) return res.status(404).json({ error: 'scan not found' });
  res.json(result);
});

router.get('/results', (_req, res) => {
  // Persisted results survive restarts; in-memory entries cover in-flight scans.
  const merged = new Map();
  const persisted = loadResults();
  for (const [key, result] of Object.entries(persisted)) {
    merged.set(key, { scanId: `persisted:${key}`, ...result });
  }
  for (const [id, result] of scanResults) {
    if (result.repo) merged.set(result.repo, { scanId: id, ...result });
  }
  res.json([...merged.values()]);
});

module.exports = { scanRouter: router };
