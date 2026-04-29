import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import AppShell from '../components/AppShell';
import { useToast } from '../components/Toast';
import { api } from '../api';
import { C, Mono, FillBar, PageHeader, Ico } from '../design';

const sColor = s =>
  s === 'CRITICAL' ? C.red :
  s === 'MEDIUM'   ? C.amber : C.green;

function MapFit({ bins }) {
  const map     = useMap();
  const hasFit  = useRef(false);
  useEffect(() => {
    if (hasFit.current) return;
    const c = bins.filter(b => b.latitude && b.longitude).map(b => [b.latitude, b.longitude]);
    if (c.length) { map.fitBounds(c, { padding: [32, 32] }); hasFit.current = true; }
  }, [bins, map]);
  return null;
}

function PopupContent({ bin, onCollect }) {
  return (
    <div style={{ padding: '14px 16px', minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#111' }}>
        {bin.bin_id}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 12 }}>
        {[
          ['Type',   bin.bin_type?.toUpperCase()],
          ['Fill',   `${bin.fill_level}%`],
          ['Status', bin.status],
          ['ETA',    bin.time_to_fill_hours != null && bin.time_to_fill_hours < 99 ? `${bin.time_to_fill_hours}h` : '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', marginBottom: 1 }}>{k}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{v}</div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onCollect(bin.bin_id)}
        style={{ width: '100%', background: '#1a7a4a', color: '#fff', border: 'none', padding: '7px 0', borderRadius: 7, fontWeight: 500, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      >
        Mark Collected
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const nav   = useNavigate();
  const toast = useToast();

  const [bins,     setBins]     = useState([]);
  const [stats,    setStats]    = useState({});
  const [routes,   setRoutes]   = useState({ routes: [] });
  const [filter,   setFilter]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [optimizing, setOpt]    = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const [b, s, r] = await Promise.all([
        api.bins(), api.stats(), api.latestRoutes(),
      ]);
      setBins(b); setStats(s); setRoutes(r);
    } catch (e) {
      toast.error(`Failed to load data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    ref.current = setInterval(load, 10000);
    return () => clearInterval(ref.current);
  }, [load]);

  const handleOpt = async () => {
    if (optimizing) return;
    setOpt(true);
    try {
      const result = await api.optimizeAndWait(status => {
        if (status.status === 'running') toast.info('Optimizing routes… this takes a few seconds.');
      });
      toast.success(`Routes optimized — ${result?.total_bins_assigned ?? 0} stops across ${result?.routes?.length ?? 0} trucks.`);
      nav('/route');
    } catch (e) {
      toast.error(`Optimization failed: ${e.message}`);
    } finally {
      setOpt(false);
    }
  };

  const handleCollect = async id => {
    try {
      await api.collect(id);
      toast.success(`Bin ${id} marked as collected.`);
      load();
    } catch (e) {
      toast.error(`Collect failed: ${e.message}`);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all bins to initial state?')) return;
    try {
      await api.reset();
      toast.success('All bins reset.');
      load();
    } catch (e) {
      toast.error(`Reset failed: ${e.message}`);
    }
  };

  const displayed = (filter ? bins.filter(b => b.status === 'CRITICAL') : bins)
    .sort((a, b) => b.fill_level - a.fill_level);
  const top15     = displayed.slice(0, 15);
  const polys     = (routes.routes || []).filter(r => r.path_geometry?.length > 0).map(r => r.path_geometry);
  const critCount = bins.filter(b => b.status === 'CRITICAL').length;

  return (
    <AppShell
      title="Overview"
      subtitle="Live waste network · Coimbatore"
      headerActions={<>
        {critCount > 0 && (
          <div className="live-indicator" style={{ background: 'rgba(185,28,28,0.07)', borderColor: 'rgba(185,28,28,0.2)', color: C.red }}>
            <div className="live-dot" style={{ background: C.red }} />
            {critCount} critical
          </div>
        )}
        <div className="live-indicator desktop-only">
          <div className="live-dot" />
          {stats.total_bins ?? '—'} bins live
        </div>
        <button className="btn-primary-sm" onClick={handleOpt} disabled={optimizing}>
          <Ico.zap s={13} />
          <span className="desktop-only">{optimizing ? 'Optimizing…' : 'Optimize'}</span>
        </button>
      </>}
    >
      <PageHeader title="Operations Overview" subtitle={`Live waste network · Coimbatore · ${stats.total_bins ?? 0} nodes monitored`} />

      {/* KPI Row */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Bins</div>
          <div className="kpi-value">
            {loading ? <Mono size={22} weight={800} color="var(--text-3)">—</Mono>
                     : <Mono size={22} weight={800}>{stats.total_bins ?? '—'}</Mono>}
          </div>
          <div className="kpi-sub">active on network</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: critCount > 0 ? `3px solid ${C.red}` : undefined }}>
          <div className="kpi-label">Critical</div>
          <div className="kpi-value">
            <Mono size={22} weight={800} color={critCount > 0 ? C.red : undefined}>
              {String(stats.critical ?? '—').padStart(2, '0')}
            </Mono>
          </div>
          <div className="kpi-sub" style={{ color: critCount > 0 ? C.red : undefined }}>
            {critCount > 0 ? 'immediate action' : 'all clear'}
          </div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => nav('/route')}>
          <div className="kpi-label">Active Routes</div>
          <div className="kpi-value"><Mono size={22} weight={800}>{routes.routes?.length ?? '—'}</Mono></div>
          <div className="kpi-sub">{routes.total_bins_assigned ?? 0} stops · {routes.avg_route_time_hrs ?? 0}h avg</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Fill</div>
          <div className="kpi-value">
            <Mono size={22} weight={800} color={stats.avg_fill > 70 ? C.red : stats.avg_fill > 45 ? C.amber : C.green}>
              {stats.avg_fill != null ? `${stats.avg_fill}%` : '—'}
            </Mono>
          </div>
          <FillBar pct={stats.avg_fill ?? 0} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Waste Load</div>
          <div className="kpi-value"><Mono size={22} weight={800}>{stats.total_weight ?? '—'}</Mono></div>
          <div className="kpi-sub">kg across all active bins</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => nav('/analytics')}>
          <div className="kpi-label">Sensor Faults</div>
          <div className="kpi-value">
            <Mono size={22} weight={800} color={stats.faults > 0 ? C.amber : C.green}>{stats.faults ?? 0}</Mono>
          </div>
          <div className="kpi-sub">{stats.faults > 0 ? 'inspect required' : 'all sensors OK'}</div>
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Sector Map</div>
            <div className="card-subtitle desktop-only">{bins.length} nodes · real-time telemetry</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, ...(filter ? { background: 'var(--crit-soft)', color: 'var(--crit)', borderColor: 'rgba(200,55,45,0.25)' } : {}) }}
              onClick={() => setFilter(f => !f)}
            >
              {filter ? 'Show all' : 'Critical only'}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={handleReset}>Reset</button>
          </div>
        </div>

        <div className="map-wrapper">
          <MapContainer center={[11.0168, 76.9558]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              attribution="© OpenStreetMap © CARTO"
              subdomains="abcd" maxZoom={20}
            />
            {polys.map((p, i) => (
              <Polyline key={i} positions={p} pathOptions={{ color: '#1a7a4a', weight: 2, opacity: 0.25, dashArray: '4,4' }} />
            ))}
            {displayed.filter(b => b.latitude && b.longitude).map(bin => (
              <CircleMarker
                key={bin.bin_id}
                center={[bin.latitude, bin.longitude]}
                radius={bin.status === 'CRITICAL' ? 9 : bin.status === 'MEDIUM' ? 6 : 5}
                pathOptions={{
                  fillColor: sColor(bin.status),
                  color: bin.status === 'CRITICAL' ? sColor(bin.status) : 'transparent',
                  weight: 1.5, fillOpacity: bin.status === 'CRITICAL' ? 0.95 : 0.75,
                }}
                className={bin.status === 'CRITICAL' ? 'pulse-critical' : ''}
              >
                {bin.status === 'CRITICAL' && (
                  <Tooltip permanent direction="top">#{bin.bin_id}</Tooltip>
                )}
                <Popup>
                  <PopupContent bin={bin} onCollect={handleCollect} />
                </Popup>
              </CircleMarker>
            ))}
            <MapFit bins={displayed} />
          </MapContainer>

          <div style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
            border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '6px 12px', display: 'flex', gap: 14, alignItems: 'center',
            fontSize: 10, fontFamily: '"DM Sans",sans-serif', fontWeight: 500, color: '#64748b',
          }}>
            {[[C.red, 'Critical'], [C.amber, 'Medium'], [C.green, 'Normal']].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bin List */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Bin Telemetry</div>
            <div className="card-subtitle">Top 15 by fill level</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{top15.length} shown</span>
        </div>

        {/* Desktop table */}
        <div className="desktop-only" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Bin', 'Type', 'Fill', 'Status', 'Reason', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontFamily: '"DM Sans",sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top15.map(bin => (
                <tr key={bin.bin_id} onClick={() => nav(`/waste_stream?id=${bin.bin_id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>#{bin.bin_id}</span>
                    {bin.zone && <span style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{bin.zone}</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'capitalize' }}>{bin.bin_type}</span></td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="fill-bar">
                        <div className="fill-bar-fill" style={{ width: `${bin.fill_level}%`, background: sColor(bin.status) }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 12, color: sColor(bin.status), minWidth: 30 }}>{bin.fill_level}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}><span className={`status-text ${bin.status.toLowerCase()}`}>{bin.status}</span></td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-3)', maxWidth: 180 }}>{bin.reason}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); handleCollect(bin.bin_id); }}>
                      Collect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="mobile-only">
          {top15.map(bin => (
            <div key={bin.bin_id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => nav(`/waste_stream?id=${bin.bin_id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>#{bin.bin_id} · {bin.bin_type}</span>
                <span className={`status-text ${bin.status.toLowerCase()}`}>{bin.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--surface-hi)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${bin.fill_level}%`, height: '100%', background: sColor(bin.status), borderRadius: 2 }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 12, color: sColor(bin.status) }}>{bin.fill_level}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{bin.reason}</span>
                <button className="btn btn-ghost" style={{ fontSize: 11 }}
                  onClick={e => { e.stopPropagation(); handleCollect(bin.bin_id); }}>Collect</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px var(--sp-5)', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => nav('/waste_stream')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            View all {bins.length} bins →
          </button>
        </div>
      </div>
    </AppShell>
  );
}
