// src/components/common/ProfileIcon.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { LogOut } from 'lucide-react';

const ProfileIcon = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);
  const { showToast } = useToast();
  const { setActiveTab } = useApp();

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

  const getInitials = () => {
    return userName.charAt(0).toUpperCase();
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
          background: 'rgba(26,60,110,0.1)',
          fontWeight: 600,
          fontSize: '1rem',
          color: '#1a3c6e',
          border: '2px solid rgba(26,60,110,0.2)',
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
            minWidth: '240px',
            padding: '12px 0',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            zIndex: 99999,
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid rgba(200,210,230,0.3)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e1e2f' }}>
              {userName}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#8888aa', marginTop: '2px' }}>
              {user?.email || 'Employee'}
            </div>
            {user?.user_metadata?.emp_id && (
              <div style={{ fontSize: '0.6rem', color: '#8888aa' }}>
                ID: {user.user_metadata.emp_id}
              </div>
            )}
          </div>

          <div style={{ padding: '4px 0' }}>
            <div
              onClick={() => {
                setShowDropdown(false);
                setActiveTab('profile');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                color: '#444466',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(26,60,110,0.05)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              👤 My Profile
            </div>
            <div
              onClick={() => {
                setShowDropdown(false);
                showToast('Settings coming soon!', 'info');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                color: '#444466',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(26,60,110,0.05)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              ⚙ Settings
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(200,210,230,0.3)', padding: '4px 0', marginTop: '4px' }}>
           <div
  onClick={handleLogout}
  style={{
    padding: '8px 16px',
    fontSize: '0.8rem',
    color: '#e53935',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.15s ease',
  }}
  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(229,57,53,0.05)')}
  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
