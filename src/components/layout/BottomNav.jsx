// src/components/layout/BottomNav.jsx
// Mobile-only bottom tab bar (4 sections) for a native-app feel on phones.
// On desktop this renders nothing.
import React from 'react';
import useViewport from '../../hooks/useViewport';
import { useApp } from '../../context/AppContext';

// Mapping from activeTab to which bottom-nav item should be highlighted.
const HIGHLIGHT_GROUPS = {
  Dashboard: ['dashboard'],
  Book: ['booking', 'master', 'slots', 'rules', 'bans'],
  Tournaments: ['tournaments'],
  Events: ['eventsCalendar', 'leaderboard'],
};

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Dashboard',   icon: '📊' },
  { id: 'booking',         label: 'Book',        icon: '🎯' },
  { id: 'tournaments',     label: 'Tournaments', icon: '🏆' },
  { id: 'eventsCalendar',  label: 'Events',      icon: '🎉' },
];

const isInGroup = (groupKey, activeTab) => {
  const list = HIGHLIGHT_GROUPS[groupKey] || [];
  return list.includes(activeTab);
};

const BottomNav = () => {
  const { isMobile } = useViewport();
  const { activeTab, setActiveTab } = useApp();

  if (!isMobile) return null;

  return (
    <nav className="app-bottom-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        // For Book/Events we treat them as one group so the bar feels stable
        // when the user navigates between sibling sections.
        const isActive = isInGroup(item.label, activeTab);
        const isCurrent = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`app-bottom-nav-item ${isActive ? 'app-bottom-nav-item--active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={isCurrent ? 'page' : undefined}
          >
            <span className="app-bottom-nav-item-icon" aria-hidden>{item.icon}</span>
            <span className="app-bottom-nav-item-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;

