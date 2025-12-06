// Ball603 NHIAA Schedule Scraper
// Runs 3x daily via Netlify scheduled functions
// Preserves assignments and detects schedule changes

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

// Normalize team names to shortnames
function normalizeTeamName(name) {
  if (!name) return name;
  const normalizations = {
    'Alvirne High School': 'Alvirne',
    'Bedford High School': 'Bedford',
    'Belmont High School': 'Belmont',
    'Berlin Middle High School': 'Berlin',
    'Bishop Brady High School': 'Bishop Brady',
    'Bishop Guertin High School': 'Bishop Guertin',
    'Bow High School': 'Bow',
    'Campbell High School': 'Campbell',
    'Coe-Brown Northwood': 'Coe-Brown',
    'Coe-Brown Northwood Academy': 'Coe-Brown',
    'Colebrook Academy': 'Colebrook',
    'ConVal Regional High School': 'ConVal',
    'Conant Middle High School': 'Conant',
    'Concord Christian Academy': 'Concord Christian',
    'Concord High School': 'Concord',
    'Derryfield School': 'Derryfield',
    'Dover High School': 'Dover',
    'Epping Middle High School': 'Epping',
    'Exeter High School': 'Exeter',
    'Fall Mountain Regional High School': 'Fall Mountain',
    'Farmington High School': 'Farmington',
    'Franklin High School': 'Franklin',
    'Gilford High School': 'Gilford',
    'Goffstown High School': 'Goffstown',
    'Gorham High School': 'Gorham',
    'Groveton High School': 'Groveton',
    'Hanover High School': 'Hanover',
    'Hillsboro-Deering High School': 'Hillsboro-Deering',
    'Hinsdale High School': 'Hinsdale',
    'Hollis-Brookline High School': 'Hollis-Brookline',
    'Holy Family Academy': 'Holy Family',
    'Hopkinton Middle High School': 'Hopkinton',
    'Inter-Lakes Middle High School': 'Inter-Lakes',
    'John Stark Regional High School': 'John Stark',
    'Kearsarge Regional High School': 'Kearsarge',
    'Keene High School': 'Keene',
    'Kennett High School': 'Kennett',
    'Kingswood Regional High School': 'Kingswood',
    'Laconia High School': 'Laconia',
    'Lebanon High School': 'Lebanon',
    'Lin-Wood Public School': 'Lin-Wood',
    'Lisbon Regional School': 'Lisbon',
    'Littleton High School': 'Littleton',
    'Londonderry High School': 'Londonderry',
    'Manchester Central High School': 'Manchester Central',
    'Manchester Memorial High School': 'Manchester Memorial',
    'Manchester West High School': 'Manchester West',
    'Mascenic Regional High School': 'Mascenic',
    'Mascoma': 'Mascoma Valley',
    'Mascoma Valley Regional High School': 'Mascoma Valley',
    'Merrimack High School': 'Merrimack',
    'Merrimack Valley High School': 'Merrimack Valley',
    'Milford High School': 'Milford',
    'Monadnock Regional High School': 'Monadnock',
    'Moultonborough Academy': 'Moultonborough',
    'Mount Royal Academy': 'Mount Royal',
    'Nashua High School North': 'Nashua North',
    'Nashua High School South': 'Nashua South',
    'Newfound Regional High School': 'Newfound',
    'Newmarket Jr/Sr': 'Newmarket',
    'Newmarket Senior High School': 'Newmarket',
    'Newport High School': 'Newport',
    'Nute High School': 'Nute',
    'Oyster River High School': 'Oyster River',
    'Pelham High School': 'Pelham',
    'Pembroke Academy': 'Pembroke',
    'Pinkerton Academy': 'Pinkerton',
    'Pittsburg High School': 'Pittsburg',
    'Plymouth Regional High School': 'Plymouth',
    'Portsmouth Christian Academy': 'Portsmouth Christian',
    'Portsmouth High School': 'Portsmouth',
    'Profile School': 'Profile',
    'Prospect Mountain High School': 'Prospect Mountain',
    'Raymond High School': 'Raymond',
    'Saint Thomas Aquinas High School': 'St. Thomas Aquinas',
    'Salem High School': 'Salem',
    'Sanborn Regional High School': 'Sanborn',
    'Somersworth High School': 'Somersworth',
    'Souhegan High School': 'Souhegan',
    'Spaulding High School': 'Spaulding',
    'Stevens High School': 'Stevens',
    'Sunapee High School': 'Sunapee',
    'Timberlane Regional High School': 'Timberlane',
    'Trinity High School': 'Trinity',
    'White Mountains Regional High School': 'White Mountains',
    'Wilton-Lyndeborough High School': 'Wilton-Lyndeborough',
    'Windham High School': 'Windham',
    'Winnacunnet High School': 'Winnacunnet',
    'Winnisquam Regional High School': 'Winnisquam',
    'Woodsville High School': 'Woodsville',
  };
  return normalizations[name] || name;
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
    
    // Updated regex to capture all columns including score
    // Columns: Date | At/Vs | Opponent | ??? | Time/Result | Score (optional)
    const rowRegex = /<tr>\s*<td>(\d{2}\/\d{2}\/\d{2})<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td>([^<]+)<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>([^<]*)<\/td>)?/gi;
    
    let match;
    while ((match = rowRegex.exec(section)) !== null) {
      const date = match[1].trim();
      const atIndicator = match[2].trim();
      const opponent = match[3].trim();
      const timeOrResult = match[4].trim();
      const scoreStr = match[5] ? match[5].trim() : '';
      
      if (!date || !opponent) continue;
      
      const isAway = atIndicator.toLowerCase() === 'at';
      const homeTeam = normalizeTeamName(isAway ? opponent : teamName);
      const awayTeam = normalizeTeamName(isAway ? teamName : opponent);
      
      const [month, day, year] = date.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Determine if game is completed (W or L) or upcoming (time)
      const isCompleted = timeOrResult === 'W' || timeOrResult === 'L';
      
      // Parse score if present (format: "37-60" = team score - opponent score)
      let homeScore = '';
      let awayScore = '';
      if (isCompleted && scoreStr) {
        const scoreParts = scoreStr.split('-');
        if (scoreParts.length === 2) {
          const teamScore = scoreParts[0].trim();
          const oppScore = scoreParts[1].trim();
          // From perspective of team whose schedule we're reading:
          // If home game: team is home, opponent is away
          // If away game: team is away, opponent is home
          if (isAway) {
            awayScore = teamScore;
            homeScore = oppScore;
          } else {
            homeScore = teamScore;
            awayScore = oppScore;
          }
        }
      }
      
      // Game ID based on teams only (not date) so we can track reschedules
      const gameId = `${homeTeam}-vs-${awayTeam}-${gender}-${division}`.replace(/\s+/g, '-').toLowerCase();
      
      games.push({
        game_id: gameId,
        date: isoDate,
        time: isCompleted ? 'FINAL' : timeOrResult,
        away_team: awayTeam,
        home_team: homeTeam,
        away_score: awayScore,
        home_score: homeScore,
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

async function getExistingData(accessToken, spreadsheetId) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:U`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const data = await response.json();
  const rows = data.values || [];
  
  // Build map of game_id -> existing data
  // Columns: game_id, date, time, away, away_score, home, home_score, gender, level, division, photog1, photog2, videog, writer, notes, original_date, schedule_changed, photos_url, recap_url, highlights_url, live_stream_url
  const existingGames = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const gameId = row[0];
    if (gameId) {
      existingGames[gameId] = {
        date: row[1] || '',
        time: row[2] || '',
        away_score: row[4] || '',
        home_score: row[6] || '',
        photog1: row[10] || '',
        photog2: row[11] || '',
        videog: row[12] || '',
        writer: row[13] || '',
        notes: row[14] || '',
        original_date: row[15] || '',
        schedule_changed: row[16] || '',
        photos_url: row[17] || '',
        recap_url: row[18] || '',
        highlights_url: row[19] || '',
        live_stream_url: row[20] || ''
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
  
  // Header row with score and coverage columns
  const header = ['game_id', 'date', 'time', 'away', 'away_score', 'home', 'home_score', 'gender', 'level', 'division', 'photog1', 'photog2', 'videog', 'writer', 'notes', 'original_date', 'schedule_changed', 'photos_url', 'recap_url', 'highlights_url', 'live_stream_url'];
  
  let changesDetected = 0;
  
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
    
    // Use scraped scores, or preserve existing scores if manually entered
    const awayScore = g.away_score || existing.away_score || '';
    const homeScore = g.home_score || existing.home_score || '';
    // If we have scores but time isn't FINAL yet, mark it FINAL
    const time = (awayScore && homeScore && g.time !== 'FINAL') ? 'FINAL' : g.time;
    
    return [
      g.game_id,
      g.date,
      time,
      g.away_team,
      awayScore,
      g.home_team,
      homeScore,
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
      existing.photos_url || '',
      existing.recap_url || '',
      existing.highlights_url || '',
      existing.live_stream_url || ''
    ];
  });
  
  if (changesDetected > 0) {
    console.log(`  ⚠️ Total schedule changes detected: ${changesDetected}`);
  }
  
  // Sort by date, then time
  rows.sort((a, b) => {
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return a[2].localeCompare(b[2]);
  });
  
  // Clear and update sheet
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Schedules!A:U:clear`, {
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
  
  return { rowCount: rows.length, changesDetected };
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
    
    const { rowCount, changesDetected } = await updateGoogleSheets(dedupedGames);
    
    return new Response(JSON.stringify({
      success: true,
      gamesScraped: dedupedGames.length,
      scheduleChanges: changesDetected,
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
