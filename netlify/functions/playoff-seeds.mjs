/**
 * Ball603 Playoff Seeds API
 * 
 * Manages playoff seeding and bracket generation
 * 
 * GET ?gender=Boys&division=D-I&season=2025-26
 *   Returns seeds for a tournament (or empty if not locked)
 * 
 * POST { action: 'lock', gender, division, season, seeds: [...] }
 *   Locks seeds and generates bracket games
 * 
 * POST { action: 'unlock', gender, division, season }
 *   Unlocks a bracket (deletes seeds and playoff games) - requires confirmation
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Tournament schedule data (from NHIAA Winter 2025-26)
const TOURNAMENT_SCHEDULE = {
  'Boys': {
    'D-I': {
      prelims: { date: '2026-03-04', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-03-07', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-03-11', times: ['5:30 PM', '7:30 PM'], site: 'Rochester Rec Center' },
      final: { date: '2026-03-15', time: '4:00 PM', site: 'UNH' }
    },
    'D-II': {
      prelims: { date: '2026-03-03', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-03-06', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-03-09', times: ['5:30 PM', '7:30 PM'], site: 'Rochester Rec Center' },
      final: { date: '2026-03-15', time: '12:00 PM', site: 'UNH' }
    },
    'D-III': {
      prelims: { date: '2026-02-17', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-02-20', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-02-24', times: ['5:30 PM', '7:30 PM'], site: 'TBD' },
      final: { date: '2026-02-28', time: '4:00 PM', site: 'Keene State College' }
    },
    'D-IV': {
      prelims: { date: '2026-02-23', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-02-26', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-03-02', times: ['5:30 PM', '7:30 PM'], site: 'TBD' },
      final: { date: '2026-03-07', time: '3:00 PM', site: 'Colby Sawyer College' }
    }
  },
  'Girls': {
    'D-I': {
      prelims: { date: '2026-03-02', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-03-05', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-03-09', times: ['5:30 PM', '7:30 PM'], site: 'TBD' },
      final: { date: '2026-03-14', time: '4:00 PM', site: 'UNH' }
    },
    'D-II': {
      prelims: { date: '2026-03-04', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-03-07', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-03-11', times: ['5:30 PM', '7:30 PM'], site: 'TBD' },
      final: { date: '2026-03-14', time: '12:00 PM', site: 'UNH' }
    },
    'D-III': {
      prelims: { date: '2026-02-18', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-02-21', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-02-25', times: ['5:30 PM', '7:30 PM'], site: 'Bow High School' },
      final: { date: '2026-02-28', time: '1:00 PM', site: 'Keene State College' }
    },
    'D-IV': {
      prelims: { date: '2026-02-24', time: '6:00 PM', site: 'Higher Seed' },
      quarters: { date: '2026-02-27', time: '6:00 PM', site: 'Higher Seed' },
      semis: { date: '2026-03-03', times: ['5:30 PM', '7:30 PM'], site: 'TBD' },
      final: { date: '2026-03-07', time: '1:00 PM', site: 'Colby Sawyer College' }
    }
  }
};

// Standard 16-team bracket matchups (seed vs seed)
// Position 1-8 for prelims, each position feeds into quarters
const BRACKET_MATCHUPS = [
  { position: 1, high: 1, low: 16 },  // Winner -> Quarters pos 1
  { position: 2, high: 8, low: 9 },   // Winner -> Quarters pos 1
  { position: 3, high: 4, low: 13 },  // Winner -> Quarters pos 2
  { position: 4, high: 5, low: 12 },  // Winner -> Quarters pos 2
  { position: 5, high: 2, low: 15 },  // Winner -> Quarters pos 3
  { position: 6, high: 7, low: 10 },  // Winner -> Quarters pos 3
  { position: 7, high: 3, low: 14 },  // Winner -> Quarters pos 4
  { position: 8, high: 6, low: 11 }   // Winner -> Quarters pos 4
];

// Helper: Make Supabase request
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
  
  if (options.method === 'DELETE' || options.prefer === 'return=minimal') {
    return { success: true };
  }
  
  return response.json();
}

// Get team slug for game_id generation
function teamSlug(name) {
  if (!name) return 'tbd';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Generate a unique game_id for playoff games
function generateGameId(season, gender, division, round, position) {
  const seasonSlug = season.replace('-', '');
  const genderSlug = gender.toLowerCase().charAt(0);
  const divSlug = division.replace('-', '').toLowerCase();
  const roundSlug = round.toLowerCase();
  return `playoff_${seasonSlug}_${genderSlug}_${divSlug}_${roundSlug}_${position}`;
}

// Calculate vs playoff teams record for a team
async function calculateVsPlayoffTeams(team, gender, division, season, qualifyingTeams) {
  // Get all completed games for this team
  const games = await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&is_playoff=eq.false&or=(home_team.eq.${encodeURIComponent(team)},away_team.eq.${encodeURIComponent(team)})&home_score=not.is.null&away_score=not.is.null`,
    { headers: { 'Range': '0-999' } }
  );
  
  let wins = 0, losses = 0;
  
  for (const game of games) {
    const isHome = game.home_team === team;
    const opponent = isHome ? game.away_team : game.home_team;
    
    // Check if opponent is in the playoff field (same division)
    if (!qualifyingTeams.has(opponent)) continue;
    
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    
    if (teamScore > oppScore) wins++;
    else if (oppScore > teamScore) losses++;
  }
  
  return { wins, losses };
}

// Lock seeds and generate bracket games
async function lockSeeds(gender, division, season, seeds) {
  const schedule = TOURNAMENT_SCHEDULE[gender]?.[division];
  if (!schedule) {
    throw new Error(`No schedule found for ${gender} ${division}`);
  }
  
  const numTeams = seeds.length;
  if (numTeams < 14 || numTeams > 16) {
    throw new Error(`Invalid number of teams: ${numTeams}. Expected 14-16.`);
  }
  
  const byes = 16 - numTeams;
  const now = new Date().toISOString();
  
  // Build set of qualifying teams for vs-playoff calculation
  const qualifyingTeams = new Set(seeds.map(s => s.team));
  
  // Step 1: Get current standings/RPI for each team to snapshot
  const standingsData = await supabaseRequest(
    `standings?season=eq.${season}&gender=eq.${gender}&division=eq.${division}`,
    { headers: { 'Range': '0-99' } }
  );
  
  const standingsMap = new Map();
  standingsData.forEach(s => standingsMap.set(s.school, s));
  
  // Get RPI rankings
  const rpiData = await supabaseRequest(
    `rpi_rankings?gender=eq.${gender}&division=eq.${division}&order=week_of.desc`,
    { headers: { 'Range': '0-99' } }
  );
  
  const rpiMap = new Map();
  rpiData.forEach(r => {
    if (!rpiMap.has(r.team)) {
      rpiMap.set(r.team, r);
    }
  });
  
  // Step 2: Build seed records with frozen stats
  const seedRecords = [];
  
  for (const seed of seeds) {
    const standing = standingsMap.get(seed.team) || {};
    const rpi = rpiMap.get(seed.team) || {};
    const vsPlayoff = await calculateVsPlayoffTeams(seed.team, gender, division, season, qualifyingTeams);
    
    seedRecords.push({
      season,
      gender,
      division,
      seed: seed.seed,
      team: seed.team,
      reg_season_wins: standing.wins || 0,
      reg_season_losses: standing.losses || 0,
      final_rpi_rank: rpi.rank || null,
      final_rating: standing.rating || null,
      vs_playoff_wins: vsPlayoff.wins,
      vs_playoff_losses: vsPlayoff.losses,
      locked_at: now
    });
  }
  
  // Step 3: Insert seed records
  await supabaseRequest('playoff_seeds', {
    method: 'POST',
    body: JSON.stringify(seedRecords),
    prefer: 'return=minimal'
  });
  
  // Step 4: Generate bracket games
  const games = [];
  const seedMap = new Map(seeds.map(s => [s.seed, s.team]));
  
  // Prelims (first round)
  for (const matchup of BRACKET_MATCHUPS) {
    const highSeed = matchup.high;
    const lowSeed = matchup.low;
    
    // Check if this is a bye
    const isBye = lowSeed > numTeams;
    
    // For byes: high seed gets bye, no game created for prelims
    // They'll appear directly in quarters
    if (isBye) continue;
    
    const highTeam = seedMap.get(highSeed);
    const lowTeam = seedMap.get(lowSeed);
    
    // Higher seed is home team
    games.push({
      game_id: generateGameId(season, gender, division, 'prelims', matchup.position),
      season,
      sport: 'basketball',
      level: 'NHIAA',
      gender,
      division,
      date: schedule.prelims.date,
      time: schedule.prelims.time,
      home_team: highTeam,
      away_team: lowTeam,
      home_seed: highSeed,
      away_seed: lowSeed,
      location: `${highTeam} HS`,
      is_playoff: true,
      round: 'Prelims',
      bracket_position: matchup.position
    });
  }
  
  // Quarters
  for (let pos = 1; pos <= 4; pos++) {
    const prelimPos1 = (pos - 1) * 2 + 1;
    const prelimPos2 = (pos - 1) * 2 + 2;
    
    // Determine if either feeder game is a bye
    const matchup1 = BRACKET_MATCHUPS.find(m => m.position === prelimPos1);
    const matchup2 = BRACKET_MATCHUPS.find(m => m.position === prelimPos2);
    
    const isBye1 = matchup1.low > numTeams;
    const isBye2 = matchup2.low > numTeams;
    
    let homeTeam = null, homeSeed = null;
    let awayTeam = null, awaySeed = null;
    
    // If matchup 1 is a bye, the high seed goes directly to quarters as home
    if (isBye1) {
      homeTeam = seedMap.get(matchup1.high);
      homeSeed = matchup1.high;
    }
    
    // If matchup 2 is a bye, that high seed is the away team
    if (isBye2) {
      awayTeam = seedMap.get(matchup2.high);
      awaySeed = matchup2.high;
    }
    
    games.push({
      game_id: generateGameId(season, gender, division, 'quarters', pos),
      season,
      sport: 'basketball',
      level: 'NHIAA',
      gender,
      division,
      date: schedule.quarters.date,
      time: schedule.quarters.time,
      home_team: homeTeam,
      away_team: awayTeam,
      home_seed: homeSeed,
      away_seed: awaySeed,
      location: homeTeam ? `${homeTeam} HS` : 'TBD',
      is_playoff: true,
      round: 'Quarters',
      bracket_position: pos
    });
  }
  
  // Semis
  for (let pos = 1; pos <= 2; pos++) {
    // Lower seed plays first game (5:30), higher seed plays primetime (7:30)
    // We'll set the time based on which semi this is after teams are known
    // For now, use placeholder
    games.push({
      game_id: generateGameId(season, gender, division, 'semis', pos),
      season,
      sport: 'basketball',
      level: 'NHIAA',
      gender,
      division,
      date: schedule.semis.date,
      time: schedule.semis.times[pos - 1], // Will be adjusted based on seeds
      home_team: null,
      away_team: null,
      home_seed: null,
      away_seed: null,
      location: schedule.semis.site,
      is_playoff: true,
      round: 'Semis',
      bracket_position: pos
    });
  }
  
  // Final
  games.push({
    game_id: generateGameId(season, gender, division, 'final', 1),
    season,
    sport: 'basketball',
    level: 'NHIAA',
    gender,
    division,
    date: schedule.final.date,
    time: schedule.final.time,
    home_team: null,
    away_team: null,
    home_seed: null,
    away_seed: null,
    location: schedule.final.site,
    is_playoff: true,
    round: 'Final',
    bracket_position: 1
  });
  
  // Insert all games
  await supabaseRequest('games', {
    method: 'POST',
    body: JSON.stringify(games),
    prefer: 'return=minimal'
  });
  
  return {
    success: true,
    seeded: seedRecords.length,
    gamesCreated: games.length,
    byes
  };
}

// Unlock a bracket (delete seeds and games)
async function unlockBracket(gender, division, season) {
  // Delete playoff games
  await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&is_playoff=eq.true`,
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  
  // Delete seeds
  await supabaseRequest(
    `playoff_seeds?season=eq.${season}&gender=eq.${gender}&division=eq.${division}`,
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  
  return { success: true };
}

// Get seeds for a tournament
async function getSeeds(gender, division, season) {
  const seeds = await supabaseRequest(
    `playoff_seeds?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&order=seed.asc`
  );
  
  // Also get the bracket games
  const games = await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&is_playoff=eq.true&order=round.asc,bracket_position.asc`
  );
  
  return {
    locked: seeds.length > 0,
    seeds,
    games,
    lockedAt: seeds.length > 0 ? seeds[0].locked_at : null
  };
}

// Get current standings (for pre-lock preview)
async function getStandingsPreview(gender, division, season) {
  // Get standings sorted by rating
  const standings = await supabaseRequest(
    `standings?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&order=rating.desc`,
    { headers: { 'Range': '0-99' } }
  );
  
  // Get RPI rankings
  const rpiData = await supabaseRequest(
    `rpi_rankings?gender=eq.${gender}&division=eq.${division}&order=week_of.desc`,
    { headers: { 'Range': '0-99' } }
  );
  
  const rpiMap = new Map();
  rpiData.forEach(r => {
    if (!rpiMap.has(r.team)) {
      rpiMap.set(r.team, r);
    }
  });
  
  // Determine tournament spots
  const tournamentSpots = standings.length > 0 ? standings[0].tournament_spots : 16;
  
  // Build preview with seeds
  const preview = standings.slice(0, tournamentSpots).map((team, index) => {
    const rpi = rpiMap.get(team.school) || {};
    return {
      seed: index + 1,
      team: team.school,
      wins: team.wins,
      losses: team.losses,
      rating: team.rating,
      rpiRank: rpi.rank || null,
      qualifies: team.qualifies
    };
  });
  
  return {
    tournamentSpots,
    totalTeams: standings.length,
    bracketSize: 16,
    byes: 16 - tournamentSpots,
    preview
  };
}

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }
  
  try {
    const url = new URL(request.url);
    
    if (request.method === 'GET') {
      const gender = url.searchParams.get('gender');
      const division = url.searchParams.get('division');
      const season = url.searchParams.get('season') || '2025-26';
      const preview = url.searchParams.get('preview') === 'true';
      
      if (!gender || !division) {
        return new Response(JSON.stringify({ error: 'gender and division required' }), {
          status: 400, headers
        });
      }
      
      if (preview) {
        const result = await getStandingsPreview(gender, division, season);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }
      
      const result = await getSeeds(gender, division, season);
      return new Response(JSON.stringify(result), { status: 200, headers });
    }
    
    if (request.method === 'POST') {
      const body = await request.json();
      const { action, gender, division, season = '2025-26', seeds } = body;
      
      if (!gender || !division) {
        return new Response(JSON.stringify({ error: 'gender and division required' }), {
          status: 400, headers
        });
      }
      
      if (action === 'lock') {
        if (!seeds || !Array.isArray(seeds) || seeds.length < 14) {
          return new Response(JSON.stringify({ error: 'seeds array required (14-16 teams)' }), {
            status: 400, headers
          });
        }
        
        const result = await lockSeeds(gender, division, season, seeds);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }
      
      if (action === 'unlock') {
        const result = await unlockBracket(gender, division, season);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }
      
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers
    });
    
  } catch (error) {
    console.error('Playoff seeds error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers
    });
  }
};
