// src/components/booking/CapacitySummary.jsx
import React from 'react';
import { SLOTS, DAYS, MAX_PER_SLOT } from '../../utils/constants';
import { useApp } from '../../context/AppContext';

const CapacitySummary = ({ bookings }) => {
  const { selectedGame, games } = useApp();
  const game = games.find(g => g.id === selectedGame);
  const maxPerSlot = game?.maxPlayers || MAX_PER_SLOT;

  return (
    <div className="clay-card" style={{ marginTop: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: '0.7rem', color: '#1a3c6e', marginBottom: '10px' }}>
        Slot Capacity Overview — {game?.name || 'All Games'} (Max {maxPerSlot} players per slot)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
        {SLOTS.map(slot => {
          let total = 0;
          DAYS.forEach(d => { 
            const players = bookings[d]?.[slot.id] || [];
            total += players.length;
          });
          const maxTotal = maxPerSlot * DAYS.length;
          const pct = Math.round((total / maxTotal) * 100);
          return (
            <div key={slot.id} className="clay-soft" style={{ padding: '8px 6px', textAlign: 'center', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#1a3c6e' }}>{slot.label}</div>
              <div style={{ fontSize: '0.5rem', color: '#8888aa' }}>{slot.time}</div>
              <div style={{ width: '100%', height: '4px', background: '#e0e4ec', borderRadius: '4px', margin: '4px 0' }}>
                <div style={{ 
                  width: `${pct}%`, 
                  height: '100%', 
                  borderRadius: '4px', 
                  background: total >= maxTotal ? '#f9a825' : total >= maxTotal * 0.75 ? '#e53935' : '#00897b' 
                }}></div>
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: total >= maxTotal ? '#f9a825' : '#00897b' }}>
                {total}/{maxTotal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CapacitySummary;