// src/ui/BanPlayerConfirm.jsx
import React, { useState } from 'react';

/**
 * Ban-player dialog. No native confirm() anywhere.
 * Layout is header (fixed) + scrollable body + footer (sticky) so the
 * Confirm Ban button is ALWAYS visible, even on short viewports —
 * the form content scrolls internally instead of pushing the button down.
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '85vh',
          maxHeight: '600px',
          background: 'white',
          borderRadius: '28px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header — fixed, never scrolls */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 12px', flexShrink: 0,
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>🚫 Ban Player</h3>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8888aa' }}
          >
            ✕
          </button>
        </div>

        {/* Body — this is the ONLY part that scrolls. minHeight: 0 is required
            here or flexbox lets this grow past the dialog's maxHeight instead
            of scrolling internally, which pushes the footer off-screen. */}
        <div style={{ padding: '0 24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{
            marginBottom: '16px', padding: '10px 14px', background: '#ffebee',
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
            marginBottom: '16px', padding: '10px 14px', background: '#fff8e1',
            borderRadius: '8px', fontSize: '0.65rem', color: '#e65100',
          }}>
            ⚠️ This will ban <strong>{player.name}</strong> from <strong>{game}</strong>. They won't be able to book slots for this game until the ban expires.
          </div>
        </div>

        {/* Footer — sticky, ALWAYS visible regardless of body scroll position */}
        <div style={{
          display: 'flex', gap: '10px', justifyContent: 'flex-end',
          padding: '14px 24px', flexShrink: 0,
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
};

export default BanPlayerConfirm;