// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import absstemLogo from '../assets/absstem_game_light_logo.png';
import { supabase } from '../utils/supabase';
import { useToast } from '../context/ToastContext';
import { otpService } from '../services/otp/otpService';
import { validateEmpId, formatEmpId, validatePassword } from '../utils/validators';
import { Check } from 'lucide-react';

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
  const navigate = useNavigate();
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
  const [pendingVerificationAccount, setPendingVerificationAccount] = useState(null);

  // Show/hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showRememberPrompt, setShowRememberPrompt] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);

  const MAX_SAVED_ACCOUNTS = 5;
  const STORAGE_KEY = 'remember_accounts';

  const { showToast } = useToast();

  useEffect(() => {
    const storedContext = sessionStorage.getItem('pending_otp_context');
    if (!storedContext || isForgotPassword) {
      return;
    }

    try {
      const parsed = JSON.parse(storedContext);
      if (parsed?.userId && parsed?.email) {
        navigate('/verify-email-otp', {
          replace: true,
          state: {
            userId: parsed.userId,
            email: parsed.email,
            autoSend: false,
          },
        });
      }
    } catch (error) {
      console.error('Failed to restore pending OTP context:', error);
    }
  }, [isForgotPassword, navigate]);

  const getSavedAccounts = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const handleEmpIdFocus = () => {
    const accounts = getSavedAccounts();
    if (accounts.length > 0 && !empId) {
      setSavedAccounts(accounts);
      setShowRememberPrompt(true);
    }
  };

  const handleSelectAccount = (account) => {
    setEmpId(account.empId);
    setPassword(account.password);
    setRememberMe(true);
    setShowRememberPrompt(false);
  };

  const handleForgetAccount = (e, empIdToRemove) => {
    e.stopPropagation();
    const updated = getSavedAccounts().filter(a => a.empId !== empIdToRemove);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedAccounts(updated);
    if (updated.length === 0) setShowRememberPrompt(false);
  };

  const handleDismissRemembered = () => {
    setShowRememberPrompt(false);
  };

  const handleEmpIdChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatEmpId(rawValue);
    setEmpId(formatted);
    setLoginError('');
    setPendingVerificationAccount(null);
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
    setPendingVerificationAccount(null);
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

      if (data?.user?.user_metadata?.otp_verified !== true) {
        const otpStatus = await otpService.checkOtpStatus(data.user.id);

        if (!otpStatus.success) {
          await supabase.auth.signOut();
          setLoginError('Please verify your account.');
          return;
        }

        if (otpStatus.pending) {
          await supabase.auth.signOut();
          setPendingVerificationAccount({
            userId: data.user.id,
            email: empData.email,
          });
          setLoginError('Your account is not verified ');
          return;
        }

        // OTP record is gone, so the account is verified even if auth metadata is stale.
        await supabase.auth.updateUser({
          data: { otp_verified: true },
        });
      }

      const { data: activeEmp, error: activeEmpError } = await supabase
        .from('employees')
        .select('employee_code, is_active')
        .eq('employee_code', empId)
        .maybeSingle();

      if (activeEmpError || !activeEmp || activeEmp.is_active === false) {
        await supabase.auth.signOut();
        setLoginError('This account is no longer active. Please contact support.');
        return;
      }

      // Save or remove from multi-account store
      if (rememberMe) {
        const accounts = getSavedAccounts();
        const existing = accounts.findIndex(a => a.empId === empId);
        if (existing >= 0) {
          accounts[existing].password = password; // update password if changed
        } else {
          if (accounts.length >= MAX_SAVED_ACCOUNTS) accounts.shift(); // drop oldest
          accounts.push({ empId, password });
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      } else {
        // Remove this account from saved list if it was there
        const accounts = getSavedAccounts().filter(a => a.empId !== empId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      }

      showToast('Welcome back!', 'success');
      if (onLogin) onLogin(data.user);

    } catch (error) {
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resumePendingVerification = async (userId, email) => {
    if (!userId || !email) {
      return false;
    }

    const otpStatus = await otpService.checkOtpStatus(userId);
    if (!otpStatus.success || !otpStatus.pending) {
      return false;
    }

    const otpResult = await otpService.sendOtp(userId, email);
    if (!otpResult.success) {
      throw new Error(otpResult.error || 'Unable to send verification code.');
    }

    sessionStorage.setItem(
      'pending_otp_context',
      JSON.stringify({
        userId,
        email,
      })
    );
    sessionStorage.setItem('pending_otp_registration', 'true');

    navigate('/verify-email-otp', {
      replace: true,
      state: {
        userId,
        email,
        autoSend: false,
      },
    });

    showToast('This account is not verified yet. We sent a new verification code.', 'warning');
    return true;
  };

  const handleVerifyPendingAccount = async () => {
    if (!pendingVerificationAccount?.userId || !pendingVerificationAccount?.email) {
      return;
    }

    setLoading(true);
    try {
      const resumed = await resumePendingVerification(
        pendingVerificationAccount.userId,
        pendingVerificationAccount.email
      );

      if (!resumed) {
        setLoginError('Unable to send verification code. Please try again.');
      }
    } catch (error) {
      setLoginError(error.message || 'Unable to send verification code. Please try again.');
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
      sessionStorage.setItem('pending_otp_registration', 'true');

      // Check if Employee ID already exists in employees table
      const { data: existingEmp, error: empCheckError } = await supabase
        .from('employees')
        .select('employee_code, email, user_id')
        .eq('employee_code', empId)
        .maybeSingle();

      if (empCheckError) throw empCheckError;

      if (existingEmp) {
        const resumed = await resumePendingVerification(
          existingEmp.user_id,
          existingEmp.email || email
        );
        if (resumed) {
          return;
        }

        showToast('This Employee ID is already registered and verified. Please login instead.', 'error');
        setLoading(false);
        sessionStorage.removeItem('pending_otp_registration');
        return;
      }

      // Check if email already exists
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('employees')
        .select('email, employee_code, user_id')
        .eq('email', email)
        .maybeSingle();

      if (emailCheckError) throw emailCheckError;

      if (existingEmail) {
        const resumed = await resumePendingVerification(
          existingEmail.user_id,
          existingEmail.email || email
        );
        if (resumed) {
          return;
        }

        showToast('This email is already registered and verified. Please login instead.', 'error');
        setLoading(false);
        sessionStorage.removeItem('pending_otp_registration');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            emp_id: empId,
            department: department || 'General',
            otp_verified: false,
          },
        },
      });

      if (error) throw error;

      // Supabase silently returns identities: [] when the email already exists (no error thrown)
      if (data.user?.identities?.length === 0) {
        showToast('This email is already registered. Please login instead.', 'error');
        setIsRegister(false);
        setLoading(false);
        sessionStorage.removeItem('pending_otp_registration');
        return;
      }

      if (!data.user?.id) {
        throw new Error('Account creation failed. Please try again.');
      }

      const otpResult = await otpService.sendOtp(data.user.id, email);
      if (!otpResult.success) {
        throw new Error(otpResult.error || 'Unable to send verification code.');
      }

      sessionStorage.setItem(
        'pending_otp_context',
        JSON.stringify({
          userId: data.user.id,
          email,
        })
      );

      await supabase.auth.signOut();

      navigate('/verify-email-otp', {
        replace: true,
        state: {
          userId: data.user.id,
          email,
          autoSend: false,
        },
      });
      showToast('Verification code sent. Please verify your OTP to continue.', 'success');

    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('User already registered')) {
        showToast('Employee ID already registered. Please login.', 'warning');
        setIsRegister(false);
      } else if (msg.includes('Employee ID already exists')) {
        showToast('Employee ID already exists. Please login instead.', 'error');
      } else if (msg.includes('Email already registered')) {
        showToast('This email is already registered. Please login instead.', 'error');
      } else {
        showToast(msg || 'Registration failed. Please try again.', 'error');
      }
      sessionStorage.removeItem('pending_otp_registration');
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
    alignItems: isRegister ? 'flex-start' : 'center',
    justifyContent: 'center',
    // Always light — login page is never affected by dark/light mode
    background: 'linear-gradient(135deg, #eef0f4 0%, #d5dbe8 100%)',
    padding: '20px',
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overflowY: 'auto',
    colorScheme: 'light',
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
      <div style={containerStyle} className="login-light-scope">
        <div className="clay" style={cardStyle}>
          {forgotSuccess ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📬</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a3c6e', marginBottom: '8px' }}>
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a3c6e' }}>Forgot Password?</h1>
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
    <div style={containerStyle} className="login-light-scope">
      <div className="clay" style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={absstemLogo} alt="Absstem Logo" style={{ height: '64px', marginBottom: '8px', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#4d4d4f' }}>
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
              onFocus={!isRegister ? handleEmpIdFocus : undefined}
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

            {/* Multi-account saved credentials dropdown */}
            {!isRegister && showRememberPrompt && (
              <div style={{
                marginTop: '8px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(26, 60, 110, 0.18)',
                boxShadow: '0 4px 20px rgba(26,60,110,0.10)',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(26,60,110,0.08)',
                  background: 'rgba(26,60,110,0.04)',
                }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#1a3c6e' }}>
                    💾 Saved accounts ({savedAccounts.length}/{MAX_SAVED_ACCOUNTS})
                  </span>
                  <button
                    type="button"
                    onClick={handleDismissRemembered}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#aaa', fontSize: '0.75rem', lineHeight: 1, padding: '0 2px',
                      fontFamily: 'inherit',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Account rows */}
                {savedAccounts.map((account, i) => (
                  <div
                    key={account.empId}
                    onClick={() => handleSelectAccount(account)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      cursor: 'pointer',
                      borderBottom: i < savedAccounts.length - 1 ? '1px solid rgba(26,60,110,0.06)' : 'none',
                      transition: 'background 0.12s',
                      gap: '8px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,60,110,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: 'rgba(26,60,110,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: '#1a3c6e', flexShrink: 0,
                      }}>
                        {account.empId.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1a3c6e', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                          {account.empId}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#9090aa', marginTop: '1px' }}>
                          {'•'.repeat(8)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleForgetAccount(e, account.empId)}
                      title="Forget this account"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#cc4444', fontSize: '0.65rem', padding: '4px 6px',
                        borderRadius: '6px', fontFamily: 'inherit', flexShrink: 0,
                        opacity: 0.7,
                      }}
                    >
                      Forget
                    </button>
                  </div>
                ))}
              </div>
            )}
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

          {/* Remember Me — login only */}
          {!isRegister && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', marginTop: '4px' }}>
              <div
                onClick={() => setRememberMe((v) => !v)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '6px',
                  border: rememberMe ? '2px solid #1a3c6e' : '2px solid rgba(180,190,210,0.8)',
                  background: rememberMe ? '#1a3c6e' : 'rgba(240,243,250,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {rememberMe && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <span
                onClick={() => setRememberMe((v) => !v)}
                style={{ fontSize: '0.78rem', color: '#555577', cursor: 'pointer', userSelect: 'none' }}
              >
                Remember me
              </span>
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
          {!isRegister && pendingVerificationAccount && (
            <button
              type="button"
              onClick={handleVerifyPendingAccount}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a3c6e',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: 0,
                marginBottom: '12px',
                textDecoration: 'underline',
              }}
            >
              First verify your account
            </button>
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
