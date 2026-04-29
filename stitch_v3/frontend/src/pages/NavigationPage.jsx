import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import AppShell from '../components/AppShell';
import { useToast } from '../components/Toast';
import { api } from '../api';

// ── Design tokens (Apple / Stripe / Tesla inspired) ──────────────────────────
const T = {
  bg:       '#f5f5f7',
  surface:  '#ffffff',
  border:   'rgba(0,0,0,0.08)',
  text1:    '#1d1d1f',
  text2:    '#6e6e73',
  text3:    '#aeaeb2',
  accent:   '#0071e3',
  green:    '#30d158',
  red:      '#ff3b30',
  amber:    '#ff9f0a',
};

// Per-stop route segment colors — consistent between markers and polylines
const STOP_COLORS = [
  '#2563eb', // blue
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#db2777', // pink
  '#65a30d', // lime
];


// ── Utility ───────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function fmtDist(m) {
  if (m == null) return '—';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// ── Map icons ─────────────────────────────────────────────────────────────────
function makeTruckIcon(bearing = 0) {
  const html = `
    <div style="width:44px;height:44px;transform:rotate(${bearing}deg)">
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="22" r="18" fill="${T.accent}" opacity="0.18"/>
        <circle cx="22" cy="22" r="12" fill="${T.accent}"/>
        <polygon points="22,8 16,20 22,17 28,20" fill="white"/>
        <circle cx="22" cy="22" r="3" fill="white"/>
      </svg>
    </div>`;
  return L.divIcon({ className: '', html, iconSize: [44, 44], iconAnchor: [22, 22] });
}

function makeStopIcon(seq, type, stopIdx = 0) {
  const isNext = type === 'next';
  const isDone = type === 'done';
  // Use actual stop color when pending/next, grey when done
  const bg   = isDone ? '#94a3b8' : isNext
    ? (STOP_COLORS?.[stopIdx % STOP_COLORS.length] || T.accent)
    : (STOP_COLORS?.[stopIdx % STOP_COLORS.length] || T.accent);
  const size = isNext ? 36 : 28;
  const half = size / 2;
  const label = isDone ? '✓' : String(seq);
  const html = `
    <svg width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="d"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/></filter></defs>
      <path d="M${half} ${size + 6} L${half - 8} ${size - 2} A${half} ${half} 0 1 1 ${half + 8} ${size - 2} Z"
            fill="${isDone ? '#94a3b8' : bg}" filter="url(#d)" opacity="${isDone ? 0.6 : 1}"/>
      <text x="${half}" y="${half + 4}" text-anchor="middle" fill="white"
            font-family="-apple-system,BlinkMacSystemFont,sans-serif"
            font-size="${isNext ? 14 : 11}" font-weight="700">${label}</text>
    </svg>`;
  return L.divIcon({ className: '', html, iconSize: [size, size + 8], iconAnchor: [half, size + 8] });
}

// ── Map sub-components (all must live inside MapContainer) ────────────────────
function AutoPan({ lat, lng, enabled }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!lat || !lng || !enabled) return;
    if (prev.current) {
      const [pl, pg] = prev.current;
      if (Math.abs(pl - lat) < 0.00002 && Math.abs(pg - lng) < 0.00002) return;
    }
    prev.current = [lat, lng];
    map.panTo([lat, lng], { animate: true, duration: 1.2, easeLinearity: 0.25 });
  }, [lat, lng, enabled, map]);
  return null;
}

// BUG FIX: Stable initial position so marker never jumps from [0,0]
function SmoothTruck({ lat, lng, bearing }) {
  const markerRef  = useRef(null);
  const curPosRef  = useRef({ lat, lng }); // starts at actual position, no jump
  const animRef    = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;
    const from = { ...curPosRef.current };
    const to   = { lat, lng };
    const t0   = performance.now();
    const dur  = 900;
    cancelAnimationFrame(animRef.current);
    const tick = (now) => {
      const p    = Math.min((now - t0) / dur, 1);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const clat = lerp(from.lat, to.lat, ease);
      const clng = lerp(from.lng, to.lng, ease);
      curPosRef.current = { lat: clat, lng: clng };
      if (markerRef.current) {
        markerRef.current.setLatLng([clat, clng]);
        markerRef.current.setIcon(makeTruckIcon(bearing));
      }
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [lat, lng, bearing]);

  if (!lat || !lng) return null;
  return <Marker ref={markerRef} position={[lat, lng]} icon={makeTruckIcon(bearing)} zIndexOffset={1000} />;
}



// Assign each lat/lng point in pathGeom to its nearest stop segment
// by mapping waypoints proportionally across stops in order
function splitGeomByStops(pathGeom, stops) {
  if (!pathGeom || pathGeom.length < 2 || !stops.length) return [];
  const n = stops.length + 1; // +1 because we start from truck position
  const segLen = Math.ceil(pathGeom.length / n);
  return stops.map((stop, i) => ({
    points: pathGeom.slice(i * segLen, (i + 1) * segLen + 1), // +1 for overlap
    color:  STOP_COLORS[i % STOP_COLORS.length],
    stopIdx: i,
  }));
}

function RoutePolylines({ stops, nextIdx, pathGeom, truckLat, truckLng, visitedSet }) {
  if (!pathGeom || pathGeom.length < 2 || !stops.length) return null;

  // Find closest point on path to truck for "driven" cutoff
  let closestIdx = 0;
  if (truckLat && truckLng) {
    let minDist = Infinity;
    pathGeom.forEach(([lat, lng], i) => {
      const d = Math.abs(lat - truckLat) + Math.abs(lng - truckLng);
      if (d < minDist) { minDist = d; closestIdx = i; }
    });
  }

  const segments = splitGeomByStops(pathGeom, stops);

  return (
    <>
      {/* Driven trail — muted dashed grey */}
      {closestIdx > 1 && (
        <Polyline
          positions={pathGeom.slice(0, closestIdx + 1)}
          pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '4,5' }}
        />
      )}

      {/* Per-stop colored segments — hidden when stop collected */}
      {segments.map(({ points, color, stopIdx }) => {
        const stop = stops[stopIdx];
        if (!stop || (visitedSet && visitedSet.has(stop.bin_id))) return null;
        const isNext = stopIdx === nextIdx;
        if (points.length < 2) return null;
        return (
          <Polyline
            key={`seg-${stopIdx}`}
            positions={points}
            pathOptions={{
              color,
              weight: isNext ? 5.5 : 3.5,
              opacity: isNext ? 0.92 : 0.5,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: isNext ? undefined : '10,6',
            }}
          />
        );
      })}

      {/* Active next segment bright highlight on top */}
      {segments[nextIdx] && segments[nextIdx].points.length > 1 &&
        !(visitedSet && visitedSet.has(stops[nextIdx]?.bin_id)) && (
        <Polyline
          positions={segments[nextIdx].points}
          pathOptions={{
            color: STOP_COLORS[nextIdx % STOP_COLORS.length],
            weight: 6.5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}
    </>
  );
}


function StopMarkers({ stops, visitedSet, nextIdx }) {
  return stops.map((stop, i) => {
    if (!stop.latitude || !stop.longitude) return null;
    const isDone = visitedSet.has(stop.bin_id);
    const isNext = i === nextIdx;
    const type   = isDone ? 'done' : isNext ? 'next' : 'pending';
    return (
      <Marker key={stop.bin_id} position={[stop.latitude, stop.longitude]}
        icon={makeStopIcon(i + 1, type)} zIndexOffset={isNext ? 500 : isDone ? 0 : 200}>
        <Tooltip direction="top" offset={[0, -12]}>
          {isNext ? `▶ Stop ${i + 1} — Bin #${stop.bin_id}` : isDone ? `✓ Collected` : `Stop ${i + 1}`}
        </Tooltip>
      </Marker>
    );
  });
}

// BUG FIX: Zoom buttons inside MapContainer so useMap() context works
function MapControls({ autoPan, onToggleAutoPan }) {
  const map = useMap();
  return (
    <div style={{
      position: 'absolute', right: 16, bottom: 160, zIndex: 1000,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <MapBtn icon={autoPan ? 'gps_fixed' : 'gps_not_fixed'}
        active={autoPan} onClick={onToggleAutoPan} title="Auto-pan" />
      <MapBtn icon="add" onClick={() => map.setZoom(map.getZoom() + 1)} />
      <MapBtn icon="remove" onClick={() => map.setZoom(map.getZoom() - 1)} />
    </div>
  );
}

function MapBtn({ icon, onClick, active, title }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 40, height: 40,
      background: active ? T.accent : 'rgba(255,255,255,0.95)',
      border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: 10, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      color: active ? '#fff' : T.text1,
      transition: 'background 0.2s',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
    </button>
  );
}

// ── Truck selection screen ────────────────────────────────────────────────────
function TruckPicker({ trucks, onSelect }) {
  return (
    <AppShell title="Navigation" subtitle="Select a vehicle to begin">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {trucks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 32px',
            background: T.surface, borderRadius: 18,
            border: `1px solid ${T.border}`,
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 48, color: T.text3, display: 'block', marginBottom: 16 }}>
              local_shipping
            </span>
            <div style={{ fontSize: 18, fontWeight: 600, color: T.text1, marginBottom: 8 }}>
              No active routes
            </div>
            <div style={{ fontSize: 14, color: T.text2, marginBottom: 28 }}>
              Optimise routes first to dispatch trucks.
            </div>
            <a href="/route" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', background: T.accent, color: '#fff',
              borderRadius: 980, textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>route</span>
              Go to Fleet Map
            </a>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: T.text2, marginBottom: 20 }}>
              {trucks.length} truck{trucks.length > 1 ? 's' : ''} active — select one to open the live driver view.
            </p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))' }}>
              {trucks.map(t => {
                const isDone = t.stop_index >= t.total_stops && t.total_stops > 0;
                const pct    = t.total_stops > 0 ? Math.round(t.stop_index / t.total_stops * 100) : 0;
                return (
                  <div key={t.vehicle_id} onClick={() => onSelect(t.vehicle_id)}
                    style={{
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'none';
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isDone ? 'rgba(48,209,88,0.12)' : 'rgba(0,113,227,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span className="material-symbols-outlined"
                            style={{ fontSize: 18, color: isDone ? T.green : T.accent }}>
                            local_shipping
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1 }}>Truck {t.vehicle_id}</div>
                          <div style={{ fontSize: 12, color: T.text2 }}>{t.total_stops} stops</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 980,
                        background: isDone ? 'rgba(48,209,88,0.12)' : 'rgba(0,113,227,0.1)',
                        color: isDone ? T.green : T.accent,
                      }}>
                        {isDone ? 'Done' : `${pct}%`}
                      </span>
                    </div>
                    <div style={{ height: 4, background: '#f0f0f5', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2,
                        background: isDone ? T.green : T.accent, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Haversine for geofence ────────────────────────────────────────────────────
function haversineDist(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NavigationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTruckId = searchParams.get('truck');
  const toast = useToast();

  const [trucks,    setTrucks]    = useState([]);
  const [detail,    setDetail]    = useState(null);
  const [autoPan,   setAutoPan]   = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [geofencePrompt, setGeofencePrompt] = useState(false); // auto-arrival prompt
  const initCenter    = useRef(null);
  const geofenceShown = useRef(false); // prevent repeated prompts for same stop

  const loadTrucks = useCallback(async () => {
    try { setTrucks(await api.trucks() || []); } catch {}
  }, []);

  const loadDetail = useCallback(async () => {
    if (!activeTruckId) return;
    try {
      const d = await api.truckDetail(activeTruckId);
      setDetail(d);
      if (!initCenter.current && d?.lat && d?.lng) {
        initCenter.current = [d.lat, d.lng];
      }
      // ── Auto geofence detection ──────────────────────────────
      const stops   = d?.stops || [];
      const nextIdx = d?.stop_index ?? 0;
      const next    = stops[nextIdx];
      if (next && d?.lat && d?.lng) {
        const dist = haversineDist(d.lat, d.lng, next.latitude, next.longitude);
        const key  = `${activeTruckId}-${next.bin_id}`;
        if (dist < 40 && !geofenceShown.current) {
          geofenceShown.current = true;
          setGeofencePrompt(true);
          toast.info(`You are ${Math.round(dist)} m from Bin #${next.bin_id}. Confirm arrival?`, 8000);
        } else if (dist >= 60) {
          // Reset so it can trigger again when they arrive next time
          geofenceShown.current = false;
          setGeofencePrompt(false);
        }
      }
    } catch {}
  }, [activeTruckId, toast]);

  useEffect(() => {
    loadTrucks();
    const t = setInterval(loadTrucks, 6000);
    return () => clearInterval(t);
  }, [loadTrucks]);

  useEffect(() => {
    if (!activeTruckId) { setDetail(null); initCenter.current = null; return; }
    loadDetail();
    const t = setInterval(loadDetail, 1500);
    return () => clearInterval(t);
  }, [activeTruckId, loadDetail]);

  const advance = async () => {
    if (!activeTruckId || advancing) return;
    setAdvancing(true);
    try { await api.truckAdvance(activeTruckId); await loadDetail(); }
    finally { setAdvancing(false); }
  };

  // Truck picker screen
  if (!activeTruckId) {
    return <TruckPicker trucks={trucks} onSelect={id => setSearchParams({ truck: id })} />;
  }

  const stops      = detail?.stops || [];
  const visitedSet = new Set(detail?.visited || []);
  const nextIdx    = detail?.stop_index ?? 0;
  const nextStop   = stops[nextIdx] || null;
  const progress   = stops.length > 0 ? Math.round((nextIdx / stops.length) * 100) : 0;
  const done       = nextIdx >= stops.length && stops.length > 0;
  const mapCenter  = initCenter.current || (detail?.lat ? [detail.lat, detail.lng] : [20, 78]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 56, flexShrink: 0,
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 3000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSearchParams({})} style={{
            width: 32, height: 32, background: '#f0f0f5', border: 'none',
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.text1,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, lineHeight: 1.2 }}>
              Truck {activeTruckId}
            </div>
            <div style={{ fontSize: 11, color: T.text2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
              Live tracking
            </div>
          </div>
        </div>

        {/* Next stop HUD */}
        {!done && nextStop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: T.text2, fontWeight: 500 }}>NEXT STOP</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text1 }}>Bin #{nextStop.bin_id}</div>
            </div>
            <div style={{ width: 1, height: 32, background: T.border }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: T.text2, fontWeight: 500 }}>ETA</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text1 }}>
                {detail?.eta_minutes != null ? `${detail.eta_minutes} min` : '—'}
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: T.border }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: T.text2, fontWeight: 500 }}>DISTANCE</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text1 }}>{fmtDist(detail?.dist_to_next_m)}</div>
            </div>
            {(() => {
              const remainingStops = stops.filter(s => !visitedSet.has(s.bin_id) && s.latitude);
              if (!detail?.lat || remainingStops.length === 0) return null;
              const origin = `${detail.lat},${detail.lng}`;
              const destObj = remainingStops[remainingStops.length - 1];
              const destination = `${destObj.latitude},${destObj.longitude}`;
              const waypoints = remainingStops.slice(0, -1).map(s => `${s.latitude},${s.longitude}`).join('|');
              const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving${waypoints ? `&waypoints=${waypoints}` : ''}`;
              
              return (
                <a href={gmapsUrl} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', background: T.accent, color: '#fff',
                    borderRadius: 980, textDecoration: 'none', fontSize: 13, fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,113,227,0.35)',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                  Google Maps
                </a>
              );
            })()}
          </div>
        )}

        {done && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: 'rgba(48,209,88,0.1)',
            borderRadius: 980, color: T.green, fontWeight: 600, fontSize: 14 }}>
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 18 }}>task_alt</span>
            Route Complete
          </div>
        )}
      </div>

      {/* ── Map (flex:1, never re-mounts because center is stable ref) ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {!detail?.lat ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#f5f5f7' }}>
            <div style={{ width: 36, height: 36, border: `3px solid #e0e0e5`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Acquiring GPS…</div>
          </div>
        ) : (
          /* BUG FIX: key is static string — MapContainer never unmounts/remounts */
          <MapContainer
            key="nav-map"
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              subdomains="abcd" maxZoom={20}
            />

            <RoutePolylines
              stops={stops} nextIdx={nextIdx}
              pathGeom={detail.path_geometry || []}
              truckLat={detail.lat} truckLng={detail.lng}
              visitedSet={visitedSet}
            />
            <StopMarkers stops={stops} visitedSet={visitedSet} nextIdx={nextIdx} />
            <SmoothTruck lat={detail.lat} lng={detail.lng} bearing={detail.bearing || 0} />
            <AutoPan lat={detail.lat} lng={detail.lng} enabled={autoPan} />
            {/* BUG FIX: MapControls inside MapContainer so useMap() works */}
            <MapControls autoPan={autoPan} onToggleAutoPan={() => setAutoPan(p => !p)} />
            
            {/* Directions overlay */}
            {!done && detail?.legs && detail.legs[nextIdx]?.steps && (
              <div style={{
                position: 'absolute', top: 20, left: 20, zIndex: 1000,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
                borderRadius: 16, padding: 16, width: 300,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: `1px solid ${T.border}`,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Directions to Bin #{nextStop?.bin_id}
                </div>
                {detail.legs[nextIdx].steps.filter(s => s.distance > 0 && s.maneuver?.type).slice(0, 3).map((step, i) => {
                  const type = step.maneuver.type;
                  const mod = step.maneuver.modifier;
                  const icon = 
                    type === 'depart' ? 'trip_origin' :
                    type === 'arrive' ? 'pin_drop' :
                    mod?.includes('left') ? 'turn_left' :
                    mod?.includes('right') ? 'turn_right' :
                    mod === 'uturn' ? 'u_turn_left' :
                    'straight';
                  
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: i===0 ? T.accent : '#f1f5f9', color: i===0 ? '#fff' : T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: i===0 ? 600 : 500, color: i===0 ? T.text1 : T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {type === 'depart' ? 'Head ' + (mod || 'straight') :
                           type === 'turn' ? `Turn ${mod}` :
                           type === 'arrive' ? 'Arrive at destination' :
                           `${type} ${mod || ''}`} {step.name ? `on ${step.name}` : ''}
                        </div>
                        <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{fmtDist(step.distance)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </MapContainer>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div style={{
        flexShrink: 0, height: 80,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20,
        zIndex: 3000,
      }}>
        {/* Progress */}
        <div style={{ minWidth: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text2, fontWeight: 500, marginBottom: 6 }}>
            <span>Progress</span>
            <span style={{ color: done ? T.green : T.accent, fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 4, background: '#e0e0e5', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: done ? T.green : T.accent, borderRadius: 2, transition: 'width 0.6s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3, marginTop: 5 }}>
            <span>{nextIdx} done</span>
            <span>{stops.length - nextIdx} left</span>
          </div>
        </div>

        <div style={{ width: 1, height: 40, background: T.border }} />

        {/* Telemetry */}
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Speed</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text1 }}>
              {detail?.speed_kmh ?? 0} <span style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>km/h</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.text2, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Bearing</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text1 }}>
              {detail?.bearing ?? 0}° <span style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>N</span>
            </div>
          </div>
        </div>

        {/* Confirm arrival button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {!done ? (
            <button onClick={advance} disabled={advancing || !nextStop || !detail?.lat}
              style={{
                padding: '12px 28px',
                background: advancing ? '#e0e0e5' : T.accent,
                color: advancing ? T.text3 : '#fff',
                border: 'none', borderRadius: 980, cursor: advancing ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: advancing ? 'none' : '0 4px 16px rgba(0,113,227,0.35)',
                transition: 'all 0.2s',
              }}>
              <span className={`material-symbols-outlined${advancing ? ' animate-spin' : ''}`} style={{ fontSize: 18 }}>
                {advancing ? 'refresh' : 'check_circle'}
              </span>
              {advancing ? 'Updating…' : `Confirm — Bin #${nextStop?.bin_id ?? '—'}`}
            </button>
          ) : (
            <button onClick={() => setSearchParams({})} style={{
              padding: '12px 28px', background: 'rgba(48,209,88,0.12)', color: T.green,
              border: 'none', borderRadius: 980, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Back to Fleet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
