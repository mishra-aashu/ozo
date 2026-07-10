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
    // Security check: Verify that request comes from our database trigger using a secret
    // or from an authorized Admin user's Supabase Auth session.
    const webhookSecret = req.headers.get('X-Webhook-Secret')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET') || 'OzoSecret123!'
    
    let isAuthorized = false
    
    if (webhookSecret && webhookSecret === expectedSecret) {
      isAuthorized = true
    } else {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ungxccwdondssatixzlz.supabase.co'
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
        
        if (SUPABASE_SERVICE_KEY && SUPABASE_ANON_KEY) {
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
            
            if (!profileError && profile?.role === 'admin') {
              isAuthorized = true
            }
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

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || "4ce733f1-af1f-4692-9dfa-4e8758fb4374"
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (!ONESIGNAL_REST_API_KEY) {
      console.error('[PUSH] ONESIGNAL_REST_API_KEY is not set in environment secrets')
      return new Response(
        JSON.stringify({ success: false, error: 'ONESIGNAL_REST_API_KEY environment secret is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ungxccwdondssatixzlz.supabase.co'
      const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      let subscriptionId: string | null = null

      if (SUPABASE_SERVICE_KEY) {
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

    // FCM Integration: Send push notification to target user's active device tokens
    const isFcmAllowed = 
      title === 'Rider is Rushing! 🛵' || 
      title === 'Delivered! 🎉' || 
      type === 'mart_order_alert' || 
      title === '📦 New Order for Your Mart!'
    
    if (isFcmAllowed && user_id) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ungxccwdondssatixzlz.supabase.co'
      const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (SUPABASE_SERVICE_KEY) {
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
              
              if (clientEmail && privateKey) {
                const { GoogleAuth } = await import("npm:google-auth-library")
                const auth = new GoogleAuth({
                  credentials: {
                    client_email: clientEmail,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                  },
                  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
                })
                const client = await auth.getClient()
                const tokenResponse = await client.getAccessToken()
                const accessToken = tokenResponse.token
                const projectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'ozo-efcc9'

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
                          },
                          webpush: {
                            headers: {
                              Urgency: 'high',
                            },
                            notification: {
                              icon: '/apple-touch-icon.png',
                              badge: '/logo_bag_only.png',
                              click_action: targetUrl,
                            },
                          },
                        },
                      }),
                    })
                    const fcmResData = await fcmSendRes.json()
                    console.log(`[PUSH] FCM send response for token ${token.slice(0, 8)}...:`, JSON.stringify(fcmResData))
                  } catch (sendErr) {
                    console.error('[PUSH] FCM token send error:', sendErr)
                  }
                }
              } else {
                console.warn('[PUSH] FCM credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are missing in environment. FCM skipped.')
              }
            }
          }
        } catch (fcmErr) {
          console.error('[PUSH] FCM query/send lifecycle failed:', fcmErr)
        }
      }
    }

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

    const responseData = await response.json()
    console.log('[PUSH] OneSignal Response:', JSON.stringify(responseData))

    if (!response.ok) {
      throw new Error(`OneSignal API Error: ${responseData.errors?.[0] || 'Unknown error'}`)
    }

    return new Response(
      JSON.stringify({ success: true, oneSignalResponse: responseData }),
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
