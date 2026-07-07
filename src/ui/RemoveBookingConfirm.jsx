// src/ui/RemoveBookingConfirm.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import useViewport from '../hooks/useViewport';
import BottomSheet from '../components/common/BottomSheet';

/**
 * Confirmation dialog for removing your own booking, rendered via a Portal
 * directly into document.body so it can never be trapped by an ancestor's
 * transform/filter/overflow CSS. No native alert()/confirm() anywhere.
 *
 * Props:
 *  - open: boolean
 *  - playerName: string
 *  - day: string
 *  - slotLabel: string (e.g. "Slot 3")
 *  - onConfirm: () => void
 *  - onCancel: () => void
 */
const RemoveBookingConfirm = ({ open, playerName, day, slotLabel, onConfirm, onCancel }) => {
  const { isMobile } = useViewport();
  if (!open) return null;

  const body = (
    <p style={{ fontSize: '0.85rem', color: '#444466', lineHeight: 1.5, margin: 0 }}>
      Remove <strong>{playerName}</strong>'s booking for <strong>{day}</strong>
      {slotLabel ? <> at <strong>{slotLabel}</strong></> : null}? This can't be undone.
    </p>
  );

  const footer = (
    <>
      <button className="clay-btn" onClick={onCancel} style={{ padding: '8px 18px' }}>
        Cancel
      </button>
      <button className="clay-btn clay-btn-red" onClick={onConfirm} style={{ padding: '8px 18px' }}>
        ✖️ Remove
      </button>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onCancel}
        title="Remove Booking?"
        icon="✖️"
        footer={footer}
      >
        {body}
      </BottomSheet>
    );
  }

  const dialog = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.4)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          maxWidth: 'calc(100vw - 40px)',
          background: 'white',
          borderRadius: '24px',
          padding: '22px 22px 18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>✖️</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f', margin: 0 }}>
            Remove Booking?
          </h3>
        </div>

        {body}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
          {footer}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default RemoveBookingConfirm;
