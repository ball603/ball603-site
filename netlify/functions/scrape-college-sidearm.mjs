// Ball603 College Basketball SIDEARM Scraper
// Scrapes D2/D3 schedules from school athletic sites using SIDEARM platform
// Runs daily during basketball season (Nov-Mar)
// Updated: Writes to Supabase instead of Google Sheets

// SIDEARM School Configuration
const SIDEARM_SCHOOLS = {
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

/**
 * Helper to convert score to integer or null
 */
function toIntOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = parseInt(val);
  return isNaN(num) ? null : num;
}

/**
 * Helper to convert to string or null (for text fields)
 */
function toStringOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  return String(val);
}

/**
 * Helper to convert to date string or null (for date fields)
 */
function toDateOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
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
  
  let cleaned = name
    .replace(/^.*?History\s+(?:at|vs)\s+/i, '')
    .replace(/Watch\s+Live\s+Stats?\s*/gi, '')
    .replace(/History\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (/\svs\.?\s/i.test(cleaned)) {
    return null;
  }
  
  const vtsuMatch = cleaned.match(/Vermont State(?:\s+University)?\s+(.+)/i);
  if (vtsuMatch) {
    return `VTSU-${vtsuMatch[1].trim()}`;
  }
  
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
    'Emmanuel College (Mass.)': 'Emmanuel (Mass.)',
    'Saint Joseph\'s College of Maine': 'Saint Joseph\'s (Maine)',
    'Saint Joseph (Conn.)': 'Saint Joseph (Conn.)',
    'University of Saint Joseph': 'Saint Joseph (Conn.)',
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
    'Suffolk University': 'Suffolk',
    'Framingham State University': 'Framingham State',
    'Westfield State University': 'Westfield State',
    'SUNY Geneseo': 'SUNY Geneseo',
    'University of Hartford': 'Hartford',
    'Fisher College (Mass.)': 'Fisher (Mass.)',
    'Fisher College': 'Fisher (Mass.)',
    'Thomas College': 'Thomas',
    'Thomas College of Maine': 'Thomas',
    'Maine-Augusta': 'Maine-Augusta',
    'University of Maine at Augusta': 'Maine-Augusta',
    'Colgate University': 'Colgate'
  };
  
  if (normalizations[cleaned]) return normalizations[cleaned];
  
  const lower = cleaned.toLowerCase();
  for (const [key, value] of Object.entries(normalizations)) {
    if (key.toLowerCase() === lower) return value;
  }
  
  const mascotPattern = / (Chargers|Blazers|Hawks|Knights|Warriors|Ravens|Panthers|Eagles|Bulldogs|Bears|Tigers|Lions|Wildcats|Huskies|Falcons|Owls|Cardinals|Rams|Vikings|Pioneers|Saints|Gaels|Colonels|Terriers|Retrievers|Bearcats|Bobcats|Dolphins|Griffins|Phoenix|Thunder|Storm|Wave|Pride|Mustangs|Broncos|Cougars|Jaguars|Leopards|Wolves|Sharks|Seahawks|Lancers|Royals|Monarchs|Spartans|Trojans|Titans|Generals|Cadets|Crusaders|Friars|Monks|Blue Devils|Red Devils|Golden|Moose|Pilgrims|Penmen|Greyhounds|Skyhawks|Crimson|Stags|Patriots|Highlanders|River Hawks|Black Bears|Catamounts|Big Green|Billikens|Great Danes|Raiders|Golden Eagles|Thunderbirds|Bison)$/i;
  cleaned = cleaned.replace(mascotPattern, '');
  
  return cleaned.replace(/\s+(University|College)$/i, '').trim();
}

/**
 * Parse SIDEARM text export format
 */
function parseSIDEARMTextExport(text, school, gender) {
  const games = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^(Date|Overall|Conference|Streak|Home|Away|Neutral|\d+\s*-\s*\d+)/i.test(line.trim())) continue;
    if (line.includes('Schedule') && !line.includes('(')) continue;
    
    const parts = line.split(/\t+|\s{2,}/);
    if (parts.length < 4) continue;
    
    const dateMatch = parts[0].match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
    if (!dateMatch) continue;
    
    const parsedDate = parseSIDEARMDate(dateMatch[1], dateMatch[2]);
    if (!parsedDate) continue;
    
    let time = '';
    let homeAway = '';
    let opponent = '';
    
    const timeMatch = parts[1] && parts[1].match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (timeMatch) {
      time = timeMatch[1].toUpperCase().replace(/\s+/g, ' ');
    }
    
    for (let i = 1; i < parts.length && i < 4; i++) {
      if (/^(Home|Away|Neutral)$/i.test(parts[i].trim())) {
        homeAway = parts[i].trim().toLowerCase();
        for (let j = i + 1; j < parts.length; j++) {
          if (parts[j].trim() && !/^(Home|Away|Neutral|\d{1,2}:\d{2}|TBA)$/i.test(parts[j].trim())) {
            opponent = parts[j].trim();
            break;
          }
        }
        break;
      }
    }
    
    if (!homeAway) {
      if (/\bAway\b/i.test(line)) homeAway = 'away';
      else if (/\bHome\b/i.test(line)) homeAway = 'home';
      else if (/\bNeutral\b/i.test(line)) homeAway = 'neutral';
    }
    
    if (!opponent) {
      const oppMatch = line.match(/(?:Home|Away|Neutral)\s+(.+?)(?:\t|$|\s{2,}|[A-Z][a-z]+,\s*[A-Z]{2})/i);
      if (oppMatch) {
        opponent = oppMatch[1].trim();
      }
    }
    
    if (!opponent || opponent.length < 2) continue;
    if (/\(EXH\)|Exhibition|Scrimmage/i.test(opponent) || /\(EXH\)|Exhibition|Scrimmage/i.test(line)) continue;
    
    opponent = opponent
      .replace(/\s*\(EXH\)/gi, '')
      .replace(/\s*\*\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    opponent = normalizeOpponentName(opponent);
    if (!opponent) continue;
    
    const isAway = homeAway === 'away' || homeAway === 'neutral';
    const homeTeam = isAway ? opponent : school.shortname;
    const awayTeam = isAway ? school.shortname : opponent;
    
    let homeScore = null;
    let awayScore = null;
    const resultMatch = line.match(/([WLT])[,\s]+(\d+)\s*[-–]\s*(\d+)\s*$/);
    if (resultMatch) {
      const [, winLossTie, score1, score2] = resultMatch;
      const schoolScore = parseInt(score1);
      const oppScore = parseInt(score2);
      
      if (isAway) {
        awayScore = schoolScore;
        homeScore = oppScore;
      } else {
        homeScore = schoolScore;
        awayScore = oppScore;
      }
      time = 'FINAL';
    }
    
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
      division: school.division
    });
  }
  
  return games;
}

/**
 * Fetch and parse schedule for a school
 */
async function scrapeSchoolSchedule(school, gender) {
  const path = (gender === 'Boys' || gender === 'Men') ? school.mensPath : school.womensPath;
  const pageUrl = `https://${school.site}${path}`;
  
  console.log(`  Fetching ${school.shortname} ${gender}...`);
  
  try {
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
    const textUrlMatch = html.match(/\/services\/schedule_txt\.ashx\?schedule=(\d+)/);
    
    if (textUrlMatch) {
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
    
    console.log(`    No text export found, skipping HTML parsing`);
    return [];
    
  } catch (error) {
    console.error(`    Error: ${error.message}`);
    return [];
  }
}

/**
 * Deduplicate games
 */
function deduplicateGames(games) {
  const seen = new Map();
  
  for (const game of games) {
    const teams = [game.home_team, game.away_team].sort();
    const key = `${game.date}_${teams[0]}_${teams[1]}_${game.gender}`;
    
    if (!seen.has(key)) {
      seen.set(key, game);
    } else {
      const existing = seen.get(key);
      if (game.home_score && !existing.home_score) {
        seen.set(key, game);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Get existing games from Supabase
 */
async function getExistingGames(supabaseUrl, supabaseKey) {
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
      existingGames[row.game_id] = row;
    }
  }
  
  return existingGames;
}

/**
 * Update Supabase with scraped games
 */
async function updateSupabase(scrapedGames) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('  Supabase credentials not configured');
    return { updated: 0, added: 0, total: 0 };
  }
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  const existingGames = await getExistingGames(supabaseUrl, supabaseKey);
  console.log(`  Found ${Object.keys(existingGames).length} existing games in database`);
  
  let updated = 0;
  let added = 0;
  let changesDetected = 0;
  
  const scrapedMap = new Map();
  for (const game of scrapedGames) {
    scrapedMap.set(game.game_id, game);
  }
  
  const gamesToUpsert = [];
  
  for (const [gameId, existing] of Object.entries(existingGames)) {
    const scraped = scrapedMap.get(gameId);
    
    if (scraped) {
      const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
      
      let originalDate = existing.original_date;
      let scheduleChanged = existing.schedule_changed || false;
      
      if (hasAssignment && existing.date && existing.date !== scraped.date) {
        originalDate = existing.original_date || existing.date;
        scheduleChanged = true;
        changesDetected++;
        console.log(`  ⚠️ Schedule change: ${scraped.home_team} vs ${scraped.away_team} moved from ${existing.date} to ${scraped.date}`);
      }
      
      const awayScore = toIntOrNull(scraped.away_score) ?? toIntOrNull(existing.away_score);
      const homeScore = toIntOrNull(scraped.home_score) ?? toIntOrNull(existing.home_score);
      
      gamesToUpsert.push({
        game_id: gameId,
        date: scraped.date,
        time: scraped.time || existing.time,
        away_team: scraped.away_team,
        away_score: awayScore,
        home_team: scraped.home_team,
        home_score: homeScore,
        gender: scraped.gender,
        level: scraped.level,
        division: scraped.division,
        photog1: toStringOrNull(existing.photog1),
        photog2: toStringOrNull(existing.photog2),
        videog: toStringOrNull(existing.videog),
        writer: toStringOrNull(existing.writer),
        notes: toStringOrNull(existing.notes),
        original_date: toDateOrNull(originalDate),
        schedule_changed: scheduleChanged,
        photos_url: toStringOrNull(existing.photos_url),
        recap_url: toStringOrNull(existing.recap_url),
        highlights_url: toStringOrNull(existing.highlights_url),
        live_stream_url: toStringOrNull(existing.live_stream_url),
        game_description: toStringOrNull(existing.game_description),
        special_event: toStringOrNull(existing.special_event)
      });
      updated++;
    }
  }
  
  for (const [gameId, game] of scrapedMap) {
    if (!existingGames[gameId]) {
      gamesToUpsert.push({
        game_id: gameId,
        date: game.date,
        time: game.time,
        away_team: game.away_team,
        away_score: toIntOrNull(game.away_score),
        home_team: game.home_team,
        home_score: toIntOrNull(game.home_score),
        gender: game.gender,
        level: game.level,
        division: game.division,
        photog1: null,
        photog2: null,
        videog: null,
        writer: null,
        notes: null,
        original_date: null,
        schedule_changed: false,
        photos_url: null,
        recap_url: null,
        highlights_url: null,
        live_stream_url: null,
        game_description: null,
        special_event: null
      });
      added++;
    }
  }
  
  console.log(`  Stats: ${updated} to update, ${added} to add`);
  
  if (changesDetected > 0) {
    console.log(`  ⚠️ Schedule changes detected: ${changesDetected}`);
  }
  
  const BATCH_SIZE = 500;
  let totalUpserted = 0;
  
  for (let i = 0; i < gamesToUpsert.length; i += BATCH_SIZE) {
    const batch = gamesToUpsert.slice(i, i + BATCH_SIZE);
    
    const upsertResponse = await fetch(
      `${supabaseUrl}/rest/v1/games?on_conflict=game_id`,
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
    
    for (const [name, school] of Object.entries(SIDEARM_SCHOOLS)) {
      const mensGames = await scrapeSchoolSchedule(school, 'Men');
      allGames.push(...mensGames);
      
      const womensGames = await scrapeSchoolSchedule(school, 'Women');
      allGames.push(...womensGames);
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`Total games scraped: ${allGames.length}`);
    
    const uniqueGames = deduplicateGames(allGames);
    console.log(`After deduplication: ${uniqueGames.length}`);
    
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

export const config = {
  schedule: "0 6 * 11,12,1,2,3 *"
};
