import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { useToast } from '../components/Toast';
import { api } from '../api';

const FIELDS = [
  { key: 'threshold_yellow', label: 'Warning threshold',    unit: '%',      desc: 'Fill level to trigger Medium status',       min: 10,  max: 90   },
  { key: 'threshold_red',    label: 'Critical threshold',   unit: '%',      desc: 'Fill level to trigger Critical + dispatch', min: 20,  max: 100  },
  { key: 'num_trucks',       label: 'Fleet size',           unit: 'trucks', desc: 'Collection trucks for VRP optimization',    min: 1,   max: 20   },
  { key: 'truck_capacity',   label: 'Truck capacity',       unit: 'kg',     desc: 'Maximum payload per vehicle',               min: 100, max: 5000 },
  { key: 'dangerous_gas',    label: 'Gas alert level',      unit: 'ppm',    desc: 'Methane threshold for hazard alert',        min: 50,  max: 1000 },
  { key: 'sensor_interval',  label: 'Sensor poll interval', unit: 'min',    desc: 'How often sensors transmit data',           min: 1,   max: 60   },
  { key: 'retrain_cycles',   label: 'AI retrain cycles',    unit: 'cycles', desc: 'Collections before model retraining',      min: 1,   max: 100  },
];

export default function SettingsPage() {
  const toast = useToast();
  const [form,    setForm]  = useState({});
  const [saved,   setSaved] = useState(false);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    api.settings.get()
      .then(d => { setForm(d); setLoad(false); })
      .catch(e => { toast.error(`Failed to load settings: ${e.message}`); setLoad(false); });
  }, [toast]);

  const change = (key, val) => { setForm(f => ({ ...f, [key]: Number(val) })); setSaved(false); };

  const save = async () => {
    try {
      await api.settings.save(form);
      setSaved(true);
      toast.success('Settings saved successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(`Save failed: ${e.message}`);
    }
  };

  const yellow = form.threshold_yellow || 50;
  const red    = form.threshold_red    || 80;

  return (
    <AppShell
      title="Settings"
      subtitle="Operational parameters"
      headerActions={
        <button
          className={saved ? 'btn btn-green' : 'btn-primary-sm'}
          style={{ fontSize: 12 }}
          onClick={save}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{saved ? 'check' : 'save'}</span>
          {saved ? 'Saved' : 'Save'}
        </button>
      }
    >
      {loading ? (
        <div className="loader"><span className="material-symbols-outlined animate-spin">refresh</span>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--sp-8)', alignItems: 'start' }}>

          {/* Form */}
          <div className="card" style={{ padding: 'var(--sp-2) var(--sp-6)' }}>
            {FIELDS.map(({ key, label, unit, desc, min, max }) => (
              <div key={key} className="settings-field">
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div className="settings-label">{label}</div>
                  <div className="settings-value-display">
                    {form[key] ?? min}
                    <span className="settings-value-unit"> {unit}</span>
                  </div>
                </div>
                <div className="settings-desc">{desc}</div>
                <input
                  type="range"
                  className="settings-slider"
                  min={min} max={max}
                  value={form[key] ?? min}
                  onChange={e => change(key, e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{min} {unit}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{max} {unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Preview — sticky */}
          <div style={{ position: 'sticky', top: 'calc(var(--header-h) + var(--sp-6))' }}>
            <div className="card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 'var(--sp-4)' }}>Live preview</div>

              <div style={{ marginBottom: 'var(--sp-5)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 8 }}>Fill zones</div>
                <div style={{ position: 'relative', height: 12, borderRadius: 6, overflow: 'hidden', background: '#1a7a4a' }}>
                  <div style={{ position: 'absolute', left: `${yellow}%`, top: 0, bottom: 0, right: 0, background: '#a05c00' }} />
                  <div style={{ position: 'absolute', left: `${red}%`,    top: 0, bottom: 0, right: 0, background: '#c8372d' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-3)' }}>
                  <span>0%</span>
                  <span style={{ color: '#a05c00' }}>{yellow}%</span>
                  <span style={{ color: '#c8372d' }}>{red}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {[
                  ['Fleet',      `${form.num_trucks      || 1}   trucks`],
                  ['Capacity',   `${form.truck_capacity  || 500} kg`],
                  ['Gas alert',  `${form.dangerous_gas   || 300} ppm`],
                  ['Poll rate',  `${form.sensor_interval || 4}   min`],
                  ['AI retrain', `${form.retrain_cycles  || 10}  cycles`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={save} className="btn-primary-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--sp-5)', padding: 10, fontSize: 12 }}>
                Apply changes
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
