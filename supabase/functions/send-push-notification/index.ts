import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Read environment variables (No hardcoded credentials or fallback secrets)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
    const webhookSecret = req.headers.get('X-Webhook-Secret')

    let isAuthorized = false

    // 1. Verify via Webhook Secret if supplied
    if (webhookSecret && expectedSecret && webhookSecret === expectedSecret) {
      isAuthorized = true
    } else {
      // 2. Verify via Supabase Auth Session of an Admin or Super Admin
      const authHeader = req.headers.get('Authorization')
      if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_KEY && SUPABASE_ANON_KEY) {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        const supabaseClient = createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: authHeader } } }
        )
        
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (!userError && user) {
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          
          if (!profileError && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
            isAuthorized = true
          }
        }
      }
    }

    if (!isAuthorized) {
      console.warn('[PUSH] Unauthorized attempt to invoke push notification function')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
    console.log('[PUSH] Received webhook payload:', JSON.stringify(payload))

    // Handle database trigger payload (.record or .new) or direct body
    const record = payload.record || payload.new || payload

    if (!record) {
      return new Response(
        JSON.stringify({ success: false, error: 'No record found in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id, user_id, title, message, type, data, tag_key, tag_value, broadcast } = record

    if (!tag_key && !broadcast && (!user_id || !title || !message)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing user_id/tag_key/broadcast, title, or message in record' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')

    let notificationTarget: any = {}
    if (broadcast === true || broadcast === 'true') {
      console.log('[PUSH] Sending broadcast notification to all subscribed users')
      notificationTarget = {
        included_segments: ['Subscribed Users']
      }
    } else if (tag_key) {
      console.log(`[PUSH] Sending tag-based notification for key: ${tag_key} = ${tag_value || 'true'}`)
      notificationTarget = {
        filters: [
          { field: 'tag', key: tag_key, relation: '=', value: tag_value || 'true' }
        ]
      }
    } else {
      // Try to get the direct subscription ID from the users table for most reliable delivery
      let subscriptionId: string | null = null

      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user_id}&select=onesignal_subscription_id`, {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          const dbData = await dbRes.json()
          subscriptionId = dbData?.[0]?.onesignal_subscription_id || null
          console.log(`[PUSH] DB subscription_id for user ${user_id}: ${subscriptionId}`)
        } catch (dbErr) {
          console.warn('[PUSH] Failed to fetch subscription_id from DB:', dbErr)
        }
      }

      if (subscriptionId) {
        // Most reliable: target by direct OneSignal subscription ID
        console.log(`[PUSH] Targeting by direct subscription_id: ${subscriptionId}`)
        notificationTarget = {
          include_subscription_ids: [subscriptionId]
        }
      } else {
        // Fallback: target by external_id (works if OneSignal.login(userId) was called on client)
        console.log(`[PUSH] Fallback: targeting by external_id: ${user_id}`)
        notificationTarget = {
          include_aliases: {
            external_id: [user_id],
          }
        }
      }
    }

    let targetUrl = 'https://ozomart.store/'
    let parsedData = data
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data)
      } catch (_) {}
    }

    if (type === 'rider_assignment' || type === 'captain_order_alert') {
      targetUrl = 'https://ozomart.store/rider-dashboard'
    } else if (type === 'admin_order_alert') {
      targetUrl = 'https://ozomart.store/admin/orders'
    } else if (type === 'mart_order_alert') {
      targetUrl = 'https://ozomart.store/mart'
    } else if (type === 'order_status') {
      const orderId = parsedData?.order_id
      targetUrl = orderId ? `https://ozomart.store/order/${orderId}` : 'https://ozomart.store/orders'
    } else if (parsedData?.url) {
      targetUrl = parsedData.url
    }

    console.log(`[PUSH] Resolved deep-link target URL: ${targetUrl}`)

    // ── Instant Telegram Admin Bot Alert (Fail-Proof Offline Channel) ──
    if (type === 'admin_order_alert') {
      try {
        let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        let chatId = Deno.env.get('TELEGRAM_CHAT_ID')

        // If not in env, check database app_settings table for telegram_config
        if ((!botToken || !chatId) && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.telegram_config&select=value`, {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json()
            const cfg = settingsData?.[0]?.value
            if (cfg && cfg.enabled !== false) {
              botToken = botToken || cfg.bot_token
              chatId = chatId || cfg.chat_id
            }
          }
        }

        if (botToken && chatId) {
          console.log('[PUSH] Sending instant Telegram alert for admin order...')
          const orderNum = parsedData?.order_number || ''
          const totalVal = parsedData?.total ? `₹${parsedData.total}` : ''
          const teleText = `🚨 *NEW OZO MART ORDER RECEIVED!*\n\n*${title}*\n${message}\n\n🛒 Order: *#${orderNum}*\n💵 Total: *${totalVal}*\n\n👉 [Open Admin Orders Panel](${targetUrl})`
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: teleText,
              parse_mode: 'Markdown',
              disable_web_page_preview: false
            })
          })
          console.log('[PUSH] Telegram alert dispatched successfully.')
        }
      } catch (tgErr) {
        console.warn('[PUSH] Telegram notification attempt warning:', tgErr)
      }
    }

    // ── Instant CallMeBot WhatsApp Alert (Admin Phone Notification) ──
    if (type === 'admin_order_alert') {
      try {
        let cmbPhone = Deno.env.get('CALLMEBOT_PHONE')
        let cmbApiKey = Deno.env.get('CALLMEBOT_API_KEY')

        // If not in env, check database app_settings table for whatsapp_callmebot_config
        if ((!cmbPhone || !cmbApiKey) && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          const cmbRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.whatsapp_callmebot_config&select=value`, {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          if (cmbRes.ok) {
            const cmbData = await cmbRes.json()
            const cfg = cmbData?.[0]?.value
            if (cfg && cfg.enabled !== false) {
              cmbPhone = cmbPhone || cfg.phone
              cmbApiKey = cmbApiKey || cfg.apikey || cfg.api_key
            }
          }
        }

        if (cmbPhone && cmbApiKey) {
          console.log('[PUSH] Dispatching WhatsApp alert via CallMeBot...')
          const orderNum = parsedData?.order_number || ''
          const totalVal = parsedData?.total ? `₹${parsedData.total}` : ''
          const cleanPhone = String(cmbPhone).replace(/[^0-9+]/g, '')
          
          const rawMessage = `🚨 *NEW OZO ORDER RECEIVED!* 🚨\n\n*${title}*\n${message}\n\n🛒 Order: *#${orderNum}*\n💵 Total: *${totalVal}*\n\n👉 *View Order:* ${targetUrl}`
          const encodedText = encodeURIComponent(rawMessage)
          
          const cmbUrl = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedText}&apikey=${cmbApiKey}`
          const cmbFetchRes = await fetch(cmbUrl)
          console.log(`[PUSH] CallMeBot response status: ${cmbFetchRes.status}`)
        }
      } catch (cmbErr) {
        console.warn('[PUSH] CallMeBot dispatch warning:', cmbErr)
      }
    }

    // ── FCM Integration: Send push notification to target user's active device tokens ──
    const isFcmAllowed = !!user_id
    let fcmSendResults: any[] = []
    
    if (isFcmAllowed && user_id && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const fcmDbRes = await fetch(`${SUPABASE_URL}/rest/v1/user_fcm_tokens?user_id=eq.${user_id}&select=token`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        })
        if (fcmDbRes.ok) {
          const fcmDbData = await fcmDbRes.json()
          const fcmTokens = fcmDbData?.map((t: any) => t.token) || []
          console.log(`[PUSH] Found ${fcmTokens.length} FCM tokens for user ${user_id}`)
          
          if (fcmTokens.length > 0) {
            const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
            const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')
            const projectId = Deno.env.get('FIREBASE_PROJECT_ID')
            
            if (clientEmail && privateKey && projectId) {
              // Clean up private key quotes and escaped newlines
              let formattedPrivateKey = privateKey.trim()
              if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
                formattedPrivateKey = formattedPrivateKey.slice(1, -1)
              }
              formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')

              const { GoogleAuth } = await import("npm:google-auth-library")
              const auth = new GoogleAuth({
                credentials: {
                  client_email: clientEmail,
                  private_key: formattedPrivateKey,
                },
                scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
              })
              const client = await auth.getClient()
              const tokenResponse = await client.getAccessToken()
              const accessToken = tokenResponse.token

              for (const token of fcmTokens) {
                try {
                  const fcmSendRes = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      message: {
                        token: token,
                        notification: {
                          title: title,
                          body: message,
                        },
                        data: {
                          notification_id: id || '',
                          type: type || 'order_status',
                          order_id: parsedData?.order_id || '',
                          url: targetUrl,
                        },
                        webpush: {
                          headers: {
                            Urgency: 'high',
                          },
                          notification: {
                            title: title,
                            body: message,
                            icon: 'https://ozomart.store/apple-touch-icon.png',
                            badge: 'https://ozomart.store/logo_bag_only.png',
                            click_action: targetUrl,
                          },
                          data: {
                            notification_id: id || '',
                            type: type || 'order_status',
                            order_id: parsedData?.order_id || '',
                            url: targetUrl,
                          },
                        },
                      },
                    }),
                  })
                  const fcmResData = await fcmSendRes.json()
                  console.log(`[PUSH] FCM send response for token ${token.slice(0, 8)}...:`, JSON.stringify(fcmResData))
                  fcmSendResults.push({
                    token_prefix: token.slice(0, 10) + '...',
                    status: fcmSendRes.status,
                    response: fcmResData
                  })
                } catch (sendErr: any) {
                  console.error('[PUSH] FCM token send error:', sendErr)
                  fcmSendResults.push({
                    token_prefix: token.slice(0, 10) + '...',
                    error: sendErr.message || String(sendErr)
                  })
                }
              }
            } else {
              console.warn('[PUSH] FCM credentials missing in environment. FCM skipped.')
              fcmSendResults.push({ error: 'FCM credentials missing in environment.' })
            }
          } else {
            fcmSendResults.push({ info: 'No FCM tokens registered for user.' })
          }
        } else {
          fcmSendResults.push({ error: `Failed to query FCM tokens from DB: status ${fcmDbRes.status}` })
        }
      } catch (fcmErr: any) {
        console.error('[PUSH] FCM query/send lifecycle failed:', fcmErr)
        fcmSendResults.push({ error: fcmErr.message || String(fcmErr) })
      }
    }

    // ── OneSignal Push Integration ──
    let oneSignalResponse: any = null
    if (ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY) {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          ...notificationTarget,
          target_channel: 'push',
          headings: {
            en: title,
          },
          contents: {
            en: message,
          },
          web_url: targetUrl,
          app_url: targetUrl,
          data: {
            notification_id: id || null,
            type: type || 'info',
            ...(typeof parsedData === 'object' ? parsedData : {}),
          },
        }),
      })

      oneSignalResponse = await response.json()
      console.log('[PUSH] OneSignal Response:', JSON.stringify(oneSignalResponse))

      if (!response.ok) {
        console.warn(`[PUSH] OneSignal API Non-fatal Error: ${oneSignalResponse.errors?.[0] || 'Unknown error'}`)
      }
    } else {
      console.log('[PUSH] OneSignal credentials not configured. Skipping OneSignal push.')
    }

    return new Response(
      JSON.stringify({ success: true, oneSignalResponse, fcmResults: fcmSendResults }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[PUSH] Error sending push notification:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
