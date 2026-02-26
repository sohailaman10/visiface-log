/**
 * Register User Edge Function
 * Accepts pre-computed face embeddings (NOT images).
 * Embeddings are generated client-side by face-api.js.
 * NO AI API calls needed.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { name, roll_number, class: studentClass, section, embeddings } = await req.json()

    console.log(`Registration request for: ${name} (${roll_number})`)

    // Validate required fields
    if (!name || !roll_number || !studentClass || !section) {
      return new Response(
        JSON.stringify({ error: 'All fields are required (name, roll_number, class, section)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate embeddings
    if (!embeddings || !Array.isArray(embeddings) || embeddings.length < 3) {
      return new Response(
        JSON.stringify({ error: 'At least 3 face embeddings are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate each embedding is a numeric array
    for (let i = 0; i < embeddings.length; i++) {
      const emb = embeddings[i]
      if (!Array.isArray(emb) || emb.length < 64) {
        return new Response(
          JSON.stringify({ error: `Invalid embedding at index ${i}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      for (const v of emb) {
        if (typeof v !== 'number' || isNaN(v)) {
          return new Response(
            JSON.stringify({ error: `Non-numeric value in embedding ${i}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check for existing roll number
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('roll_number', roll_number)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Roll number already registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store user with embeddings (no images needed)
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        roll_number,
        class: studentClass,
        section,
        reference_images: [], // No images stored
        embeddings,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to register user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully registered ${name} with ${embeddings.length} embeddings`)

    return new Response(
      JSON.stringify({ success: true, user, embeddingsCount: embeddings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
