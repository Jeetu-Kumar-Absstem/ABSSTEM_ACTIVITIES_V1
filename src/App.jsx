// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import ActivityPlanner from './pages/ActivityPlanner';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Toast from './components/common/Toast';
import { supabase } from './utils/supabase';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !session.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setUser(null);
      } else {
        setUser(session?.user || null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Let ResetPasswordPage handle it
        return;
      }

      if (event === 'SIGNED_IN' && session?.user && !session.user.email_confirmed_at) {
        // Keep unconfirmed registrations off the main app
        supabase.auth.signOut();
        setUser(null);
        return;
      }

      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => setUser(null);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#eef0f4',
      }}>
        <div className="clay" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '0.9rem', color: '#444466' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppProvider key={user?.id || 'guest'}>
        <ToastProvider>
          <Routes>
            {/* Password reset route - always accessible (Supabase redirects here) */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Main app route */}
            <Route
              path="/"
              element={
                user
                  ? <ActivityPlanner user={user} onLogout={handleLogout} />
                  : <LoginPage onLogin={handleLogin} />
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toast />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
