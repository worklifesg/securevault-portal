// Overview / Home view. Exposes window.SVOverview.

const { Icon, SevPill, RiskGauge, SeverityDonut, Sparkline, SourceBadge } = window.SVUI;

function Overview({ events, regression, onJump }) {
  const REPOS = window.SVData.REPOS || [];
  const FINDINGS = window.SVData.FINDINGS || [];

  const critCount = FINDINGS.filter(f => f.severity === 'critical').length;
  const highCount = FINDINGS.filter(f => f.severity === 'high').length;
  const medCount = FINDINGS.filter(f => f.severity === 'medium').length;
  const lowCount = FINDINGS.filter(f => f.severity === 'low').length;
  const totalFindings = FINDINGS.length;
  const secretCount = (window.SVData.SECRETS || []).filter(s => s.status === 'active').length;
  const driftRepos = REPOS.filter(r => r.drift > 0).length;
  const riskScore = REPOS.length > 0 ? Math.round(REPOS.reduce((s, r) => s + r.risk, 0) / REPOS.length) : 0;

  const donutData = [
    { k: 'critical', v: critCount || 0,  label: 'Critical' },
    { k: 'high',     v: highCount || 0,  label: 'High' },
    { k: 'medium',   v: medCount || 0, label: 'Medium' },
    { k: 'low',      v: lowCount || 0, label: 'Low' },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.v, 0) || 0;

  const topRepos = [...REPOS].sort((a, b) => b.risk - a.risk).slice(0, 6);

  return (
    <div className="view-inner">

      {/* Regression incident — pinned to top */}
      <RegressionCard regression={regression} onJump={onJump} />

      {/* Stat row */}
      <div className="stat-row">
        <StatCard
          label="Open findings"
          value={String(totalFindings)}
          footnote={`across ${REPOS.length} repos`}
        />
        <StatCard
          label="Critical"
          value={String(critCount)}
          accent={critCount > 0 ? 'crit' : undefined}
          footnote={critCount > 0 ? `${critCount} require immediate action` : 'none detected'}
        />
        <StatCard
          label="Active secrets"
          value={String(secretCount)}
          accent={secretCount > 0 ? 'crit' : undefined}
          subtitle={`+ ${(window.SVData.SECRETS || []).filter(s => s.status === 'historical').length} historical`}
          footnote={secretCount > 0 ? 'rotate credentials immediately' : 'no active leaks detected'}
        />
        <StatCard
          label="Repos indexed"
          value={String(REPOS.length)}
          footnote={`${REPOS.filter(r => r.source === 'github').length} GitHub · ${REPOS.filter(r => r.source === 'local').length} local`}
        />
      </div>

      {/* Hero row: gauge + donut + activity */}
      <div className="grid-3" style={{ alignItems: 'stretch' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="risk-card">
            <RiskGauge value={riskScore} size={200} />
            <div className="risk-readout">
              <span className="head">Composite risk score</span>
              <h2>{riskScore >= 75 ? 'Critical — immediate action' : riskScore >= 50 ? 'Elevated — action recommended' : riskScore >= 25 ? 'Moderate — monitor' : totalFindings === 0 ? 'Scanning — awaiting results' : 'Low risk — healthy'}</h2>
              <p className="lede" style={{ margin: 0 }}>
                {totalFindings > 0
                  ? `${totalFindings} findings across ${REPOS.length} repos. ${critCount > 0 ? `${critCount} critical.` : ''}`
                  : REPOS.length > 0 ? `${REPOS.length} repos indexed. Run a scan to detect vulnerabilities.` : 'Connecting to GitHub…'}
              </p>
              <div className="risk-bars">
                <div className="risk-bar crit"><div className="lbl">Crit</div><div className="val">{critCount}</div></div>
                <div className="risk-bar high"><div className="lbl">High</div><div className="val">{highCount}</div></div>
                <div className="risk-bar med"><div className="lbl">Med</div><div className="val">{medCount}</div></div>
                <div className="risk-bar low"><div className="lbl">Low</div><div className="val">{lowCount}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Severity breakdown</h3>
          <p className="lede">Open findings · all repos</p>
          <div className="donut-wrap">
            <SeverityDonut data={donutData} />
            <div className="donut-legend">
              {donutData.map(d => (
                <div className="row" key={d.k}>
                  <span className="sw" style={{ background: `var(--${d.k === 'critical' ? 'crit' : d.k === 'medium' ? 'med' : d.k})` }} />
                  <span>{d.label}</span>
                  <span className="num">{d.v}</span>
                  <span className="pct">{Math.round((d.v/donutTotal)*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px 8px', display: 'flex', alignItems: 'center' }}>
            <h3 style={{ marginBottom: 2 }}>Live activity</h3>
            <span className="spacer" />
            <span className="tag" style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ok)', display: 'inline-block', marginRight: 2 }} />
              SSE
            </span>
          </div>
          <p className="lede" style={{ padding: '0 18px 6px', margin: 0 }}>Real-time events · last 6 min</p>
          <div className="feed" style={{ padding: '4px 18px 14px', overflow: 'hidden' }}>
            {events.slice(0, 6).map((e, i) => (
              <FeedItem key={`${e.ts}-${i}`} event={e} />
            ))}
          </div>
          <div style={{ padding: '8px 18px 14px', borderTop: '1px solid var(--line-soft)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onJump && onJump('drift')}>
              View full stream <Icon.ArrowRt size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Repos at risk + Scan coverage */}
      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 18px 4px', display: 'flex', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginBottom: 2 }}>Repositories at risk</h3>
              <p className="lede" style={{ margin: 0 }}>Top 6 by composite risk score</p>
            </div>
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => onJump && onJump('posture')}>
              All {REPOS.length} repos <Icon.ArrowRt size={12} />
            </button>
          </div>
          <div className="repo-list" style={{ padding: '4px 18px 16px' }}>
            {topRepos.map(r => (
              <div className="row" key={r.id}>
                <div>
                  <div className="name">
                    {r.name}
                    <span className={`vis ${r.visibility === 'public' ? 'pub' : ''}`}>{r.visibility}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                    {r.findings} findings · {r.secrets} secrets · {r.drift} drift · last scan {r.lastScan} ago
                  </div>
                </div>
                <Sparkline values={genSpark(r.risk)} color={r.risk >= 75 ? 'var(--crit)' : r.risk >= 50 ? 'var(--high)' : 'var(--muted-2)'} />
                <div className={`score ${r.risk >= 75 ? 'crit' : r.risk >= 50 ? 'high' : r.risk >= 25 ? 'med' : ''}`}>
                  {r.risk}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 18px 8px' }}>
            <h3 style={{ marginBottom: 2 }}>Scan coverage</h3>
            <p className="lede" style={{ margin: 0 }}>Triggers in the last 24 hours · all sources</p>
          </div>
          <div style={{ padding: '4px 18px 18px' }}>
            <CoverageRow icon={<Icon.Branch size={14} />}
                         label="Push-triggered scans"
                         desc="every push to any branch · &lt; 30s feedback"
                         num="142" />
            <CoverageRow icon={<Icon.Clock size={14} />}
                         label="Daily scheduled (02:00 UTC)"
                         desc="47 / 47 repos · full OSV + Grype + Trufflehog (weekly)"
                         num="47" pct={100} />
            <CoverageRow icon={<Icon.Folder size={14} />}
                         label="WSL local agent"
                         desc="11 projects under ~/projects + ~/code · every 15 min"
                         num="44" />
            <CoverageRow icon={<Icon.Sparkle size={14} />}
                         label="On-demand"
                         desc="user-triggered full deep scans"
                         num="6" last={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, delta, footnote, accent }) {
  return (
    <div className="stat">
      <div className="stat-label">
        {accent === 'crit' && <span style={{ width:6, height:6, borderRadius:99, background:'var(--crit)' }} />}
        {label}
      </div>
      <div className="stat-val">
        {value}
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className="stat-foot">
        {delta && <span className={`delta ${delta.kind}`}>{delta.val}</span>}
        <span>{footnote}</span>
      </div>
    </div>
  );
}

function FeedItem({ event }) {
  const { Icon } = window.SVUI;
  const icoMap = {
    secret:     { Ico: Icon.Key,      cls: 'crit' },
    regression: { Ico: Icon.Alert,    cls: 'crit' },
    drift:      { Ico: Icon.Workflow, cls: 'high' },
    push:       { Ico: Icon.Branch,   cls: 'info' },
    scan:       { Ico: Icon.Refresh,  cls: '' },
    pr:         { Ico: Icon.GitPR,    cls: 'ok' },
    repo:       { Ico: Icon.Box,      cls: '' },
  };
  const { Ico, cls } = icoMap[event.kind] || { Ico: Icon.Activity, cls: '' };
  return (
    <div className="feed-item">
      <div className={`feed-ico ${cls}`}>
        <Ico size={11} />
      </div>
      <div className="feed-body">
        <div className="title">{event.text}</div>
        {event.repo !== '—' && (
          <div className="meta">
            <span className="mono">{event.repo}</span>
          </div>
        )}
      </div>
      <div className="feed-time">{event.ts.slice(0, 5)}</div>
    </div>
  );
}

function CoverageRow({ icon, label, desc, num, pct, last }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr auto',
      gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px dashed var(--line)',
      alignItems: 'center',
    }}>
      <span style={{ color: 'var(--muted)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }} dangerouslySetInnerHTML={{ __html: desc }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ font: '500 16px/1 var(--font-mono)', color: 'var(--ink)' }}>{num}</div>
        {pct != null && <div style={{ fontSize: 10.5, color: 'var(--ok)', marginTop: 3 }}>{pct}% coverage</div>}
      </div>
    </div>
  );
}

function RegressionCard({ regression, onJump }) {
  const { Icon } = window.SVUI;
  if (!regression) return null;
  return (
    <div className="regr" style={{ marginBottom: 18 }}>
      <div>
        <span className="label"><Icon.Alert size={11} />Regression incident — action required</span>
        <h3>Deployment failed {regression.delta} after merging <span className="mono">{regression.prMerged}</span></h3>
        <p className="lede">
          <span className="mono">{regression.repo}</span> · auto-detected via GitHub Actions workflow events.
          Pre-merge lockfile snapshot is stored — a one-click revert is available.
        </p>
        <div className="meta">
          <div>
            <span className="lbl">Workflow run</span>
            <span className="val">{regression.deployFailed}</span>
          </div>
          <div>
            <span className="lbl">Likely cause</span>
            <span style={{ fontSize: 12 }}>{regression.reason}</span>
          </div>
          <div>
            <span className="lbl">Pre-merge SHA</span>
            <span className="val">{regression.preCommit}</span>
          </div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-accent" onClick={() => onJump && onJump('remediation')}>
          <Icon.GitPR size={13} />
          Open revert PR
        </button>
        <button className="btn" onClick={() => onJump && onJump('remediation')}>
          <Icon.History size={13} />
          Restore lockfile
        </button>
        <button className="btn btn-ghost btn-sm">View incident</button>
      </div>
    </div>
  );
}

function genSpark(risk) {
  // deterministic-ish 7 point line ending around current risk
  const out = [];
  let v = Math.max(5, risk - 18);
  for (let i = 0; i < 6; i++) {
    v += Math.sin(i * (risk * 0.13)) * 8 + 3;
    out.push(Math.max(0, v));
  }
  out.push(risk);
  return out;
}

window.SVOverview = { Overview };
