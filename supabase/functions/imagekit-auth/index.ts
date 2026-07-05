import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check environment variable first
    let privateKey = Deno.env.get('IMAGEKIT_PRIVATE_KEY');

    // 2. Fallback: Fetch from Database Vault via secure RPC using service role client
    if (!privateKey) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { data, error } = await supabase.rpc('get_decrypted_secret', {
          secret_name: 'imagekit_private_key'
        });

        if (!error && data) {
          privateKey = data;
        } else {
          console.error('[ImageKit Auth] Error loading secret from Vault:', error);
        }
      }
    }

    if (!privateKey) {
      return new Response(
        JSON.stringify({ error: 'IMAGEKIT_PRIVATE_KEY is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token: unique string (random UUID)
    const token = crypto.randomUUID();
    
    // Expire: timestamp in seconds (5 minutes from now)
    const expire = Math.floor(Date.now() / 1000) + 300;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(privateKey);
    const messageData = encoder.encode(token + expire);

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Sign the message
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // Convert buffer to hex string
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return new Response(
      JSON.stringify({
        token,
        expire,
        signature
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[ImageKit Auth] Error generating token:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
