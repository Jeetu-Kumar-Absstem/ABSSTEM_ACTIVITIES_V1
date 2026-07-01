// src/ui/BanPlayerConfirm.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Ban-player dialog, rendered via a Portal directly into document.body.
 * This guarantees correct fixed positioning and sizing no matter what CSS
 * exists on any ancestor in the component tree (transform, filter, overflow,
 * stacking contexts, etc. on a parent can normally break position:fixed —
 * a portal sidesteps all of that by moving the DOM node outside the tree).
 *
 * Fixed pixel dimensions (not vh) are used so there's no dependency on
 * viewport-unit quirks either. The Confirm Ban button is in its own
 * non-scrolling footer row, so it is ALWAYS visible.
 *
 * Props:
 *  - open: boolean
 *  - player: { name, employee_id }
 *  - game: string
 *  - onConfirm: (banData) => void
 *  - onCancel: () => void
 */
const BanPlayerConfirm = ({ open, player, game, onConfirm, onCancel }) => {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [untilDate, setUntilDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState(`Banned from ${game} by admin`);
  const [error, setError] = useState('');

  if (!open || !player) return null;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please enter a reason for the ban.');
      return;
    }
    setError('');
    onConfirm({
      employee: player.name,
      employee_id: player.employee_id || 'N/A',
      from_date: fromDate,
      until_date: untilDate,
      reason: reason.trim(),
    });
  };

  const dialog = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '40px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px',
          maxWidth: 'calc(100vw - 40px)',
          height: '560px',
          maxHeight: 'calc(100vh - 80px)',
          background: 'white',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Header — fixed row, never scrolls */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 22px 10px', flexShrink: 0, flexGrow: 0,
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>🚫 Ban Player</h3>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8888aa' }}
          >
            ✕
          </button>
        </div>

        {/* Body — the only scrollable region. minHeight:0 lets it shrink inside the flex column. */}
        <div style={{ padding: '0 22px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{
            marginBottom: '14px', padding: '10px 14px', background: '#ffebee',
            borderRadius: '12px', borderLeft: '3px solid #e53935',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Player: {player.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#c62828' }}>Game: {game}</div>
            <div style={{ fontSize: '0.65rem', color: '#c62828', marginTop: '4px' }}>
              Employee ID: {player.employee_id || 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              From Date <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input
              type="date"
              className="clay-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Until Date <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input
              type="date"
              className="clay-input"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Reason <span style={{ color: '#e53935' }}>*</span>
            </label>
            <textarea
              className="clay-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for the ban..."
              rows="3"
              style={{ resize: 'vertical', width: '100%' }}
            />
            {error && <div style={{ color: '#e53935', fontSize: '0.7rem', marginTop: '4px' }}>{error}</div>}
          </div>

          <div style={{
            marginBottom: '14px', padding: '10px 14px', background: '#fff8e1',
            borderRadius: '8px', fontSize: '0.65rem', color: '#e65100',
          }}>
            ⚠️ This will ban <strong>{player.name}</strong> from <strong>{game}</strong>. They won't be able to book slots for this game until the ban expires.
          </div>
        </div>

        {/* Footer — fixed row at the bottom of the card, ALWAYS visible, never part of the scroll area */}
        <div style={{
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
          padding: '14px 22px', flexShrink: 0, flexGrow: 0,
          borderTop: '1px solid rgba(200,210,230,0.4)',
          background: 'white',
        }}>
          <button className="clay-btn" onClick={onCancel}>Cancel</button>
          <button className="clay-btn clay-btn-red" onClick={handleConfirm}>
            🚫 Confirm Ban
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default BanPlayerConfirm;