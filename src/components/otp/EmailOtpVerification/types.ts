export type ThemeMode = 'light' | 'dark' | 'system';

export interface EmailOtpVerificationProps {
  email: string;
  userId: string;
  onVerified?: () => void;
  onBack?: () => void;
  theme?: ThemeMode;
  autoResendOnMount?: boolean;
}

export interface OtpInputProps {
  value: string[];
  onChange: (value: string, index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  isError?: boolean;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

export interface OtpTimerProps {
  cooldownSeconds: number;
  onResend: () => void;
  loading: boolean;
  theme?: ThemeMode;
}

export interface OtpSuccessProps {
  message?: string;
  onComplete?: () => void;
}
