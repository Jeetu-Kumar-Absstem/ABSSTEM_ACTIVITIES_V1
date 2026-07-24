// src/components/events/EventsTopBar.jsx
// Top tab bar shared across Events Calendar / Tournaments / Leaderboard pages.
import React from 'react';
import { useApp } from '../../context/AppContext';

const TABS = [
  { id: 'eventsCalendar', label: 'Events Calendar', icon: '📅' },
  { id: 'tournaments',    label: 'Tournaments',     icon: '🏆' },
  { id: 'leaderboard',    label: 'Leaderboard',     icon: '🥇' },
];

const EventsTopBar = ({ active }) => {
  const { setActiveTab } = useApp();

  return (
    <div
      className="clay-card"
      style={{
        background: 'var(--bg-surface-strong)',   // ✅ was: 'white'
        borderRadius: 32,
        padding: '8px 12px',
        marginBottom: '16px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: 'var(--surface-shadow-soft)',  // ✅ was: '0 2px 8px rgba(0,0,0,0.04)'
        border: '1px solid var(--border)',        // ✅ added for dark mode visibility
      }}
    >
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              margin: '0 4px',
              border: '2px solid',
              borderColor: isActive ? 'var(--accent)' : 'var(--border)',          // ✅ was hardcoded
              borderRadius: 100,
              background: isActive ? 'var(--accent)' : 'transparent',            // ✅ was hardcoded
              color: isActive ? 'var(--accent-contrast)' : 'var(--text-soft)',    // ✅ was hardcoded
              fontWeight: 700,
              fontSize: '0.78rem',
              fontFamily: '"Aeonik Pro", Arial, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 4px 14px var(--accent-glow)' : 'none',    // ✅ was hardcoded
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-soft)';
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default EventsTopBar;