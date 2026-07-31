import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { JWT } from "https://esm.sh/google-auth-library@8.7.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { action } = body

    if (action === 'register') {
      const { token, device_info } = body
      const { error } = await supabaseAdmin
        .from('device_tokens')
        .upsert(
          { user_id: user.id, token, device_info, last_seen_at: new Date().toISOString() },
          { onConflict: 'token' }
        )

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'send') {
      // 1. Verify Admin
      const { data: isAdmin, error: adminError } = await supabaseClient.rpc('app_is_admin')
      if (adminError || !isAdmin) throw new Error('Forbidden: Admins only')

      const { title, body: msgBody, target_type, target_id, selected_employee_ids, data: extraData } = body
      console.log(`Push Request: "${title}" to ${target_type}`)

      // 2. Identify Target User IDs
      let targetUserIds: string[] = []

      if (target_type === 'selected_employees' && selected_employee_ids?.length > 0) {
        const { data: emps, error: empErr } = await supabaseAdmin
          .from('employees')
          .select('user_id')
          .in('employee_code', selected_employee_ids)
          .not('user_id', 'is', null)

        if (empErr) throw empErr
        targetUserIds = emps?.map(e => e.user_id) || []
      } else if (target_type === 'all' || target_type === 'employees') {
        const { data: emps, error: empErr } = await supabaseAdmin
          .from('employees')
          .select('user_id')
          .not('user_id', 'is', null)

        if (empErr) throw empErr
        targetUserIds = emps?.map(e => e.user_id) || []
      } else if (target_type === 'admins') {
        // Simple logic for admins if needed
      }

      if (targetUserIds.length === 0) {
        console.warn('No target users identified. Ensure employees are linked to auth accounts.')
        return new Response(JSON.stringify({ success: true, message: 'No target users found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 3. Save Notification Global Record
      const { data: notification, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert([{
          title,
          body: msgBody,
          target_type,
          target_id,
          created_by: user.id,
          data: {
            ...extraData || {},
            selected_employee_ids: selected_employee_ids || []
          }
        }])
        .select()
        .single()

      if (notifError) throw notifError

      // 4. Fetch Tokens for these users
      const { data: tokens, error: tokenError } = await supabaseAdmin
        .from('device_tokens')
        .select('user_id, token')
        .in('user_id', targetUserIds)

      if (tokenError) throw tokenError

      // 5. Send FCM Messages
      const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')
      if (!serviceAccount.project_id) throw new Error('Firebase Service Account missing')

      const jwt = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      })
      const { access_token } = await jwt.authorize()
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`

      if (tokens && tokens.length > 0) {
        // Truncate body for system tray to avoid cluttering mobile drawer
        const truncatedBody = msgBody.length > 80 ? msgBody.substring(0, 77) + "..." : msgBody;

        await Promise.all(tokens.map(async (t) => {
          try {
            const fcmPayload = {
              message: {
                token: t.token,
                notification: { title, body: truncatedBody },
                data: { notification_id: notification.id, ...extraData },
                android: {
                  notification: {
                    click_action: 'TOP_STORY_ACTIVITY',
                    color: '#3d5afe',
                    channel_id: 'absstem-notifs' // Use the high-priority channel
                  }
                }
              }
            }
            await fetch(fcmUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
              body: JSON.stringify(fcmPayload)
            })
          } catch (e) {
            console.error(`FCM Failed for token ${t.token}:`, e)
          }
        }))
      }

      // 6. Create History Logs for ALL targeted users
      const logs = targetUserIds.map(uid => ({
        notification_id: notification.id,
        user_id: uid,
        status: 'sent'
      }))

      if (logs.length > 0) {
        console.log(`Inserting ${logs.length} logs into notification_logs...`)
        const { error: logErr } = await supabaseAdmin.from('notification_logs').insert(logs)
        if (logErr) {
          console.error('CRITICAL: Log Insert Failed:', logErr)
          throw logErr
        }
      } else {
        console.warn('No logs to insert. This happens if targetUserIds is empty.')
      }

      return new Response(JSON.stringify({
        success: true,
        sent_to_devices: tokens?.length || 0,
        logged_for_users: targetUserIds.length
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
