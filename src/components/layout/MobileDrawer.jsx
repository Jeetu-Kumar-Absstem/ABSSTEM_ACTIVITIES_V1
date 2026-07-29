// src/components/layout/MobileDrawer.jsx
import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, LogOut, Settings, ChevronRight } from 'lucide-react';

const DynamicCalendarIcon = () => {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
  const day = now.getDate();

  return (
    <div className="calendar-icon-dynamic">
      <div className="calendar-icon-header">{month}</div>
      <div className="calendar-icon-body">{day}</div>
    </div>
  );
};

const PRIMARY = [
  { id: 'dashboard',       label: 'Dashboard',       icon: '📊' },
  { id: 'booking',         label: 'Book Slots',      icon: '🎯' },
  { id: 'master',          label: 'Game Master',     icon: '🎮' },
  { id: 'slots',           label: 'Slot Master',     icon: '⏰' },
  { id: 'rules',           label: 'Rules',           icon: '📜' },
  { id: 'bans',            label: 'Ban Management',  icon: '🚫' },
];

const EVENTS = [
  { id: 'eventsCalendar',  label: 'Events Calendar', icon: <DynamicCalendarIcon /> },
  { id: 'tournaments',     label: 'Tournaments',     icon: '🏆' },
  { id: 'leaderboard',     label: 'Leaderboard',     icon: '🥇' },
];

const DrawerItem = ({ item, active, onClick }) => (
  <button
    type="button"
    className={`drawer-item ${active ? 'drawer-item--active' : ''}`}
    onClick={() => onClick(item.id)}
  >
    <div className="drawer-item-icon-container">
      <span className="drawer-item-icon" aria-hidden>{item.icon}</span>
    </div>
    <span className="drawer-item-label">{item.label}</span>
    <ChevronRight size={14} className="drawer-item-caret" />
  </button>
);

const DrawerDivider = ({ label }) => (
  <div className="drawer-section-header">
    {label}
  </div>
);

const MobileDrawer = ({ open, onClose, user: propUser, onLogout }) => {
  const { activeTab, setActiveTab, isAdmin, currentUser } = useApp();
  const user = propUser || currentUser;

  const getUserName = () =>
    user?.user_metadata?.name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Jeetu';

  const getUserInitials = () => getUserName().split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'J';

  const userName = getUserName();
  const userInitials = getUserInitials();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const navigate = (id) => {
    setActiveTab(id);
    onClose();
  };

  const handleLogout = () => {
    onClose();
    if (onLogout) onLogout();
  };

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <header className="drawer-header">
          <div className="drawer-user-info">
            <div className="drawer-avatar">
              {userInitials}
            </div>
            <div className="drawer-greeting-container">
              <h2 className="drawer-greeting">Hello, {userName} 👋</h2>
              {/* <span className="drawer-role">Game Master</span>/ */}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="drawer-close-circle"
            onClick={onClose}
          >✕</button>
        </header>

        <nav className="drawer-nav">
          <DrawerDivider label="ACTIVITIES" />
          {PRIMARY.map((it) => (
            <DrawerItem key={it.id} item={it} active={activeTab === it.id} onClick={navigate} />
          ))}

          <DrawerDivider label="EVENTS" />
          {EVENTS.map((it) => (
            <DrawerItem key={it.id} item={it} active={activeTab === it.id} onClick={navigate} />
          ))}
        </nav>

        <div className="drawer-bottom-group">
          <DrawerItem
            item={{ id: 'settings', label: 'Settings', icon: <Settings size={18} /> }}
            active={activeTab === 'settings'}
            onClick={navigate}
          />
          <DrawerItem
            item={{ id: 'logout', label: 'Logout', icon: <LogOut size={18} /> }}
            active={false}
            onClick={handleLogout}
          />
        </div>

        <footer className="drawer-footer">
          <div className="drawer-version">v1.0.0</div>
          <div className="drawer-protected">
            <ShieldCheck size={14} color="#6d7590" />
            <span>Secure & Protected</span>
          </div>
        </footer>
      </aside>
    </div>
  );
};

export default MobileDrawer;
