// Ball603 Manual Score Entry API
// Allows contributors to enter scores via /finalscore page

export default async (request) => {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { game_id, away_score, home_score, time } = await request.json();
    
    // Validate inputs
    if (!game_id) {
      return new Response(JSON.stringify({ error: 'game_id is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase config');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First, get the current game to preserve original_time if needed
    const getResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(game_id)}&select=time,original_time`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    if (!getResponse.ok) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const games = await getResponse.json();
    if (!games || games.length === 0) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentGame = games[0];

    // Build update data
    let updateData = {};

    // If resetting to 0-0 (null scores), restore original time
    if (away_score === null && home_score === null) {
      updateData = {
        away_score: null,
        home_score: null,
        time: currentGame?.original_time || 'TBD'
      };
    } else {
      // Saving a score
      updateData = {
        away_score: parseInt(away_score) || 0,
        home_score: parseInt(home_score) || 0,
        time: time || 'FINAL'
      };

      // If this game doesn't have original_time saved yet, save current time
      // (only if current time isn't already FINAL)
      if (!currentGame?.original_time && currentGame?.time && !currentGame.time.includes('FINAL')) {
        updateData.original_time = currentGame.time;
      }
    }

    // Update the game
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(game_id)}`,
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

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Supabase update error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to update game' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      game_id,
      away_score: updateData.away_score,
      home_score: updateData.home_score,
      time: updateData.time
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Update score error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
