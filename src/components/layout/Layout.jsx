// src/components/layout/Layout.jsx
import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div style={{ 
      position: 'relative', 
      zIndex: 1,
      overflow: 'visible', // Important for dropdown visibility
    }}>
      <Topbar user={user} onLogout={onLogout} />
      <div style={{ 
        display: 'flex', 
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
    </div>
  );
};

export default Layout;