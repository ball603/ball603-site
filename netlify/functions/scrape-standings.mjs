// Ball603 NHIAA Standings Scraper
// Runs 3x daily via Netlify scheduled functions

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  
  // Prepare data with timestamps
  const rows = standings.map(s => ({
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
  }));
  
  // Upsert all standings via REST API
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/standings?on_conflict=school,gender,division`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(rows)
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Supabase upsert error:', error);
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  return rows.length;
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
    
    return new Response(JSON.stringify({
      success: true,
      teamsScraped: allStandings.length,
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
