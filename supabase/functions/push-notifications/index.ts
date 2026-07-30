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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { action } = body

    if (action === 'register') {
      const { token, device_info } = body
      const { error } = await supabaseClient
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
      console.log(`Sending notification: "${title}". Target Type: ${target_type}`)

      // 2. Insert into notifications table
      const { data: notification, error: notifError } = await supabaseClient
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

      // 3. Fetch target tokens
      let tokensQuery = supabaseClient.from('device_tokens').select('user_id, token')

      if (target_type === 'admins') {
        console.log('Targeting admins...')
      } else if (target_type === 'selected_employees' && selected_employee_ids?.length > 0) {
        console.log('Targeting selected employees:', selected_employee_ids)
        const { data: emps, error: empError } = await supabaseClient
          .from('employees')
          .select('user_id, employee_code')
          .in('employee_code', selected_employee_ids)

        if (empError) console.error('Error fetching employees:', empError)

        const userIds = emps?.map(e => e.user_id).filter(id => id !== null) || []
        console.log('Found user IDs for targeting:', userIds)

        if (userIds.length > 0) {
          tokensQuery = tokensQuery.in('user_id', userIds)
        } else {
          console.warn('No user IDs found for the selected employees.')
          return new Response(JSON.stringify({ success: true, message: 'No target users found with active profiles' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else if (target_type === 'all') {
        console.log('Targeting all devices...')
      }

      const { data: tokens, error: tokenError } = await tokensQuery
      if (tokenError) throw tokenError

      console.log(`Found ${tokens?.length || 0} tokens to notify.`)

      // 4. Prepare Firebase Auth
      const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')
      if (!serviceAccount.project_id) throw new Error('Firebase Service Account not configured')

      const jwt = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      })
      const { access_token } = await jwt.authorize()

      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`

      // 5. Send notifications & Track logs
      const logs = []

      if (tokens && tokens.length > 0) {
        await Promise.all(tokens.map(async (t) => {
          const fcmPayload = {
            message: {
              token: t.token,
              notification: { title, body: msgBody },
              data: {
                notification_id: notification.id,
                ...extraData
              },
              android: {
                notification: {
                  click_action: 'TOP_STORY_ACTIVITY',
                  icon: 'ic_stat_name',
                  color: '#3d5afe'
                }
              }
            }
          }

          const fcmRes = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify(fcmPayload)
          })

          const resData = await fcmRes.json()

          logs.push({
            notification_id: notification.id,
            user_id: t.user_id,
            status: fcmRes.ok ? 'sent' : 'failed'
          })

          return { token: t.token, ok: fcmRes.ok, error: resData.error }
        }))
      }

      // 6. Create history logs for targeted users who DON'T have tokens
      if (target_type === 'selected_employees' && selected_employee_ids?.length > 0) {
        const { data: emps } = await supabaseClient
          .from('employees')
          .select('user_id')
          .in('employee_code', selected_employee_ids)
          .not('user_id', 'is', null)

        const allTargetUserIds = emps?.map(e => e.user_id) || []

        for (const uid of allTargetUserIds) {
          if (!logs.some(l => l.user_id === uid)) {
            logs.push({
              notification_id: notification.id,
              user_id: uid,
              status: 'sent'
            })
          }
        }
      }

      // 7. Bulk insert logs
      if (logs.length > 0) {
        await supabaseClient.from('notification_logs').insert(logs)
      }

      return new Response(JSON.stringify({ success: true, message: `Attempted to send to ${tokens?.length || 0} devices.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
