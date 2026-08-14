import React from 'react';
import { OtpInputProps } from './types';

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onKeyDown,
  onPaste,
  disabled = false,
  isError = false,
  inputRefs,
}) => {
  return (
    <div className="otp-inputs-grid" role="group" aria-label="6-digit verification code">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            if (inputRefs) {
              inputRefs.current[index] = el;
            }
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, index)}
          onKeyDown={(e) => onKeyDown(e, index)}
          onPaste={onPaste}
          aria-label={`Digit ${index + 1} of 6`}
          className={`otp-box ${isError ? 'error' : ''}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
        />
      ))}
    </div>
  );
};
