import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmailOtpVerification } from '../components/otp/EmailOtpVerification';
import { useToast } from '../context/ToastContext';
import { supabase } from '../utils/supabase';

export const VerifyEmailOtp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const state = location.state as { userId?: string; email?: string; autoSend?: boolean } | null;

  // Retrieve verification target from location state or fallback to sessionStorage for page refresh resilience
  const verificationContext = useMemo(() => {
    if (state?.userId && state?.email) {
      return { userId: state.userId, email: state.email, source: 'state' as const };
    }

    try {
      const stored = sessionStorage.getItem('pending_otp_context');
      if (stored) {
        const parsed = JSON.parse(stored) as { userId: string; email: string };
        return { ...parsed, source: 'storage' as const };
      }
    } catch (e) {
      console.error('Failed to parse pending_otp_context:', e);
    }
    return null;
  }, [state]);

  const userId = verificationContext?.userId;
  const email = verificationContext?.email;

  React.useEffect(() => {
    void supabase.auth.signOut();
  }, []);

  React.useEffect(() => {
    if (!userId || !email) {
      showToast('No active verification request found. Please login or create an account.', 'warning');
      navigate('/login', { replace: true });
    }
  }, [userId, email, navigate, showToast]);

  if (!userId || !email) {
    return null;
  }

  const handleVerified = () => {
    sessionStorage.removeItem('pending_otp_context');
    sessionStorage.removeItem('pending_otp_registration');
    showToast('Your account has been verified! Please login with your credentials.', 'success');
    void supabase.auth.signOut().finally(() => {
      navigate('/', { replace: true, state: { verifiedEmail: email } });
    });
  };

  const handleBack = () => {
    sessionStorage.removeItem('pending_otp_context');
    sessionStorage.removeItem('pending_otp_registration');
    void supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <EmailOtpVerification
      email={email}
      userId={userId}
      onVerified={handleVerified}
      onBack={handleBack}
      theme="light"
      autoResendOnMount={false}
    />
  );
};

export default VerifyEmailOtp;
