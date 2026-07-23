// src/components/layout/Layout.jsx
import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import useViewport from '../../hooks/useViewport';

import bgImage from "../../assets/bg_image_light.png";

const lufgaFontStyle = `
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Bold.otf') format('opentype');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'lufga-font-styles';
  let styleTag = document.getElementById(styleId);
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  // Always overwrite so all three weights are guaranteed to be registered
  styleTag.innerHTML = lufgaFontStyle;
}

const Layout = ({ children, user, onLogout }) => {
  const { isMobile, isTablet } = useViewport();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleSidebarToggle = useCallback((collapsed) => {
    setSidebarCollapsed(collapsed);
  }, []);

  // Close drawer on back/forward navigation
  useEffect(() => {
    const close = () => setDrawerOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  // Lock body scroll while drawer is open (mobile only)
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  // Calculate padding based on sidebar state
  const sidebarWidth = sidebarCollapsed ? 72 : 280;

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar overlay - always visible on desktop */}
      <Sidebar 
        user={user} 
        onLogout={onLogout}
        onToggle={handleSidebarToggle}
      />

      {/* Main content with dynamic padding to account for sidebar */}
      <div style={{ 
        marginLeft: `${sidebarWidth}px`,
        flex: 1,
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        width: `calc(100% - ${sidebarWidth}px)`,
      }}>
        <div className="app-body" style={{ flex: 1, padding: '24px' }}>
          <main
            className="app-main"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
              borderRadius: '24px',
              padding: '24px',
              minHeight: 'calc(100vh - 100px)',
            }}
          >
            <div className="app-main-inner">
              {children}
            </div>
          </main>
        </div>

        <footer className="app-footer" style={{
          padding: '16px 24px',
          textAlign: 'center',
          borderTop: '1px solid #e8edf5',
          marginTop: 'auto',
        }}>
          <p className="app-footer-copy" style={{ margin: 0, fontSize: '13px', color: '#ffffff', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            © {new Date().getFullYear()} Absstem Technologies. All rights reserved.
          </p>
          <div className="app-footer-links" style={{ marginTop: '4px', display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '12px', fontFamily: "'Lufga', sans-serif" }}>
            <a href="https://absstem.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#f4f4f7', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
            <span className="app-footer-sep" style={{ color: '#d0d5e0', fontWeight: 400 }}>|</span>
            <a href="https://absstem.com/terms-condition" target="_blank" rel="noopener noreferrer" style={{ color: '#fafafa', textDecoration: 'none', fontWeight: 600 }}>Terms & Conditions</a>
            <span className="app-footer-sep" style={{ color: '#d0d5e0', fontWeight: 400 }}>|</span>
            <a href="https://absstem.com" target="_blank" rel="noopener noreferrer" style={{ color: '#f3f3f6', textDecoration: 'none', fontWeight: 600 }}>absstem.com</a>
          </div>
        </footer>
      </div>

      {isMobile && (
        <MobileDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          user={user}
          onLogout={onLogout}
        />
      )}
    </div>
  );
};

export default Layout;