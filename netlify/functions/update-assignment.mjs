// Update game assignments (photog1, photog2, videog, writer, notes, schedule_changed)
// Updated to use Supabase instead of Google Sheets

// Allowed fields that can be updated
const ALLOWED_FIELDS = [
  'photog1',
  'photog2', 
  'videog',
  'writer',
  'notes',
  'original_date',
  'schedule_changed',
  'photos_url',
  'recap_url',
  'highlights_url',
  'live_stream_url',
  'gamedescription',
  'specialevent'
];

export default async (request) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { gameId, field, value } = await request.json();
    
    // Validate request
    if (!gameId || !field) {
      return new Response(JSON.stringify({ error: 'Invalid request - missing gameId or field' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!ALLOWED_FIELDS.includes(field)) {
      return new Response(JSON.stringify({ error: `Invalid field: ${field}` }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update the specific field for this game
    const updateData = {};
    updateData[field] = value || '';
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/games?game_id=eq.${encodeURIComponent(gameId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Supabase update failed: ${response.status} - ${error}`);
      return new Response(JSON.stringify({ error: 'Database update failed' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if any rows were updated (Supabase returns empty on PATCH with return=minimal)
    // We need to verify the game exists
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/games?game_id=eq.${encodeURIComponent(gameId)}&select=game_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    const checkData = await checkResponse.json();
    
    if (!checkData || checkData.length === 0) {
      return new Response(JSON.stringify({ error: 'Game not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error updating assignment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
