// src/components/layout/Sidebar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { LogOut } from 'lucide-react';

// 👇 Replace with your actual logo path
import absstemLogo from '/public/absstem_logo_with_name.png';

const BLUE_COLOR = {
  bg: '#080b5c',
  hoverBg: '#e8edf5',
  activeBg: '#080b5c',
  activeText: '#ffffff',
  text: '#1a1a2e',
  border: '#e8edf5',
};
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
    src: url('/fonts/Lufga-Bold.otf') format('opentype');
    font-weight: 700;
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
`;

// Inject font styles once into document head
if (typeof document !== 'undefined') {
  const styleId = 'lufga-font-styles';
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.innerHTML = lufgaFontStyle;
    document.head.appendChild(styleTag);
  }
}

const SidebarItem = ({ 
  icon, 
  label, 
  active = false, 
  onClick, 
  children, 
  defaultOpen = false,
  indent = false,
  collapsed = false
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const handleClick = () => {
    if (children && !collapsed) {
      setOpen(!open);
    }
    onClick && onClick();
  };

  if (collapsed) {
    return (
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
          margin: '2px 0',
          borderRadius: '12px',
          cursor: 'pointer',
          color: active ? BLUE_COLOR.activeText : BLUE_COLOR.text,
          backgroundColor: active ? BLUE_COLOR.activeBg : 'transparent',
          transition: 'all 0.2s ease',
          position: 'relative',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = BLUE_COLOR.hoverBg;
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title={label}
      >
        {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
      </div>
    );
  }

  return (
    <div className="sidebar-item-wrapper">
      <div
        onClick={handleClick}
        className={`sidebar-item ${active ? 'active' : ''} ${indent ? 'indent' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          margin: '2px 8px',
          borderRadius: '12px',
          cursor: 'pointer',
          color: active ? BLUE_COLOR.activeText : BLUE_COLOR.text,
          backgroundColor: active ? BLUE_COLOR.activeBg : 'transparent',
          transition: 'all 0.2s ease',
          fontSize: '14px',
          fontFamily: "'Lufga', sans-serif",
          fontWeight: active ? 700 : 400,
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = BLUE_COLOR.hoverBg;
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {icon && <span style={{ fontSize: '18px', width: '24px', flexShrink: 0 }}>{icon}</span>}
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{label}</span>
        {children && (
          <span style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease',
            fontSize: '12px',
            color: active ? BLUE_COLOR.activeText : BLUE_COLOR.text,
            opacity: 0.6,
          }}>▶</span>
        )}
      </div>
      {children && open && !collapsed && (
        <div style={{ paddingLeft: '8px' }}>
          {React.Children.map(children, child => 
            React.cloneElement(child, { collapsed: false })
          )}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ defaultCollapsed = false, user: propUser, onLogout, onToggle }) => {
  const { activeTab, setActiveTab, isAdmin, currentUser } = useApp();
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

  // Get user data from props or context
  const user = propUser || currentUser;
  
  // Get user details from user metadata
  const getUserName = () => {
    if (!user) return 'User';
    return user.user_metadata?.name || 
           user.name || 
           user.email?.split('@')[0] || 
           'User';
  };

  const getUserEmail = () => {
    if (!user) return 'user@absstem.com';
    return user.email || 'user@absstem.com';
  };

  const getUserId = () => {
    if (!user) return 'N/A';
    return user.user_metadata?.emp_id || 
           user.user_metadata?.employee_code || 
           user.user_metadata?.empId || 
           user.id?.slice(0, 8) || 
           'N/A';
  };

  const getUserInitials = () => {
    const name = getUserName();
    if (!name || name === 'User') return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const userName = getUserName();
  const userEmail = getUserEmail();
  const userId = getUserId();
  const userInitials = getUserInitials();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent when collapsed state changes
  const handleToggle = (newState) => {
    setCollapsed(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  // Handle profile click - toggle dropdown
  const handleProfileClick = () => {
    setShowDropdown(!showDropdown);
  };

  // Handle navigation items
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
    // Show toast or navigate to settings
    console.log('Settings clicked');
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
        backgroundColor: '#ffffff',
        zIndex: 9999,
        padding: collapsed ? '16px 8px' : '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 20px rgba(0,0,0,0.08)',
        borderRight: '1px solid #e8edf5',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 0 16px 0' : '0 8px 20px 8px',
          borderBottom: '1px solid #e8edf5',
          marginBottom: '16px',
          transition: 'all 0.3s ease',
        }}
      >
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={absstemLogo}
                alt="Absstem Arena"
                style={{
                  height: '40px',
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <span style={{
                color: BLUE_COLOR.bg,
                fontSize: '18px',
                fontFamily: "'Lufga', sans-serif",
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}>
                ARENA
              </span>
            </div>
            <button
              onClick={() => handleToggle(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: BLUE_COLOR.bg,
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px 8px',
                opacity: 0.6,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              ◀
            </button>
          </>
        ) : (
          <button
            onClick={() => handleToggle(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: BLUE_COLOR.bg,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              opacity: 0.6,
              transition: 'opacity 0.2s',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            ▶
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <div style={{ flex: 1 }}>
        <SidebarItem
          icon="📊"
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
          collapsed={collapsed}
        />

        <SidebarItem
          icon="🎮"
          label="Activities"
          defaultOpen={true}
          collapsed={collapsed}
        >
          {tabs.map(tab => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              indent={true}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              collapsed={collapsed}
            />
          ))}
        </SidebarItem>

        <SidebarItem
          icon="🎉"
          label="Events"
          defaultOpen={true}
          collapsed={collapsed}
        >
          {eventTabs.map(tab => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              indent={true}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              collapsed={collapsed}
            />
          ))}
        </SidebarItem>

      </div>

      {/* Profile Section - With Dropdown */}
      <div
        style={{
          borderTop: '1px solid #e8edf5',
          paddingTop: '16px',
          marginTop: 'auto',
          transition: 'all 0.3s ease',
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
                backgroundColor: '#f8f9fc',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e8edf5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fc';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: BLUE_COLOR.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: "'Lufga', sans-serif",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  color: BLUE_COLOR.text, 
                  fontSize: '13px',
                  fontFamily: "'Lufga', sans-serif",
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {userName}
                </div>
                <div style={{ 
                  color: '#8a8aa8', 
                  fontSize: '11px',
                  fontFamily: "'Lufga', sans-serif",
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {userEmail}
                </div>
              </div>
              <span style={{ 
                fontSize: '12px', 
                color: '#8a8aa8',
                transition: 'transform 0.2s ease',
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                ▼
              </span>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  padding: '8px 0',
                  border: '1px solid #e8edf5',
                  zIndex: 10000,
                  animation: 'slideUp 0.2s ease',
                }}
              >
                {/* User Info */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e8edf5',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 700,
                      fontSize: '14px',
                      color: '#1a1a2e',
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
                      color: '#8a8aa8',
                    }}
                  >
                    {userEmail}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8a8aa8',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      marginTop: '2px',
                    }}
                  >
                    ID: {userId}
                  </div>
                </div>

                {/* Menu Items */}
                <div style={{ padding: '4px 0' }}>
                  {isAdmin && isAdmin() && (
                    <div
                      onClick={handleAdmin}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        fontFamily: "'Lufga', sans-serif",
                        fontWeight: 400,
                        color: '#444466',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,60,110,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      🛡️ Admin
                    </div>
                  )}
                  <div
                    onClick={handleMyProfile}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      color: '#444466',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,60,110,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    👤 My Profile
                  </div>
                  <div
                    onClick={handleSettings}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      color: '#444466',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,60,110,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ⚙ Settings
                  </div>
                </div>

                {/* Logout */}
                <div style={{ borderTop: '1px solid rgba(200,210,230,0.3)', padding: '4px 0', marginTop: '4px' }}>
                  <div
                    onClick={onLogout}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      color: '#e53935',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(229,57,53,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BLUE_COLOR.hoverBg;
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
                backgroundColor: BLUE_COLOR.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
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