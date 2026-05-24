// Settings view — connect GitHub, manage scan directories, view scanner tools.
// Exposes window.SVSettings.

const { Icon: StIcon } = window.SVUI;

function Settings() {
  const [cfg, setCfg] = React.useState(null);
  const [tools, setTools] = React.useState([]);
  const [username, setUsername] = React.useState('');
  const [token, setToken] = React.useState('');
  const [dirs, setDirs] = React.useState([]);
  const [newDir, setNewDir] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  const load = React.useCallback(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      setCfg(d);
      setUsername(d.github_user || '');
      setDirs(d.scan_dirs || []);
    }).catch(() => {});
    fetch('/api/scan/tools').then(r => r.json()).then(d => setTools(d.tools || [])).catch(() => {});
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const flash = (text, kind = 'ok') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg(null), 4000);
  };

  const save = async (patch, label) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setCfg({ github_user: d.github_user, scan_dirs: d.scan_dirs, auth: d.auth });
      setToken('');
      flash(`${label} saved`);
      // Refresh the rest of the app against the new config.
      if (window.SVDataLoader && window.SVDataLoader.refreshAll) window.SVDataLoader.refreshAll();
    } catch (e) {
      flash(e.message || 'Save failed', 'crit');
    } finally {
      setSaving(false);
    }
  };

  const auth = cfg && cfg.auth;

  return (
    <div className="view-inner" style={{ maxWidth: 920 }}>

      {/* Connection status */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center',
            background: auth && auth.connected ? 'var(--ok-tint)' : 'var(--surface-2)',
            color: auth && auth.connected ? 'var(--ok)' : 'var(--muted)',
          }}>
            <StIcon.Shield size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>
              {auth && auth.connected ? `Connected to GitHub` : 'Not connected'}
            </h3>
            <p className="lede" style={{ margin: '2px 0 0' }}>
              {auth && auth.connected
                ? <>Authenticated as <span className="mono" style={{ color: 'var(--ink-2)' }}>{auth.effectiveUser}</span> via {auth.method === 'token' ? 'personal access token' : 'gh CLI'}</>
                : 'Connect with the gh CLI or a personal access token below to index your repositories.'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <StIcon.Refresh size={12} /> Re-check
          </button>
        </div>
      </div>

      {/* GitHub connection */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 4 }}>GitHub connection</h3>
        <p className="lede">SecureVault auto-detects <span className="mono">gh</span> CLI auth. To use a different account or run without the CLI, paste a personal access token (scopes: <span className="mono">repo, read:user</span>).</p>

        <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
          <Field label="GitHub username" hint="Used for the activity feed. Leave blank to use the detected account.">
            <input className="sv-input" value={username} placeholder="your-github-username"
                   onChange={e => setUsername(e.target.value)} />
          </Field>

          <Field label="Personal access token" hint={auth && auth.tokenConfigured ? 'A token is stored. Enter a new one to replace it, or clear it below.' : 'Optional. Stored locally in .securevault/config.json (gitignored).'}>
            <input className="sv-input" type="password" value={token} placeholder={auth && auth.tokenConfigured ? '•••••••••• (stored)' : 'ghp_…'}
                   onChange={e => setToken(e.target.value)} />
          </Field>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-accent" disabled={saving}
                    onClick={() => save({ githubUsername: username, githubToken: token }, 'GitHub settings')}>
              <StIcon.Check size={13} /> Save & connect
            </button>
            {auth && auth.tokenConfigured && (
              <button className="btn" disabled={saving}
                      onClick={() => save({ githubToken: '' }, 'Token cleared')}>
                Clear token
              </button>
            )}
          </div>

          <GhCliRow ghCli={auth && auth.ghCli} />
        </div>
      </div>

      {/* Scan directories */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 4 }}>Local scan directories</h3>
        <p className="lede">Folders scanned for local projects (any subfolder with <span className="mono">package.json</span>, <span className="mono">requirements.txt</span>, <span className="mono">go.mod</span>, <span className="mono">Cargo.toml</span>, …). Point this at your WSL workspace.</p>

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {dirs.length === 0 && <div className="lede">No directories configured yet.</div>}
          {dirs.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StIcon.Folder size={14} style={{ color: 'var(--muted)' }} />
              <span className="mono" style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)' }}>{d}</span>
              <button className="btn btn-ghost btn-sm btn-icon" title="Remove"
                      onClick={() => setDirs(dirs.filter((_, j) => j !== i))}>
                <StIcon.X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input className="sv-input" style={{ flex: 1 }} value={newDir}
                 placeholder="/home/you/projects"
                 onChange={e => setNewDir(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter' && newDir.trim()) { setDirs([...dirs, newDir.trim()]); setNewDir(''); } }} />
          <button className="btn" disabled={!newDir.trim()}
                  onClick={() => { setDirs([...dirs, newDir.trim()]); setNewDir(''); }}>
            <StIcon.Plus size={12} /> Add
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-accent" disabled={saving}
                  onClick={() => save({ scanDirs: dirs }, 'Scan directories')}>
            <StIcon.Check size={13} /> Save directories
          </button>
        </div>
      </div>

      {/* Scanner tools */}
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Scanner tools</h3>
        <p className="lede">Detected security scanners. Missing tools can be installed with <span className="mono">bash scripts/install-scanners.sh</span>.</p>
        <div style={{ marginTop: 10 }}>
          {tools.length === 0 && <div className="lede">Checking…</div>}
          {tools.map((t, i) => (
            <div key={t.name} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, alignItems: 'center',
              padding: '9px 0', fontSize: 12.5,
              borderBottom: i === tools.length - 1 ? 'none' : '1px dashed var(--line)',
            }}>
              <span className="mono" style={{ color: 'var(--ink)' }}>{t.name}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{t.version}</span>
              <span className="tag" style={{
                background: t.installed ? 'var(--ok-tint)' : 'var(--surface-2)',
                color: t.installed ? 'var(--ok)' : 'var(--muted)', borderColor: 'transparent',
              }}>{t.installed ? 'installed' : 'missing'}</span>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#f5efe2', padding: '11px 16px', borderRadius: 999,
          fontSize: 13, boxShadow: 'var(--shadow-pop)', zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: msg.kind === 'crit' ? 'var(--crit)' : 'var(--ok)' }} />
          {msg.text}
        </div>
      )}
    </div>
  );
}

function GhCliRow({ ghCli }) {
  if (!ghCli) return null;
  const ok = ghCli.installed && ghCli.authed;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--surface-sunk)', border: '1px solid var(--line-soft)',
      fontSize: 12.5, color: 'var(--ink-2)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: ok ? 'var(--ok)' : 'var(--muted-2)' }} />
      {!ghCli.installed
        ? <span><b>gh CLI not installed.</b> Install it or use a token above.</span>
        : ghCli.authed
          ? <span>gh CLI detected — logged in as <span className="mono">{ghCli.user}</span>. Used automatically when no token is set.</span>
          : <span><b>gh CLI installed but not logged in.</b> Run <span className="mono">gh auth login</span>, or use a token above.</span>}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

window.SVSettings = { Settings };
