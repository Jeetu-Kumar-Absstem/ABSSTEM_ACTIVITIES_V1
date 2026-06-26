// src/components/booking/GameSelector.jsx
import React from 'react';
import { useApp } from '../../context/AppContext';

const GameSelector = () => {
  const { games, selectedGame, setSelectedGame, bookings } = useApp();

  return (
    <div className="clay-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8888aa' }}>Select Game:</span>
      {games.map(game => {
        const total = Object.values(bookings).reduce((sum, day) => {
          return sum + Object.values(day).reduce((s, slot) => s + (slot?.length || 0), 0);
        }, 0);
        return (
          <div
            key={game.id}
            className="clay-soft"
            style={{
              padding: '6px 16px',
              borderRadius: '40px',
              cursor: 'pointer',
              background: selectedGame === game.id ? 'rgba(26,60,110,0.1)' : 'transparent',
              border: selectedGame === game.id ? '1px solid rgba(26,60,110,0.2)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: selectedGame === game.id ? 500 : 400,
              color: selectedGame === game.id ? '#1a3c6e' : '#444466'
            }}
            onClick={() => setSelectedGame(game.id)}
          >
            <span style={{ fontSize: '1rem' }}>{game.icon}</span>
            {game.name}
            <span style={{ fontSize: '0.6rem', opacity: 0.5, background: 'rgba(0,0,0,0.04)', padding: '0 8px', borderRadius: '12px' }}>
              {total} booked
            </span>
          </div>
        );
      })}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <button className="clay-btn clay-btn-primary">+ Book Slot</button>
        <button className="clay-btn">👤 Book for Employee</button>
      </div>
    </div>
  );
};

export default GameSelector;