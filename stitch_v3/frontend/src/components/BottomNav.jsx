import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard',    icon: 'space_dashboard', label: 'Home'    },
  { to: '/route',        icon: 'route',           label: 'Routes'  },
  { to: '/navigate',     icon: 'navigation',      label: 'Navigate' },
  { to: '/waste_stream', icon: 'delete_sweep',    label: 'Bins'    },
  { to: '/analytics',    icon: 'analytics',       label: 'Data'    },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {links.map(({ to, icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
