import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import AppShell from '../components/AppShell';
import { api } from '../api';
import { useToast } from '../components/Toast';

const ROUTE_COLORS = ['#2563eb', '#059669', '#9333ea', '#d97706', '#0891b2'];
const sColor = s => s === 'CRITICAL' ? '#c8372d' : s === 'MEDIUM' ? '#a05c00' : '#1a7a4a';

export default function RoutePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [routes,  setRoutes]  = useState({ routes: [], total_distance_km: 0, total_bins_assigned: 0, avg_route_time_hrs: 0 });
  const [bins,    setBins]    = useState([]);
  const [selected, setSel]    = useState(null);
  const [optimizing, setOpt]  = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const [r, b] = await Promise.all([api.latestRoutes(), api.bins()]);
      setRoutes(r); setBins(b);
      if (r.routes?.length && selected === null) setSel(0);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); ref.current = setInterval(load, 15000); return () => clearInterval(ref.current); }, [load]);

  const handleOpt = async () => {
    if (optimizing) return;
    setOpt(true);
    try {
      const result = await api.optimizeAndWait((status) => {
        if (status.status === 'running') toast.info('Optimizing routes… this takes a few seconds.');
      });
      if (result) { setRoutes(result); setSel(0); }
      toast.success(`Routes optimized — ${result?.total_bins_assigned ?? 0} stops across ${result?.routes?.length ?? 0} trucks.`);
      load();
    } catch (e) {
      toast.error(`Optimization failed: ${e.message}`);
    } finally {
      setOpt(false);
    }
  };

  const handleCollect = async id => { await api.collect(id); toast.success(`Bin ${id} collected`); load(); };

  const routeList = routes.routes || [];
  const active    = selected !== null ? routeList[selected] : null;

  return (
    <AppShell
      title="Fleet Map"
      subtitle="VRP route optimization"
      headerActions={<>
        <div className="live-indicator desktop-only">
          <div className="live-dot" />{routeList.length} routes
        </div>
        <button className="btn-primary-sm" onClick={handleOpt} disabled={optimizing}>
          <span className={`material-symbols-outlined${optimizing ? ' animate-spin' : ''}`} style={{ fontSize: 15 }}>
            {optimizing ? 'refresh' : 'bolt'}
          </span>
          <span className="desktop-only">{optimizing ? 'Optimizing…' : 'Recalculate'}</span>
        </button>
      </>}
    >
      {/* Remove old local toast — now handled by global ToastProvider */}

      {/* Summary strip */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-4)' }}>
        {[
          { label: 'Routes',    value: routeList.length },
          { label: 'Stops',     value: routes.total_bins_assigned ?? 0 },
          { label: 'Distance',  value: `${routes.total_distance_km ?? 0} km` },
          { label: 'Avg ETA',   value: `${routes.avg_route_time_hrs ?? 0}h` },
        ].map(({ label, value }) => (
          <div className="kpi-card" key={label}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 'var(--sp-4)' }}>
        {/* Route list */}
        <div className="card desktop-only" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <div className="card-title">Trucks</div>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{routeList.length} active</span>
          </div>
          {routeList.length === 0 ? (
            <div className="loader" style={{ padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>route</span>
              <span>No routes yet</span>
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={handleOpt}>Optimize now</button>
            </div>
          ) : routeList.map((route, i) => {
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
            const stops = (route.bins || []).filter(b => b.bin_id !== 'HQ');
            return (
              <div
                key={route.vehicle_id}
                className={`route-sidebar-card ${selected === i ? 'active' : ''}`}
                style={{ borderLeft: `3px solid ${selected === i ? color : 'transparent'}` }}
                onClick={() => setSel(i)}
              >
                <div className="route-color-dot" style={{ background: color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>Truck {route.vehicle_id}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    {route.distance_km ?? 0} km · {stops.length} stops
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div>
              <div className="card-title">{active ? `Truck ${active.vehicle_id}` : 'All Routes'}</div>
              {active && (
                <div className="card-subtitle">
                  {(active.bins || []).filter(b => b.bin_id !== 'HQ').length} stops · {active.distance_km ?? 0} km
                </div>
              )}
            </div>
            {routeList.length === 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={handleOpt}>Optimize</button>
            )}
          </div>
          <div style={{ height: 480, position: 'relative' }}>
            <MapContainer center={[11.0168, 76.9558]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                attribution="© CARTO" subdomains="abcd" maxZoom={20}
              />
              {routeList.map((route, i) => {
                const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
                return route.path_geometry?.length > 0 && (
                  <Polyline key={route.vehicle_id} positions={route.path_geometry}
                    pathOptions={{ color, weight: selected === i ? 3 : 1.5, opacity: selected === i ? 0.85 : 0.25, lineJoin: 'round' }}
                  />
                );
              })}
              {bins.filter(b => b.latitude && b.longitude).map(bin => (
                <CircleMarker key={bin.bin_id} center={[bin.latitude, bin.longitude]}
                  radius={bin.status === 'CRITICAL' ? 8 : 5}
                  pathOptions={{ fillColor: sColor(bin.status), color: 'rgba(255,255,255,0.8)', weight: 1, fillOpacity: 0.9 }}
                >
                  <Popup>
                    <div style={{ padding: '12px 14px', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>#{bin.bin_id}</div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                        Fill: <strong style={{ color: sColor(bin.status) }}>{bin.fill_level}%</strong> · {bin.status}
                      </div>
                      <button onClick={() => handleCollect(bin.bin_id)}
                        style={{ width: '100%', background: '#1a7a4a', color: '#fff', border: 'none', padding: '6px', borderRadius: 6, fontWeight: 500, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        Collect
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="mobile-only" style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {routeList.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>No active routes</p>
            <button className="btn btn-primary-sm" onClick={handleOpt}>{optimizing ? 'Optimizing…' : 'Optimize Fleet'}</button>
          </div>
        ) : routeList.map((route, i) => {
          const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
          const stops = (route.bins || []).filter(b => b.bin_id !== 'HQ');
          return (
            <div className="card" key={route.vehicle_id} style={{ borderLeft: `3px solid ${color}` }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Truck {route.vehicle_id}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{stops.length} stops</span>
              </div>
              <div style={{ padding: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-6)' }}>
                {[['km', route.distance_km ?? 0], ['hours', route.estimated_hours ?? 0], ['stops', stops.length]].map(([unit, val]) => (
                  <div key={unit}>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{val}</div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginTop: 1 }}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
