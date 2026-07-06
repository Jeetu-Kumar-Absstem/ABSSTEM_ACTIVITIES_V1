// src/components/layout/Topbar.jsx
import React from 'react';
import ProfileIcon from '../common/ProfileIcon';

const Topbar = ({ user, onLogout }) => {
  return (
    <div 
      className="clay" 
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
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a3c6e' }}>Absstem</div>
        {/* <div style={{ fontSize: '0.55rem', fontWeight: 300, letterSpacing: '0.15em', opacity: 0.6 }}>CLAN · ERP SYSTEM</div> */}
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
        {/* <span style={{ opacity: 0.7 }}>View Rating</span> */}
        {/* <span style={{ 
          position: 'relative', 
          fontSize: '1.1rem', 
          cursor: 'pointer',
        }}>
          🔔
          <span style={{ 
            position: 'absolute', 
            top: '-6px', 
            right: '-8px', 
            background: '#e53935', 
            color: 'white', 
            fontSize: '0.5rem', 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>2</span>
        </span> */}
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