export interface SendOtpPayload {
  userId: string;
  email: string;
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  cooldownSeconds?: number;
  cooldownRemaining?: number;
}

export interface VerifyOtpPayload {
  userId: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: 'EXPIRED' | 'MAX_ATTEMPTS_EXCEEDED' | 'INVALID_OTP' | string;
  remainingAttempts?: number;
}

export interface OtpStatusResponse {
  success: boolean;
  pending?: boolean;
  expiresAt?: string | null;
  error?: string;
}

export interface OtpServiceConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sendFunctionName?: string;
  verifyFunctionName?: string;
}
