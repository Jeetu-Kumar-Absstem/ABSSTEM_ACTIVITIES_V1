import React from 'react';
import { OtpTimerProps } from './types';

export const OtpTimer: React.FC<OtpTimerProps> = ({
  cooldownSeconds,
  onResend,
  loading,
}) => {
  const isCooldownActive = cooldownSeconds > 0;

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="otp-footer">
      <span>
        {isCooldownActive
          ? `Resend code in ${formatTime(cooldownSeconds)}`
          : "Didn't receive the code?"}
      </span>
      <button
        type="button"
        onClick={onResend}
        disabled={isCooldownActive || loading}
        className="otp-resend-btn"
        aria-label="Resend verification code"
      >
        {loading ? 'Sending...' : 'Resend Code'}
      </button>
    </div>
  );
};
