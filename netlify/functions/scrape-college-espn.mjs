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
  
  // Trim whitespace
  name = name.trim();
  
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
    'Connecticut': 'UConn',
    'Connecticut Huskies': 'UConn',
    'Rhode Island': 'Rhode Island',
    'Rhode Island Rams': 'Rhode Island',
    'Merrimack': 'Merrimack',
    'Merrimack Warriors': 'Merrimack',
    'Central Connecticut': 'Central Conn',
    'Central Connecticut State': 'Central Conn',
    'Central Connecticut State Blue Devils': 'Central Conn',
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
    'Colgate': 'Colgate',
    'Colgate Raiders': 'Colgate',
    'Maine-Augusta': 'Maine-Augusta',
    'Maine-Augusta Moose': 'Maine-Augusta',
    'New England College': 'NEC',
    'New England College Pilgrims': 'NEC',
    'Thomas': 'Thomas',
    'Thomas College': 'Thomas',
    'Thomas College of Maine': 'Thomas',
    'Curry': 'Curry',
    'Curry College': 'Curry',
    'Emmanuel': 'Emmanuel',
    'Emmanuel (MA)': 'Emmanuel',
    'Southern New Hampshire': 'SNHU',
    'Southern New Hampshire Penmen': 'SNHU',
    'Saint Anselm': 'Saint Anselm',
    'Saint Anselm Hawks': 'Saint Anselm',
    'Franklin Pierce': 'Franklin Pierce',
    'Franklin Pierce Ravens': 'Franklin Pierce',
    'Assumption': 'Assumption',
    'Assumption Greyhounds': 'Assumption',
    'Louisville': 'Louisville',
    'Louisville Cardinals': 'Louisville',
    'Marist': 'Marist',
    'Marist Red Foxes': 'Marist',
    'Iona': 'Iona',
    'Iona Gaels': 'Iona',
    'Manhattan': 'Manhattan',
    'Manhattan Jaspers': 'Manhattan',
    'Siena': 'Siena',
    'Siena Saints': 'Siena',
    'Niagara': 'Niagara',
    'Niagara Purple Eagles': 'Niagara',
    'Canisius': 'Canisius',
    'Canisius Golden Griffins': 'Canisius',
    'Rider': 'Rider',
    'Rider Broncs': 'Rider',
    'Saint Peter\'s': 'Saint Peter\'s',
    'Saint Peter\'s Peacocks': 'Saint Peter\'s',
    'Monmouth': 'Monmouth',
    'Monmouth Hawks': 'Monmouth',
    'Wagner': 'Wagner',
    'Wagner Seahawks': 'Wagner',
    'Long Island': 'LIU',
    'LIU': 'LIU',
    'LIU Sharks': 'LIU',
    'Stony Brook': 'Stony Brook',
    'Stony Brook Seawolves': 'Stony Brook',
    'Army': 'Army',
    'Army Black Knights': 'Army',
    'Army West Point': 'Army',
    'Army West Point Black Knights': 'Army',
    'Wyoming': 'Wyoming',
    'Wyoming Cowboys': 'Wyoming',
    'Wyoming Cowgirls': 'Wyoming',
    'Navy': 'Navy',
    'Navy Midshipmen': 'Navy',
    'Air Force': 'Air Force',
    'Air Force Falcons': 'Air Force'
  };
  
  // Try direct match first
  if (normalizations[name]) {
    return normalizations[name];
  }
  
  // Strip common mascot suffixes (expanded list)
  const mascotPattern = / (Wildcats|Big Green|Terriers|Catamounts|Black Bears|River Hawks|Retrievers|Bearcats|Great Danes|Highlanders|Bulldogs|Skyhawks|Crimson|Bears|Friars|Crusaders|Eagles|Huskies|Orange|Rams|Warriors|Pioneers|Stags|Bobcats|Dolphins|Tigers|Patriots|Cornhuskers|Billikens|Gaels|Jaspers|Hoyas|Peacocks|Seawolves|Hawks|Knights|Broncs|Golden Griffins|Bonnies|Explorers|Musketeers|Blue Demons|Bluejays|Hoosiers|Badgers|Buckeyes|Spartans|Wolverines|Fighting Irish|Bruins|Trojans|Cardinal|Cardinals|Ducks|Beavers|Cougars|Sun Devils|Buffaloes|Jayhawks|Sooners|Longhorns|Aggies|Red Raiders|Horned Frogs|Mountaineers|Cyclones|Hawkeyes|Golden Gophers|Boilermakers|Illini|Scarlet Knights|Nittany Lions|Tar Heels|Blue Devils|Demon Deacons|Wolfpack|Cavaliers|Hokies|Hurricanes|Seminoles|Yellow Jackets|Gamecocks|Volunteers|Razorbacks|Rebels|Crimson Tide|War Eagles|Gators|Commodores|Raiders|Moose|Pilgrims|Penmen|Ravens|Greyhounds|Owls|Panthers|Falcons|Lions|Jaguars|Leopards|Wolves|Sharks|Seahawks|Lancers|Royals|Monarchs|Titans|Generals|Cadets|Monks|Phoenix|Thunder|Storm|Wave|Pride|Mustangs|Broncos|Chargers|Blazers|Golden Eagles|Thunderbirds|Bison|Colonels|Terrapins|Flames|Anteaters|Banana Slugs|Chanticleers|Governors|Hatters|Hilltoppers|Ichabods|Keydets|Lakers|Mavericks|Midshipmen|Miners|Mocs|Norsemen|Ospreys|Paladins|Ramblers|Red Storm|Red Foxes|Redbirds|Redhawks|Roadrunners|Rockets|Salukis|Shockers|Spiders|Thundering Herd|Tritons|Vandals|Zips|Saints|Purple Eagles|Cowboys|Cowgirls|Black Knights|Lumberjacks|Demon Deacons|Scarlet Hawks|Mean Green|Ragin Cajuns|Golden Hurricane|Golden Flashes|RedHawks|Dukes|Tribe|Shockers|Toreros|Toppers|Warhawks|Blue Hose|Camels|Catamounts|Chippewas|Flames|Hoosiers|Kangaroos|Leathernecks|Mastodons|Musketeers|Penguins|Racers|River Hawks|Skyhawks|Blue Raiders|Retrievers)$/i;
  const cleaned = name.replace(mascotPattern, '');
  
  // Check if cleaned version has a mapping
  if (normalizations[cleaned]) {
    return normalizations[cleaned];
  }
  
  // Return cleaned name (without mascot) even if no explicit mapping
  return cleaned;
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
      
      const homeTeamName = (homeCompetitor.team?.displayName || homeCompetitor.team?.name || '').trim();
      const awayTeamName = (awayCompetitor.team?.displayName || awayCompetitor.team?.name || '').trim();
      
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
        // ESPN returns scores as objects like {displayValue: "32", value: 32.0} or as strings
        const homeScoreRaw = homeCompetitor.score;
        const awayScoreRaw = awayCompetitor.score;
        homeScore = typeof homeScoreRaw === 'object' ? (homeScoreRaw?.displayValue || homeScoreRaw?.value || '') : (homeScoreRaw || '');
        awayScore = typeof awayScoreRaw === 'object' ? (awayScoreRaw?.displayValue || awayScoreRaw?.value || '') : (awayScoreRaw || '');
        // Ensure they're strings
        homeScore = String(homeScore);
        awayScore = String(awayScore);
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
  
  // Read ALL columns so we can preserve SIDEARM games
  const existingGames = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const gameId = row[0];
    if (gameId) {
      existingGames[gameId] = {
        date: row[1] || '',
        time: row[2] || '',
        away: row[3] || '',
        away_score: row[4] || '',
        home: row[5] || '',
        home_score: row[6] || '',
        gender: row[7] || '',
        level: row[8] || '',
        division: row[9] || '',
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
  
  // Get ALL existing games (including D2/D3 from SIDEARM scraper)
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
  let updated = 0;
  let added = 0;
  let preserved = 0;
  
  // Build map of scraped games by ID
  const scrapedMap = new Map();
  for (const game of games) {
    scrapedMap.set(game.game_id, game);
  }
  
  // Merge: update existing, add new, preserve untouched (D2/D3 games, manual entries)
  const finalGames = new Map();
  
  // First, process all existing games
  for (const [gameId, existing] of Object.entries(existingGames)) {
    const scraped = scrapedMap.get(gameId);
    
    if (scraped) {
      // Game exists in both - update with scraped data but PRESERVE assignments
      const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
      
      let originalDate = existing.original_date || '';
      let scheduleChanged = existing.schedule_changed || '';
      
      if (hasAssignment && existing.date && existing.date !== scraped.date) {
        originalDate = existing.original_date || existing.date;
        scheduleChanged = 'YES';
        changesDetected++;
        console.log(`  ⚠️ Schedule change: ${scraped.home_team} vs ${scraped.away_team} moved from ${existing.date} to ${scraped.date}`);
      }
      
      if (hasAssignment && !originalDate) {
        originalDate = scraped.date;
      }
      
      const awayScore = scraped.away_score || existing.away_score || '';
      const homeScore = scraped.home_score || existing.home_score || '';
      const time = (awayScore && homeScore && scraped.time !== 'FINAL') ? 'FINAL' : scraped.time;
      
      finalGames.set(gameId, [
        gameId,
        scraped.date,
        time,
        scraped.away_team,
        awayScore,
        scraped.home_team,
        homeScore,
        scraped.gender,
        scraped.level,
        scraped.division,
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
      ]);
      updated++;
    } else {
      // Game only in existing - PRESERVE it (D2/D3 games, manual entries)
      finalGames.set(gameId, [
        gameId,
        existing.date,
        existing.time,
        existing.away,
        existing.away_score,
        existing.home,
        existing.home_score,
        existing.gender,
        existing.level,
        existing.division,
        existing.photog1 || '',
        existing.photog2 || '',
        existing.videog || '',
        existing.writer || '',
        existing.notes || '',
        existing.original_date || '',
        existing.schedule_changed || '',
        existing.photos_url || '',
        existing.recap_url || '',
        existing.highlights_url || '',
        existing.live_stream_url || '',
        existing.gamedescription || '',
        existing.specialevent || ''
      ]);
      preserved++;
    }
  }
  
  // Add new games from scrape that weren't in existing
  for (const [gameId, game] of scrapedMap) {
    if (!finalGames.has(gameId)) {
      finalGames.set(gameId, [
        gameId,
        game.date,
        game.time,
        game.away_team,
        game.away_score || '',
        game.home_team,
        game.home_score || '',
        game.gender,
        game.level,
        game.division,
        '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]);
      added++;
    }
  }
  
  console.log(`  Stats: ${updated} updated, ${added} added, ${preserved} preserved from other sources`);
  
  if (changesDetected > 0) {
    console.log(`  ⚠️ Total schedule changes detected: ${changesDetected}`);
  }
  
  // Convert to rows array and sort by date, then time
  const rows = Array.from(finalGames.values());
  rows.sort((a, b) => {
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return (a[2] || '').localeCompare(b[2] || '');
  });
  
  console.log(`  Writing ${rows.length} total rows to sheet...`);
  
  // Clear and update sheet
  const clearResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CollegeSchedules!A:W:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  if (!clearResponse.ok) {
    const clearError = await clearResponse.text();
    console.error(`  Clear failed: ${clearResponse.status} - ${clearError}`);
  }
  
  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CollegeSchedules!A1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [header, ...rows] })
  });
  
  if (!writeResponse.ok) {
    const writeError = await writeResponse.text();
    console.error(`  Write failed: ${writeResponse.status} - ${writeError}`);
    return { rowCount: 0, changesDetected, sheetsUpdated: false, error: writeError };
  }
  
  const writeResult = await writeResponse.json();
  console.log(`  Write successful: ${writeResult.updatedRows || rows.length + 1} rows written`);
  
  return { rowCount: rows.length, changesDetected, sheetsUpdated: true, updated, added, preserved };
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
