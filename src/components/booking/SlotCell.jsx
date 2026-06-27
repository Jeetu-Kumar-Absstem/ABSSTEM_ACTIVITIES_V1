// src/components/booking/SlotCell.jsx
import React from 'react';
import { useApp } from '../../context/AppContext';
import { isBanned } from '../../utils/helpers';

const SlotCell = ({ day, slotId, players, maxPlayers, onBook, onRemove }) => {
  const { currentUser, selectedGame, bans } = useApp();
  const isFull = players.length >= maxPlayers;

  const handleRemove = (player, userId, e) => {
    e.stopPropagation();
    const currentUserId = currentUser?.id;
    // Only allow removal if current user is the owner or admin
    if (currentUserId === userId) {
      onRemove(day, slotId, player, userId);
    } else {
      alert('You can only remove your own bookings!');
    }
  };

  return (
    <div
      style={{
        background: isFull ? 'rgba(249,168,37,0.1)' : 'rgba(255,255,255,0.3)',
        borderRadius: '16px',
        padding: '4px 6px',
        minHeight: '32px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: isFull ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease'
      }}
      onClick={() => !isFull && onBook(day, slotId)}
    >
      {players.map(player => {
        const banned = isBanned(player.name, selectedGame, bans);
        const isOwner = currentUser?.id === player.user_id;
        return (
          <span
            key={`${player.name}-${player.user_id}`}
            style={{
              background: banned ? 'rgba(229,57,53,0.15)' : isOwner ? 'rgba(56,142,60,0.15)' : 'rgba(26,60,110,0.08)',
              padding: '2px 10px',
              borderRadius: '20px',
              fontSize: '0.6rem',
              fontWeight: 500,
              color: banned ? '#c62828' : isOwner ? '#2e7d32' : '#1a3c6e',
              textDecoration: banned ? 'line-through' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: isOwner && !banned ? 'pointer' : 'default',
              border: isOwner && !banned ? '1px solid rgba(56,142,60,0.3)' : 'none',
            }}
            onClick={(e) => {
              if (isOwner && !banned) {
                handleRemove(player.name, player.user_id, e);
              } else if (!isOwner && !banned) {
                alert('You can only remove your own bookings!');
              }
            }}
            title={isOwner ? 'Click to remove your booking' : (banned ? 'Banned player' : 'Booked by another user')}
          >
            {player.name}
            {isOwner && !banned && <span style={{ opacity: 0.5, fontSize: '0.5rem' }}>×</span>}
            {banned && ' 🚫'}
            {isOwner && !banned && <span style={{ fontSize: '0.4rem', opacity: 0.6 }}>👤</span>}
          </span>
        );
      })}
      {!isFull && players.length < maxPlayers && (
        <span style={{ fontSize: '0.6rem', color: '#00897b', opacity: 0.5 }}>+</span>
      )}
      {isFull && <span style={{ fontSize: '0.5rem', color: '#f9a825' }}>FULL ({players.length}/{maxPlayers})</span>}
    </div>
  );
};

export default SlotCell;