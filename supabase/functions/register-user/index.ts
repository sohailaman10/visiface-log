import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Generate face embedding from image using Gemini
async function generateEmbedding(image: string, apiKey: string): Promise<number[]> {
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
          {
            type: 'text',
            text: 'Analyze this face image and generate a facial embedding vector. Extract key facial features (face shape, eye spacing, nose width, jaw line, forehead height, cheekbone position, lip shape, eyebrow arch, etc.) and encode them as a numeric vector. Return ONLY a JSON array of exactly 128 floating point numbers between -1 and 1. No explanation, no markdown, just the raw JSON array.'
          },
          { type: 'image_url', image_url: { url: image } }
        ]
      }],
      temperature: 0,
    })
  })

  if (response.status === 429) throw new Error('API_429')
  if (response.status === 402) throw new Error('API_402')
  if (!response.ok) throw new Error(`AI API error: ${response.status}`)

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')

  // Clean markdown code blocks
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const embedding = JSON.parse(content)
  if (!Array.isArray(embedding)) throw new Error('Invalid embedding format')

  return embedding.map((v: any) => {
    const num = Number(v)
    if (isNaN(num)) throw new Error('Non-numeric embedding value')
    return num
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { name, roll_number, class: studentClass, section, images } = await req.json()

    console.log(`Registration request for: ${name} (${roll_number})`)

    // Validate: now only 3 images required
    if (!name || !roll_number || !studentClass || !section || !images || images.length < 3) {
      return new Response(
        JSON.stringify({ error: 'All fields required and at least 3 face images needed' }),
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    // Generate embeddings for each image (3 AI calls with delays to avoid rate limits)
    console.log(`Generating embeddings for ${images.length} images...`)
    const embeddings: number[][] = []

    for (let i = 0; i < images.length; i++) {
      try {
        const embedding = await generateEmbedding(images[i], LOVABLE_API_KEY)
        embeddings.push(embedding)
        console.log(`Embedding ${i + 1}/${images.length} generated (${embedding.length} dims)`)

        // Small delay between calls to avoid rate limits
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (e: any) {
        if (e.message === 'API_429' || e.message === 'API_402') throw e
        console.error(`Failed to generate embedding for image ${i + 1}:`, e)
        // Continue with remaining images
      }
    }

    if (embeddings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate any face embeddings. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store user with reference images and embeddings
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        roll_number,
        class: studentClass,
        section,
        reference_images: images,
        embeddings: embeddings,
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
    if (error.message === 'API_429') {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (error.message === 'API_402') {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
