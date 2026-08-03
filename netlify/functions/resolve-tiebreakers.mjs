/**
 * Ball603 Resolve Tiebreakers API
 * 
 * Endpoint for client-side tiebreaker resolution.
 * Returns resolved tie groups with step-by-step reasoning for UI display.
 * 
 * GET ?gender=Boys&division=D-I&season=2025-26
 *   Returns all tie groups with resolved orders and steps
 */

import {
  normalizeTeamName,
  walkTiebreakers,
  findTieGroups,
  buildTournamentTeamsSet,
  processGamesForTiebreakers
} from './tiebreakers.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Playoff teams by sport/gender/division
const PLAYOFF_TEAMS = {
  basketball: {
    Boys: { 'D-I': 15, 'D-II': 14, 'D-III': 15, 'D-IV': 16 },
    Girls: { 'D-I': 16, 'D-II': 14, 'D-III': 14, 'D-IV': 16 }
  },
  baseball: {
    Boys: { 'D-I': 16, 'D-II': 14, 'D-III': 14, 'D-IV': 14 }
  },
  gvolleyball: {
    Girls: { 'D-I': 16, 'D-II': 14, 'D-III': 14 }
  }
};

/**
 * Make Supabase request
 */
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

/**
 * Resolve tiebreakers for a given gender/division
 */
async function resolveTiebreakersForDivision(gender, division, season, sport = 'basketball') {
  // Get standings sorted by rating — filter by sport
  // Basketball legacy rows may have sport=null so include both
  const sportFilter = sport === 'basketball'
    ? `or=(sport.eq.basketball,sport.is.null)`
    : `sport=eq.${encodeURIComponent(sport)}`;
  const standings = await supabaseRequest(
    `standings?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&${sportFilter}&order=rating.desc,wins.desc,losses.asc,school.asc`,
    { headers: { 'Range': '0-99' } }
  );
  
  if (standings.length === 0) {
    return { tieGroups: [], standings: [] };
  }
  
  // Normalize team names in standings
  standings.forEach(s => {
    s.school = normalizeTeamName(s.school);
  });
  
  // Get playoff spots for this division
  let playoffSpots = 16;
  if (PLAYOFF_TEAMS[sport] && PLAYOFF_TEAMS[sport][gender]) {
    playoffSpots = PLAYOFF_TEAMS[sport][gender][division] || 16;
  }
  
  // Get ALL completed games for this gender (for tiebreakers)
  const gamesData = await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&sport=eq.${sport}&home_score=not.is.null&away_score=not.is.null`,
    { headers: { 'Range': '0-9999' } }
  );
  
  // Process games for tiebreaker evaluation
  const allGames = processGamesForTiebreakers(gamesData, gender);
  
  // Get division teams set
  const divTeams = new Set(standings.map(s => s.school));
  
  // Get tournament teams set (includes all teams tied for last position per NHIAA rules)
  const tournamentTeams = buildTournamentTeamsSet(standings, playoffSpots);
  
  // Build ratings map
  const teamRatings = {};
  standings.forEach(s => {
    teamRatings[s.school] = s.rating;
  });
  
  // Find tie groups
  const tieGroups = findTieGroups(standings, playoffSpots);
  
  // Resolve each tie group
  const resolvedTieGroups = tieGroups.map(group => {
    const resolution = walkTiebreakers(
      group.teams,
      allGames,           // Division games for H2H, vs tournament, etc.
      allGames,           // All games for total home/away wins
      tournamentTeams,
      divTeams,
      group.teamRatings,  // Use the tie group's local ratings
      standings            // Full division standings for Criterion 8
    );
    
    return {
      ...group,
      resolution
    };
  });
  
  return {
    tieGroups: resolvedTieGroups,
    standings: standings.map(s => ({
      school: s.school,
      wins: s.wins,
      losses: s.losses,
      rating: s.rating
    })),
    playoffSpots,
    tournamentTeams: Array.from(tournamentTeams)
  };
}

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60' // Cache for 1 minute
  };
  
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers
    });
  }
  
  try {
    const url = new URL(request.url);
    const gender = url.searchParams.get('gender');
    const division = url.searchParams.get('division');
    const season = url.searchParams.get('season') || '2025-26';
    const sport = url.searchParams.get('sport') || 'basketball';
    
    if (!gender || !division) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: gender and division' 
      }), { status: 400, headers });
    }
    
    const result = await resolveTiebreakersForDivision(gender, division, season, sport);
    
    return new Response(JSON.stringify(result), { status: 200, headers });
    
  } catch (error) {
    console.error('Resolve tiebreakers error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { status: 500, headers });
  }
};
