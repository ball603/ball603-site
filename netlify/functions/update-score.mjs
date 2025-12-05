// Ball603 Manual Score Entry API
// Allows contributors to enter scores before NHIAA updates

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

async function getAccessToken() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  
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

export default async (request) => {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { gameId, scoreAway, scoreHome, enteredBy } = await request.json();
    
    // Validate inputs
    if (!gameId) {
      return new Response(JSON.stringify({ error: 'gameId is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (scoreAway === undefined || scoreHome === undefined) {
      return new Response(JSON.stringify({ error: 'scoreAway and scoreHome are required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const awayScore = parseInt(scoreAway);
    const homeScore = parseInt(scoreHome);
    
    if (isNaN(awayScore) || isNaN(homeScore) || awayScore < 0 || homeScore < 0) {
      return new Response(JSON.stringify({ error: 'Invalid scores' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const spreadsheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
    const accessToken = await getAccessToken();
    
    // Get all data to find the row
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:S`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    const data = await response.json();
    const rows = data.values || [];
    
    // Find the row index for this game
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === gameId) {
        rowIndex = i + 1; // Sheets are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return new Response(JSON.stringify({ error: 'Game not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get existing score info
    const existingRow = rows[rowIndex - 1];
    const existingScoreAway = existingRow[15] || '';
    const existingScoreHome = existingRow[16] || '';
    const existingSource = existingRow[17] || '';
    
    // Check if score already exists
    let message = '';
    if (existingScoreAway && existingScoreHome) {
      // Score exists - update anyway but note it
      message = `Score updated (was ${existingScoreAway}-${existingScoreHome} from ${existingSource})`;
    } else {
      message = 'Score added successfully';
    }
    
    // Update the score columns (P, Q, R = columns 16, 17, 18 = indices 15, 16, 17)
    // Column P (16) = score_away
    // Column Q (17) = score_home  
    // Column R (18) = score_source
    const updateRange = `Schedules!P${rowIndex}:R${rowIndex}`;
    
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[awayScore, homeScore, `manual (${enteredBy || 'unknown'})`]]
        })
      }
    );
    
    return new Response(JSON.stringify({ 
      success: true, 
      message,
      gameId,
      scoreAway: awayScore,
      scoreHome: homeScore
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Update score error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
