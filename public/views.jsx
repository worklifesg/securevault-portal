// Repository Posture view + Remediation Kanban + Drift stream + Secrets.
// Exposes window.SVViews.

const { Icon: VwIcon, SevPill: VwSev, Sparkline: VwSpark, EcoBadge: VwEco } = window.SVUI;

// ─────────────────────────────────────────────────────────────
// REPOSITORY POSTURE
// ─────────────────────────────────────────────────────────────

function Posture({ repos, drift, onJump }) {
  return (
    <div className="view-inner">
      {/* Toolbar */}
      <div className="filters">
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>View</span>
        <div className="grp">
          <button className="on">Cards</button>
          <button>Table</button>
          <button>Matrix</button>
        </div>
        <span className="div" />
        <span className="chip">visibility: all</span>
        <span className="chip">source: all</span>
        <span className="chip">ecosystem: any</span>
        <span className="spacer" />
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{(window.SVData.REPOS || []).length} repos indexed</span>
        <button className="btn btn-ghost btn-sm">
          <VwIcon.Plus size={12} />
          Watch new path
        </button>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.55fr 1fr', alignItems: 'start' }}>

        {/* Repo cards */}
        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Repositories</h2>
            <span className="lede">composite risk score · auto-discovered via GitHub App + WSL agent</span>
          </div>
          <div className="posture-grid">
            {repos.map(r => <PostureCard key={r.id} repo={r} />)}
          </div>
        </div>

        {/* Drift timeline */}
        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Drift timeline</h2>
            <span className="lede">last 72h · all repos</span>
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => onJump && onJump('drift')}>
              Full event stream <VwIcon.ArrowRt size={12} />
            </button>
          </div>
          <div className="card" style={{ padding: '18px 22px 14px' }}>
            <div className="tl">
              {drift.map((d, i) => (
                <div key={i} className={`tl-item ${d.kind}`}>
                  <div className="when">{d.when} · <span style={{ fontFamily: 'var(--font-mono)' }}>{d.repo}</span></div>
                  <div className="what">{d.what}</div>
                  <div className="who">{d.who}</div>
                  {d.diff && (
                    <div className="diff">
                      {d.diff.map(([k, b, a]) => (
                        <React.Fragment key={k}>
                          <span className="lbl">{k}</span>
                          <span><span className="before">{b}</span> <span style={{ color: 'var(--muted)' }}>→</span> <span className="after">{a}</span></span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Policy compliance summary */}
          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 4 }}>Policy compliance</h3>
            <p className="lede">naming + visibility rules</p>
            <PolicyRow ok name="prod-* repos always private" detail="2/2 repos compliant" />
            <PolicyRow ok name="infra-* repos require signed commits" detail="1/1 repos compliant" />
            <PolicyRow warn name="auth-* repos require 2 reviewers" detail="1 violation — auth-service reduced to 1 reviewer today" />
            <PolicyRow ok name="No public repos in payments-* family" detail="all private" last />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostureCard({ repo }) {
  const r = repo;
  const sparkValues = genTrend(r.risk);
  const isAlert = r.findings > 0 && (r.risk >= 60 || r.secrets > 0);
  return (
    <div className={`posture ${isAlert ? 'alert' : ''}`}>
      <div className="top">
        <VwIcon.Branch size={13} />
        <span className="name">{r.name.replace('worklifesg/', '')}</span>
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
          <div className="lede">composite risk · 7-day trend</div>
        </div>
        <VwSpark
          values={sparkValues}
          w={100}
          h={32}
          color={r.risk >= 75 ? 'var(--crit)' : r.risk >= 50 ? 'var(--high)' : 'var(--muted-2)'}
        />
      </div>

      <div className="meta">
        {r.findings > 0 && <VwSev level={r.findings > 5 ? 'high' : 'medium'} mute={`${r.findings} finding${r.findings === 1 ? '' : 's'}`} />}
        {r.secrets > 0 && <VwSev level="critical" mute={`${r.secrets} secret${r.secrets === 1 ? '' : 's'}`} />}
        {r.drift > 0 && <VwSev level="info" mute={`${r.drift} drift event${r.drift === 1 ? '' : 's'}`} />}
        {r.findings === 0 && r.secrets === 0 && r.drift === 0 && <VwSev level="ok" mute="clean" />}
      </div>

      <div className="footer">
        {r.source === 'local'
          ? <><VwIcon.Folder size={11} />&nbsp;WSL local</>
          : <><VwIcon.Branch size={11} />&nbsp;{r.branch}</>}
        <span className="spacer" />
        <VwIcon.Clock size={11} />
        <span>scanned {r.lastScan} ago</span>
      </div>
    </div>
  );
}

function PolicyRow({ ok, warn, name, detail, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 99,
        display: 'grid', placeItems: 'center',
        background: ok ? 'var(--ok-tint)' : 'var(--high-tint)',
        color: ok ? 'var(--ok)' : 'var(--high)',
      }}>
        {ok ? <VwIcon.Check size={11} /> : <VwIcon.Alert size={11} />}
      </span>
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{detail}</div>
      </div>
    </div>
  );
}

function genTrend(risk) {
  const out = [];
  let v = Math.max(8, risk - 22);
  for (let i = 0; i < 13; i++) {
    v += Math.sin(i * (risk * 0.07)) * 6 + (i / 12) * (risk - v) * 0.4 + 1;
    out.push(Math.max(2, v));
  }
  out.push(risk);
  return out;
}

// ─────────────────────────────────────────────────────────────
// REMEDIATION KANBAN
// ─────────────────────────────────────────────────────────────

function Remediation({ findings, regression }) {
  const cols = [
    { id: 'open',         label: 'Open',         desc: 'awaiting action' },
    { id: 'acknowledged', label: 'Acknowledged', desc: 'SLA paused' },
    { id: 'pr_open',      label: 'PR open',      desc: 'awaiting merge' },
    { id: 'regression',   label: 'Regression',   desc: 'deploy broke' },
    { id: 'resolved',     label: 'Resolved',     desc: '7-day window' },
    { id: 'wont_fix',     label: "Won't fix",    desc: 'accepted risk' },
  ];

  // Synthesize some additional cards to look full
  const synth = [
    ...findings,
    { id:'fr1', severity:'medium', cve:'CVE-2024-19002', pkg:'urllib3', installed:'2.0.4', fixed:'2.2.1', repo:'worklifesg/data-pipeline', status:'resolved', sla:'closed', resolvedAgo:'2d' },
    { id:'fr2', severity:'high',   cve:'CVE-2024-11053', pkg:'curl',    installed:'8.6.0', fixed:'8.8.0', repo:'worklifesg/edge-gateway', status:'resolved', sla:'closed', resolvedAgo:'5d' },
    { id:'fw1', severity:'low',    cve:'CVE-2023-50447', pkg:'pillow',  installed:'10.0.1', fixed:'10.3.0', repo:'worklifesg/mobile-app', status:'wont_fix', sla:'—' },
  ];

  const grouped = cols.reduce((acc, c) => {
    acc[c.id] = synth.filter(f => f.status === c.id);
    return acc;
  }, {});

  return (
    <div className="view-inner">
      <div className="filters">
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Group by</span>
        <div className="grp">
          <button className="on">Status</button>
          <button>Repo</button>
          <button>Severity</button>
        </div>
        <span className="div" />
        <span className="chip">severity: any</span>
        <span className="chip">post-rollback: shown</span>
        <span className="spacer" />
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>SLA clock running on 13 cards · 1 overdue</span>
      </div>

      {regression && <RegressionInline regression={regression} />}

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
              {grouped[c.id].map(f => <KCard key={f.id} f={f} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KCard({ f }) {
  const isRegr = f.status === 'regression';
  return (
    <div className={`kcard ${isRegr ? 'regression' : ''}`}>
      <div className="row">
        <VwSev level={f.severity} />
        {isRegr && (
          <span className="tag" style={{
            color: 'var(--accent-ink)',
            background: 'var(--accent-tint)',
            borderColor: '#f6cbbe',
            fontSize: 10,
            padding: '2px 5px',
          }}>post-rollback</span>
        )}
        <span className="sla">{f.sla === 'paused' ? 'paused' : f.sla === 'overdue' ? <span className="crit">overdue</span> : f.resolvedAgo ? `${f.resolvedAgo} ago` : f.sla}</span>
      </div>
      <div className="cve">{f.cve}</div>
      <div className="pkg">{f.pkg} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>→ {f.fixed}</span></div>
      <div className="repo">{f.repo.replace('worklifesg/', '')}</div>
      {f.status === 'pr_open' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px',
          background: 'var(--accent-tint)',
          border: '1px solid #f6cbbe',
          borderRadius: 4,
          fontSize: 11,
          color: 'var(--accent-ink)',
          marginTop: 4,
        }}>
          <VwIcon.GitPR size={11} />
          <span className="mono">{f.pr || '#142'}</span>
          <span style={{ marginLeft: 'auto' }}>awaiting review</span>
        </div>
      )}
      {isRegr && (
        <button className="btn btn-sm btn-accent" style={{ marginTop: 6, justifyContent: 'center' }}>
          <VwIcon.GitPR size={11} />
          Open revert PR
        </button>
      )}
    </div>
  );
}

function RegressionInline({ regression }) {
  return (
    <div className="regr" style={{ marginBottom: 14 }}>
      <div>
        <span className="label"><VwIcon.Alert size={11} />Regression incident</span>
        <h3 style={{ marginTop: 8 }}>
          {regression.repo} · deploy failed {regression.delta} after merge
        </h3>
        <p className="lede">{regression.reason}</p>
        <div className="meta">
          <div><span className="lbl">Merged PR</span><span className="val">{regression.prMerged}</span></div>
          <div><span className="lbl">Failing run</span><span className="val">{regression.deployFailed}</span></div>
          <div><span className="lbl">Pre-merge SHA</span><span className="val">{regression.preCommit}</span></div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-accent"><VwIcon.GitPR size={13} />Open revert PR</button>
        <button className="btn"><VwIcon.History size={13} />Restore lockfile</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DRIFT & EVENTS — live stream
// ─────────────────────────────────────────────────────────────

function DriftStream({ events }) {
  return (
    <div className="view-inner">
      <div className="filters">
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Class</span>
        <div className="grp">
          <button className="on">All</button>
          <button>Critical</button>
          <button>Warning</button>
          <button>Info</button>
          <button>Benign</button>
        </div>
        <span className="div" />
        <span className="chip">kind: any</span>
        <span className="chip">repo: any</span>
        <span className="spacer" />
        <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--ok)', boxShadow: '0 0 0 3px rgba(31,111,69,.15)' }} />
          live · SSE connected · /api/events/stream
        </span>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '2.3fr 1fr', alignItems: 'start' }}>
        <div className="stream">
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-sunk)', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, font: '500 13px/1.2 var(--font-sans)' }}>Event stream</h3>
            <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--muted)' }}>last 30 min · 12 events</span>
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm">
              <VwIcon.Filter size={11} />
              Configure alerts
            </button>
          </div>
          {events.map((e, i) => (
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
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Webhook sources</h3>
            <p className="lede">incoming connections to /api/webhooks/github</p>
            <Source label="push" count="142" trend="+18" />
            <Source label="repository" count="3" />
            <Source label="member" count="2" trend="+1" />
            <Source label="workflow_run (deployment)" count="29" />
            <Source label="branch_protection_rule" count="4" trend="+1" warn />
            <Source label="secret_scanning_alert" count="1" trend="+1" crit last />
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 4 }}>Event classes</h3>
            <p className="lede">last 24h</p>
            <ClassRow cls="crit"   count={3}  label="Critical" />
            <ClassRow cls="warn"   count={11} label="Warning" />
            <ClassRow cls="info"   count={67} label="Info" />
            <ClassRow cls="benign" count={148} label="Benign" last />
          </div>

          <div className="card" style={{ marginTop: 14, background: 'var(--surface-sunk)' }}>
            <h3 style={{ marginBottom: 4 }}>Stream uptime</h3>
            <p className="lede">webhook latency p95</p>
            <div style={{
              font: '400 36px/1 var(--font-display)',
              letterSpacing: '-0.01em',
              marginTop: 6,
            }}>
              312<small style={{ font: '500 13px var(--font-sans)', color: 'var(--muted)', marginLeft: 4 }}>ms</small>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
              <span style={{ color: 'var(--ok)' }}>● healthy</span> · 99.97% last 7d · smee.io tunnel stable
            </div>
          </div>
        </div>
      </div>
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

function Source({ label, count, trend, warn, crit, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 0',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
      fontSize: 12.5,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 99,
        background: crit ? 'var(--crit)' : warn ? 'var(--high)' : 'var(--muted-2)',
      }} />
      <span className="mono" style={{ color: 'var(--ink-2)' }}>{label}</span>
      <span className="spacer" />
      {trend && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: crit ? 'var(--crit)' : warn ? 'var(--high)' : 'var(--muted)',
        }}>{trend}</span>
      )}
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', width: 36, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

function ClassRow({ cls, count, label, last }) {
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
          width: `${Math.min(100, (count / 148) * 100)}%`, height: '100%', borderRadius: 99,
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
  return (
    <div className="view-inner">
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <SecretStat label="Verified live"      value="2" accent footnote="confirmed via API probe — rotate immediately" />
        <SecretStat label="Historical exposure" value="2" footnote="removed from HEAD but still in git history" />
        <SecretStat label="Pre-commit blocks (7d)" value="6" footnote="gitleaks hook stopped 6 leaks before push" />
      </div>

      <div className="tbl-wrap">
        <div className="tbl-head">
          <h3>Secrets & credentials</h3>
          <span className="lede">redacted preview only · full value never persisted</span>
          <span className="right">
            <button className="btn btn-ghost btn-sm">
              <VwIcon.Eye size={12} />
              Unmask selected
            </button>
            <button className="btn btn-sm btn-accent">
              <VwIcon.Key size={12} />
              Bulk rotate
            </button>
          </span>
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
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
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
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-accent">
                      <VwIcon.Key size={11} />
                      Rotate & revoke
                    </button>
                    <button className="btn btn-sm">View commit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 4 }}>Rotation playbooks</h3>
        <p className="lede">one-click flow per provider</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {['AWS IAM', 'GitHub PAT', 'Stripe', 'Twilio', 'SendGrid'].map(p => (
            <div key={p} style={{
              padding: '12px',
              border: '1px solid var(--line)',
              borderRadius: 8,
              fontSize: 12.5,
              display: 'flex', flexDirection: 'column', gap: 4,
              background: 'var(--surface-sunk)',
            }}>
              <span style={{ font: '500 13px var(--font-sans)' }}>{p}</span>
              <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>4-step rotation flow</span>
              <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 4, padding: '4px 0' }}>
                Open playbook →
              </button>
            </div>
          ))}
        </div>
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
  return (
    <div className="view-inner">
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatPlain label="Repos in scope"  value={String((window.SVData.REPOS || []).length)} foot={`${(window.SVData.REPOS || []).filter(r => r.source === 'github').length} GitHub · ${(window.SVData.REPOS || []).filter(r => r.source === 'local').length} local WSL`} />
        <StatPlain label="Scans last 24h"  value="142" foot="138 push · 47 daily · 6 on-demand" />
        <StatPlain label="Median scan time" value="2.4" unit="s" foot="fast scanners · npm/pip/cargo audit" />
        <StatPlain label="Deep scan time"   value="38" unit="s" foot="OSV + Grype + Syft (p50)" />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        <div className="tbl-wrap">
          <div className="tbl-head">
            <h3>Scan queue</h3>
            <span className="lede">running, queued, recently completed</span>
            <span className="right">
              <button className="btn btn-sm btn-accent">
                <VwIcon.Play size={11} />
                Run scan now
              </button>
            </span>
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
              {jobs.map(j => (
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
            <h3 style={{ marginBottom: 4 }}>Schedule</h3>
            <p className="lede">three-trigger model — push, daily, on-demand</p>
            <Schedule label="On push"  desc="every push · npm/pip/cargo audit + Gitleaks (changed files)" cadence="< 30s" />
            <Schedule label="Daily"    desc="02:00 UTC · OSV-Scanner + Grype + Syft · all 47 repos" cadence="38s p50" />
            <Schedule label="Weekly"   desc="Sundays 03:00 UTC · Trufflehog full git history rescan" cadence="6 min p50" />
            <Schedule label="WSL agent" desc="every 15 min · OSV + Gitleaks · 11 local projects" cadence="systemd" last />
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
