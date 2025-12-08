// Ball603 College Basketball ESPN Scraper
// Scrapes D1 schedules for UNH and Dartmouth from ESPN
// Runs every 2 hours during basketball season (Nov-Mar)

// ESPN Team IDs and configuration
const ESPN_TEAMS = {
  'UNH': {
    id: 160,
    name: 'New Hampshire',
    shortname: 'UNH',
    abbrev: 'UNH',
    location: 'Durham',
    arena: 'Lundholm Gymnasium'
  },
  'Dartmouth': {
    id: 159,
    name: 'Dartmouth',
    shortname: 'Dartmouth',
    abbrev: 'DART',
    location: 'Hanover',
    arena: 'Leede Arena'
  }
};

// ESPN URL patterns
const ESPN_URLS = {
  mens: (id) => `https://www.espn.com/mens-college-basketball/team/schedule/_/id/${id}`,
  womens: (id) => `https://www.espn.com/womens-college-basketball/team/schedule/_/id/${id}`
};

// Conference teams that we track (for identifying opponent as NH team)
const NH_COLLEGE_TEAMS = ['New Hampshire', 'UNH', 'Dartmouth'];

/**
 * Parse ESPN schedule page HTML
 * @param {string} html - Raw HTML from ESPN
 * @param {object} team - Team configuration object
 * @param {string} gender - 'Boys' or 'Girls' (using Ball603 convention)
 * @returns {Array} Array of game objects
 */
function parseESPNSchedule(html, team, gender) {
  const games = [];
  
  // ESPN uses table rows with specific patterns
  // Completed games: DATE | OPPONENT | RESULT | W-L | ...
  // Upcoming games: DATE | OPPONENT | TIME | TV | ...
  
  // Pattern for table rows containing game data
  // Looking for rows with dates like "Mon, Nov 3" or "Wed, Dec 17"
  const rowPattern = /\|\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+(?:Nov|Dec|Jan|Feb|Mar)\s+\d{1,2})\s*\|\s*([^|]+)\|\s*([^|]+)/g;
  
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const dateStr = match[1].trim();
    const opponentCell = match[2].trim();
    const resultOrTimeCell = match[3].trim();
    
    // Parse date - ESPN uses format like "Mon, Nov 3"
    const parsedDate = parseESPNDate(dateStr);
    if (!parsedDate) continue;
    
    // Determine home/away from opponent cell
    // "@[Team]" = away, "vs[Team]" or "vs Team" = home
    const isAway = opponentCell.startsWith('@') || opponentCell.includes('@[');
    
    // Extract opponent name - ESPN format often has: "@[Team](/link) [Team](/link)" or "vs[Team](/link) [Team](/link)"
    // First, remove the @ or vs prefix
    let opponent = opponentCell
      .replace(/^@/, '')
      .replace(/^vs/, '')
      .trim();
    
    // Remove markdown-style links: [Text](/path)
    // This captures the text inside brackets before the link
    const bracketMatches = opponent.match(/\[([^\]]+)\]/g);
    if (bracketMatches && bracketMatches.length > 0) {
      // Take the first bracketed name (avoid duplicates)
      opponent = bracketMatches[0].replace(/\[|\]/g, '').trim();
    } else {
      // No brackets - clean up any link syntax
      opponent = opponent.replace(/\([^)]+\)/g, '').trim();
      // Handle "TeamNameTeamName" duplicates
      const halfLen = Math.floor(opponent.length / 2);
      if (opponent.length > 6 && opponent.substring(0, halfLen) === opponent.substring(halfLen)) {
        opponent = opponent.substring(0, halfLen);
      }
    }
    
    // If still empty or invalid, skip
    if (!opponent || opponent.length < 2) continue;
    
    // Determine home/away teams
    const homeTeam = isAway ? normalizeCollegeName(opponent) : team.shortname;
    const awayTeam = isAway ? team.shortname : normalizeCollegeName(opponent);
    
    // Parse result or time
    let time = '';
    let homeScore = '';
    let awayScore = '';
    let status = 'scheduled';
    
    // Check if this is a completed game (has W or L result)
    const resultMatch = resultOrTimeCell.match(/([WL])\[(\d+)-(\d+)(?:\s+OT)?\]/i);
    if (resultMatch) {
      const [, winLoss, score1, score2] = resultMatch;
      status = 'final';
      time = 'FINAL';
      
      // ESPN format: the first score is always the winning team's score
      // W[88-82] = Team won 88-82 (team 88, opp 82)
      // L[88-38] = Team lost 88-38 (opp 88, team 38)
      const teamWon = winLoss.toUpperCase() === 'W';
      let teamScore, oppScore;
      
      if (teamWon) {
        // Team won: first score is team's, second is opponent's
        teamScore = parseInt(score1);
        oppScore = parseInt(score2);
      } else {
        // Team lost: first score is opponent's, second is team's  
        teamScore = parseInt(score2);
        oppScore = parseInt(score1);
      }
      
      if (isAway) {
        // Team played away: team is away, opponent is home
        awayScore = teamScore.toString();
        homeScore = oppScore.toString();
      } else {
        // Team played at home: team is home, opponent is away
        homeScore = teamScore.toString();
        awayScore = oppScore.toString();
      }
    } else {
      // Upcoming game - extract time
      const timeMatch = resultOrTimeCell.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      if (timeMatch) {
        time = timeMatch[1].toUpperCase();
        // Normalize time format
        if (!time.includes('AM') && !time.includes('PM')) {
          // ESPN usually uses PM for evening games
          const hour = parseInt(time.split(':')[0]);
          time = hour < 10 || hour === 12 ? time + ' PM' : time + ' PM';
        }
      }
    }
    
    // Generate game ID - format: college_{home}_{m|w}_{YYYYMMDD}_{away}
    const genderCode = gender === 'Boys' ? 'm' : 'w';
    const dateCode = parsedDate.replace(/-/g, '');
    const homeCode = homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
    const awayCode = awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
    const gameId = `college_${homeCode}_${genderCode}_${dateCode}_${awayCode}`;
    
    games.push({
      game_id: gameId,
      date: parsedDate,
      time: time,
      away_team: awayTeam,
      away_score: awayScore,
      home_team: homeTeam,
      home_score: homeScore,
      gender: gender,
      level: 'College',
      division: 'D1',
      status: status,
      source: 'ESPN',
      school: team.shortname
    });
  }
  
  return games;
}

/**
 * Parse ESPN date format to ISO date
 * @param {string} dateStr - Date like "Mon, Nov 3" or "Wed, Dec 17"
 * @returns {string|null} ISO date string or null if invalid
 */
function parseESPNDate(dateStr) {
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  // Match pattern: "Day, Mon DD"
  const match = dateStr.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+(Nov|Dec|Jan|Feb|Mar|Apr)\s+(\d{1,2})/i);
  if (!match) return null;
  
  const [, month, day] = match;
  const monthNum = months[month];
  if (!monthNum) return null;
  
  // Determine year - basketball season spans Nov-Mar
  // If Nov/Dec, use current year; if Jan-Apr, use next year
  const now = new Date();
  let year = now.getFullYear();
  
  if (['Jan', 'Feb', 'Mar', 'Apr'].includes(month)) {
    // Spring months - if we're currently in fall, this is next year
    if (now.getMonth() >= 8) { // Sept or later
      year = year + 1;
    }
  }
  
  const dayPadded = day.padStart(2, '0');
  return `${year}-${monthNum}-${dayPadded}`;
}

/**
 * Normalize college names to short form
 */
function normalizeCollegeName(name) {
  if (!name) return name;
  
  const normalizations = {
    'New Hampshire': 'UNH',
    'New Hampshire Wildcats': 'UNH',
    'Dartmouth': 'Dartmouth',
    'Dartmouth Big Green': 'Dartmouth',
    'Boston University': 'Boston U',
    'Boston University Terriers': 'Boston U',
    'Vermont': 'Vermont',
    'Vermont Catamounts': 'Vermont',
    'Maine': 'Maine',
    'Maine Black Bears': 'Maine',
    'UMass Lowell': 'UMass Lowell',
    'UMass Lowell River Hawks': 'UMass Lowell',
    'UMBC': 'UMBC',
    'UMBC Retrievers': 'UMBC',
    'Binghamton': 'Binghamton',
    'Binghamton Bearcats': 'Binghamton',
    'UAlbany': 'UAlbany',
    'Albany': 'UAlbany',
    'UAlbany Great Danes': 'UAlbany',
    'NJIT': 'NJIT',
    'NJIT Highlanders': 'NJIT',
    'Bryant': 'Bryant',
    'Bryant Bulldogs': 'Bryant',
    'Stonehill': 'Stonehill',
    'Stonehill Skyhawks': 'Stonehill',
    'Harvard': 'Harvard',
    'Harvard Crimson': 'Harvard',
    'Yale': 'Yale',
    'Yale Bulldogs': 'Yale',
    'Brown': 'Brown',
    'Brown Bears': 'Brown',
    'Princeton': 'Princeton',
    'Princeton Tigers': 'Princeton',
    'Pennsylvania': 'Penn',
    'Penn': 'Penn',
    'Cornell': 'Cornell',
    'Cornell Big Red': 'Cornell',
    'Columbia': 'Columbia',
    'Columbia Lions': 'Columbia',
    'Clemson': 'Clemson',
    'Clemson Tigers': 'Clemson',
    'Providence': 'Providence',
    'Providence Friars': 'Providence',
    'George Mason': 'George Mason',
    'George Mason Patriots': 'George Mason',
    'Fairfield': 'Fairfield',
    'Fairfield Stags': 'Fairfield',
    'Saint Louis': 'Saint Louis',
    'Nebraska': 'Nebraska',
    'Nebraska Cornhuskers': 'Nebraska',
    'Curry College': 'Curry College',
    'Emmanuel (MA)': 'Emmanuel',
    'Emmanuel': 'Emmanuel',
    'Merrimack': 'Merrimack',
    'Holy Cross': 'Holy Cross',
    'Boston College': 'Boston College',
    'Colgate': 'Colgate',
    'Green Bay': 'Green Bay',
    'New England College': 'New England College',
    'Army': 'Army',
    'Louisville': 'Louisville',
    'Central Connecticut': 'Central Connecticut',
    'New Haven': 'New Haven',
    'Marist': 'Marist',
    'App State': 'App State',
    'Appalachian State': 'App State',
    'Maine-Augusta': 'Maine-Augusta',
    "Saint Peter's": "Saint Peter's",
    'Wyoming': 'Wyoming',
    'Colorado State': 'Colorado State',
    'Sacred Heart': 'Sacred Heart',
    'Florida': 'Florida',
    'Elms College': 'Elms College',
    'Colby-Sawyer': 'Colby-Sawyer',
    'Bucknell': 'Bucknell',
    'Iona': 'Iona',
    "St. Joseph's Brooklyn": "St. Joseph's Brooklyn",
    'Worcester State': 'Worcester State'
  };
  
  // Try direct match
  if (normalizations[name]) return normalizations[name];
  
  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(normalizations)) {
    if (key.toLowerCase() === lowerName) return value;
  }
  
  // Return original if no match
  return name;
}

/**
 * Fetch and parse schedule for a team
 */
async function scrapeTeamSchedule(team, gender) {
  const genderKey = gender === 'Boys' ? 'mens' : 'womens';
  const url = ESPN_URLS[genderKey](team.id);
  
  console.log(`  Fetching ${team.shortname} ${gender}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ball603/1.0)',
        'Accept': 'text/html'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const games = parseESPNSchedule(html, team, gender);
    
    console.log(`    Found ${games.length} games`);
    return games;
    
  } catch (error) {
    console.error(`    Error: ${error.message}`);
    return [];
  }
}

/**
 * Deduplicate games (same matchup might appear on both teams' schedules)
 */
function deduplicateGames(games) {
  const seen = new Map();
  
  for (const game of games) {
    // Create a canonical key that's the same regardless of which team's schedule we scraped from
    const teams = [game.home_team, game.away_team].sort();
    const key = `${game.date}_${teams[0]}_${teams[1]}_${game.gender}`;
    
    if (!seen.has(key)) {
      seen.set(key, game);
    } else {
      // If we have this game already, prefer the one with more data (scores, etc)
      const existing = seen.get(key);
      if (game.home_score && !existing.home_score) {
        seen.set(key, game);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Filter games to only those in New Hampshire (for contributor scheduling)
 * NH home games = games where UNH or Dartmouth is the home team
 */
function filterNHGames(games) {
  const nhTeams = ['UNH', 'Dartmouth'];
  return games.filter(g => nhTeams.includes(g.home_team));
}

/**
 * Create JWT for Google Sheets authentication
 */
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

/**
 * Get existing college games from Google Sheets
 */
async function getExistingCollegeGames(accessToken, spreadsheetId) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CollegeSchedules!A:W`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const { values: rows = [] } = await response.json();
  if (rows.length === 0) return {};
  
  // Columns match high school: game_id, date, time, away, away_score, home, home_score, gender, level, division, photog1, photog2, videog, writer, notes, original_date, schedule_changed, photos_url, recap_url, highlights_url, live_stream_url, gamedescription, specialevent
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
        live_stream_url: row[20] || '',
        gamedescription: row[21] || '',
        specialevent: row[22] || ''
      };
    }
  }
  
  return existingGames;
}

/**
 * Update Google Sheets with scraped games
 */
async function updateGoogleSheets(games) {
  // Check if we have credentials
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_SCHEDULE_ID) {
    console.log('  Google Sheets credentials not configured - returning games only');
    return { rowCount: games.length, changesDetected: 0, sheetsUpdated: false };
  }
  
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
  const existingGames = await getExistingCollegeGames(access_token, spreadsheetId);
  console.log(`  Found ${Object.keys(existingGames).length} existing college games`);
  
  // Header row - matches high school Schedules format exactly (23 columns)
  const header = [
    'game_id', 'date', 'time', 'away', 'away_score', 'home', 'home_score',
    'gender', 'level', 'division', 'photog1', 'photog2', 'videog', 'writer',
    'notes', 'original_date', 'schedule_changed', 'photos_url', 'recap_url',
    'highlights_url', 'live_stream_url', 'gamedescription', 'specialevent'
  ];
  
  let changesDetected = 0;
  
  // Build rows, preserving assignments
  const rows = games.map(g => {
    const existing = existingGames[g.game_id] || {};
    
    const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
    
    let originalDate = existing.original_date || '';
    let scheduleChanged = existing.schedule_changed || '';
    
    if (hasAssignment && existing.date && existing.date !== g.date) {
      originalDate = existing.original_date || existing.date;
      scheduleChanged = 'YES';
      changesDetected++;
      console.log(`  ⚠️ Schedule change: ${g.home_team} vs ${g.away_team} moved from ${existing.date} to ${g.date}`);
    }
    
    if (hasAssignment && !originalDate) {
      originalDate = g.date;
    }
    
    // Use scraped scores or preserve existing
    const awayScore = g.away_score || existing.away_score || '';
    const homeScore = g.home_score || existing.home_score || '';
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
      existing.live_stream_url || '',
      existing.gamedescription || '',
      existing.specialevent || ''
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
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CollegeSchedules!A:W:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CollegeSchedules!A1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [header, ...rows] })
  });
  
  return { rowCount: rows.length, changesDetected, sheetsUpdated: true };
}

/**
 * Main handler - Netlify function entry point
 */
export default async (request) => {
  console.log('Ball603 College ESPN Scraper - Starting...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const allGames = [];
    
    // Scrape both teams, both genders
    for (const [teamKey, team] of Object.entries(ESPN_TEAMS)) {
      // Men's basketball (Boys in Ball603 convention)
      const mensGames = await scrapeTeamSchedule(team, 'Boys');
      allGames.push(...mensGames);
      
      // Women's basketball (Girls in Ball603 convention)
      const womensGames = await scrapeTeamSchedule(team, 'Girls');
      allGames.push(...womensGames);
    }
    
    console.log(`Total games scraped: ${allGames.length}`);
    
    // Deduplicate (UNH vs Dartmouth appears on both schedules)
    const uniqueGames = deduplicateGames(allGames);
    console.log(`After deduplication: ${uniqueGames.length} games`);
    
    // Count NH home games
    const nhGames = filterNHGames(uniqueGames);
    console.log(`NH home games (for contributors): ${nhGames.length}`);
    
    // Update Google Sheets
    const { rowCount, changesDetected, sheetsUpdated } = await updateGoogleSheets(uniqueGames);
    
    const result = {
      success: true,
      gamesScraped: uniqueGames.length,
      nhHomeGames: nhGames.length,
      scheduleChanges: changesDetected,
      sheetsUpdated: sheetsUpdated,
      timestamp: new Date().toISOString(),
      teams: Object.keys(ESPN_TEAMS),
      games: uniqueGames // Include games in response for testing
    };
    
    console.log('Scrape complete:', JSON.stringify({
      ...result,
      games: `[${uniqueGames.length} games]` // Don't log all games
    }, null, 2));
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Netlify scheduled function config - every 2 hours during basketball season
export const config = {
  schedule: "0 */2 * 11,12,1,2,3 *"  // Every 2 hours, Nov-Mar only
};

// Export helper functions for testing
export {
  parseESPNSchedule,
  parseESPNDate,
  normalizeCollegeName,
  deduplicateGames,
  filterNHGames,
  ESPN_TEAMS,
  ESPN_URLS
};
