// Vulnerabilities table + Batch PR modal. Exposes window.SVVulns.

const { Icon: VIcon, SevPill: VSev, Checkbox: VCb, EcoBadge: VEco, SourceBadge: VSrc } = window.SVUI;

const SEVS = ['all', 'critical', 'high', 'medium', 'low'];

function Vulnerabilities({ findings, onRemediate }) {
  const [selected, setSelected] = React.useState(new Set(['f1','f2','f3','f5']));
  const [sevFilter, setSevFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('open');
  const [expanded, setExpanded] = React.useState(null);

  const list = React.useMemo(() => {
    return findings.filter(f => {
      if (sevFilter !== 'all' && f.severity !== sevFilter) return false;
      if (statusFilter === 'open' && f.status !== 'open') return false;
      if (statusFilter === 'pr' && f.status !== 'pr_open') return false;
      if (statusFilter === 'all') return true;
      return true;
    });
  }, [findings, sevFilter, statusFilter]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === list.length) setSelected(new Set());
    else setSelected(new Set(list.map(f => f.id)));
  };

  const selectedFindings = list.filter(f => selected.has(f.id));
  const allChecked = list.length > 0 && selected.size === list.length;
  const partial = selected.size > 0 && !allChecked;

  return (
    <div className="view-inner">
      {/* Filters */}
      <div className="filters">
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Severity</span>
        <div className="grp">
          {SEVS.map(s => (
            <button key={s} className={sevFilter === s ? 'on' : ''} onClick={() => setSevFilter(s)}>
              {s[0].toUpperCase() + s.slice(1)}
              {s !== 'all' && <span style={{ marginLeft: 5, opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
                {findings.filter(f => f.severity === s && (statusFilter === 'all' || f.status === 'open' || (statusFilter === 'pr' && f.status === 'pr_open'))).length}
              </span>}
            </button>
          ))}
        </div>
        <span className="div" />
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</span>
        <div className="grp">
          <button className={statusFilter === 'open' ? 'on' : ''} onClick={() => setStatusFilter('open')}>Open</button>
          <button className={statusFilter === 'pr' ? 'on' : ''} onClick={() => setStatusFilter('pr')}>PR open</button>
          <button className={statusFilter === 'all' ? 'on' : ''} onClick={() => setStatusFilter('all')}>All</button>
        </div>
        <span className="div" />
        <span className="chip">
          <VIcon.Filter size={11} />
          ecosystem: any
        </span>
        <span className="chip">
          repo: all 9
          <VIcon.X size={11} className="x" />
        </span>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm">
          <VIcon.Code size={12} />
          Export CSV
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulkbar">
          <VCb checked={true} onClick={() => setSelected(new Set())} />
          <b>{selected.size} finding{selected.size === 1 ? '' : 's'} selected</b>
          <span className="lede">
            spanning {new Set(selectedFindings.map(f => f.repoId)).size} repos · estimated{' '}
            {selectedFindings.some(f => f.fixed && f.fixed.split('.')[0] !== (f.installed || '').split('.')[0])
              ? '1 breaking change'
              : 'no breaking changes'}
          </span>
          <span className="right">
            <button className="btn">Acknowledge</button>
            <button className="btn">Won't fix</button>
            <button className="btn btn-accent" onClick={() => onRemediate(selectedFindings)}>
              <VIcon.GitPR size={13} />
              Remediate selected →
            </button>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        <div className="tbl-head">
          <h3>Findings</h3>
          <span className="lede">{list.length} of {findings.length} · sorted by severity then age</span>
          <span className="right">
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Last scan: 2m ago</span>
            <button className="btn btn-ghost btn-sm">
              <VIcon.Refresh size={12} />
              Refresh
            </button>
          </span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <VCb checked={allChecked} partial={partial} onClick={toggleAll} />
              </th>
              <th style={{ width: 88 }}>Severity</th>
              <th style={{ width: 160 }}>CVE</th>
              <th>Package</th>
              <th style={{ width: 130 }}>Repo</th>
              <th style={{ width: 70 }}>Eco</th>
              <th style={{ width: 80 }}>Source</th>
              <th style={{ width: 80 }}>Status</th>
              <th style={{ width: 80, textAlign: 'right' }}>SLA</th>
              <th style={{ width: 28 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(f => (
              <React.Fragment key={f.id}>
                <tr className={selected.has(f.id) ? 'row-sel' : ''}>
                  <td><VCb checked={selected.has(f.id)} onClick={() => toggle(f.id)} /></td>
                  <td><VSev level={f.severity} /></td>
                  <td>
                    <div className="mono" style={{ color: f.isSecret ? 'var(--crit)' : 'var(--ink)' }}>
                      {f.cve}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                      CVSS {f.cvss.toFixed(1)} · {f.scanner}
                    </div>
                  </td>
                  <td>
                    <div className="pkg">{f.pkg}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                      <span className="ver">{f.installed}</span>
                      <VIcon.ArrowRt size={10} style={{ color: 'var(--muted-2)' }} />
                      <span className="ver" style={{ color: 'var(--ok)' }}>{f.fixed}</span>
                    </div>
                  </td>
                  <td className="repo">{f.repo.replace('worklifesg/', '')}</td>
                  <td><VEco eco={f.eco} /></td>
                  <td><VSrc source={f.source} /></td>
                  <td>
                    <StatusBadge status={f.status} pr={f.pr} postRollback={f.postRollback} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <SLAClock value={f.sla} sev={f.severity} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                    >
                      {expanded === f.id
                        ? <VIcon.Up size={12} />
                        : <VIcon.Down size={12} />}
                    </button>
                  </td>
                </tr>
                {expanded === f.id && (
                  <tr style={{ background: 'var(--surface-sunk)' }}>
                    <td colSpan={10} style={{ padding: '18px 26px 22px' }}>
                      <ExpandedFinding finding={f} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status, pr, postRollback }) {
  if (postRollback) {
    return (
      <span className="tag" style={{ color: 'var(--accent-ink)', borderColor: '#f6cbbe', background: 'var(--accent-tint)' }}>
        post-rollback
      </span>
    );
  }
  const map = {
    open:         { label: 'open',       cls: '' },
    acknowledged: { label: 'ack',        cls: '' },
    pr_open:      { label: pr || 'PR',   cls: 'tag-accent' },
    resolved:     { label: 'resolved',   cls: '' },
    regression:   { label: 'regression', cls: 'tag-accent' },
    reverted:     { label: 'reverted',   cls: '' },
    wont_fix:     { label: "won't fix",  cls: '' },
  };
  const m = map[status] || { label: status, cls: '' };
  return <span className={`tag ${m.cls}`}>{m.label}</span>;
}

function SLAClock({ value, sev }) {
  if (value === 'paused') return <span style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>paused</span>;
  if (value === 'overdue') return <span style={{ fontSize: 12, color: 'var(--crit)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>overdue</span>;
  const cls =
    sev === 'critical' ? 'crit' :
    sev === 'high' ? 'high' : 'med';
  return (
    <span style={{
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: cls === 'crit' ? 'var(--crit)' : cls === 'high' ? 'var(--high)' : 'var(--muted)',
    }}>{value}</span>
  );
}

function ExpandedFinding({ finding }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Description
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
          {finding.title}.
          {finding.isSecret
            ? ' Trufflehog confirmed the credential is live via API probe — rotate immediately and audit access logs in the last 7 days.'
            : ' Affects all versions before the fix release. Patched upstream with a coordinated disclosure; downstream consumers should bump to the fix version or higher.'}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <KV label="CWE" value={(finding.cwe || []).join(', ') || '—'} mono />
          <KV label="CVSS vector" value="AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" mono />
          <KV label="Exploit maturity" value={finding.severity === 'critical' ? 'PoC public' : 'Functional'} />
          <KV label="First seen" value={finding.seen} />
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Suggested remediation
          </div>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>
            <span style={{ color: 'var(--muted)' }}>$</span> bump{' '}
            <span style={{ color: 'var(--accent)' }}>{finding.pkg}</span>{' '}
            {finding.installed} <span style={{ color: 'var(--muted-2)' }}>→</span>{' '}
            <span style={{ color: 'var(--ok)' }}>{finding.fixed}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
            Patch release · no breaking changes detected via SBOM diff
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Finding history
        </div>
        <div className="tl" style={{ paddingLeft: 22 }}>
          <div className="tl-item ok"><div className="when">3 days ago · 14:22</div><div className="what">Detected by OSV-Scanner on daily scan</div></div>
          <div className="tl-item"><div className="when">2 days ago · 09:11</div><div className="what">Fix version published upstream</div></div>
          <div className="tl-item warn"><div className="when">Today · 14:28</div><div className="what">Confirmed on push-trigger fast scan</div></div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-sm"><VIcon.GitPR size={11} />Open PR for this fix</button>
          <button className="btn btn-sm btn-ghost">View on OSV.dev</button>
          <button className="btn btn-sm btn-ghost">Acknowledge</button>
        </div>
      </div>
    </div>
  );
}

function KV({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{
        fontSize: 12,
        marginTop: 3,
        color: 'var(--ink-2)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      }}>{value}</div>
    </div>
  );
}

// ── Batch PR Modal ──────────────────────────────────────────────
function BatchPRModal({ findings, onClose, onConfirm }) {
  if (!findings || !findings.length) return null;

  // group by repo
  const byRepo = findings.reduce((acc, f) => {
    (acc[f.repo] = acc[f.repo] || []).push(f);
    return acc;
  }, {});

  const breaking = findings.some(f =>
    f.installed && f.fixed &&
    f.installed.split('.')[0] !== f.fixed.split('.')[0]
  );

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <h2>Batch remediation — {findings.length} finding{findings.length === 1 ? '' : 's'}</h2>
            <p className="lede">
              SecureVault will open <b>{Object.keys(byRepo).length} PR{Object.keys(byRepo).length === 1 ? '' : 's'}</b>
              {' '}(one per repo), bundling all selected version bumps onto a single branch per repo. PRs require your review before merge.
            </p>
          </div>
          <button className="modal-x" onClick={onClose}>
            <VIcon.X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {breaking && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px',
              background: 'var(--accent-tint)',
              border: '1px solid #f6cbbe',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 12.5,
              color: 'var(--accent-ink)',
            }}>
              <VIcon.Alert size={13} />
              <span><b>1 major version bump detected.</b> Review the changelog before merge — breaking changes are flagged in each PR body.</span>
            </div>
          )}

          {Object.entries(byRepo).map(([repo, fs]) => (
            <div className="batch-repo" key={repo}>
              <div className="batch-repo-h">
                <VIcon.Branch size={13} />
                <span className="repo">{repo}</span>
                <span className="tag tag-mono">PR-1</span>
                <span className="meta">
                  {fs.length} package{fs.length === 1 ? '' : 's'} · branch{' '}
                  <span className="mono" style={{ color: 'var(--ink-2)' }}>
                    securevault/batch-fix-{Math.floor(Math.random() * 9000 + 1000)}
                  </span>
                </span>
              </div>
              {fs.map(f => (
                <div className="batch-repo-fix" key={f.id}>
                  <span>
                    <span className="pkg">{f.pkg}</span>{' '}
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{f.cve}</span>
                  </span>
                  <span className="from">{f.installed}</span>
                  <span className="arrow">→</span>
                  <span className="to">{f.fixed}</span>
                </div>
              ))}
            </div>
          ))}

          <div style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'var(--surface-sunk)',
            border: '1px solid var(--line-soft)',
            borderRadius: 8,
            fontSize: 12.5,
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Each PR will include
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: 'var(--ink-2)' }}>
              <li>CVE list with CVSS scores and links to OSV.dev</li>
              <li>Pre-merge lockfile snapshot (committed to <span className="mono">.securevault/snapshots/</span> for one-click rollback)</li>
              <li>Testing checklist tailored to affected packages</li>
              <li>Label <span className="mono">securevault-remediation</span> for filtering and auditing</li>
            </ul>
          </div>
        </div>

        <div className="modal-foot">
          <span className="lede">
            <VIcon.Lock size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
            Never auto-merged · always awaits your review
          </span>
          <span className="right">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={onConfirm}>
              <VIcon.GitPR size={13} />
              Create {Object.keys(byRepo).length} PR{Object.keys(byRepo).length === 1 ? '' : 's'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

window.SVVulns = { Vulnerabilities, BatchPRModal };
