// src/components/booking/GameSelector.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SLOTS } from '../../utils/constants';
import { filterBookingsToWeek, getDayName } from '../../utils/helpers';

// Static icon map — add more game ids/names as needed
const GAME_ICONS = {
  carrom: '🎯',
  chess:  '♟️',
  // fallback handled below
};

function getGameIcon(game) {
  // try by name (lowercase), then by existing icon field
  const byName = GAME_ICONS[game.name?.toLowerCase()];
  if (byName) return byName;
  if (game.icon) return game.icon;
  return '🎮';
}

const ACTIVE_STYLE = {
  background: '#113768',
  border: '2px solid #1a3c6e',
  color: '#fff',
  boxShadow: '0 4px 14px rgba(26,60,110,0.35), 0 1px 3px rgba(0,0,0,0.1)',
};

const INACTIVE_STYLE = {
  background: 'transparent',
  border: '2px solid rgba(200,210,230,0.5)',
  color: '#555',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const DISABLED_STYLE = {
  background: 'rgba(136,136,170,0.06)',
  border: '2px solid rgba(200,210,230,0.3)',
  color: '#8888aa',
  boxShadow: 'none',
  opacity: 0.6,
};

const GameSelector = () => {
  const { games, selectedGame, setSelectedGame, bookings, currentDate, loadBookings } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };
  const [gameBookings, setGameBookings] = useState({});

  useEffect(() => {
    const today    = currentDate;
    const todayName = getDayName(today);
    const weekBookings = filterBookingsToWeek(bookings, currentDate);

    const counts = {};
    games.forEach(game => {
      let total = 0;
      if (weekBookings[todayName]) {
        SLOTS.forEach(slot => {
          const players = weekBookings[todayName]?.[slot.id] || [];
          total += players.filter(
            p => String(p.game) === String(game.id) || p.game === game.name
          ).length;
        });
      }
      counts[game.id] = total;
    });
    setGameBookings(counts);
  }, [bookings, games, currentDate]);

  return (
    <div
      className="clay-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '12px',
      }}
    >
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8888aa' }}>
        Select Game:
      </span>

      {games.map(game => {
        const isSelected = String(selectedGame) === String(game.id) || String(selectedGame).toLowerCase() === String(game.name).toLowerCase();
        const isDisabled = game.active === false;
        const bookingCount = gameBookings[game.id] || 0;
        const icon = getGameIcon(game);

        const styleBase = isDisabled
          ? DISABLED_STYLE
          : isSelected
          ? ACTIVE_STYLE
          : INACTIVE_STYLE;

        return (
          <div
            key={game.id}
            onClick={() => {
              if (isDisabled) { alert('Currently this is Unavailable'); return; }
              setSelectedGame(String(game.id));
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 16px',
              borderRadius: '100px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease',
              userSelect: 'none',
              ...styleBase,
            }}
          >
            {/* Game icon */}
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{icon}</span>

            {/* Game name — UPPERCASE bold like the screenshot */}
            <span style={{
              fontFamily: '"Aeonik Pro", Arial, sans-serif',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {game.name}
            </span>

            {/* Booking count badge */}
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 500,
              padding: '1px 8px',
              borderRadius: '12px',
              background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
              color: isSelected ? '#fff' : '#777',
            }}>
              {bookingCount} booked
            </span>

            {/* Inactive badge */}
            {isDisabled && (
              <span style={{
                fontSize: '0.55rem', fontWeight: 600,
                color: '#c62828',
                background: 'rgba(198,40,40,0.1)',
                padding: '1px 8px', borderRadius: '12px',
              }}>
                Inactive
              </span>
            )}
          </div>
        );
      })}

      {/* Action buttons */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
       <button
          className="clay-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ opacity: refreshing ? 0.7 : 1, cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor:'#0d207e',color:'#ffffff'
           }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default GameSelector;