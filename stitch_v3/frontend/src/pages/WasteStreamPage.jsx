import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useToast } from '../components/Toast';
import { api } from '../api';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Color System ──────────────────────────────────────────────────────────────
const T = {
  bg:       '#f5f5f7',
  surface:  '#ffffff',
  border:   'rgba(0,0,0,0.08)',
  text1:    '#1d1d1f',
  text2:    '#6e6e73',
  text3:    '#aeaeb2',
  accent:   '#0071e3', // Blue
  green:    '#30d158', // Green
  red:      '#ff3b30', // Red
  amber:    '#ff9f0a', // Amber
  slate:    '#1e293b', // Slate 800
};

const sColor = s => s === 'CRITICAL' ? T.red : s === 'MEDIUM' ? T.amber : T.green;

// ── Components ────────────────────────────────────────────────────────────────
function GaugeCircle({ pct, color }) {
  const r = 48, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      <svg viewBox="0 0 120 120" width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke={T.bg} strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.text1, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>FILL</div>
      </div>
    </div>
  );
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 16); }, [center, map]);
  return null;
}

function makeBinIcon(color) {
  const html = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="3" />
      <circle cx="12" cy="12" r="4" fill="white" />
    </svg>`;
  return L.divIcon({ className: '', html, iconSize: [24, 24], iconAnchor: [12, 12] });
}

export default function WasteStreamPage() {
  const toast = useToast();
  const [bins, setBins]     = useState([]);
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [loading, setLoad]  = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const b = await api.bins();
      setBins(b); setLoad(false);
      const fid = searchParams.get('id');
      if (fid && !detailId) setDetailId(fid);
      else if (!fid && !detailId && b.length > 0) setDetailId(b[0].bin_id);
    } catch (e) {
      toast.error(`Failed to load bins: ${e.message}`);
      setLoad(false);
    }
  }, [searchParams, detailId, toast]);

  useEffect(() => { load(); ref.current = setInterval(load, 10000); return () => clearInterval(ref.current); }, [load]);

  const handleSelect = (id) => {
    setDetailId(id);
    setSearchParams({ id });
  };

  const handleCollect = async (id) => {
    try {
      await api.collect(id);
      toast.success(`Bin ${id} marked as collected.`);
      load();
    } catch (e) {
      toast.error(`Collect failed: ${e.message}`);
    }
  };

  const filtered = bins
    .filter(b => !search || b.bin_id.toLowerCase().includes(search.toLowerCase()) || b.bin_type?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.fill_level - a.fill_level);

  const detail = bins.find(b => b.bin_id === detailId);
  const hist = detail?.history || Array.from({ length: 10 }, (_, i) => Math.round((detail?.fill_level || 0) * (0.5 + i * 0.06)));
  const hum = detail?.humidity || Math.round(40 + Math.random() * 20);

  return (
    <AppShell
      title="Waste Stream"
      subtitle="Tactical Node Monitoring"
      headerActions={
        <button className="btn-icon" title="Export Stream" onClick={api.exportCsv}>
          <span className="material-symbols-outlined">download</span>
        </button>
      }
    >
      <div style={{ display: 'flex', height: 'calc(100vh - 104px)', gap: 24, overflow: 'hidden' }}>
        
        {/* ── LEFT PANE: MASTER BIN LIST ───────────────────────── */}
        <div style={{ width: 340, display: 'flex', flexDirection: 'column', background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${T.border}`, background: T.bg }}>
            <div className="search-input-wrap" style={{ width: '100%', background: T.surface }}>
              <span className="material-symbols-outlined">search</span>
              <input className="search-input" placeholder="Search bin ID or sector…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && bins.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: T.text3 }}>Loading stream...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: T.text3 }}>No bins found.</div>
            ) : (
              filtered.map(bin => {
                const active = bin.bin_id === detailId;
                const c = sColor(bin.status);
                return (
                  <div key={bin.bin_id} onClick={() => handleSelect(bin.bin_id)} style={{
                    padding: '16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                    background: active ? 'rgba(0,113,227,0.05)' : T.surface,
                    borderLeft: active ? `3px solid ${T.accent}` : '3px solid transparent',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: active ? T.accent : T.text1 }}>#{bin.bin_id}</div>
                        <div style={{ fontSize: 11, color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{bin.bin_type}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: c }}>{bin.fill_level}%</div>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                      </div>
                    </div>
                    <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${bin.fill_level}%`, background: c, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: DETAIL CANVAS ────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: T.surface, borderRadius: 16, border: `1px solid ${T.border}` }}>
          {!detail ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text3 }}>
              Select a node to view tactical details.
            </div>
          ) : (
            <div className="animate-fade-up" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-flex', padding: '4px 10px', background: T.slate, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1, borderRadius: 6, marginBottom: 12, textTransform: 'uppercase' }}>
                    {detail.bin_type}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: T.text1, letterSpacing: -0.5 }}>{detail.zone || 'Central Sector'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.text2, fontSize: 13, marginTop: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                    {detail.latitude?.toFixed(5)}°N, {detail.longitude?.toFixed(5)}°E
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 980, background: detail.status === 'CRITICAL' ? 'rgba(255,59,48,0.1)' : 'rgba(48,209,88,0.1)', color: sColor(detail.status), fontWeight: 700, fontSize: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: detail.status === 'CRITICAL' ? 'pulse-dot 1s infinite' : 'none' }} />
                    {detail.status === 'CRITICAL' ? 'CRITICAL STATUS' : 'SYSTEM OPTIMAL'}
                  </div>
                  <button onClick={() => handleCollect(detail.bin_id)} style={{
                    padding: '10px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,113,227,0.3)',
                    transition: 'transform 0.1s, box-shadow 0.2s'
                  }} onMouseDown={e => e.currentTarget.style.transform='scale(0.96)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                    Dispatch Collection Team
                  </button>
                </div>
              </div>

              {/* Analytics Top Row */}
              <div style={{ display: 'flex', gap: 32 }}>
                {/* Gauge Area */}
                <div style={{ background: T.bg, padding: 24, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>
                  <GaugeCircle pct={detail.fill_level} color={sColor(detail.status)} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 4 }}>Capacity Index</div>
                    <div style={{ fontSize: 13, color: T.text2, maxWidth: 160, lineHeight: 1.4 }}>
                      {detail.fill_level > 80 ? 'Immediate extraction required. Overfill risk imminent.' : 
                       detail.fill_level > 50 ? 'Capacity nominal. Monitor queue.' : 'Capacity well within operational limits.'}
                    </div>
                  </div>
                </div>

                {/* Telemetry Grid */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { title: 'HAZARDOUS GAS', val: detail.gas_level ? `${detail.gas_level} ppm` : '—', c: detail.gas_level > 100 ? T.red : T.green },
                    { title: 'CORE TEMP', val: detail.temperature ? `${detail.temperature} °C` : '—', c: detail.temperature > 38 ? T.red : T.green },
                    { title: 'HUMIDITY', val: `${hum} %`, c: hum > 70 ? T.amber : T.green },
                    { title: 'NET WEIGHT', val: detail.weight ? `${detail.weight} kg` : '—', c: T.text2 },
                  ].map((t, i) => (
                    <div key={i} style={{ padding: 16, background: T.bg, borderRadius: 12, borderLeft: `4px solid ${t.c}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.5 }}>{t.title}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: T.text1, marginTop: 8 }}>{t.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intelligence Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                <div style={{ padding: 20, border: `1px solid ${T.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, marginBottom: 16 }}>ISSUE LOG</div>
                  {detail.status === 'CRITICAL' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: T.red }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Capacity Critical</div>
                        <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>Threshold breached.</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: T.text3 }}>No active alerts. System optimal.</div>
                  )}
                </div>

                <div style={{ padding: 20, border: `1px solid ${T.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, marginBottom: 16 }}>FILL HISTORY</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
                    {hist.slice(-12).map((h, i, arr) => (
                      <div key={i} style={{ flex: 1, borderRadius: '2px 2px 0 0', background: sColor(detail.status), opacity: 0.2 + (i/arr.length)*0.8, height: `${Math.max(h, 5)}%` }} />
                    ))}
                  </div>
                </div>

                <div style={{ padding: 20, border: `1px solid ${T.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, marginBottom: 16 }}>HARDWARE INTEGRITY</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text2, marginBottom: 4 }}>
                      <span>LIDAR Depth Sensor</span>
                      <span style={{ color: T.green }}>100%</span>
                    </div>
                    <div style={{ height: 4, background: T.bg, borderRadius: 2 }}><div style={{ height: 4, width: '100%', background: T.green, borderRadius: 2 }}/></div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text2, marginBottom: 4 }}>
                      <span>Gas Probe</span>
                      <span style={{ color: detail.gas_level > 200 ? T.amber : T.green }}>{detail.gas_level > 200 ? '78%' : '100%'}</span>
                    </div>
                    <div style={{ height: 4, background: T.bg, borderRadius: 2 }}><div style={{ height: 4, width: detail.gas_level > 200 ? '78%' : '100%', background: detail.gas_level > 200 ? T.amber : T.green, borderRadius: 2 }}/></div>
                  </div>
                </div>
              </div>

              {/* Live Map Container */}
              <div style={{ flex: 1, minHeight: 240, borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.bg, position: 'relative' }}>
                {detail.latitude ? (
                  <MapContainer center={[detail.latitude, detail.longitude]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <MapUpdater center={[detail.latitude, detail.longitude]} />
                    <Marker position={[detail.latitude, detail.longitude]} icon={makeBinIcon(sColor(detail.status))} />
                  </MapContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text3 }}>Location data unavailable</div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
