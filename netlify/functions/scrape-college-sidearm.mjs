// Ball603 College Basketball SIDEARM Scraper
// Scrapes D2/D3 schedules from school athletic sites using SIDEARM platform
// Runs daily during basketball season (Nov-Mar)
// Updated: Writes to Supabase instead of Google Sheets

// SIDEARM School Configuration
const SIDEARM_SCHOOLS = {
  // D2 - Northeast-10 Conference
  'Southern New Hampshire': {
    shortname: 'SNHU',
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
    shortname: 'NEC',
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
 * The web_fetch returns markdown-like text from SIDEARM pages
 * Game pattern: Date, Time, at/vs, [Opponent](link), Result
 */
function parseSIDEARMSchedule(html, school, gender) {
  const games = [];
  
  // Clean the HTML/markdown - remove HTML artifacts
  const cleanText = html
    .replace(/<[^>]*>/g, ' ')  // Remove any HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')  // Remove image markdown
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  // Find all game entries using a comprehensive pattern
  // Looking for: Month Day (Day) ... time ... at/vs ... Opponent ... W/L, score
  const gamePattern = /(Jan|Feb|Mar|Nov|Dec)\s+(\d{1,2})\s+\((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\)(.*?)(?=(?:Jan|Feb|Mar|Nov|Dec)\s+\d{1,2}\s+\(|$)/gi;
  
  let match;
  while ((match = gamePattern.exec(cleanText)) !== null) {
    const month = match[1];
    const day = match[2];
    const gameContent = match[4];
    
    // Skip exhibition games and scrimmages
    if (/EXHIBITION|SCRIMMAGE/i.test(gameContent)) continue;
    
    // Parse date
    const parsedDate = parseSIDEARMDate(month, day);
    if (!parsedDate) continue;
    
    // Extract time (e.g., "5:00 PM" or "7:30 PM")
    const timeMatch = gameContent.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    let time = timeMatch ? timeMatch[1].toUpperCase().replace(/\s+/g, ' ') : '';
    
    // Determine home/away - look for "at" or "vs" 
    const isAway = /\bat\b/i.test(gameContent);
    const isHome = /\bvs\b/i.test(gameContent);
    
    if (!isAway && !isHome) continue;
    
    // Extract opponent name from markdown link [Name](url) or plain text after at/vs
    let opponent = '';
    
    // Try markdown link first: [Opponent Name](url)
    const linkMatch = gameContent.match(/\[([A-Za-z][A-Za-z0-9\s\.\-\'\(\)&]+?)\]\s*\(/);
    if (linkMatch) {
      opponent = linkMatch[1].trim();
    } else {
      // Fallback: text after at/vs
      const textMatch = gameContent.match(/(?:at|vs)\s+([A-Z][A-Za-z\s\.\-\'\(\)&]+?)(?:\s+\d|$)/i);
      if (textMatch) {
        opponent = textMatch[1].trim();
      }
    }
    
    // Clean opponent name - remove any trailing artifacts
    opponent = opponent
      .replace(/Logo\s*$/i, '')
      .replace(/\s*-\s*EXHIBITION\s*$/i, '')
      .replace(/^\s*#?\d+\s*/, '')  // Remove ranking
      .trim();
    
    // Skip if opponent looks like HTML garbage
    if (!opponent || opponent.length < 2 || /flex|inline|span|div|class/i.test(opponent)) {
      continue;
    }
    
    // Normalize opponent name
    opponent = normalizeOpponentName(opponent);
    
    // Skip if normalizeOpponentName returned null (tournament matchup listing)
    if (!opponent) continue;
    
    // Determine home/away teams
    const homeTeam = isAway ? opponent : school.shortname;
    const awayTeam = isAway ? school.shortname : opponent;
    
    // Check for result (W, XX-XX or L, XX-XX or W XX-XX)
    let homeScore = '';
    let awayScore = '';
    const resultMatch = gameContent.match(/([WLT])[,\s]+(\d+)\s*[-–]\s*(\d+)/i);
    if (resultMatch) {
      const [, winLoss, score1, score2] = resultMatch;
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
    const genderCode = (gender === 'Boys' || gender === 'Men') ? 'm' : 'w';
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
  
  // First, clean up SIDEARM artifacts that get pulled in
  let cleaned = name
    .replace(/^.*?History\s+(?:at|vs)\s+/i, '')  // "College History at X" → "X"
    .replace(/Watch\s+Live\s+Stats?\s*/gi, '')   // Remove "Watch Live Stats"
    .replace(/History\s*$/i, '')                  // Trailing "History"
    .replace(/\s+/g, ' ')
    .trim();
  
  // Skip tournament matchup listings (opponent shows as "Team A vs. Team B")
  // Return null to signal this should be skipped
  if (/\svs\.?\s/i.test(cleaned)) {
    return null;
  }
  
  // Handle Vermont State campuses (with or without "University") → VTSU-Campus
  const vtsuMatch = cleaned.match(/Vermont State(?:\s+University)?\s+(.+)/i);
  if (vtsuMatch) {
    return `VTSU-${vtsuMatch[1].trim()}`;
  }
  
  // Common normalizations
  const normalizations = {
    'Southern New Hampshire University': 'SNHU',
    'Southern New Hampshire': 'SNHU',
    'SNHU': 'SNHU',
    'Saint Anselm College': 'Saint Anselm',
    'Franklin Pierce University': 'Franklin Pierce',
    'Plymouth State University': 'Plymouth State',
    'Keene State College': 'Keene State',
    'Colby-Sawyer College': 'Colby-Sawyer',
    'New England College': 'NEC',
    'NEC': 'NEC',
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
    'Castleton University': 'VTSU-Castleton',
    'Vermont State University Castleton': 'VTSU-Castleton',
    'Vermont State Castleton': 'VTSU-Castleton',
    'VTSU Castleton': 'VTSU-Castleton',
    'VTSU-Castleton': 'VTSU-Castleton',
    'Johnson State': 'VTSU-Johnson',
    'Vermont State University Johnson': 'VTSU-Johnson',
    'Vermont State Johnson': 'VTSU-Johnson',
    'Lyndon State': 'VTSU-Lyndon',
    'Vermont State University Lyndon': 'VTSU-Lyndon',
    'Vermont State Lyndon': 'VTSU-Lyndon',
    'Gordon College': 'Gordon',
    'Gordon': 'Gordon',
    'Curry College': 'Curry',
    'Curry': 'Curry',
    'Lesley University': 'Lesley',
    'Nichols College': 'Nichols',
    'Nichols': 'Nichols',
    'Elms College': 'Elms',
    'Elms': 'Elms',
    'Dean College': 'Dean',
    'Dean': 'Dean',
    'Mitchell College': 'Mitchell',
    'Mitchell': 'Mitchell',
    'Regis College': 'Regis (Mass.)',
    'Regis': 'Regis (Mass.)',
    'Albertus Magnus College': 'Albertus Magnus',
    'Albertus Magnus': 'Albertus Magnus',
    'SUNY Canton': 'SUNY Canton',
    'SUNY Cobleskill': 'SUNY Cobleskill',
    'Anna Maria College': 'Anna Maria',
    'Anna Maria': 'Anna Maria',
    'Lasell University': 'Lasell',
    'Lasell': 'Lasell',
    'Emmanuel College': 'Emmanuel (Mass.)',
    'Emmanuel College (Mass.)': 'Emmanuel (Mass.)',
    'Emmanuel': 'Emmanuel (Mass.)',
    'Saint Joseph\'s College of Maine': 'Saint Joseph\'s (Maine)',
    'Saint Joseph\'s (Maine)': 'Saint Joseph\'s (Maine)',
    'Saint Joseph (Conn.)': 'Saint Joseph (Conn.)',
    'University of Saint Joseph': 'Saint Joseph (Conn.)',
    'University of Saint Joseph (Conn.)': 'Saint Joseph (Conn.)',
    'Brandeis University': 'Brandeis',
    'Tufts University': 'Tufts',
    'WPI': 'WPI',
    'Trinity College': 'Trinity (Conn.)',
    'Colby College': 'Colby',
    'Goldey-Beacom College': 'Goldey-Beacom',
    'New Haven': 'New Haven',
    'University of New Haven': 'New Haven',
    'Daemen University': 'Daemen',
    'Amherst College': 'Amherst',
    'Amherst': 'Amherst',
    'Suffolk University': 'Suffolk',
    'Framingham State University': 'Framingham State',
    'Westfield State University': 'Westfield State',
    'SUNY Geneseo': 'SUNY Geneseo',
    'University of Hartford': 'Hartford',
    'Fisher College (Mass.)': 'Fisher (Mass.)',
    'Fisher College': 'Fisher (Mass.)',
    'Thomas College': 'Thomas',
    'Thomas College of Maine': 'Thomas',
    'Thomas': 'Thomas',
    'Maine-Augusta': 'Maine-Augusta',
    'University of Maine at Augusta': 'Maine-Augusta',
    'Colgate University': 'Colgate',
    'Colgate': 'Colgate'
  };
  
  // Try exact match first
  if (normalizations[cleaned]) return normalizations[cleaned];
  
  // Try case-insensitive
  const lower = cleaned.toLowerCase();
  for (const [key, value] of Object.entries(normalizations)) {
    if (key.toLowerCase() === lower) return value;
  }
  
  // Strip common mascot suffixes (expanded list)
  const mascotPattern = / (Chargers|Blazers|Hawks|Knights|Warriors|Ravens|Panthers|Eagles|Bulldogs|Bears|Tigers|Lions|Wildcats|Huskies|Falcons|Owls|Cardinals|Rams|Vikings|Pioneers|Saints|Gaels|Colonels|Terriers|Retrievers|Bearcats|Bobcats|Dolphins|Griffins|Phoenix|Thunder|Storm|Wave|Pride|Mustangs|Broncos|Cougars|Jaguars|Leopards|Wolves|Sharks|Seahawks|Lancers|Royals|Monarchs|Spartans|Trojans|Titans|Generals|Cadets|Crusaders|Friars|Monks|Blue Devils|Red Devils|Golden|Moose|Pilgrims|Penmen|Greyhounds|Skyhawks|Crimson|Stags|Patriots|Highlanders|River Hawks|Black Bears|Catamounts|Big Green|Billikens|Great Danes|Raiders|Golden Eagles|Thunderbirds|Bison)$/i;
  cleaned = cleaned.replace(mascotPattern, '');
  
  // Clean up common suffixes if still present
  return cleaned
    .replace(/\s+(University|College)$/i, '')
    .trim();
}


/**
 * Fetch and parse schedule for a school
 */
async function scrapeSchoolSchedule(school, gender) {
  const path = (gender === 'Boys' || gender === 'Men') ? school.mensPath : school.womensPath;
  const pageUrl = `https://${school.site}${path}`;
  
  console.log(`  Fetching ${school.shortname} ${gender}...`);
  
  try {
    // First fetch the schedule page to get the text export URL
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ball603/1.0)',
        'Accept': 'text/html'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error(`HTTP ${pageResponse.status}`);
    }
    
    const html = await pageResponse.text();
    
    // Extract the text export URL (format: /services/schedule_txt.ashx?schedule=XXX)
    const textUrlMatch = html.match(/\/services\/schedule_txt\.ashx\?schedule=(\d+)/);
    
    if (textUrlMatch) {
      // Fetch the text export - much cleaner format
      const textUrl = `https://${school.site}${textUrlMatch[0]}`;
      const textResponse = await fetch(textUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Ball603/1.0)',
          'Accept': 'text/plain'
        }
      });
      
      if (textResponse.ok) {
        const textContent = await textResponse.text();
        const games = parseSIDEARMTextExport(textContent, school, gender);
        console.log(`    Found ${games.length} games (text export)`);
        return games;
      }
    }
    
    // Fallback to HTML parsing if text export not available
    const games = parseSIDEARMSchedule(html, school, gender);
    console.log(`    Found ${games.length} games (HTML fallback)`);
    return games;
    
  } catch (error) {
    console.error(`    Error: ${error.message}`);
    return [];
  }
}

/**
 * Parse SIDEARM text export format
 * Tab-delimited format: Date | Time | At | Opponent | Location | Tournament | Result
 * Example: "Nov 14 (Tue)	5:00 PM	Away	Marquette	Milwaukee, Wis.		L 61-78"
 */
function parseSIDEARMTextExport(text, school, gender) {
  const games = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Skip empty lines and header lines
    if (!line.trim()) continue;
    if (/^(Date|Overall|Conference|Streak|Home|Away|Neutral|\d+\s*-\s*\d+)/i.test(line.trim())) continue;
    if (line.includes('Schedule') && !line.includes('(')) continue;
    
    // Split by tabs or multiple spaces
    const parts = line.split(/\t+|\s{2,}/);
    if (parts.length < 4) continue;
    
    // Try to parse date pattern like "Nov 14 (Fri)" or "11/14/2025"
    const dateMatch = parts[0].match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
    if (!dateMatch) continue;
    
    // Parse date
    const parsedDate = parseSIDEARMDate(dateMatch[1], dateMatch[2]);
    if (!parsedDate) continue;
    
    // Extract fields
    let time = '';
    let homeAway = '';
    let opponent = '';
    let result = '';
    
    // Time is usually in parts[1]
    const timeMatch = parts[1] && parts[1].match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (timeMatch) {
      time = timeMatch[1].toUpperCase().replace(/\s+/g, ' ');
    }
    
    // Find Home/Away indicator
    for (let i = 1; i < parts.length && i < 4; i++) {
      if (/^(Home|Away|Neutral)$/i.test(parts[i].trim())) {
        homeAway = parts[i].trim().toLowerCase();
        // Opponent is usually the next non-empty field
        for (let j = i + 1; j < parts.length; j++) {
          if (parts[j].trim() && !/^(Home|Away|Neutral|\d{1,2}:\d{2}|TBA)$/i.test(parts[j].trim())) {
            opponent = parts[j].trim();
            break;
          }
        }
        break;
      }
    }
    
    // If no explicit Home/Away, try to find it in the line
    if (!homeAway) {
      if (/\bAway\b/i.test(line)) homeAway = 'away';
      else if (/\bHome\b/i.test(line)) homeAway = 'home';
      else if (/\bNeutral\b/i.test(line)) homeAway = 'neutral';
    }
    
    // Find opponent if not found yet
    if (!opponent) {
      // Look for opponent after Home/Away marker
      const oppMatch = line.match(/(?:Home|Away|Neutral)\s+(.+?)(?:\t|$|\s{2,}|[A-Z][a-z]+,\s*[A-Z]{2})/i);
      if (oppMatch) {
        opponent = oppMatch[1].trim();
      }
    }
    
    if (!opponent || opponent.length < 2) continue;
    
    // Skip exhibition games and scrimmages
    if (/\(EXH\)|Exhibition|Scrimmage/i.test(opponent) || /\(EXH\)|Exhibition|Scrimmage/i.test(line)) continue;
    
    // Clean opponent name
    opponent = opponent
      .replace(/\s*\(EXH\)/gi, '')
      .replace(/\s*\*\s*$/, '')  // Remove trailing asterisk (conference marker)
      .replace(/\s+/g, ' ')
      .trim();
    
    opponent = normalizeOpponentName(opponent);
    
    // Skip if normalizeOpponentName returned null (tournament matchup listing)
    if (!opponent) continue;
    
    // Treat neutral as away for simplicity (school is traveling)
    const isAway = homeAway === 'away' || homeAway === 'neutral';
    
    // Determine home/away teams
    const homeTeam = isAway ? opponent : school.shortname;
    const awayTeam = isAway ? school.shortname : opponent;
    
    // Check for result at end of line (various formats: W 75-60, W, 75-60, W 75 - 60, etc.)
    let homeScore = '';
    let awayScore = '';
    const resultMatch = line.match(/([WLT])[,\s]+(\d+)\s*[-–]\s*(\d+)\s*$/);
    if (resultMatch) {
      const [, winLossTie, score1, score2] = resultMatch;
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
    const genderCode = (gender === 'Boys' || gender === 'Men') ? 'm' : 'w';
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
      schoolAbbrev: school.abbrev
    });
  }
  
  return games;
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
 * Get existing games from Supabase
 */
async function getExistingGames(supabaseUrl, supabaseKey) {
  // Fetch all college games from Supabase
  const response = await fetch(
    `${supabaseUrl}/rest/v1/games?level=eq.College&select=*`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`  Failed to fetch existing games: ${response.status} - ${error}`);
    return {};
  }
  
  const rows = await response.json();
  
  const existingGames = {};
  for (const row of rows) {
    if (row.game_id) {
      existingGames[row.game_id] = {
        date: row.date || '',
        time: row.time || '',
        away: row.away || '',
        away_score: row.away_score || '',
        home: row.home || '',
        home_score: row.home_score || '',
        gender: row.gender || '',
        level: row.level || '',
        division: row.division || '',
        photog1: row.photog1 || '',
        photog2: row.photog2 || '',
        videog: row.videog || '',
        writer: row.writer || '',
        notes: row.notes || '',
        original_date: row.original_date || '',
        schedule_changed: row.schedule_changed || '',
        photos_url: row.photos_url || '',
        recap_url: row.recap_url || '',
        highlights_url: row.highlights_url || '',
        live_stream_url: row.live_stream_url || '',
        gamedescription: row.gamedescription || '',
        specialevent: row.specialevent || ''
      };
    }
  }
  
  return existingGames;
}

/**
 * Update Supabase with scraped games
 * MERGES with existing data - preserves assignments and games not in scrape
 */
async function updateSupabase(scrapedGames) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('  Supabase credentials not configured');
    return { updated: 0, added: 0, preserved: 0 };
  }
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Get ALL existing college games (including D1 from ESPN scraper)
  const existingGames = await getExistingGames(supabaseUrl, supabaseKey);
  console.log(`  Found ${Object.keys(existingGames).length} existing games in database`);
  
  // Track stats
  let updated = 0;
  let added = 0;
  let changesDetected = 0;
  
  // Build map of scraped games by ID
  const scrapedMap = new Map();
  for (const game of scrapedGames) {
    scrapedMap.set(game.game_id, game);
  }
  
  // Prepare games for upsert
  const gamesToUpsert = [];
  
  // First, process existing games that we're updating
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
        changesDetected++;
        console.log(`  ⚠️ Schedule change: ${scraped.home_team} vs ${scraped.away_team} moved from ${existing.date} to ${scraped.date}`);
      }
      
      gamesToUpsert.push({
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
    }
    // Note: Games not in scrape are preserved in database automatically (no delete)
  }
  
  // Add new games from scrape
  for (const [gameId, game] of scrapedMap) {
    if (!existingGames[gameId]) {
      gamesToUpsert.push({
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
  
  console.log(`  Stats: ${updated} to update, ${added} to add`);
  
  if (changesDetected > 0) {
    console.log(`  ⚠️ Schedule changes detected: ${changesDetected}`);
  }
  
  // Upsert to Supabase in batches
  const BATCH_SIZE = 500;
  let totalUpserted = 0;
  
  for (let i = 0; i < gamesToUpsert.length; i += BATCH_SIZE) {
    const batch = gamesToUpsert.slice(i, i + BATCH_SIZE);
    
    const upsertResponse = await fetch(
      `${supabaseUrl}/rest/v1/games`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(batch)
      }
    );
    
    if (!upsertResponse.ok) {
      const error = await upsertResponse.text();
      console.error(`  Upsert failed for batch ${i / BATCH_SIZE + 1}: ${upsertResponse.status} - ${error}`);
    } else {
      totalUpserted += batch.length;
    }
  }
  
  console.log(`  Successfully upserted ${totalUpserted} games to Supabase`);
  
  return { updated, added, total: totalUpserted, changesDetected };
}

/**
 * Main handler
 */
export default async (request) => {
  console.log('Ball603 College SIDEARM Scraper (Supabase) - Starting...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const allGames = [];
    
    // Scrape all schools
    for (const [name, school] of Object.entries(SIDEARM_SCHOOLS)) {
      // Men's basketball
      const mensGames = await scrapeSchoolSchedule(school, 'Men');
      allGames.push(...mensGames);
      
      // Women's basketball
      const womensGames = await scrapeSchoolSchedule(school, 'Women');
      allGames.push(...womensGames);
      
      // Small delay between schools to be nice
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`Total games scraped: ${allGames.length}`);
    
    // Deduplicate
    const uniqueGames = deduplicateGames(allGames);
    console.log(`After deduplication: ${uniqueGames.length}`);
    
    // Update Supabase (merges with existing, preserves assignments)
    const stats = await updateSupabase(uniqueGames);
    
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
