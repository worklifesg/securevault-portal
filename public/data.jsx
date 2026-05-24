// SecureVault data layer — fetches from live API, falls back to cached state.
// Exposes window.SVData and window.SVDataLoader

const SVDataLoader = {
  _cache: {},
  _listeners: [],

  subscribe(fn) { this._listeners.push(fn); },
  _notify() { this._listeners.forEach(fn => fn()); },

  async fetchRepos() {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      if (data.repos) {
        this._cache.REPOS = data.repos.map((r, i) => ({
          id: r.id || `r${i}`,
          name: r.name,
          path: r.path || null,
          visibility: r.visibility,
          lang: r.lang,
          risk: r.risk || 0,
          findings: r.findings || 0,
          secrets: r.secrets || 0,
          drift: r.drift || 0,
          lastScan: r.lastScan || 'never',
          source: r.source,
          branch: r.branch || 'main',
          description: r.description || '',
        }));
        this._notify();
      }
    } catch (e) { console.warn('SVData: repo fetch failed', e); }
  },

  async fetchEvents() {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        this._cache.EVENTS = data.events;
        this._notify();
      }
    } catch (e) { console.warn('SVData: events fetch failed', e); }
  },

  async fetchTools() {
    try {
      const res = await fetch('/api/scan/tools');
      const data = await res.json();
      if (data.tools) {
        this._cache.TOOLS = data.tools;
        this._notify();
      }
    } catch (e) { console.warn('SVData: tools fetch failed', e); }
  },

  async fetchScanResults() {
    try {
      const [results, statusResp] = await Promise.all([
        fetch('/api/scan/results').then(r => r.json()).catch(() => []),
        fetch('/api/remediation/status').then(r => r.json()).catch(() => ({ statuses: {} })),
      ]);
      const statuses = (statusResp && statusResp.statuses) || {};
      this._cache.REM_STATUS = statuses;
      if (Array.isArray(results)) {
        const allFindings = [];
        const allSecrets = [];
        results.forEach(scan => {
          if (scan.findings) allFindings.push(...scan.findings);
          if (scan.secrets) allSecrets.push(...scan.secrets);
        });
        if (allFindings.length > 0) {
          this._cache.FINDINGS = allFindings.map((f, i) => applyStatus(normalizeFinding(f, i), statuses));
          this._notify();
        }
        if (allSecrets.length > 0) {
          this._cache.SECRETS = allSecrets.map((s, i) => normalizeSecret(s, i));
          this._notify();
        }
      }
    } catch (e) { console.warn('SVData: scan results fetch failed', e); }
  },

  // Manually set a finding's remediation status, then refresh.
  async setFindingStatus(finding, status, note) {
    try {
      const res = await fetch('/api/remediation/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finding.keyParts, status, note: note || '' }),
      });
      const out = await res.json();
      await this.fetchScanResults();
      return out;
    } catch (e) {
      console.warn('SVData: set status failed', e);
      return { error: e.message };
    }
  },

  // Clear a finding's override (back to "open"), then refresh.
  async resetFindingStatus(finding) {
    try {
      await fetch('/api/remediation/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finding.keyParts }),
      });
      await this.fetchScanResults();
    } catch (e) { console.warn('SVData: reset status failed', e); }
  },

  // Scan open GitHub PRs and auto-flip matching findings to pr_open.
  async syncPRStatus() {
    try {
      const res = await fetch('/api/remediation/sync', { method: 'POST' });
      const out = await res.json();
      await this.fetchScanResults();
      return out;
    } catch (e) {
      console.warn('SVData: PR sync failed', e);
      return { error: e.message };
    }
  },

  async triggerScan(repoFullName) {
    try {
      const res = await fetch('/api/scan/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName }),
      });
      return await res.json();
    } catch (e) {
      console.warn('SVData: scan trigger failed', e);
      return { error: e.message };
    }
  },

  async triggerLocalScan(projectPath) {
    try {
      const res = await fetch('/api/scan/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });
      return await res.json();
    } catch (e) {
      console.warn('SVData: local scan trigger failed', e);
      return { error: e.message };
    }
  },

  connectSSE() {
    try {
      const es = new EventSource('/api/events/stream');
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.events && data.events.length > 0) {
            this._cache.EVENTS = data.events;
            this._notify();
          }
        } catch {}
      };
      es.onerror = () => { setTimeout(() => this.connectSSE(), 5000); };
    } catch {}
  },

  refreshAll() {
    this.fetchRepos();
    this.fetchEvents();
    this.fetchTools();
    this.fetchScanResults();
  },

  getData() {
    return {
      REPOS: this._cache.REPOS || INITIAL_REPOS,
      FINDINGS: this._cache.FINDINGS || INITIAL_FINDINGS,
      SECRETS: this._cache.SECRETS || INITIAL_SECRETS,
      EVENTS: this._cache.EVENTS || INITIAL_EVENTS,
      DRIFT_TIMELINE: this._cache.DRIFT_TIMELINE || INITIAL_DRIFT,
      SCAN_JOBS: this._cache.SCAN_JOBS || INITIAL_SCAN_JOBS,
      REGRESSION: this._cache.REGRESSION || null,
      TOOLS: this._cache.TOOLS || [],
    };
  },
};

const SEV_NORM = { critical: 'critical', high: 'high', moderate: 'medium', medium: 'medium', low: 'low', info: 'low' };

function normalizeFinding(f, i) {
  const sev = SEV_NORM[(f.severity || '').toLowerCase()] || 'medium';
  const sevMap = { critical: 9.5, high: 7.5, medium: 5.0, low: 2.5 };
  // Stable key parts (raw fields) — must mirror lib/remediation.findingKey on the backend.
  const keyParts = { repo: f.repo || '', pkg: f.pkg || '', cve: f.cve || '' };
  return {
    id: f.id || `f${i + 1}`,
    severity: sev,
    cve: f.cve || f.url || `VULN-${i}`,
    pkg: f.pkg || 'unknown',
    installed: f.installed || 'unknown',
    fixed: f.fixed || (f.fixAvailable ? 'available' : 'none'),
    repo: f.repo || '—',
    repoId: f.repoId || `r${i}`,
    source: f.source || 'github',
    eco: detectEcosystem(f.pkg || ''),
    scanner: f.scanner || 'osv-scanner',
    cvss: f.cvss || sevMap[sev] || 5.0,
    status: 'open',
    statusSource: null,
    note: '',
    pr: null,
    prUrl: null,
    keyParts,
    remKey: `${keyParts.repo}::${keyParts.pkg}::${keyParts.cve}`,
    seen: 'just now',
    sla: f.severity === 'critical' ? '24h' : f.severity === 'high' ? '72h' : '7d',
    title: f.title || `Vulnerability in ${f.pkg}`,
    cwe: f.cwe || [],
  };
}

// Overlay a persisted status (manual or PR-derived) onto a normalized finding.
function applyStatus(nf, statuses) {
  const ov = statuses && statuses[nf.remKey];
  if (ov) {
    nf.status = ov.status || nf.status;
    nf.note = ov.note || '';
    nf.pr = ov.pr || null;
    nf.prUrl = ov.prUrl || null;
    nf.statusSource = ov.source || 'manual';
  }
  return nf;
}

function normalizeSecret(s, i) {
  return {
    id: s.id || `s${i + 1}`,
    type: s.type || 'Unknown Secret',
    repo: s.repo || '—',
    path: s.file || 'unknown',
    line: s.line || 0,
    commit: s.commit || null,
    preview: s.preview || '****…****',
    verified: s.verified || false,
    status: s.verified ? 'active' : 'historical',
    foundAt: 'just now',
  };
}

function detectEcosystem(pkg) {
  if (!pkg) return 'npm';
  const pyPkgs = ['certifi', 'pillow', 'jinja2', 'urllib3', 'flask', 'django', 'requests', 'pip-audit'];
  const goPkgs = ['runc', 'kubernetes', 'etcd'];
  if (pyPkgs.some(p => pkg.toLowerCase().includes(p))) return 'pypi';
  if (goPkgs.some(p => pkg.toLowerCase().includes(p))) return 'go';
  return 'npm';
}

// Initial data shown while API loads — minimal set from your real workspace
const INITIAL_REPOS = [];
const INITIAL_FINDINGS = [];
const INITIAL_SECRETS = [];
const INITIAL_EVENTS = [
  { ts: new Date().toLocaleTimeString('en-US', { hour12: false }), cls: 'info', text: 'SecureVault initializing — connecting to GitHub…', repo: '—', kind: 'scan' },
];
const INITIAL_DRIFT = [];
const INITIAL_SCAN_JOBS = [];

// Expose globally for the UI components
window.SVData = SVDataLoader.getData();
window.SVDataLoader = SVDataLoader;

// Kick off initial data load
SVDataLoader.fetchRepos();
SVDataLoader.fetchEvents();
SVDataLoader.fetchTools();
SVDataLoader.fetchScanResults();
SVDataLoader.connectSSE();
