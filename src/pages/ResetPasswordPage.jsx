// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useToast } from '../context/ToastContext';
import { validatePassword } from '../utils/validators';

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let timeout;

    // IMPORTANT: register the listener BEFORE calling getSession so we never
    // miss the PASSWORD_RECOVERY / SIGNED_IN event on a slow connection.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user) {
        setSessionReady(true);
        clearTimeout(timeout);
        // Strip the token fragment from the URL so a page refresh doesn't
        // re-use the (now spent) one-time token.
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const init = async () => {
      // Supabase may have already consumed the URL hash and created a session
      // by the time React mounts (detectSessionInUrl:true does this eagerly).
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionReady(true);
        clearTimeout(timeout);
        return;
      }

      // Nothing yet — start a timeout. If Supabase hasn't fired within 8s
      // the link is genuinely expired or already used.
      timeout = setTimeout(() => setSessionError(true), 8000);
    };

    init();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      showToast('Password must be 8+ chars with uppercase, lowercase, digit, and # or @', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      showToast(err.message || 'Failed to update password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eef0f4 0%, #d5dbe8 100%)',
    padding: '20px',
  };

  const cardStyle = {
    maxWidth: '440px',
    width: '100%',
    padding: '40px 36px',
    borderRadius: '48px',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
  };

  const passwordWrapStyle = { position: 'relative', display: 'flex', alignItems: 'center' };

  const eyeBtnStyle = {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8888aa',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  };

  // ── Loading state — waiting for Supabase to exchange token ──────────────────
  if (!sessionReady && !sessionError) {
    return (
      <div style={containerStyle}>
        <div className="clay" style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '0.9rem', color: '#444466' }}>Verifying reset link...</div>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ──────────────────────────────────────────────────
  if (sessionError) {
    return (
      <div style={containerStyle}>
        <div className="clay" style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>❌</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c62828', marginBottom: '8px' }}>
            Link Expired or Invalid
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6, marginBottom: '24px' }}>
            This password reset link has expired or already been used. Please request a new one.
          </p>
          <button
            onClick={() => navigate('/')}
            className="clay-btn clay-btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '0.9rem', justifyContent: 'center' }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={containerStyle}>
        <div className="clay" style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a3c6e', marginBottom: '8px' }}>
            Password Updated!
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6, marginBottom: '24px' }}>
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <button
            onClick={() => navigate('/')}
            className="clay-btn clay-btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '0.9rem', justifyContent: 'center' }}
          >
            🔐 Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Set new password form ───────────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div className="clay" style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a3c6e' }}>Set New Password</h1>
          <p style={{ fontSize: '0.8rem', color: '#8888aa', marginTop: '4px' }}>
            Choose a strong password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              New Password <span style={{ color: '#e53935' }}>*</span>
            </label>
            <div style={passwordWrapStyle}>
              <input
                className="clay-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                style={{ padding: '12px 44px 12px 18px', width: '100%', boxSizing: 'border-box' }}
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={eyeBtnStyle}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#8888aa', marginTop: '4px' }}>
              Min 8 chars: 1 uppercase, 1 lowercase, 1 digit, and # or @
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Confirm New Password <span style={{ color: '#e53935' }}>*</span>
            </label>
            <div style={passwordWrapStyle}>
              <input
                className="clay-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                style={{ padding: '12px 44px 12px 18px', width: '100%', boxSizing: 'border-box' }}
                required
              />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={eyeBtnStyle}>
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <div style={{
                fontSize: '0.6rem', marginTop: '4px', fontWeight: 500,
                color: password === confirmPassword ? '#2e7d32' : '#c62828',
              }}>
                {password === confirmPassword ? '✅ Passwords match' : '⚠️ Passwords do not match'}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="clay-btn clay-btn-primary"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', fontSize: '0.9rem',
              justifyContent: 'center',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Updating...' : '🔒 Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;