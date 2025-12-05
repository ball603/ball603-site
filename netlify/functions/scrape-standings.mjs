// Ball603 NHIAA Standings Scraper
// Runs 3x daily via Netlify scheduled functions

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
  let isFirstRow = true;
  
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

async function updateGoogleSheets(standings) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const spreadsheetId = process.env.GOOGLE_SHEETS_STANDINGS_ID;
  
  // Get access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(credentials)
    })
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Prepare data
  const header = ['school', 'gender', 'division', 'wins', 'losses', 'ties', 'points', 'rating', 'games_played', 'win_pct', 'seed', 'qualifies', 'tournament_spots', 'scraped_at'];
  const rows = standings.map(s => [
    s.school, s.gender, s.division, s.wins, s.losses, s.ties,
    s.points, s.rating, s.games_played, s.win_pct, s.seed || '',
    s.qualifies ? 'Yes' : 'No', s.tournament_spots || '', new Date().toISOString()
  ]);
  
  // Clear and update sheet
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Standings!A:N:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Standings!A1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [header, ...rows] })
  });
  
  return rows.length;
}

async function createJWT(credentials) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const pemContents = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${unsignedToken}.${signatureB64}`;
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
    
    const rowCount = await updateGoogleSheets(allStandings);
    
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
