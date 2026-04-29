// ── Design System: STITCH Intelligence Platform ──────────────────────────────
// Fonts: Sora (headings), DM Sans (body), JetBrains Mono (numbers)
// Inspired by: Linear, Vercel, Stripe Dashboard

export const C = {
  blue:'#1d4ed8', indigo:'#4338ca', violet:'#6d28d9',
  amber:'#b45309', orange:'#c2410c', green:'#15803d', red:'#b91c1c',
  teal:'#0f766e', sky:'#0369a1',
  s0:'#ffffff', s50:'#f8fafc', s100:'#f1f5f9', s200:'#e2e8f0',
  s300:'#cbd5e1', s400:'#94a3b8', s500:'#64748b',
  s600:'#475569', s700:'#334155', s800:'#1e293b', s900:'#0f172a',
};

export const dm = {
  bg: C.s50, card: C.s0, border: C.s200,
  text: C.s900, sub: C.s500, nav: C.s0,
};

// ── Inline SVG icon library ───────────────────────────────────────────────────
const _ico = (paths, opts = {}) => ({ s = 20, c = 'currentColor', style } = {}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={style} {...opts}>
    {paths}
  </svg>
);

export const Ico = {
  dashboard:   _ico(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  route:       _ico(<><path d="M3 12h18M3 6h18M3 18h12"/><circle cx="19" cy="18" r="2"/></>),
  navigate:    _ico(<><polygon points="3,11 22,2 13,21 11,13"/></>),
  bins:        _ico(<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>),
  analytics:   _ico(<><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></>),
  settings:    _ico(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>),
  truck:       _ico(<><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></>),
  alert:       _ico(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  check:       _ico(<><polyline points="20,6 9,17 4,12"/></>),
  refresh:     _ico(<><polyline points="23,4 23,11 16,11"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 11"/></>),
  download:    _ico(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>),
  search:      _ico(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  moon:        _ico(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>),
  sun:         _ico(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>),
  close:       _ico(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  info:        _ico(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>),
  gps:         _ico(<><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></>),
  map:         _ico(<><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>),
  zap:         _ico(<><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></>),
  plus:        _ico(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  filter:      _ico(<><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></>),
};

// ── UI Primitive Components ───────────────────────────────────────────────────

export function Card({ children, style, className = '' }) {
  return (
    <div className={`ds-card ${className}`} style={{
      background: dm.card, border: `1px solid ${dm.border}`,
      borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,.04)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Label({ children, color = C.indigo, style }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: 0.9, color, fontFamily: '"DM Sans", sans-serif',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Chip({ children, color = C.indigo }) {
  return (
    <span style={{
      background: `${color}18`, color,
      borderRadius: 20, padding: '2px 7px',
      fontSize: 10, fontWeight: 600,
      fontFamily: '"DM Sans", sans-serif',
      display: 'inline-block',
    }}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={{
        fontSize: 24, fontWeight: 800, fontFamily: '"Sora", sans-serif',
        letterSpacing: -0.5, margin: 0, marginBottom: 5, color: dm.text,
      }}>
        {title}
      </h2>
      <p style={{
        fontSize: 12.5, fontWeight: 400, color: dm.sub, margin: 0,
        maxWidth: 560, lineHeight: 1.7, fontFamily: '"DM Sans", sans-serif',
      }}>
        {subtitle}
      </p>
    </div>
  );
}

export function Mono({ children, size = 13, weight = 700, color, style }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: size, fontWeight: weight,
      color: color || dm.text,
      ...style,
    }}>
      {children}
    </span>
  );
}

export function StatBox({ label, value, unit, color = C.indigo, trend, trendUp }) {
  return (
    <div style={{
      background: dm.card, border: `1px solid ${dm.border}`,
      borderRadius: 10, padding: '14px 16px',
    }}>
      <Label color={color} style={{ marginBottom: 8 }}>{label}</Label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <Mono size={22} weight={800} color={color}>{value}</Mono>
        {unit && <span style={{ fontSize: 10, color: dm.sub, fontFamily: '"DM Sans", sans-serif' }}>{unit}</span>}
      </div>
      {trend != null && (
        <div style={{
          marginTop: 6, fontSize: 10, fontFamily: '"DM Sans", sans-serif',
          color: trendUp ? C.green : C.red, display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ pass, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600,
      fontFamily: '"DM Sans", sans-serif',
      background: pass ? '#f0fdf4' : '#fffbeb',
      color: pass ? C.green : C.amber,
      border: `1px solid ${pass ? '#bbf7d0' : '#fde68a'}`,
    }}>
      {pass
        ? <Ico.check s={11} c={C.green} />
        : <Ico.alert s={11} c={C.amber} />
      }
      {label}
    </span>
  );
}

export function InfoBox({ type = 'blue', label, children }) {
  const styles = {
    blue:   { bg: '#eff6ff', border: '#bfdbfe', label: C.sky,    text: C.s800 },
    green:  { bg: '#f0fdf4', border: '#bbf7d0', label: C.green,  text: C.s800 },
    amber:  { bg: '#fffbeb', border: '#fde68a', label: C.amber,  text: C.s800 },
    violet: { bg: '#f5f3ff', border: '#ddd6fe', label: C.violet, text: C.s800 },
    red:    { bg: '#fef2f2', border: '#fecaca', label: C.red,    text: C.s800 },
    teal:   { bg: '#f0fdfa', border: '#99f6e4', label: C.teal,   text: C.s800 },
  };
  const s = styles[type] || styles.blue;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: 11, marginBottom: 9,
    }}>
      {label && <Label color={s.label} style={{ marginBottom: 5 }}>{label}</Label>}
      <div style={{ fontSize: 12, color: s.text, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, fontFamily: '"Sora", sans-serif',
        color: dm.text, letterSpacing: -0.2,
      }}>
        {children}
      </div>
      {action}
    </div>
  );
}

export function FillBar({ pct, color }) {
  const c = pct >= 80 ? C.red : pct >= 50 ? C.amber : C.green;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: C.s200, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || c, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      <Mono size={10} weight={700} color={color || c}>{pct}%</Mono>
    </div>
  );
}

export function DataTable({ headers, rows, accent = C.indigo }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: dm.bg }}>
          {headers.map((h, i) => (
            <th key={i} style={{
              padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.9, color: dm.sub,
              borderBottom: `1px solid ${dm.border}`,
              fontFamily: '"DM Sans", sans-serif',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="trow">
            {row.map((cell, j) => (
              <td key={j} style={{
                padding: '9px 12px', fontSize: 11,
                borderBottom: `1px solid ${dm.border}30`,
                fontFamily: typeof cell === 'number' ? '"JetBrains Mono", monospace' : '"DM Sans", sans-serif',
                fontWeight: typeof cell === 'number' ? 700 : 400,
                color: dm.text,
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const CHART_DEFAULTS = {
  margin: { top: 8, right: 20, left: 0, bottom: 20 },
  tick: { fontSize: 9, fill: dm.sub, fontFamily: '"JetBrains Mono", monospace' },
  grid: { strokeDasharray: '3 3', stroke: dm.border },
  tooltip: {
    contentStyle: {
      background: dm.card, border: `1px solid ${dm.border}`,
      borderRadius: 8, fontSize: 10, fontFamily: '"DM Sans", sans-serif',
    },
  },
};
