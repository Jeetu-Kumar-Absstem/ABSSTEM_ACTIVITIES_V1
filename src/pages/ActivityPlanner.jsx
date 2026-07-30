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
import AdminPage from './AdminPage';
import SettingsPage from './SettingsPage';
import EventsCalendarPage from './EventsCalendarPage';
import TournamentsPage from './TournamentsPage';
import LeaderboardPage from './LeaderboardPage';
import NotificationsPage from './NotificationsPage';
import CreateNotificationPage from './CreateNotificationPage';

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
      case 'admin': return <AdminPage />;
      case 'settings': return <SettingsPage />;
      case 'eventsCalendar': return <EventsCalendarPage />;
      case 'tournaments': return <TournamentsPage />;
      case 'leaderboard': return <LeaderboardPage />;
      case 'notifications': return <NotificationsPage />;
      case 'create-notification': return <CreateNotificationPage />;
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
