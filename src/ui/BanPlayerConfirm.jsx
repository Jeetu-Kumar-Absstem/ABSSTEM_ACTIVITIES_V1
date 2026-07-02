// src/ui/BanPlayerConfirm.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Ban-player dialog, rendered via a Portal directly into document.body.
 *
 * Props:
 *  - open: boolean
 *  - player: { name, employee_id }
 *  - game: string
 *  - gameOptions: Array<{ value, label }>
 *  - onConfirm: (banData) => void
 *  - onCancel: () => void
 */
const BanPlayerConfirm = ({ open, player, game, gameOptions = [], onConfirm, onCancel }) => {
  const getDefaultUntilDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };
  const defaultScopeValue = gameOptions.find((option) => option.label === game)?.value || game;
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [untilDate, setUntilDate] = useState(getDefaultUntilDate);
  const [reason, setReason] = useState(`Banned from ${game} by admin`);
  const [bannedFrom, setBannedFrom] = useState(defaultScopeValue);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason(`Banned from ${game} by admin`);
    setBannedFrom(defaultScopeValue);
    setError('');
  }, [defaultScopeValue, game, open]);

  if (!open || !player) return null;

  const scopeOptions = [
    { value: 'All Games', label: 'All Games' },
    ...gameOptions.filter((option) => option.value !== 'All Games'),
  ];

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
      banned_from: bannedFrom,
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
          height: '600px',
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 22px 10px',
          flexShrink: 0,
          flexGrow: 0,
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>Ban Player</h3>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8888aa' }}
          >
            x
          </button>
        </div>

        <div style={{ padding: '0 22px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{
            marginBottom: '14px',
            padding: '10px 14px',
            background: '#ffebee',
            borderRadius: '12px',
            borderLeft: '3px solid #e53935',
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

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Banned from
            </label>
            <select
              className="clay-select"
              value={bannedFrom}
              onChange={(e) => setBannedFrom(e.target.value)}
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{
            marginBottom: '14px',
            padding: '10px 14px',
            background: '#fff8e1',
            borderRadius: '8px',
            fontSize: '0.65rem',
            color: '#e65100',
          }}>
            This will ban <strong>{player.name}</strong> from <strong>{scopeOptions.find((option) => option.value === bannedFrom)?.label || bannedFrom}</strong>.
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          padding: '14px 22px',
          flexShrink: 0,
          flexGrow: 0,
          borderTop: '1px solid rgba(200,210,230,0.4)',
          background: 'white',
        }}>
          <button className="clay-btn" onClick={onCancel}>Cancel</button>
          <button className="clay-btn clay-btn-red" onClick={handleConfirm}>
            Confirm Ban
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default BanPlayerConfirm;
