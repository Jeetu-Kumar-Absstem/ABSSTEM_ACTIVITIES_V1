// src/components/common/StatsRow.jsx
// 5 stat cards in an auto-fit grid. Hover effects (translateY + color flip)
// are wired through usePressState so phones get tap-press feedback too.
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import usePressState from '../../hooks/usePressState';

const StatsRow = () => {
  const { selectedGame, getGameStats, games, bookings } = useApp();
  const [stats, setStats] = useState({
    todayBookings: 0,
    availableSlots: 0,
    fullSlots: 0,
    activeBans: 0,
    totalGames: 0
  });

  const gameName = games.find(g => String(g.id) === String(selectedGame) || String(g.name).toLowerCase() === String(selectedGame).toLowerCase())?.name || 'Carrom';

  useEffect(() => {
    const newStats = getGameStats(selectedGame);
    setStats(newStats);
  }, [bookings, selectedGame, getGameStats]);

  const statItems = [
    { label: "Today's Bookings", value: stats.todayBookings, sub: `Across all games (${gameName})`, color: '#1a3c6e' },
    { label: 'Available Slots',  value: stats.availableSlots, sub: 'Today',                          color: '#00897b' },
    { label: 'Full Slots',       value: stats.fullSlots,      sub: 'Max capacity reached',           color: '#f9a825' },
    { label: 'Active Bans',      value: stats.activeBans,     sub: 'Cannot book',                    color: '#e53935' },
    { label: 'Active Games',     value: stats.totalGames,     sub: 'In game master',                 color: '#388e3c' },
  ];

  return (
    <div
      className="stats-row-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      {statItems.map((stat, i) => (
        <StatCard key={i} stat={stat} />
      ))}
    </div>
  );
};

const StatCard = ({ stat }) => {
  const { pressed, pressProps } = usePressState();
  const hovered = pressed;
  return (
    <div
      {...pressProps}
      style={{
        padding: '12px 16px',
        borderRadius: '20px',
        borderTop: `3px solid ${stat.color}`,
        borderRight: `2px solid ${hovered ? stat.color : 'rgba(200,210,230,0.3)'}`,
        borderBottom: `2px solid ${hovered ? stat.color : 'rgba(200,210,230,0.3)'}`,
        borderLeft: `2px solid ${hovered ? stat.color : 'rgba(200,210,230,0.3)'}`,
        background: hovered ? stat.color : 'var(--bg-surface-strong)',
        boxShadow: hovered
          ? `0 8px 24px ${stat.color}66`
          : '6px 6px 14px rgba(0,0,0,0.06), -6px -6px 14px rgba(255,255,255,0.5)',
        transform: hovered ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      }}
    >
      <div style={{
        fontSize: '0.6rem',
        color: hovered ? 'rgba(255,255,255,0.85)' : 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 700,
      }}>{stat.label}</div>
      <div style={{
        fontSize: '1.3rem',
        fontWeight: 800,
        color: hovered ? '#fff' : stat.color,
        lineHeight: 1,
        margin: '4px 0 2px',
      }}>{stat.value}</div>
      <div style={{
        fontSize: '0.6rem',
        color: hovered ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
        fontWeight: 600,
      }}>{stat.sub}</div>
    </div>
  );
};

export default StatsRow;
