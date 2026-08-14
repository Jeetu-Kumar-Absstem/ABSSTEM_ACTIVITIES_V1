// src/App.jsx

import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import absstemLogo from './assets/absstem_game_light_logo.png';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/common/Toast';
import { supabase } from './utils/supabase';
import notificationService from './services/NotificationService';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AccountDeletionPage from './pages/AccountDeletionPage';

const isPrivacyPolicyRoute =
  typeof window !== 'undefined' &&
  window.location.pathname === '/privacy-policy';
const isAccountDeletionRoute =
  typeof window !== 'undefined' &&
  window.location.pathname === '/account-deletion';

// Lazy Loaded Pages
const ActivityPlanner = lazy(() => import('./pages/ActivityPlanner'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailOtp = lazy(() => import('./pages/VerifyEmailOtp'));

// Loading Component
const PageLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#eef0f4',
    }}
  >
    <div
      className="clay"
      style={{
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <img src={absstemLogo} alt="Absstem Logo" className="splash-logo" />
      <div style={{ fontSize: '0.9rem', color: '#444466', marginTop: '16px' }}>
        Loading...
      </div>
    </div>
  </div>
);

// Global listener registered outside the component to catch intents as early as possible.
if (Capacitor.getPlatform() !== 'web') {
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('App (Global): Push action performed: ', notification);
    localStorage.setItem('pending_notif_redirect', 'true');
    // Dispatch event for foreground clicks
    window.dispatchEvent(new CustomEvent('notification-clicked'));
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minLoadingFinished, setMinLoadingFinished] = useState(false);

  const verifyActiveEmployeeAccount = async (authUser) => {
    if (!authUser?.email) return false;

    const email = authUser.email.trim().toLowerCase();
    const empId = String(
      authUser?.user_metadata?.emp_id ||
      authUser?.user_metadata?.employee_code ||
      authUser?.user_metadata?.empId ||
      ''
    ).trim().toUpperCase();

    const query = empId
      ? supabase
          .from('employees')
          .select('employee_code, is_active, email')
          .or(`email.eq.${email},employee_code.eq.${empId}`)
      : supabase
          .from('employees')
          .select('employee_code, is_active, email')
          .eq('email', email);

    const { data, error } = await query.maybeSingle();

    if (error || !data || data.is_active === false) {
      return false;
    }

    if (empId && String(data.employee_code || '').toUpperCase() !== empId) {
      return false;
    }

    return true;
  };

  // Initialize Local Notifications only after user logs in
  useEffect(() => {
    if (user) {
      notificationService.init();
    }
  }, [user]);

  useEffect(() => {
    // Force minimum loading duration of 1.5 seconds
    const timer = setTimeout(() => {
      setMinLoadingFinished(true);
    }, 1500);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        // If we landed on /reset-password,
        // let ResetPasswordPage handle the session.
        if (window.location.pathname === '/reset-password') {
          setLoading(false);
          return;
        }

        if (session?.user && !session.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const isEmployeeActive = await verifyActiveEmployeeAccount(session.user);
          if (!isEmployeeActive) {
            await supabase.auth.signOut();
            setUser(null);
            setLoading(false);
            return;
          }
        }

        setUser(session?.user || null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching Supabase session:', error);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }

      if (
        event === 'SIGNED_IN' &&
        window.location.pathname === '/reset-password'
      ) {
        return;
      }

      if (
        event === 'SIGNED_IN' &&
        session?.user &&
        !session.user.email_confirmed_at
      ) {
        supabase.auth.signOut();
        setUser(null);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        void (async () => {
          const isEmployeeActive = await verifyActiveEmployeeAccount(session.user);
          if (!isEmployeeActive) {
            await supabase.auth.signOut();
            setUser(null);
            return;
          }

          setUser(session.user);
        })();
        return;
      }

      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => setUser(null);

  if (isPrivacyPolicyRoute) {
    return <PrivacyPolicy />;
  }

  if (isAccountDeletionRoute) {
    return <AccountDeletionPage />;
  }

  // Initial authentication loading
  if (loading || !minLoadingFinished) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <AppProvider key={user?.id || 'guest'}>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Policy Page */}
              <Route
                path="/privacy-policy"
                element={<PrivacyPolicy />}
              />

              <Route
                path="/account-deletion"
                element={<AccountDeletionPage />}
              />

              {/* Password Reset */}
              <Route
                path="/reset-password"
                element={<ResetPasswordPage />}
              />

              <Route
                path="/verify-email-otp"
                element={<VerifyEmailOtp />}
              />

              <Route
                path="/login"
                element={
                  user ? (
                    <ActivityPlanner
                      user={user}
                      onLogout={handleLogout}
                    />
                  ) : (
                    <LoginPage onLogin={handleLogin} />
                  )
                }
              />

              {/* Main App */}
              <Route
                path="/"
                element={
                  user ? (
                    <ActivityPlanner
                      user={user}
                      onLogout={handleLogout}
                    />
                  ) : (
                    <LoginPage onLogin={handleLogin} />
                  )
                }
              />

              {/* Catch All */}
              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />
            </Routes>
          </Suspense>

          <Toast />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
