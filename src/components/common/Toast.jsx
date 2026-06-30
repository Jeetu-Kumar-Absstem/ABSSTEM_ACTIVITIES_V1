// src/components/common/Toast.jsx
import React from 'react';
import { useToast } from '../../context/ToastContext';

const Toast = () => {
  const { toast } = useToast();
  if (!toast.visible) return null;

  const bg =
    toast.type === 'error' ? 'rgba(229,57,53,0.92)' :
    toast.type === 'warning' ? 'rgba(249,168,37,0.92)' :
    toast.type === 'info' ? 'rgba(26,60,110,0.92)' :
    'rgba(43,59,107,0.92)'; // success / default

  return (
    <div
      className="clay"
      style={{
        // Inline (not Tailwind) so positioning never depends on
        // whether Tailwind's purge/content config picked up this file.
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        padding: '12px 24px',
        borderRadius: '40px',
        background: bg,
        color: 'white',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
        {toast.type === 'success' && '✅'}
        {toast.type === 'error' && '❌'}
        {toast.type === 'warning' && '⚠️'}
        {toast.type === 'info' && 'ℹ️'}
        {toast.message}
      </span>
    </div>
  );
};

export default Toast;