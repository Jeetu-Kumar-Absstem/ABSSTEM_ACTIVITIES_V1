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
        background: 'white',
        borderRadius: 32,
        padding: '8px 12px',
        marginBottom: '16px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
              borderColor: isActive ? '#1a3c6e' : 'rgba(200,210,230,0.5)',
              borderRadius: 100,
              background: isActive ? '#1a3c6e' : 'transparent',
              color: isActive ? '#fff' : '#444466',
              fontWeight: 700,
              fontSize: '0.78rem',
              fontFamily: '"Aeonik Pro", Arial, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 4px 14px rgba(26,60,110,0.35)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = '#1a3c6e';
                e.currentTarget.style.color = '#1a3c6e';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(200,210,230,0.5)';
                e.currentTarget.style.color = '#444466';
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
