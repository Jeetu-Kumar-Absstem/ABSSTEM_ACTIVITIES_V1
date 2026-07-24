// src/components/common/ProfileIcon.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const ProfileIcon = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);
  const { showToast } = useToast();
  const { setActiveTab, isAdmin } = useApp();

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      setUserName(name);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const menuItemStyle = {
    padding: '8px 16px',
    fontSize: '0.8rem',
    color: 'var(--text-soft)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.15s ease',
  };

  const hoverIn = (event) => {
    event.currentTarget.style.background = 'var(--drawer-hover)';
  };

  const hoverOut = (event) => {
    event.currentTarget.style.background = 'transparent';
  };

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
          <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border)' }}>
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

          <div style={{ padding: '4px 0' }}>
            {isAdmin() && (
              <div
                onClick={() => {
                  setShowDropdown(false);
                  setActiveTab('admin');
                }}
                style={menuItemStyle}
                onMouseEnter={hoverIn}
                onMouseLeave={hoverOut}
              >
                🛡️ Admin
              </div>
            )}
            <div
              onClick={() => {
                setShowDropdown(false);
                setActiveTab('profile');
              }}
              style={menuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              👤 My Profile
            </div>
            <div
              onClick={() => {
                setShowDropdown(false);
                setActiveTab('settings');
              }}
              style={menuItemStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              ⚙ Settings
            </div>
          </div>

          <div style={{ padding: '8px 12px 0 12px' }}>
            <ThemeToggle compact onAfterToggle={() => setShowDropdown(false)} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0', marginTop: '8px' }}>
            <div
              onClick={handleLogout}
              style={{
                ...menuItemStyle,
                color: 'var(--danger)',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(229, 57, 53, 0.08)';
              }}
              onMouseLeave={hoverOut}
            >
              <LogOut size={16} strokeWidth={2} />
              <span>Logout</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileIcon;
