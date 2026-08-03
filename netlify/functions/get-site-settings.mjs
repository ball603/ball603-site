// Ball603 Get Site Settings API
// Returns site configuration and feature flags for frontend
// Used for multi-sport feature toggles

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Settings keys that are safe to expose publicly
const PUBLIC_SETTINGS = [
  'multi_sport_enabled',
  'basketball_enabled',
  'baseball_enabled',
  'gvolleyball_enabled',
  'current_sport',
  'current_season'
];

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  try {
    // Fetch all public settings
    const keysFilter = PUBLIC_SETTINGS.map(k => `"${k}"`).join(',');
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?key=in.(${keysFilter})&select=key,value`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    const settingsArray = await response.json();
    
    // Convert array to object and parse JSON values
    const settings = {};
    for (const item of settingsArray) {
      try {
        // Values are stored as JSON strings in Supabase
        settings[item.key] = JSON.parse(item.value);
      } catch {
        // If not valid JSON, use raw value
        settings[item.key] = item.value;
      }
    }
    
    // Provide defaults for any missing settings
    const defaults = {
      multi_sport_enabled: false,
      basketball_enabled: true,
      baseball_enabled: false,
      gvolleyball_enabled: false,
      current_sport: 'basketball',
      current_season: '2025-26'
    };
    
    // Merge defaults with fetched settings
    const finalSettings = { ...defaults, ...settings };
    
    // Build list of enabled sports for convenience
    const enabledSports = [];
    if (finalSettings.basketball_enabled) enabledSports.push('basketball');
    if (finalSettings.baseball_enabled) enabledSports.push('baseball');
    if (finalSettings.gvolleyball_enabled) enabledSports.push('gvolleyball');

    // Fetch seasons from the seasons table for the frontend dropdown
    let seasonsList = [];
    try {
      const seasonsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/seasons?select=sport,season,is_current,scraper_active,finalized_at&order=sport.asc,created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      if (seasonsRes.ok) {
        seasonsList = await seasonsRes.json();
      }
    } catch {
      // Non-fatal — frontend falls back to season-config.js hardcoded values
    }

    // Group seasons by sport: { basketball: ['2025-26'], baseball: ['2026'], ... }
    const seasonsBySport = {};
    for (const row of seasonsList) {
      if (!seasonsBySport[row.sport]) seasonsBySport[row.sport] = [];
      seasonsBySport[row.sport].push(row.season);
    }
    
    return new Response(JSON.stringify({
      settings: finalSettings,
      enabledSports,
      seasons: seasonsBySport,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Get site settings error:', error);
    
    // Return defaults on error so site doesn't break
    return new Response(JSON.stringify({
      settings: {
        multi_sport_enabled: false,
        basketball_enabled: true,
        baseball_enabled: false,
        gvolleyball_enabled: false,
        current_sport: 'basketball',
        current_season: '2025-26'
      },
      enabledSports: ['basketball'],
      error: error.message
    }), {
      status: 200,
      headers
    });
  }
};
