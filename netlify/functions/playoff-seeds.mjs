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

// Normalize team names
function normalizeTeamName(name) {
  const normalizations = {
    'Coe-Brown Northwood': 'Coe-Brown',
    'Coe-Brown Northwood Academy': 'Coe-Brown'
  };
  return normalizations[name] || name;
}

// ============================================
// TIEBREAKER LOGIC (matches standings.html Seed Decoder)
// ============================================

// Criterion 0: Rating
function evaluateRating(teams, teamRatings) {
  const sorted = [...teams].sort((a, b) => teamRatings[b] - teamRatings[a]);
  const allSame = teams.every(t => Math.abs(teamRatings[t] - teamRatings[teams[0]]) < 0.0005);
  
  if (allSame) {
    return { status: 'tied' };
  }
  
  const highestRating = teamRatings[sorted[0]];
  const teamsWithHighest = sorted.filter(t => Math.abs(teamRatings[t] - highestRating) < 0.0005);
  
  if (teamsWithHighest.length === 1) {
    if (teams.length === 2) {
      return { status: 'resolved', resolved: true, order: sorted };
    } else {
      return { status: 'resolved', topTeam: sorted[0] };
    }
  }
  
  return { status: 'tied' };
}

// Criterion 1: Head-to-Head
function evaluateHeadToHead(teams, games) {
  const h2hGames = games.filter(g =>
    teams.includes(g.home) && teams.includes(g.away)
  );
  
  if (h2hGames.length === 0) {
    return { status: 'skipped' };
  }
  
  if (teams.length === 2) {
    const t1 = teams[0], t2 = teams[1];
    const gamesPlayed = h2hGames.filter(g =>
      (g.home === t1 && g.away === t2) || (g.home === t2 && g.away === t1)
    );
    
    if (gamesPlayed.length === 0) {
      return { status: 'skipped' };
    }
    
    let t1Wins = 0, t2Wins = 0;
    gamesPlayed.forEach(g => {
      const winner = g.homeScore > g.awayScore ? g.home : g.away;
      if (winner === t1) t1Wins++;
      else t2Wins++;
    });
    
    if (t1Wins > t2Wins) {
      return { status: 'resolved', resolved: true, order: [t1, t2] };
    } else if (t2Wins > t1Wins) {
      return { status: 'resolved', resolved: true, order: [t2, t1] };
    }
    return { status: 'tied' };
  }
  
  // Multi-team tie: check if one team beat ALL others
  for (const team of teams) {
    const others = teams.filter(t => t !== team);
    let beatAll = true;
    for (const opp of others) {
      const matchups = h2hGames.filter(g =>
        (g.home === team && g.away === opp) || (g.home === opp && g.away === team)
      );
      const wins = matchups.filter(g =>
        (g.home === team && g.homeScore > g.awayScore) || (g.away === team && g.awayScore > g.homeScore)
      ).length;
      const losses = matchups.filter(g =>
        (g.home === team && g.homeScore < g.awayScore) || (g.away === team && g.awayScore < g.homeScore)
      ).length;
      if (losses > 0 || wins === 0) { beatAll = false; break; }
    }
    if (beatAll) {
      return { status: 'resolved', topTeam: team };
    }
  }
  
  // Calculate H2H win pct for each team
  const sorted = teams.slice().sort((a, b) => {
    const aGames = h2hGames.filter(g => g.home === a || g.away === a);
    const aWins = aGames.filter(g => (g.home === a && g.homeScore > g.awayScore) || (g.away === a && g.awayScore > g.homeScore)).length;
    const aPct = aGames.length > 0 ? aWins / aGames.length : 0;
    const bGames = h2hGames.filter(g => g.home === b || g.away === b);
    const bWins = bGames.filter(g => (g.home === b && g.homeScore > g.awayScore) || (g.away === b && g.awayScore > g.homeScore)).length;
    const bPct = bGames.length > 0 ? bWins / bGames.length : 0;
    return bPct - aPct;
  });
  
  const topGames = h2hGames.filter(g => g.home === sorted[0] || g.away === sorted[0]);
  const topWins = topGames.filter(g => (g.home === sorted[0] && g.homeScore > g.awayScore) || (g.away === sorted[0] && g.awayScore > g.homeScore)).length;
  const topPct = topGames.length > 0 ? topWins / topGames.length : 0;
  const secGames = h2hGames.filter(g => g.home === sorted[1] || g.away === sorted[1]);
  const secWins = secGames.filter(g => (g.home === sorted[1] && g.homeScore > g.awayScore) || (g.away === sorted[1] && g.awayScore > g.homeScore)).length;
  const secPct = secGames.length > 0 ? secWins / secGames.length : 0;
  
  if (Math.abs(topPct - secPct) > 0.001) {
    return { status: 'resolved', resolved: true, order: sorted };
  }
  
  return { status: 'tied' };
}

// Criterion 2: Win pct vs tournament teams
function evaluateVsTournamentTeams(teams, allDivGames, tournamentTeams) {
  const pcts = [];
  
  teams.forEach(team => {
    const vsGames = allDivGames.filter(g =>
      ((g.home === team && tournamentTeams.has(g.away)) ||
       (g.away === team && tournamentTeams.has(g.home)))
    );
    const wins = vsGames.filter(g =>
      (g.home === team && g.homeScore > g.awayScore) || (g.away === team && g.awayScore > g.homeScore)
    ).length;
    const pct = vsGames.length > 0 ? wins / vsGames.length : 0;
    pcts.push({ team, pct });
  });
  
  pcts.sort((a, b) => b.pct - a.pct);
  
  if (pcts.length >= 2 && Math.abs(pcts[0].pct - pcts[1].pct) > 0.001) {
    return { status: 'resolved', resolved: true, order: pcts.map(p => p.team) };
  }
  
  return { status: 'tied' };
}

// Criterion 3: Quality of wins
function evaluateQualityOfWins(teams, allDivGames, tournamentTeams) {
  const rankings = [];
  
  teams.forEach(team => {
    const vsTourneyGames = allDivGames.filter(g =>
      ((g.home === team && tournamentTeams.has(g.away)) || (g.away === team && tournamentTeams.has(g.home)))
    );
    
    const beatenOpps = new Set();
    vsTourneyGames.forEach(g => {
      const opp = g.home === team ? g.away : g.home;
      const won = (g.home === team && g.homeScore > g.awayScore) || (g.away === team && g.awayScore > g.homeScore);
      if (won) beatenOpps.add(opp);
    });
    
    let beatenOppWins = 0;
    beatenOpps.forEach(opp => {
      const oppGames = allDivGames.filter(g =>
        ((g.home === opp && tournamentTeams.has(g.away)) || (g.away === opp && tournamentTeams.has(g.home)))
      );
      beatenOppWins += oppGames.filter(g =>
        (g.home === opp && g.homeScore > g.awayScore) || (g.away === opp && g.awayScore > g.homeScore)
      ).length;
    });
    
    let totalOppGames = 0;
    const myTourneyOpps = new Set();
    vsTourneyGames.forEach(g => {
      myTourneyOpps.add(g.home === team ? g.away : g.home);
    });
    myTourneyOpps.forEach(opp => {
      totalOppGames += allDivGames.filter(g =>
        ((g.home === opp && tournamentTeams.has(g.away)) || (g.away === opp && tournamentTeams.has(g.home)))
      ).length;
    });
    
    const ranking = totalOppGames > 0 ? beatenOppWins / totalOppGames : 0;
    rankings.push({ team, ranking });
  });
  
  rankings.sort((a, b) => b.ranking - a.ranking);
  
  if (rankings.length >= 2 && Math.abs(rankings[0].ranking - rankings[1].ranking) > 0.001) {
    return { status: 'resolved', resolved: true, order: rankings.map(r => r.team) };
  }
  
  return { status: 'tied' };
}

// Criteria 4 & 5: Home/Away win pct vs division
function evaluateHomeAwayVsDivision(teams, allDivGames, divTeams, homeOrAway) {
  const pcts = [];
  
  teams.forEach(team => {
    let myGames;
    if (homeOrAway === 'away') {
      myGames = allDivGames.filter(g => g.away === team && divTeams.has(g.home));
    } else {
      myGames = allDivGames.filter(g => g.home === team && divTeams.has(g.away));
    }
    
    const wins = myGames.filter(g =>
      (g.home === team && g.homeScore > g.awayScore) || (g.away === team && g.awayScore > g.homeScore)
    ).length;
    const pct = myGames.length > 0 ? wins / myGames.length : 0;
    pcts.push({ team, pct });
  });
  
  pcts.sort((a, b) => b.pct - a.pct);
  
  if (pcts.length >= 2 && Math.abs(pcts[0].pct - pcts[1].pct) > 0.001) {
    return { status: 'resolved', resolved: true, order: pcts.map(p => p.team) };
  }
  
  return { status: 'tied' };
}

// Criteria 6 & 7: Total home/away wins
function evaluateTotalHomeAwayWins(teams, allGames, homeOrAway) {
  const counts = [];
  
  teams.forEach(team => {
    let wins;
    if (homeOrAway === 'away') {
      wins = allGames.filter(g => g.away === team && g.awayScore > g.homeScore).length;
    } else {
      wins = allGames.filter(g => g.home === team && g.homeScore > g.awayScore).length;
    }
    counts.push({ team, wins });
  });
  
  counts.sort((a, b) => b.wins - a.wins);
  
  if (counts.length >= 2 && counts[0].wins !== counts[1].wins) {
    return { status: 'resolved', resolved: true, order: counts.map(c => c.team) };
  }
  
  return { status: 'tied' };
}

// Main tiebreaker resolution - one round
function resolveOneRound(teams, allDivGames, allGames, tournamentTeams, divTeams, teamRatings) {
  // Criterion 0: Rating
  const ratingResult = evaluateRating(teams, teamRatings);
  if (ratingResult.resolved) return { resolved: true, order: ratingResult.order };
  if (ratingResult.topTeam) return { topTeam: ratingResult.topTeam };
  
  // Criterion 1: Head-to-head
  const h2h = evaluateHeadToHead(teams, allDivGames);
  if (h2h.resolved) return { resolved: true, order: h2h.order };
  if (h2h.topTeam) return { topTeam: h2h.topTeam };
  
  // Criterion 2: Win pct vs tournament teams
  const vsTourney = evaluateVsTournamentTeams(teams, allDivGames, tournamentTeams);
  if (vsTourney.resolved) return { resolved: true, order: vsTourney.order };
  
  // Criterion 3: Quality of wins
  const qualityWins = evaluateQualityOfWins(teams, allDivGames, tournamentTeams);
  if (qualityWins.resolved) return { resolved: true, order: qualityWins.order };
  
  // Criterion 4: Away win pct vs division
  const awayDiv = evaluateHomeAwayVsDivision(teams, allDivGames, divTeams, 'away');
  if (awayDiv.resolved) return { resolved: true, order: awayDiv.order };
  
  // Criterion 5: Home win pct vs division
  const homeDiv = evaluateHomeAwayVsDivision(teams, allDivGames, divTeams, 'home');
  if (homeDiv.resolved) return { resolved: true, order: homeDiv.order };
  
  // Criterion 6: Total away wins
  const awayWins = evaluateTotalHomeAwayWins(teams, allGames, 'away');
  if (awayWins.resolved) return { resolved: true, order: awayWins.order };
  
  // Criterion 7: Total home wins
  const homeWins = evaluateTotalHomeAwayWins(teams, allGames, 'home');
  if (homeWins.resolved) return { resolved: true, order: homeWins.order };
  
  // Unresolved
  return { resolved: false };
}

// Walk through tiebreakers for a group
function walkTiebreakers(teams, allDivGames, allGames, tournamentTeams, divTeams, teamRatings) {
  let remainingTeams = [...teams];
  const finalOrder = [];
  
  while (remainingTeams.length > 1) {
    const result = resolveOneRound(remainingTeams, allDivGames, allGames, tournamentTeams, divTeams, teamRatings);
    if (result.resolved) {
      result.order.forEach(t => {
        if (!finalOrder.includes(t)) finalOrder.push(t);
      });
      break;
    } else if (result.topTeam) {
      finalOrder.push(result.topTeam);
      remainingTeams = remainingTeams.filter(t => t !== result.topTeam);
    } else {
      // Couldn't resolve — push remaining in original order (by rating)
      remainingTeams.sort((a, b) => teamRatings[b] - teamRatings[a]);
      remainingTeams.forEach(t => {
        if (!finalOrder.includes(t)) finalOrder.push(t);
      });
      break;
    }
  }
  
  if (remainingTeams.length === 1 && !finalOrder.includes(remainingTeams[0])) {
    finalOrder.push(remainingTeams[0]);
  }
  
  return finalOrder;
}

// ============================================
// END TIEBREAKER LOGIC
// ============================================

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

// Project seeds (publish as projected, no games created)
async function projectSeeds(gender, division, season, seeds) {
  const numTeams = seeds.length;
  if (numTeams < 14 || numTeams > 16) {
    throw new Error(`Invalid number of teams: ${numTeams}. Expected 14-16.`);
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
        sport: 'basketball',
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
        bracket_position: matchup.position,
        game_status: 'BYE'
      });
    } else {
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
async function getStandingsPreview(gender, division, season) {
  // Get standings sorted by rating initially
  const standings = await supabaseRequest(
    `standings?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&order=rating.desc`,
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
    `games?season=eq.${season}&gender=eq.${gender}&sport=eq.basketball&is_playoff=eq.false&home_score=not.is.null&away_score=not.is.null`,
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
  
  // Tournament teams set (top N by rating initially, will be refined)
  const qualifyingStandings = standings.slice(0, tournamentSpots);
  const tournamentTeams = new Set(qualifyingStandings.map(s => s.school));
  
  // Build ratings map
  const teamRatings = {};
  standings.forEach(s => {
    teamRatings[s.school] = s.rating;
  });
  
  // Find tie groups (teams with same W-L record)
  const tieGroups = [];
  let i = 0;
  while (i < qualifyingStandings.length) {
    let j = i + 1;
    while (j < qualifyingStandings.length && 
           qualifyingStandings[j].wins === qualifyingStandings[i].wins && 
           qualifyingStandings[j].losses === qualifyingStandings[i].losses) {
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
    const resolvedOrder = walkTiebreakers(
      group.teams,
      allGames,  // all games for H2H etc
      allGames,  // all games for total home/away wins
      tournamentTeams,
      divTeams,
      teamRatings
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
  
  // Build preview with seeds
  const preview = qualifyingStandings.map((team, index) => {
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
      
      if (action === 'project') {
        if (!seeds || !Array.isArray(seeds) || seeds.length < 14) {
          return new Response(JSON.stringify({ error: 'seeds array required (14-16 teams)' }), {
            status: 400, headers
          });
        }
        
        const result = await projectSeeds(gender, division, season, seeds);
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
