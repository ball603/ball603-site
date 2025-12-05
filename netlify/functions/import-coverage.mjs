// Bulk import coverage assignments
// Handles NHIAA (match existing) and College (add to College tab)

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
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken));
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

async function getSheetGames(accessToken, spreadsheetId, sheetName) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:O`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  const rows = data.values || [];
  
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const games = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const game = { rowIndex: i + 1 };
    headers.forEach((h, idx) => {
      game[h.toLowerCase()] = row[idx] || '';
    });
    games.push(game);
  }
  return games;
}

function normalizeTeamName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMatchingGame(games, imp) {
  const importAway = normalizeTeamName(imp.away);
  const importHome = normalizeTeamName(imp.home);
  const importGender = imp.gender.toLowerCase();
  
  // Exact date match
  let match = games.find(g => {
    return normalizeTeamName(g.away) === importAway && 
           normalizeTeamName(g.home) === importHome && 
           g.date === imp.date &&
           (g.gender || '').toLowerCase() === importGender;
  });
  
  if (match) return { game: match, dateChanged: false };
  
  // Different date (within 60 days)
  match = games.find(g => {
    if (normalizeTeamName(g.away) !== importAway || 
        normalizeTeamName(g.home) !== importHome ||
        (g.gender || '').toLowerCase() !== importGender) return false;
    
    const diff = Math.abs(new Date(g.date) - new Date(imp.date)) / (1000*60*60*24);
    return diff <= 60;
  });
  
  if (match) return { game: match, dateChanged: true, originalDate: imp.date };
  return null;
}

async function updateCell(accessToken, spreadsheetId, sheetName, row, col, value) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${col}${row}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[value]] })
    }
  );
}

async function appendRows(accessToken, spreadsheetId, sheetName, rows) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:O:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows })
    }
  );
}

const COLUMNS = { photog1: 'I', photog2: 'J', notes: 'M', original_date: 'N', schedule_changed: 'O' };

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('POST { nhiaa: [...], college: [...] }', { status: 405 });
  }
  
  try {
    const { nhiaa = [], college = [] } = await request.json();
    
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const spreadsheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
    const accessToken = await getAccessToken(credentials);
    
    const results = { nhiaaMatched: 0, nhiaaDateChanged: 0, nhiaaNotFound: 0, collegeAdded: 0, dateChanges: [], notFound: [] };
    
    // Process NHIAA imports (match to existing Schedules)
    if (nhiaa.length > 0) {
      const scheduleGames = await getSheetGames(accessToken, spreadsheetId, 'Schedules');
      console.log(`Loaded ${scheduleGames.length} games from Schedules`);
      
      for (const imp of nhiaa) {
        const matchResult = findMatchingGame(scheduleGames, imp);
        
        if (!matchResult) {
          results.nhiaaNotFound++;
          results.notFound.push(`${imp.date} ${imp.away} @ ${imp.home} (${imp.gender})`);
          continue;
        }
        
        const { game, dateChanged, originalDate } = matchResult;
        
        if (imp.photog1) await updateCell(accessToken, spreadsheetId, 'Schedules', game.rowIndex, COLUMNS.photog1, imp.photog1);
        if (imp.photog2) await updateCell(accessToken, spreadsheetId, 'Schedules', game.rowIndex, COLUMNS.photog2, imp.photog2);
        if (imp.notes) await updateCell(accessToken, spreadsheetId, 'Schedules', game.rowIndex, COLUMNS.notes, imp.notes);
        
        if (dateChanged) {
          await updateCell(accessToken, spreadsheetId, 'Schedules', game.rowIndex, COLUMNS.original_date, originalDate);
          await updateCell(accessToken, spreadsheetId, 'Schedules', game.rowIndex, COLUMNS.schedule_changed, 'YES');
          results.nhiaaDateChanged++;
          results.dateChanges.push(`${imp.away} @ ${imp.home}: ${originalDate} → ${game.date}`);
        }
        
        results.nhiaaMatched++;
      }
    }
    
    // Process College imports (add to College tab)
    if (college.length > 0) {
      const collegeRows = college.map(imp => {
        const gameId = `${imp.home}-vs-${imp.away}-${imp.gender}-college`.replace(/\s+/g, '-').toLowerCase();
        return [
          gameId,
          imp.date,
          '',  // time
          imp.away,
          imp.home,
          imp.gender,
          'College',
          imp.division || '',
          imp.photog1 || '',
          imp.photog2 || '',
          '',  // videog
          '',  // writer
          imp.notes || '',
          '',  // original_date
          ''   // schedule_changed
        ];
      });
      
      // Sort by date
      collegeRows.sort((a, b) => a[1].localeCompare(b[1]));
      
      await appendRows(accessToken, spreadsheetId, 'College', collegeRows);
      results.collegeAdded = collegeRows.length;
    }
    
    console.log(`Import done: ${results.nhiaaMatched} NHIAA matched, ${results.collegeAdded} College added`);
    
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
