// src/pages/SettingsPage.jsx
import React from 'react';
import { useApp } from '../context/AppContext';
import ThemeToggle from '../components/common/ThemeToggle';

const SettingsPage = () => {
  const { currentUser, themeMode } = useApp();
  const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User';
  const isDark = themeMode === 'dark';

  const surfaceCard = {
    borderRadius: '28px',
    padding: '24px',
    background: 'var(--bg-surface-strong)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--surface-shadow-soft)',
    color: 'var(--text)',
  };

  return (
    <div style={{ display: 'grid', gap: '18px', color: 'var(--text)' }}>
      <div className="clay-card" style={surfaceCard}>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Settings
        </div>
        <h1 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: 'var(--text-strong)' }}>
          Appearance & Preferences
        </h1>
        <p style={{ marginTop: '10px', color: 'var(--text-soft)', maxWidth: '760px', lineHeight: 1.6 }}>
          Choose a light or dark appearance that keeps the dashboard readable and consistent across every page.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        <div className="clay-card" style={surfaceCard}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '8px' }}>Theme</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '12px' }}>
            {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
          </div>
          <ThemeToggle />
        </div>

        <div className="clay-card" style={surfaceCard}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '8px' }}>Profile</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)' }}>{userName}</div>
          <div style={{ marginTop: '6px', color: 'var(--text-soft)', fontSize: '0.9rem' }}>
            Theme selection is saved for this browser and reapplied the next time you open the app.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
