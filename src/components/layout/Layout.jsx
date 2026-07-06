// src/components/layout/Layout.jsx
import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      position: 'relative', 
      zIndex: 1,
      overflow: 'visible', // Important for dropdown visibility
    }}>
      <Topbar user={user} onLogout={onLogout} />
      <div style={{ 
        display: 'flex',
        flex: 1,
        gap: '20px',
        overflow: 'visible', // Important for dropdown visibility
        position: 'relative',
      }}>
        <Sidebar />
        <div style={{ 
          flex: 1, 
          minWidth: 0,
          overflow: 'visible', // Important for dropdown visibility
          position: 'relative',
          zIndex: 1,
        }}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        flexShrink: 0,
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#055952',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <p style={{ fontSize: '10px', color: '#ffffff', margin: 0 }}>
          © {new Date().getFullYear()} Absstem Technologies. All rights reserved.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="https://absstem.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '10px', color: '#ffffff', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = '#2563eb'}
            onMouseLeave={e => e.target.style.color = '#ffffff'}
          >
            Privacy Policy
          </a>
          <span style={{ color: '#cbd5e1', fontSize: '10px' }}>|</span>
          <a
            href="https://absstem.com/terms-condition"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '10px', color: '#ffffff', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = '#a75316'}
            onMouseLeave={e => e.target.style.color = '#ffffff'}
          >
            Terms & Conditions
          </a>
          <span style={{ color: '#ffffff', fontSize: '10px' }}>|</span>
          <a
            href="https://absstem.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '10px', color: '#ffffff', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = '#f1c9dc'}
            onMouseLeave={e => e.target.style.color = '#ffffff'}
          >
            absstem.com
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;