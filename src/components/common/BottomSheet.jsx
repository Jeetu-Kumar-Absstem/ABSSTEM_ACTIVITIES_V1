// src/components/common/BottomSheet.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const BottomSheet = ({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  maxHeight = '85vh',
  ariaLabel,
}) => {
  // Esc-to-close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panel = (
    <div className="bottom-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="bottom-sheet-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || 'Dialog'}
        style={{ maxHeight }}
      >
        <div className="bottom-sheet-grabber" aria-hidden />
        {(title || icon) && (
          <header className="bottom-sheet-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
              {title && <h3 className="bottom-sheet-title">{title}</h3>}
            </div>
            <button
              type="button"
              aria-label="Close"
              className="bottom-sheet-close"
              onClick={onClose}
            >✕</button>
          </header>
        )}

        <div className="bottom-sheet-body">
          {children}
        </div>

        {footer && (
          <footer className="bottom-sheet-footer">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};

export default BottomSheet;
