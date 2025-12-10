// Ball603 Update Assignment API
// Updates game assignments (photog1, photog2, videog, writer, notes, coverage_confirmed, scorebook_url) in Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Valid fields that can be updated via this endpoint
const VALID_FIELDS = ['photog1', 'photog2', 'videog', 'writer', 'notes', 'schedule_changed', 'coverage_confirmed', 'scorebook_url'];

export default async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { gameId, field, value } = await request.json();
    
    // Validate request
    if (!gameId) {
      return new Response(JSON.stringify({ error: 'gameId is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!field || !VALID_FIELDS.includes(field)) {
      return new Response(JSON.stringify({ error: `Invalid field. Must be one of: ${VALID_FIELDS.join(', ')}` }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Build update data
    const updateData = {};
    if (field === 'schedule_changed' || field === 'coverage_confirmed') {
      updateData[field] = value === 'YES' || value === 'true' || value === true;
    } else {
      updateData[field] = value || null;
    }
    
    // Update the game in Supabase by game_id
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(gameId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return new Response(JSON.stringify({ error: `Database error: ${response.status}` }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const result = await response.json();
    
    if (!result || result.length === 0) {
      return new Response(JSON.stringify({ error: 'Game not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: true, updated: result[0] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error updating assignment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
