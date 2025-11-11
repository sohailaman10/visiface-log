import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()
    
    console.log(`Login attempt for: ${email}`)

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simple check for demo purposes
    // In production, use proper password hashing with bcrypt
    if (email === 'sohailaman@gmail.com' && password === 'admin123') {
      // Create JWT token
      const key = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-256' },
        true,
        ['sign', 'verify']
      )

      const token = await create(
        { alg: 'HS256', typ: 'JWT' },
        { email, role: 'admin', exp: Date.now() / 1000 + 86400 }, // 24 hours
        key
      )

      console.log(`Login successful for: ${email}`)

      return new Response(
        JSON.stringify({ token, email }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Invalid credentials for: ${email}`)

    return new Response(
      JSON.stringify({ error: 'Invalid email or password' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})