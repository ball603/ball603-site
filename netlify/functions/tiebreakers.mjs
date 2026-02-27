/**
 * Ball603 NHIAA Tiebreaker Logic
 * 
 * Single source of truth for playoff seeding tiebreakers.
 * Based on NHIAA By-Law Article XII criteria.
 * 
 * Used by:
 * - standings.html (via resolve-tiebreakers API)
 * - playoff-seeds.mjs (direct import)
 * 
 * @version 1.0.0
 */

// ============================================
// CONFIGURATION
// ============================================

const RATING_TOLERANCE = 0.0005; // Ratings within this are considered equal
const PCT_TOLERANCE = 0.001;     // Percentages within this are considered equal

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize team name for consistent matching
 */
export function normalizeTeamName(name) {
  if (!name) return name;
  const normalizations = {
    'Coe-Brown Northwood': 'Coe-Brown',
    'Coe-Brown Northwood Academy': 'Coe-Brown'
  };
  return normalizations[name] || name;
}

/**
 * Format date for display (e.g., "Jan 15")
 */
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

// ============================================
// CRITERION EVALUATION FUNCTIONS
// ============================================

/**
 * Criterion 0: NHIAA Power Rating
 * Teams are first sorted by rating - if ratings differ, that resolves the tie.
 */
function evaluateRating(teams, teamRatings) {
  const teamValues = {};
  teams.forEach(team => {
    teamValues[team] = teamRatings[team]?.toFixed(3) || 'N/A';
  });
  
  const sorted = [...teams].sort((a, b) => (teamRatings[b] || 0) - (teamRatings[a] || 0));
  const allSame = teams.every(t => Math.abs((teamRatings[t] || 0) - (teamRatings[teams[0]] || 0)) < RATING_TOLERANCE);
  
  if (allSame) {
    return { 
      status: 'tied', 
      detail: 'All teams have same rating', 
      teamValues 
    };
  }
  
  const highestRating = teamRatings[sorted[0]] || 0;
  const teamsWithHighest = sorted.filter(t => Math.abs((teamRatings[t] || 0) - highestRating) < RATING_TOLERANCE);
  
  if (teamsWithHighest.length === 1) {
    // Clear winner by rating
    if (teams.length === 2) {
      return { 
        status: 'resolved', 
        resolved: true, 
        order: sorted, 
        detail: `${sorted[0]} has higher rating`,
        teamValues 
      };
    } else {
      // Multi-team: rating resolves the top team, continue with others
      return { 
        status: 'resolved', 
        topTeam: sorted[0], 
        detail: `${sorted[0]} has highest rating`,
        teamValues 
      };
    }
  }
  
  // Multiple teams tied for highest rating
  // Check if there are OTHER teams with LOWER ratings that should be separated out
  const teamsWithLower = sorted.filter(t => Math.abs((teamRatings[t] || 0) - highestRating) >= RATING_TOLERANCE);
  
  if (teamsWithLower.length > 0) {
    // Some teams have lower ratings - separate them out
    return { 
      status: 'partial', 
      continueWithTeams: teamsWithHighest,
      resolvedBelow: teamsWithLower,
      detail: `${teamsWithHighest.join(' & ')} tied for highest rating; ${teamsWithLower.join(', ')} settled below by rating`,
      teamValues 
    };
  }
  
  // All teams tied for highest rating - continue to next criterion
  return { 
    status: 'tied', 
    detail: 'All teams tied for highest rating', 
    teamValues 
  };
}

/**
 * Criterion 1: Head-to-Head Competition
 * Winner of head-to-head matchup(s) among tied teams.
 */
function evaluateHeadToHead(teams, games) {
  const h2hGames = games.filter(g =>
    teams.includes(g.home) && teams.includes(g.away)
  );
  
  if (h2hGames.length === 0) {
    return { 
      status: 'skipped', 
      detail: 'Teams did not play each other', 
      teamValues: {} 
    };
  }
  
  // Two-team tie: check direct matchups
  if (teams.length === 2) {
    const t1 = teams[0], t2 = teams[1];
    const gamesPlayed = h2hGames.filter(g =>
      (g.home === t1 && g.away === t2) || (g.home === t2 && g.away === t1)
    );
    
    if (gamesPlayed.length === 0) {
      return { 
        status: 'skipped', 
        detail: 'Teams did not play each other', 
        teamValues: {} 
      };
    }
    
    let t1Wins = 0, t2Wins = 0;
    const gameDetails = [];
    
    gamesPlayed.forEach(g => {
      const winner = g.homeScore > g.awayScore ? g.home : g.away;
      const winScore = Math.max(g.homeScore, g.awayScore);
      const loseScore = Math.min(g.homeScore, g.awayScore);
      if (winner === t1) t1Wins++;
      else t2Wins++;
      gameDetails.push(`${winner} ${winScore}-${loseScore} (${formatDateShort(g.date)})`);
    });
    
    const teamValues = { [t1]: `${t1Wins}-${t2Wins}`, [t2]: `${t2Wins}-${t1Wins}` };
    const detail = gameDetails.join(' \u2022 ');
    
    if (t1Wins > t2Wins) {
      return { status: 'resolved', resolved: true, order: [t1, t2], detail, teamValues };
    } else if (t2Wins > t1Wins) {
      return { status: 'resolved', resolved: true, order: [t2, t1], detail, teamValues };
    }
    return { status: 'tied', detail: `Split ${t1Wins}-${t2Wins}: ${detail}`, teamValues };
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
      
      if (losses > 0 || wins === 0) { 
        beatAll = false; 
        break; 
      }
    }
    
    if (beatAll) {
      return {
        status: 'resolved',
        topTeam: team,
        detail: `${team} beat all tied opponents`,
        teamValues: { [team]: 'Beat all' }
      };
    }
  }
  
  // Calculate H2H win pct for each team among tied teams
  const teamValues = {};
  teams.forEach(team => {
    const myGames = h2hGames.filter(g => g.home === team || g.away === team);
    const myWins = myGames.filter(g =>
      (g.home === team && g.homeScore > g.awayScore) || (g.away === team && g.awayScore > g.homeScore)
    ).length;
    teamValues[team] = myGames.length > 0 
      ? `${myWins}-${myGames.length - myWins} (${(myWins / myGames.length).toFixed(3)})` 
      : 'N/A';
  });
  
  const sorted = teams.slice().sort((a, b) => {
    const aGames = h2hGames.filter(g => g.home === a || g.away === a);
    const aWins = aGames.filter(g => (g.home === a && g.homeScore > g.awayScore) || (g.away === a && g.awayScore > g.homeScore)).length;
    const aPct = aGames.length > 0 ? aWins / aGames.length : 0;
    const bGames = h2hGames.filter(g => g.home === b || g.away === b);
    const bWins = bGames.filter(g => (g.home === b && g.homeScore > g.awayScore) || (g.away === b && g.awayScore > g.homeScore)).length;
    const bPct = bGames.length > 0 ? bWins / bGames.length : 0;
    return bPct - aPct;
  });
  
  // Check if clear winner
  const topGames = h2hGames.filter(g => g.home === sorted[0] || g.away === sorted[0]);
  const topWins = topGames.filter(g => (g.home === sorted[0] && g.homeScore > g.awayScore) || (g.away === sorted[0] && g.awayScore > g.homeScore)).length;
  const topPct = topGames.length > 0 ? topWins / topGames.length : 0;
  const secGames = h2hGames.filter(g => g.home === sorted[1] || g.away === sorted[1]);
  const secWins = secGames.filter(g => (g.home === sorted[1] && g.homeScore > g.awayScore) || (g.away === sorted[1] && g.awayScore > g.homeScore)).length;
  const secPct = secGames.length > 0 ? secWins / secGames.length : 0;
  
  if (Math.abs(topPct - secPct) > PCT_TOLERANCE) {
    return { 
      status: 'resolved', 
      resolved: true, 
      order: sorted, 
      detail: 'H2H win % among tied teams', 
      teamValues 
    };
  }
  
  return { 
    status: 'tied', 
    detail: 'Head-to-head inconclusive', 
    teamValues 
  };
}

/**
 * Criterion 2: Win Percentage vs Tournament Teams
 * Rating (win %) against teams that qualify for the tournament in that division.
 */
function evaluateVsTournamentTeams(teams, allDivGames, tournamentTeams) {
  const teamValues = {};
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
    teamValues[team] = vsGames.length > 0 ? `${wins}-${vsGames.length - wins} (${pct.toFixed(3)})` : 'N/A';
    pcts.push({ team, pct, wins, games: vsGames.length });
  });
  
  pcts.sort((a, b) => b.pct - a.pct);
  
  if (pcts.length >= 2 && Math.abs(pcts[0].pct - pcts[1].pct) > PCT_TOLERANCE) {
    return { 
      status: 'resolved', 
      resolved: true, 
      order: pcts.map(p => p.team), 
      detail: 'Win % vs tournament teams', 
      teamValues 
    };
  }
  
  return { 
    status: 'tied', 
    detail: 'Win % vs tournament teams inconclusive', 
    teamValues 
  };
}

/**
 * Criterion 3: Quality of Wins
 * Ranking based on wins over tournament teams weighted by opponent strength.
 */
function evaluateQualityOfWins(teams, allDivGames, tournamentTeams) {
  const teamValues = {};
  const rankings = [];
  
  teams.forEach(team => {
    // Find tournament opponents this team played
    const vsTourneyGames = allDivGames.filter(g =>
      ((g.home === team && tournamentTeams.has(g.away)) || (g.away === team && tournamentTeams.has(g.home)))
    );
    
    // Find beaten tournament opponents
    const beatenOpps = new Set();
    vsTourneyGames.forEach(g => {
      const opp = g.home === team ? g.away : g.home;
      const won = (g.home === team && g.homeScore > g.awayScore) || (g.away === team && g.awayScore > g.homeScore);
      if (won) beatenOpps.add(opp);
    });
    
    // Sum beaten opponents' wins vs tournament teams
    let beatenOppWins = 0;
    beatenOpps.forEach(opp => {
      const oppGames = allDivGames.filter(g =>
        ((g.home === opp && tournamentTeams.has(g.away)) || (g.away === opp && tournamentTeams.has(g.home)))
      );
      beatenOppWins += oppGames.filter(g =>
        (g.home === opp && g.homeScore > g.awayScore) || (g.away === opp && g.awayScore > g.homeScore)
      ).length;
    });
    
    // Total tournament games played by all tournament opponents
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
    teamValues[team] = totalOppGames > 0 ? `${beatenOppWins}/${totalOppGames} (${ranking.toFixed(3)})` : 'N/A';
    rankings.push({ team, ranking });
  });
  
  rankings.sort((a, b) => b.ranking - a.ranking);
  
  if (rankings.length >= 2 && Math.abs(rankings[0].ranking - rankings[1].ranking) > PCT_TOLERANCE) {
    return { 
      status: 'resolved', 
      resolved: true, 
      order: rankings.map(r => r.team), 
      detail: 'Quality of wins ranking', 
      teamValues 
    };
  }
  
  return { 
    status: 'tied', 
    detail: 'Quality of wins inconclusive', 
    teamValues 
  };
}

/**
 * Criteria 4 & 5: Home/Away Win Percentage vs Division
 * Rating against divisional opponents on the road (4) or at home (5).
 */
function evaluateHomeAwayVsDivision(teams, allDivGames, divTeams, homeOrAway) {
  const teamValues = {};
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
    teamValues[team] = myGames.length > 0 ? `${wins}-${myGames.length - wins} (${pct.toFixed(3)})` : 'N/A';
    pcts.push({ team, pct });
  });
  
  pcts.sort((a, b) => b.pct - a.pct);
  
  if (pcts.length >= 2 && Math.abs(pcts[0].pct - pcts[1].pct) > PCT_TOLERANCE) {
    return { 
      status: 'resolved', 
      resolved: true, 
      order: pcts.map(p => p.team), 
      detail: `${homeOrAway === 'away' ? 'Away' : 'Home'} win % vs division`, 
      teamValues 
    };
  }
  
  return { 
    status: 'tied', 
    detail: `${homeOrAway === 'away' ? 'Away' : 'Home'} win % vs division inconclusive`, 
    teamValues 
  };
}

/**
 * Criteria 6 & 7: Total Home/Away Wins
 * Total number of wins on the road (6) or at home (7) regardless of division.
 */
function evaluateTotalHomeAwayWins(teams, allGames, homeOrAway) {
  const teamValues = {};
  const counts = [];
  
  teams.forEach(team => {
    let wins;
    if (homeOrAway === 'away') {
      wins = allGames.filter(g => g.away === team && g.awayScore > g.homeScore).length;
    } else {
      wins = allGames.filter(g => g.home === team && g.homeScore > g.awayScore).length;
    }
    teamValues[team] = `${wins}`;
    counts.push({ team, wins });
  });
  
  counts.sort((a, b) => b.wins - a.wins);
  
  if (counts.length >= 2 && counts[0].wins !== counts[1].wins) {
    return { 
      status: 'resolved', 
      resolved: true, 
      order: counts.map(c => c.team), 
      detail: `Total ${homeOrAway} wins`, 
      teamValues 
    };
  }
  
  return { 
    status: 'tied', 
    detail: `Total ${homeOrAway} wins inconclusive`, 
    teamValues 
  };
}

/**
 * Criterion 8: Highest Seeded Win
 * The team that defeated the highest NHIAA seeded team in their division
 * (includes both tournament and non-tournament teams) will be selected.
 * Seeding = position in standings sorted by rating.
 */
function evaluateHighestSeededWin(teams, divGames, divStandings) {
  // Build seed map from standings (rank 1 = highest rated)
  const seedMap = {};
  divStandings.forEach((s, i) => {
    seedMap[s.school] = i + 1;
  });
  
  const teamValues = {};
  const bestWins = [];
  
  teams.forEach(team => {
    const teamGames = divGames.filter(g => g.home === team || g.away === team);
    let bestSeed = 999;
    let bestOpp = null;
    
    teamGames.forEach(g => {
      const winner = g.homeScore > g.awayScore ? g.home : (g.awayScore > g.homeScore ? g.away : null);
      if (winner === team) {
        const opp = g.home === team ? g.away : g.home;
        const oppSeed = seedMap[opp] || 999;
        if (oppSeed < bestSeed) {
          bestSeed = oppSeed;
          bestOpp = opp;
        }
      }
    });
    
    teamValues[team] = bestOpp ? `#${bestSeed} ${bestOpp}` : 'No wins';
    bestWins.push({ team, bestSeed, bestOpp });
  });
  
  bestWins.sort((a, b) => a.bestSeed - b.bestSeed);
  
  if (bestWins.length >= 2 && bestWins[0].bestSeed !== bestWins[1].bestSeed) {
    return { 
      status: 'resolved', 
      resolved: true, 
      order: bestWins.map(b => b.team), 
      detail: `${bestWins[0].team} defeated higher-seeded #${bestWins[0].bestSeed} ${bestWins[0].bestOpp}`, 
      teamValues 
    };
  }
  
  return { 
    status: 'tied', 
    detail: 'Highest seeded win inconclusive', 
    teamValues 
  };
}

// ============================================
// MAIN TIEBREAKER RESOLUTION
// ============================================

/**
 * Resolve one round of tiebreakers for a set of teams.
 * Returns either:
 * - { resolved: true, order: [...] } - Full ordering found
 * - { topTeam: string } - Top team found, continue with rest
 * - { partial: true, continueWithTeams: [...], resolvedBelow: [...] } - Rating separated groups
 * - { resolved: false } - Could not resolve
 */
function resolveOneRound(teams, divGames, allGames, tournamentTeams, divTeams, teamRatings, divStandings, steps) {
  // Criterion 0: Rating (NHIAA power rating)
  const ratingResult = evaluateRating(teams, teamRatings);
  steps.push({
    criterion: 0,
    label: 'Rating',
    ...ratingResult
  });
  if (ratingResult.resolved) return { resolved: true, order: ratingResult.order };
  if (ratingResult.topTeam) return { topTeam: ratingResult.topTeam };
  if (ratingResult.status === 'partial') {
    return { 
      partial: true, 
      continueWithTeams: ratingResult.continueWithTeams,
      resolvedBelow: ratingResult.resolvedBelow
    };
  }
  
  // Criterion 1: Head-to-head
  const h2h = evaluateHeadToHead(teams, divGames);
  steps.push({
    criterion: 1,
    label: 'Head-to-Head',
    ...h2h
  });
  if (h2h.resolved) return { resolved: true, order: h2h.order };
  if (h2h.topTeam) return { topTeam: h2h.topTeam };
  
  // Criterion 2: Win pct vs tournament teams
  const vsTourney = evaluateVsTournamentTeams(teams, divGames, tournamentTeams);
  steps.push({
    criterion: 2,
    label: 'Win % vs Tournament Teams',
    ...vsTourney,
    approximate: true
  });
  if (vsTourney.resolved) return { resolved: true, order: vsTourney.order };
  if (vsTourney.topTeam) return { topTeam: vsTourney.topTeam };
  
  // Criterion 3: Quality of wins
  const qualityWins = evaluateQualityOfWins(teams, divGames, tournamentTeams);
  steps.push({
    criterion: 3,
    label: 'Quality of Wins',
    ...qualityWins
  });
  if (qualityWins.resolved) return { resolved: true, order: qualityWins.order };
  if (qualityWins.topTeam) return { topTeam: qualityWins.topTeam };
  
  // Criterion 4: Away win pct vs divisional opponents
  const awayDiv = evaluateHomeAwayVsDivision(teams, divGames, divTeams, 'away');
  steps.push({
    criterion: 4,
    label: 'Away Win % vs Division',
    ...awayDiv,
    approximate: true
  });
  if (awayDiv.resolved) return { resolved: true, order: awayDiv.order };
  if (awayDiv.topTeam) return { topTeam: awayDiv.topTeam };
  
  // Criterion 5: Home win pct vs divisional opponents
  const homeDiv = evaluateHomeAwayVsDivision(teams, divGames, divTeams, 'home');
  steps.push({
    criterion: 5,
    label: 'Home Win % vs Division',
    ...homeDiv,
    approximate: true
  });
  if (homeDiv.resolved) return { resolved: true, order: homeDiv.order };
  if (homeDiv.topTeam) return { topTeam: homeDiv.topTeam };
  
  // Criterion 6: Total away wins
  const awayWins = evaluateTotalHomeAwayWins(teams, allGames, 'away');
  steps.push({
    criterion: 6,
    label: 'Total Away Wins',
    ...awayWins
  });
  if (awayWins.resolved) return { resolved: true, order: awayWins.order };
  if (awayWins.topTeam) return { topTeam: awayWins.topTeam };
  
  // Criterion 7: Total home wins
  const homeWins = evaluateTotalHomeAwayWins(teams, allGames, 'home');
  steps.push({
    criterion: 7,
    label: 'Total Home Wins',
    ...homeWins
  });
  if (homeWins.resolved) return { resolved: true, order: homeWins.order };
  if (homeWins.topTeam) return { topTeam: homeWins.topTeam };
  
  // Criterion 8: Highest seeded win in division
  const highestWin = evaluateHighestSeededWin(teams, divGames, divStandings);
  steps.push({
    criterion: 8,
    label: 'Defeated Highest Seeded Team',
    ...highestWin
  });
  if (highestWin.resolved) return { resolved: true, order: highestWin.order };
  if (highestWin.topTeam) return { topTeam: highestWin.topTeam };
  
  // Criterion 9: Committee / unresolved
  steps.push({
    criterion: 9,
    label: 'Committee Decision',
    status: 'unresolved',
    detail: 'Could not resolve with available data -- would go to NHIAA committee',
    teamValues: {}
  });
  
  return { resolved: false };
}

/**
 * Walk through all tiebreakers for a group of tied teams.
 * 
 * @param {string[]} teams - Array of team names that are tied
 * @param {Object[]} divGames - Completed division games with { home, away, homeScore, awayScore, date }
 * @param {Object[]} allGames - All completed games (for total home/away wins)
 * @param {Set<string>} tournamentTeams - Set of teams qualifying for tournament
 * @param {Set<string>} divTeams - Set of all teams in the division
 * @param {Object} teamRatings - Map of team name to rating
 * @param {Object[]} divStandings - Full division standings sorted by rating (for Criterion 8)
 * @returns {{ steps: Object[], order: string[] }} - Resolution steps and final order
 */
export function walkTiebreakers(teams, divGames, allGames, tournamentTeams, divTeams, teamRatings, divStandings) {
  const steps = [];
  let remainingTeams = [...teams];
  const finalOrder = [];
  let pendingBelowTeams = [];
  
  while (remainingTeams.length > 1) {
    const result = resolveOneRound(
      remainingTeams, 
      divGames, 
      allGames, 
      tournamentTeams, 
      divTeams, 
      teamRatings, 
      divStandings || [],
      steps
    );
    
    if (result.resolved) {
      result.order.forEach(t => {
        if (!finalOrder.includes(t)) finalOrder.push(t);
      });
      break;
    } else if (result.partial) {
      // Rating separated some teams - continue with only the top-rated teams
      pendingBelowTeams = pendingBelowTeams.concat(result.resolvedBelow);
      remainingTeams = result.continueWithTeams;
    } else if (result.topTeam) {
      finalOrder.push(result.topTeam);
      remainingTeams = remainingTeams.filter(t => t !== result.topTeam);
    } else {
      // Couldn't resolve -- push remaining in original order (by rating)
      remainingTeams.sort((a, b) => (teamRatings[b] || 0) - (teamRatings[a] || 0));
      remainingTeams.forEach(t => {
        if (!finalOrder.includes(t)) finalOrder.push(t);
      });
      break;
    }
  }
  
  // If only one left, add it
  if (remainingTeams.length === 1 && !finalOrder.includes(remainingTeams[0])) {
    finalOrder.push(remainingTeams[0]);
  }
  
  // Add teams that were separated by rating (they go after the resolved group)
  if (pendingBelowTeams.length > 0) {
    if (pendingBelowTeams.length === 1) {
      finalOrder.push(pendingBelowTeams[0]);
    } else {
      // Multiple teams in the lower group - recursively resolve their ties
      const subResult = walkTiebreakers(
        pendingBelowTeams, 
        divGames, 
        allGames, 
        tournamentTeams, 
        divTeams, 
        teamRatings,
        divStandings
      );
      subResult.order.forEach(t => finalOrder.push(t));
      // Merge sub-steps with a note
      steps.push({
        criterion: 'sub',
        label: 'Lower-rated group tiebreaker',
        detail: `Resolving ${pendingBelowTeams.join(', ')}`,
        subSteps: subResult.steps
      });
    }
  }
  
  return { steps, order: finalOrder };
}

/**
 * Simplified version for server-side use (returns order only, no steps).
 * Used by playoff-seeds.mjs for bracket generation.
 */
export function resolveTiebreakerOrder(teams, divGames, allGames, tournamentTeams, divTeams, teamRatings, divStandings) {
  const result = walkTiebreakers(teams, divGames, allGames, tournamentTeams, divTeams, teamRatings, divStandings);
  return result.order;
}

/**
 * Build the set of tournament teams for tiebreaker calculations.
 * 
 * Per NHIAA rules, this includes:
 * 1. All teams clearly qualifying (above the cutoff)
 * 2. ALL teams involved in a tie for the last position (even those who will miss the cut)
 * 
 * @param {Object[]} standings - Sorted standings array with { school, wins, losses, rating }
 * @param {number} playoffSpots - Number of playoff spots
 * @returns {Set<string>} - Set of team names considered "tournament teams"
 */
export function buildTournamentTeamsSet(standings, playoffSpots) {
  if (standings.length === 0) return new Set();
  
  // Start with all teams that clearly qualify
  const tournamentTeams = new Set();
  
  // If we have fewer teams than spots, all teams are in
  if (standings.length <= playoffSpots) {
    standings.forEach(s => tournamentTeams.add(s.school));
    return tournamentTeams;
  }
  
  // Get the record of the last qualifying team (at the cutoff line)
  const lastQualifier = standings[playoffSpots - 1];
  const cutoffWins = lastQualifier.wins;
  const cutoffLosses = lastQualifier.losses;
  
  // Include all teams that:
  // 1. Are above the cutoff line, OR
  // 2. Have the same record as the last qualifier (tied for last position)
  standings.forEach((team, index) => {
    const isAboveCutoff = index < playoffSpots;
    const hasSameRecord = team.wins === cutoffWins && team.losses === cutoffLosses;
    
    if (isAboveCutoff || hasSameRecord) {
      tournamentTeams.add(team.school);
    }
  });
  
  return tournamentTeams;
}

/**
 * Find all tie groups in standings (teams with same W-L record).
 * 
 * @param {Object[]} standings - Sorted standings array with { school, wins, losses, rating }
 * @param {number} playoffSpots - Number of playoff spots
 * @returns {Object[]} - Array of tie groups with { startRank, teams, record, teamRatings, affectsPlayoff }
 */
export function findTieGroups(standings, playoffSpots) {
  const tieGroups = [];
  let i = 0;
  
  while (i < standings.length) {
    let j = i + 1;
    // Same record = same wins AND same losses
    while (j < standings.length && 
           standings[j].wins === standings[i].wins && 
           standings[j].losses === standings[i].losses) {
      j++;
    }
    
    if (j - i > 1) {
      // Build team ratings map for this group
      const teamRatings = {};
      standings.slice(i, j).forEach(s => {
        teamRatings[s.school] = s.rating;
      });
      
      tieGroups.push({
        startRank: i + 1,
        teams: standings.slice(i, j).map(s => s.school),
        record: { wins: standings[i].wins, losses: standings[i].losses },
        teamRatings: teamRatings,
        affectsPlayoff: (i + 1) <= playoffSpots + 1 && j > playoffSpots
      });
    }
    
    i = j;
  }
  
  return tieGroups;
}

/**
 * Process games into normalized format for tiebreaker evaluation.
 * Filters out Bash games and playoffs.
 * 
 * @param {Object[]} games - Raw games from database
 * @param {string} gender - Filter by gender
 * @returns {Object[]} - Normalized games with { home, away, homeScore, awayScore, date, division }
 */
export function processGamesForTiebreakers(games, gender) {
  return games.filter(game => {
    const hasScore = game.home_score !== null && game.home_score !== '' &&
                    game.away_score !== null && game.away_score !== '';
    const isBash = (game.specialevent || '').toLowerCase().includes('bash') ||
                  (game.gamedescription || '').toLowerCase().includes('bash') ||
                  (game.notes || '').toLowerCase().includes('bash');
    const isPlayoff = game.is_playoff;
    return hasScore && !isBash && !isPlayoff && game.gender === gender;
  }).map(g => ({
    home: normalizeTeamName(g.home_team || g.home),
    away: normalizeTeamName(g.away_team || g.away),
    homeScore: parseInt(g.home_score),
    awayScore: parseInt(g.away_score),
    date: g.date,
    division: g.division,
    gender: g.gender
  }));
}

/**
 * Apply tiebreaker resolution to reorder standings.
 * 
 * @param {Object[]} standings - Current standings array
 * @param {Object[]} tieGroups - Array of resolved tie groups with { startRank, teams, resolution }
 * @returns {Object[]} - Reordered standings
 */
export function applyTiebreakerOrder(standings, tieGroups) {
  const reordered = [...standings];
  
  tieGroups.forEach(tg => {
    if (!tg.resolution || !tg.resolution.order || tg.resolution.order.length === 0) return;
    
    const startIdx = tg.startRank - 1;
    const resolvedOrder = tg.resolution.order;
    
    // Save references to tied entries BEFORE overwriting
    const tiedEntries = {};
    for (let i = startIdx; i < startIdx + tg.teams.length && i < reordered.length; i++) {
      tiedEntries[reordered[i].school] = reordered[i];
    }
    
    // Now replace in resolved order using saved references
    for (let i = 0; i < resolvedOrder.length; i++) {
      const entry = tiedEntries[resolvedOrder[i]];
      if (entry && startIdx + i < reordered.length) {
        reordered[startIdx + i] = entry;
      }
    }
  });
  
  return reordered;
}

export default {
  normalizeTeamName,
  walkTiebreakers,
  resolveTiebreakerOrder,
  findTieGroups,
  buildTournamentTeamsSet,
  processGamesForTiebreakers,
  applyTiebreakerOrder
};
