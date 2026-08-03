// src/components/layout/Layout.jsx
import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import BottomNav from './BottomNav';
import ProfileIcon from '../common/ProfileIcon';
import useViewport from '../../hooks/useViewport';
import { useApp } from '../../context/AppContext';

import bgImageLight from '../../assets/bg_image_light.png';
import bgImageDark from '../../assets/bg_image_dark.png';

const TAB_TITLES = {
  dashboard: 'Dashboard',
  booking: 'Book Slots',
  master: 'Game Master',
  slots: 'Slot Master',
  rules: 'Rules',
  bans: 'Ban Management',
  reports: 'Reports',
  profile: 'Profile',
  admin: 'Admin',
  settings: 'Settings',
  eventsCalendar: 'Events',
  tournaments: 'Tournaments',
  leaderboard: 'Leaderboard',
};

const Layout = ({ children, user, onLogout }) => {
  const { isMobile, isDesktop } = useViewport();
  const { activeTab, themeMode } = useApp();
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
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Calculate padding based on sidebar state (desktop only)
  const sidebarWidth = sidebarCollapsed ? 72 : 280;
  const shellBgImage = themeMode === 'dark' ? bgImageDark : bgImageLight;
  const pageTitle = TAB_TITLES[activeTab] || 'Absstem';

  // ── MOBILE/TABLET SHELL: top app bar + content + bottom nav ─────────
  if (!isDesktop) {
    return (
      <div className="app-shell" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top app bar */}
        <header className="app-topbar-mobile" role="banner">
          <button
            type="button"
            aria-label="Open navigation"
            className="hamburger-btn"
            onClick={openDrawer}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <h1 className="app-topbar-title">{pageTitle}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <ProfileIcon user={user} onLogout={onLogout} />
          </div>
        </header>

        {/* Page content */}
        <div className="app-body" style={{ flex: 1, minHeight: 0 }}>
          <main
            className="app-main"
            style={{ color: 'var(--text)' }}
          >
            <div className="app-main-inner">{children}</div>
          </main>
        </div>

        {/* Bottom nav */}
        <BottomNav />

        {/* Drawer (hamburger) */}
        <MobileDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          user={user}
          onLogout={onLogout}
        />
      </div>
    );
  }

  // ── DESKTOP SHELL: sidebar + content (unchanged behaviour) ──────────
  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        user={user}
        onLogout={onLogout}
        onToggle={handleSidebarToggle}
      />

      <div
        style={{
          marginLeft: `${sidebarWidth}px`,
          flex: 1,
          minHeight: '100vh',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <div className="app-body" style={{ flex: 1, padding: '24px' }}>
          <main
            className="app-main"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(3, 8, 18, 0.08), rgba(3, 8, 18, 0.18)), url(${shellBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
              borderRadius: '24px',
              padding: '24px',
              minHeight: 'calc(100vh - 100px)',
              color: 'var(--text)',
            }}
          >
            <div className="app-main-inner">{children}</div>
          </main>
        </div>

        <footer
          className="app-footer"
          style={{
            padding: '16px 24px',
            textAlign: 'center',
            borderTop: '1px solid var(--border)',
            marginTop: 'auto',
          }}
        >
          <p
            className="app-footer-copy"
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 400,
            }}
          >
            © {new Date().getFullYear()} Absstem Technologies. All rights reserved.
          </p>
          <div
            className="app-footer-links"
            style={{
              marginTop: '4px',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            <a
              href="https://absstem.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4da6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            >
              Privacy Policy
            </a>
            <span className="app-footer-sep" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              |
            </span>
            <a
              href="https://absstem.com/terms-condition"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4da6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            >
              Terms &amp; Conditions
            </a>
            <span className="app-footer-sep" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              |
            </span>
            <a
              href="https://absstem.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4da6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            >
              absstem.com
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;