import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

let _idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_idCounter;
    setToasts(t => [...t, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience aliases
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error',   dur ?? 6000);
  toast.warn    = (msg, dur) => toast(msg, 'warn',    dur);
  toast.info    = (msg, dur) => toast(msg, 'info',    dur);

  const icons  = { success: 'check_circle', error: 'error', warn: 'warning', info: 'info' };
  const colors = {
    success: { bg: 'rgba(48,209,88,0.12)',  border: 'rgba(48,209,88,0.3)',  text: '#1d6630' },
    error:   { bg: 'rgba(255,59,48,0.10)',  border: 'rgba(255,59,48,0.25)', text: '#c0392b' },
    warn:    { bg: 'rgba(255,159,10,0.10)', border: 'rgba(255,159,10,0.3)', text: '#7a4f00' },
    info:    { bg: 'rgba(0,113,227,0.08)',  border: 'rgba(0,113,227,0.2)',  text: '#005bb5' },
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(16px)',
              minWidth: 280, maxWidth: 400,
              animation: 'toast-in 0.25s ease-out',
              fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
            }}>
              <span className="material-symbols-outlined icon-fill"
                style={{ fontSize: 18, color: c.text, flexShrink: 0 }}>
                {icons[t.type]}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.4 }}>
                {t.message}
              </span>
              <button onClick={() => dismiss(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: '#aeaeb2', display: 'flex', alignItems: 'center', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}
