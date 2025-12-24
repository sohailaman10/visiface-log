import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple token validation (in production, verify JWT properly)
    const token = authHeader.replace('Bearer ', '');
    if (!token || token.length < 10) {
      console.log('Invalid token format');
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, roll_number } = await req.json();
    console.log('Delete request received:', { user_id, roll_number });

    if (!user_id && !roll_number) {
      return new Response(
        JSON.stringify({ error: 'user_id or roll_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the user first
    let userQuery = supabase.from('users').select('*');
    if (user_id) {
      userQuery = userQuery.eq('id', user_id);
    } else {
      userQuery = userQuery.eq('roll_number', roll_number);
    }
    
    const { data: user, error: findError } = await userQuery.maybeSingle();

    if (findError) {
      console.error('Error finding user:', findError);
      return new Response(
        JSON.stringify({ error: 'Failed to find user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found user to delete:', user.name, user.roll_number);

    // Delete related attendance records first
    const { error: attendanceDeleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('user_id', user.id);

    if (attendanceDeleteError) {
      console.error('Error deleting attendance records:', attendanceDeleteError);
      // Continue anyway, attendance might not have user_id set
    }

    // Delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully deleted user:', user.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Student ${user.name} (${user.roll_number}) deleted successfully` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete user error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
