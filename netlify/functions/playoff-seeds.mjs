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

import {
  normalizeTeamName,
  resolveTiebreakerOrder,
  findTieGroups,
  buildTournamentTeamsSet,
  processGamesForTiebreakers
} from './tiebreakers.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RATING_TOLERANCE = 0.0005; // Must match tiebreakers.mjs

// Tournament schedule data, keyed by sport then gender then division.
// Baseball dates are PLACEHOLDERS — update with actual NHIAA dates when announced.
const TOURNAMENT_SCHEDULE = {
  basketball: {
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
  },
  baseball: {
    'Boys': {
      'D-I': {
        prelims: { date: '2026-06-03', time: '4:00 PM', site: 'Home of Higher Seed' },
        quarters: { date: '2026-06-06', time: '4:00 PM', site: 'Home of Higher Seed' },
        semis: { date: '2026-06-10', times: ['4:00 PM', '7:00 PM'], site: 'Holman Stadium (Nashua, NH)' },
        final: { date: '2026-06-13', time: 'TBA', site: 'Northeast Delta Dental Stadium' }
      },
      'D-II': {
        prelims: { date: '2026-06-03', time: '4:00 PM', site: 'Home of Higher Seed' },
        quarters: { date: '2026-06-06', time: '4:00 PM', site: 'Home of Higher Seed' },
        semis: { date: '2026-06-10', times: ['4:00 PM', '7:00 PM'], site: 'Memorial Field (Concord, NH)' },
        final: { date: '2026-06-13', time: 'TBA', site: 'Northeast Delta Dental Stadium' }
      },
      'D-III': {
        prelims: { date: '2026-06-03', time: '4:00 PM', site: 'Home of Higher Seed' },
        quarters: { date: '2026-06-06', time: '4:00 PM', site: 'Home of Higher Seed' },
        semis: { date: '2026-06-09', times: ['4:00 PM', '7:00 PM'], site: 'Robbie Mills Park (Laconia, NH)' },
        final: { date: '2026-06-13', time: 'TBA', site: 'Northeast Delta Dental Stadium' }
      },
      'D-IV': {
        prelims: { date: '2026-06-03', time: '4:00 PM', site: 'Home of Higher Seed' },
        quarters: { date: '2026-06-06', time: '4:00 PM', site: 'Home of Higher Seed' },
        semis: { date: '2026-06-10', times: ['4:00 PM', '7:00 PM'], site: 'Robbie Mills Park (Laconia, NH)' },
        final: { date: '2026-06-13', time: 'TBA', site: 'Northeast Delta Dental Stadium' }
      }
    }
  }
};

// Helper: lookup tournament schedule for sport/gender/division with a clear error
function getTournamentSchedule(sport, gender, division) {
  const schedule = TOURNAMENT_SCHEDULE[sport]?.[gender]?.[division];
  if (!schedule) {
    throw new Error(`No tournament schedule found for ${sport} ${gender} ${division}`);
  }
  return schedule;
}

// Helper: default season per sport (baseball uses single-year, basketball uses span)
function defaultSeasonForSport(sport) {
  return sport === 'baseball' ? '2026' : '2025-26';
}

// Helper: backward-compatible sport filter for games queries.
// Basketball games may have null sport (legacy), so use OR. Baseball is strict.
function gameSportFilter(sport) {
  return sport === 'basketball'
    ? 'or=(sport.eq.basketball,sport.is.null)'
    : `sport=eq.${sport}`;
}

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
async function calculateVsPlayoffTeams(team, gender, division, season, qualifyingTeams, sport) {
  const sportFilter = gameSportFilter(sport);
  // Get all completed games for this team
  const games = await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&${sportFilter}&is_playoff=eq.false&or=(home_team.eq.${encodeURIComponent(team)},away_team.eq.${encodeURIComponent(team)})&home_score=not.is.null&away_score=not.is.null`,
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

// Project seeds (publish as projected, no games created)
async function projectSeeds(gender, division, season, seeds, sport) {
  const numTeams = seeds.length;
  if (numTeams < 13 || numTeams > 16) {
    throw new Error(`Invalid number of teams: ${numTeams}. Expected 13-16.`);
  }
  
  const now = new Date().toISOString();
  
  // Build set of qualifying teams for vs-playoff calculation
  const qualifyingTeams = new Set(seeds.map(s => s.team));
  
  // Get current standings/RPI for each team to snapshot
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
  
  // Build seed records with frozen stats
  const seedRecords = [];
  
  for (const seed of seeds) {
    const standing = standingsMap.get(seed.team) || {};
    const rpi = rpiMap.get(seed.team) || {};
    const vsPlayoff = await calculateVsPlayoffTeams(seed.team, gender, division, season, qualifyingTeams, sport);
    
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
      status: 'projected',
      projected_at: now
    });
  }
  
  // Delete any existing seeds first (in case updating a projection)
  await supabaseRequest(
    `playoff_seeds?season=eq.${season}&gender=eq.${gender}&division=eq.${division}`,
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  
  // Insert seed records
  await supabaseRequest('playoff_seeds', {
    method: 'POST',
    body: JSON.stringify(seedRecords),
    prefer: 'return=minimal'
  });
  
  return {
    success: true,
    projected: seedRecords.length,
    byes: 16 - numTeams
  };
}

// Lock seeds and generate bracket games
async function lockSeeds(gender, division, season, seeds, sport) {
  const schedule = getTournamentSchedule(sport, gender, division);
  
  const numTeams = seeds.length;
  if (numTeams < 13 || numTeams > 16) {
    throw new Error(`Invalid number of teams: ${numTeams}. Expected 13-16.`);
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
    const vsPlayoff = await calculateVsPlayoffTeams(seed.team, gender, division, season, qualifyingTeams, sport);
    
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
      status: 'locked',
      locked_at: now
    });
  }
  
  // Step 3: Delete any existing playoff games for this bracket
  await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&is_playoff=eq.true`,
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  
  // Step 4: Delete any existing seeds (in case upgrading from projected)
  await supabaseRequest(
    `playoff_seeds?season=eq.${season}&gender=eq.${gender}&division=eq.${division}`,
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  
  // Step 5: Insert seed records
  await supabaseRequest('playoff_seeds', {
    method: 'POST',
    body: JSON.stringify(seedRecords),
    prefer: 'return=minimal'
  });
  
  // Step 6: Generate bracket games
  const games = [];
  const seedMap = new Map(seeds.map(s => [s.seed, s.team]));
  
  // Prelims (first round)
  for (const matchup of BRACKET_MATCHUPS) {
    const highSeed = matchup.high;
    const lowSeed = matchup.low;
    
    // Check if this is a bye
    const isBye = lowSeed > numTeams;
    
    const highTeam = seedMap.get(highSeed);
    
    if (isBye) {
      // Create a bye game entry (no away team)
      games.push({
        game_id: generateGameId(season, gender, division, 'prelims', matchup.position),
        season,
        sport,
        level: 'NHIAA',
        gender,
        division,
        date: schedule.prelims.date,
        time: 'BYE',
        home_team: highTeam,
        away_team: null,
        home_seed: highSeed,
        away_seed: null,
        location: null,
        is_playoff: true,
        round: 'Prelims',
        bracket_position: matchup.position
      });
    } else {
      const lowTeam = seedMap.get(lowSeed);
      
      // Higher seed is home team
      games.push({
        game_id: generateGameId(season, gender, division, 'prelims', matchup.position),
        season,
        sport,
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
    
    // Matchup 1 (odd position = top of pair) → away (top line in bracket display)
    if (isBye1) {
      awayTeam = seedMap.get(matchup1.high);
      awaySeed = matchup1.high;
    }
    
    // Matchup 2 (even position = bottom of pair) → home (bottom line in bracket display)
    if (isBye2) {
      homeTeam = seedMap.get(matchup2.high);
      homeSeed = matchup2.high;
    }
    
    // For quarters at higher seed's home: determine location from the higher seed present
    const locationTeam = (awayTeam && homeTeam) 
      ? ((awaySeed < homeSeed) ? awayTeam : homeTeam) 
      : (awayTeam || homeTeam);
    
    games.push({
      game_id: generateGameId(season, gender, division, 'quarters', pos),
      season,
      sport,
      level: 'NHIAA',
      gender,
      division,
      date: schedule.quarters.date,
      time: schedule.quarters.time,
      home_team: homeTeam,
      away_team: awayTeam,
      home_seed: homeSeed,
      away_seed: awaySeed,
      location: locationTeam ? `${locationTeam} HS` : 'TBD',
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
      sport,
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
    sport,
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
  
  // Determine status: 'none', 'projected', or 'locked'
  let status = 'none';
  if (seeds.length > 0) {
    // Check if any seed has status='projected' (or if status column exists)
    const firstSeed = seeds[0];
    if (firstSeed.status === 'projected') {
      status = 'projected';
    } else {
      // Locked (either explicit status='locked' or legacy records without status column)
      status = 'locked';
    }
  }
  
  return {
    status,
    locked: status === 'locked', // backward compatibility
    seeds,
    games,
    lockedAt: seeds.length > 0 ? seeds[0].locked_at : null,
    projectedAt: status === 'projected' && seeds.length > 0 ? seeds[0].projected_at : null
  };
}

// Get current standings (for pre-lock preview)
async function getStandingsPreview(gender, division, season, allTeams = false, sport = 'basketball') {
  // Get standings sorted by rating, with secondary sorts for deterministic ordering
  const standings = await supabaseRequest(
    `standings?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&order=rating.desc,wins.desc,losses.asc,school.asc`,
    { headers: { 'Range': '0-99' } }
  );
  
  if (standings.length === 0) {
    return { tournamentSpots: 16, totalTeams: 0, bracketSize: 16, byes: 16, preview: [] };
  }
  
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
  const tournamentSpots = standings[0].tournament_spots || 16;
  
  // Get ALL completed games for this gender (for tiebreakers)
  const gamesData = await supabaseRequest(
    `games?season=eq.${season}&gender=eq.${gender}&${gameSportFilter(sport)}&is_playoff=eq.false&home_score=not.is.null&away_score=not.is.null`,
    { headers: { 'Range': '0-9999' } }
  );
  
  // Filter out Bash games and normalize
  const allGames = gamesData.filter(g => {
    const isBash = (g.specialevent || '').toLowerCase().includes('bash') ||
                  (g.gamedescription || '').toLowerCase().includes('bash') ||
                  (g.notes || '').toLowerCase().includes('bash');
    return !isBash;
  }).map(g => ({
    home: normalizeTeamName(g.home_team),
    away: normalizeTeamName(g.away_team),
    homeScore: parseInt(g.home_score),
    awayScore: parseInt(g.away_score),
    division: g.division
  }));
  
  // Division teams set (for criteria 4 & 5)
  const divTeams = new Set(standings.map(s => s.school));
  
  // Tournament teams set (includes all teams tied for last position per NHIAA rules)
  const tournamentTeams = buildTournamentTeamsSet(standings, tournamentSpots);
  
  // Build qualifying standings - must include ALL teams tied at the boundary
  // Per NHIAA: ties at the cutoff are resolved first to determine who qualifies
  let qualifyingStandings = standings.slice(0, tournamentSpots);
  
  // Check if there are teams just outside the cutoff tied with the last qualifier
  // Per NHIAA: a "tie" is determined by Rating, not W-L record
  if (standings.length > tournamentSpots) {
    const lastQualifier = standings[tournamentSpots - 1];
    let expandTo = tournamentSpots;
    while (expandTo < standings.length &&
           Math.abs(standings[expandTo].rating - lastQualifier.rating) < RATING_TOLERANCE) {
      expandTo++;
    }
    if (expandTo > tournamentSpots) {
      // Expand to include all teams tied by rating at the boundary
      qualifyingStandings = standings.slice(0, expandTo);
    }
  }
  
  // Build ratings map
  const teamRatings = {};
  standings.forEach(s => {
    teamRatings[s.school] = s.rating;
  });
  
  // Find tie groups (teams with same Rating) within expanded qualifying
  // Per NHIAA: a "tie for any position" = same Rating, not necessarily same W-L
  const tieGroups = [];
  let i = 0;
  while (i < qualifyingStandings.length) {
    let j = i + 1;
    while (j < qualifyingStandings.length && 
           Math.abs(qualifyingStandings[j].rating - qualifyingStandings[i].rating) < RATING_TOLERANCE) {
      j++;
    }
    if (j - i > 1) {
      // Tie group found
      tieGroups.push({
        startIdx: i,
        teams: qualifyingStandings.slice(i, j).map(s => s.school)
      });
    }
    i = j;
  }
  
  // Apply tiebreaker logic to each group
  for (const group of tieGroups) {
    const resolvedOrder = resolveTiebreakerOrder(
      group.teams,
      allGames,  // all games for H2H etc
      allGames,  // all games for total home/away wins
      tournamentTeams,
      divTeams,
      teamRatings,
      standings  // Full division standings for Criterion 8
    );
    
    // Reorder the qualifying standings at this position
    const originalEntries = {};
    for (let idx = group.startIdx; idx < group.startIdx + group.teams.length; idx++) {
      originalEntries[qualifyingStandings[idx].school] = qualifyingStandings[idx];
    }
    
    resolvedOrder.forEach((team, orderIdx) => {
      const entry = originalEntries[team];
      if (entry) {
        qualifyingStandings[group.startIdx + orderIdx] = entry;
      }
    });
  }
  
  // Trim back to exactly tournamentSpots after boundary ties are resolved
  qualifyingStandings = qualifyingStandings.slice(0, tournamentSpots);
  
  // Choose which teams to show: all teams or just qualifiers
  const teamsToShow = allTeams ? standings : qualifyingStandings;
  
  // Build preview with seeds
  const preview = teamsToShow.map((team, index) => {
    const rpi = rpiMap.get(team.school) || {};
    return {
      seed: index + 1,
      team: team.school,
      wins: team.wins,
      losses: team.losses,
      rating: team.rating,
      rpiRank: rpi.rank || null,
      qualifies: index < tournamentSpots
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
      const sport = url.searchParams.get('sport') || 'basketball';
      const season = url.searchParams.get('season') || defaultSeasonForSport(sport);
      const preview = url.searchParams.get('preview') === 'true';
      const allTeams = url.searchParams.get('allTeams') === 'true';
      
      if (!gender || !division) {
        return new Response(JSON.stringify({ error: 'gender and division required' }), {
          status: 400, headers
        });
      }
      
      if (preview) {
        const result = await getStandingsPreview(gender, division, season, allTeams, sport);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }
      
      const result = await getSeeds(gender, division, season);
      return new Response(JSON.stringify(result), { status: 200, headers });
    }
    
    if (request.method === 'POST') {
      const body = await request.json();
      const sport = body.sport || 'basketball';
      const { action, gender, division, seeds } = body;
      const season = body.season || defaultSeasonForSport(sport);
      
      if (!gender || !division) {
        return new Response(JSON.stringify({ error: 'gender and division required' }), {
          status: 400, headers
        });
      }
      
      if (action === 'lock') {
        if (!seeds || !Array.isArray(seeds) || seeds.length < 13) {
          return new Response(JSON.stringify({ error: 'seeds array required (13-16 teams)' }), {
            status: 400, headers
          });
        }
        
        const result = await lockSeeds(gender, division, season, seeds, sport);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }
      
      if (action === 'project') {
        if (!seeds || !Array.isArray(seeds) || seeds.length < 13) {
          return new Response(JSON.stringify({ error: 'seeds array required (13-16 teams)' }), {
            status: 400, headers
          });
        }
        
        const result = await projectSeeds(gender, division, season, seeds, sport);
        return new Response(JSON.stringify(result), { status: 200, headers });
      }
      
      if (action === 'unlock' || action === 'unproject') {
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
