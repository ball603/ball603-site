// Ball603 NHIAA Schedule Scraper
// Runs 3x daily via Netlify scheduled functions

const SCHEDULE_URLS = [
  { url: 'https://www.nhiaa.org/sports/schedules/boys-basketball/division-1', gender: 'Boys', division: 'D-I' },
  { url: 'https://www.nhiaa.org/sports/schedules/boys-basketball/division-2', gender: 'Boys', division: 'D-II' },
  { url: 'https://www.nhiaa.org/sports/schedules/boys-basketball/division-3', gender: 'Boys', division: 'D-III' },
  { url: 'https://www.nhiaa.org/sports/schedules/boys-basketball/division-4', gender: 'Boys', division: 'D-IV' },
  { url: 'https://www.nhiaa.org/sports/schedules/girls-basketball/division-1', gender: 'Girls', division: 'D-I' },
  { url: 'https://www.nhiaa.org/sports/schedules/girls-basketball/division-2', gender: 'Girls', division: 'D-II' },
  { url: 'https://www.nhiaa.org/sports/schedules/girls-basketball/division-3', gender: 'Girls', division: 'D-III' },
  { url: 'https://www.nhiaa.org/sports/schedules/girls-basketball/division-4', gender: 'Girls', division: 'D-IV' },
];

function parseSchedulePage(html, gender, division) {
  const games = [];
  
  // Find all team sections - each starts with <h2>TeamName</h2>
  const teamSections = html.split(/<h2>/i);
  
  for (let i = 1; i < teamSections.length; i++) {
    const section = teamSections[i];
    
    // Get team name (text before </h2>)
    const teamNameMatch = section.match(/^([^<]+)<\/h2>/i);
    if (!teamNameMatch) continue;
    
    const teamName = teamNameMatch[1].trim();
    if (!teamName || teamName.length < 2) continue;
    
    // Skip non-team h2s (like navigation items)
    if (teamName.includes('NHIAA') || teamName.includes('Sponsors') || teamName.includes('Updates')) continue;
    
    // Find all rows with dates in this section (stop at next h2 or end)
    const sectionEnd = section.indexOf('<h2>') > -1 ? section.indexOf('<h2>') : section.length;
    const tableSection = section.substring(0, sectionEnd);
    
    // Match table rows - looking for date pattern MM/DD/YY
    const datePattern = /(\d{2}\/\d{2}\/\d{2})/g;
    const rows = tableSection.split(/<tr/i);
    
    for (const row of rows) {
      // Check if this row has a date
      const dateMatch = row.match(/(\d{2}\/\d{2}\/\d{2})/);
      if (!dateMatch) continue;
      
      const date = dateMatch[1];
      
      // Extract cells - get all td contents
      const cellMatches = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/gi)];
      if (cellMatches.length < 5) continue;
      
      const atIndicator = cellMatches[1] ? cellMatches[1][1].trim() : '';
      const opponent = cellMatches[2] ? cellMatches[2][1].trim() : '';
      const time = cellMatches[4] ? cellMatches[4][1].trim() : '';
      
      if (!opponent) continue;
      
      const isAway = atIndicator.toLowerCase() === 'at';
      const homeTeam = isAway ? opponent : teamName;
      const awayTeam = isAway ? teamName : opponent;
      
      // Parse date (MM/DD/YY)
      const [month, day, year] = date.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      const gameId = `${isoDate}-${homeTeam}-${awayTeam}`.replace(/\s+/g, '-').toLowerCase();
      
      games.push({
        game_id: gameId,
        date: isoDate,
        time: time,
        home_team: homeTeam,
        away_team: awayTeam,
        gender: gender,
        division: division
      });
    }
  }
  
  return games;
}

function deduplicateGames(games) {
  const seen = new Set();
  return games.filter(game => {
    if (seen.has(game.game_id)) return false;
    seen.add(game.game_id);
    return true;
  });
}

async function updateGoogleSheets(games) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const spreadsheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
  
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
  const header = ['game_id', 'date', 'time', 'home_team', 'away_team', 'gender', 'division', 'home_score', 'away_score', 'scraped_at'];
  const rows = games.map(g => [
    g.game_id, g.date, g.time, g.home_team, g.away_team,
    g.gender, g.division, '', '', new Date().toISOString()
  ]);
  
  // Clear and update sheet
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:J:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A1?valueInputOption=RAW`, {
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
  
  // Import private key and sign
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
  console.log('Ball603 Schedule Scraper - Starting...');
  
  try {
    const allGames = [];
    
    for (const { url, gender, division } of SCHEDULE_URLS) {
      console.log(`Fetching ${gender} ${division}...`);
      const response = await fetch(url);
      const html = await response.text();
      const games = parseSchedulePage(html, gender, division);
      allGames.push(...games);
      console.log(`  Found ${games.length} game entries`);
    }
    
    const dedupedGames = deduplicateGames(allGames);
    console.log(`Total unique games: ${dedupedGames.length}`);
    
    const rowCount = await updateGoogleSheets(dedupedGames);
    
    return new Response(JSON.stringify({
      success: true,
      gamesScraped: dedupedGames.length,
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
