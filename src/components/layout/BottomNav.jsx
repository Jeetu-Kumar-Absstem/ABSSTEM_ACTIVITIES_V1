// src/components/layout/BottomNav.jsx
// Modern floating pill-style bottom navigation.
import React from 'react';
import useViewport from '../../hooks/useViewport';
import useScrollDirection from '../../hooks/useScrollDirection';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Target,
  Trophy,
  PartyPopper
} from 'lucide-react';

// Mapping from activeTab to which bottom-nav item should be highlighted.
const HIGHLIGHT_GROUPS = {
  Dashboard: ['dashboard'],
  Book: ['booking', 'master', 'slots', 'rules', 'bans'],
  Tournaments: ['tournaments'],
  Events: ['eventsCalendar', 'leaderboard'],
};

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'booking',         label: 'Book',        icon: Target },
  { id: 'tournaments',     label: 'Tournaments', icon: Trophy },
  { id: 'eventsCalendar',  label: 'Events',      icon: PartyPopper },
];

const isInGroup = (groupKey, activeTab) => {
  const list = HIGHLIGHT_GROUPS[groupKey] || [];
  return list.includes(activeTab);
};

const BottomNav = () => {
  const { isMobile } = useViewport();
  const { activeTab, setActiveTab } = useApp();
  const isVisible = useScrollDirection();

  if (!isMobile) return null;

  return (
    <div className={`bottom-nav-container ${!isVisible ? 'bottom-nav-container--hidden' : ''}`}>
      <nav className="app-bottom-nav-pill" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = isInGroup(item.label, activeTab);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-pill-item ${isActive ? 'nav-pill-item--active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="nav-pill-icon-wrapper">
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="nav-pill-icon"
                />
              </div>
              <span className="nav-pill-label">{item.label}</span>
              {isActive && <div className="nav-pill-dot" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;

