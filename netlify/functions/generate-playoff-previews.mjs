/**
 * Generate Playoff Previews
 * 
 * Generates matchup capsule data for NHIAA playoff rounds.
 * Pulls frozen stats from playoff_seeds + dynamic game data from games table.
 * 
 * Query params:
 *   - gender: Boys|Girls
 *   - division: D-I|D-II|D-III|D-IV
 *   - round: Prelims|Quarters|Semis|Final
 *   - season: 2025-26 (default)
 * 
 * Returns JSON with:
 *   - matchups: Array of matchup objects with full stats
 *   - roundInfo: Round metadata (date, site)
 *   - blurbs: Pre-generated AI blurbs for each matchup
 *   - warnings: Any issues
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Helper: Make Supabase request
async function supabaseQuery(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }
  
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  console.log(`Querying: ${table}${query}`);
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Range': '0-9999'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Supabase error for ${table}: ${response.status} - ${errorText}`);
    throw new Error(`Supabase query failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Helper: Calculate ordinal suffix
function ordinal(n) {
  if (n >= 11 && n <= 13) return `${n}th`;
  const suffixes = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
  return `${n}${suffixes[n % 10]}`;
}

// Team nicknames for narrative blurbs
const TEAM_NICKNAMES = {
  'Alvirne': 'Broncos', 'Bedford': 'Bulldogs', 'Belmont': 'Red Raiders', 'Berlin': 'Mountaineers',
  'Bishop Brady': 'Giants', 'Bishop Guertin': 'Cardinals', 'Bow': 'Falcons', 'Campbell': 'Cougars',
  'Coe-Brown': 'Bears', 'Colebrook': 'Mohawks', 'ConVal': 'Cougars', 'Conant': 'Orioles',
  'Concord': 'Crimson Tide', 'Concord Christian': 'Kingsmen', 'Derryfield': 'Cougars',
  'Dover': 'Green Wave', 'Epping': 'Blue Devils', 'Exeter': 'Blue Hawks', 'Fall Mountain': 'Wildcats',
  'Farmington': 'Tigers', 'Franklin': 'Tornadoes', 'Gilford': 'Golden Eagles', 'Goffstown': 'Grizzlies',
  'Gorham': 'Huskies', 'Groveton': 'Eagles', 'Hanover': 'Marauders', 'Hillsboro-Deering': 'Hillcats',
  'Hinsdale': 'Pacers', 'Hollis-Brookline': 'Cavaliers', 'Holy Family': 'Cardinals',
  'Hopkinton': 'Hawks', 'Inter-Lakes': 'Lakers', 'John Stark': 'Generals', 'Kearsarge': 'Cougars',
  'Keene': 'Blackbirds', 'Kennett': 'Eagles', 'Kingswood': 'Knights', 'Laconia': 'Sachems',
  'Lebanon': 'Raiders', 'Lin-Wood': 'Lumberjacks', 'Lisbon': 'Panthers', 'Littleton': 'Crusaders',
  'Londonderry': 'Lancers', 'Manchester Central': 'Little Green', 'Manchester Memorial': 'Crusaders',
  'Manchester West': 'Blue Knights', 'Mascenic': 'Vikings', 'Mascoma Valley': 'Royals',
  'Merrimack': 'Tomahawks', 'Merrimack Valley': 'Pride', 'Milford': 'Spartans', 'Monadnock': 'Huskies',
  'Moultonborough': 'Panthers', 'Mount Royal': 'Crusaders', 'Nashua North': 'Titans',
  'Nashua South': 'Purple Panthers', 'Newfound': 'Bears', 'Newmarket': 'Mules', 'Newport': 'Tigers',
  'Nute': 'Rams', 'Oyster River': 'Bobcats', 'Pelham': 'Pythons', 'Pembroke': 'Spartans',
  'Pinkerton': 'Astros', 'Pittsburg-Canaan': 'Panthers', 'Pittsfield': 'Panthers',
  'Plymouth': 'Bobcats', 'Portsmouth': 'Clippers', 'Portsmouth Christian': 'Eagles',
  'Profile': 'Patriots', 'Prospect Mountain': 'Timber Wolves', 'Raymond': 'Rams',
  'Salem': 'Blue Devils', 'Sanborn': 'Indians', 'Somersworth': 'Hilltoppers', 'Souhegan': 'Sabers',
  'Spaulding': 'Red Raiders', 'St. Thomas Aquinas': 'Saints', 'Stevens': 'Cardinals',
  'Sunapee': 'Lakers', 'Timberlane': 'Owls', 'Trinity': 'Pioneers', 'White Mountains': 'Spartans',
  'Wilton-Lyndeborough': 'Warriors', 'Windham': 'Jaguars', 'Winnacunnet': 'Warriors',
  'Winnisquam': 'Bears', 'Woodsville': 'Engineers'
};

function getNickname(team) {
  return TEAM_NICKNAMES[team] || team.split(' ').pop();
}

// Calculate team stats from completed games (for PPG, PPG Allowed, Streak)
function calculateTeamStats(team, gender, completedGames) {
  const teamGames = completedGames.filter(g =>
    g.gender === gender &&
    (g.home_team === team || g.away_team === team) &&
    g.home_score !== null && g.away_score !== null
  );

  if (teamGames.length === 0) {
    return { ppg: 0, ppgAllowed: 0, streak: 'N/A', homeRecord: { wins: 0, losses: 0 }, awayRecord: { wins: 0, losses: 0 } };
  }

  let totalPoints = 0, totalAllowed = 0;
  let homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
  const sortedGames = [...teamGames].sort((a, b) => a.date.localeCompare(b.date));
  const results = [];

  for (const game of sortedGames) {
    const isHome = game.home_team === team;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    const won = teamScore > oppScore;

    totalPoints += teamScore;
    totalAllowed += oppScore;

    if (won) {
      if (isHome) homeWins++; else awayWins++;
      results.push('W');
    } else {
      if (isHome) homeLosses++; else awayLosses++;
      results.push('L');
    }
  }

  // Calculate streak
  let streak = 'N/A';
  if (results.length > 0) {
    const lastResult = results[results.length - 1];
    let streakCount = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i] === lastResult) streakCount++;
      else break;
    }
    streak = `${lastResult}${streakCount}`;
  }

  return {
    ppg: Math.round((totalPoints / teamGames.length) * 10) / 10,
    ppgAllowed: Math.round((totalAllowed / teamGames.length) * 10) / 10,
    streak,
    homeRecord: { wins: homeWins, losses: homeLosses },
    awayRecord: { wins: awayWins, losses: awayLosses }
  };
}

// Find previous meetings between two teams this season
function findPreviousMeetings(team1, team2, gender, completedGames) {
  const meetings = completedGames.filter(g =>
    g.gender === gender &&
    g.home_score !== null && g.away_score !== null &&
    ((g.home_team === team1 && g.away_team === team2) ||
     (g.home_team === team2 && g.away_team === team1))
  ).sort((a, b) => a.date.localeCompare(b.date));

  return meetings.map(g => {
    const homeWon = g.home_score > g.away_score;
    const winner = homeWon ? g.home_team : g.away_team;
    const loser = homeWon ? g.away_team : g.home_team;
    const winnerScore = homeWon ? g.home_score : g.away_score;
    const loserScore = homeWon ? g.away_score : g.home_score;

    // Format date
    const d = new Date(g.date + 'T12:00:00');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();

    return {
      date: g.date,
      dateFormatted: `${month} ${day}`,
      winner,
      loser,
      winnerScore,
      loserScore,
      location: g.location || (g.home_team === winner ? `at ${winner}` : `at ${loser}`)
    };
  });
}

// Generate a narrative blurb for a matchup
function generateMatchupBlurb(matchup, round) {
  const { higherSeed, lowerSeed } = matchup;
  if (!higherSeed || !lowerSeed) return '';

  const hName = higherSeed.team;
  const lName = lowerSeed.team;
  const hNick = getNickname(hName);
  const lNick = getNickname(lName);
  const hSeed = higherSeed.seed;
  const lSeed = lowerSeed.seed;
  const hRecord = `${higherSeed.regSeasonWins}-${higherSeed.regSeasonLosses}`;
  const lRecord = `${lowerSeed.regSeasonWins}-${lowerSeed.regSeasonLosses}`;

  const parts = [];

  // Opening line based on seed matchup
  const seedGap = lSeed - hSeed;
  if (round === 'Prelims' && seedGap >= 8) {
    parts.push(`The ${ordinal(hSeed)}-seeded ${hNick} (${hRecord}) welcome the ${ordinal(lSeed)}-seeded ${lNick} (${lRecord}) in a classic first-round matchup.`);
  } else if (round === 'Final') {
    parts.push(`The ${ordinal(hSeed)}-seeded ${hName} ${hNick} (${hRecord}) face the ${ordinal(lSeed)}-seeded ${lName} ${lNick} (${lRecord}) for the championship.`);
  } else {
    parts.push(`${ordinal(hSeed)} ${hName} (${hRecord}) takes on ${ordinal(lSeed)} ${lName} (${lRecord}).`);
  }

  // Scoring comparison
  const hPPG = matchup.higherSeedStats?.ppg || 0;
  const lPPG = matchup.lowerSeedStats?.ppg || 0;
  if (hPPG > 0 && lPPG > 0) {
    if (hPPG > lPPG + 5) {
      parts.push(`The ${hNick} bring a potent offense averaging ${hPPG} points per game, compared to ${lPPG} for ${lName}.`);
    } else if (lPPG > hPPG + 5) {
      parts.push(`${lName} has the scoring edge at ${lPPG} PPG to ${hName}'s ${hPPG}, which could keep this one close.`);
    } else {
      parts.push(`Both teams are evenly matched offensively with ${hName} at ${hPPG} PPG and ${lName} at ${lPPG}.`);
    }
  }

  // Previous meetings
  if (matchup.previousMeetings && matchup.previousMeetings.length > 0) {
    const lastMeeting = matchup.previousMeetings[matchup.previousMeetings.length - 1];
    if (matchup.previousMeetings.length === 1) {
      parts.push(`These teams met once this season: ${lastMeeting.winner} won ${lastMeeting.winnerScore}-${lastMeeting.loserScore} on ${lastMeeting.dateFormatted}.`);
    } else {
      const hWins = matchup.previousMeetings.filter(m => m.winner === hName).length;
      const lWins = matchup.previousMeetings.filter(m => m.winner === lName).length;
      parts.push(`They split/met ${matchup.previousMeetings.length} times this season (${hName} ${hWins}-${lWins}), most recently a ${lastMeeting.winner} ${lastMeeting.winnerScore}-${lastMeeting.loserScore} win on ${lastMeeting.dateFormatted}.`);
    }
  }

  // Streak info
  const hStreak = matchup.higherSeedStats?.streak || '';
  const lStreak = matchup.lowerSeedStats?.streak || '';
  if (hStreak.startsWith('W') && parseInt(hStreak.slice(1)) >= 5) {
    parts.push(`${hName} enters on a ${hStreak.slice(1)}-game winning streak.`);
  } else if (lStreak.startsWith('W') && parseInt(lStreak.slice(1)) >= 5) {
    parts.push(`${lName} is rolling with ${lStreak.slice(1)} straight wins heading into this one.`);
  }

  return parts.join(' ');
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const gender = url.searchParams.get('gender');
    const division = url.searchParams.get('division');
    const round = url.searchParams.get('round');
    const season = url.searchParams.get('season') || '2025-26';

    if (!gender || !division || !round) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: gender, division, round'
      }), { status: 400, headers: corsHeaders });
    }

    console.log(`Generating playoff previews: ${gender} ${division} ${round} (${season})`);

    // Fetch data in parallel
    const basketballFilter = 'or=(sport.eq.basketball,sport.is.null)';
    const [seeds, playoffGames, allGames] = await Promise.all([
      // Frozen playoff seeds
      supabaseQuery('playoff_seeds', `?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&order=seed.asc`),
      // Playoff games for this bracket
      supabaseQuery('games', `?season=eq.${season}&gender=eq.${gender}&division=eq.${division}&is_playoff=eq.true&order=round.asc,bracket_position.asc`),
      // All regular season games for stats
      supabaseQuery('games', `?season=eq.${season}&level=eq.NHIAA&${basketballFilter}&is_playoff=eq.false&select=*`)
    ]);

    console.log(`Found ${seeds.length} seeds, ${playoffGames.length} playoff games, ${allGames.length} regular season games`);

    if (seeds.length === 0) {
      return new Response(JSON.stringify({
        error: `No playoff seeds found for ${gender} ${division} (${season}). Seeds must be locked first.`
      }), { status: 400, headers: corsHeaders });
    }

    // Build seed map
    const seedMap = new Map();
    for (const seed of seeds) {
      seedMap.set(seed.team, seed);
    }

    // Filter completed regular season games
    const completedGames = allGames.filter(g =>
      g.home_score !== null && g.away_score !== null
    );

    // Get games for the requested round
    const roundGames = playoffGames.filter(g => g.round === round);

    if (roundGames.length === 0) {
      return new Response(JSON.stringify({
        error: `No ${round} games found for ${gender} ${division}. This round may not exist for this bracket.`
      }), { status: 400, headers: corsHeaders });
    }

    // Build matchup objects
    const matchups = [];
    const blurbs = {};
    const warnings = [];

    for (const game of roundGames) {
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;

      // Handle TBD teams (later rounds)
      if (!homeTeam && !awayTeam) {
        matchups.push({
          gameId: game.game_id,
          bracketPosition: game.bracket_position,
          round: game.round,
          date: game.date,
          time: game.time || 'TBD',
          location: game.location || 'TBD',
          homeTeam: null,
          awayTeam: null,
          homeSeed: game.home_seed,
          awaySeed: game.away_seed,
          higherSeed: null,
          lowerSeed: null,
          higherSeedStats: null,
          lowerSeedStats: null,
          previousMeetings: [],
          isTBD: true
        });
        warnings.push(`Game ${game.bracket_position}: Teams not yet determined`);
        continue;
      }

      // Determine higher/lower seed
      const homeSeedData = seedMap.get(homeTeam);
      const awaySeedData = seedMap.get(awayTeam);

      let higherSeed, lowerSeed;
      if (homeSeedData && awaySeedData) {
        if (homeSeedData.seed <= awaySeedData.seed) {
          higherSeed = homeSeedData;
          lowerSeed = awaySeedData;
        } else {
          higherSeed = awaySeedData;
          lowerSeed = homeSeedData;
        }
      } else {
        higherSeed = homeSeedData || awaySeedData;
        lowerSeed = awaySeedData || homeSeedData;
      }

      // Calculate dynamic stats (PPG, streak, etc.) from regular season
      const higherStats = higherSeed ? calculateTeamStats(higherSeed.team, gender, completedGames) : null;
      const lowerStats = lowerSeed ? calculateTeamStats(lowerSeed.team, gender, completedGames) : null;

      // Find previous meetings this season
      const previousMeetings = (homeTeam && awayTeam)
        ? findPreviousMeetings(homeTeam, awayTeam, gender, completedGames)
        : [];

      // Build seed display objects with combined frozen + dynamic stats
      const buildSeedDisplay = (seedData, stats) => {
        if (!seedData) return null;
        return {
          team: seedData.team,
          seed: seedData.seed,
          regSeasonWins: seedData.reg_season_wins,
          regSeasonLosses: seedData.reg_season_losses,
          record: `${seedData.reg_season_wins}-${seedData.reg_season_losses}`,
          rpiRank: seedData.final_rpi_rank,
          vsPlayoffWins: seedData.vs_playoff_wins,
          vsPlayoffLosses: seedData.vs_playoff_losses,
          vsPlayoffRecord: `${seedData.vs_playoff_wins}-${seedData.vs_playoff_losses}`,
          ppg: stats?.ppg || 0,
          ppgAllowed: stats?.ppgAllowed || 0,
          streak: stats?.streak || 'N/A',
          homeRecord: stats?.homeRecord || { wins: 0, losses: 0 },
          awayRecord: stats?.awayRecord || { wins: 0, losses: 0 }
        };
      };

      const matchup = {
        gameId: game.game_id,
        bracketPosition: game.bracket_position,
        round: game.round,
        date: game.date,
        time: game.time || 'TBD',
        location: game.location || 'TBD',
        homeTeam,
        awayTeam,
        homeSeed: game.home_seed,
        awaySeed: game.away_seed,
        higherSeed: buildSeedDisplay(higherSeed, higherStats),
        lowerSeed: buildSeedDisplay(lowerSeed, lowerStats),
        higherSeedStats: higherStats,
        lowerSeedStats: lowerStats,
        previousMeetings,
        isTBD: false
      };

      matchups.push(matchup);

      // Generate blurb
      blurbs[game.game_id] = generateMatchupBlurb(matchup, round);
    }

    // Sort matchups by bracket position
    matchups.sort((a, b) => a.bracketPosition - b.bracketPosition);

    // Get round date from first game
    const roundDate = roundGames[0]?.date || null;
    const roundLocation = roundGames[0]?.location || 'TBD';

    // Build response
    const response = {
      gender,
      division,
      round,
      season,
      roundDate,
      roundDateFormatted: formatDate(roundDate),
      roundDateShort: formatDateShort(roundDate),
      roundLocation,
      totalMatchups: matchups.length,
      matchups,
      blurbs,
      warnings,
      seeds: seeds.map(s => ({
        seed: s.seed,
        team: s.team,
        record: `${s.reg_season_wins}-${s.reg_season_losses}`,
        rpiRank: s.final_rpi_rank
      })),
      generatedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error generating playoff previews:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate playoff previews',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
