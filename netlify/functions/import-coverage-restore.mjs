// Ball603 Coverage Data Import - ONE TIME USE
// Run this once to restore coverage assignments from CSV
// Delete after use

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const body = await request.json();
    const { games } = body;
    
    if (!games || !Array.isArray(games)) {
      return new Response(JSON.stringify({ error: 'games array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    let updated = 0;
    let errors = [];
    
    for (const game of games) {
      // Only update if has coverage data
      if (!game.game_id) continue;
      if (!game.photog1 && !game.photog2 && !game.videog && !game.writer && 
          !game.photos_url && !game.recap_url && !game.highlights_url && !game.live_stream_url) {
        continue;
      }
      
      const updateData = {};
      if (game.photog1) updateData.photog1 = game.photog1;
      if (game.photog2) updateData.photog2 = game.photog2;
      if (game.videog) updateData.videog = game.videog;
      if (game.writer) updateData.writer = game.writer;
      if (game.notes) updateData.notes = game.notes;
      if (game.photos_url) updateData.photos_url = game.photos_url;
      if (game.recap_url) updateData.recap_url = game.recap_url;
      if (game.highlights_url) updateData.highlights_url = game.highlights_url;
      if (game.live_stream_url) updateData.live_stream_url = game.live_stream_url;
      if (game.original_date) updateData.original_date = game.original_date;
      if (game.schedule_changed === 'YES') updateData.schedule_changed = true;
      if (game.gamedescription) updateData.game_description = game.gamedescription;
      if (game.specialevent) updateData.special_event = game.specialevent;
      
      if (Object.keys(updateData).length === 0) continue;
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(game.game_id)}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updateData)
          }
        );
        
        if (response.ok) {
          updated++;
        } else {
          errors.push({ game_id: game.game_id, error: await response.text() });
        }
      } catch (err) {
        errors.push({ game_id: game.game_id, error: err.message });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      updated,
      errors: errors.length,
      errorDetails: errors.slice(0, 10)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
