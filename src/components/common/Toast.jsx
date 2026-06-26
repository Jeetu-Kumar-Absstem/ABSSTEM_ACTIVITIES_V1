// src/components/common/Toast.jsx
import React from 'react';
import { useToast } from '../../context/ToastContext';

const Toast = () => {
  const { toast } = useToast();
  if (!toast.visible) return null;

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 clay" style={{ padding: '12px 24px', borderRadius: '40px', background: toast.type === 'error' ? 'rgba(229,57,53,0.9)' : 'rgba(43,59,107,0.9)', color: 'white', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
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