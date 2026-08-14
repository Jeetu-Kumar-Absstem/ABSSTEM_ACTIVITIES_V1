import React from 'react';
import { OtpSuccessProps } from './types';

export const OtpSuccess: React.FC<OtpSuccessProps> = ({
  message = 'Your account has been successfully verified.',
}) => {
  return (
    <div className="otp-success-container" role="status" aria-live="polite">
      <div className="otp-checkmark-ring">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="otp-success-title">Account Verified</h2>
      <p className="otp-success-subtitle">{message}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--otp-text-secondary)', fontSize: '0.8125rem' }}>
        <div className="otp-spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(16, 185, 129, 0.3)', borderTopColor: '#10b981' }} />
        <span>Redirecting to login...</span>
      </div>
    </div>
  );
};
