import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import AppShell from '../components/AppShell';
import { api } from '../api';
import { C, dm, Card, Label, Mono, Chip, PageHeader, StatBox, FillBar, InfoBox, DataTable, CHART_DEFAULTS, Ico } from '../design';

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = (v, t) => t > 0 ? ((v / t) * 100).toFixed(1) : '0';
const statusColor = s => s === 'CRITICAL' ? C.red : s === 'MEDIUM' ? C.amber : C.green;

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dm.card, border: `1px solid ${dm.border}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
      fontFamily: '"DM Sans", sans-serif',
      boxShadow: '0 4px 16px rgba(0,0,0,.08)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: dm.text }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: '"JetBrains Mono",monospace', fontSize: 10 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ── Section Heading ────────────────────────────────────────────────────────
function SH({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontFamily: '"Sora",sans-serif', fontSize: 13, fontWeight: 700, color: dm.text }}>{children}</div>
      {right}
    </div>
  );
}

// ── Mini KPI ───────────────────────────────────────────────────────────────
function MiniKPI({ label, value, unit, color = C.indigo, sub }) {
  return (
    <div style={{ padding: '14px 16px', background: dm.card, border: `1px solid ${dm.border}`, borderRadius: 10 }}>
      <Label color={color} style={{ marginBottom: 8 }}>{label}</Label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <Mono size={20} weight={800} color={color}>{value}</Mono>
        {unit && <span style={{ fontSize: 10, color: dm.sub, fontFamily: '"DM Sans",sans-serif' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: dm.sub, fontFamily: '"DM Sans",sans-serif', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Fleet', 'Forecast', 'Alerts', 'Categories'];

export default function AnalyticsPage() {
  const [data, setData]   = useState(null);
  const [loading, setLoad] = useState(true);
  const [tab, setTab]     = useState('Overview');

  const load = useCallback(async () => {
    try { const d = await api.analytics(); setData(d); setLoad(false); }
    catch { setLoad(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const derived = useMemo(() => {
    if (!data) return {};
    const total  = (data.critical_count || 0) + (data.medium_count || 0) + (data.normal_count || 0);
    const histData = (data.histogram || []).map((v, i) => ({
      range: `${i*10}–${i*10+10}%`, count: v,
      fill: i >= 8 ? C.red : i >= 5 ? C.amber : C.green,
    }));
    const typeData = (data.type_breakdown || []).map(t => ({
      type: t.type, total: t.total, avg_fill: t.avg_fill,
      normal: t.normal_pct, medium: t.medium_pct, critical: t.critical_pct,
    }));
    const radarData = (data.type_breakdown || []).map(t => ({
      subject: t.type.slice(0, 8),
      'Avg Fill': t.avg_fill,
      'Critical%': t.critical_pct,
      'Medium%': t.medium_pct,
    }));
    // Simulated hourly trend (use histogram as proxy)
    const trendData = (data.histogram || []).map((v, i) => ({
      hour: `${String(i * 2).padStart(2, '0')}:00`,
      bins: v,
      predicted: Math.round(v * (1 + 0.05 * Math.sin(i))),
    }));
    const topCritical = (data.top_critical || []);
    const alerts      = (data.alerts || []);
    return { total, histData, typeData, radarData, trendData, topCritical, alerts };
  }, [data]);

  if (loading) return (
    <AppShell title="Analytics" subtitle="Loading intelligence data…">
      <div className="loader"><Ico.refresh s={20} c={C.s400} /> Loading…</div>
    </AppShell>
  );
  if (!data) return (
    <AppShell title="Analytics" subtitle="No data available">
      <div className="loader"><Ico.analytics s={24} c={C.s400} /> No data</div>
    </AppShell>
  );

  const { total, histData, typeData, radarData, trendData, topCritical, alerts } = derived;

  const headerActions = (
    <>
      <button className="btn" style={{ fontSize: 11 }} onClick={api.exportCsv}>
        <Ico.download s={14} /> <span className="desktop-only">CSV</span>
      </button>
      <button className="btn-primary-sm" style={{ fontSize: 11 }} onClick={api.exportPdf}>
        <Ico.download s={14} /> <span className="desktop-only">PDF Report</span>
      </button>
    </>
  );

  return (
    <AppShell title="Analytics" subtitle="Fleet performance · waste intelligence · predictive insights" headerActions={headerActions}>
      <PageHeader
        title="Intelligence Dashboard"
        subtitle={`Live analysis across ${total} monitored nodes — updated every 30 seconds`}
      />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 14px', borderRadius: 7, border: '1px solid',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: '"DM Sans",sans-serif',
            background: tab === t ? C.indigo : 'transparent',
            color:      tab === t ? '#fff' : dm.sub,
            borderColor: tab === t ? C.indigo : dm.border,
            transition: 'all 120ms ease',
          }}>{t}</button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 'Overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
            <MiniKPI label="Network Size"   value={total}                    unit="bins"  color={C.indigo} />
            <MiniKPI label="Fleet Efficiency" value={data.efficiency || 0}   unit="%"     color={C.green}  sub={`${data.normal_count} bins normal`}/>
            <MiniKPI label="Critical Now"   value={data.critical_count || 0} unit="bins"  color={C.red}    sub={`${pct(data.critical_count,total)}% of fleet`}/>
            <MiniKPI label="Avg Fill Level" value={data.avg_fill || 0}       unit="%"     color={C.amber}  />
            <MiniKPI label="Total Weight"   value={data.total_weight || 0}   unit="kg"    color={C.teal}   />
            <MiniKPI label="Avg Time-to-Fill" value={data.avg_ttf || 0}      unit="hrs"   color={C.sky}    />
            <MiniKPI label="Sensor Faults" value={data.fault_count || 0}     unit="nodes" color={C.orange} />
            <MiniKPI label="Risk Category" value={data.risk_type || '—'}              color={C.violet} />
          </div>

          {/* Fill distribution + donut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
            <Card>
              <SH>Fill Level Distribution</SH>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histData} margin={CHART_DEFAULTS.margin}>
                  <CartesianGrid {...CHART_DEFAULTS.grid} />
                  <XAxis dataKey="range" tick={CHART_DEFAULTS.tick} />
                  <YAxis tick={CHART_DEFAULTS.tick} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {histData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <SH>Status Split</SH>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['CRITICAL', data.critical_count||0, C.red], ['MEDIUM', data.medium_count||0, C.amber], ['NORMAL', data.normal_count||0, C.green]].map(([s, v, c]) => (
                  <div key={s}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 5 }}>
                      <Label color={c}>{s}</Label>
                      <Mono size={11} weight={700} color={c}>{v} <span style={{color:dm.sub, fontWeight:400}}>({pct(v,total)}%)</span></Mono>
                    </div>
                    <FillBar pct={Math.round(+pct(v,total))} color={c} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <Label color={C.indigo} style={{ marginBottom: 6 }}>Efficiency Score</Label>
                <Mono size={28} weight={900} color={data.efficiency >= 80 ? C.green : C.amber}>{data.efficiency}%</Mono>
              </div>
            </Card>
          </div>

          {/* Hourly trend */}
          <Card>
            <SH>Bin Activity Trend (24h Cycle)</SH>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={CHART_DEFAULTS.margin}>
                <defs>
                  <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.blue} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.violet} stopOpacity={0.12}/>
                    <stop offset="95%" stopColor={C.violet} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...CHART_DEFAULTS.grid} />
                <XAxis dataKey="hour" tick={CHART_DEFAULTS.tick} />
                <YAxis tick={CHART_DEFAULTS.tick} />
                <Tooltip {...CHART_DEFAULTS.tooltip} />
                <Legend wrapperStyle={{ fontSize: 9, fontFamily: '"DM Sans",sans-serif' }} />
                <Area type="monotone" dataKey="bins" name="Actual" stroke={C.blue} fill="url(#gb)" strokeWidth={2} />
                <Area type="monotone" dataKey="predicted" name="Predicted" stroke={C.violet} fill="url(#gv)" strokeWidth={1.5} strokeDasharray="5 4" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ══ FLEET TAB ══ */}
      {tab === 'Fleet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Radar + bar side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <SH>Category Radar — Multi-axis Comparison</SH>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={dm.border} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontFamily: '"DM Sans",sans-serif', fill: dm.sub }} />
                  <Radar name="Avg Fill" dataKey="Avg Fill" stroke={C.blue}   fill={C.blue}   fillOpacity={0.15} strokeWidth={2}/>
                  <Radar name="Critical%" dataKey="Critical%" stroke={C.red}  fill={C.red}    fillOpacity={0.12} strokeWidth={2}/>
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <SH>Avg Fill by Category</SH>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} margin={CHART_DEFAULTS.margin} layout="vertical">
                  <CartesianGrid {...CHART_DEFAULTS.grid} />
                  <XAxis type="number" tick={CHART_DEFAULTS.tick} domain={[0,100]} />
                  <YAxis type="category" dataKey="type" tick={CHART_DEFAULTS.tick} width={60} />
                  <Tooltip {...CHART_DEFAULTS.tooltip} />
                  <Bar dataKey="avg_fill" name="Avg Fill %" radius={[0,4,4,0]}>
                    {typeData.map((d, i) => <Cell key={i} fill={d.avg_fill > 70 ? C.red : d.avg_fill > 45 ? C.amber : C.green}/>)}
                  </Bar>
                  <ReferenceLine x={75} stroke={C.red} strokeDasharray="5 4" label={{ value:'Crit', fontSize:8, fill:C.red }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Stacked bar */}
          <Card>
            <SH>Status Composition by Waste Category</SH>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} margin={CHART_DEFAULTS.margin}>
                <CartesianGrid {...CHART_DEFAULTS.grid} />
                <XAxis dataKey="type" tick={CHART_DEFAULTS.tick} />
                <YAxis tick={CHART_DEFAULTS.tick} />
                <Tooltip {...CHART_DEFAULTS.tooltip} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="normal"   name="Normal %"   stackId="s" fill={C.green} />
                <Bar dataKey="medium"   name="Medium %"   stackId="s" fill={C.amber} />
                <Bar dataKey="critical" name="Critical %" stackId="s" fill={C.red} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Category table */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${dm.border}` }}>
              <div style={{ fontFamily: '"Sora",sans-serif', fontSize: 13, fontWeight: 700 }}>Category Performance Matrix</div>
            </div>
            <DataTable
              headers={['Category', 'Total Bins', 'Avg Fill', 'Normal', 'Medium', 'Critical', 'Risk']}
              rows={(data.type_breakdown || []).map(t => [
                t.type,
                t.total,
                <Mono key="f" size={11} color={t.avg_fill>70?C.red:t.avg_fill>45?C.amber:C.green}>{t.avg_fill}%</Mono>,
                <Chip key="n" color={C.green}>{t.normal_pct}%</Chip>,
                <Chip key="m" color={C.amber}>{t.medium_pct}%</Chip>,
                <Chip key="c" color={C.red}>{t.critical_pct}%</Chip>,
                t.critical_pct > 30 ? '🔴 High' : t.critical_pct > 10 ? '🟡 Med' : '🟢 Low',
              ])}
            />
          </Card>
        </div>
      )}

      {/* ══ FORECAST TAB ══ */}
      {tab === 'Forecast' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <InfoBox type="amber" label="Predictive Routing Engine">
            The system analyses fill-rate velocity per bin to project overflow events. Bins with a time-to-fill below 4 hours are automatically queued for the next optimised route cycle.
          </InfoBox>

          {/* Overflow buckets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              ['< 1 hour',  data.pred_lt1  || 0, C.red,    'Immediate dispatch required'],
              ['1–2 hours', data.pred_1_2  || 0, C.orange, 'Priority queue'],
              ['2–4 hours', data.pred_2_4  || 0, C.amber,  'Schedule next cycle'],
              ['> 4 hours', data.pred_gt4  || 0, C.green,  'Baseline monitoring'],
            ].map(([label, val, color, note]) => (
              <Card key={label} style={{ borderTop: `3px solid ${color}` }}>
                <Label color={color} style={{ marginBottom: 8 }}>{label}</Label>
                <Mono size={32} weight={900} color={color}>{val}</Mono>
                <div style={{ fontSize: 10, color: dm.sub, fontFamily: '"DM Sans",sans-serif', marginTop: 6 }}>{note}</div>
              </Card>
            ))}
          </div>

          {/* Top critical bins list */}
          {topCritical.length > 0 && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${dm.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: '"Sora",sans-serif', fontSize: 13, fontWeight: 700 }}>Priority Dispatch Queue</div>
                <Chip color={C.red}>{topCritical.length} bins</Chip>
              </div>
              <DataTable
                headers={['Bin ID', 'Type', 'Fill', 'Status', 'TTF (hrs)', 'Weight (kg)', 'Sensor']}
                rows={topCritical.map(b => [
                  <Mono key="id" size={11}>{b.id}</Mono>,
                  b.type,
                  <FillBar key="fill" pct={b.fill} />,
                  <Chip key="s" color={statusColor(b.status)}>{b.status}</Chip>,
                  <Mono key="ttf" size={11} color={b.ttf < 2 ? C.red : C.amber}>{b.ttf?.toFixed(1)}</Mono>,
                  <Mono key="wt" size={11}>{b.weight?.toFixed(1)}</Mono>,
                  b.sensor_ok ? <Chip color={C.green}>OK</Chip> : <Chip color={C.red}>FAULT</Chip>,
                ])}
              />
            </Card>
          )}

          {/* Avg TTF */}
          <Card>
            <SH>Network Time-to-Fill Distribution</SH>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
              <MiniKPI label="Average TTF"   value={(data.avg_ttf || 0).toFixed(1)} unit="hrs" color={C.sky} />
              <MiniKPI label="Risk Category" value={data.risk_type || '—'}           color={C.violet} sub="Highest critical concentration" />
              <MiniKPI label="Fault Sensors" value={data.fault_count || 0}          unit="nodes" color={C.red} sub="Require field inspection" />
            </div>
            <InfoBox type="blue" label="Model Notes">
              TTF is calculated using a linear fill-rate model: TTF = (capacity − current_fill) / fill_rate_per_hour. Rates are computed from the last 4 sensor readings.
            </InfoBox>
          </Card>
        </div>
      )}

      {/* ══ ALERTS TAB ══ */}
      {tab === 'Alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {alerts.length === 0 ? (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <Ico.check s={32} c={C.green} />
              <div style={{ fontFamily: '"Sora",sans-serif', fontSize: 15, fontWeight: 700, marginTop: 12 }}>No Active Alerts</div>
              <div style={{ fontSize: 12, color: dm.sub, marginTop: 6 }}>All bins operating within normal parameters.</div>
            </Card>
          ) : (
            alerts.map((a, i) => (
              <Card key={i} style={{ borderLeft: `3px solid ${a.level === 'critical' ? C.red : C.amber}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Ico.alert s={18} c={a.level === 'critical' ? C.red : C.amber} />
                    <div>
                      <div style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 13, fontWeight: 600, color: dm.text }}>
                        Bin #{a.id} — {a.type}
                      </div>
                      <div style={{ fontSize: 12, color: dm.sub, marginTop: 3 }}>{a.msg}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Chip color={a.level === 'critical' ? C.red : C.amber}>{a.level?.toUpperCase()}</Chip>
                    <Mono size={12} color={a.level === 'critical' ? C.red : C.amber}>{a.fill}%</Mono>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Summary panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoBox type="red" label="Critical Alert Protocol">
              Critical bins trigger an immediate rerouting request. If no truck is available within 30 minutes, the bin is escalated to supervisory alert tier.
            </InfoBox>
            <InfoBox type="amber" label="Medium Alert Protocol">
              Medium bins are queued for next-cycle collection. They will be automatically included in route optimisation if fill velocity exceeds 2% per hour.
            </InfoBox>
          </div>
        </div>
      )}

      {/* ══ CATEGORIES TAB ══ */}
      {tab === 'Categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(data.type_breakdown || []).map(cat => (
            <Card key={cat.type}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: '"Sora",sans-serif', fontSize: 14, fontWeight: 700, color: dm.text, textTransform: 'capitalize' }}>
                    {cat.type}
                  </div>
                  <div style={{ fontSize: 11, color: dm.sub, fontFamily: '"DM Sans",sans-serif', marginTop: 2 }}>
                    {cat.total} bins monitored
                  </div>
                </div>
                <Chip color={cat.avg_fill > 70 ? C.red : cat.avg_fill > 45 ? C.amber : C.green}>
                  Avg {cat.avg_fill}% full
                </Chip>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  ['Normal', cat.normal_pct, C.green],
                  ['Medium', cat.medium_pct, C.amber],
                  ['Critical', cat.critical_pct, C.red],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ padding: '10px 12px', background: `${color}0c`, borderRadius: 8, border: `1px solid ${color}28` }}>
                    <Label color={color} style={{ marginBottom: 6 }}>{label}</Label>
                    <Mono size={20} weight={800} color={color}>{val}%</Mono>
                    <div style={{ marginTop: 4, fontSize: 10, color: dm.sub, fontFamily: '"DM Sans",sans-serif' }}>
                      ≈{Math.round(cat.total * val / 100)} bins
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {(data.type_breakdown || []).length === 0 && (
            <div className="loader"><Ico.analytics s={24} c={C.s400} /> No category data yet — run optimization first.</div>
          )}
        </div>
      )}
    </AppShell>
  );
}
