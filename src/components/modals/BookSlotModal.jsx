// src/components/modals/BookSlotModal.jsx
import React, { useState } from 'react';
import { SLOTS } from '../../utils/constants';

const BookSlotModal = ({ isOpen, onClose, onConfirm, day, slotId, currentBookings, maxPlayers, game }) => {
  const [playerName, setPlayerName] = useState('');

  if (!isOpen) return null;

  const slot = SLOTS.find(s => s.id === slotId);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="clay" style={{ width: '100%', maxWidth: 480, padding: '24px', borderRadius: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>Book My Slot</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8888aa' }}>✕</button>
        </div>

        <div className="clay-soft" style={{ padding: '10px 14px', borderRadius: '16px', marginBottom: '16px', fontSize: '0.75rem', color: '#1a3c6e' }}>
          📅 Booking for: <strong>{day}, Slot {slotId}</strong> — {slot?.time}
          <div style={{ fontSize: '0.65rem', color: '#444466', marginTop: '2px' }}>
            Max {maxPlayers} players per slot
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Player Name <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input
              className="clay-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="clay-soft" style={{ padding: '12px 16px', borderRadius: '16px', fontSize: '0.75rem', color: '#444466' }}>
            <div style={{ fontWeight: 600, color: '#1a3c6e', marginBottom: '4px' }}>Slot Info</div>
            <div>Current players booked: <strong>{currentBookings.length} / {maxPlayers}</strong></div>
            {currentBookings.length > 0 && (
              <div style={{ marginTop: '4px' }}>Already booked: {currentBookings.map(p => 
                <span key={p.name} className="clay-tag" style={{ margin: '2px' }}>{p.name}</span>
              )}</div>
            )}
            {currentBookings.length >= maxPlayers && (
              <div style={{ marginTop: '4px', color: '#e53935', fontWeight: 600 }}>
                ⚠️ This slot is FULL!
              </div>
            )}
          </div>

          <div className="clay-soft" style={{ padding: '10px 14px', borderRadius: '16px', fontSize: '0.7rem', color: '#666', background: 'rgba(249,168,37,0.05)', borderLeft: '3px solid #f9a825' }}>
            ⚠ Only 1 booking per day per player is allowed. You must be present within 10 minutes of your slot or it may be given to another player.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="clay-btn" onClick={onClose}>Cancel</button>
          <button 
            className="clay-btn clay-btn-teal" 
            onClick={() => {
              if (currentBookings.length >= maxPlayers) {
                alert('This slot is full!');
                return;
              }
              onConfirm(playerName) && onClose();
            }}
            disabled={currentBookings.length >= maxPlayers}
            style={{
              opacity: currentBookings.length >= maxPlayers ? 0.5 : 1,
              cursor: currentBookings.length >= maxPlayers ? 'not-allowed' : 'pointer',
            }}
          >
            ✅ Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookSlotModal;