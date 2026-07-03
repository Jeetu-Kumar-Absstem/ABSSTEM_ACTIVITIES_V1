// src/pages/ActivityPlanner.jsx
import React from 'react';
import Layout from '../components/layout/Layout';
import { useApp } from '../context/AppContext';
import DashboardPage from './DashboardPage';
import BookingGridPage from './BookingGridPage';
import GameMasterPage from './GameMasterPage';
import SlotMasterPage from './SlotMasterPage';
import RulesPage from './RulesPage';
import BanManagementPage from './BanManagementPage';
import ReportsPage from './ReportsPage';
import ProfilePage from './ProfilePage';

const ActivityPlanner = ({ user, onLogout }) => {
  const { activeTab } = useApp();

  const renderTab = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'booking': return <BookingGridPage />;
      case 'master': return <GameMasterPage />;
      case 'slots': return <SlotMasterPage />;
      case 'rules': return <RulesPage />;
      case 'bans': return <BanManagementPage />;
      case 'reports': return <ReportsPage />;
      case 'profile': return <ProfilePage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div style={{ paddingBottom: '20px' }}>
        {renderTab()}
      </div>
    </Layout>
  );
};

export default ActivityPlanner;
