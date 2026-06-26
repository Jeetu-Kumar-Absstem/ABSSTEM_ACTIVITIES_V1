// src/App.jsx
import React from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import ActivityPlanner from './pages/ActivityPlanner';
import Toast from './components/common/Toast';

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ActivityPlanner />
        <Toast />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;