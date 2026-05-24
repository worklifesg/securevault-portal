// Root app — view switching, batch PR modal state, tweaks panel.
// All sub-modules attached to window beforehand.

const { useState, useEffect, useMemo } = React;
const { Sidebar, Header } = window.SVChrome;
const { Overview } = window.SVOverview;
const { Vulnerabilities, BatchPRModal } = window.SVVulns;
const { Posture, Remediation, DriftStream, SecretsView, ScansView } = window.SVViews;
const { Settings } = window.SVSettings;
const { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#E8533A",
  "density": "regular"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  '#E8533A',   // coral (default — per plan)
  '#2A6FDB',   // operational blue
  '#1F8A5B',   // forest green
  '#7A5AE0',   // violet
];

function applyAccent(hex) {
  // Derive a darker hover and a tint
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  // simple darken: blend with black 15%
  root.style.setProperty('--accent-2', mix(hex, '#000', 0.15));
  root.style.setProperty('--accent-tint', mix(hex, '#FFFFFF', 0.85));
  root.style.setProperty('--accent-ink', mix(hex, '#000', 0.55));
}

function mix(a, b, t) {
  const ah = a.replace('#',''), bh = b.replace('#','');
  const ar = parseInt(ah.slice(0,2),16), ag = parseInt(ah.slice(2,4),16), ab = parseInt(ah.slice(4,6),16);
  const br = parseInt(bh.slice(0,2),16), bg = parseInt(bh.slice(2,4),16), bb = parseInt(bh.slice(4,6),16);
  const rr = Math.round(ar*(1-t) + br*t);
  const rg = Math.round(ag*(1-t) + bg*t);
  const rb = Math.round(ab*(1-t) + bb*t);
  return '#' + [rr,rg,rb].map(n => n.toString(16).padStart(2,'0')).join('');
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState('overview');
  const [scanning, setScanning] = useState(true);
  const [modalFindings, setModalFindings] = useState(null);
  const [toast, setToast] = useState(null);
  const [liveData, setLiveData] = useState(window.SVDataLoader ? window.SVDataLoader.getData() : window.SVData);
  const events = liveData.EVENTS || [];

  // Subscribe to live data updates from the API
  useEffect(() => {
    if (!window.SVDataLoader) return;
    const update = () => {
      const fresh = window.SVDataLoader.getData();
      window.SVData = fresh;
      setLiveData({ ...fresh });
    };
    window.SVDataLoader.subscribe(update);
  }, []);

  // Apply accent + density tokens
  useEffect(() => { applyAccent(tweaks.accent); }, [tweaks.accent]);
  useEffect(() => {
    document.documentElement.setAttribute('data-density', tweaks.density);
  }, [tweaks.density]);

  // Stop the "scanning" indicator when data loads
  useEffect(() => {
    if (liveData.REPOS && liveData.REPOS.length > 0) setScanning(false);
    const t = setTimeout(() => setScanning(false), 15000);
    return () => clearTimeout(t);
  }, [liveData.REPOS]);

  const onRemediate = (findings) => setModalFindings(findings);
  const confirmRemediation = () => {
    const repoCount = new Set(modalFindings.map(f => f.repo)).size;
    setModalFindings(null);
    setToast(`Remediation plan ready for ${repoCount} repo${repoCount === 1 ? '' : 's'} — review the version bumps and apply in your repo`);
    setTimeout(() => setToast(null), 4500);
  };

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} />
      <div className="main">
        <Header view={view} scanning={scanning} onScan={() => setScanning(s => !s)} />
        <div className="view">
          {view === 'overview' && (
            <Overview
              events={events}
              regression={liveData.REGRESSION}
              onJump={setView}
            />
          )}
          {view === 'vulns' && (
            <Vulnerabilities
              findings={liveData.FINDINGS}
              onRemediate={onRemediate}
            />
          )}
          {view === 'secrets' && <SecretsView secrets={liveData.SECRETS} />}
          {view === 'posture' && (
            <Posture
              repos={liveData.REPOS}
              onJump={setView}
            />
          )}
          {view === 'remediation' && (
            <Remediation findings={liveData.FINDINGS} />
          )}
          {view === 'drift' && <DriftStream events={events} />}
          {view === 'scans' && <ScansView jobs={liveData.SCAN_JOBS} tools={liveData.TOOLS} />}
          {view === 'settings' && <Settings />}
        </div>
      </div>

      {modalFindings && (
        <BatchPRModal
          findings={modalFindings}
          onClose={() => setModalFindings(null)}
          onConfirm={confirmRemediation}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 22, left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ink)',
          color: '#f5efe2',
          padding: '11px 16px',
          borderRadius: 999,
          fontSize: 13,
          boxShadow: 'var(--shadow-pop)',
          zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideup .3s ease-out',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ok)' }} />
          {toast}
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor
          label="Color"
          value={tweaks.accent}
          options={ACCENT_OPTIONS}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          options={['dense', 'regular', 'spacious']}
          onChange={(v) => setTweak('density', v)}
        />
      </TweaksPanel>
    </div>
  );
}

// data-density attr — translate "regular" to the default value
function syncDensity(d) {
  if (d === 'regular') document.documentElement.removeAttribute('data-density');
  else document.documentElement.setAttribute('data-density', d);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
