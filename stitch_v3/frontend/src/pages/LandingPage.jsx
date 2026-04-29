import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const FEATURES = [
  { icon: 'sensors',       title: 'Real-time telemetry',   desc: 'Fill, weight, gas, temperature streamed every 4 minutes. Event alerts fire immediately at thresholds.' },
  { icon: 'route',         title: 'VRP route optimization', desc: 'OR-Tools solves multi-truck routing with capacity constraints and live congestion zones.' },
  { icon: 'psychology',    title: 'Predictive AI',          desc: 'XGBoost forecasts overflow 4+ hours ahead. High-risk bins join dispatch before going critical.' },
  { icon: 'analytics',     title: 'Deep analytics',         desc: 'Histogram distributions, waste-type breakdowns, overflow buckets, PDF/CSV export.' },
  { icon: 'map',           title: 'Live fleet map',          desc: 'Leaflet map with OSRM road geometry, animated routes, and real-time bin markers.' },
  { icon: 'phone_android', title: 'Mobile first',            desc: 'Full bottom-nav layout. Every feature accessible from a smartphone on-field.' },
];

export default function LandingPage() {
  const canvasRef = useRef(null);
  const nav = useNavigate();
  const [stats, setStats] = useState({});

  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);

    // Minimal dot field — no heavy grid
    const dots = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.25 - 0.06,
      a: Math.random() * 0.25 + 0.05,
      r: Math.random() + 0.4,
    }));

    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy; d.a -= 0.0005;
        if (d.a <= 0 || d.y < -10) {
          d.x = Math.random() * canvas.width; d.y = canvas.height + 10;
          d.a = Math.random() * 0.25 + 0.05;
        }
        ctx.globalAlpha = d.a;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(frame);
    };
    frame();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '11px 24px', borderRadius: 8,
    fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
    border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    transition: 'opacity 150ms',
  };

  return (
    <div style={{ background: '#0c0c0d', color: '#f0f0f1', minHeight: '100vh', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px, 4vw, 48px)', background: 'rgba(12,12,13,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined icon-fill" style={{ fontSize: 14, color: '#fff' }}>recycling</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>STITCH</span>
        </div>
        <button onClick={() => nav('/dashboard')} style={{ ...btnStyle, background: '#fff', color: '#111', padding: '7px 18px', fontSize: 12 }}>
          Open Dashboard
        </button>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 10, minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(26,122,74,0.4)', background: 'rgba(26,122,74,0.1)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: '#4ade80', marginBottom: 32 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 2s infinite', display: 'inline-block' }} />
          Smart Waste Intelligence · Coimbatore
        </div>

        <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 5.5rem)', fontWeight: 600, lineHeight: 1.06, letterSpacing: '-0.04em', maxWidth: 820, margin: '0 auto', color: '#f5f5f5' }}>
          The city that<br />
          <span style={{ color: '#4ade80' }}>never overflows.</span>
        </h1>

        <p style={{ maxWidth: 480, margin: '24px auto 0', fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.42)', fontWeight: 400 }}>
          Real-time IoT bin monitoring, predictive AI routing, and fleet optimization — purpose-built for urban waste networks.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => nav('/dashboard')} style={{ ...btnStyle, background: '#f5f5f5', color: '#111' }}>
            Get started
          </button>
          <button onClick={() => nav('/analytics')} style={{ ...btnStyle, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
            View analytics
          </button>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          [stats.total_bins ?? '—', 'Active bins'],
          [stats.critical ?? '—',   'Critical now'],
          [stats.avg_fill ? `${stats.avg_fill}%` : '—', 'Avg fill'],
          ['3', 'Trucks active'],
          ['24/7', 'AI monitoring'],
        ].map(([num, label]) => (
          <div key={label} style={{ padding: '28px 16px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', fontWeight: 600, letterSpacing: '-0.03em', color: '#f5f5f5' }}>{num}</div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 10, padding: 'clamp(48px, 6vw, 96px) clamp(16px, 4vw, 64px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 14 }}>Platform</div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: 600, marginBottom: 48, color: '#f0f0f1' }}>
            Every bin.<br />Every street.<br />Always intelligent.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.02)', padding: '28px', borderRight: '1px solid rgba(255,255,255,0.04)', transition: 'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.045)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#4ade80', display: 'block', marginBottom: 16 }}>{icon}</span>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8, color: 'rgba(255,255,255,0.85)' }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 10, padding: '48px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12, color: '#f0f0f1' }}>Ready to deploy?</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: 32, lineHeight: 1.7 }}>Live telemetry, optimized routes, and every sensor node — across the city network.</p>
          <button onClick={() => nav('/dashboard')} style={{ ...btnStyle, background: '#f5f5f5', color: '#111', padding: '12px 28px', fontSize: 13 }}>
            Launch Dashboard
          </button>
        </div>
      </section>

      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.03em' }}>
          Team Omex · STITCH Smart Waste Intelligence · PSG iTech, Coimbatore
        </p>
      </footer>
    </div>
  );
}
