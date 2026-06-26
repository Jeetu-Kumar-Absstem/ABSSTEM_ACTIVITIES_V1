// src/pages/ActivityPlanner.jsx
import React from 'react';
import Layout from '../components/layout/Layout';
import { useApp } from '../context/AppContext';
import BookingGridPage from './BookingGridPage';
import GameMasterPage from './GameMasterPage';
import SlotMasterPage from './SlotMasterPage';
import RulesPage from './RulesPage';
import BanManagementPage from './BanManagementPage';
import ReportsPage from './ReportsPage';

const ActivityPlanner = () => {
  const { activeTab } = useApp();

  const renderTab = () => {
    switch(activeTab) {
      case 'booking': return <BookingGridPage />;
      case 'master': return <GameMasterPage />;
      case 'slots': return <SlotMasterPage />;
      case 'rules': return <RulesPage />;
      case 'bans': return <BanManagementPage />;
      case 'reports': return <ReportsPage />;
      default: return <BookingGridPage />;
    }
  };

  return (
    <Layout>
      <div style={{ paddingBottom: '20px' }}>
        {renderTab()}
      </div>
    </Layout>
  );
};

export default ActivityPlanner;