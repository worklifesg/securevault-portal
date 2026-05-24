// Repository Posture view + Remediation Kanban + Drift stream + Secrets.
// Exposes window.SVViews.

const { Icon: VwIcon, SevPill: VwSev, repoShortName: vwShort } = window.SVUI;

// Trigger a scan for a repo (GitHub) or local project, then refresh the app data.
function runScan(repo, onState) {
  const loader = window.SVDataLoader;
  if (!loader) return;
  onState && onState('running');
  const done = (r) => {
    onState && onState(r && !r.error ? 'done' : 'error');
    setTimeout(() => loader.refreshAll(), 500);
  };
  if (repo.source === 'local' && repo.path) {
    loader.triggerLocalScan(repo.path).then(done);
  } else {
    // GitHub scans run async on the server; poll the result briefly.
    loader.triggerScan(repo.name).then(res => {
      if (!res || res.error || !res.scanId) return done(res);
      let tries = 0;
      const poll = setInterval(async () => {
        tries++;
        try {
          const r = await fetch(`/api/scan/result/${res.scanId}`).then(x => x.json());
          if (r.status === 'completed' || r.status === 'failed' || tries > 40) {
            clearInterval(poll);
            done(r);
          }
        } catch { clearInterval(poll); done({ error: 'poll failed' }); }
      }, 2000);
    });
  }
}

// Wraps runScan in a Promise that resolves on terminal state.
function runScanAsync(repo) {
  return new Promise(resolve => {
    runScan(repo, state => {
      if (state === 'done' || state === 'error') resolve(state);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// REPOSITORY POSTURE
// ─────────────────────────────────────────────────────────────

function Posture({ repos, onJump }) {
  const [bulkState, setBulkState] = React.useState('idle'); // idle | running | done
  const [bulkProgress, setBulkProgress] = React.useState({ done: 0, total: 0 });
  const cancelRef = React.useRef(false);

  const localRepos  = repos.filter(r => r.source === 'local');
  const githubRepos = repos.filter(r => r.source !== 'local');

  async function scanAll(source) {
    const targets = source === 'local' ? localRepos : githubRepos;
    if (!targets.length || bulkState === 'running') return;
    cancelRef.current = false;
    setBulkState('running');
    setBulkProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      await runScanAsync(targets[i]);
      setBulkProgress(p => ({ ...p, done: i + 1 }));
    }
    setBulkState('done');
    window.SVDataLoader && window.SVDataLoader.refreshAll();
    setTimeout(() => setBulkState('idle'), 4000);
  }

  return (
    <div className="view-inner">
      <div className="grid-2" style={{ gridTemplateColumns: '1.55fr 1fr', alignItems: 'start' }}>

        {/* Repo cards */}
        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Repositories</h2>
            <span className="lede">{repos.length} indexed · from GitHub + local scan directories</span>
            <span className="spacer" />
            {localRepos.length > 0 && (
              <button
                className="btn btn-sm btn-primary"
                disabled={bulkState === 'running'}
                onClick={() => scanAll('local')}
                title="Scan all local WSL projects in sequence"
              >
                {bulkState === 'running'
                  ? <><VwIcon.Refresh size={12} /> {bulkProgress.done}/{bulkProgress.total}…</>
                  : bulkState === 'done'
                    ? <><VwIcon.Check size={12} /> All done</>
                    : <><VwIcon.Play size={12} /> Scan all local</>}
              </button>
            )}
            {githubRepos.length > 0 && (
              <button
                className="btn btn-sm btn-ghost"
                disabled={bulkState === 'running'}
                onClick={() => scanAll('github')}
                title={`Scan all ${githubRepos.length} GitHub repos — may take several minutes`}
              >
                <VwIcon.Branch size={12} /> Scan all GitHub
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => onJump && onJump('settings')}>
              <VwIcon.Plus size={12} />
              Add path
            </button>
          </div>

          {bulkState === 'running' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', marginBottom: 12,
              background: 'var(--surface-sunk)', border: '1px solid var(--line)',
              borderRadius: 6, fontSize: 12.5,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', animation: 'pulse 1.4s ease-in-out infinite' }} />
              <span>Scanning {bulkProgress.done + 1} of {bulkProgress.total}…</span>
              <div style={{ flex: 1, height: 4, background: 'var(--surface-2)', borderRadius: 99 }}>
                <div style={{
                  width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%`,
                  height: '100%', background: 'var(--accent)', borderRadius: 99,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}
                onClick={() => { cancelRef.current = true; setBulkState('idle'); }}>
                Cancel
              </button>
            </div>
          )}

          <div className="posture-grid">
            {repos.length === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>No repositories indexed yet.</div>
                <p className="lede" style={{ marginTop: 6 }}>Connect GitHub or add a scan directory in Settings.</p>
                <button className="btn btn-accent btn-sm" style={{ marginTop: 10 }} onClick={() => onJump && onJump('settings')}>
                  <VwIcon.Settings size={12} /> Open Settings
                </button>
              </div>
            )}
            {repos.map(r => <PostureCard key={r.id} repo={r} />)}
          </div>
        </div>

        {/* Workspace composition — derived from real repo data */}
        <div>
          <VisibilitySummary repos={repos} />
        </div>
      </div>
    </div>
  );
}

function PostureCard({ repo }) {
  const r = repo;
  const [scanState, setScanState] = React.useState(null);
  const isAlert = r.findings > 0 && (r.risk >= 60 || r.secrets > 0);
  return (
    <div className={`posture ${isAlert ? 'alert' : ''}`}>
      <div className="top">
        <VwIcon.Branch size={13} />
        <span className="name">{vwShort(r.name)}</span>
        <span className={`visb ${r.visibility === 'public' ? 'pub' : 'prv'}`}>
          {r.visibility === 'public' ? <><VwIcon.Globe size={9} />&nbsp;public</> : <><VwIcon.Lock size={9} />&nbsp;private</>}
        </span>
        <span className="spacer" />
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{r.lang}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div className="score" style={{
            color: r.risk >= 75 ? 'var(--crit)' : r.risk >= 50 ? 'var(--high)' : r.risk >= 25 ? 'var(--med)' : 'var(--ok)',
          }}>{r.risk}</div>
          <div className="lede">composite risk score</div>
        </div>
      </div>

      <div className="meta">
        {r.findings > 0 && <VwSev level={r.findings > 5 ? 'high' : 'medium'} mute={`${r.findings} finding${r.findings === 1 ? '' : 's'}`} />}
        {r.secrets > 0 && <VwSev level="critical" mute={`${r.secrets} secret${r.secrets === 1 ? '' : 's'}`} />}
        {r.lastScan !== 'never' && r.findings === 0 && r.secrets === 0 && <VwSev level="ok" mute="clean" />}
        {r.lastScan === 'never' && <VwSev level="info" mute="not scanned" />}
      </div>

      <div className="footer">
        {r.source === 'local'
          ? <><VwIcon.Folder size={11} />&nbsp;WSL local</>
          : <><VwIcon.Branch size={11} />&nbsp;{r.branch}</>}
        <span className="spacer" />
        <VwIcon.Clock size={11} />
        <span>{r.lastScan === 'never' ? 'never scanned' : `scanned ${r.lastScan} ago`}</span>
      </div>

      <button
        className="btn btn-sm"
        style={{ marginTop: 10, justifyContent: 'center', width: '100%' }}
        disabled={scanState === 'running'}
        onClick={() => runScan(r, setScanState)}
      >
        {scanState === 'running'
          ? <><VwIcon.Refresh size={11} /> Scanning…</>
          : scanState === 'done'
            ? <><VwIcon.Check size={11} /> Scan complete</>
            : scanState === 'error'
              ? <><VwIcon.Alert size={11} /> Scan failed — retry</>
              : <><VwIcon.Play size={11} /> Scan now</>}
      </button>
    </div>
  );
}

function VisibilitySummary({ repos }) {
  const pub = repos.filter(r => r.visibility === 'public').length;
  const prv = repos.length - pub;
  const gh = repos.filter(r => r.source === 'github').length;
  const local = repos.length - gh;
  const rows = [
    { label: 'Public repositories', value: pub, hint: pub > 0 ? 'visible to anyone on GitHub' : 'none' },
    { label: 'Private repositories', value: prv, hint: 'restricted access' },
    { label: 'GitHub-sourced', value: gh, hint: 'indexed via gh / token' },
    { label: 'Local WSL projects', value: local, hint: 'discovered in scan directories' },
  ];
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginBottom: 4 }}>Workspace composition</h3>
      <p className="lede">across {repos.length} indexed {repos.length === 1 ? 'repo' : 'repos'}</p>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0',
          borderBottom: i === rows.length - 1 ? 'none' : '1px dashed var(--line)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{row.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{row.hint}</div>
          </div>
          <span className="mono" style={{ fontSize: 14, color: 'var(--ink)' }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REMEDIATION KANBAN
// ─────────────────────────────────────────────────────────────

const REM_OPTIONS = [
  { id: 'open',         label: 'Open' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'pr_open',      label: 'PR open' },
  { id: 'resolved',     label: 'Resolved' },
  { id: 'wont_fix',     label: "Won't fix" },
];

function Remediation({ findings }) {
  const [syncState, setSyncState] = React.useState('idle'); // idle | syncing | done | error
  const [syncMsg, setSyncMsg] = React.useState('');

  const cols = [
    { id: 'open',         label: 'Open',         desc: 'awaiting action' },
    { id: 'acknowledged', label: 'Acknowledged', desc: 'triaged, deferred' },
    { id: 'pr_open',      label: 'PR open',      desc: 'fix in review' },
    { id: 'resolved',     label: 'Resolved',     desc: 'fix merged' },
    { id: 'wont_fix',     label: "Won't fix",    desc: 'accepted risk' },
  ];

  const grouped = cols.reduce((acc, c) => {
    acc[c.id] = findings.filter(f => f.status === c.id);
    return acc;
  }, {});
  const openCount = grouped.open.length;

  async function setStatus(finding, status) {
    if (!window.SVDataLoader) return;
    if (status === 'open') await window.SVDataLoader.resetFindingStatus(finding);
    else await window.SVDataLoader.setFindingStatus(finding, status);
  }

  async function syncPRs() {
    if (!window.SVDataLoader || syncState === 'syncing') return;
    setSyncState('syncing'); setSyncMsg('');
    const out = await window.SVDataLoader.syncPRStatus();
    if (out && !out.error) {
      setSyncState('done');
      setSyncMsg(`Matched ${out.matched} finding${out.matched === 1 ? '' : 's'} across ${out.reposChecked} repo${out.reposChecked === 1 ? '' : 's'}`);
    } else {
      setSyncState('error');
      setSyncMsg((out && out.error) || 'sync failed');
    }
    setTimeout(() => setSyncState('idle'), 6000);
  }

  return (
    <div className="view-inner">
      <div className="filters">
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Grouped by status</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 10 }}>
          {openCount > 0 ? `${openCount} open finding${openCount === 1 ? '' : 's'} awaiting action` : 'no open findings'}
        </span>
        <span className="spacer" />
        {syncMsg && (
          <span style={{ fontSize: 11.5, color: syncState === 'error' ? 'var(--crit)' : 'var(--muted)', marginRight: 10 }}>{syncMsg}</span>
        )}
        <button className="btn btn-sm" disabled={syncState === 'syncing'} onClick={syncPRs}
          title="Check open GitHub PRs and flag findings whose package/CVE is referenced">
          {syncState === 'syncing'
            ? <><VwIcon.Refresh size={12} /> Checking PRs…</>
            : <><VwIcon.GitPR size={12} /> Sync PR status from GitHub</>}
        </button>
      </div>

      {findings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>No findings to remediate yet.</div>
          <p className="lede" style={{ marginTop: 6 }}>Run a scan from Repository Posture to populate this board.</p>
        </div>
      )}

      {findings.length > 0 && (
        <div className="kanban">
          {cols.map(c => (
            <div className="kcol" key={c.id}>
              <div className="kcol-h">
                <div>
                  <div className="name">{c.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, letterSpacing: '0.01em' }}>{c.desc}</div>
                </div>
                <span className="count">{grouped[c.id].length}</span>
              </div>
              <div className="kcol-body">
                {grouped[c.id].length === 0 && (
                  <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11.5, color: 'var(--muted-2)' }}>
                    nothing here
                  </div>
                )}
                {grouped[c.id].map(f => <KCard key={f.id} f={f} onSetStatus={setStatus} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KCard({ f, onSetStatus }) {
  const hasFix = f.fixed && f.fixed !== 'none';
  return (
    <div className="kcard">
      <div className="row">
        <VwSev level={f.severity} />
        {f.statusSource === 'github' && (
          <span className="tag" style={{ fontSize: 10, padding: '2px 5px' }} title="Status set automatically from a matching open PR">auto</span>
        )}
        <span className="sla">{f.sla}</span>
      </div>
      <div className="cve">{f.cve}</div>
      <div className="pkg">
        {f.pkg}
        {hasFix && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> → {f.fixed}</span>}
      </div>
      <div className="repo">{vwShort(f.repo)}</div>

      {f.status === 'pr_open' && f.prUrl && (
        <a href={f.prUrl} target="_blank" rel="noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px',
          background: 'var(--accent-tint)',
          border: '1px solid #f6cbbe',
          borderRadius: 4,
          fontSize: 11,
          color: 'var(--accent-ink)',
          marginTop: 4,
          textDecoration: 'none',
        }}>
          <VwIcon.GitPR size={11} />
          <span className="mono">{f.pr || 'PR'}</span>
          <span style={{ marginLeft: 'auto' }}>open on GitHub →</span>
        </a>
      )}

      {f.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{f.note}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>Status</span>
        <select
          className="sv-input"
          style={{ flex: 1, fontSize: 11.5, padding: '4px 6px' }}
          value={f.status}
          onChange={e => onSetStatus && onSetStatus(f, e.target.value)}
        >
          {REM_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DRIFT & EVENTS — live stream
// ─────────────────────────────────────────────────────────────

function DriftStream({ events }) {
  const [classFilter, setClassFilter] = React.useState('all');
  const classes = [
    { id: 'all', label: 'All' },
    { id: 'crit', label: 'Critical' },
    { id: 'warn', label: 'Warning' },
    { id: 'info', label: 'Info' },
    { id: 'benign', label: 'Benign' },
  ];
  const shown = classFilter === 'all' ? events : events.filter(e => e.cls === classFilter);
  return (
    <div className="view-inner">
      <div className="filters">
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Class</span>
        <div className="grp">
          {classes.map(c => (
            <button key={c.id} className={classFilter === c.id ? 'on' : ''} onClick={() => setClassFilter(c.id)}>{c.label}</button>
          ))}
        </div>
        <span className="spacer" />
        <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--ok)', boxShadow: '0 0 0 3px rgba(31,111,69,.15)' }} />
          live · SSE · /api/events/stream
        </span>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '2.3fr 1fr', alignItems: 'start' }}>
        <div className="stream">
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-sunk)', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, font: '500 13px/1.2 var(--font-sans)' }}>Event stream</h3>
            <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>{shown.length} event{shown.length === 1 ? '' : 's'}</span>
          </div>
          {shown.length === 0 && (
            <div style={{ padding: '24px 16px', fontSize: 12.5, color: 'var(--muted)' }}>
              {events.length === 0
                ? 'No recent GitHub activity. Events appear here once your account has public activity.'
                : 'No events in this class.'}
            </div>
          )}
          {shown.map((e, i) => (
            <div key={`${e.ts}-${i}`} className={`stream-row ${i === 0 ? 'new' : ''}`}>
              <span className="ts">{e.ts}</span>
              <EventIcon kind={e.kind} cls={e.cls} />
              <span style={{ color: 'var(--ink-2)' }}>{e.text}</span>
              <span className="repo">{e.repo}</span>
              <span className={`cls cls-${e.cls}`}>{e.cls}</span>
            </div>
          ))}
        </div>

        <div>
          <EventClassBreakdown events={events} />

          <div className="card" style={{ marginTop: 14, background: 'var(--surface-sunk)' }}>
            <h3 style={{ marginBottom: 4 }}>About this feed</h3>
            <p className="lede" style={{ margin: 0 }}>
              Live activity is pulled from the GitHub events API for the connected account and refreshed
              via server-sent events. Push, PR, branch, and visibility changes appear here as they happen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventClassBreakdown({ events }) {
  const order = [
    { cls: 'crit', label: 'Critical' },
    { cls: 'warn', label: 'Warning' },
    { cls: 'info', label: 'Info' },
    { cls: 'benign', label: 'Benign' },
  ];
  const counts = events.reduce((acc, e) => { acc[e.cls] = (acc[e.cls] || 0) + 1; return acc; }, {});
  const max = Math.max(1, ...order.map(o => counts[o.cls] || 0));
  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Event classes</h3>
      <p className="lede">{events.length} recent event{events.length === 1 ? '' : 's'}</p>
      {order.map((o, i) => (
        <ClassRow key={o.cls} cls={o.cls} count={counts[o.cls] || 0} label={o.label} max={max} last={i === order.length - 1} />
      ))}
    </div>
  );
}

function EventIcon({ kind, cls }) {
  const map = {
    secret:     { Ico: VwIcon.Key,      bg: 'var(--crit-tint)',  c: 'var(--crit)' },
    drift:      { Ico: VwIcon.Workflow, bg: 'var(--high-tint)',  c: 'var(--high)' },
    push:       { Ico: VwIcon.Branch,   bg: 'var(--info-tint)',  c: 'var(--info)' },
    scan:       { Ico: VwIcon.Refresh,  bg: 'var(--surface-2)',  c: 'var(--muted)' },
    pr:         { Ico: VwIcon.GitPR,    bg: 'var(--ok-tint)',    c: 'var(--ok)' },
    repo:       { Ico: VwIcon.Box,      bg: 'var(--surface-2)',  c: 'var(--muted)' },
    regression: { Ico: VwIcon.Alert,    bg: 'var(--crit-tint)',  c: 'var(--crit)' },
  };
  const m = map[kind] || { Ico: VwIcon.Activity, bg: 'var(--surface-2)', c: 'var(--muted)' };
  const { Ico, bg, c } = m;
  return (
    <span style={{
      width: 22, height: 22,
      background: bg, color: c,
      borderRadius: 99, display: 'grid', placeItems: 'center',
    }}>
      <Ico size={11} />
    </span>
  );
}

function ClassRow({ cls, count, label, last, max = 1 }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '70px 1fr 36px',
      alignItems: 'center', gap: 10,
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
      fontSize: 12,
    }}>
      <span className={`cls cls-${cls}`} style={{ justifySelf: 'start' }}>{label}</span>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)' }}>
        <div style={{
          width: `${Math.min(100, (count / max) * 100)}%`, height: '100%', borderRadius: 99,
          background: cls === 'crit' ? 'var(--crit)' : cls === 'warn' ? 'var(--high)' : cls === 'info' ? 'var(--info)' : 'var(--muted-2)',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--ink)' }}>{count}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECRETS view
// ─────────────────────────────────────────────────────────────

function SecretsView({ secrets }) {
  const verified = secrets.filter(s => s.verified).length;
  const historical = secrets.filter(s => s.status === 'historical').length;
  const active = secrets.filter(s => s.status === 'active').length;
  return (
    <div className="view-inner">
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <SecretStat label="Verified live" value={String(verified)} accent={verified > 0} footnote={verified > 0 ? 'confirmed via API probe — rotate immediately' : 'no verified live credentials'} />
        <SecretStat label="Active (unverified)" value={String(active)} footnote="pattern matches not yet confirmed" />
        <SecretStat label="Historical" value={String(historical)} footnote="found in git history" />
      </div>

      <div className="tbl-wrap">
        <div className="tbl-head">
          <h3>Secrets & credentials</h3>
          <span className="lede">redacted preview only · full value never persisted</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th style={{ width: 200 }}>Type</th>
              <th>Location</th>
              <th style={{ width: 160 }}>Preview</th>
              <th style={{ width: 110 }}>Classification</th>
              <th style={{ width: 100 }}>Found</th>
            </tr>
          </thead>
          <tbody>
            {secrets.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '22px 14px', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                  No secrets detected. Run a scan to check your repos and local projects.
                </td>
              </tr>
            )}
            {secrets.map(s => (
              <tr key={s.id}>
                <td>
                  <span style={{
                    width: 22, height: 22, borderRadius: 99,
                    background: s.verified ? 'var(--crit-tint)' : 'var(--surface-2)',
                    color: s.verified ? 'var(--crit)' : 'var(--muted)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <VwIcon.Key size={11} />
                  </span>
                </td>
                <td>
                  <div style={{ font: '500 13px var(--font-sans)' }}>{s.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {s.verified ? 'Trufflehog verified · active credential' : 'pattern match · unverified'}
                  </div>
                </td>
                <td>
                  <div className="mono" style={{ fontSize: 12.5 }}>{s.repo}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {s.path}:{s.line}
                    {s.commit && <> · commit {s.commit}</>}
                  </div>
                </td>
                <td>
                  <span className="mono" style={{
                    fontSize: 12,
                    padding: '3px 7px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    color: 'var(--ink-2)',
                  }}>{s.preview}</span>
                </td>
                <td>
                  {s.verified
                    ? <VwSev level="critical" mute="verified live" />
                    : s.status === 'active'
                      ? <VwSev level="high" mute="active" />
                      : <VwSev level="medium" mute="historical" />}
                </td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{s.foundAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecretStat({ label, value, footnote, accent }) {
  return (
    <div className="stat">
      <div className="stat-label">
        {accent && <span style={{ width:6, height:6, borderRadius:99, background:'var(--crit)' }} />}
        {label}
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-foot"><span>{footnote}</span></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCAN MANAGEMENT view
// ─────────────────────────────────────────────────────────────

function ScansView({ jobs, tools }) {
  const repos = window.SVData.REPOS || [];
  const scanned = repos.filter(r => r.lastScan && r.lastScan !== 'never').length;
  const totalFindings = (window.SVData.FINDINGS || []).length;
  const totalSecrets = (window.SVData.SECRETS || []).length;
  return (
    <div className="view-inner">
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatPlain label="Repos in scope"  value={String(repos.length)} foot={`${repos.filter(r => r.source === 'github').length} GitHub · ${repos.filter(r => r.source === 'local').length} local WSL`} />
        <StatPlain label="Repos scanned"   value={String(scanned)} foot={scanned === 0 ? 'run a scan from Repository Posture' : `${repos.length - scanned} not yet scanned`} />
        <StatPlain label="Total findings"  value={String(totalFindings)} foot="across all scanned repos" />
        <StatPlain label="Secrets found"   value={String(totalSecrets)} foot="from gitleaks / trufflehog" />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        <div className="tbl-wrap">
          <div className="tbl-head">
            <h3>Scan queue</h3>
            <span className="lede">scans run this session · trigger from Repository Posture</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Repo / Path</th>
                <th style={{ width: 110 }}>Trigger</th>
                <th style={{ width: 110 }}>Status</th>
                <th>Tools</th>
                <th style={{ width: 90 }}>Findings</th>
                <th style={{ width: 70 }}>t</th>
              </tr>
            </thead>
            <tbody>
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '22px 14px', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                    No scans run this session. Use <b>Scan now</b> on any repository in Repository Posture.
                  </td>
                </tr>
              )}
              {(jobs || []).map(j => (
                <tr key={j.id}>
                  <td className="repo">{j.repo}</td>
                  <td>
                    <span className="tag" style={{ textTransform: 'capitalize' }}>{j.trigger}</span>
                  </td>
                  <td>
                    <JobStatus status={j.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {j.tools.map(t => (
                        <span key={t} className="tag tag-mono" style={{ fontSize: 10.5 }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="mono" style={{ color: j.status === 'completed' ? 'var(--ink)' : 'var(--muted-2)' }}>{j.findings}</td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{j.t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>How scanning works</h3>
            <p className="lede">on-demand · results persist locally</p>
            <Schedule label="GitHub repos" desc="shallow-cloned to a temp dir, then npm audit + Grype + Gitleaks" cadence="on-demand" />
            <Schedule label="Local projects" desc="scanned in place from your configured WSL directories" cadence="on-demand" />
            <Schedule label="Persistence" desc="findings saved to .securevault/results.json and survive restarts" cadence="local" last />
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 4 }}>Tool status</h3>
            <p className="lede">scanner versions & DB freshness</p>
            {(tools && tools.length > 0 ? tools : [
              { name: 'npm', version: '—', installed: false },
              { name: 'grype', version: '—', installed: false },
              { name: 'syft', version: '—', installed: false },
              { name: 'trufflehog', version: '—', installed: false },
              { name: 'gitleaks', version: '—', installed: false },
              { name: 'trivy', version: '—', installed: false },
            ]).map((t, i, arr) => (
              <ToolRow key={t.name} name={t.name} version={t.version} db={t.installed ? 'ready' : 'not available'} ok={t.installed} warn={!t.installed} last={i === arr.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobStatus({ status }) {
  if (status === 'running') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent)', animation: 'pulse 1.4s ease-in-out infinite' }} />
      running
    </span>
  );
  if (status === 'queued') return <span style={{ fontSize: 12, color: 'var(--muted)' }}>· queued</span>;
  return <span className="tag" style={{ background: 'var(--ok-tint)', color: 'var(--ok)', borderColor: 'transparent' }}>completed</span>;
}

function StatPlain({ label, value, unit, foot }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value}{unit && <small style={{ marginLeft: 4 }}>{unit}</small>}</div>
      <div className="stat-foot"><span>{foot}</span></div>
    </div>
  );
}

function Schedule({ label, desc, cadence, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: 99,
        background: 'var(--ok)', marginTop: 6,
        boxShadow: '0 0 0 3px rgba(31,111,69,.12)',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{cadence}</span>
    </div>
  );
}

function ToolRow({ name, version, db, ok, warn, last }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10,
      padding: '8px 0',
      alignItems: 'center',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
      fontSize: 12,
    }}>
      <span className="mono" style={{ color: 'var(--ink)' }}>{name}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{version}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 1 }}>{db}</div>
      </div>
      <span style={{
        width: 8, height: 8, borderRadius: 99,
        background: ok ? 'var(--ok)' : warn ? 'var(--high)' : 'var(--crit)',
      }} />
    </div>
  );
}

window.SVViews = { Posture, Remediation, DriftStream, SecretsView, ScansView };
