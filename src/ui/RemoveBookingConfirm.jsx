// src/ui/RemoveBookingConfirm.jsx
import React from 'react';

/**
 * Confirmation dialog for removing your own booking.
 * No native alert()/confirm() — fully custom, fixed to viewport,
 * so the OK/Cancel buttons are always visible without scrolling.
 *
 * Props:
 *  - open: boolean
 *  - playerName: string
 *  - day: string
 *  - slotLabel: string (e.g. "Slot 3" or "12:00–12:30 PM")
 *  - onConfirm: () => void
 *  - onCancel: () => void
 */
const RemoveBookingConfirm = ({ open, playerName, day, slotLabel, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        className="clay"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'white',
          borderRadius: '24px',
          padding: '22px 22px 18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          animation: 'rbcPopIn 0.15s ease-out',
        }}
      >
        <style>{`
          @keyframes rbcPopIn {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>✖️</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>
            Remove Booking?
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#444466', lineHeight: 1.5, margin: '0 0 18px' }}>
          Remove <strong>{playerName}</strong>'s booking for <strong>{day}</strong>
          {slotLabel ? <> at <strong>{slotLabel}</strong></> : null}? This can't be undone.
        </p>

        {/* Footer is always part of the same compact block — never pushed
            off-screen since this dialog has no scrollable overflow. */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            className="clay-btn"
            onClick={onCancel}
            style={{ padding: '8px 18px' }}
          >
            Cancel
          </button>
          <button
            className="clay-btn clay-btn-red"
            onClick={onConfirm}
            style={{ padding: '8px 18px' }}
          >
            ✖️ Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveBookingConfirm;