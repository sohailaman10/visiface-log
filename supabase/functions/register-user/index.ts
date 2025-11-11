import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { name, roll_number, class: studentClass, section, images } = await req.json()
    
    console.log(`Registration request for: ${name} (${roll_number})`)

    if (!name || !roll_number || !studentClass || !section || !images || images.length < 20) {
      return new Response(
        JSON.stringify({ error: 'All fields required and 20 images needed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if roll number already exists
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

    // Store user with reference images
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        roll_number,
        class: studentClass,
        section,
        reference_images: images
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

    console.log(`Successfully registered user: ${name}`)

    return new Response(
      JSON.stringify({ success: true, user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})