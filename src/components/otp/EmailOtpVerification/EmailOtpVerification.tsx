import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OtpInput } from './OtpInput';
import { OtpTimer } from './OtpTimer';
import { OtpSuccess } from './OtpSuccess';
import { EmailOtpVerificationProps } from './types';
import { otpService } from '../../../services/otp/otpService';
import './EmailOtpVerification.css';

export const EmailOtpVerification: React.FC<EmailOtpVerificationProps> = ({
  email,
  userId,
  onVerified,
  onBack,
  theme = 'light',
  autoResendOnMount = false,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isError, setIsError] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoRequestedRef = useRef(false);

  // Focus initial digit on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Optionally send OTP on mount if requested. Guard against StrictMode
  // and refresh re-renders so we only auto-request once.
  useEffect(() => {
    if (autoResendOnMount && userId && email && !hasAutoRequestedRef.current) {
      hasAutoRequestedRef.current = true;
      void handleResendOtp();
    }
  }, [autoResendOnMount, userId, email]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownSeconds]);

  // Execute OTP verification call
  const executeVerification = useCallback(
    async (codeToVerify: string) => {
      if (loading || isVerified) return;

      setLoading(true);
      setErrorMessage(null);
      setIsError(false);

      const result = await otpService.verifyOtp(userId, codeToVerify);

      setLoading(false);

      if (result.success) {
        setIsVerified(true);
        setTimeout(() => {
          if (onVerified) onVerified();
        }, 1800);
      } else {
        setIsError(true);
        setErrorMessage(result.error || 'Verification failed. Please try again.');

        if (result.code === 'EXPIRED' || result.code === 'MAX_ATTEMPTS_EXCEEDED') {
          // Clear inputs on lock/expiry
          setOtp(new Array(6).fill(''));
          if (inputRefs.current[0]) inputRefs.current[0].focus();
        }
      }
    },
    [userId, loading, isVerified, onVerified]
  );

  // Handle single digit input change & auto-advance
  const handleChange = (value: string, index: number) => {
    // Only accept numeric digits
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned && value !== '') return;

    const newOtp = [...otp];
    const digit = cleaned.substring(cleaned.length - 1); // Last typed character
    newOtp[index] = digit;
    setOtp(newOtp);
    setErrorMessage(null);
    setIsError(false);

    // Auto-advance to next input field
    if (digit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger auto-verification when all 6 digits are populated
    const combinedOtp = newOtp.join('');
    if (combinedOtp.length === 6) {
      executeVerification(combinedOtp);
    }
  };

  // Keyboard navigation for backspace and arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const nextOtp = [...otp];
      if (nextOtp[index]) {
        nextOtp[index] = '';
        setOtp(nextOtp);
        return;
      }

      if (index > 0 && inputRefs.current[index - 1]) {
        nextOtp[index - 1] = '';
        setOtp(nextOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Clipboard paste event handler
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, 6).split('');
    const newOtp = new Array(6).fill('');

    digits.forEach((digit, idx) => {
      newOtp[idx] = digit;
    });

    setOtp(newOtp);
    setErrorMessage(null);
    setIsError(false);

    // Focus last pasted element or next empty field
    const focusIndex = Math.min(digits.length, 5);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
    }

    // Auto verify if full 6-digit code was pasted
    if (digits.length === 6) {
      executeVerification(newOtp.join(''));
    }
  };

  // Resend OTP trigger
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || resending || loading) return;

    setResending(true);
    setErrorMessage(null);
    setIsError(false);

    const response = await otpService.sendOtp(userId, email);

    setResending(false);

    if (response.success) {
      setCooldownSeconds(response.cooldownSeconds || 60);
      setOtp(new Array(6).fill(''));
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } else {
      setErrorMessage(response.error || 'Failed to resend verification code.');
      if (response.cooldownRemaining) {
        setCooldownSeconds(response.cooldownRemaining);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combined = otp.join('');
    if (combined.length === 6) {
      executeVerification(combined);
    } else {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      setIsError(true);
    }
  };

  return (
    <div className="otp-container" data-theme={theme}>
      <div className="otp-card">
        {onBack && !isVerified && (
          <button type="button" onClick={onBack} className="otp-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        )}

        {!isVerified ? (
          <div className="otp-form-shell">
              <div className="otp-header">
                <div className="otp-icon-badge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <h1 className="otp-title">Verify your email</h1>
                <p className="otp-subtitle">
                  We've sent a 6-digit code to{' '}
                  <span className="otp-email-highlight">{email}</span>.
                  <br />
                  Enter the code below to verify your account.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} noValidate>
                <OtpInput
                  value={otp}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  disabled={loading || resending}
                  isError={isError}
                  inputRefs={inputRefs}
                />

                {errorMessage && (
                  <div className="otp-error-banner" role="alert" aria-live="polite">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || resending || otp.join('').length < 6}
                  className="otp-submit-btn"
                >
                  {loading ? (
                    <>
                      <div className="otp-spinner" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Account</span>
                  )}
                </button>
              </form>

              <OtpTimer
                cooldownSeconds={cooldownSeconds}
                onResend={handleResendOtp}
                loading={resending}
                theme={theme}
              />
          </div>
        ) : (
            <OtpSuccess />
        )}
      </div>
    </div>
  );
};
