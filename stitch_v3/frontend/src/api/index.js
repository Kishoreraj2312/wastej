// Centralized API layer — all fetch calls go through here
const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('stitch_token');
}

async function apiDownload(url, filename) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (res.status === 401) {
    localStorage.removeItem('stitch_token');
    localStorage.removeItem('stitch_user');
    window.location.href = '/login';
    return;
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

async function apiFetch(url, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {
    localStorage.removeItem('stitch_token');
    localStorage.removeItem('stitch_user');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // ── Auth (no Bearer token — public endpoints) ────────────────────────────
  login: (username, password) =>
    fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Login failed');
      }
      return res.json();
    }),

  logout: () =>
    apiFetch(`${BASE}/api/logout`, { method: 'POST' }).finally(() => {
      localStorage.removeItem('stitch_token');
      localStorage.removeItem('stitch_user');
    }),

  // ── Core data ─────────────────────────────────────────────────────────────
  stats:        () => apiFetch(`${BASE}/api/stats?t=${Date.now()}`),
  bins:         () => apiFetch(`${BASE}/api/bins?t=${Date.now()}`),
  bin:          (id) => apiFetch(`${BASE}/api/bin/${id}?t=${Date.now()}`),
  latestRoutes: () => apiFetch(`${BASE}/api/routes/latest?t=${Date.now()}`),
  analytics:    () => apiFetch(`${BASE}/api/analytics?t=${Date.now()}`),
  health:       () => apiFetch(`${BASE}/api/health`),

  // ── Async optimization ────────────────────────────────────────────────────
  optimize: () => apiFetch(`${BASE}/api/route/optimize?t=${Date.now()}`),
  optimizeStatus: (jobId) => apiFetch(`${BASE}/api/route/optimize/status/${jobId}`),
  optimizeAndWait: async (onProgress) => {
    const job = await api.optimize();
    if (!job.job_id) return job;
    onProgress?.({ status: 'running', job_id: job.job_id });
    return new Promise((resolve, reject) => {
      const poll = setInterval(async () => {
        try {
          const status = await api.optimizeStatus(job.job_id);
          onProgress?.(status);
          if (status.status === 'done')  { clearInterval(poll); resolve(status.result); }
          if (status.status === 'error') { clearInterval(poll); reject(new Error(status.error)); }
        } catch (e) { clearInterval(poll); reject(e); }
      }, 800);
    });
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get:  ()     => apiFetch(`${BASE}/api/settings?t=${Date.now()}`),
    save: (data) => apiFetch(`${BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  collect: (id) => apiFetch(`${BASE}/api/collect/${id}`, { method: 'POST' }),
  reset:   ()   => apiFetch(`${BASE}/api/reset`,         { method: 'POST' }),

  exportCsv: () => apiDownload(`${BASE}/api/analytics/export`, 'waste_analytics_report.csv'),
  exportPdf: () => apiDownload(`${BASE}/api/report/pdf`,       'SmartWaste_Tactical_Report.pdf'),

  // ── Truck navigation ──────────────────────────────────────────────────────
  trucks:       ()    => apiFetch(`${BASE}/api/trucks?t=${Date.now()}`),
  truckDetail:  (id)  => apiFetch(`${BASE}/api/truck/${id}?t=${Date.now()}`),
  truckAdvance: (id)  => apiFetch(`${BASE}/api/truck/${id}/advance`, { method: 'POST' }),
};
