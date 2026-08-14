-- Create email_verification_otps table for storing secure 6-digit OTP hashes
CREATE TABLE IF NOT EXISTS public.email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  send_count_hour INTEGER NOT NULL DEFAULT 1,
  hour_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;

-- Note: We intentionally do NOT create public/authenticated RLS policies for SELECT/INSERT/UPDATE/DELETE.
-- All OTP operations MUST be executed via backend Edge Functions using the service_role_key.

-- Indexes for efficient lookup and periodic cleanup
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_user_id ON public.email_verification_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_expires_at ON public.email_verification_otps(expires_at);
