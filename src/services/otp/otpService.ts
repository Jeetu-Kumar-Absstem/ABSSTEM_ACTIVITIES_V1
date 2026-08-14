import { supabase, supabaseUrl, supabaseAnonKey } from '../../utils/supabase';
import { SendOtpPayload, SendOtpResponse, VerifyOtpPayload, VerifyOtpResponse } from './types';

class OtpService {
  private async invokeEdgeFunction<T>(functionName: string, body: unknown): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        ok: false,
        status: 500,
        data: null,
        error: 'Supabase is not configured.',
      };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: T | null = null;

    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: !response.ok
        ? (data as { error?: string } | null)?.error || 'Request failed.'
        : null,
    };
  }

  /**
   * Triggers generation and sending of a 6-digit OTP to the user's email via Edge Function
   */
  async sendOtp(userId: string, email: string): Promise<SendOtpResponse> {
    try {
      const result = await this.invokeEdgeFunction<SendOtpResponse>('send-verification-otp', {
        user_id: userId,
        email: email.trim().toLowerCase(),
      });

      if (!result.ok) {
        const errorMessage =
          result.status === 429
            ? (result.data as SendOtpResponse | null)?.error || 'Please wait before requesting another code.'
            : result.error || 'Failed to send verification code.';
        return { success: false, error: errorMessage };
      }

      if (result.data?.error) {
        return {
          success: false,
          error: result.data.error,
          cooldownRemaining: result.data.cooldownRemaining,
        };
      }

      return {
        success: true,
        message: result.data?.message || 'Verification code sent successfully.',
        cooldownSeconds: result.data?.cooldownSeconds || 60,
      };
    } catch (err: any) {
      console.error('otpService.sendOtp error:', err);
      return {
        success: false,
        error: 'We couldn\'t send your verification code. Please check your connection and try again.',
      };
    }
  }

  /**
   * Verifies the 6-digit OTP submitted by the user via Edge Function
   */
  async verifyOtp(userId: string, otp: string): Promise<VerifyOtpResponse> {
    try {
      const result = await this.invokeEdgeFunction<VerifyOtpResponse>('verify-email-otp', {
        user_id: userId,
        otp: otp.trim(),
      });

      if (!result.ok) {
        const errorMessage =
          result.data?.error ||
          (result.status === 429
            ? 'Too many verification requests. Please try again later.'
            : 'Failed to verify code.');
        return { success: false, error: errorMessage };
      }

      if (result.data?.error) {
        return {
          success: false,
          error: result.data.error,
          code: result.data.code,
          remainingAttempts: result.data.remainingAttempts,
        };
      }

      return {
        success: true,
        message: result.data?.message || 'Your account has been successfully verified.',
      };
    } catch (err: any) {
      console.error('otpService.verifyOtp error:', err);
      return {
        success: false,
        error: 'We couldn\'t verify your code. Please check your connection and try again.',
      };
    }
  }
}

export const otpService = new OtpService();
