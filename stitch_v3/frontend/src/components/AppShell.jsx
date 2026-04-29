import { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({ title, subtitle, headerActions, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button className="menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <div className="header-title">{title}</div>
              {subtitle && <div className="header-sub">{subtitle}</div>}
            </div>
          </div>
          <div className="header-actions">{headerActions}</div>
        </header>
        <div className="page-content animate-fade-up">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
