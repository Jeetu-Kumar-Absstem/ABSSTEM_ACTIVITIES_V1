// src/components/common/StatsRow.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

const StatsRow = () => {
  const { selectedGame, getGameStats, games, bookings } = useApp();
  const [stats, setStats] = useState({
    todayBookings: 0,
    availableSlots: 0,
    fullSlots: 0,
    activeBans: 0,
    totalGames: 0
  });

  const gameName = games.find(g => String(g.id) === String(selectedGame))?.name || 'Carrom';

  // Recalculate stats whenever bookings or selected game changes
  useEffect(() => {
    const newStats = getGameStats(selectedGame);
    setStats(newStats);
  }, [bookings, selectedGame, getGameStats]);

  const statItems = [
    { 
      label: "Today's Bookings", 
      value: stats.todayBookings, 
      sub: `Across all games (${gameName})`, 
      color: '#1a3c6e' 
    },
    { 
      label: 'Available Slots', 
      value: stats.availableSlots, 
      sub: 'Today', 
      color: '#00897b' 
    },
    { 
      label: 'Full Slots', 
      value: stats.fullSlots, 
      sub: 'Max capacity reached', 
      color: '#f9a825' 
    },
    { 
      label: 'Active Bans', 
      value: stats.activeBans, 
      sub: 'Cannot book', 
      color: '#e53935' 
    },
    { 
      label: 'Active Games', 
      value: stats.totalGames, 
      sub: 'In game master', 
      color: '#388e3c' 
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      {statItems.map((stat, i) => (
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
