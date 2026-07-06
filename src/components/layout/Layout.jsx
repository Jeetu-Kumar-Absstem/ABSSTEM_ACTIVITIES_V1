// src/components/layout/Layout.jsx
import React, { useEffect, useState, useCallback } from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import useViewport from '../../hooks/useViewport';

const Layout = ({ children, user, onLogout }) => {
  const { isMobile, isTablet } = useViewport();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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

  return (
    <div className="app-shell">
      <Topbar
        user={user}
        onLogout={onLogout}
        onOpenDrawer={openDrawer}
        showHamburger={isMobile}
      />

      <div className="app-body">
        <aside className="app-sidebar">
          <Sidebar defaultCollapsed={isTablet} />
        </aside>

        <main className="app-main">
          <div className="app-main-inner">
            {children}
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <p className="app-footer-copy">
          © {new Date().getFullYear()} Absstem Technologies. All rights reserved.
        </p>
        <div className="app-footer-links">
          <a href="https://absstem.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span className="app-footer-sep">|</span>
          <a href="https://absstem.com/terms-condition" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>
          <span className="app-footer-sep">|</span>
          <a href="https://absstem.com" target="_blank" rel="noopener noreferrer">absstem.com</a>
        </div>
      </footer>

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
