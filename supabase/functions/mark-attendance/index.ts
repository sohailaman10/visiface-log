import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const magnitudeA = Math.sqrt(normA)
  const magnitudeB = Math.sqrt(normB)

  if (magnitudeA === 0 || magnitudeB === 0) return 0

  return dotProduct / (magnitudeA * magnitudeB)
}

// Generate embedding for an image (single AI call)
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    // STEP 1: Generate embedding for scanned face (ONE AI call)
    console.log('Generating embedding for scanned face...')
    const scannedEmbedding = await generateEmbedding(image, LOVABLE_API_KEY)
    console.log(`Scanned embedding: ${scannedEmbedding.length} dimensions`)

    // STEP 2: Fetch all users with embeddings
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, roll_number, class, section, embeddings')

    if (usersError || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No registered users found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 3: Compare locally using cosine similarity (NO AI calls)
    let bestMatch: any = null
    let highestSimilarity = 0

    for (const user of users) {
      const embeddings = user.embeddings as number[][] | null
      if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) continue

      // Compare against all stored embeddings, take the best
      for (const storedEmbedding of embeddings) {
        if (!Array.isArray(storedEmbedding) || storedEmbedding.length !== scannedEmbedding.length) continue

        const similarity = cosineSimilarity(scannedEmbedding, storedEmbedding)
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity
          bestMatch = user
        }
      }
    }

    const confidencePercent = Math.round(highestSimilarity * 100)
    console.log(`Best match: ${bestMatch?.name || 'none'} at ${confidencePercent}% (similarity: ${highestSimilarity.toFixed(4)})`)

    // STEP 4: Threshold check (0.75 = 75%)
    if (highestSimilarity < 0.75 || !bestMatch) {
      return new Response(
        JSON.stringify({ error: 'Face not recognized. Please try again or register first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 5: Prevent duplicate attendance within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', bestMatch.id)
      .gte('timestamp', fiveMinutesAgo)
      .limit(1)

    if (recentAttendance && recentAttendance.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Attendance already marked for ${bestMatch.name} within the last 5 minutes.`,
          name: bestMatch.name,
          roll_number: bestMatch.roll_number,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 6: Record attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        user_id: bestMatch.id,
        name: bestMatch.name,
        roll_number: bestMatch.roll_number,
        class: bestMatch.class,
        section: bestMatch.section,
        confidence: confidencePercent,
        source: 'scanner'
      })
      .select()
      .single()

    if (attendanceError) {
      console.error('Attendance insert error:', attendanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to record attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({
      success: true,
      name: bestMatch.name,
      roll_number: bestMatch.roll_number,
      class: bestMatch.class,
      section: bestMatch.section,
      confidence: confidencePercent,
      attendance
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
    console.error('mark-attendance error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
