import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_MAX_ATTEMPTS = 5;

// Generate secure SHA-256 hash of OTP + user_id context
async function hashOtp(otp: string, userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}:${otp}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  try {
    const { user_id, otp } = await req.json();

    if (!user_id || !otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Valid 6-digit OTP and user_id are required." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin Client using service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Fetch OTP record
    const { data: record, error: fetchError } = await supabase
      .from("email_verification_otps")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError || !record) {
      return new Response(
        JSON.stringify({ error: "No active verification request found. Please request a new code." }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    const expiresAt = new Date(record.expires_at);
    if (now.getTime() >= expiresAt.getTime()) {
      return new Response(
        JSON.stringify({ error: "This verification code has expired. Please request a new code.", code: "EXPIRED" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Check maximum attempts limit
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({
          error: "Too many incorrect attempts. Please request a new code.",
          code: "MAX_ATTEMPTS_EXCEEDED",
        }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Compute hash of entered OTP
    const submittedHash = await hashOtp(otp, user_id);

    // Compare hashes
    if (submittedHash !== record.otp_hash) {
      const newAttempts = record.attempts + 1;
      const isLocked = newAttempts >= OTP_MAX_ATTEMPTS;

      // Update attempt count in database
      await supabase
        .from("email_verification_otps")
        .update({ attempts: newAttempts, updated_at: now.toISOString() })
        .eq("user_id", user_id);

      if (isLocked) {
        return new Response(
          JSON.stringify({
            error: "Too many incorrect attempts. Please request a new code.",
            code: "MAX_ATTEMPTS_EXCEEDED",
            remainingAttempts: 0,
          }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Incorrect verification code. Please try again.",
          code: "INVALID_OTP",
          remainingAttempts: OTP_MAX_ATTEMPTS - newAttempts,
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Hash MATCHES! Server-side verify account in Supabase Auth
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(user_id, {
      email_confirm: true,
    });

    if (updateAuthError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify account status. Please contact support." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Invalidate/delete OTP record immediately after successful verification
    await supabase.from("email_verification_otps").delete().eq("user_id", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your email has been successfully verified.",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "An error occurred while verifying the code." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
