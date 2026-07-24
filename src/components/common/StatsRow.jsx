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
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const gameName = games.find(g => String(g.id) === String(selectedGame) || String(g.name).toLowerCase() === String(selectedGame).toLowerCase())?.name || 'Carrom';

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
      color: 'var(--accent)' 
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
        <div
          key={i}
          className="clay-card"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            padding: '12px 16px',
            borderTop: `3px solid ${stat.color}`,
            borderRight: `2px solid ${hoveredIndex === i ? stat.color : 'transparent'}`,
            borderBottom: `2px solid ${hoveredIndex === i ? stat.color : 'transparent'}`,
            borderLeft: `2px solid ${hoveredIndex === i ? stat.color : 'transparent'}`,
            transform: hoveredIndex === i ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
            boxShadow: hoveredIndex === i ? `0 8px 20px ${stat.color}33` : 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            cursor: 'default',
          }}
        >
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{stat.label}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '2px', fontWeight: 600 }}>{stat.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsRow;
