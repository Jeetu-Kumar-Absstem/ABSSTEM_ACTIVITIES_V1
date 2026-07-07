// src/components/layout/MobileDrawer.jsx
import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',      icon: '📊' },
  { id: 'booking',   label: 'Book Slots',     icon: '🎯' },
  { id: 'master',    label: 'Game Master',    icon: '🎮' },
  { id: 'slots',     label: 'Slot Master',    icon: '⏰' },
  { id: 'rules',     label: 'Rules',          icon: '📜' },
  { id: 'bans',      label: 'Ban Management', icon: '🚫' },
];

const MobileDrawer = ({ open, onClose, user, onLogout }) => {
  const { activeTab, setActiveTab } = useApp();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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
          {NAV_ITEMS.map((it) => {
            const active = activeTab === it.id;
            return (
              <button
                key={it.id}
                type="button"
                className={`drawer-item ${active ? 'drawer-item--active' : ''}`}
                onClick={() => { setActiveTab(it.id); onClose(); }}
              >
                <span className="drawer-item-icon" aria-hidden>{it.icon}</span>
                <span className="drawer-item-label">{it.label}</span>
              </button>
            );
          })}
        </nav>

        {user && (
          <footer className="drawer-footer">
            <button
              type="button"
              className="drawer-item"
              onClick={() => { setActiveTab('profile'); onClose(); }}
            >
              <span className="drawer-item-icon" aria-hidden>👤</span>
              <span className="drawer-item-label">Profile</span>
            </button>
            <button
              type="button"
              className="drawer-item drawer-item--danger"
              onClick={() => { onClose(); onLogout && onLogout(); }}
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
