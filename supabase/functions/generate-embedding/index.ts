import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { image } = await req.json()
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured')
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
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

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API error:', response.status, errorText)
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new Error('Empty response from AI model')
    }

    // Parse the embedding - handle markdown code blocks
    let cleanContent = content
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const embedding = JSON.parse(cleanContent)

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding format: not an array')
    }

    // Validate all values are numbers
    const validEmbedding = embedding.map((v: any) => {
      const num = Number(v)
      if (isNaN(num)) throw new Error('Invalid embedding: contains non-numeric values')
      return num
    })

    console.log(`Generated embedding with ${validEmbedding.length} dimensions`)

    return new Response(
      JSON.stringify({ embedding: validEmbedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error generating embedding:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate embedding' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
