// Ball603 NHIAA Schedule Scraper
// Runs 3x daily via Netlify scheduled functions
// Preserves assignments, detects schedule changes, and captures scores

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

// Detect if a string is a score (e.g., "72-58", "45-42") vs a time (e.g., "7:00 PM")
function isScore(str) {
  if (!str) return false;
  // Score pattern: number-number (with optional spaces)
  return /^\d+\s*[-–]\s*\d+$/.test(str.trim());
}

// Parse score string into away and home scores
// Note: NHIAA shows score from perspective of the team in that section
// If team is home, format is "homeScore-awayScore"
// If team is away, format is "awayScore-homeScore"
function parseScore(str, isAway) {
  if (!str) return { away: null, home: null };
  const match = str.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!match) return { away: null, home: null };
  
  const firstScore = parseInt(match[1]);
  const secondScore = parseInt(match[2]);
  
  // If viewing from away team's perspective: first score is away, second is home
  // If viewing from home team's perspective: first score is home, second is away
  if (isAway) {
    return { away: firstScore, home: secondScore };
  } else {
    return { away: secondScore, home: firstScore };
  }
}

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
      const timeOrScore = match[4].trim();
      
      if (!date || !opponent) continue;
      
      const isAway = atIndicator.toLowerCase() === 'at';
      const homeTeam = isAway ? opponent : teamName;
      const awayTeam = isAway ? teamName : opponent;
      
      const [month, day, year] = date.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Game ID based on teams only (not date) so we can track reschedules
      const gameId = `${homeTeam}-vs-${awayTeam}-${gender}-${division}`.replace(/\s+/g, '-').toLowerCase();
      
      // Check if timeOrScore is a score or a time
      let time = '';
      let scoreAway = null;
      let scoreHome = null;
      
      if (isScore(timeOrScore)) {
        const scores = parseScore(timeOrScore, isAway);
        scoreAway = scores.away;
        scoreHome = scores.home;
      } else {
        time = timeOrScore;
      }
      
      games.push({
        game_id: gameId,
        date: isoDate,
        time: time,
        away_team: awayTeam,
        home_team: homeTeam,
        gender: gender,
        level: 'NHIAA',
        division: division,
        score_away: scoreAway,
        score_home: scoreHome
      });
    }
  }
  
  return games;
}

function deduplicateGames(games) {
  const seen = new Map();
  
  games.forEach(game => {
    if (seen.has(game.game_id)) {
      // If we already have this game, merge scores if the new one has them
      const existing = seen.get(game.game_id);
      if (game.score_away !== null && existing.score_away === null) {
        existing.score_away = game.score_away;
        existing.score_home = game.score_home;
      }
    } else {
      seen.set(game.game_id, game);
    }
  });
  
  return Array.from(seen.values());
}

async function getExistingData(accessToken, spreadsheetId) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:S`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const data = await response.json();
  const rows = data.values || [];
  
  // Build map of game_id -> existing data
  const existingGames = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const gameId = row[0];
    if (gameId) {
      existingGames[gameId] = {
        date: row[1] || '',
        time: row[2] || '',
        photog1: row[8] || '',
        photog2: row[9] || '',
        videog: row[10] || '',
        writer: row[11] || '',
        notes: row[12] || '',
        original_date: row[13] || '',
        schedule_changed: row[14] || '',
        score_away: row[15] || '',
        score_home: row[16] || '',
        score_source: row[17] || '',
        score_mismatch: row[18] || ''
      };
    }
  }
  
  return existingGames;
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
  
  // Get existing data
  const existingGames = await getExistingData(access_token, spreadsheetId);
  console.log(`  Found ${Object.keys(existingGames).length} existing games`);
  
  // Header row with score columns
  const header = [
    'game_id', 'date', 'time', 'away', 'home', 'gender', 'level', 'division',
    'photog1', 'photog2', 'videog', 'writer', 'notes', 'original_date', 'schedule_changed',
    'score_away', 'score_home', 'score_source', 'score_mismatch'
  ];
  
  let changesDetected = 0;
  let scoresAdded = 0;
  let mismatches = 0;
  
  // Build rows, preserving assignments and detecting changes
  const rows = games.map(g => {
    const existing = existingGames[g.game_id] || {};
    
    // Check if this game has an assignment
    const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
    
    // Detect schedule change
    let originalDate = existing.original_date || '';
    let scheduleChanged = existing.schedule_changed || '';
    
    if (hasAssignment && existing.date && existing.date !== g.date) {
      // Date changed for a claimed game!
      originalDate = existing.original_date || existing.date;
      scheduleChanged = 'YES';
      changesDetected++;
      console.log(`  ⚠️ Schedule change detected: ${g.home_team} vs ${g.away_team} moved from ${existing.date} to ${g.date}`);
    }
    
    // If game was claimed but no original_date set yet, set it now
    if (hasAssignment && !originalDate) {
      originalDate = g.date;
    }
    
    // Handle scores - first one in wins
    let scoreAway = existing.score_away || '';
    let scoreHome = existing.score_home || '';
    let scoreSource = existing.score_source || '';
    let scoreMismatch = existing.score_mismatch || '';
    
    if (g.score_away !== null) {
      // NHIAA has a score for this game
      if (!scoreAway && !scoreHome) {
        // No existing score - use NHIAA score
        scoreAway = g.score_away;
        scoreHome = g.score_home;
        scoreSource = 'nhiaa';
        scoresAdded++;
        console.log(`  📊 Score added from NHIAA: ${g.away_team} ${g.score_away} - ${g.home_team} ${g.score_home}`);
      } else if (scoreSource === 'manual') {
        // We have a manual score - check if NHIAA differs
        if (parseInt(scoreAway) !== g.score_away || parseInt(scoreHome) !== g.score_home) {
          scoreMismatch = `NHIAA: ${g.score_away}-${g.score_home}`;
          mismatches++;
          console.log(`  ⚠️ Score mismatch: ${g.away_team} @ ${g.home_team} - Manual: ${scoreAway}-${scoreHome}, NHIAA: ${g.score_away}-${g.score_home}`);
        }
      }
    }
    
    return [
      g.game_id,
      g.date,
      g.time || existing.time || '',
      g.away_team,
      g.home_team,
      g.gender,
      g.level,
      g.division,
      existing.photog1 || '',
      existing.photog2 || '',
      existing.videog || '',
      existing.writer || '',
      existing.notes || '',
      originalDate,
      scheduleChanged,
      scoreAway,
      scoreHome,
      scoreSource,
      scoreMismatch
    ];
  });
  
  if (changesDetected > 0) {
    console.log(`  ⚠️ Total schedule changes detected: ${changesDetected}`);
  }
  if (scoresAdded > 0) {
    console.log(`  📊 Total scores added from NHIAA: ${scoresAdded}`);
  }
  if (mismatches > 0) {
    console.log(`  ⚠️ Total score mismatches: ${mismatches}`);
  }
  
  // Sort by date, then time
  rows.sort((a, b) => {
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return (a[2] || '').localeCompare(b[2] || '');
  });
  
  // Clear and update sheet
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:S:clear`, {
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
  
  return { rowCount: rows.length, changesDetected, scoresAdded, mismatches };
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
    
    const { rowCount, changesDetected, scoresAdded, mismatches } = await updateGoogleSheets(dedupedGames);
    
    return new Response(JSON.stringify({
      success: true,
      gamesScraped: dedupedGames.length,
      scheduleChanges: changesDetected,
      scoresAdded: scoresAdded,
      scoreMismatches: mismatches,
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
