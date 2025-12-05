// Ball603 NHIAA Schedule Scraper
// Runs 3x daily via Netlify scheduled functions
// Preserves photog/videog assignments when updating

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
  
  const teamSections = html.split(/<li><h2>/i);
  
  for (let i = 1; i < teamSections.length; i++) {
    const section = teamSections[i];
    
    const teamNameMatch = section.match(/^([^<]+)/);
    if (!teamNameMatch) continue;
    
    const teamName = teamNameMatch[1].trim();
    if (!teamName || teamName.length < 2) continue;
    
    const rowRegex = /<tr>\s*<td>(\d{2}\/\d{2}\/\d{2})<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td>([^<]+)<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
    
    let match;
    while ((match = rowRegex.exec(section)) !== null) {
      const date = match[1].trim();
      const atIndicator = match[2].trim();
      const opponent = match[3].trim();
      const time = match[4].trim();
      
      if (!date || !opponent) continue;
      
      const isAway = atIndicator.toLowerCase() === 'at';
      const homeTeam = isAway ? opponent : teamName;
      const awayTeam = isAway ? teamName : opponent;
      
      const [month, day, year] = date.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      const gameId = `${isoDate}-${homeTeam}-${awayTeam}`.replace(/\s+/g, '-').toLowerCase();
      
      games.push({
        game_id: gameId,
        date: isoDate,
        time: time,
        away_team: awayTeam,
        home_team: homeTeam,
        gender: gender,
        level: 'NHIAA',
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

async function getExistingAssignments(accessToken, spreadsheetId) {
  // Fetch existing data to preserve assignments
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:L`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const data = await response.json();
  const rows = data.values || [];
  
  // Build map of game_id -> {photog1, photog2, videog, notes}
  const assignments = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const gameId = row[0];
    if (gameId) {
      assignments[gameId] = {
        photog1: row[8] || '',
        photog2: row[9] || '',
        videog: row[10] || '',
        notes: row[11] || ''
      };
    }
  }
  
  return assignments;
}

async function updateGoogleSheets(games) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const spreadsheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(credentials)
    })
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Get existing assignments before clearing
  const existingAssignments = await getExistingAssignments(access_token, spreadsheetId);
  console.log(`  Preserving ${Object.keys(existingAssignments).length} existing assignments`);
  
  // Header row
  const header = ['game_id', 'date', 'time', 'away', 'home', 'gender', 'level', 'division', 'photog1', 'photog2', 'videog', 'notes'];
  
  // Build rows, preserving existing assignments
  const rows = games.map(g => {
    const existing = existingAssignments[g.game_id] || {};
    return [
      g.game_id,
      g.date,
      g.time,
      g.away_team,
      g.home_team,
      g.gender,
      g.level,
      g.division,
      existing.photog1 || '',
      existing.photog2 || '',
      existing.videog || '',
      existing.notes || ''
    ];
  });
  
  // Sort by date, then time
  rows.sort((a, b) => {
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return a[2].localeCompare(b[2]);
  });
  
  // Clear and update sheet
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:L:clear`, {
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
