// Ball603 College Basketball ESPN Scraper
// Uses ESPN's hidden JSON API for reliable data
// Scrapes D1 schedules for UNH and Dartmouth
// Runs every 2 hours during basketball season (Nov-Mar)
// Updated: Writes to Supabase instead of Google Sheets

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
  
  if (normalizations[name]) {
    return normalizations[name];
  }
  
  const mascotPattern = / (Wildcats|Big Green|Terriers|Catamounts|Black Bears|River Hawks|Retrievers|Bearcats|Great Danes|Highlanders|Bulldogs|Skyhawks|Crimson|Bears|Friars|Crusaders|Eagles|Huskies|Orange|Rams|Warriors|Pioneers|Stags|Bobcats|Dolphins|Tigers|Patriots|Cornhuskers|Billikens|Gaels|Jaspers|Hoyas|Peacocks|Seawolves|Hawks|Knights|Broncs|Golden Griffins|Bonnies|Explorers|Musketeers|Blue Demons|Bluejays|Hoosiers|Badgers|Buckeyes|Spartans|Wolverines|Fighting Irish|Bruins|Trojans|Cardinal|Cardinals|Ducks|Beavers|Cougars|Sun Devils|Buffaloes|Jayhawks|Sooners|Longhorns|Aggies|Red Raiders|Horned Frogs|Mountaineers|Cyclones|Hawkeyes|Golden Gophers|Boilermakers|Illini|Scarlet Knights|Nittany Lions|Tar Heels|Blue Devils|Demon Deacons|Wolfpack|Cavaliers|Hokies|Hurricanes|Seminoles|Yellow Jackets|Gamecocks|Volunteers|Razorbacks|Rebels|Crimson Tide|War Eagles|Gators|Commodores|Raiders|Moose|Pilgrims|Penmen|Ravens|Greyhounds|Owls|Panthers|Falcons|Lions|Jaguars|Leopards|Wolves|Sharks|Seahawks|Lancers|Royals|Monarchs|Titans|Generals|Cadets|Monks|Phoenix|Thunder|Storm|Wave|Pride|Mustangs|Broncos|Chargers|Blazers|Golden Eagles|Thunderbirds|Bison|Colonels|Terrapins|Flames|Anteaters|Banana Slugs|Chanticleers|Governors|Hatters|Hilltoppers|Ichabods|Keydets|Lakers|Mavericks|Midshipmen|Miners|Mocs|Norsemen|Ospreys|Paladins|Ramblers|Red Storm|Red Foxes|Redbirds|Redhawks|Roadrunners|Rockets|Salukis|Shockers|Spiders|Thundering Herd|Tritons|Vandals|Zips|Saints|Purple Eagles|Cowboys|Cowgirls|Black Knights|Lumberjacks|Demon Deacons|Scarlet Hawks|Mean Green|Ragin Cajuns|Golden Hurricane|Golden Flashes|RedHawks|Dukes|Tribe|Shockers|Toreros|Toppers|Warhawks|Blue Hose|Camels|Catamounts|Chippewas|Flames|Hoosiers|Kangaroos|Leathernecks|Mastodons|Musketeers|Penguins|Racers|River Hawks|Skyhawks|Blue Raiders|Retrievers)$/i;
  const cleaned = name.replace(mascotPattern, '');
  
  if (normalizations[cleaned]) {
    return normalizations[cleaned];
  }
  
  return cleaned;
}

/**
 * Parse ESPN API JSON response into game objects
 */
function parseESPNAPIResponse(data, team, gender) {
  const games = [];
  
  if (!data || !data.events) {
    console.log(`    No events found in API response`);
    return games;
  }
  
  for (const event of data.events) {
    try {
      const competition = event.competitions?.[0];
      if (!competition) continue;
      
      const competitors = competition.competitors || [];
      if (competitors.length !== 2) continue;
      
      const homeCompetitor = competitors.find(c => c.homeAway === 'home');
      const awayCompetitor = competitors.find(c => c.homeAway === 'away');
      
      if (!homeCompetitor || !awayCompetitor) continue;
      
      const homeTeamName = (homeCompetitor.team?.displayName || homeCompetitor.team?.name || '').trim();
      const awayTeamName = (awayCompetitor.team?.displayName || awayCompetitor.team?.name || '').trim();
      
      const gameDate = event.date;
      if (!gameDate) continue;
      
      const dateObj = new Date(gameDate);
      const isoDate = dateObj.toISOString().split('T')[0];
      
      let time = '';
      let homeScore = null;
      let awayScore = null;
      
      const status = competition.status?.type?.name || '';
      const isCompleted = status === 'STATUS_FINAL' || competition.status?.type?.completed;
      
      if (isCompleted) {
        time = 'FINAL';
        const homeScoreRaw = homeCompetitor.score;
        const awayScoreRaw = awayCompetitor.score;
        const hs = typeof homeScoreRaw === 'object' ? (homeScoreRaw?.displayValue || homeScoreRaw?.value || '') : (homeScoreRaw || '');
        const as = typeof awayScoreRaw === 'object' ? (awayScoreRaw?.displayValue || awayScoreRaw?.value || '') : (awayScoreRaw || '');
        homeScore = hs ? parseInt(String(hs)) : null;
        awayScore = as ? parseInt(String(as)) : null;
      } else {
        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/New_York'
        });
        time = timeStr.toUpperCase();
      }
      
      const homeTeam = normalizeCollegeName(homeTeamName);
      const awayTeam = normalizeCollegeName(awayTeamName);
      
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
 * Filter games to only those in New Hampshire
 */
function filterNHGames(games) {
  const nhTeams = ['UNH', 'Dartmouth'];
  return games.filter(g => nhTeams.includes(g.home_team));
}

/**
 * Get existing college games from Supabase
 */
async function getExistingCollegeGames(supabaseUrl, supabaseKey) {
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
  // Validate it looks like a date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}

/**
 * Update Supabase with scraped games
 */
async function updateSupabase(games) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('  Supabase credentials not configured - returning games only');
    return { rowCount: games.length, changesDetected: 0, dbUpdated: false };
  }
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  const existingGames = await getExistingCollegeGames(supabaseUrl, supabaseKey);
  console.log(`  Found ${Object.keys(existingGames).length} existing college games`);
  
  let changesDetected = 0;
  let updated = 0;
  let added = 0;
  
  const scrapedMap = new Map();
  for (const game of games) {
    scrapedMap.set(game.game_id, game);
  }
  
  const gamesToUpsert = [];
  
  // Process existing games that match scraped games
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
      const time = (awayScore !== null && homeScore !== null && scraped.time !== 'FINAL') ? 'FINAL' : scraped.time;
      
      gamesToUpsert.push({
        game_id: gameId,
        date: scraped.date,
        time: time,
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
  
  // Add new games from scrape
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
    console.log(`  ⚠️ Total schedule changes detected: ${changesDetected}`);
  }
  
  // Upsert to Supabase in batches
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
  
  return { rowCount: totalUpserted, changesDetected, dbUpdated: true, updated, added };
}

/**
 * Main handler - Netlify function entry point
 */
export default async (request) => {
  console.log('Ball603 College ESPN Scraper (Supabase) - Starting...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const allGames = [];
    
    for (const [teamKey, team] of Object.entries(ESPN_TEAMS)) {
      const mensGames = await scrapeTeamSchedule(team, 'Men');
      allGames.push(...mensGames);
      
      const womensGames = await scrapeTeamSchedule(team, 'Women');
      allGames.push(...womensGames);
      
      await new Promise(r => setTimeout(r, 300));
    }
    
    console.log(`Total games scraped: ${allGames.length}`);
    
    const uniqueGames = deduplicateGames(allGames);
    console.log(`After deduplication: ${uniqueGames.length} games`);
    
    const nhGames = filterNHGames(uniqueGames);
    console.log(`NH home games (for contributors): ${nhGames.length}`);
    
    const { rowCount, changesDetected, dbUpdated } = await updateSupabase(uniqueGames);
    
    const result = {
      success: true,
      gamesScraped: uniqueGames.length,
      nhHomeGames: nhGames.length,
      scheduleChanges: changesDetected,
      dbUpdated: dbUpdated,
      timestamp: new Date().toISOString(),
      teams: Object.keys(ESPN_TEAMS),
      games: uniqueGames
    };
    
    console.log('Scrape complete:', JSON.stringify({
      ...result,
      games: `[${uniqueGames.length} games]`
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

export const config = {
  // Nov-Mar: 5am, 11am, 2pm, 3pm, 4pm, 5pm, 6pm, 7pm, 8pm, 9pm, 10pm, 11pm, 12am, 1am EST
  // Converted to UTC (EST+5): 0,1,2,3,4,5,6,10,16,19,20,21,22,23
  schedule: "0 0,1,2,3,4,5,6,10,16,19,20,21,22,23 * 1,2,3,11,12 *"
};

export {
  parseESPNAPIResponse,
  normalizeCollegeName,
  deduplicateGames,
  filterNHGames,
  ESPN_TEAMS,
  ESPN_API
};
