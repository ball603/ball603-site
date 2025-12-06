// Ball603 Get Games API
// Returns schedule data from Google Sheets for public display

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

export default async (request) => {
  try {
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
    
    // Fetch schedule data
    // Columns: game_id, date, time, away, away_score, home, home_score, gender, level, division, 
    //          photog1, photog2, videog, writer, notes, original_date, schedule_changed,
    //          photos_url, recap_url, highlights_url, live_stream_url
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:U`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );
    
    const data = await response.json();
    const rows = data.values || [];
    
    // Skip header row, map to objects
    const games = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // Skip empty rows
      
      games.push({
        game_id: row[0] || '',
        date: row[1] || '',
        time: row[2] || '',
        away: row[3] || '',
        away_score: row[4] || '',
        home: row[5] || '',
        home_score: row[6] || '',
        gender: row[7] || '',
        level: row[8] || '',
        division: row[9] || '',
        // Coverage URLs (columns R, S, T, U = indices 17, 18, 19, 20)
        photos_url: row[17] || '',
        recap_url: row[18] || '',
        highlights_url: row[19] || '',
        live_stream_url: row[20] || ''
      });
    }
    
    return new Response(JSON.stringify({ games }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
      }
    });
    
  } catch (error) {
    console.error('Get games error:', error);
    return new Response(JSON.stringify({ error: error.message, games: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
