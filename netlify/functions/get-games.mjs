// Ball603 Get Games API
// Returns schedule data with team abbreviations for public display

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

async function getTeamsData(accessToken, teamsSheetId) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${teamsSheetId}/values/Teams!A:Z`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const data = await response.json();
  const rows = data.values || [];
  
  if (rows.length === 0) return {};
  
  // Find column indices from header row
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const shortnameIdx = headers.indexOf('shortname');
  const abbrevIdx = headers.indexOf('abbrev');
  
  if (shortnameIdx === -1 || abbrevIdx === -1) {
    console.log('Teams sheet missing shortname or abbrev column');
    return {};
  }
  
  // Build lookup map: shortname -> abbreviation
  const teamsMap = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const shortname = row[shortnameIdx]?.trim();
    const abbrev = row[abbrevIdx]?.trim();
    if (shortname && abbrev) {
      teamsMap[shortname] = abbrev;
    }
  }
  
  return teamsMap;
}

export default async (request) => {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const scheduleSheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
    const teamsSheetId = process.env.GOOGLE_SHEETS_TEAMS_ID;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(credentials)
      })
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Fetch teams data for abbreviations
    const teamsMap = teamsSheetId ? await getTeamsData(access_token, teamsSheetId) : {};
    
    // Fetch schedule data
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${scheduleSheetId}/values/Schedules!A:U`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );
    
    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length === 0) {
      return new Response(JSON.stringify({ games: [] }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        }
      });
    }
    
    // Skip header row, map to objects
    // Columns: game_id, date, time, away, away_score, home, home_score, gender, level, division, 
    //          photog1, photog2, videog, writer, notes, original_date, schedule_changed,
    //          photos_url, recap_url, highlights_url, live_stream_url
    const games = rows.slice(1).map(row => {
      const away = row[3] || '';
      const home = row[5] || '';
      
      return {
        game_id: row[0] || '',
        date: row[1] || '',
        time: row[2] || '',
        away: away,
        away_abbrev: teamsMap[away] || away.substring(0, 3).toUpperCase(),
        away_score: row[4] || '',
        home: home,
        home_abbrev: teamsMap[home] || home.substring(0, 3).toUpperCase(),
        home_score: row[6] || '',
        gender: row[7] || '',
        level: row[8] || '',
        division: row[9] || '',
        photos_url: row[17] || '',
        recap_url: row[18] || '',
        highlights_url: row[19] || '',
        live_stream_url: row[20] || ''
      };
    });
    
    return new Response(JSON.stringify({ games, teamsLoaded: Object.keys(teamsMap).length }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
    
  } catch (error) {
    console.error('Get games error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
