// src/components/layout/Sidebar.jsx
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

const SidebarItem = ({ icon, label, children, defaultOpen = false, onClick, active }) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen(!open);

  return (
    <div style={{ borderBottom: '1px solid rgba(200,210,230,0.3)' }}>
      <div onClick={onClick || toggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.75rem', fontWeight: 500, color: active ? '#1a3c6e' : '#444466', cursor: 'pointer', background: active ? 'rgba(26,60,110,0.05)' : 'transparent', borderRadius: '12px' }}>
        <span>{icon} {label}</span>
        {children && <span style={{ fontSize: '0.6rem', opacity: 0.6, transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>}
      </div>
      {children && open && <div style={{ paddingLeft: '8px' }}>{children}</div>}
    </div>
  );
};

const Sidebar = () => {
  const { activeTab, setActiveTab } = useApp();

  const tabs = [
    { id: 'booking', label: 'Booking Grid' },
    { id: 'master', label: 'Game Master' },
    { id: 'slots', label: 'Slot Master' },
    { id: 'rules', label: 'Rules' },
    { id: 'bans', label: 'Ban Management' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div className="clay" style={{ width: 200, flexShrink: 0, padding: '12px 8px', borderRadius: '32px', minHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      <SidebarItem icon="📊" label="Dashboard" />
      <SidebarItem icon="💼" label="Sales">
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Lead</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Quotation</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Sale Order</div>
      </SidebarItem>
      <SidebarItem icon="🧾" label="Invoice">
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Generate Invoice</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Invoice Report</div>
      </SidebarItem>
      <SidebarItem icon="🔧" label="Service">
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Service Tickets</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>AMC Master</div>
      </SidebarItem>
      <SidebarItem icon="✅" label="Tasks">
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>My Tasks</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>All Projects</div>
      </SidebarItem>
      <SidebarItem icon="🎓" label="Training">
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Dashboard</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Training Tracks</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Exam Bank</div>
      </SidebarItem>
      <SidebarItem icon="🎮" label="Activities" defaultOpen={true}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 8px 6px 24px',
              fontSize: '0.7rem',
              color: activeTab === tab.id ? '#1a3c6e' : '#666',
              cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(26,60,110,0.08)' : 'transparent',
              borderRadius: '12px',
              fontWeight: activeTab === tab.id ? 500 : 400,
              margin: '2px 0'
            }}
          >
            {tab.label}
          </div>
        ))}
      </SidebarItem>
      <SidebarItem icon="👤" label="HR">
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Employee</div>
        <div style={{ padding: '4px 0 4px 20px', fontSize: '0.7rem', color: '#666' }}>Training</div>
      </SidebarItem>
      <SidebarItem icon="⚙" label="Settings" />
    </div>
  );
};

export default Sidebar;