import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ThemeToggle = ({ compact = false, className = '', onAfterToggle }) => {
  const { themeMode, toggleTheme } = useApp();
  const isDark = themeMode === 'dark';

  const handleToggle = () => {
    toggleTheme();
    if (onAfterToggle) onAfterToggle();
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: compact ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: compact ? '10px 14px' : '10px 16px',
        borderRadius: compact ? '14px' : '999px',
        border: '1px solid var(--border)',
        background: 'var(--bg-muted)',
        color: 'var(--text)',
        cursor: 'pointer',
        boxShadow: 'var(--surface-shadow-soft)',
        font: 'inherit',
        transition: 'transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.background = 'var(--bg-surface-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'var(--bg-muted)';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: compact ? '0.8rem' : '0.9rem', fontWeight: 600 }}>
        {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
        <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
      </span>
      <span
        aria-hidden="true"
        style={{
          width: '42px',
          height: '24px',
          borderRadius: '999px',
          padding: '3px',
          background: isDark ? 'rgba(111, 156, 255, 0.28)' : 'rgba(26, 60, 110, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isDark ? 'flex-end' : 'flex-start',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: isDark ? 'var(--accent-contrast)' : 'var(--accent)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
          }}
        />
      </span>
    </button>
  );
};

export default ThemeToggle;
