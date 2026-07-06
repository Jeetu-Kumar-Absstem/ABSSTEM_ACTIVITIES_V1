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
        marginBottom: '20px',
        borderRadius: '60px',
        position: 'relative',
        zIndex: 1000,
        background: 'linear-gradient(135deg, rgba(190, 230, 225, 0.98), rgba(187, 246, 198, 0.92),rgba(236, 172, 222, 0.92))',
        boxShadow: '0 18px 50px rgba(26,60,110,0.08)',
      }}
    >
      {showHamburger && (
        <button
          type="button"
          aria-label="Open navigation"
          className="hamburger-btn"
          onClick={onOpenDrawer}
        >
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>
      )}

      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a3c6e' }}>Absstem</div>
      </div>

      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.75rem',
        color: '#444466',
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
