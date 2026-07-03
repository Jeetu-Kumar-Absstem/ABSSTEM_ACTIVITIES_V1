// src/components/booking/CapacitySummary.jsx
import React, { useState, useEffect } from 'react';
import { SLOTS } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { filterBookingsToWeek, getDayName } from '../../utils/helpers';

const CapacitySummary = () => {
  const { selectedGame, bookings, games, currentDate } = useApp();
  const game = games.find(g => String(g.id) === String(selectedGame));
  const maxPerSlot = game?.maxPlayers || 4;
  const [slotData, setSlotData] = useState([]);

  useEffect(() => {
    const weekBookings = filterBookingsToWeek(bookings, currentDate);
    const currentDay = getDayName(currentDate);
    
    const data = SLOTS.map(slot => {
      const players = weekBookings[currentDay]?.[slot.id] || [];
      const gamePlayers = players.filter(p => String(p.game) === String(selectedGame) || p.game === game?.name);
      const total = gamePlayers.length;
      const pct = Math.min(Math.round((total / maxPerSlot) * 100), 100);
      const isFull = total >= maxPerSlot;
      
      return {
        ...slot,
        total,
        maxPerSlot,
        pct,
        isFull
      };
    });

    setSlotData(data);
  }, [bookings, selectedGame, currentDate, maxPerSlot]);

  const currentDay = getDayName(currentDate);

  return (
    <div className="clay-card" style={{ marginTop: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: '0.7rem', color: '#013a0a', marginBottom: '10px' }}>
        Slot Capacity Overview — {game?.name || 'All Games'} (Max {maxPerSlot} players per slot) - {currentDay}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
        {slotData.map(slot => (
          <div key={slot.id} className="clay-soft" style={{ padding: '8px 6px', textAlign: 'center', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#080c12' }}>{slot.label}</div>
            <div style={{ fontSize: '0.5rem', color: '#6045c5' }}>{slot.time}</div>
            <div style={{ width: '100%', height: '4px', background: '#e0e4ec', borderRadius: '4px', margin: '4px 0' }}>
              <div style={{ 
                width: `${slot.pct}%`, 
                height: '100%', 
                borderRadius: '4px', 
                background: slot.isFull ? '#f9a825' : slot.pct > 75 ? '#e53935' : '#00897b' 
              }}></div>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: slot.isFull ? '#f9a825' : '#00897b' }}>
              {slot.total}/{slot.maxPerSlot}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CapacitySummary;
