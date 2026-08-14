import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Security Constants
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_SENDS_PER_HOUR = 10;

// Generate secure SHA-256 hash of OTP + user_id context
async function hashOtp(otp: string, userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}:${otp}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate cryptographically secure 6-digit OTP (000000 - 999999)
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const number = array[0] % 1000000;
  return number.toString().padStart(OTP_LENGTH, "0");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "user_id and email are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin Client using service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Check existing OTP record for this user
    const { data: existingOtp, error: fetchError } = await supabase
      .from("email_verification_otps")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to check verification status." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let sendCountHour = 1;
    let hourStartAt = now.toISOString();

    if (existingOtp) {
      const lastSent = new Date(existingOtp.last_sent_at);
      const secondsSinceLastSent = (now.getTime() - lastSent.getTime()) / 1000;

      // 1. Resend Cooldown Check (60 seconds)
      if (secondsSinceLastSent < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent);
        return new Response(
          JSON.stringify({
            error: `Please wait ${waitTime} seconds before requesting another code.`,
            cooldownRemaining: waitTime,
          }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // 2. Hourly Rate Limit Check (10 sends per hour)
      const hourStart = new Date(existingOtp.hour_start_at);
      const hoursPassed = (now.getTime() - hourStart.getTime()) / (1000 * 60 * 60);

      if (hoursPassed >= 1) {
        // Reset hourly counter after 1 hour
        sendCountHour = 1;
        hourStartAt = now.toISOString();
      } else {
        if (existingOtp.send_count_hour >= OTP_MAX_SENDS_PER_HOUR) {
          return new Response(
            JSON.stringify({
              error: "Too many verification requests. Please try again later.",
            }),
            { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }
        sendCountHour = existingOtp.send_count_hour + 1;
        hourStartAt = existingOtp.hour_start_at;
      }
    }

    // Generate new OTP & compute hash
    const plainOtp = generateSecureOtp();
    const otpHash = await hashOtp(plainOtp, user_id);

    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Replace any prior OTP so only the newest code stays active.
    const { error: deleteError } = await supabase
      .from("email_verification_otps")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to rotate verification code." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await supabase.from("email_verification_otps").insert({
      user_id,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: now.toISOString(),
      send_count_hour: sendCountHour,
      hour_start_at: hourStartAt,
      updated_at: now.toISOString(),
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store verification record." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Send email via Brevo REST API
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@absstem.com";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "ABSSTEM Activities";

    if (brevoApiKey) {
      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email }],
          subject: "Welcome to Absstem Activities",
          htmlContent: `
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
              Your ABSSTEM Activities verification code is -
            </div>
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">ABSSTEM Activities</h1>
              </div>
              <p style="color: #334155; font-size: 15px; line-height: 1.5; text-align: center; margin: 0 0 16px;">Your ABSSTEM Activities verification code is -</p>
              <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 6px; font-size: 32px; font-weight: 800; color: #0f172a;">
                ${plainOtp}
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">If you did not create an account on ABSSTEM Activities, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!brevoResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Unable to send verification code right now. Please try again later." }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Unable to send verification code right now. Please try again later." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent to your email.",
        cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Unable to send verification code right now. Please try again later." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
