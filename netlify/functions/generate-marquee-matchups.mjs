/**
 * Generate Marquee Matchups
 * 
 * This function generates data for the Marquee Matchups feature.
 * It queries live data from the database, calculates stats, and auto-selects
 * the Game of the Night and Don't Miss games.
 * 
 * Query params:
 *   - date: The date to generate matchups for (YYYY-MM-DD format)
 * 
 * Returns JSON with:
 *   - games: All games for the date organized by division
 *   - topMatchups: Top-10 matchups with full stats
 *   - gameOfTheNight: Auto-selected best game
 *   - dontMiss: Auto-selected notable games (at least 1 per gender)
 *   - warnings: Any issues (e.g., few top-10 matchups)
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

// Helper: Calculate ordinal suffix (1st, 2nd, 3rd, etc.)
function ordinal(n) {
  if (n >= 11 && n <= 13) return `${n}th`;
  const suffixes = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
  return `${n}${suffixes[n % 10]}`;
}

// Helper: Format date for display (Jan. 27)
function formatDateShort(dateStr) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [year, month, day] = dateStr.split('-');
  return `${months[parseInt(month) - 1]}. ${parseInt(day)}`;
}

// Helper: Format day of week
function formatDayOfWeek(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateStr + 'T12:00:00');
  return days[date.getDay()];
}

// Calculate team stats from completed games
function calculateTeamStats(team, gender, completedGames) {
  const teamGames = completedGames.filter(g => 
    g.gender === gender && 
    (g.home_team === team || g.away_team === team) &&
    g.home_score !== null && g.away_score !== null
  );

  if (teamGames.length === 0) {
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      ppg: 0,
      ppgAllowed: 0,
      margin: 0,
      homeRecord: { wins: 0, losses: 0 },
      awayRecord: { wins: 0, losses: 0 },
      streak: 'N/A',
      last5: []
    };
  }

  let wins = 0, losses = 0;
  let homeWins = 0, homeLosses = 0;
  let awayWins = 0, awayLosses = 0;
  let totalPoints = 0, totalAllowed = 0;

  // Sort games by date for streak calculation
  const sortedGames = [...teamGames].sort((a, b) => a.date.localeCompare(b.date));

  const results = []; // For streak and last5

  for (const game of sortedGames) {
    const isHome = game.home_team === team;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    const won = teamScore > oppScore;

    totalPoints += teamScore;
    totalAllowed += oppScore;

    if (won) {
      wins++;
      if (isHome) homeWins++;
      else awayWins++;
      results.push('W');
    } else {
      losses++;
      if (isHome) homeLosses++;
      else awayLosses++;
      results.push('L');
    }
  }

  // Calculate streak (from most recent games)
  let streak = '';
  if (results.length > 0) {
    const lastResult = results[results.length - 1];
    let streakCount = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i] === lastResult) {
        streakCount++;
      } else {
        break;
      }
    }
    streak = `${lastResult}${streakCount}`;
  }

  // Last 5 games (most recent first)
  const last5 = results.slice(-5).reverse();

  return {
    gamesPlayed: teamGames.length,
    wins,
    losses,
    ppg: Math.round((totalPoints / teamGames.length) * 10) / 10,
    ppgAllowed: Math.round((totalAllowed / teamGames.length) * 10) / 10,
    margin: Math.round(((totalPoints - totalAllowed) / teamGames.length) * 10) / 10,
    homeRecord: { wins: homeWins, losses: homeLosses },
    awayRecord: { wins: awayWins, losses: awayLosses },
    streak,
    last5
  };
}

// Calculate record vs Top 10 teams
function calculateVsTop10(team, gender, division, completedGames, top10Teams) {
  const divTop10 = top10Teams[`${gender}_${division}`] || new Set();
  
  const relevantGames = completedGames.filter(g => {
    if (g.gender !== gender) return false;
    if (g.home_score === null || g.away_score === null) return false;
    
    const isHome = g.home_team === team;
    const opponent = isHome ? g.away_team : g.home_team;
    
    // Check if opponent is in top 10
    return (g.home_team === team || g.away_team === team) && divTop10.has(opponent);
  });

  let wins = 0, losses = 0;
  for (const game of relevantGames) {
    const isHome = game.home_team === team;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    if (teamScore > oppScore) wins++;
    else losses++;
  }

  return { wins, losses };
}

// Find common opponents and results
function findCommonOpponents(team1, team2, gender, completedGames) {
  const team1Games = completedGames.filter(g => 
    g.gender === gender && 
    (g.home_team === team1 || g.away_team === team1) &&
    g.home_score !== null && g.away_score !== null
  );
  
  const team2Games = completedGames.filter(g => 
    g.gender === gender && 
    (g.home_team === team2 || g.away_team === team2) &&
    g.home_score !== null && g.away_score !== null
  );

  // Get opponents for each team
  const team1Opponents = new Map();
  for (const g of team1Games) {
    const opp = g.home_team === team1 ? g.away_team : g.home_team;
    const teamScore = g.home_team === team1 ? g.home_score : g.away_score;
    const oppScore = g.home_team === team1 ? g.away_score : g.home_score;
    if (!team1Opponents.has(opp)) {
      team1Opponents.set(opp, []);
    }
    team1Opponents.get(opp).push({
      teamScore,
      oppScore,
      won: teamScore > oppScore,
      date: g.date
    });
  }

  const team2Opponents = new Map();
  for (const g of team2Games) {
    const opp = g.home_team === team2 ? g.away_team : g.home_team;
    const teamScore = g.home_team === team2 ? g.home_score : g.away_score;
    const oppScore = g.home_team === team2 ? g.away_score : g.home_score;
    if (!team2Opponents.has(opp)) {
      team2Opponents.set(opp, []);
    }
    team2Opponents.get(opp).push({
      teamScore,
      oppScore,
      won: teamScore > oppScore,
      date: g.date
    });
  }

  // Find common opponents
  const common = [];
  for (const [opp, team1Results] of team1Opponents) {
    if (team2Opponents.has(opp) && opp !== team1 && opp !== team2) {
      common.push({
        opponent: opp,
        team1Results,
        team2Results: team2Opponents.get(opp)
      });
    }
  }

  return common;
}

// Find previous matchup between two teams
function findPreviousMatchup(team1, team2, gender, beforeDate, completedGames) {
  const matchups = completedGames.filter(g => {
    if (g.gender !== gender) return false;
    if (g.date >= beforeDate) return false;
    if (g.home_score === null || g.away_score === null) return false;
    return (g.home_team === team1 && g.away_team === team2) ||
           (g.home_team === team2 && g.away_team === team1);
  });

  if (matchups.length === 0) return null;

  // Get most recent matchup
  const mostRecent = matchups.sort((a, b) => b.date.localeCompare(a.date))[0];
  
  const winner = mostRecent.home_score > mostRecent.away_score 
    ? mostRecent.home_team 
    : mostRecent.away_team;
  const winnerScore = Math.max(mostRecent.home_score, mostRecent.away_score);
  const loser = mostRecent.home_score > mostRecent.away_score 
    ? mostRecent.away_team 
    : mostRecent.home_team;
  const loserScore = Math.min(mostRecent.home_score, mostRecent.away_score);

  return {
    winner,
    winnerScore,
    loser,
    loserScore,
    location: mostRecent.home_team,
    date: mostRecent.date,
    dateFormatted: formatDateShort(mostRecent.date),
    margin: winnerScore - loserScore
  };
}

// Build rankings from standings
function buildRankings(standings) {
  const rankings = {}; // team_gender_division -> { rank, isTied }
  const top10Teams = {}; // gender_division -> Set of team names

  // Group by division and gender
  const groups = {};
  for (const s of standings) {
    const key = `${s.gender}_${s.division}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  // Sort each group and assign ranks
  for (const [key, teams] of Object.entries(groups)) {
    const sorted = teams.sort((a, b) => {
      // Sort by rating desc, then wins desc, then losses asc
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    top10Teams[key] = new Set();
    let prevRating = null;
    let prevRank = 0;

    for (let i = 0; i < sorted.length; i++) {
      const team = sorted[i];
      let rank, isTied = false;

      if (team.rating === prevRating) {
        rank = prevRank;
        isTied = true;
      } else {
        rank = i + 1;
        prevRank = rank;
        prevRating = team.rating;
      }

      // Check if next team has same rating (for tie indicator)
      const nextTied = i + 1 < sorted.length && sorted[i + 1].rating === team.rating;

      const teamKey = `${team.school}_${team.gender}_${team.division}`;
      rankings[teamKey] = {
        rank,
        isTied: isTied || nextTied,
        wins: team.wins,
        losses: team.losses,
        rating: team.rating
      };

      // Add to top 10
      if (rank <= 10) {
        top10Teams[key].add(team.school);
      }
    }
  }

  return { rankings, top10Teams };
}

// Score a matchup for Game of the Night selection
function scoreMatchup(matchup, rankings) {
  let score = 0;
  
  const awayRankKey = `${matchup.awayTeam}_${matchup.gender}_${matchup.division}`;
  const homeRankKey = `${matchup.homeTeam}_${matchup.gender}_${matchup.division}`;
  const awayRanking = rankings[awayRankKey];
  const homeRanking = rankings[homeRankKey];

  if (!awayRanking || !homeRanking) return 0;

  // Battle of unbeatens (both 0 losses) - highest priority
  if (awayRanking.losses === 0 && homeRanking.losses === 0) {
    score += 1000;
  }

  // Both tied for 1st
  if (awayRanking.rank === 1 && homeRanking.rank === 1) {
    score += 500;
  }

  // Lower combined ranking is better (1st vs 2nd = 3, beats 5th vs 6th = 11)
  const combinedRank = awayRanking.rank + homeRanking.rank;
  score += (20 - combinedRank) * 10; // Max 190 for 1 vs 1

  // Rematch with close previous game adds intrigue
  if (matchup.previousMatchup && matchup.previousMatchup.margin <= 10) {
    score += 50;
  }

  // One-loss teams facing each other
  if (awayRanking.losses <= 1 && homeRanking.losses <= 1) {
    score += 100;
  }

  return score;
}

// Format team name with record and rank
function formatTeamDisplay(team, gender, division, rankings) {
  const key = `${team}_${gender}_${division}`;
  const ranking = rankings[key];
  
  if (!ranking) {
    return { name: team, record: '', rank: '', display: team };
  }

  const rankStr = ranking.isTied ? `t-${ordinal(ranking.rank)}` : ordinal(ranking.rank);
  return {
    name: team,
    record: `${ranking.wins}-${ranking.losses}`,
    rank: rankStr,
    display: `${team} (${ranking.wins}-${ranking.losses}, ${rankStr})`
  };
}

// Main handler
export default async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get date from query params
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid date parameter. Use YYYY-MM-DD format.' 
      }), { status: 400, headers: corsHeaders });
    }

    console.log(`Generating marquee matchups for ${date}`);

    // Fetch all required data in parallel
    const [games, standings, allGames] = await Promise.all([
      supabaseQuery('games', `?date=eq.${date}&level=eq.NHIAA&order=division,gender,time`),
      supabaseQuery('standings', '?select=*'),
      supabaseQuery('games', '?level=eq.NHIAA&select=*')
    ]);

    console.log(`Found ${games.length} games on ${date}`);
    console.log(`Found ${standings.length} standings records`);
    console.log(`Found ${allGames.length} total games for stats`);

    // Filter completed games for stats
    const completedGames = allGames.filter(g => 
      g.home_score !== null && g.away_score !== null &&
      g.date < date // Only games before this date
    );

    // Build rankings and top 10 lists
    const { rankings, top10Teams } = buildRankings(standings);

    // Process each game
    const processedGames = [];
    const topMatchups = [];
    const warnings = [];

    for (const game of games) {
      const isTop10Matchup = 
        top10Teams[`${game.gender}_${game.division}`]?.has(game.home_team) &&
        top10Teams[`${game.gender}_${game.division}`]?.has(game.away_team);

      // Calculate stats for both teams
      const awayStats = calculateTeamStats(game.away_team, game.gender, completedGames);
      const homeStats = calculateTeamStats(game.home_team, game.gender, completedGames);

      // Get formatted team info
      const awayDisplay = formatTeamDisplay(game.away_team, game.gender, game.division, rankings);
      const homeDisplay = formatTeamDisplay(game.home_team, game.gender, game.division, rankings);

      // Find previous matchup
      const previousMatchup = findPreviousMatchup(
        game.away_team, game.home_team, game.gender, date, completedGames
      );

      const processedGame = {
        gameId: game.game_id,
        date: game.date,
        time: game.time || 'TBD',
        gender: game.gender,
        division: game.division,
        awayTeam: game.away_team,
        homeTeam: game.home_team,
        awayDisplay,
        homeDisplay,
        awayStats,
        homeStats,
        previousMatchup,
        isTop10Matchup
      };

      processedGames.push(processedGame);

      if (isTop10Matchup) {
        // Calculate additional stats for top matchups
        const awayVsTop10 = calculateVsTop10(
          game.away_team, game.gender, game.division, completedGames, top10Teams
        );
        const homeVsTop10 = calculateVsTop10(
          game.home_team, game.gender, game.division, completedGames, top10Teams
        );
        const commonOpponents = findCommonOpponents(
          game.away_team, game.home_team, game.gender, completedGames
        );

        topMatchups.push({
          ...processedGame,
          awayVsTop10,
          homeVsTop10,
          commonOpponents,
          score: 0 // Will be calculated next
        });
      }
    }

    // Score top matchups for Game of the Night selection
    for (const matchup of topMatchups) {
      matchup.score = scoreMatchup(matchup, rankings);
    }

    // Sort by score descending
    topMatchups.sort((a, b) => b.score - a.score);

    // Select Game of the Night (highest score)
    const gameOfTheNight = topMatchups.length > 0 ? topMatchups[0] : null;

    // Select Don't Miss games (ensure at least 1 per gender)
    const dontMiss = [];
    const remainingMatchups = topMatchups.slice(1); // Exclude Game of the Night

    // First, ensure we have at least one of each gender
    const boysGame = remainingMatchups.find(m => m.gender === 'Boys');
    const girlsGame = remainingMatchups.find(m => m.gender === 'Girls');

    if (boysGame) dontMiss.push(boysGame);
    if (girlsGame && girlsGame !== boysGame) dontMiss.push(girlsGame);

    // Add remaining top games (up to 6 total Don't Miss)
    for (const matchup of remainingMatchups) {
      if (dontMiss.length >= 6) break;
      if (!dontMiss.includes(matchup)) {
        dontMiss.push(matchup);
      }
    }

    // Sort Don't Miss by score
    dontMiss.sort((a, b) => b.score - a.score);

    // Organize full slate by division and gender
    const fullSlate = {};
    const divisions = ['D-I', 'D-II', 'D-III', 'D-IV'];
    const genders = ['Girls', 'Boys'];

    for (const div of divisions) {
      fullSlate[div] = {};
      for (const gen of genders) {
        fullSlate[div][gen] = processedGames.filter(g => 
          g.division === div && g.gender === gen
        ).sort((a, b) => {
          // Sort by time
          if (a.time === 'TBD' && b.time !== 'TBD') return 1;
          if (b.time === 'TBD' && a.time !== 'TBD') return -1;
          return a.time.localeCompare(b.time);
        });
      }
    }

    // Generate warnings
    if (topMatchups.length === 0) {
      warnings.push('No top-10 matchups found for this date.');
    } else if (topMatchups.length < 3) {
      warnings.push(`Only ${topMatchups.length} top-10 matchup(s) found for this date.`);
    }

    // Check gender balance in Don't Miss
    const dontMissBoys = dontMiss.filter(m => m.gender === 'Boys').length;
    const dontMissGirls = dontMiss.filter(m => m.gender === 'Girls').length;
    if (dontMissBoys === 0 && topMatchups.filter(m => m.gender === 'Boys').length > 0) {
      warnings.push('No boys games in Don\'t Miss section.');
    }
    if (dontMissGirls === 0 && topMatchups.filter(m => m.gender === 'Girls').length > 0) {
      warnings.push('No girls games in Don\'t Miss section.');
    }

    // Build response
    const response = {
      date,
      dateFormatted: formatDateShort(date),
      dayOfWeek: formatDayOfWeek(date),
      totalGames: processedGames.length,
      topMatchupsCount: topMatchups.length,
      gameOfTheNight,
      dontMiss,
      allTopMatchups: topMatchups, // All top-10 matchups for manual selection
      fullSlate,
      warnings,
      generatedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error generating marquee matchups:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate marquee matchups',
      details: error.message 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
};
