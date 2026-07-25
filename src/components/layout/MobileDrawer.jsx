// src/components/layout/MobileDrawer.jsx
import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

// Master list of every section in the app. The bottom nav covers the 4
// top-level entries; the drawer lists them all.
const PRIMARY = [
  { id: 'dashboard',       label: 'Dashboard',       icon: '📊' },
  { id: 'booking',         label: 'Book Slots',      icon: '🎯' },
  { id: 'master',          label: 'Game Master',     icon: '🎮' },
  { id: 'slots',           label: 'Slot Master',     icon: '⏰' },
  { id: 'rules',           label: 'Rules',           icon: '📜' },
  { id: 'bans',            label: 'Ban Management',  icon: '🚫' },
];

const EVENTS = [
  { id: 'eventsCalendar',  label: 'Events Calendar', icon: '📅' },
  { id: 'tournaments',     label: 'Tournaments',     icon: '🏆' },
  { id: 'leaderboard',     label: 'Leaderboard',     icon: '🥇' },
];

const ACCOUNT = [
  { id: 'profile',  label: 'Profile',  icon: '👤' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const DrawerItem = ({ item, active, onClick }) => (
  <button
    type="button"
    className={`drawer-item ${active ? 'drawer-item--active' : ''}`}
    onClick={() => onClick(item.id)}
  >
    <span className="drawer-item-icon" aria-hidden>{item.icon}</span>
    <span className="drawer-item-label">{item.label}</span>
  </button>
);

const DrawerDivider = ({ label }) => (
  <div
    style={{
      padding: '10px 14px 4px',
      fontSize: '0.6rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--muted)',
    }}
  >
    {label}
  </div>
);

const MobileDrawer = ({ open, onClose, user, onLogout }) => {
  const { activeTab, setActiveTab, isAdmin } = useApp();

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
          <div className="drawer-title">Menu</div>
          <button
            type="button"
            aria-label="Close navigation"
            className="drawer-close"
            onClick={onClose}
          >✕</button>
        </header>

        <nav className="drawer-nav">
          <DrawerDivider label="Activities" />
          {PRIMARY.map((it) => (
            <DrawerItem key={it.id} item={it} active={activeTab === it.id} onClick={navigate} />
          ))}

          <DrawerDivider label="Events" />
          {EVENTS.map((it) => (
            <DrawerItem key={it.id} item={it} active={activeTab === it.id} onClick={navigate} />
          ))}

          {user && (
            <>
              <DrawerDivider label="Account" />
              {ACCOUNT.map((it) => (
                <DrawerItem key={it.id} item={it} active={activeTab === it.id} onClick={navigate} />
              ))}
              {isAdmin && isAdmin() && (
                <DrawerItem
                  item={{ id: 'admin', label: 'Admin', icon: '🛡️' }}
                  active={activeTab === 'admin'}
                  onClick={navigate}
                />
              )}
              {activeTab === 'reports' || (
                <DrawerItem
                  item={{ id: 'reports', label: 'Reports', icon: '📊' }}
                  active={activeTab === 'reports'}
                  onClick={navigate}
                />
              )}
            </>
          )}
        </nav>

        {user && (
          <footer className="drawer-footer">
            <button
              type="button"
              className="drawer-item drawer-item--danger"
              onClick={handleLogout}
            >
              <span className="drawer-item-icon" aria-hidden>⎋</span>
              <span className="drawer-item-label">Logout</span>
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
};

export default MobileDrawer;
