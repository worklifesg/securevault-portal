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
          visibility: r.visibility,
          lang: r.lang,
          risk: r.risk || Math.floor(Math.random() * 40 + 10),
          findings: r.findings || 0,
          secrets: r.secrets || 0,
          drift: r.drift || 0,
          lastScan: r.lastScan || 'pending',
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
      const res = await fetch('/api/scan/results');
      const data = await res.json();
      if (Array.isArray(data)) {
        const allFindings = [];
        const allSecrets = [];
        data.forEach(scan => {
          if (scan.findings) allFindings.push(...scan.findings);
          if (scan.secrets) allSecrets.push(...scan.secrets);
        });
        if (allFindings.length > 0) {
          this._cache.FINDINGS = allFindings.map((f, i) => normalizeFinding(f, i));
          this._notify();
        }
        if (allSecrets.length > 0) {
          this._cache.SECRETS = allSecrets.map((s, i) => normalizeSecret(s, i));
          this._notify();
        }
      }
    } catch (e) { console.warn('SVData: scan results fetch failed', e); }
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

function normalizeFinding(f, i) {
  const sevMap = { critical: 9.5, high: 7.5, medium: 5.0, low: 2.5 };
  return {
    id: f.id || `f${i + 1}`,
    severity: f.severity || 'medium',
    cve: f.cve || f.url || `VULN-${i}`,
    pkg: f.pkg || 'unknown',
    installed: f.installed || 'unknown',
    fixed: f.fixed || f.fixAvailable ? 'available' : 'none',
    repo: f.repo || '—',
    repoId: f.repoId || `r${i}`,
    source: f.source || 'github',
    eco: detectEcosystem(f.pkg || ''),
    scanner: f.scanner || 'osv-scanner',
    cvss: f.cvss || sevMap[f.severity] || 5.0,
    status: 'open',
    seen: 'just now',
    sla: f.severity === 'critical' ? '24h' : f.severity === 'high' ? '72h' : '7d',
    title: f.title || `Vulnerability in ${f.pkg}`,
    cwe: f.cwe || [],
  };
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
