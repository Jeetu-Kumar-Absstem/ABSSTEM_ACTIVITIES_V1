// src/components/booking/CapacitySummary.jsx
import React, { useState, useEffect } from 'react';
import { SLOTS } from '../../utils/constants';
import { useApp } from '../../context/AppContext';
import { filterBookingsToWeek, getDayName } from '../../utils/helpers';

const CapacitySummary = () => {
  const { selectedGame, bookings, games, currentDate } = useApp();
  const game = games.find(g => String(g.id) === String(selectedGame) || String(g.name).toLowerCase() === String(selectedGame).toLowerCase());
  const maxPerSlot = game?.maxPlayers || 4;
  const [slotData, setSlotData] = useState([]);

  useEffect(() => {
    const weekBookings = filterBookingsToWeek(bookings, currentDate);
    const currentDay = getDayName(currentDate);
    
    const data = SLOTS.map(slot => {
      const players = weekBookings[currentDay]?.[slot.id] || [];
      const gamePlayers = players.filter(p => String(p.game) === String(selectedGame) || p.game === game?.name || String(p.game).toLowerCase() === String(game?.name || '').toLowerCase());
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

  // Get color based on capacity percentage
  const getSlotColor = (pct) => {
    if (pct === 0) return '#4CAF50'; // Green - Empty
    if (pct <= 25) return '#8BC34A'; // Light Green - Low
    if (pct <= 50) return '#FFC107'; // Yellow - Medium
    if (pct <= 75) return '#FF9800'; // Orange - High
    return '#F44336'; // Red - Full
  };

  return (
    <div className="clay-card" style={{ marginTop: '12px' }}>
      <div style={{ 
        fontWeight: 600, 
        fontSize: '0.7rem', 
        color: '#013a0a', 
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <span>Slot Capacity Overview — {game?.name || 'All Games'} (Max {maxPerSlot} players per slot) - {currentDay}</span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }}></span>
            0%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFC107', display: 'inline-block' }}></span>
            50%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F44336', display: 'inline-block' }}></span>
            100%
          </span>
        </div>
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', 
        gap: '8px' 
      }}>
        {slotData.map(slot => (
          <div 
            key={slot.id} 
            className="clay-soft" 
            style={{ 
              padding: '10px 6px', 
              textAlign: 'center', 
              borderRadius: '16px',
              backgroundColor: '#f8f9fc',
              border: '1px solid #e8edf5',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#080c12', marginBottom: '4px' }}>
              {slot.label}
            </div>
            <div style={{ fontSize: '0.45rem', color: '#8a8aa8', marginBottom: '6px' }}>
              {slot.time}
            </div>
            
            {/* Circle Indicator with Percentage */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `conic-gradient(
                  ${getSlotColor(slot.pct)} ${slot.pct}%, 
                  #e8edf5 ${slot.pct}% 100%
                )`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: slot.isFull ? '#F44336' : '#080c12',
                }}>
                  {slot.pct}%
                </div>
              </div>
            </div>
            
            {/* Show filled slots out of total */}
            <div style={{ 
              fontSize: '0.55rem', 
              fontWeight: 600, 
              color: '#080c12',
              marginTop: '2px',
            }}>
              {slot.total}/{slot.maxPerSlot}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CapacitySummary;