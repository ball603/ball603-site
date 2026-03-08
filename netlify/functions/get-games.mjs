// Ball603 Get Games API
// Returns schedule data from Supabase with team abbreviations for public display
// Supports multi-sport filtering (defaults to basketball for backward compatibility)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Default sport and season for backward compatibility
const DEFAULT_SPORT = 'basketball';
const DEFAULT_SEASON = '2025-26';

export default async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    // Build query for games
    const queryParts = ['select=*'];
    
    // Sport filtering
    // If sport parameter is explicitly provided, filter by it
    // If not provided, return ALL sports (for multi-sport pages)
    if (params.sport) {
      queryParts.push(`sport=eq.${encodeURIComponent(params.sport)}`);
    }
    
    // Season filtering  
    // If season parameter is explicitly provided, filter by it
    // If not provided, return current seasons for all sports
    // (This allows multi-sport pages to show basketball 2025-26 AND baseball 2026)
    if (params.season) {
      queryParts.push(`season=eq.${encodeURIComponent(params.season)}`);
    } else {
      // Return current seasons: basketball 2025-26 OR baseball 2026
      queryParts.push(`season=in.("2025-26","2026")`);
    }
    
    // Filter by date range
    if (params.start_date) {
      queryParts.push(`date=gte.${params.start_date}`);
    }
    if (params.end_date) {
      queryParts.push(`date=lte.${params.end_date}`);
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
    
    // Filter by team
    if (params.team) {
      const team = encodeURIComponent(params.team);
      queryParts.push(`or=(home_team.eq.${team},away_team.eq.${team})`);
    }
    
    // Order by date
    queryParts.push('order=date.asc,time.asc');
    
    // Fetch games from Supabase
    const gamesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?${queryParts.join('&')}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Range': '0-9999'
        }
      }
    );
    
    if (!gamesResponse.ok) {
      throw new Error(`Supabase error: ${gamesResponse.status}`);
    }
    
    const gamesData = await gamesResponse.json();
    
    // Fetch teams for abbreviations
    const teamsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/teams?select=shortname,abbrev`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    
    let teamsMap = {};
    if (teamsResponse.ok) {
      const teamsData = await teamsResponse.json();
      teamsData.forEach(t => {
        if (t.shortname && t.abbrev) {
          teamsMap[t.shortname] = t.abbrev;
        }
      });
    }
    
    // Map to expected format for schedule.html and contributors.html
    const games = gamesData.map(game => ({
      game_id: game.game_id || '',
      date: game.date || '',
      time: game.time || '',
      status: game.status || '',
      original_time: game.original_time || '',
      away: game.away_team || '',
      away_abbrev: teamsMap[game.away_team] || (game.away_team || '').substring(0, 3).toUpperCase(),
      away_score: game.away_score ?? '',
      home: game.home_team || '',
      home_abbrev: teamsMap[game.home_team] || (game.home_team || '').substring(0, 3).toUpperCase(),
      home_score: game.home_score ?? '',
      gender: game.gender || '',
      level: game.level || '',
      division: game.division || '',
      sport: game.sport || 'basketball',
      season: game.season || '2025-26',
      photog1: game.photog1 || '',
      photog2: game.photog2 || '',
      videog: game.videog || '',
      writer: game.writer || '',
      notes: game.notes || '',
      coverage_confirmed: game.coverage_confirmed || false,
      scorebook_url: game.scorebook_url || '',
      original_date: game.original_date || '',
      schedule_changed: game.schedule_changed ? 'YES' : '',
      photos_url: game.photos_url || '',
      recap_url: game.recap_url || '',
      highlights_url: game.highlights_url || '',
      live_stream_url: game.live_stream_url || '',
      gamedescription: game.game_description || '',
      specialevent: game.special_event || '',
      // Playoff fields
      is_playoff: game.is_playoff || false,
      round: game.round || null,
      bracket_position: game.bracket_position || null,
      home_seed: game.home_seed || null,
      away_seed: game.away_seed || null,
      game_status: game.game_status || null
    }));
    
    return new Response(JSON.stringify({ games, teamsLoaded: Object.keys(teamsMap).length }), {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
    
  } catch (error) {
    console.error('Get games error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    });
  }
};
