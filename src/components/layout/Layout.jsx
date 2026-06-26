// src/components/layout/Layout.jsx
import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div>
      <Topbar />
      <div style={{ display: 'flex', gap: '20px' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;