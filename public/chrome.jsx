// Sidebar + Header. Exposes window.SVChrome.

const { Icon } = window.SVUI;

const NAV = [
  { id: 'overview',  label: 'Overview',           icon: Icon.Gauge,    section: 'SECURITY' },
  { id: 'vulns',     label: 'Vulnerabilities',    icon: Icon.Bug,      section: 'SECURITY' },
  { id: 'secrets',   label: 'Secrets & Exposure', icon: Icon.Key,      crit: true, section: 'SECURITY' },
  { id: 'posture',   label: 'Repository Posture', icon: Icon.Shield,   section: 'POSTURE' },
  { id: 'remediation', label: 'Remediation',      icon: Icon.GitPR,    section: 'POSTURE' },
  { id: 'drift',     label: 'Drift & Events',     icon: Icon.Activity, section: 'POSTURE' },
  { id: 'scans',     label: 'Scan Management',    icon: Icon.Refresh,  section: 'OPS' },
];

function Sidebar({ view, setView }) {
  const data = window.SVData || {};
  const findings = data.FINDINGS || [];
  const counts = {
    vulns: findings.length,
    secrets: (data.SECRETS || []).length,
    remediation: findings.filter(f => f.status === 'open').length,
  };
  const grouped = NAV.reduce((acc, n) => {
    (acc[n.section] = acc[n.section] || []).push(n);
    return acc;
  }, {});
  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-logo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l9 4v6c0 5.5-3.8 10-9 11-5.2-1-9-5.5-9-11V6l9-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <span className="sb-name">SecureVault</span>
        <span className="sb-version">v2.0</span>
      </div>

      {Object.entries(grouped).map(([section, items]) => (
        <React.Fragment key={section}>
          <div className="sb-section">{section}</div>
          {items.map(item => {
            const Ico = item.icon;
            const active = view === item.id;
            return (
              <div
                key={item.id}
                className={`sb-item ${active ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <Ico />
                <span>{item.label}</span>
                {counts[item.id] > 0 && (
                  <span className={`sb-count ${item.crit ? 'crit' : ''}`}>{counts[item.id]}</span>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}

      <div className="sb-section" style={{ marginTop: 'auto' }}>SYSTEM</div>
      <div className={`sb-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
        <Icon.Settings />
        <span>Settings</span>
      </div>

      <UserFooter />
    </aside>
  );
}

const TITLES = {
  overview:    { h: 'Overview',              crumb: '/ home' },
  vulns:       { h: 'Vulnerabilities',       crumb: '/ findings · all repos' },
  secrets:     { h: 'Secrets & Exposure',    crumb: '/ credentials in scope' },
  posture:     { h: 'Repository Posture',    crumb: '/ all repositories' },
  remediation: { h: 'Remediation',           crumb: '/ open patches & rollback' },
  drift:       { h: 'Drift & Events',        crumb: '/ live stream' },
  scans:       { h: 'Scan Management',       crumb: '/ jobs & schedules' },
  settings:    { h: 'Settings',              crumb: '/ connection & scanners' },
};

function Header({ view, scanning, onScan }) {
  const t = TITLES[view] || TITLES.overview;
  return (
    <div className="hdr">
      <div className="hdr-title">
        <span className="crumb">securevault {t.crumb}</span>
        <h1>{t.h}</h1>
      </div>

      <div className="spacer" />

      <div className="hdr-search">
        <Icon.Search size={14} />
        <input placeholder="Search CVE, package, repo…" />
        <kbd>⌘K</kbd>
      </div>

      <div className={`hdr-status ${scanning ? 'scanning' : ''}`}>
        <span className="dot" />
        {scanning
          ? <span>Loading workspace…</span>
          : <span>{(window.SVData.REPOS || []).length} repos indexed</span>}
      </div>

      <button className="btn btn-primary" onClick={() => window.SVDataLoader && window.SVDataLoader.refreshAll()}>
        <Icon.Refresh size={13} />
        Refresh
      </button>
    </div>
  );
}

function UserFooter() {
  const [user, setUser] = React.useState(null);
  React.useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setUser(d.github_user))
      .catch(() => {});
  }, []);
  const initials = user ? user.slice(0, 2).toUpperCase() : '??';
  const repoCount = (window.SVData.REPOS || []).length;
  return (
    <div className="sb-foot">
      <div className="sb-avatar">{initials}</div>
      <div className="sb-who">
        {user || 'Not configured'}
        <small>Solo workspace · {repoCount || '…'} repos</small>
      </div>
    </div>
  );
}

window.SVChrome = { Sidebar, Header };
