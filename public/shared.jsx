// Shared icons + small primitives. Exposes window.SVUI.

const { useState, useEffect, useRef, useMemo } = React;

// ── Icon set (stroke 1.5, 16px) ────────────────────────────────
const I = (d, opts = {}) => (props) => (
  <svg width={props.size || 16} height={props.size || 16}
       viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={opts.sw || 1.5}
       strokeLinecap="round" strokeLinejoin="round"
       {...props}>
    {d}
  </svg>
);

const Icon = {
  Shield:   I(<><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/></>),
  Gauge:    I(<><path d="M12 14l4-4"/><circle cx="12" cy="13" r="9"/><path d="M3 13a9 9 0 0118 0"/></>),
  Bug:      I(<><rect x="6" y="9" width="12" height="10" rx="5"/><path d="M9 9V7a3 3 0 016 0v2M3 12h3M18 12h3M5 18l2-1M19 18l-2-1M5 9l2 1M19 9l-2 1"/></>),
  Key:     I(<><circle cx="9" cy="14" r="4"/><path d="M11.5 11.5l8-8M16 5l2 2M19 8l2-2"/></>),
  Building: I(<><path d="M4 21V6a2 2 0 012-2h8a2 2 0 012 2v15M4 21h12M9 9h2M9 13h2M9 17h2M18 21V12h2v9"/></>),
  Workflow: I(<><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h6a3 3 0 013 3v6"/></>),
  Activity: I(<><path d="M3 12h4l3-8 4 16 3-8h4"/></>),
  Settings: I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>),
  Play:     I(<><polygon points="6 4 20 12 6 20 6 4" /></>),
  Refresh:  I(<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0114.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0020.5 15"/></>),
  Search:   I(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>),
  Plus:     I(<><path d="M12 5v14M5 12h14"/></>),
  Minus:    I(<><path d="M5 12h14"/></>),
  X:        I(<><path d="M18 6L6 18M6 6l12 12"/></>),
  Check:    I(<><path d="M20 6L9 17l-5-5"/></>),
  Chevron:  I(<><polyline points="9 18 15 12 9 6"/></>),
  Down:     I(<><polyline points="6 9 12 15 18 9"/></>),
  Up:       I(<><polyline points="18 15 12 9 6 15"/></>),
  Branch:   I(<><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M18 7v3a4 4 0 01-4 4H6"/></>),
  GitPR:    I(<><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v10M18 17V9a4 4 0 00-4-4h-2M14 3l-2 2 2 2"/></>),
  Alert:    I(<><path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"/></>),
  Eye:      I(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>),
  EyeOff:   I(<><path d="M17.94 17.94A10.06 10.06 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 014.06-5.06M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22"/></>),
  Lock:     I(<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>),
  Globe:    I(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></>),
  Folder:   I(<><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></>),
  Box:      I(<><path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73L11 21.73a2 2 0 002 0L20 17.73A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>),
  Bell:     I(<><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></>),
  Clock:    I(<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></>),
  Filter:   I(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>),
  ArrowRt:  I(<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>),
  Trend:    I(<><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></>),
  Layers:   I(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>),
  Code:     I(<><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>),
  History:  I(<><polyline points="1 4 1 10 7 10"/><path d="M3.5 15A9 9 0 1010 3.4L1 10"/><polyline points="12 7 12 12 16 14"/></>),
  Sparkle:  I(<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>),
};

// ── Severity pill ──────────────────────────────────────────────
function SevPill({ level, mute }) {
  const map = {
    critical: ['sev-crit', 'Critical'],
    high:     ['sev-high', 'High'],
    medium:   ['sev-med',  'Medium'],
    low:      ['sev-low',  'Low'],
    info:     ['sev-info', 'Info'],
    ok:       ['sev-ok',   'OK'],
  };
  const [cls, label] = map[level] || ['sev-info', level];
  return <span className={`sev ${cls}`}><span className="bar" />{mute || label}</span>;
}

// ── Checkbox ───────────────────────────────────────────────────
function Checkbox({ checked, partial, onClick }) {
  const cls = partial ? 'partial' : checked ? 'checked' : '';
  return <span className={`cb ${cls}`} onClick={onClick} role="checkbox" aria-checked={!!checked} />;
}

// ── Risk gauge (SVG arc 0–100) ─────────────────────────────────
function RiskGauge({ value = 72, size = 200 }) {
  const r = 84, cx = size/2, cy = size/2;
  const c = 2 * Math.PI * r;
  // 270° sweep from -225° to +45°
  const start = -225, end = 45, sweep = end - start;
  const v = Math.max(0, Math.min(100, value));
  const arcLen = (sweep / 360) * c;
  const valLen = (v / 100) * arcLen;
  const offset = c - arcLen;
  const valOffset = c - valLen;

  // color thresholds
  const stroke =
    v >= 75 ? 'var(--crit)' :
    v >= 50 ? 'var(--high)' :
    v >= 25 ? 'var(--med)'  : 'var(--ok)';

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(${start - 90} ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={r} fill="none"
                  stroke="var(--line)" strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={offset} />
          <circle cx={cx} cy={cy} r={r} fill="none"
                  stroke={stroke} strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={valOffset}
                  style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
          {/* tick marks */}
          {[0,25,50,75,100].map(t => {
            const a = (start + (t/100)*sweep) * Math.PI/180;
            const x1 = cx + Math.cos(a) * (r+12);
            const y1 = cy + Math.sin(a) * (r+12);
            const x2 = cx + Math.cos(a) * (r+18);
            const y2 = cy + Math.sin(a) * (r+18);
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-strong)" strokeWidth="1.2" />;
          })}
        </g>
      </svg>
      <div className="gauge-center">
        <div>
          <div className="gauge-val">{v}</div>
          <div className="gauge-label">Composite Risk</div>
        </div>
      </div>
    </div>
  );
}

// ── Severity donut ─────────────────────────────────────────────
function SeverityDonut({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  const denom = total || 1;
  const r = 52, cx = size/2, cy = size/2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const colors = {
    critical: 'var(--crit)',
    high:     'var(--high)',
    medium:   'var(--med)',
    low:      'var(--low)',
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="16" />
        {data.map((d, i) => {
          const len = (d.v / denom) * c;
          const seg = (
            <circle key={d.k} cx={cx} cy={cy} r={r} fill="none"
                    stroke={colors[d.k]}
                    strokeWidth="16"
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-acc} />
          );
          acc += len;
          return seg;
        })}
      </g>
      <text x={cx} y={cy - 2} textAnchor="middle"
            fontFamily="var(--font-display)" fontSize="28"
            fill="var(--ink)">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle"
            fontFamily="var(--font-sans)" fontSize="9"
            fill="var(--muted)" letterSpacing="1">FINDINGS</text>
    </svg>
  );
}

// ── Ecosystem badge ────────────────────────────────────────────
function EcoBadge({ eco }) {
  const map = {
    npm:   { c: '#CB3837', l: 'npm' },
    pypi:  { c: '#3776AB', l: 'PyPI' },
    cargo: { c: '#B7410E', l: 'cargo' },
    go:    { c: '#00ADD8', l: 'Go' },
    maven: { c: '#C71A36', l: 'Maven' },
    os:    { c: '#666',    l: 'OS pkg' },
    secret:{ c: 'var(--accent)', l: 'secret' },
  };
  const m = map[eco] || { c: '#666', l: eco };
  return (
    <span className="tag" style={{ color: m.c, borderColor: 'currentColor', background: 'transparent', opacity: .85 }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: m.c, display: 'inline-block' }} />
      {m.l}
    </span>
  );
}

// ── Source badge ───────────────────────────────────────────────
function SourceBadge({ source }) {
  return source === 'local'
    ? <span className="tag"><Icon.Folder size={11} />local</span>
    : <span className="tag"><Icon.Branch size={11} />github</span>;
}

// Strip the "owner/" prefix from a GitHub full name for compact display.
// Local paths (already "~/…") are returned unchanged.
function repoShortName(name) {
  if (!name) return name;
  if (name.startsWith('~') || name.startsWith('/')) return name;
  const slash = name.indexOf('/');
  return slash === -1 ? name : name.slice(slash + 1);
}

window.SVUI = {
  Icon, SevPill, Checkbox, RiskGauge, SeverityDonut, EcoBadge, SourceBadge, repoShortName,
};
