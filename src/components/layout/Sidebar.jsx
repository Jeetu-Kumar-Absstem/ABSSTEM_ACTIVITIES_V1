// src/components/layout/Sidebar.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';

const TAB_COLORS = {
  booking:    { bg: '#080b5c', shadow: 'rgba(34,197,94,0.35)',   waves: ['#7e79cf', '#4d29df', '#36097d'] },
  master:     { bg: '#d68b09', shadow: 'rgba(245,158,11,0.35)',  waves: ['#fde68a', '#fbbf24', '#f59e0b'] },
  slots:      { bg: '#da1d1d', shadow: 'rgba(239,68,68,0.35)',   waves: ['#fca5a5', '#f87171', '#ef4444'] },
  rules:      { bg: '#cf2379', shadow: 'rgba(236,72,153,0.35)',  waves: ['#f9a8d4', '#f472b6', '#ec4899'] },
  bans:       { bg: '#551ed4', shadow: 'rgba(139,92,246,0.35)',  waves: ['#c4b5fd', '#a78bfa', '#8b5cf6'] },
  reports:    { bg: '#0f96ad', shadow: 'rgba(6,182,212,0.35)',   waves: ['#67e8f9', '#22d3ee', '#06b6d4'] },
  // Events subsection
  eventsCalendar: { bg: '#0f3a7a', shadow: 'rgba(26,60,110,0.35)', waves: ['#93b4e0', '#4a7bbf', '#1a3c6e'] },
  tournaments:    { bg: '#b8860b', shadow: 'rgba(184,134,11,0.35)', waves: ['#fde68a', '#fbbf24', '#b8860b'] },
  leaderboard:    { bg: '#6a1b9a', shadow: 'rgba(106,27,154,0.35)', waves: ['#c4b5fd', '#a78bfa', '#6a1b9a'] },
  // SidebarItem headers
  dashboard:  { bg: '#0f3a7a', shadow: 'rgba(26,60,110,0.35)',   waves: ['#93b4e0', '#4a7bbf', '#1a3c6e'] },
  activities: { bg: '#055952', shadow: 'rgba(15,118,110,0.35)',  waves: ['#5eead4', '#2dd4bf', '#0f766e'] },
  events:     { bg: '#7c2d12', shadow: 'rgba(124,45,18,0.35)',   waves: ['#fed7aa', '#fb923c', '#7c2d12'] },
};

const TAB_ICONS = {
  booking: '🎯',
  master:  '🎮',
  slots:   '⏰',
  rules:   '📜',
  bans:    '🚫',
  eventsCalendar: '📅',
  tournaments:    '🏆',
  leaderboard:    '🥇',
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildPath(progress, waveAmp, phaseOffset) {
  const p     = easeInOutCubic(Math.min(1, Math.max(0, progress)));
  const baseY = 100 - p * 100;
  const amp   = waveAmp * Math.sin(p * Math.PI);
  const cp1Y  = baseY - amp + phaseOffset;
  const cp2Y  = baseY + amp * 0.5 + phaseOffset;
  return `M 0 100 C 25 ${cp1Y} 75 ${cp2Y} 100 ${baseY} V 100 H 0`;
}

const WAVE_AMP   = [24, 20, 16];
const WAVE_PHASE = [0, -6, 6];
const DURATION   = 520;
const STAGGER    = 90;

// ── Shared fluid animation hook ──────────────────────────────────
function usePillAnim({ active, onFilled, onIdle }) {
  const [phase, setPhase] = useState(active ? 'filled' : 'idle');
  const rafRef      = useRef(null);
  const pathRefs    = useRef([null, null, null]);
  const prevActive  = useRef(active);

  const runLoop = useCallback((dir, onDone) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = (ts) => {
      if (!step.start) step.start = ts;
      const elapsed = ts - step.start;
      let allDone = true;
      pathRefs.current.forEach((el, i) => {
        if (!el) return;
        const t        = Math.min(1, Math.max(0, elapsed - i * STAGGER) / DURATION);
        const progress = dir === 'in' ? t : 1 - t;
        el.setAttribute('d', buildPath(progress, WAVE_AMP[i], WAVE_PHASE[i]));
        if (t < 1) allDone = false;
      });
      if (!allDone) { rafRef.current = requestAnimationFrame(step); }
      else          { rafRef.current = null; onDone && onDone(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (phase === 'animating-in') {
      pathRefs.current.forEach((el, i) => {
        if (el) el.setAttribute('d', buildPath(0, WAVE_AMP[i], WAVE_PHASE[i]));
      });
      runLoop('in', () => { setPhase('filled'); onFilled && onFilled(); });
    }
    if (phase === 'animating-out') {
      pathRefs.current.forEach((el, i) => {
        if (el) el.setAttribute('d', buildPath(1, WAVE_AMP[i], WAVE_PHASE[i]));
      });
      runLoop('out', () => { setPhase('idle'); onIdle && onIdle(); });
    }
  }, [phase]);

  useEffect(() => {
    const was = prevActive.current;
    prevActive.current = active;
    if (!was && active)  { if (rafRef.current) cancelAnimationFrame(rafRef.current); setPhase('filled'); }
    if (was  && !active) { if (rafRef.current) cancelAnimationFrame(rafRef.current); setPhase('animating-out'); }
  }, [active]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const handleMouseEnter = (isActive) => {
    if (isActive) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('animating-in');
  };
  const handleMouseLeave = (isActive) => {
    if (isActive) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase('animating-out');
  };

  return { phase, pathRefs, handleMouseEnter, handleMouseLeave };
}

// ── Reusable pill wave renderer ──────────────────────────────────
const PillWaveSVG = ({ waves, pathRefs }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%',
      zIndex: 0, pointerEvents: 'none',
    }}
  >
    {waves.map((fill, i) => (
      <path
        key={i}
        ref={el => { pathRefs.current[i] = el; }}
        fill={fill}
        d={buildPath(0, WAVE_AMP[i], WAVE_PHASE[i])}
      />
    ))}
  </svg>
);

// ── Tab pill buttons (sub-items) ─────────────────────────────────
const PillButton = ({ tabId, label, active, onClick, collapsed }) => {
  const { bg, shadow, waves } = TAB_COLORS[tabId] || {
    bg: '#888', shadow: 'rgba(136,136,136,0.3)', waves: ['#aaa', '#888', '#666'],
  };
  const { phase, pathRefs, handleMouseEnter, handleMouseLeave } = usePillAnim({ active });

  const showSVG   = phase === 'animating-in' || phase === 'animating-out';
  const solidFill = phase === 'filled';
  const isHL      = phase !== 'idle';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => handleMouseEnter(active)}
      onMouseLeave={() => handleMouseLeave(active)}
      title={collapsed ? label : undefined}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: collapsed ? '9px 6px' : '9px 16px',
        margin: '4px 6px', width: 'calc(100% - 12px)',
        backgroundColor: solidFill ? bg : 'transparent',
        border: `2px solid ${isHL ? bg : 'rgba(200,210,230,0.5)'}`,
        borderRadius: '100px', cursor: 'pointer',
        boxShadow: active
          ? `0 4px 14px ${shadow}, 0 1px 3px rgba(0,0,0,0.08)`
          : isHL ? `0 2px 10px ${shadow}` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'border-color 0.15s ease, box-shadow 0.2s ease, padding 0.2s ease',
      }}
    >
      {showSVG && <PillWaveSVG waves={waves} pathRefs={pathRefs} />}
      <span style={{
        display: 'block', position: 'relative', zIndex: 1,
        color: solidFill ? '#fff' : isHL ? '#000' : '#555',
        fontFamily: '"Aeonik Pro", Arial, sans-serif',
        fontWeight: 700, fontSize: 'clamp(11px, 0.72vw, 13px)',
        lineHeight: '120%', textAlign: 'center', letterSpacing: '0.01em',
        transition: 'color 0.1s ease, opacity 0.2s ease',
        whiteSpace: 'nowrap', userSelect: 'none',
        opacity: collapsed ? 0 : 1,
        width: collapsed ? 0 : 'auto',
        overflow: 'hidden',
      }}>
        {label}
      </span>
      {collapsed && (
        <span style={{
          position: 'relative', zIndex: 1,
          color: solidFill ? '#fff' : isHL ? '#000' : '#555',
          fontSize: '1.05rem',
          opacity: collapsed ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }} aria-hidden>
          {TAB_ICONS[tabId] || '•'}
        </span>
      )}
    </div>
  );
};

// ── SidebarItem — now also a pill wave button for the header ─────
const SidebarItem = ({ colorId, icon, label, children, defaultOpen = false, active, onClick, collapsed }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { bg, shadow, waves } = TAB_COLORS[colorId] || TAB_COLORS.dashboard;

  const { phase, pathRefs, handleMouseEnter, handleMouseLeave } = usePillAnim({ active: active || false });

  const showSVG   = phase === 'animating-in' || phase === 'animating-out';
  const solidFill = phase === 'filled';
  const isHL      = phase !== 'idle';

  const handleClick = () => {
    onClick && onClick();
    if (children && !collapsed) setOpen(o => !o);
  };

  return (
    <div style={{ marginBottom: '4px' }}>
      {/* Header pill */}
      <div
        onClick={handleClick}
        onMouseEnter={() => handleMouseEnter(active || false)}
        onMouseLeave={() => handleMouseLeave(active || false)}
        title={collapsed ? label : undefined}
        aria-label={label}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
          position: 'relative', overflow: 'hidden',
          padding: collapsed ? '10px 6px' : '10px 16px',
          margin: '0 6px',
          backgroundColor: solidFill ? bg : 'transparent',
          border: `2px solid ${isHL ? bg : 'rgba(200,210,230,0.5)'}`,
          borderRadius: '100px', cursor: 'pointer',
          boxShadow: solidFill
            ? `0 4px 14px ${shadow}, 0 1px 3px rgba(0,0,0,0.08)`
            : isHL ? `0 2px 10px ${shadow}` : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'border-color 0.15s ease, box-shadow 0.2s ease, padding 0.2s ease',
        }}
      >
        {showSVG && <PillWaveSVG waves={waves} pathRefs={pathRefs} />}
        <span style={{
          position: 'relative', zIndex: 1,
          fontSize: '0.75rem', fontWeight: 700,
          fontFamily: '"Aeonik Pro", Arial, sans-serif',
          color: solidFill ? '#fff' : isHL ? '#000' : '#444466',
          transition: 'color 0.1s ease, opacity 0.2s ease', userSelect: 'none',
          display: 'flex', alignItems: 'center', gap: '6px',
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : 'auto',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          {icon} {label}
        </span>
        {children && !collapsed && (
          <span style={{
            position: 'relative', zIndex: 1,
            fontSize: '0.6rem',
            color: solidFill ? '#fff' : isHL ? '#000' : '#888',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease, color 0.1s ease',
            userSelect: 'none',
          }}>▶</span>
        )}
      </div>

      {/* Children sub-items */}
      {children && open && !collapsed && (
        <div style={{ paddingLeft: '4px', paddingBottom: '4px', marginTop: '2px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Sidebar ──────────────────────────────────────────────────────
const Sidebar = ({ defaultCollapsed = false }) => {
  const { activeTab, setActiveTab } = useApp();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const tabs = [
    { id: 'booking', label: 'Book Slots' },
    { id: 'master',  label: 'Game Master'  },
    { id: 'slots',   label: 'Slot Master'  },
    { id: 'rules',   label: 'Rules'        },
    { id: 'bans',    label: 'Ban Management' },
    // { id: 'reports', label: 'Reports'      },
  ];

  const eventTabs = [
    { id: 'eventsCalendar', label: 'Events Calendar' },
    { id: 'tournaments',    label: 'Tournaments'     },
    { id: 'leaderboard',    label: 'Leaderboard'     },
  ];

  return (
    <div
      className="clay sidebar-clay"
      style={{
        width: collapsed ? 64 : 200,
        flexShrink: 0, padding: '12px 8px',
        borderRadius: '32px', minHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '4px',
        transition: 'width 0.25s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {/* Collapse toggle */}
      <button
        type="button"
        className="sidebar-collapse-btn"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span style={{
          display: 'inline-block',
          transform: collapsed ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
        }}>›</span>
        {!collapsed && <span style={{ marginLeft: 8, fontSize: '0.7rem' }}>Collapse</span>}
      </button>

      <SidebarItem
        colorId="dashboard"
        icon="📊"
        label="Dashboard"
        active={activeTab === 'dashboard'}
        onClick={() => setActiveTab('dashboard')}
        collapsed={collapsed}
      />
      <SidebarItem
        colorId="activities"
        icon="🎮"
        label="Activities"
        defaultOpen={true}
        collapsed={collapsed}
      >
        {tabs.map(tab => (
          <PillButton
            key={tab.id}
            tabId={tab.id}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            collapsed={collapsed}
          />
        ))}
      </SidebarItem>
      <SidebarItem
        colorId="events"
        icon="🎉"
        label="Events"
        defaultOpen={true}
        collapsed={collapsed}
      >
        {eventTabs.map(tab => (
          <PillButton
            key={tab.id}
            tabId={tab.id}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            collapsed={collapsed}
          />
        ))}
      </SidebarItem>
    </div>
  );
};

export default Sidebar;
