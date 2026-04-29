const logStatus = (msg) => {
    const log = document.getElementById('error-log');
    if (log) {
        log.style.display = 'block';
        log.innerHTML += `<div style="font-size:12px; margin-bottom:5px;">${msg}</div>`;
    }
};

const g = window;
logStatus(`React: ${!!g.React}, ReactDOM: ${!!g.ReactDOM}, Recharts: ${!!g.Recharts}, LucideReact: ${!!g.LucideReact}, Motion: ${!!(g.Motion || g.framerMotion)}`);

const { useState, useEffect, useMemo } = React;
const RC = window.Recharts || {};
const { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} = RC;

// Recharts stubs if missing
const RCStub = (props) => <div className="recharts-stub border border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">{props.children || 'Chart Component Placeholder'}</div>;
const Charts = {
    BarChart: BarChart || RCStub,
    Bar: Bar || RCStub,
    LineChart: LineChart || RCStub,
    Line: Line || RCStub,
    XAxis: XAxis || RCStub,
    YAxis: YAxis || RCStub,
    CartesianGrid: CartesianGrid || RCStub,
    Tooltip: Tooltip || RCStub,
    Legend: Legend || RCStub,
    ResponsiveContainer: ResponsiveContainer || RCStub,
    PieChart: PieChart || RCStub,
    Pie: Pie || RCStub,
    Cell: Cell || RCStub,
    AreaChart: AreaChart || RCStub,
    Area: Area || RCStub
};
Object.keys(Charts).forEach(key => {
    if (!Charts[key]) Charts[key] = RCStub;
});

const Icons = g.LucideReact || {};
const { 
    Activity, Anchor, BarChart3, Bell, CheckCircle2, ChevronRight, ClipboardList, 
    Cog, Database, Filter, Gauge, Info, Layers, LayoutDashboard, Map: MapIcon, 
    MoreVertical, RefreshCw, Search, ShieldAlert, Sparkles, Trash2, Truck, 
    AlertTriangle, Clock, Thermometer, Droplets, Wind
} = Icons;

// Fallback for missing icons
const IconStub = () => <span>[Icon]</span>;
const safeIcons = {
    LayoutDashboard: LayoutDashboard || IconStub,
    Truck: Truck || IconStub,
    BarChart3: BarChart3 || IconStub,
    Settings: Icons.Settings || IconStub,
    Database: Database || IconStub,
    Gauge: Gauge || IconStub,
    ShieldAlert: ShieldAlert || IconStub,
    AlertTriangle: AlertTriangle || IconStub,
    CheckCircle2: CheckCircle2 || IconStub,
    Info: Info || IconStub,
    RefreshCw: RefreshCw || IconStub,
    Search: Search || IconStub,
    Sparkles: Sparkles || IconStub,
    Activity: Activity || IconStub,
    Clock: Clock || IconStub,
    Thermometer: Thermometer || IconStub,
    Wind: Wind || IconStub,
    Map: MapIcon || IconStub,
    Layers: Layers || IconStub
};

const MotionContext = g.Motion || g.framerMotion || { motion: { div: "div" }, AnimatePresence: ({children}) => children };
const { motion, AnimatePresence } = MotionContext;

// --- NATIVE SVG FALLBACKS ---
const NativeSparkline = ({ data, width = 200, height = 60, color = "#27ae60" }) => {
    if (!data || data.length < 2) return <div className="h-[60px] w-full bg-slate-50 flex items-center justify-center text-[8px] text-slate-300">Insufficient Data</div>;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: color, stopOpacity: 0.2}} />
                <stop offset="100%" style={{stopColor: color, stopOpacity: 0}} />
            </linearGradient>
            <polygon fill="url(#grad1)" points={`${width},${height} 0,${height} ${points}`} />
        </svg>
    );
};

const NativeBarChart = ({ data, height = 200, color = "#3498db" }) => {
    if (!data || !data.length) return null;
    const max = Math.max(...data.map(d => d.value));
    return (
        <div className="flex items-end justify-between gap-1 w-full" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{d.value}%</div>
                    <div 
                        className="w-full rounded-t-sm transition-all hover:brightness-110" 
                        style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color }}
                    ></div>
                    <span className="text-[8px] text-slate-400 mt-1 uppercase truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

// --- UTILS ---
const calculateStatus = (bin, settings) => {
    if (!bin.sensor_ok) return "SENSOR_FAIL";
    if (bin.fill_level >= settings.critical_fill || (bin.gas_level >= settings.dangerous_gas)) return "CRITICAL";
    if (bin.fill_level >= settings.warning_fill) return "WARNING";
    return "NORMAL";
};

const getStatusColor = (status) => {
    switch (status) {
        case "CRITICAL": return "#e74c3c";
        case "WARNING": return "#f39c12";
        case "NORMAL": return "#27ae60";
        case "SENSOR_FAIL": return "#94a3b8";
        default: return "#94a3b8";
    }
};

const getStatusBg = (status) => {
    switch (status) {
        case "CRITICAL": return "bg-red-50";
        case "WARNING": return "bg-amber-50";
        case "NORMAL": return "bg-green-50";
        case "SENSOR_FAIL": return "bg-slate-50";
        default: return "bg-slate-50";
    }
};

// --- COMPONENTS ---

const StatusBadge = ({ status }) => {
    const colors = {
        CRITICAL: "bg-red-100 text-red-700 border-red-200",
        WARNING: "bg-amber-100 text-amber-700 border-amber-200",
        NORMAL: "bg-green-100 text-green-700 border-green-200",
        SENSOR_FAIL: "bg-slate-100 text-slate-700 border-slate-200"
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.NORMAL}`}>
            {status === "SENSOR_FAIL" ? "⚠ Sensor Fail" : status}
        </span>
    );
};

const ProgressBar = ({ value, status }) => {
    const color = getStatusColor(status);
    return (
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
            />
        </div>
    );
};

const MetricCard = ({ label, value, icon: Icon, color, subValue, trend }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>
                {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
                {trend && (
                    <div className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs avg
                    </div>
                )}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                <Icon size={20} style={{ color }} />
            </div>
        </div>
    </div>
);

// --- MAIN APP ---

const App = () => {
    const [bins, setBins] = useState([]);
    const [settings, setSettings] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [countdown, setCountdown] = useState(14400); // 4 hours in seconds
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [selectedBin, setSelectedBin] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [sortConfig, setSortConfig] = useState({ key: 'bin_id', direction: 'asc' });

    const fetchData = async () => {
        try {
            const [binsRes, settingsRes] = await Promise.all([
                fetch('/api/bins'),
                fetch('/api/settings')
            ]);
            const binsData = await binsRes.json();
            const settingsData = await settingsRes.json();
            setBins(binsData);
            setSettings(settingsData);
            setLastUpdated(new Date());
            setCountdown(14400);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    useEffect(() => {
        fetchData();
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    fetchData();
                    return 14400;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Derived Stats
    const stats = useMemo(() => {
        if (!bins.length || !settings) return {};
        const critical = bins.filter(b => calculateStatus(b, settings) === "CRITICAL");
        const warning = bins.filter(b => calculateStatus(b, settings) === "WARNING");
        const normal = bins.filter(b => calculateStatus(b, settings) === "NORMAL");
        const failures = bins.filter(b => !b.sensor_ok);
        const avgFill = bins.reduce((acc, b) => acc + (b.fill_level || b.predicted_fill), 0) / bins.length;
        return {
            total: bins.length,
            avgFill: avgFill.toFixed(1),
            critical: critical.length,
            warning: warning.length,
            normal: normal.length,
            failures: failures.length
        };
    }, [bins, settings]);

    // Filtering & Sorting
    const filteredBins = useMemo(() => {
        if (!bins.length || !settings) return [];
        return bins.filter(b => {
            const status = calculateStatus(b, settings);
            const matchesSearch = b.bin_id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === "ALL" || status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            if (sortConfig.key === 'fill_level') {
                aVal = a.fill_level || a.predicted_fill;
                bVal = b.fill_level || b.predicted_fill;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [bins, settings, searchQuery, filterStatus, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleCollect = async (binId) => {
        await fetch(`/api/collect/${binId}`, { method: 'POST' });
        fetchData();
        if (selectedBin && selectedBin.bin_id === binId) setSelectedBin(null);
    };

    if (!settings) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing Sentinel Archive...</div>;

    return (
        <div className="flex h-screen overflow-hidden bg-surface">
            {/* --- SIDEBAR --- */}
            <aside className="w-64 h-full bg-gradient-to-b from-sidebar-start to-sidebar-end flex flex-col z-50 shadow-2xl">
                <div className="px-6 py-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center border border-secondary/30">
                            <safeIcons.Layers className="text-secondary" size={24} />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-lg leading-none tracking-tight">SENTINEL</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Archive v3.1</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {[
                        { id: 'overview', icon: safeIcons.LayoutDashboard, label: 'Overview' },
                        { id: 'route', icon: safeIcons.Truck, label: 'Collection Route' },
                        { id: 'analytics', icon: safeIcons.BarChart3, label: 'Analytics' },
                        { id: 'settings', icon: safeIcons.Settings, label: 'Settings' }
                    ].map(item => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <item.icon size={20} />
                            <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5">
                    <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold">AU</div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">Admin User</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">System Overseer</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* --- HEADER --- */}
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="uppercase tracking-tighter">{activeTab.replace('-', ' ')}</span>
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_#006d37]"></span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Last sync: {lastUpdated.toLocaleTimeString()}</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Reading In</p>
                            <p className="text-2xl font-black text-slate-800 font-mono tracking-tighter">{formatTime(countdown)}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100"></div>
                        <button onClick={fetchData} title="Refresh Data" className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                            <safeIcons.RefreshCw size={20} />
                        </button>
                    </div>
                </header>

                {/* --- TAB CONTENT --- */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                                <MetricCard label="Total Bins" value={stats.total} icon={safeIcons.Database} color="#050f19" />
                                <MetricCard label="Avg Fill %" value={`${stats.avgFill}%`} icon={safeIcons.Gauge} color="#3498db" />
                                <MetricCard label="Critical" value={stats.critical} icon={safeIcons.ShieldAlert} color="#e74c3c" />
                                <MetricCard label="Warning" value={stats.warning} icon={safeIcons.AlertTriangle} color="#f39c12" />
                                <MetricCard label="Normal" value={stats.normal} icon={safeIcons.CheckCircle2} color="#27ae60" />
                                <MetricCard label="Sensors Fail" value={stats.failures} icon={safeIcons.Info} color="#94a3b8" />
                            </div>

                            {/* Model Performance Strip */}
                            <div className="bg-white px-6 py-3 rounded-xl border border-slate-100 flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <safeIcons.Sparkles className="text-secondary" size={14} />
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Model Intel:</span>
                                </div>
                                <div className="flex gap-8">
                                    {[
                                        { label: 'Fill MAE', val: '0.34%' },
                                        { label: 'TTF MAE', val: '8.24 hrs' },
                                        { label: 'Recovery MAE', val: '0.31%' },
                                        { label: 'Classifier Accuracy', val: '96.7%' }
                                    ].map(m => (
                                        <div key={m.label} className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</span>
                                            <span className="text-xs font-black text-slate-800">{m.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bins Table Header Controls */}
                            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Operational Grid</h3>
                                    <p className="text-xs text-slate-400">Monitoring real-time telemetry for 80 nodes</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative">
                                        <safeIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Search Bin ID..." 
                                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-secondary/20 outline-none w-64"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <select 
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-secondary/20 outline-none"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="CRITICAL">Critical</option>
                                        <option value="WARNING">Warning</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="SENSOR_FAIL">Sensor Fail</option>
                                    </select>
                                </div>
                            </div>

                            {/* Bins Table */}
                            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                {['bin_id', 'bin_type', 'fill_level', 'time_to_fill_hours', 'status', 'confidence_pct', 'cause', 'sensor', 'action'].map(col => (
                                                    <th 
                                                        key={col} 
                                                        onClick={() => ['bin_id', 'bin_type', 'fill_level', 'time_to_fill_hours'].includes(col) && requestSort(col)}
                                                        className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 ${['bin_id', 'bin_type', 'fill_level', 'time_to_fill_hours'].includes(col) ? 'cursor-pointer hover:text-secondary' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {col.replace('_', ' ')}
                                                            {sortConfig.key === col && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBins.map(bin => {
                                                const status = calculateStatus(bin, settings);
                                                const fill = bin.fill_level || bin.predicted_fill;
                                                const isCritical = status === "CRITICAL";
                                                
                                                return (
                                                    <tr 
                                                        key={bin.bin_id} 
                                                        onClick={() => setSelectedBin(bin)}
                                                        className={`transition-colors cursor-pointer hover:bg-slate-50 ${isCritical ? 'bg-red-50/30' : (status === "WARNING" ? 'bg-amber-50/30' : '')}`}
                                                    >
                                                        <td className="px-6 py-4 font-black text-slate-800 text-sm tracking-tight">#{bin.bin_id}</td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{bin.bin_type}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3 w-40">
                                                                <ProgressBar value={fill} status={status} />
                                                                <span className="text-xs font-black text-slate-700">{fill}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-xs font-mono font-bold ${bin.time_to_fill_hours === 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                                {bin.time_to_fill_hours === 0 ? 'FULL' : `${bin.time_to_fill_hours}h`}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4"><StatusBadge status={status} /></td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{bin.confidence_pct}%</td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                                                                {bin.fill_level >= settings.critical_fill ? `Fill critical (${bin.fill_level}%)` : (bin.gas_level >= settings.dangerous_gas ? `High gas (${bin.gas_level} ppm)` : '--')}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`w-2 h-2 rounded-full ${bin.sensor_ok ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                                        </td>
                                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                            {isCritical && (
                                                                <button 
                                                                    onClick={() => handleCollect(bin.bin_id)}
                                                                    className="p-2 bg-secondary text-white rounded-lg hover:scale-105 active:scale-95 transition-transform shadow-md shadow-secondary/20"
                                                                >
                                                                    <safeIcons.Truck size={14} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'route' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Optimized Fleet Intercept</h3>
                                    <p className="text-slate-400 text-sm">Targets prioritized by fill level and predicted depletion time</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-secondary">{bins.filter(b => calculateStatus(b, settings) === "CRITICAL").length}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intercepts required</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {bins.filter(b => calculateStatus(b, settings) === "CRITICAL")
                                        .sort((a,b) => a.time_to_fill_hours - b.time_to_fill_hours)
                                        .map((bin, index) => (
                                            <div key={bin.bin_id} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-secondary/30 transition-all">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-lg group-hover:bg-secondary group-hover:text-white transition-colors">
                                                        #{index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800">#{bin.bin_id}</h4>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{bin.bin_type} node</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-12">
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-red-600">{bin.fill_level || bin.predicted_fill}%</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacity</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-slate-700">{bin.time_to_fill_hours}h</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Remaining</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCollect(bin.bin_id)}
                                                        className="px-6 py-2.5 bg-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
                                                    >
                                                        Intercept
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                                <div className="bg-slate-100 rounded-3xl min-h-[500px] flex items-center justify-center overflow-hidden relative grayscale opacity-70">
                                    <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuByUfhYV6XGocp45sGxBHOiQJo27JpVPevLfwfPEWQYGoS-0IiuxbYN6T6rsNpCyuvQ5soyREW5OBUQidyA646c4q5CH88S6Pyxa5i4u3xdHMkhyt1Q-vXDduByF1wsHXvjYNJc6z9smqz3Gn958IGH1ydk-ZA5Q7fHVFGUbQYhRaEqsby9C_D2g8vXFryly4CmP1njMnM6J5LygIFEXsyRNCM9PQ2C_wJ76xcUrpaow0epsSd5Xdhe3S3caJohbnIAHJdYZ-V-Yg')] bg-cover opacity-20"></div>
                                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center z-10">
                                        <safeIcons.Map className="mx-auto text-slate-400 mb-4" size={48} />
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Cortex Mapping Engine</p>
                                        <p className="text-slate-800 text-sm font-bold mt-2">Initializing Strategic Vector Paths...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Fill Distribution */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Fill Level Statistics</h4>
                                <div className="mt-4">
                                    {window.Recharts ? (
                                        <div className="h-64">
                                            <Charts.ResponsiveContainer width="100%" height="100%">
                                                <Charts.BarChart data={bins.map((b, i) => ({ id: i, fill: b.fill_level || b.predicted_fill }))}>
                                                    <Charts.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                    <Charts.XAxis dataKey="id" hide />
                                                    <Charts.YAxis />
                                                    <Charts.Tooltip />
                                                    <Charts.Bar dataKey="fill" fill="#3498db" radius={[4, 4, 0, 0]} />
                                                </Charts.BarChart>
                                            </Charts.ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <NativeBarChart data={bins.map(b => ({ label: b.bin_id, value: b.fill_level || b.predicted_fill }))} height={256} />
                                    )}
                                </div>
                            </div>

                            {/* Type Breakdown */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Infrastructure Breakdown</h4>
                                <div className="h-64 mt-4">
                                    <Charts.ResponsiveContainer width="100%" height="100%">
                                        <Charts.PieChart>
                                            <Charts.Pie
                                                data={[
                                                    { name: 'Residential', value: bins.filter(b => b.bin_type === 'residential').length },
                                                    { name: 'Commercial', value: bins.filter(b => b.bin_type === 'commercial').length },
                                                    { name: 'Market', value: bins.filter(b => b.bin_type === 'market').length },
                                                    { name: 'Transport', value: bins.filter(b => b.bin_type === 'transport').length },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {['#3498db', '#e67e22', '#27ae60', '#9b59b6'].map((color, index) => (
                                                    <Charts.Cell key={`cell-${index}`} fill={color} />
                                                ))}
                                            </Charts.Pie>
                                            <Charts.Tooltip />
                                            <Charts.Legend />
                                        </Charts.PieChart>
                                    </Charts.ResponsiveContainer>
                                </div>
                            </div>

                             {/* Avg Fill by Type */}
                             <div className="bg-white p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Avg Depletion by Type</h4>
                                <div className="h-64 mt-4">
                                    <Charts.ResponsiveContainer width="100%" height="100%">
                                        <Charts.BarChart 
                                            layout="vertical"
                                            data={BIN_TYPES.map(type => ({
                                                type,
                                                avg: (bins.filter(b => b.bin_type === type).reduce((acc, b) => acc + (b.fill_level || b.predicted_fill), 0) / (bins.filter(b => b.bin_type === type).length || 1)).toFixed(1)
                                            }))}
                                        >
                                            <Charts.XAxis type="number" domain={[0, 100]} hide />
                                            <Charts.YAxis dataKey="type" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                            <Charts.Tooltip />
                                            <Charts.Bar dataKey="avg" fill="#006d37" radius={[0, 4, 4, 0]} />
                                        </Charts.BarChart>
                                    </Charts.ResponsiveContainer>
                                </div>
                            </div>

                            {/* Sensor Fail Rate over Time placeholder */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Cortex Sensor Stability</h4>
                                <div className="h-64 mt-4">
                                    <Charts.ResponsiveContainer width="100%" height="100%">
                                        <Charts.AreaChart data={[
                                            { day: 'Mon', failures: 3 },
                                            { day: 'Tue', failures: 5 },
                                            { day: 'Wed', failures: 2 },
                                            { day: 'Thu', failures: 8 },
                                            { day: 'Fri', failures: 4 },
                                            { day: 'Sat', failures: 3 },
                                            { day: 'Sun', failures: 5 },
                                        ]}>
                                            <Charts.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <Charts.XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                            <Charts.YAxis tick={{ fontSize: 10 }} />
                                            <Charts.Tooltip />
                                            <Charts.Area type="monotone" dataKey="failures" stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.1} />
                                        </Charts.AreaChart>
                                    </Charts.ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-4xl space-y-8">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
                                    <safeIcons.Settings className="text-slate-400" size={24} />
                                    STRATEGIC OVERRIDE
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Critical Fill Threshold (%)</label>
                                            <input 
                                                type="range" min="50" max="95" 
                                                value={settings.critical_fill}
                                                onChange={(e) => setSettings({...settings, critical_fill: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-secondary"
                                            />
                                            <div className="flex justify-between mt-2 text-xs font-black text-slate-700">
                                                <span>50%</span>
                                                <span className="text-red-600 px-2 py-1 bg-red-50 rounded-lg">{settings.critical_fill}%</span>
                                                <span>95%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Warning Fill Threshold (%)</label>
                                            <input 
                                                type="range" min="20" max="80" 
                                                value={settings.warning_fill}
                                                onChange={(e) => setSettings({...settings, warning_fill: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-secondary"
                                            />
                                            <div className="flex justify-between mt-2 text-xs font-black text-slate-700">
                                                <span>20%</span>
                                                <span className="text-amber-600 px-2 py-1 bg-amber-50 rounded-lg">{settings.warning_fill}%</span>
                                                <span>80%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Dangerous Gas Threshold (PPM)</label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="number" 
                                                    value={settings.dangerous_gas}
                                                    onChange={(e) => setSettings({...settings, dangerous_gas: parseInt(e.target.value)})}
                                                    className="w-32 px-4 py-2 border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-secondary/20"
                                                />
                                                <span className="text-xs text-slate-400">Default: 175 ppm</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Sensor Polling Interval (Hours)</label>
                                            <div className="flex items-center gap-4">
                                                <select 
                                                    value={settings.sensor_interval}
                                                    onChange={(e) => setSettings({...settings, sensor_interval: parseInt(e.target.value)})}
                                                    className="w-32 px-4 py-2 border border-slate-200 rounded-xl text-sm font-black outline-none"
                                                >
                                                    <option value={1}>1 Hour</option>
                                                    <option value={4}>4 Hours</option>
                                                    <option value={12}>12 Hours</option>
                                                    <option value={24}>24 Hours</option>
                                                </select>
                                                <span className="text-xs text-slate-400">Current: every {settings.sensor_interval}h</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-12 flex gap-4">
                                    <button 
                                        onClick={() => fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings), headers: {'Content-Type': 'application/json'} })}
                                        className="bg-secondary text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        Deploy Parameters
                                    </button>
                                    <button 
                                        onClick={() => setSettings(DEFAULT_SETTINGS)}
                                        className="bg-slate-100 text-slate-500 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-colors"
                                    >
                                        Recall Defaults
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- BIN DETAIL MODAL --- */}
                <AnimatePresence>
                    {selectedBin && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedBin(null)}>
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col md:flex-row h-full max-h-[800px]"
                            >
                                {/* Left Side: Media / Visuals */}
                                <div className="md:w-1/3 bg-slate-50 p-10 flex flex-col items-center justify-center border-r border-slate-100">
                                    <div className="relative w-48 h-48 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-[12px] border-slate-200"></div>
                                        <motion.div 
                                            initial={{ rotate: -90 }}
                                            animate={{ rotate: 90 * ((selectedBin.fill_level || selectedBin.predicted_fill) / 100) }}
                                            className="absolute w-2 h-20 bg-secondary origin-bottom -translate-y-10 rounded-full"
                                        />
                                        <div className="relative z-10 text-center">
                                            <p className="text-4xl font-black text-slate-800 tracking-tighter">{(selectedBin.fill_level || selectedBin.predicted_fill)}%</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fill Load</p>
                                        </div>
                                    </div>

                                    <div className="mt-12 w-full space-y-4">
                                        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><safeIcons.Clock size={16} /></div>
                                                <span className="text-xs font-bold text-slate-500">TTF Countdown</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-800">{selectedBin.time_to_fill_hours}h</span>
                                        </div>
                                        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-50 text-red-500 rounded-xl"><safeIcons.Thermometer size={16} /></div>
                                                <span className="text-xs font-bold text-slate-500">Node Temp</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-800">{selectedBin.temperature}°C</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Analysis */}
                                <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                                    <button onClick={() => setSelectedBin(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                                        <safeIcons.Trash2 size={24} />
                                    </button>

                                    <div className="flex justify-between items-start mb-12">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-3xl font-black text-slate-800 tracking-tight">#{selectedBin.bin_id}</h3>
                                                <StatusBadge status={calculateStatus(selectedBin, settings)} />
                                            </div>
                                            <p className="text-slate-400 text-sm flex items-center gap-2 font-bold uppercase tracking-widest">
                                                <safeIcons.Map size={14} /> Sector Coimbatore-South • {selectedBin.bin_type}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mb-12">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cortex Telemetry</h4>
                                            <div className="space-y-4">
                                                {[
                                                    { label: 'Effluent (Gas)', val: `${selectedBin.gas_level} ppm`, icon: safeIcons.Wind, color: 'text-amber-500' },
                                                    { label: 'Weight Load', val: `${selectedBin.weight} kg`, icon: safeIcons.Database, color: 'text-blue-500' },
                                                    { label: 'Confidence', val: `${selectedBin.confidence_pct}%`, icon: safeIcons.ShieldAlert, color: 'text-green-500' }
                                                ].map(item => (
                                                    <div key={item.label} className="flex justify-between items-center py-3 border-b border-slate-50">
                                                        <div className="flex items-center gap-3 font-bold text-slate-500 text-xs">
                                                            <item.icon size={14} className={item.color} /> {item.label}
                                                        </div>
                                                        <span className="text-sm font-black text-slate-800">{item.val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Historical Signature</h4>
                                            <div className="h-32">
                                                {window.Recharts ? (
                                                    <Charts.ResponsiveContainer width="100%" height="100%">
                                                        <Charts.AreaChart data={selectedBin.history.map((h, i) => ({ i, h }))}>
                                                            <Charts.Area type="monotone" dataKey="h" stroke="#006d37" fill="#006d37" fillOpacity={0.1} />
                                                        </Charts.AreaChart>
                                                    </Charts.ResponsiveContainer>
                                                ) : (
                                                    <NativeSparkline data={selectedBin.history} height={128} color="#006d37" />
                                                )}
                                            </div>
                                            <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Observation Log</p>
                                                <div className="space-y-2">
                                                    {!selectedBin.sensor_ok && <p className="text-[10px] text-red-600 font-bold">⚠️ SENSOR_FAILURE_RECOVERY: Inferring fill from lag vector.</p>}
                                                    {calculateStatus(selectedBin, settings) === "CRITICAL" && <p className="text-[10px] text-amber-600 font-bold">⚠️ OVERFLOW_WARNING: Immediate intercept required.</p>}
                                                    <p className="text-[10px] text-slate-500">Model predicts node will reach 100% capacity in approximately {selectedBin.time_to_fill_hours} hours.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                        <button 
                                            onClick={() => handleCollect(selectedBin.bin_id)}
                                            className="w-full py-4 bg-secondary text-white rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                        >
                                            <safeIcons.Truck /> Engagement Initiated
                                        </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
