// src/components/common/ProfileIcon.jsx
// Avatar + account menu. On mobile it opens as a BottomSheet titled "Account",
// mirroring the BookSlotModal pattern. On desktop it stays as a dropdown panel.
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import BottomSheet from './BottomSheet';
import useViewport from '../../hooks/useViewport';

const ProfileIcon = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);
  const { showToast } = useToast();
  const { setActiveTab, isAdmin, unreadNotificationsCount } = useApp();
  const { isMobile } = useViewport();

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      setUserName(name);
    }
  }, [user]);

  useEffect(() => {
    if (isMobile) return; // BottomSheet handles outside-tap itself
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showToast('Logged out successfully!', 'success');
      setShowDropdown(false);
      if (onLogout) onLogout();
    } catch (error) {
      showToast(error.message || 'Logout failed', 'error');
    }
  };

  const getInitials = () => userName.charAt(0).toUpperCase();

  const handleMyProfile = () => {
    setShowDropdown(false);
    setActiveTab('profile');
  };
  const handleNotifications = () => {
    setShowDropdown(false);
    setActiveTab('notifications');
  };
  const handleAdmin = () => {
    setShowDropdown(false);
    setActiveTab('admin');
  };
  const handleSettings = () => {
    setShowDropdown(false);
    setActiveTab('settings');
  };

  const accountContent = (
    <div>
      <div style={{ padding: '0 4px 12px 4px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-strong)' }}>
          {userName}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '2px' }}>
          {user?.email || 'Employee'}
        </div>
        {user?.user_metadata?.emp_id && (
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
            ID: {user.user_metadata.emp_id}
          </div>
        )}
      </div>

      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {isAdmin() && (
          <button
            type="button"
            onClick={handleAdmin}
            className="drawer-item"
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="drawer-item-icon" aria-hidden>🛡️</span>
            <span className="drawer-item-label">Admin</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleMyProfile}
          className="drawer-item"
          style={{ width: '100%', textAlign: 'left' }}
        >
          <span className="drawer-item-icon" aria-hidden>👤</span>
          <span className="drawer-item-label">My Profile</span>
        </button>
        <button
          type="button"
          onClick={handleNotifications}
          className="drawer-item"
          style={{ width: '100%', textAlign: 'left', position: 'relative' }}
        >
          <span className="drawer-item-icon" aria-hidden>🔔</span>
          <span className="drawer-item-label">Notifications</span>
          {unreadNotificationsCount > 0 && (
            <span style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--danger)',
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '10px',
              minWidth: '18px',
              textAlign: 'center'
            }}>
              {unreadNotificationsCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleSettings}
          className="drawer-item"
          style={{ width: '100%', textAlign: 'left' }}
        >
          <span className="drawer-item-icon" aria-hidden>⚙️</span>
          <span className="drawer-item-label">Settings</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setShowDropdown(false);
            setActiveTab('reports');
          }}
          className="drawer-item"
          style={{ width: '100%', textAlign: 'left' }}
        >
          <span className="drawer-item-icon" aria-hidden>📊</span>
          <span className="drawer-item-label">Reports</span>
        </button>
      </div>

      <div style={{ padding: '8px 4px 4px' }}>
        <ThemeToggle compact onAfterToggle={() => setShowDropdown(false)} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0 0', marginTop: '8px' }}>
        <button
          type="button"
          onClick={handleLogout}
          className="drawer-item drawer-item--danger"
          style={{ width: '100%', textAlign: 'left' }}
        >
          <LogOut size={16} strokeWidth={2} />
          <span className="drawer-item-label">Logout</span>
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          className="clay-soft"
          onClick={() => setShowDropdown(true)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--accent-soft)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--accent)',
            border: '1px solid var(--border)',
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          title={userName}
        >
          {getInitials()}
        </div>
        <BottomSheet
          open={showDropdown}
          onClose={() => setShowDropdown(false)}
          title="Account"
          icon="👤"
          ariaLabel="Account menu"
        >
          {accountContent}
        </BottomSheet>
      </>
    );
  }

  return (
    <div style={{ position: 'relative', zIndex: 9999 }} ref={dropdownRef}>
      <div
        className="clay-soft"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'var(--accent-soft)',
          fontWeight: 700,
          fontSize: '1rem',
          color: 'var(--accent)',
          border: '1px solid var(--border)',
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        title={userName}
      >
        {getInitials()}
      </div>

      {showDropdown && (
        <div
          className="clay"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            minWidth: '260px',
            padding: '12px 0',
            borderRadius: '24px',
            background: 'var(--bg-surface-strong)',
            backdropFilter: 'blur(14px)',
            boxShadow: 'var(--surface-shadow)',
            zIndex: 99999,
            border: '1px solid var(--border)',
          }}
        >
          {accountContent}
        </div>
      )}
    </div>
  );
};

export default ProfileIcon;
