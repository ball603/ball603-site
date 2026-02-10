// Ball603 Get Standings API
// Returns standings data from Supabase via REST API
// Supports multi-sport filtering (defaults to basketball for backward compatibility)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Default sport and season for backward compatibility
const DEFAULT_SPORT = 'basketball';
const DEFAULT_SEASON = '2025-26';

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  try {
    const url = new URL(request.url);
    
    // Sport and season filtering (with defaults for backward compatibility)
    const sport = url.searchParams.get('sport') || DEFAULT_SPORT;
    const season = url.searchParams.get('season') || DEFAULT_SEASON;
    
    // Build query URL
    // NOTE: Basketball legacy data has sport=NULL, so we need to include both
    // For other sports, use strict filtering
    let queryUrl;
    
    if (sport === 'basketball') {
      // Basketball: include sport='basketball' OR sport=NULL (legacy data)
      queryUrl = `${SUPABASE_URL}/rest/v1/standings?select=*&or=(sport.eq.basketball,sport.is.null)&season=eq.${encodeURIComponent(season)}&order=rating.desc`;
    } else {
      // Other sports: strict filtering by sport value
      queryUrl = `${SUPABASE_URL}/rest/v1/standings?select=*&sport=eq.${encodeURIComponent(sport)}&season=eq.${encodeURIComponent(season)}&order=rating.desc`;
    }
    
    console.log(`Fetching standings: sport=${sport}, season=${season}`);
    
    const response = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    const standings = await response.json();
    
    console.log(`Retrieved ${standings.length} standings records for ${sport} ${season}`);
    
    return new Response(JSON.stringify({ 
      standings: standings || [],
      sport,
      season
    }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Get standings error:', error);
    return new Response(JSON.stringify({ error: error.message, standings: [] }), {
      status: 200,
      headers
    });
  }
};
