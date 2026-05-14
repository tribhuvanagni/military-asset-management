import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '◉' },
  { path: '/purchases', label: 'Purchases', icon: '◈' },
  { path: '/transfers', label: 'Transfers', icon: '⇄' },
  { path: '/assignments', label: 'Assignments', icon: '◎' }
];

const ROLE_LABELS = {
  admin: 'System Admin',
  commander: 'Base Commander',
  logistics: 'Logistics Officer'
};

export default function Sidebar() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">KB</div>
        <div className="sidebar__brand-text">
          <span className="sidebar__title">KristalBall</span>
          <span className="sidebar__subtitle">Asset Management</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            <span className="sidebar__link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user-info">
          <div className="sidebar__user-avatar">
            {currentUser?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar__user-details">
            <span className="sidebar__username">{currentUser?.username}</span>
            <span className="sidebar__role-badge">
              {ROLE_LABELS[currentUser?.role] || currentUser?.role}
            </span>
          </div>
        </div>
        {currentUser?.assignedBase && (
          <div className="sidebar__base-tag">
            <span className="sidebar__base-dot" />
            {currentUser.assignedBase}
          </div>
        )}
        <button className="sidebar__logout" onClick={handleSignOut} id="btn-sign-out">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
