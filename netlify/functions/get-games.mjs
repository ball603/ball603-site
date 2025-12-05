// Get all games from Schedules, College, and Prep tabs

async function createJWT(credentials) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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

async function getAccessToken(credentials) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(credentials)
    })
  });
  
  const { access_token } = await tokenResponse.json();
  return access_token;
}

async function fetchSheet(accessToken, spreadsheetId, sheetName) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:L`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const data = await response.json();
  return data.values || [];
}

function parseRows(rows, defaultLevel) {
  if (rows.length < 2) return [];
  
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const games = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    
    const game = {};
    headers.forEach((header, idx) => {
      game[header] = row[idx] || '';
    });
    
    // Normalize field names
    games.push({
      game_id: game.game_id || `${game.date}-${game.home}-${game.away}`.replace(/\s+/g, '-').toLowerCase(),
      date: game.date || '',
      time: game.time || '',
      away: game.away || '',
      home: game.home || '',
      gender: game.gender || '',
      level: game.level || defaultLevel,
      division: game.division || '',
      photog1: game.photog1 || '',
      photog2: game.photog2 || '',
      videog: game.videog || '',
      notes: game.notes || ''
    });
  }
  
  return games;
}

export default async (request) => {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const spreadsheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
    
    const accessToken = await getAccessToken(credentials);
    
    // Fetch all three tabs
    const [schedulesRows, collegeRows, prepRows] = await Promise.all([
      fetchSheet(accessToken, spreadsheetId, 'Schedules'),
      fetchSheet(accessToken, spreadsheetId, 'College'),
      fetchSheet(accessToken, spreadsheetId, 'Prep')
    ]);
    
    // Parse each tab
    const schedulesGames = parseRows(schedulesRows, 'NHIAA');
    const collegeGames = parseRows(collegeRows, 'College');
    const prepGames = parseRows(prepRows, 'Prep');
    
    // Combine all games
    const allGames = [...schedulesGames, ...collegeGames, ...prepGames];
    
    return new Response(JSON.stringify({
      success: true,
      games: allGames,
      counts: {
        nhiaa: schedulesGames.length,
        college: collegeGames.length,
        prep: prepGames.length,
        total: allGames.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching games:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
