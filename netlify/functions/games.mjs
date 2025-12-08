// Ball603 Games API - Supabase REST API
// Handles CRUD operations for games/schedule data

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation'
  };
  
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export default async (request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    // GET - Fetch games
    if (request.method === 'GET') {
      const queryParts = [];
      
      // Filter by date range
      if (params.start_date) {
        queryParts.push(`date=gte.${params.start_date}`);
      }
      if (params.end_date) {
        queryParts.push(`date=lte.${params.end_date}`);
      }
      
      // Filter by specific date
      if (params.date) {
        queryParts.push(`date=eq.${params.date}`);
      }
      
      // Filter by level, division, gender
      if (params.level) {
        queryParts.push(`level=eq.${encodeURIComponent(params.level)}`);
      }
      if (params.division) {
        queryParts.push(`division=eq.${encodeURIComponent(params.division)}`);
      }
      if (params.gender) {
        queryParts.push(`gender=eq.${encodeURIComponent(params.gender)}`);
      }
      
      // Filter by team (home or away)
      if (params.team) {
        const team = encodeURIComponent(params.team);
        queryParts.push(`or=(home_team.eq.${team},away_team.eq.${team})`);
      }
      
      // Filter by status
      if (params.status) {
        queryParts.push(`status=eq.${encodeURIComponent(params.status)}`);
      }
      
      // Filter by coverage assignment
      if (params.has_coverage === 'true') {
        queryParts.push(`or=(photog1.neq.,photog2.neq.,videog.neq.,writer.neq.)`);
      }
      if (params.needs_coverage === 'true') {
        queryParts.push(`photog1=is.null`);
        queryParts.push(`photog2=is.null`);
      }
      
      // Search
      if (params.search) {
        const search = encodeURIComponent(`%${params.search}%`);
        queryParts.push(`or=(home_team.ilike.${search},away_team.ilike.${search},game_description.ilike.${search})`);
      }
      
      // Ordering
      queryParts.push('order=date.asc,time.asc');
      
      // Limit
      if (params.limit) {
        queryParts.push(`limit=${params.limit}`);
      }
      
      const endpoint = `games?${queryParts.join('&')}`;
      const data = await supabaseRequest(endpoint);
      
      // Single game request by id or game_id
      if (params.id) {
        const game = await supabaseRequest(`games?id=eq.${params.id}`);
        return new Response(JSON.stringify(game[0] || null), {
          status: game[0] ? 200 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (params.game_id) {
        const game = await supabaseRequest(`games?game_id=eq.${encodeURIComponent(params.game_id)}`);
        return new Response(JSON.stringify(game[0] || null), {
          status: game[0] ? 200 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // POST - Create or bulk upsert games
    if (request.method === 'POST') {
      const body = await request.json();
      
      // Bulk upsert for scrapers and CSV import
      if (body.games && Array.isArray(body.games)) {
        const results = { inserted: 0, updated: 0, errors: [] };
        
        // Process in batches of 100 for speed
        const batchSize = 100;
        const games = body.games;
        
        for (let i = 0; i < games.length; i += batchSize) {
          const batch = games.slice(i, i + batchSize);
          
          // Prepare batch for upsert
          const upsertData = batch.map(game => ({
            game_id: game.game_id,
            date: game.date,
            time: game.time || null,
            away_team: game.away_team || game.away,
            home_team: game.home_team || game.home,
            away_score: game.away_score ? parseInt(game.away_score) : null,
            home_score: game.home_score ? parseInt(game.home_score) : null,
            gender: game.gender || null,
            level: game.level || null,
            division: game.division || null,
            status: game.time === 'FINAL' ? 'final' : (game.status || 'scheduled'),
            photog1: game.photog1 || null,
            photog2: game.photog2 || null,
            videog: game.videog || null,
            writer: game.writer || null,
            photos_url: game.photos_url || null,
            recap_url: game.recap_url || null,
            highlights_url: game.highlights_url || null,
            live_stream_url: game.live_stream_url || null,
            notes: game.notes || null,
            game_description: game.game_description || game.gamedescription || null,
            special_event: game.special_event || game.specialevent || null,
            original_date: game.original_date || null,
            schedule_changed: game.schedule_changed === 'YES' || game.schedule_changed === true
          }));
          
          try {
            // Use Supabase upsert with on_conflict
            const url = `${SUPABASE_URL}/rest/v1/games?on_conflict=game_id`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=representation'
              },
              body: JSON.stringify(upsertData)
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Batch ${i}-${i+batchSize} error:`, errorText);
              results.errors.push({ batch: `${i}-${i+batchSize}`, error: errorText });
            } else {
              const data = await response.json();
              // Count is approximate since upsert doesn't tell us insert vs update
              results.inserted += data.length;
            }
          } catch (err) {
            console.error(`Batch ${i}-${i+batchSize} error:`, err.message);
            results.errors.push({ batch: `${i}-${i+batchSize}`, error: err.message });
          }
        }
        
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Single game insert
      const data = await supabaseRequest('games', {
        method: 'POST',
        body: body
      });
      
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // PUT - Update game
    if (request.method === 'PUT') {
      const id = params.id;
      if (!id) {
        return new Response(JSON.stringify({ error: 'Game ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const body = await request.json();
      
      // If updating scores and both are present, set status to final
      if (body.away_score !== undefined && body.home_score !== undefined && 
          body.away_score !== null && body.home_score !== null) {
        body.status = 'final';
        body.time = 'FINAL';
      }
      
      const data = await supabaseRequest(`games?id=eq.${id}`, {
        method: 'PATCH',
        body: body
      });
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // DELETE - Delete game
    if (request.method === 'DELETE') {
      const id = params.id;
      if (!id) {
        return new Response(JSON.stringify({ error: 'Game ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      await supabaseRequest(`games?id=eq.${id}`, {
        method: 'DELETE'
      });
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Games API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};
