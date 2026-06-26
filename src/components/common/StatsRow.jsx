// src/components/common/StatsRow.jsx
import React from 'react';

const StatsRow = ({ todayBookings, availableSlots, fullSlots, bans }) => {
  const stats = [
    { label: "Today's Bookings", value: todayBookings, sub: 'Across all games', color: '#1a3c6e' },
    { label: 'Available Slots', value: availableSlots, sub: 'Today', color: '#00897b' },
    { label: 'Full Slots', value: fullSlots, sub: 'Max capacity reached', color: '#f9a825' },
    { label: 'Active Bans', value: bans?.filter(b => b.active !== false && new Date(b.until) > new Date()).length || 0, sub: 'Cannot book', color: '#e53935' },
    { label: 'Active Games', value: 3, sub: 'In game master', color: '#388e3c' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      {stats.map((stat, i) => (
        <div key={i} className="clay-card" style={{ padding: '12px 16px', borderTop: `3px solid ${stat.color}` }}>
          <div style={{ fontSize: '0.6rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: '0.6rem', color: '#8888aa', marginTop: '2px' }}>{stat.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsRow;