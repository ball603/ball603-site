// Ball603 College Basketball ESPN Scraper
// Uses ESPN's hidden JSON API for reliable data
// Scrapes D1 schedules for UNH and Dartmouth
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

// ESPN JSON API endpoints
const ESPN_API = {
  mensTeam: (id) => `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${id}/schedule`,
  womensTeam: (id) => `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/teams/${id}/schedule`
};

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
    'Albany Great Danes': 'UAlbany',
    'UAlbany Great Danes': 'UAlbany',
    'NJIT': 'NJIT',
    'NJIT Highlanders': 'NJIT',
    'Bryant': 'Bryant',
    'Bryant Bulldogs': 'Bryant',
    'Stonehill': 'Stonehill',
    'Stonehill Skyhawks': 'Stonehill',
    'Harvard': 'Harvard',
    'Harvard Crimson': 'Harvard',
    'Brown': 'Brown',
    'Brown Bears': 'Brown',
    'Yale': 'Yale',
    'Yale Bulldogs': 'Yale',
    'Providence': 'Providence',
    'Providence Friars': 'Providence',
    'Holy Cross': 'Holy Cross',
    'Holy Cross Crusaders': 'Holy Cross',
    'Boston College': 'Boston College',
    'Boston College Eagles': 'Boston College',
    'Northeastern': 'Northeastern',
    'Northeastern Huskies': 'Northeastern',
    'Syracuse': 'Syracuse',
    'Syracuse Orange': 'Syracuse',
    'UConn': 'UConn',
    'Connecticut Huskies': 'UConn',
    'Rhode Island': 'Rhode Island',
    'Rhode Island Rams': 'Rhode Island',
    'Merrimack': 'Merrimack',
    'Merrimack Warriors': 'Merrimack',
    'Central Connecticut': 'Central Conn',
    'Central Connecticut State': 'Central Conn',
    'Sacred Heart': 'Sacred Heart',
    'Sacred Heart Pioneers': 'Sacred Heart',
    'Fairfield': 'Fairfield',
    'Fairfield Stags': 'Fairfield',
    'Quinnipiac': 'Quinnipiac',
    'Quinnipiac Bobcats': 'Quinnipiac',
    'Saint Joseph\'s': 'Saint Joseph\'s',
    'Le Moyne': 'Le Moyne',
    'Le Moyne Dolphins': 'Le Moyne',
    'Clemson': 'Clemson',
    'Clemson Tigers': 'Clemson',
    'George Mason': 'George Mason',
    'George Mason Patriots': 'George Mason',
    'Nebraska': 'Nebraska',
    'Nebraska Cornhuskers': 'Nebraska',
    'Saint Louis': 'Saint Louis',
    'Saint Louis Billikens': 'Saint Louis',
    'Curry College': 'Curry',
    'Emmanuel (MA)': 'Emmanuel'
  };
  
  // Try direct match first
  if (normalizations[name]) {
    return normalizations[name];
  }
  
  // Try without " Wildcats", " Big Green", etc.
  const cleaned = name.replace(/ (Wildcats|Big Green|Terriers|Catamounts|Black Bears|River Hawks|Retrievers|Bearcats|Great Danes|Highlanders|Bulldogs|Skyhawks|Crimson|Bears|Friars|Crusaders|Eagles|Huskies|Orange|Rams|Warriors|Pioneers|Stags|Bobcats|Dolphins|Tigers|Patriots|Cornhuskers|Billikens)$/i, '');
  if (normalizations[cleaned]) {
    return normalizations[cleaned];
  }
  
  return name;
}

/**
 * Parse ESPN API JSON response into game objects
 * @param {object} data - JSON response from ESPN API
 * @param {object} team - Team configuration object
 * @param {string} gender - 'Men' or 'Women'
 * @returns {Array} Array of game objects
 */
function parseESPNAPIResponse(data, team, gender) {
  const games = [];
  
  if (!data || !data.events) {
    console.log(`    No events found in API response`);
    return games;
  }
  
  for (const event of data.events) {
    try {
      // Get competition details
      const competition = event.competitions?.[0];
      if (!competition) continue;
      
      // Get teams from competition
      const competitors = competition.competitors || [];
      if (competitors.length !== 2) continue;
      
      // Find home and away teams
      const homeCompetitor = competitors.find(c => c.homeAway === 'home');
      const awayCompetitor = competitors.find(c => c.homeAway === 'away');
      
      if (!homeCompetitor || !awayCompetitor) continue;
      
      const homeTeamName = homeCompetitor.team?.displayName || homeCompetitor.team?.name || '';
      const awayTeamName = awayCompetitor.team?.displayName || awayCompetitor.team?.name || '';
      
      // Parse date - ESPN returns ISO format
      const gameDate = event.date;
      if (!gameDate) continue;
      
      const dateObj = new Date(gameDate);
      const isoDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Parse time
      let time = '';
      let homeScore = '';
      let awayScore = '';
      
      const status = competition.status?.type?.name || '';
      const isCompleted = status === 'STATUS_FINAL' || competition.status?.type?.completed;
      
      if (isCompleted) {
        time = 'FINAL';
        homeScore = homeCompetitor.score || '';
        awayScore = awayCompetitor.score || '';
      } else {
        // Get scheduled time
        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/New_York'
        });
        time = timeStr.replace(':00', '').toUpperCase();
      }
      
      // Normalize team names
      const homeTeam = normalizeCollegeName(homeTeamName);
      const awayTeam = normalizeCollegeName(awayTeamName);
      
      // Generate game ID - format: college_{home}_{m|w}_{YYYYMMDD}_{away}
      const genderCode = gender === 'Men' ? 'm' : 'w';
      const dateCode = isoDate.replace(/-/g, '');
      const homeCode = homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
      const awayCode = awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
      const gameId = `college_${homeCode}_${genderCode}_${dateCode}_${awayCode}`;
      
      games.push({
        game_id: gameId,
        date: isoDate,
        time: time,
        away_team: awayTeam,
        away_score: awayScore,
        home_team: homeTeam,
        home_score: homeScore,
        gender: gender,
        level: 'College',
        division: 'D1',
        source: 'ESPN',
        school: team.shortname
      });
      
    } catch (err) {
      console.log(`    Error parsing event: ${err.message}`);
    }
  }
  
  return games;
}

/**
 * Fetch schedule for a team using ESPN JSON API
 */
async function scrapeTeamSchedule(team, gender) {
  const apiUrl = gender === 'Men' ? ESPN_API.mensTeam(team.id) : ESPN_API.womensTeam(team.id);
  
  console.log(`  Fetching ${team.shortname} ${gender} via API...`);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Ball603/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const games = parseESPNAPIResponse(data, team, gender);
    
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
  
  // Columns match high school format
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
  console.log('Ball603 College ESPN Scraper (JSON API) - Starting...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const allGames = [];
    
    // Scrape both teams, both genders
    for (const [teamKey, team] of Object.entries(ESPN_TEAMS)) {
      // Men's basketball
      const mensGames = await scrapeTeamSchedule(team, 'Men');
      allGames.push(...mensGames);
      
      // Women's basketball
      const womensGames = await scrapeTeamSchedule(team, 'Women');
      allGames.push(...womensGames);
      
      // Small delay between teams
      await new Promise(r => setTimeout(r, 300));
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
  parseESPNAPIResponse,
  normalizeCollegeName,
  deduplicateGames,
  filterNHGames,
  ESPN_TEAMS,
  ESPN_API
};
