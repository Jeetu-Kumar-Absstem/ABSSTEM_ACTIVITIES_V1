// src/components/layout/Topbar.jsx
import React from 'react';
import ProfileIcon from '../common/ProfileIcon';

const Topbar = ({ user, onLogout, onOpenDrawer, showHamburger = false }) => {
  return (
    <div
      className="clay topbar-clay"
      style={{
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        margin: '20px 24px 0 24px',
        borderRadius: '16px',
        position: 'relative',
        zIndex: 1000,
        background: 'var(--shell-gradient)',
        boxShadow: 'var(--surface-shadow-soft)',
        border: '1px solid var(--shell-border)',
      }}
    >
      {showHamburger && (
        <button
          type="button"
          aria-label="Open navigation"
          className="hamburger-btn"
          onClick={onOpenDrawer}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: 'var(--text)', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: 'var(--text)', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '24px', height: '2px', backgroundColor: 'var(--text)', borderRadius: '2px' }} />
        </button>
      )}

      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.75rem',
        color: 'var(--text)',
        position: 'relative',
        zIndex: 1001,
      }}>
        {user && (
          <div style={{ position: 'relative', zIndex: 9999 }}>
            <ProfileIcon user={user} onLogout={onLogout} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
