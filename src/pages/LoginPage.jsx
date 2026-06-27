// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../context/ToastContext';
import { validateEmpId, formatEmpId, validatePassword } from '../utils/validators';

const LoginPage = ({ onLogin }) => {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const { showToast } = useToast();

  const handleEmpIdChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatEmpId(rawValue);
    setEmpId(formatted);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateEmpId(empId)) {
      showToast('Employee ID must be 4 letters followed by 4 digits (e.g., ABCD1234)', 'error');
      return;
    }

    if (!validatePassword(password)) {
      showToast('Password must be 8+ chars with uppercase, lowercase, digit, and # or @', 'error');
      return;
    }

    setLoading(true);
    try {
      const email = `${empId}@absstem.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      showToast('Login successful! Welcome back!', 'success');
      if (onLogin) onLogin(data.user);
      
    } catch (error) {
      showToast(error.message || 'Login failed. Please try again.', 'error');
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
      showToast('Employee ID must be 4 letters followed by 4 digits (e.g., ABCD1234)', 'error');
      return;
    }

    if (!validatePassword(password)) {
      showToast('Password must be 8+ chars with uppercase, lowercase, digit, and # or @', 'error');
      return;
    }

    setLoading(true);
    try {
      const email = `${empId}@absstem.com`;
      
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            emp_id: empId,
            department: department || 'General',
          },
        },
      });

      if (error) throw error;

      // Insert into your existing employees table
      try {
        const { error: dbError } = await supabase
          .from('employees')
          .insert([
            { 
              name: name.trim(),
              email: email,
              department: department || 'General',
              employee_code: empId,
            }
          ]);

        if (dbError) {
          console.error('Error saving to employees table:', dbError);
          if (dbError.code === '23505') {
            showToast('This Employee ID is already registered. Please login.', 'warning');
            setIsRegister(false);
            setLoading(false);
            return;
          }
          showToast('Account created but employee record may need manual setup.', 'warning');
        } else {
          showToast('Registration successful! Please check your email to confirm.', 'success');
        }
      } catch (dbError) {
        console.log('Error with employees table:', dbError);
      }

      setIsRegister(false);
      setName('');
      setEmpId('');
      setPassword('');
      setDepartment('');

    } catch (error) {
      if (error.message.includes('User already registered')) {
        showToast('This Employee ID is already registered. Please login.', 'warning');
        setIsRegister(false);
      } else {
        showToast(error.message || 'Registration failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eef0f4 0%, #d5dbe8 100%)',
      padding: '20px',
      position: 'relative',
      zIndex: 1,
    }}>
      <div className="clay" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '40px 36px',
        borderRadius: '48px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎮</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a3c6e' }}>
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
                  Department
                </label>
                <select
                  className="clay-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ padding: '12px 18px' }}
                >
                  <option value="">Select Department (Optional)</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Service">Service</option>
                  <option value="R&D">R&D</option>
                  <option value="Operations">Operations</option>
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
              placeholder="e.g., ABCD1234 (4 letters + 4 digits)"
              maxLength="8"
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
              <span>Format: <strong>4 letters</strong> + <strong>4 digits</strong></span>
              {empId.length > 0 && (
                <span style={{ 
                  display: 'inline-block',
                  padding: '1px 10px',
                  borderRadius: '12px',
                  background: empId.length === 8 && validateEmpId(empId) ? 'rgba(56,142,60,0.1)' : 'rgba(229,57,53,0.1)',
                  color: empId.length === 8 && validateEmpId(empId) ? '#2e7d32' : '#c62828',
                  fontSize: '0.55rem',
                  fontWeight: 600,
                }}>
                  {empId.length === 8 && validateEmpId(empId) ? '✅ Valid' : '⚠️ Invalid'}
                </span>
              )}
            </div>
            <div style={{ 
              fontSize: '0.55rem', 
              color: '#999',
              marginTop: '2px',
            }}>
              Example: <strong>ABCD1234</strong> or <strong>XYZW5678</strong>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Password <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input
              className="clay-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ padding: '12px 18px' }}
              required
            />
            <div style={{ fontSize: '0.6rem', color: '#8888aa', marginTop: '4px' }}>
              Min 8 chars: 1 uppercase, 1 lowercase, 1 digit, and # or @
            </div>
            <div style={{ 
              fontSize: '0.55rem', 
              color: '#999',
              marginTop: '2px',
            }}>
              Example: <strong>Test@1234</strong> or <strong>Pass#5678</strong>
            </div>
          </div>

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

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setEmpId('');
              setPassword('');
              setName('');
              setDepartment('');
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

        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(249,168,37,0.05)', borderRadius: '16px', borderLeft: '3px solid #f9a825' }}>
          <div style={{ fontSize: '0.65rem', color: '#666', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><strong>Demo Credentials:</strong></div>
            <div>Emp ID: <strong>ABCD1234</strong> | Password: <strong>Test@1234</strong></div>
            <div style={{ fontSize: '0.55rem', color: '#999' }}>
              (Create an account first or use Supabase Auth)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;