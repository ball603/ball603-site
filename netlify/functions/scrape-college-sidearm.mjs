// Ball603 College Basketball SIDEARM Scraper
// Scrapes D2/D3 schedules from school athletic sites using SIDEARM platform
// Runs daily during basketball season (Nov-Mar)

// SIDEARM School Configuration
const SIDEARM_SCHOOLS = {
  // D2 - Northeast-10 Conference
  'Southern New Hampshire': {
    shortname: 'Southern New Hampshire',
    abbrev: 'SNHU',
    division: 'D2',
    site: 'snhupenmen.com',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Manchester'
  },
  'Saint Anselm': {
    shortname: 'Saint Anselm',
    abbrev: 'SA',
    division: 'D2',
    site: 'saintanselmhawks.com',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Manchester'
  },
  'Franklin Pierce': {
    shortname: 'Franklin Pierce',
    abbrev: 'FPU',
    division: 'D2',
    site: 'fpuravens.com',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Rindge'
  },
  // D3 - Little East Conference
  'Plymouth State': {
    shortname: 'Plymouth State',
    abbrev: 'PSU',
    division: 'D3',
    site: 'athletics.plymouth.edu',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Plymouth'
  },
  'Keene State': {
    shortname: 'Keene State',
    abbrev: 'KSC',
    division: 'D3',
    site: 'keeneowls.com',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Keene'
  },
  // D3 - GNAC
  'Colby-Sawyer': {
    shortname: 'Colby-Sawyer',
    abbrev: 'CSC',
    division: 'D3',
    site: 'www.colby-sawyerathletics.com',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'New London'
  },
  'New England College': {
    shortname: 'New England College',
    abbrev: 'NEC',
    division: 'D3',
    site: 'athletics.nec.edu',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Henniker'
  },
  'Rivier': {
    shortname: 'Rivier',
    abbrev: 'RIV',
    division: 'D3',
    site: 'rivierathletics.com',
    mensPath: '/sports/mens-basketball/schedule/2025-26',
    womensPath: '/sports/womens-basketball/schedule/2025-26',
    location: 'Nashua'
  }
};

// NH locations for filtering home games
const NH_LOCATIONS = ['Manchester', 'Rindge', 'Plymouth', 'Keene', 'New London', 'Henniker', 'Nashua'];

/**
 * Parse SIDEARM schedule page
 * SIDEARM pages have game blocks with date, opponent, location, and result
 */
function parseSIDEARMSchedule(html, school, gender) {
  const games = [];
  
  // SIDEARM uses patterns like:
  // "Nov 14 (Fri)" or "Nov 14 (Fri)\n5:00 PM" for date/time
  // "at\n[Opponent]" or "vs\n[Opponent]" for away/home
  // "W,\n91-83" or "L,\n76-90" for results
  
  // Pattern to match date blocks: "Mon DD (Day)" 
  const datePattern = /(Jan|Feb|Mar|Nov|Dec)\s+(\d{1,2})\s+\((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\)/gi;
  
  // Split content by date markers to get individual games
  const parts = html.split(datePattern);
  
  // Process in groups - each game starts with month, day, dayname
  for (let i = 1; i < parts.length; i += 4) {
    if (i + 3 >= parts.length) break;
    
    const month = parts[i];
    const day = parts[i + 1];
    const dayName = parts[i + 2];
    const gameContent = parts[i + 3];
    
    // Parse date
    const parsedDate = parseSIDEARMDate(month, day);
    if (!parsedDate) continue;
    
    // Check for time (e.g., "5:00 PM" or "7:30 PM")
    const timeMatch = gameContent.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    let time = timeMatch ? timeMatch[1].toUpperCase() : '';
    
    // Determine home/away - look for "at" or "vs" before opponent
    const isAway = /\bat\b[\s\n]+\[?[A-Z]/i.test(gameContent);
    const isHome = /\bvs\b[\s\n]+\[?[A-Z]/i.test(gameContent);
    
    if (!isAway && !isHome) continue;
    
    // Extract opponent name - look for linked text after at/vs
    let opponent = '';
    const opponentMatch = gameContent.match(/(?:at|vs)\s*\n?\s*(?:#\d+\s*)?\[?([^\]\n\(]+)/i);
    if (opponentMatch) {
      opponent = opponentMatch[1].trim();
      // Clean up opponent name
      opponent = opponent.replace(/\[|\]/g, '').trim();
      // Remove trailing university/college designators for matching
      opponent = normalizeOpponentName(opponent);
    }
    
    if (!opponent || opponent.length < 2) continue;
    
    // Determine home/away teams
    const homeTeam = isAway ? opponent : school.shortname;
    const awayTeam = isAway ? school.shortname : opponent;
    
    // Check for result (W, XX-XX or L, XX-XX)
    let homeScore = '';
    let awayScore = '';
    const resultMatch = gameContent.match(/([WL]),?\s*\n?\s*(\d+)-(\d+)/i);
    if (resultMatch) {
      const [, winLoss, score1, score2] = resultMatch;
      const schoolWon = winLoss.toUpperCase() === 'W';
      const schoolScore = parseInt(score1);
      const oppScore = parseInt(score2);
      
      if (isAway) {
        awayScore = schoolScore.toString();
        homeScore = oppScore.toString();
      } else {
        homeScore = schoolScore.toString();
        awayScore = oppScore.toString();
      }
      time = 'FINAL';
    }
    
    // Generate game ID
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
      division: school.division,
      source: 'SIDEARM',
      school: school.shortname
    });
  }
  
  return games;
}

/**
 * Parse SIDEARM date to ISO format
 */
function parseSIDEARMDate(month, day) {
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'Nov': '11', 'Dec': '12'
  };
  
  const monthNum = months[month];
  if (!monthNum) return null;
  
  // Determine year based on month
  const now = new Date();
  let year = now.getFullYear();
  
  if (['Jan', 'Feb', 'Mar', 'Apr'].includes(month)) {
    if (now.getMonth() >= 8) {
      year = year + 1;
    }
  }
  
  const dayPadded = day.toString().padStart(2, '0');
  return `${year}-${monthNum}-${dayPadded}`;
}

/**
 * Normalize opponent names for consistency
 */
function normalizeOpponentName(name) {
  if (!name) return name;
  
  // Common normalizations
  const normalizations = {
    'Southern New Hampshire University': 'Southern New Hampshire',
    'SNHU': 'Southern New Hampshire',
    'Saint Anselm College': 'Saint Anselm',
    'Franklin Pierce University': 'Franklin Pierce',
    'Plymouth State University': 'Plymouth State',
    'Keene State College': 'Keene State',
    'Colby-Sawyer College': 'Colby-Sawyer',
    'New England College': 'New England College',
    'Rivier University': 'Rivier',
    'Bentley University': 'Bentley',
    'Assumption University': 'Assumption',
    'American International College': 'American International',
    'AIC': 'American International',
    'Saint Michael\'s College': 'Saint Michael\'s',
    'St. Michael\'s': 'Saint Michael\'s',
    'Southern Connecticut State University': 'Southern Connecticut State',
    'SCSU': 'Southern Connecticut State',
    'Pace University': 'Pace',
    'Adelphi University': 'Adelphi',
    'University of Bridgeport': 'Bridgeport',
    'Post University': 'Post',
    'Molloy University': 'Molloy',
    'Felician University': 'Felician',
    'Dominican University of New York': 'Dominican (NY)',
    'Caldwell University': 'Caldwell',
    'Stonehill College': 'Stonehill',
    'Merrimack College': 'Merrimack',
    'UMass Dartmouth': 'UMass Dartmouth',
    'UMass Boston': 'UMass Boston',
    'Eastern Connecticut State': 'Eastern Connecticut State',
    'Western Connecticut State': 'Western Connecticut State',
    'Rhode Island College': 'Rhode Island College',
    'Worcester State University': 'Worcester State',
    'Fitchburg State University': 'Fitchburg State',
    'Salem State University': 'Salem State',
    'Bridgewater State University': 'Bridgewater State',
    'University of New England': 'UNE',
    'UNE': 'UNE',
    'Norwich University': 'Norwich',
    'Castleton University': 'VTSU Castleton',
    'VTSU Castleton': 'VTSU Castleton',
    'Johnson State': 'VTSU Johnson',
    'Lyndon State': 'VTSU Lyndon',
    'Gordon College': 'Gordon',
    'Curry College': 'Curry',
    'Lesley University': 'Lesley',
    'Nichols College': 'Nichols',
    'Elms College': 'Elms',
    'Dean College': 'Dean',
    'Mitchell College': 'Mitchell',
    'Regis College': 'Regis (Mass.)',
    'Albertus Magnus College': 'Albertus Magnus',
    'SUNY Canton': 'SUNY Canton',
    'SUNY Cobleskill': 'SUNY Cobleskill',
    'Anna Maria College': 'Anna Maria',
    'Lasell University': 'Lasell',
    'Emmanuel College': 'Emmanuel (Mass.)',
    'Saint Joseph\'s (Maine)': 'Saint Joseph\'s (Maine)',
    'Saint Joseph (Conn.)': 'Saint Joseph (Conn.)',
    'Brandeis University': 'Brandeis',
    'Tufts University': 'Tufts',
    'WPI': 'WPI',
    'Trinity College': 'Trinity (Conn.)',
    'Colby College': 'Colby',
    'Goldey-Beacom College': 'Goldey-Beacom',
    'New Haven': 'New Haven',
    'Daemen University': 'Daemen'
  };
  
  // Try exact match first
  if (normalizations[name]) return normalizations[name];
  
  // Try case-insensitive
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(normalizations)) {
    if (key.toLowerCase() === lower) return value;
  }
  
  // Clean up common suffixes
  return name
    .replace(/\s+(University|College|State)$/i, '')
    .trim();
}

/**
 * Fetch and parse schedule for a school
 */
async function scrapeSchoolSchedule(school, gender) {
  const path = gender === 'Boys' ? school.mensPath : school.womensPath;
  const url = `https://${school.site}${path}`;
  
  console.log(`  Fetching ${school.shortname} ${gender}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ball603/1.0)',
        'Accept': 'text/html'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const games = parseSIDEARMSchedule(html, school, gender);
    
    console.log(`    Found ${games.length} games`);
    return games;
    
  } catch (error) {
    console.error(`    Error: ${error.message}`);
    return [];
  }
}

/**
 * Deduplicate games (same matchup from different team schedules)
 */
function deduplicateGames(games) {
  const seen = new Map();
  
  for (const game of games) {
    const teams = [game.home_team, game.away_team].sort();
    const key = `${game.date}_${teams[0]}_${teams[1]}_${game.gender}`;
    
    if (!seen.has(key)) {
      seen.set(key, game);
    } else {
      // Prefer game with scores
      const existing = seen.get(key);
      if (game.home_score && !existing.home_score) {
        seen.set(key, game);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Filter to only NH home games
 */
function filterNHHomeGames(games) {
  const nhTeams = Object.values(SIDEARM_SCHOOLS).map(s => s.shortname);
  return games.filter(g => nhTeams.includes(g.home_team));
}

/**
 * Create JWT for Google Sheets
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
 * Get existing games from Google Sheets
 */
async function getExistingGames(accessToken, spreadsheetId) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CollegeSchedules!A:W`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const { values: rows = [] } = await response.json();
  if (rows.length === 0) return {};
  
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
 * MERGES with existing data - preserves assignments and games not in scrape
 */
async function updateGoogleSheets(scrapedGames) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_SCHEDULE_ID) {
    console.log('  Google Sheets credentials not configured');
    return { updated: 0, added: 0, preserved: 0 };
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
  
  // Get ALL existing games (including D1 from ESPN scraper)
  const existingGames = await getExistingGames(access_token, spreadsheetId);
  console.log(`  Found ${Object.keys(existingGames).length} existing games in sheet`);
  
  // Track stats
  let updated = 0;
  let added = 0;
  let preserved = 0;
  
  // Build map of scraped games by ID
  const scrapedMap = new Map();
  for (const game of scrapedGames) {
    scrapedMap.set(game.game_id, game);
  }
  
  // Merge: update existing, add new, preserve untouched
  const finalGames = new Map();
  
  // First, add all existing games (preserves D1 and any manually added)
  for (const [gameId, existing] of Object.entries(existingGames)) {
    const scraped = scrapedMap.get(gameId);
    
    if (scraped) {
      // Game exists in both - update scores but PRESERVE assignments
      const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
      
      // Check for schedule change
      let originalDate = existing.original_date || '';
      let scheduleChanged = existing.schedule_changed || '';
      
      if (hasAssignment && existing.date && existing.date !== scraped.date) {
        originalDate = existing.original_date || existing.date;
        scheduleChanged = 'YES';
        console.log(`  ⚠️ Schedule change: ${scraped.home_team} vs ${scraped.away_team} moved from ${existing.date} to ${scraped.date}`);
      }
      
      finalGames.set(gameId, {
        game_id: gameId,
        date: scraped.date,
        time: scraped.time || existing.time,
        away: scraped.away_team,
        away_score: scraped.away_score || existing.away_score,
        home: scraped.home_team,
        home_score: scraped.home_score || existing.home_score,
        gender: scraped.gender,
        level: scraped.level,
        division: scraped.division,
        // PRESERVE all assignments
        photog1: existing.photog1,
        photog2: existing.photog2,
        videog: existing.videog,
        writer: existing.writer,
        notes: existing.notes,
        original_date: originalDate,
        schedule_changed: scheduleChanged,
        photos_url: existing.photos_url,
        recap_url: existing.recap_url,
        highlights_url: existing.highlights_url,
        live_stream_url: existing.live_stream_url,
        gamedescription: existing.gamedescription,
        specialevent: existing.specialevent
      });
      updated++;
    } else {
      // Game only in existing - preserve it (D1 games, manual entries, etc)
      finalGames.set(gameId, {
        game_id: gameId,
        date: existing.date,
        time: existing.time,
        away: existing.away,
        away_score: existing.away_score,
        home: existing.home,
        home_score: existing.home_score,
        gender: existing.gender,
        level: existing.level,
        division: existing.division,
        photog1: existing.photog1,
        photog2: existing.photog2,
        videog: existing.videog,
        writer: existing.writer,
        notes: existing.notes,
        original_date: existing.original_date,
        schedule_changed: existing.schedule_changed,
        photos_url: existing.photos_url,
        recap_url: existing.recap_url,
        highlights_url: existing.highlights_url,
        live_stream_url: existing.live_stream_url,
        gamedescription: existing.gamedescription,
        specialevent: existing.specialevent
      });
      preserved++;
    }
  }
  
  // Add new games from scrape
  for (const [gameId, game] of scrapedMap) {
    if (!finalGames.has(gameId)) {
      finalGames.set(gameId, {
        game_id: gameId,
        date: game.date,
        time: game.time,
        away: game.away_team,
        away_score: game.away_score,
        home: game.home_team,
        home_score: game.home_score,
        gender: game.gender,
        level: game.level,
        division: game.division,
        photog1: '',
        photog2: '',
        videog: '',
        writer: '',
        notes: '',
        original_date: '',
        schedule_changed: '',
        photos_url: '',
        recap_url: '',
        highlights_url: '',
        live_stream_url: '',
        gamedescription: '',
        specialevent: ''
      });
      added++;
    }
  }
  
  console.log(`  Stats: ${updated} updated, ${added} added, ${preserved} preserved`);
  
  // Build rows
  const header = [
    'game_id', 'date', 'time', 'away', 'away_score', 'home', 'home_score',
    'gender', 'level', 'division', 'photog1', 'photog2', 'videog', 'writer',
    'notes', 'original_date', 'schedule_changed', 'photos_url', 'recap_url',
    'highlights_url', 'live_stream_url', 'gamedescription', 'specialevent'
  ];
  
  const rows = Array.from(finalGames.values()).map(g => [
    g.game_id, g.date, g.time, g.away, g.away_score, g.home, g.home_score,
    g.gender, g.level, g.division, g.photog1, g.photog2, g.videog, g.writer,
    g.notes, g.original_date, g.schedule_changed, g.photos_url, g.recap_url,
    g.highlights_url, g.live_stream_url, g.gamedescription, g.specialevent
  ]);
  
  // Sort by date, then time
  rows.sort((a, b) => {
    if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
    return (a[2] || '').localeCompare(b[2] || '');
  });
  
  // Write to sheet
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
  
  return { updated, added, preserved, total: rows.length };
}

/**
 * Main handler
 */
export default async (request) => {
  console.log('Ball603 College SIDEARM Scraper - Starting...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const allGames = [];
    
    // Scrape all schools
    for (const [name, school] of Object.entries(SIDEARM_SCHOOLS)) {
      // Men's basketball
      const mensGames = await scrapeSchoolSchedule(school, 'Boys');
      allGames.push(...mensGames);
      
      // Women's basketball
      const womensGames = await scrapeSchoolSchedule(school, 'Girls');
      allGames.push(...womensGames);
      
      // Small delay between schools to be nice
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`Total games scraped: ${allGames.length}`);
    
    // Deduplicate
    const uniqueGames = deduplicateGames(allGames);
    console.log(`After deduplication: ${uniqueGames.length}`);
    
    // Update sheets (merges with existing, preserves assignments)
    const stats = await updateGoogleSheets(uniqueGames);
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      schoolsScraped: Object.keys(SIDEARM_SCHOOLS).length,
      gamesScraped: uniqueGames.length,
      ...stats
    };
    
    console.log('Scrape complete:', JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Run daily at 6 AM during basketball season
export const config = {
  schedule: "0 6 * 11,12,1,2,3 *"
};
