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
    const { image } = await req.json()
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all registered users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')

    if (usersError || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No registered users found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Attempting to match face against ${users.length} registered users`)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    let bestMatch: any = null
    let highestConfidence = 0

    // Compare with each user's reference images using AI
    for (const user of users) {
      const referenceImages = user.reference_images as string[]
      
      // Use first 3 reference images for comparison
      for (let i = 0; i < Math.min(3, referenceImages.length); i++) {
        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Compare these two face images. Are they the same person? Respond with ONLY a number between 0-100 representing confidence percentage. If they are clearly the same person, respond with a high number (80-100). If they are different people, respond with a low number (0-30). If uncertain, respond with a medium number (40-60).'
                    },
                    {
                      type: 'image_url',
                      image_url: { url: image }
                    },
                    {
                      type: 'image_url',
                      image_url: { url: referenceImages[i] }
                    }
                  ]
                }
              ]
            })
          })

          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const data = await response.json()
          const confidenceText = data.choices?.[0]?.message?.content?.trim()
          const confidence = parseInt(confidenceText) || 0

          console.log(`Comparison with ${user.name} (image ${i+1}): ${confidence}%`)

          if (confidence > highestConfidence) {
            highestConfidence = confidence
            bestMatch = user
          }
        } catch (error) {
          console.error(`Error comparing with user ${user.name}:`, error)
        }
      }
    }

    // Threshold for accepting a match
    if (highestConfidence < 70) {
      console.log(`No match found. Highest confidence: ${highestConfidence}%`)
      return new Response(
        JSON.stringify({ error: 'Face not recognized. Please try again or register first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Match found: ${bestMatch.name} with ${highestConfidence}% confidence`)

    // Record attendance
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
      console.error('Failed to record attendance:', attendanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to record attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        name: bestMatch.name,
        roll_number: bestMatch.roll_number,
        class: bestMatch.class,
        section: bestMatch.section,
        confidence: highestConfidence,
        attendance
      }),
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