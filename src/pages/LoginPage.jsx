// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import absstemLogo from '../assets/absstem_game_light_logo.png';
import { supabase } from '../utils/supabase';
import { useToast } from '../context/ToastContext';
import { validateEmpId, formatEmpId, validatePassword } from '../utils/validators';

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
    src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
  *, *::before, *::after {
    font-family: 'Lufga', sans-serif;
    font-weight: 400;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Lufga', sans-serif;
    font-weight: 600;
  }
`;

// Eye icons as inline SVG components
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

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const LoginPage = ({ onLogin }) => {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [loginError, setLoginError] = useState('');
  const [forgotEmpId, setForgotEmpId] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Show/hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { showToast } = useToast();

  const handleEmpIdChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatEmpId(rawValue);
    setEmpId(formatted);
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!validateEmpId(empId)) {
      setLoginError('Invalid Employee ID format)');
      return;
    }

    if (!validatePassword(password)) {
      setLoginError('Password must be 8+ chars with uppercase, lowercase, digit, and # or @');
      return;
    }

    setLoading(true);
    try {
      // Look up real email by employee_code
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('email, employee_code')
        .eq('employee_code', empId)
        .maybeSingle();

      if (empError) {
        console.error('Employee lookup error:', empError);
      }

      if (!empData) {
        setLoginError('Employee ID not found. Please register first.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: empData.email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setLoginError('Incorrect password. Please try again.');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setLoginError('Email not confirmed. Please check your inbox and confirm your account before logging in.');
        } else {
          setLoginError(error.message || 'Login failed. Please try again.');
        }
        return;
      }

      if (!data?.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setLoginError('Please confirm your email address before logging in.');
        return;
      }

      showToast('Welcome back!', 'success');
      if (onLogin) onLogin(data.user);

    } catch (error) {
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || name.trim().length < 2) {
      showToast('Please enter your full name', 'error');
      return;
    }

    if (!validateEmpId(empId)) {
      showToast('Employee ID must be valid', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!personalEmail || !emailRegex.test(personalEmail.trim())) {
      showToast('Please enter a valid personal email address', 'error');
      return;
    }

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
      const email = personalEmail.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${APP_URL}/`,
          data: {
            name: name.trim(),
            emp_id: empId,
            department: department || 'General',
          },
        },
      });

      if (error) throw error;

      // Supabase silently returns identities: [] when the email already exists (no error thrown)
      if (data.user?.identities?.length === 0) {
        showToast('This email is already registered. Please login instead.', 'error');
        setIsRegister(false);
        setLoading(false);
        return;
      }

      // Sign out immediately — prevent auto-login before email is confirmed
      await supabase.auth.signOut();
      showToast('We sent a confirmation email. Please confirm it before logging in.', 'success');

      setIsRegister(false);
      setName('');
      setEmpId('');
      setPassword('');
      setConfirmPassword('');
      setPersonalEmail('');
      setDepartment('');

    } catch (error) {
      if (error.message.includes('User already registered')) {
        showToast('Employee ID already registered. Please login.', 'warning');
        setIsRegister(false);
      } else {
        showToast(error.message || 'Registration failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    const trimmedId = forgotEmpId.trim().toUpperCase();

    if (!validateEmpId(trimmedId)) {
      showToast('Please enter a valid Employee ID (3-5 letters + 3-4 digits)', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('name, email, employee_code')
        .eq('employee_code', trimmedId)
        .maybeSingle();

      if (empError) throw empError;

      if (!empData) {
        showToast('No account found for this Employee ID.', 'error');
        return;
      }

      if (!empData.email) {
        showToast('No email is linked to this Employee ID.', 'error');
        return;
      }
      console.log("APP_URL =", APP_URL);
      console.log("Redirect URL =", APP_URL + "/reset-password");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        empData.email,
        { redirectTo: APP_URL + '/reset-password' }
      );

      if (resetError) throw resetError;

      setForgotEmail(empData.email);
      setForgotSuccess(true);
      showToast('Reset link sent to ' + empData.email, 'success');
    } catch (error) {
      showToast(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetToLogin = () => {
    setIsForgotPassword(false);
    setForgotEmpId('');
    setForgotEmail('');
    setForgotSuccess(false);
    setLoginError('');
  };

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const passwordWrapStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const eyeBtnStyle = {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8888aa',
    display: 'flex',
    alignItems: 'center',
    padding: '0',
    lineHeight: 1,
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eef0f4 0%, #d5dbe8 100%)',
    padding: '20px',
    position: 'relative',
    zIndex: 1,
    fontFamily: "'Lufga', sans-serif",
    fontWeight: 400,
  };

  const cardStyle = {
    maxWidth: '440px',
    width: '100%',
    padding: '40px 36px',
    borderRadius: '48px',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    position: 'relative',
    zIndex: 2,
  };

  // ── Forgot Password Screen ────────────────────────────────────────────────────
  if (isForgotPassword) {
    return (
      <div style={containerStyle}>
        <div className="clay" style={cardStyle}>
          {forgotSuccess ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📬</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a3c6e', marginBottom: '8px', fontFamily: "'Lufga', sans-serif" }}>
                Check Your Email
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6, marginBottom: '8px' }}>
                A password reset link has been sent to:
              </p>
              <div style={{
                background: 'rgba(26,60,110,0.07)',
                borderRadius: '10px',
                padding: '8px 16px',
                marginBottom: '16px',
                fontWeight: 600,
                color: '#1a3c6e',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
                textAlign: 'center',
              }}>
                {forgotEmail.trim().toLowerCase()}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={resetToLogin}
                className="clay-btn clay-btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '0.9rem', justifyContent: 'center' }}
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔑</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a3c6e', fontFamily: "'Lufga', sans-serif" }}>Forgot Password?</h1>
                <p style={{ fontSize: '0.8rem', color: '#8888aa', marginTop: '4px' }}>
                  Enter your Employee ID and we'll send the reset link to your registered email.
                </p>
              </div>

              <form onSubmit={handleForgotPassword}>
                {/* Employee ID */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                    Employee ID <span style={{ color: '#e53935' }}>*</span>
                  </label>
                  <input
                    className="clay-input"
                    type="text"
                    value={forgotEmpId}
                    onChange={(e) => setForgotEmpId(formatEmpId(e.target.value))}
                    // placeholder="e.g., ABC1234"
                    maxLength="9"
                    style={{
                      padding: '12px 18px',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      letterSpacing: '1px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div style={{
                  marginBottom: '20px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(26,60,110,0.06)',
                  color: '#44506b',
                  fontSize: '0.72rem',
                  lineHeight: 1.6,
                }}>
                  We will look up the email linked to this Employee ID and send the reset link there.
                </div>

                <button
                  type="submit"
                  className="clay-btn clay-btn-primary"
                  disabled={forgotLoading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '0.9rem',
                    justifyContent: 'center',
                    opacity: forgotLoading ? 0.7 : 1,
                    cursor: forgotLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {forgotLoading ? '⏳ Sending...' : '📧 Send Reset Link'}
                </button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={resetToLogin}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1a3c6e',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                  }}
                >
                  ← Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main Login / Register Screen ──────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div className="clay" style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={absstemLogo} alt="Absstem Logo" style={{ height: '64px', marginBottom: '8px', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#4d4d4f', fontFamily: "'Lufga', sans-serif" }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#8888aa', marginTop: '4px' }}>
            {isRegister ? 'Register for Absstem Activity Planner' : 'Login to Absstem Activity Planner'}
          </p>
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                  Full Name <span style={{ color: '#e53935' }}>*</span>
                </label>
                <input
                  className="clay-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{ padding: '12px 18px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                  Email <span style={{ color: '#e53935' }}>*</span>
                </label>
                <input
                  className="clay-input"
                  type="text"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ padding: '12px 18px' }}
                  required
                />
                {personalEmail.length > 0 && (
                  <div style={{
                    fontSize: '0.6rem', marginTop: '4px', fontWeight: 500,
                    color: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim()) ? '#2e7d32' : '#c62828',
                  }}>
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim())
                      ? '✅ Valid email'
                      : '⚠️ Must include @'}
                  </div>
                )}
                <div style={{ fontSize: '0.55rem', color: '#999', marginTop: '2px' }}>
                  A confirmation link will be sent to this email
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                  Department
                </label>
                <select
                  className="clay-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ padding: '12px 18px' }}
                >
                  <option value="">Select Department (Optional)</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Service">Service</option>
                  <option value="R&D">R&D</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Design">Design</option>
                  <option value="General">General</option>
                </select>
              </div>
            </>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Employee ID <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input
              className="clay-input"
              type="text"
              value={empId}
              onChange={handleEmpIdChange}
              // placeholder="e.g., ABC1234"
              maxLength="9"
              style={{
                padding: '12px 18px',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                letterSpacing: '1px',
              }}
              required
            />
            <div style={{
              fontSize: '0.6rem',
              color: '#8888aa',
              marginTop: '4px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
         
              {empId.length > 0 && (
                <span style={{
                  display: 'inline-block',
                  padding: '1px 10px',
                  borderRadius: '12px',
                  background: validateEmpId(empId) ? 'rgba(56,142,60,0.1)' : 'rgba(229,57,53,0.1)',
                  color: validateEmpId(empId) ? '#2e7d32' : '#c62828',
                  fontSize: '0.55rem',
                  fontWeight: 600,
                }}>
                  {validateEmpId(empId) ? '✅ Valid' : '⚠️ Invalid'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.55rem', color: '#999', marginTop: '2px' }}>
             
            </div>
          </div>

          {/* Password with eye toggle */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Password <span style={{ color: '#e53935' }}>*</span>
            </label>
            <div style={passwordWrapStyle}>
              <input
                className="clay-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                placeholder="Enter your password"
                style={{ padding: '12px 44px 12px 18px', width: '100%', boxSizing: 'border-box' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={eyeBtnStyle}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#8888aa', marginTop: '4px' }}>
              Min 8 chars: 1 uppercase, 1 lowercase, 1 digit, and # or @
            </div>
            <div style={{ fontSize: '0.55rem', color: '#999', marginTop: '2px' }}>
              Example: <strong>Test@1234</strong> or <strong>Pass#5678</strong>
            </div>
          </div>

          {/* Confirm Password — register only */}
          {isRegister && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                Confirm Password <span style={{ color: '#e53935' }}>*</span>
              </label>
              <div style={passwordWrapStyle}>
                <input
                  className="clay-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ padding: '12px 44px 12px 18px', width: '100%', boxSizing: 'border-box' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  style={eyeBtnStyle}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div style={{
                  fontSize: '0.6rem',
                  marginTop: '4px',
                  color: password === confirmPassword ? '#2e7d32' : '#c62828',
                  fontWeight: 500,
                }}>
                  {password === confirmPassword ? '✅ Passwords match' : '⚠️ Passwords do not match'}
                </div>
              )}
            </div>
          )}

          {/* Inline error for login */}
          {!isRegister && loginError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(229, 57, 53, 0.08)',
              border: '1px solid rgba(229, 57, 53, 0.25)',
              borderRadius: '12px',
              padding: '8px 14px',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '0.85rem' }}>❌</span>
              <span style={{ fontSize: '0.75rem', color: '#c62828', fontWeight: 500 }}>
                {loginError}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="clay-btn clay-btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '0.9rem',
              justifyContent: 'center',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Processing...' : (isRegister ? '🚀 Create Account' : '🔐 Login')}
          </button>
        </form>

        {/* Forgot password link — login only */}
        {!isRegister && (
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button
              onClick={() => { setIsForgotPassword(true); setLoginError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Forgot password?
            </button>
          </div>
        )}

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setEmpId('');
              setPassword('');
              setConfirmPassword('');
              setName('');
              setDepartment('');
              setLoginError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a3c6e',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'inherit',
            }}
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>

       
      </div>
    </div>
  );
};

export default LoginPage;