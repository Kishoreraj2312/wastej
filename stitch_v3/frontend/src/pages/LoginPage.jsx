import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LoginPage() {
  const nav          = useNavigate();
  const [loading, setLoad] = useState(false);
  const [error,   setError] = useState('');
  const emailRef   = useRef(null);
  const passwordRef = useRef(null);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoad(true);
    try {
      const { token, username } = await api.login(
        emailRef.current.value,
        passwordRef.current.value,
      );
      localStorage.setItem('stitch_token', token);
      localStorage.setItem('stitch_user',  username);
      nav('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoad(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: '#f7f7f8', border: '1px solid rgba(0,0,0,0.11)',
    borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif',
    color: '#111', outline: 'none', transition: 'border-color 150ms',
    fontWeight: 400, boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#f7f7f8', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', maxWidth: 840, width: '100%', display: 'flex' }}>

        {/* Brand panel */}
        <div style={{ width: '42%', background: '#111112', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined icon-fill" style={{ fontSize: 15, color: '#fff' }}>recycling</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>STITCH</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 14 }}>
              SmartWaste AI<br />Operations
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, fontWeight: 400 }}>
              Secure access to live telemetry, route dispatch, and fleet configuration.
            </p>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: '#4ade80', letterSpacing: '0.04em' }}>System operational</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fafafa' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#111', marginBottom: 6 }}>Sign in</h2>
            <p style={{ fontSize: 13, color: '#888', fontWeight: 400 }}>Enter your operator credentials</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.2)', borderRadius: 8, fontSize: 13, color: '#c0392b', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#555', marginBottom: 6, letterSpacing: '0.02em' }}>Username</label>
              <input
                ref={emailRef}
                type="text"
                defaultValue="admin"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1a7a4a'}
                onBlur={e  => e.target.style.borderColor = 'rgba(0,0,0,0.11)'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#555', marginBottom: 6, letterSpacing: '0.02em' }}>Password</label>
              <input
                ref={passwordRef}
                type="password"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1a7a4a'}
                onBlur={e  => e.target.style.borderColor = 'rgba(0,0,0,0.11)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: 8, width: '100%', padding: '10px', background: loading ? '#555' : '#111112', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity 150ms' }}
            >
              {loading && <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>refresh</span>}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#bbb', fontWeight: 400 }}>
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
