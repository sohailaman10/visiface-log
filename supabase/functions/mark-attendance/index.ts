import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function compareFace(image: string, referenceImage: string, apiKey: string): Promise<number> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Are these two face images the same person? Reply ONLY with a number 0-100 for confidence.' },
          { type: 'image_url', image_url: { url: image } },
          { type: 'image_url', image_url: { url: referenceImage } }
        ]
      }]
    })
  })

  if (response.status === 429 || response.status === 402) {
    throw new Error(`API_${response.status}`)
  }

  const data = await response.json()
  return parseInt(data.choices?.[0]?.message?.content?.trim()) || 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { image } = await req.json()
    if (!image) {
      return new Response(JSON.stringify({ error: 'Image required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: users, error: usersError } = await supabase.from('users').select('*')
    if (usersError || !users || users.length === 0) {
      return new Response(JSON.stringify({ error: 'No registered users found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    console.log(`Matching against ${users.length} users (optimized: 1 image each, parallel)`)

    // Phase 1: Compare 1 reference image per user, in parallel batches of 3
    let bestMatch: any = null
    let highestConfidence = 0
    const BATCH_SIZE = 3

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      if (highestConfidence >= 85) break // Early exit

      const batch = users.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (user) => {
          const refs = user.reference_images as string[]
          if (!refs || refs.length === 0) return { user, confidence: 0 }
          try {
            const confidence = await compareFace(image, refs[0], LOVABLE_API_KEY!)
            console.log(`${user.name}: ${confidence}%`)
            return { user, confidence }
          } catch (e: any) {
            if (e.message === 'API_429') throw e
            if (e.message === 'API_402') throw e
            console.error(`Error comparing ${user.name}:`, e)
            return { user, confidence: 0 }
          }
        })
      )

      for (const r of results) {
        if (r.confidence > highestConfidence) {
          highestConfidence = r.confidence
          bestMatch = r.user
        }
      }

      // Add small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < users.length && highestConfidence < 85) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    if (highestConfidence < 70) {
      return new Response(JSON.stringify({ error: 'Face not recognized. Please try again or register first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`Match: ${bestMatch.name} at ${highestConfidence}%`)

    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        user_id: bestMatch.id,
        name: bestMatch.name,
        roll_number: bestMatch.roll_number,
        class: bestMatch.class,
        section: bestMatch.section,
        confidence: highestConfidence,
        source: 'scanner'
      })
      .select()
      .single()

    if (attendanceError) {
      return new Response(JSON.stringify({ error: 'Failed to record attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      success: true,
      name: bestMatch.name,
      roll_number: bestMatch.roll_number,
      class: bestMatch.class,
      section: bestMatch.section,
      confidence: highestConfidence,
      attendance
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    if (error.message === 'API_429') {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (error.message === 'API_402') {
      return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
