// Ball603 NHIAA Schedule Scraper
// Runs 3x daily via Netlify scheduled functions
// Preserves assignments and detects schedule changes
// Now uses Supabase instead of Google Sheets

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
    'Pittsburg-Canaan': 'Pittsburg-Canaan',
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
    
    // Match all table rows
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(section)) !== null) {
      const rowHtml = rowMatch[1];
      
      // Extract all td contents
      const tdRegex = /<td[^>]*>([^<]*)<\/td>/gi;
      const cells = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].trim());
      }
      
      // Need at least 4 cells for a valid row
      if (cells.length < 4) continue;
      
      const date = cells[0];
      if (!/^\d{2}\/\d{2}\/\d{2}$/.test(date)) continue;
      
      const atIndicator = cells[1];
      const opponent = cells[2];
      // cells[3] is always empty
      
      if (!opponent) continue;
      
      const isAway = atIndicator.toLowerCase() === 'at';
      const homeTeam = normalizeTeamName(isAway ? opponent : teamName);
      const awayTeam = normalizeTeamName(isAway ? teamName : opponent);
      
      const [month, day, year] = date.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      let time = '';
      let homeScore = '';
      let awayScore = '';
      
      // Check if completed game (8 cells) or upcoming (5 cells with time)
      if (cells.length >= 8 && (cells[4] === 'W' || cells[4] === 'L')) {
        // Completed game: cells[4]=W/L, cells[5]=teamScore, cells[6]="-", cells[7]=oppScore
        const teamScore = cells[5];
        const oppScore = cells[7];
        
        if (isAway) {
          awayScore = teamScore;
          homeScore = oppScore;
        } else {
          homeScore = teamScore;
          awayScore = oppScore;
        }
        time = 'FINAL';
      } else if (cells.length >= 5) {
        // Upcoming game: cells[4] is the time
        time = cells[4];
      }
      
      // Game ID uses sorted teams for consistency (handles inconsistent home/away on NHIAA)
      const team1 = homeTeam.toLowerCase().replace(/[^a-z0-9]/g, '');
      const team2 = awayTeam.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sortedTeams = [team1, team2].sort();
      const genderCode = gender === 'Boys' ? 'b' : 'g';
      const dateStr = isoDate.replace(/-/g, '');
      const gameId = `nhiaa_${sortedTeams[0]}_${genderCode}_${dateStr}_${sortedTeams[1]}`;
      
      games.push({
        game_id: gameId,
        date: isoDate,
        time: time,
        away_team: awayTeam,
        home_team: homeTeam,
        away_score: awayScore ? parseInt(awayScore) : null,
        home_score: homeScore ? parseInt(homeScore) : null,
        gender: gender,
        level: 'NHIAA',
        division: division,
        status: time === 'FINAL' ? 'final' : 'scheduled'
      });
    }
  }
  
  return games;
}

function deduplicateGames(games) {
  const seen = new Map();
  
  for (const game of games) {
    // Create canonical key by sorting team names (handles inconsistent home/away)
    const teams = [game.home_team, game.away_team].sort();
    const canonicalKey = `${game.date}_${teams[0]}_${teams[1]}_${game.gender}`;
    
    if (!seen.has(canonicalKey)) {
      seen.set(canonicalKey, game);
    } else {
      // If we already have this game, prefer the one with scores
      const existing = seen.get(canonicalKey);
      if (game.home_score && !existing.home_score) {
        seen.set(canonicalKey, game);
      }
    }
  }
  
  return Array.from(seen.values());
}

async function getExistingGames() {
  // Fetch all NHIAA games from Supabase
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&select=game_id,date,photog1,photog2,videog,writer,notes,original_date,schedule_changed,photos_url,recap_url,highlights_url,live_stream_url,game_description,special_event`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  if (!response.ok) {
    console.error('Failed to fetch existing games:', response.status);
    return {};
  }
  
  const games = await response.json();
  
  // Build lookup by game_id
  const lookup = {};
  for (const game of games) {
    lookup[game.game_id] = game;
  }
  
  return lookup;
}

async function updateSupabase(games) {
  // Get existing games to preserve assignments
  const existingGames = await getExistingGames();
  console.log(`  Found ${Object.keys(existingGames).length} existing NHIAA games`);
  
  let changesDetected = 0;
  
  // Build upsert data, preserving assignments
  const upsertData = games.map(g => {
    const existing = existingGames[g.game_id] || {};
    
    // Check if this game has an assignment
    const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
    
    // Detect schedule change
    let originalDate = existing.original_date || null;
    let scheduleChanged = existing.schedule_changed || false;
    
    if (hasAssignment && existing.date && existing.date !== g.date) {
      // Date changed for a claimed game!
      originalDate = existing.original_date || existing.date;
      scheduleChanged = true;
      changesDetected++;
      console.log(`  ⚠️ Schedule change detected: ${g.home_team} vs ${g.away_team} moved from ${existing.date} to ${g.date}`);
    }
    
    // If game was claimed but no original_date set yet, set it now
    if (hasAssignment && !originalDate) {
      originalDate = g.date;
    }
    
    return {
      game_id: g.game_id,
      date: g.date,
      time: g.time || null,
      away_team: g.away_team,
      home_team: g.home_team,
      away_score: g.away_score,
      home_score: g.home_score,
      gender: g.gender,
      level: g.level,
      division: g.division,
      status: g.status,
      // Preserve existing coverage data
      photog1: existing.photog1 || null,
      photog2: existing.photog2 || null,
      videog: existing.videog || null,
      writer: existing.writer || null,
      notes: existing.notes || null,
      photos_url: existing.photos_url || null,
      recap_url: existing.recap_url || null,
      highlights_url: existing.highlights_url || null,
      live_stream_url: existing.live_stream_url || null,
      game_description: existing.game_description || null,
      special_event: existing.special_event || null,
      original_date: originalDate,
      schedule_changed: scheduleChanged
    };
  });
  
  if (changesDetected > 0) {
    console.log(`  ⚠️ Total schedule changes detected: ${changesDetected}`);
  }
  
  // Batch upsert to Supabase
  const batchSize = 100;
  let totalUpserted = 0;
  
  for (let i = 0; i < upsertData.length; i += batchSize) {
    const batch = upsertData.slice(i, i + batchSize);
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?on_conflict=game_id`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(batch)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Batch ${i}-${i+batchSize} error:`, errorText);
    } else {
      totalUpserted += batch.length;
    }
  }
  
  return { rowCount: totalUpserted, changesDetected };
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
    
    const { rowCount, changesDetected } = await updateSupabase(dedupedGames);
    
    return new Response(JSON.stringify({
      success: true,
      gamesScraped: dedupedGames.length,
      gamesUpserted: rowCount,
      scheduleChanges: changesDetected,
      timestamp: new Date().toISOString()
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
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
