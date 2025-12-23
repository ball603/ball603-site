// Ball603 NHIAA Standings Scraper
// Runs 3x daily via Netlify scheduled functions

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const STANDINGS_URLS = [
  { url: 'https://www.nhiaa.org/sports/standings/boys-basketball/division-1', gender: 'Boys', division: 'D-I' },
  { url: 'https://www.nhiaa.org/sports/standings/boys-basketball/division-2', gender: 'Boys', division: 'D-II' },
  { url: 'https://www.nhiaa.org/sports/standings/boys-basketball/division-3', gender: 'Boys', division: 'D-III' },
  { url: 'https://www.nhiaa.org/sports/standings/boys-basketball/division-4', gender: 'Boys', division: 'D-IV' },
  { url: 'https://www.nhiaa.org/sports/standings/girls-basketball/division-1', gender: 'Girls', division: 'D-I' },
  { url: 'https://www.nhiaa.org/sports/standings/girls-basketball/division-2', gender: 'Girls', division: 'D-II' },
  { url: 'https://www.nhiaa.org/sports/standings/girls-basketball/division-3', gender: 'Girls', division: 'D-III' },
  { url: 'https://www.nhiaa.org/sports/standings/girls-basketball/division-4', gender: 'Girls', division: 'D-IV' },
];

function parseStandingsPage(html, gender, division) {
  const standings = [];
  
  // Find the standings table - look for rows with School | W | L | T | Points | Rating
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    
    // Skip header rows (contain <th>)
    if (rowContent.includes('<th')) continue;
    
    const cells = [];
    const cellRegex = /<td[^>]*>([^<]*)<\/td>/gi;
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(cellMatch[1].trim());
    }
    
    // We expect: School, W, L, T, Points, Rating
    if (cells.length >= 6) {
      const school = cells[0];
      const wins = parseInt(cells[1]) || 0;
      const losses = parseInt(cells[2]) || 0;
      const ties = parseInt(cells[3]) || 0;
      const points = parseFloat(cells[4]) || 0;
      const rating = parseFloat(cells[5]) || 0;
      
      if (school && school.length > 0) {
        standings.push({
          school,
          gender,
          division,
          wins,
          losses,
          ties,
          points,
          rating,
          games_played: wins + losses + ties,
          win_pct: (wins + losses + ties) > 0 ? (wins / (wins + losses + ties)).toFixed(3) : '0.000'
        });
      }
    }
  }
  
  return standings;
}

function calculatePlayoffPicture(standings) {
  // Group by division and gender
  const groups = {};
  standings.forEach(team => {
    const key = `${team.gender}-${team.division}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(team);
  });
  
  // For each group, sort by rating and determine qualification
  Object.keys(groups).forEach(key => {
    const teams = groups[key];
    const tournamentSpots = Math.floor(teams.length * 0.7);
    
    teams.sort((a, b) => b.rating - a.rating);
    
    teams.forEach((team, index) => {
      team.seed = index + 1;
      team.qualifies = index < tournamentSpots;
      team.tournament_spots = tournamentSpots;
    });
  });
  
  return standings;
}

async function updateSupabase(standings) {
  const now = new Date().toISOString();
  let updatedCount = 0;
  let insertedCount = 0;
  
  // First, get existing teams to know which are new vs existing
  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/standings?select=school,gender,division`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  const existingTeams = new Set();
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    for (const team of existing) {
      existingTeams.add(`${team.school}_${team.gender}_${team.division}`);
    }
  }
  
  // Process each team
  for (const s of standings) {
    const teamKey = `${s.school}_${s.gender}_${s.division}`;
    
    if (existingTeams.has(teamKey)) {
      // Existing team: Only update rating/points/seed/qualifies (NOT W-L)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/standings?school=eq.${encodeURIComponent(s.school)}&gender=eq.${encodeURIComponent(s.gender)}&division=eq.${encodeURIComponent(s.division)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            points: s.points,
            rating: s.rating,
            seed: s.seed || null,
            qualifies: s.qualifies || false,
            tournament_spots: s.tournament_spots || null,
            scraped_at: now
          })
        }
      );
      
      if (response.ok) updatedCount++;
    } else {
      // New team: Insert full record with W-L from NHIAA (will be recalculated by update-standings)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/standings`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            school: s.school,
            gender: s.gender,
            division: s.division,
            wins: s.wins,
            losses: s.losses,
            ties: s.ties,
            points: s.points,
            rating: s.rating,
            games_played: s.games_played,
            win_pct: s.win_pct,
            seed: s.seed || null,
            qualifies: s.qualifies || false,
            tournament_spots: s.tournament_spots || null,
            scraped_at: now,
            updated_at: now
          })
        }
      );
      
      if (response.ok) insertedCount++;
    }
  }
  
  console.log(`  Updated ${updatedCount} existing teams (ratings only), inserted ${insertedCount} new teams`);
  return updatedCount + insertedCount;
}

// Calculate W-L-T records from games table and update standings
async function updateRecordsFromGames() {
  console.log('Calculating W-L records from games table...');
  
  // Fetch all completed NHIAA games
  const gamesResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&select=home_team,away_team,home_score,away_score,gender,division&or=(home_score.not.is.null,away_score.not.is.null)`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  if (!gamesResponse.ok) {
    console.error('Failed to fetch games for W-L calculation');
    return 0;
  }
  
  const games = await gamesResponse.json();
  console.log(`  Found ${games.length} completed games`);
  
  // Calculate records for each team
  const teamRecords = new Map();
  
  for (const game of games) {
    if (game.home_score === null || game.away_score === null) continue;
    
    const homeTeam = game.home_team;
    const awayTeam = game.away_team;
    const homeScore = parseInt(game.home_score);
    const awayScore = parseInt(game.away_score);
    const gender = game.gender;
    const division = game.division;
    
    const homeKey = `${homeTeam}_${gender}_${division}`;
    const awayKey = `${awayTeam}_${gender}_${division}`;
    
    if (!teamRecords.has(homeKey)) {
      teamRecords.set(homeKey, { school: homeTeam, gender, division, wins: 0, losses: 0, ties: 0 });
    }
    if (!teamRecords.has(awayKey)) {
      teamRecords.set(awayKey, { school: awayTeam, gender, division, wins: 0, losses: 0, ties: 0 });
    }
    
    const homeRecord = teamRecords.get(homeKey);
    const awayRecord = teamRecords.get(awayKey);
    
    if (homeScore > awayScore) {
      homeRecord.wins++;
      awayRecord.losses++;
    } else if (awayScore > homeScore) {
      awayRecord.wins++;
      homeRecord.losses++;
    } else {
      homeRecord.ties++;
      awayRecord.ties++;
    }
  }
  
  console.log(`  Calculated records for ${teamRecords.size} teams`);
  
  // Update standings with calculated records
  const now = new Date().toISOString();
  let updatedCount = 0;
  
  for (const [key, record] of teamRecords) {
    const gamesPlayed = record.wins + record.losses + record.ties;
    const winPct = gamesPlayed > 0 ? (record.wins / gamesPlayed).toFixed(3) : '0.000';
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/standings?school=eq.${encodeURIComponent(record.school)}&gender=eq.${encodeURIComponent(record.gender)}&division=eq.${encodeURIComponent(record.division)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
          games_played: gamesPlayed,
          win_pct: winPct,
          updated_at: now
        })
      }
    );
    
    if (response.ok) updatedCount++;
  }
  
  console.log(`  Updated ${updatedCount} team W-L records`);
  return updatedCount;
}

export default async (request) => {
  console.log('Ball603 Standings Scraper - Starting...');
  
  try {
    let allStandings = [];
    
    for (const { url, gender, division } of STANDINGS_URLS) {
      console.log(`Fetching ${gender} ${division} standings...`);
      const response = await fetch(url);
      const html = await response.text();
      const standings = parseStandingsPage(html, gender, division);
      allStandings.push(...standings);
      console.log(`  Found ${standings.length} teams`);
    }
    
    allStandings = calculatePlayoffPicture(allStandings);
    console.log(`Total teams: ${allStandings.length}`);
    
    const rowCount = await updateSupabase(allStandings);
    
    // Now update W-L records from our games table
    console.log('Step 2: Updating W-L records from games...');
    const recordsUpdated = await updateRecordsFromGames();
    
    return new Response(JSON.stringify({
      success: true,
      teamsScraped: allStandings.length,
      recordsUpdated: recordsUpdated,
      timestamp: new Date().toISOString()
    }), { status: 200 });
    
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const config = {
  schedule: "0 10,17,3 * * *"
};
