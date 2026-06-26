// src/components/layout/Topbar.jsx
import React from 'react';

const Topbar = () => {
  return (
    <div className="clay" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderRadius: '60px' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a3c6e' }}>absstem</div>
        <div style={{ fontSize: '0.55rem', fontWeight: 300, letterSpacing: '0.15em', opacity: 0.6 }}>CLAN · ERP SYSTEM</div>
      </div>
      <div style={{ flex: 1, maxWidth: 400 }}>
        <input className="clay-input" placeholder="Enter Quotation No./Sale Order No./Invoice..." style={{ padding: '8px 18px', fontSize: '0.75rem' }} />
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#444466' }}>
        <span style={{ opacity: 0.7 }}>View Rating</span>
        <span style={{ position: 'relative', fontSize: '1.1rem', cursor: 'pointer' }}>
          🔔
          <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#e53935', color: 'white', fontSize: '0.5rem', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
        </span>
        <span className="clay-tag" style={{ padding: '4px 14px', fontSize: '0.7rem' }}>E1002 | PRADEEP SATI</span>
      </div>
    </div>
  );
};

export default Topbar;