// src/components/layout/Sidebar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LogOut } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

import absstemLightLogo from '../../assets/absstem_game_light_logo.png';
import absstemDarkLogo from '../../assets/absstem_game_dark_logo.png';

const SidebarItem = ({
  icon,
  label,
  active = false,
  onClick,
  children,
  defaultOpen = false,
  indent = false,
  collapsed = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const handleClick = () => {
    if (children && !collapsed) {
      setOpen((value) => !value);
    }
    if (onClick) onClick();
  };

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: collapsed ? '10px' : indent ? '10px 16px 10px 28px' : '10px 16px',
    margin: collapsed ? '2px 0' : '2px 8px',
    borderRadius: '12px',
    cursor: 'pointer',
    color: active ? 'var(--accent-contrast)' : 'var(--text)',
    background: active ? 'var(--accent)' : 'transparent',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontFamily: "'Lufga', sans-serif",
    fontWeight: active ? 700 : 400,
    position: 'relative',
  };

  return (
    <div className="sidebar-item-wrapper">
      <div
        onClick={handleClick}
        className={`sidebar-item ${active ? 'active' : ''} ${indent ? 'indent' : ''}`}
        style={baseStyle}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'var(--accent-soft)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {icon && <span style={{ fontSize: collapsed ? '20px' : '18px', width: collapsed ? 'auto' : '24px', flexShrink: 0 }}>{icon}</span>}
        {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{label}</span>}
        {children && !collapsed && (
          <span style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease',
            fontSize: '12px',
            color: active ? 'var(--accent-contrast)' : 'var(--text)',
            opacity: 0.6,
          }}>▶</span>
        )}
      </div>
      {children && open && !collapsed && (
        <div style={{ paddingLeft: '8px' }}>
          {React.Children.map(children, (child) => React.cloneElement(child, { collapsed: false }))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ defaultCollapsed = false, user: propUser, onLogout, onToggle }) => {
  const { activeTab, setActiveTab, isAdmin, currentUser, themeMode } = useApp();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const tabs = [
    { id: 'booking', label: 'Book Slots' },
    { id: 'master', label: 'Game Master' },
    { id: 'slots', label: 'Slot Master' },
    { id: 'rules', label: 'Rules' },
    { id: 'bans', label: 'Ban Management' },
  ];

  const eventTabs = [
    { id: 'eventsCalendar', label: 'Events Calendar' },
    { id: 'tournaments', label: 'Tournaments' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ];

  const user = propUser || currentUser;
  const logoSrc = themeMode === 'dark' ? absstemDarkLogo : absstemLightLogo;

  const getUserName = () =>
    user?.user_metadata?.name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const getUserEmail = () => user?.email || 'user@absstem.com';
  const getUserId = () =>
    user?.user_metadata?.emp_id ||
    user?.user_metadata?.employee_code ||
    user?.user_metadata?.empId ||
    user?.id?.slice(0, 8) ||
    'N/A';
  const getUserInitials = () => getUserName().split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const userName = getUserName();
  const userEmail = getUserEmail();
  const userId = getUserId();
  const userInitials = getUserInitials();
  const menuItemStyle = {
    padding: '8px 16px',
    fontSize: '0.8rem',
    fontFamily: "'Lufga', sans-serif",
    fontWeight: 400,
    color: 'var(--text-soft)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.15s ease',
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (newState) => {
    setCollapsed(newState);
    if (onToggle) onToggle(newState);
  };

  const handleProfileClick = () => setShowDropdown((value) => !value);
  const handleMyProfile = () => {
    setShowDropdown(false);
    setActiveTab('profile');
  };
  const handleAdmin = () => {
    setShowDropdown(false);
    setActiveTab('admin');
  };
  const handleSettings = () => {
    setShowDropdown(false);
    setActiveTab('settings');
  };

  return (
    <div
      className={collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: collapsed ? '72px' : '280px',
        backgroundColor: 'var(--bg-surface-strong)',
        zIndex: 9999,
        padding: collapsed ? '16px 8px' : '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--surface-shadow)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 0 16px 0' : '0 8px 20px 8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '16px',
          gap: collapsed ? '8px' : '0',
        }}
      >
        {!collapsed ? (
          <>
            <img
              src={logoSrc}
              alt="Absstem Arena"
              style={{ height: '50px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={() => handleToggle(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px 8px',
                opacity: 0.7,
              }}
            >
              ◀
            </button>
          </>
        ) : (
          <>
            <img
              src={logoSrc}
              alt="Absstem Arena"
              style={{ height: '40px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={() => handleToggle(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Expand sidebar"
            >
              ▶
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <SidebarItem
          icon="📊"
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          collapsed={collapsed}
        />

        <SidebarItem icon="🎮" label="Activities" defaultOpen collapsed={collapsed}>
          {tabs.map((tab) => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              indent
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              collapsed={collapsed}
            />
          ))}
        </SidebarItem>

        <SidebarItem icon="🎉" label="Events" defaultOpen collapsed={collapsed}>
          {eventTabs.map((tab) => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              indent
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              collapsed={collapsed}
            />
          ))}
        </SidebarItem>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          marginTop: 'auto',
          position: 'relative',
        }}
        ref={dropdownRef}
      >
        {!collapsed ? (
          <>
            <div
              onClick={handleProfileClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-muted)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-contrast)',
                  fontSize: '14px',
                  fontFamily: "'Lufga', sans-serif",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontFamily: "'Lufga', sans-serif",
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userName}
                </div>
                <div
                  style={{
                    color: 'var(--muted)',
                    fontSize: '11px',
                    fontFamily: "'Lufga', sans-serif",
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userEmail}
                </div>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  transition: 'transform 0.2s ease',
                  transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </div>

            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-surface-strong)',
                  borderRadius: '12px',
                  boxShadow: 'var(--surface-shadow)',
                  padding: '8px 0',
                  border: '1px solid var(--border)',
                  zIndex: 10000,
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 700,
                      fontSize: '14px',
                      color: 'var(--text-strong)',
                      marginBottom: '2px',
                    }}
                  >
                    {userName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      color: 'var(--muted)',
                    }}
                  >
                    {userEmail}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      marginTop: '2px',
                    }}
                  >
                    ID: {userId}
                  </div>
                </div>

                <div style={{ padding: '4px 0' }}>
                  {isAdmin && isAdmin() && (
                    <div
                      onClick={handleAdmin}
                      style={menuItemStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--drawer-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      🛡️ Admin
                    </div>
                  )}
                  <div
                    onClick={handleMyProfile}
                    style={menuItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--drawer-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    👤 My Profile
                  </div>
                  <div
                    onClick={handleSettings}
                    style={menuItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--drawer-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    ⚙ Settings
                  </div>
                </div>

                <div style={{ padding: '8px 12px 4px 12px' }}>
                  <ThemeToggle compact onAfterToggle={() => setShowDropdown(false)} />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0', marginTop: '8px' }}>
                  <div
                    onClick={onLogout}
                    style={{
                      ...menuItemStyle,
                      color: 'var(--danger)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(229, 57, 53, 0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} strokeWidth={2} />
                    <span>Logout</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            onClick={handleProfileClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0',
              cursor: 'pointer',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-contrast)',
                fontSize: '14px',
                fontWeight: 700,
                flexShrink: 0,
              }}
              title={userName}
            >
              {userInitials}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;