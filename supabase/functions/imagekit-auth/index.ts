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

    // Handle POST request for deleting files
    if (req.method === 'POST') {
      try {
        const { action, filePath } = await req.json();
        if (action === 'delete' && filePath) {
          const authHeader = 'Basic ' + btoa(privateKey + ':');
          const imgkitRes = await fetch('https://api.imagekit.io/v1/files/batch/deleteByFilePaths', {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePaths: [filePath]
            })
          });

          if (imgkitRes.ok) {
            const resData = await imgkitRes.json();
            return new Response(
              JSON.stringify({ success: true, data: resData }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const errText = await imgkitRes.text();
            console.error('[ImageKit Auth] Delete API failed:', errText);
            return new Response(
              JSON.stringify({ error: 'ImageKit delete failed', details: errText }),
              { status: imgkitRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (postErr: any) {
        console.error('[ImageKit Auth] POST error:', postErr);
        return new Response(
          JSON.stringify({ error: postErr.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
