import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';

const NAV = [
  {
    section: 'Operations',
    links: [
      { to: '/dashboard',    label: 'Overview',     icon: <GridIcon /> },
      { to: '/route',        label: 'Fleet Map',    icon: <RouteIcon /> },
      { to: '/navigate',     label: 'Navigate',     icon: <NavIcon /> },
      { to: '/waste_stream', label: 'Waste Stream', icon: <BinIcon /> },
    ],
  },
  {
    section: 'Intelligence',
    links: [
      { to: '/analytics', label: 'Analytics',   icon: <ChartIcon /> },
      { to: '/settings',  label: 'Settings',    icon: <GearIcon /> },
    ],
  },
];

function GridIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function RouteIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17V8a2 2 0 0 1 2-2h5"/><path d="M13 5h2"/></svg>; }
function NavIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="3,11 22,2 13,21 11,13"/></svg>; }
function BinIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function ChartIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>; }
function GearIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

export default function Sidebar({ open, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('stitch_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('stitch_sidebar_collapsed', isCollapsed);
    document.documentElement.style.setProperty('--sb-w', isCollapsed ? '72px' : '220px');
  }, [isCollapsed]);

  const [touchStartX, setTouchStartX] = useState(null);
  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStartX !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      if (touchStartX - touchEndX > 50) onClose(); // swipe left to close
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      <aside className={`sidebar ${open ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* ── Logo ── */}
        <div className="sidebar-header">
          <div className="sidebar-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6l9-4 9 4v6c0 5.25-4 9.75-9 11-5-1.25-9-5.75-9-11V6z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-text">STITCH</div>
            <div className="sidebar-logo-sub">Waste Intelligence</div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav">
          {NAV.map(({ section, links }) => (
            <div key={section}>
              <div className="nav-section-label">
                {section}
              </div>
              {links.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} className="nav-link" onClick={onClose} title={isCollapsed ? label : ''}>
                  <span className="nav-icon">{icon}</span>
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Status indicator ── */}
        <div className="sidebar-status">
          <span className="status-dot" />
          <div>
            <div className="status-title">System Online</div>
            <div className="status-sub">All sensors active</div>
          </div>
        </div>

        {/* ── User footer ── */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">LT</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Lead Technician</div>
              <div className="sidebar-user-role">Industrial Waste Unit</div>
            </div>
          </div>
          <button 
            className="sidebar-toggle desktop-only" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? (
                <path d="M13 17l5-5-5-5M6 12h12" />
              ) : (
                <path d="M11 17l-5-5 5-5M18 12H6" />
              )}
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
