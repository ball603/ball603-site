// Ball603 Get Games API
// Returns schedule data from Supabase with team abbreviations for public display

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
      specialevent: game.special_event || ''
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
