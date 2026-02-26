/**
 * Mark Attendance Edge Function
 * Accepts a 128D face embedding vector (NOT an image).
 * Computes cosine similarity against all stored embeddings.
 * NO AI API calls — pure mathematical matching.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMBEDDING_DIM = 128
const SIMILARITY_THRESHOLD = 0.75

// Cosine similarity: dot(A,B) / (|A| * |B|)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const len = Math.min(vecA.length, vecB.length)
  if (len === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const magA = Math.sqrt(normA)
  const magB = Math.sqrt(normB)
  if (magA === 0 || magB === 0) return 0

  return dotProduct / (magA * magB)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { embedding } = await req.json()

    // Validate embedding input
    if (!embedding || !Array.isArray(embedding) || embedding.length < 64 || embedding.length > 256) {
      return new Response(
        JSON.stringify({ error: 'Invalid embedding. Must be a numeric array of 64-256 dimensions.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate all values are numbers
    for (const v of embedding) {
      if (typeof v !== 'number' || isNaN(v)) {
        return new Response(
          JSON.stringify({ error: 'Embedding contains non-numeric values.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all users with embeddings
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, roll_number, class, section, embeddings')

    if (usersError || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No registered users found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find best match using cosine similarity (NO AI calls)
    let bestMatch: any = null
    let highestSimilarity = 0

    for (const user of users) {
      const storedEmbeddings = user.embeddings as number[][] | null
      if (!storedEmbeddings || !Array.isArray(storedEmbeddings)) continue

      for (const stored of storedEmbeddings) {
        if (!Array.isArray(stored) || stored.length === 0) continue
        const similarity = cosineSimilarity(embedding, stored)
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity
          bestMatch = user
        }
      }
    }

    const confidencePercent = Math.round(highestSimilarity * 100)
    console.log(`Best match: ${bestMatch?.name || 'none'} at ${confidencePercent}%`)

    // Threshold check
    if (highestSimilarity < SIMILARITY_THRESHOLD || !bestMatch) {
      return new Response(
        JSON.stringify({ error: 'Face not recognized. Please try again or register first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent duplicate attendance within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', bestMatch.id)
      .gte('timestamp', fiveMinutesAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Attendance already marked for ${bestMatch.name} within the last 5 minutes.`,
          name: bestMatch.name,
          roll_number: bestMatch.roll_number,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record attendance
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
    console.error('mark-attendance error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
