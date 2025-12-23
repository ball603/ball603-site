// Ball603 NHIAA Schedule Scraper
// Runs via Netlify scheduled functions
// Preserves assignments and detects schedule changes
// Uses Supabase instead of Google Sheets

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

// Helper to convert score to integer or null
function toIntOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = parseInt(val);
  return isNaN(num) ? null : num;
}

// Convert team name to consistent slug for game IDs
// This prevents duplicates from variant spellings/truncations from NHIAA
function teamSlug(name) {
  if (!name) return '';
  
  // Map of normalized team names to consistent short slugs
  const slugMap = {
    'Alvirne': 'alvirne',
    'Bedford': 'bedford',
    'Belmont': 'belmont',
    'Berlin': 'berlin',
    'Bishop Brady': 'bishopbrady',
    'Bishop Guertin': 'bishopguertin',
    'Bow': 'bow',
    'Campbell': 'campbell',
    'Coe-Brown': 'coebrown',
    'Colebrook': 'colebrook',
    'ConVal': 'conval',
    'Conant': 'conant',
    'Concord Christian': 'concordchristian',
    'Concord': 'concord',
    'Derryfield': 'derryfield',
    'Dover': 'dover',
    'Epping': 'epping',
    'Exeter': 'exeter',
    'Fall Mountain': 'fallmountain',
    'Farmington': 'farmington',
    'Franklin': 'franklin',
    'Gilford': 'gilford',
    'Goffstown': 'goffstown',
    'Gorham': 'gorham',
    'Groveton': 'groveton',
    'Hanover': 'hanover',
    'Hillsboro-Deering': 'hillsborodeering',
    'Hinsdale': 'hinsdale',
    'Hollis-Brookline': 'hollisbrookline',
    'Holy Family': 'holyfamily',
    'Hopkinton': 'hopkinton',
    'Inter-Lakes': 'interlakes',
    'John Stark': 'johnstark',
    'Kearsarge': 'kearsarge',
    'Keene': 'keene',
    'Kennett': 'kennett',
    'Kingswood': 'kingswood',
    'Laconia': 'laconia',
    'Lebanon': 'lebanon',
    'Lin-Wood': 'linwood',
    'Lisbon': 'lisbon',
    'Littleton': 'littleton',
    'Londonderry': 'londonderry',
    'Manchester Central': 'manchestercentral',
    'Manchester Memorial': 'manchestermemorial',
    'Manchester West': 'manchesterwest',
    'Mascenic': 'mascenic',
    'Mascoma Valley': 'mascomavalley',
    'Merrimack Valley': 'merrimackvalley',
    'Merrimack': 'merrimack',
    'Milford': 'milford',
    'Monadnock': 'monadnock',
    'Moultonborough': 'moultonborough',
    'Mount Royal': 'mountroyal',
    'Nashua North': 'nashuanorth',
    'Nashua South': 'nashuasouth',
    'Newfound': 'newfound',
    'Newmarket': 'newmarket',
    'Newport': 'newport',
    'Nute': 'nute',
    'Oyster River': 'oysterriver',
    'Pelham': 'pelham',
    'Pembroke': 'pembroke',
    'Pinkerton': 'pinkerton',
    'Pittsburg-Canaan': 'pittsburgcanaan',
    'Pittsburg': 'pittsburg',
    'Pittsfield': 'pittsfield',
    'Plymouth': 'plymouth',
    'Portsmouth Christian': 'portsmouthchristian',
    'Portsmouth': 'portsmouth',
    'Profile': 'profile',
    'Prospect Mountain': 'prospectmountain',
    'Raymond': 'raymond',
    'St. Thomas Aquinas': 'stthomasaquinas',
    'Salem': 'salem',
    'Sanborn': 'sanborn',
    'Somersworth': 'somersworth',
    'Souhegan': 'souhegan',
    'Spaulding': 'spaulding',
    'Stevens': 'stevens',
    'Sunapee': 'sunapee',
    'Timberlane': 'timberlane',
    'Trinity': 'trinity',
    'White Mountains': 'whitemountains',
    'Wilton-Lyndeborough': 'wiltonlyndeborough',
    'Windham': 'windham',
    'Winnacunnet': 'winnacunnet',
    'Winnisquam': 'winnisquam',
    'Woodsville': 'woodsville',
  };
  
  // If we have a known slug, use it
  if (slugMap[name]) {
    return slugMap[name];
  }
  
  // Fallback: create slug from name (lowercase, alphanumeric only)
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
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
      
      // Game ID uses sorted team slugs for consistency (handles inconsistent home/away on NHIAA)
      const team1 = teamSlug(homeTeam);
      const team2 = teamSlug(awayTeam);
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
        status: time === 'FINAL' ? 'final' : 'scheduled',
        isFromHomeTeam: !isAway  // true if this data came from the home team's schedule
      });
    }
  }
  
  return games;
}

function deduplicateGames(games) {
  // Step 1: Group games by game_id (exact duplicates from both teams' schedules)
  const gameById = new Map();
  
  for (const game of games) {
    if (!gameById.has(game.game_id)) {
      gameById.set(game.game_id, []);
    }
    gameById.get(game.game_id).push(game);
  }
  
  const finalGames = [];
  
  // Step 2: For each game_id group, pick the best record
  for (const [gameId, duplicates] of gameById) {
    let bestGame = null;
    
    // Prefer record from home team's schedule (more accurate for time/location)
    const homeRecord = duplicates.find(g => g.isFromHomeTeam);
    
    if (homeRecord) {
      bestGame = homeRecord;
      
      // If multiple home records (shouldn't happen), prefer one with scores
      const homeRecords = duplicates.filter(g => g.isFromHomeTeam);
      if (homeRecords.length > 1) {
        const withScores = homeRecords.find(g => g.home_score !== null);
        if (withScores) bestGame = withScores;
      }
    } else {
      // No home record - use first one, prefer with scores
      const withScores = duplicates.find(g => g.home_score !== null);
      bestGame = withScores || duplicates[0];
    }
    
    // Merge scores if we have them from any record
    if (bestGame.home_score === null) {
      const withScores = duplicates.find(g => g.home_score !== null);
      if (withScores) {
        bestGame.home_score = withScores.home_score;
        bestGame.away_score = withScores.away_score;
        bestGame.status = withScores.status;
        bestGame.time = withScores.time;
      }
    }
    
    finalGames.push(bestGame);
  }
  
  return finalGames;
}

async function cleanupDuplicates() {
  try {
    // Fetch all NHIAA games from Supabase
    console.log('  Fetching existing games...');
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Range': '0-9999'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch games for duplicate cleanup:', response.status);
      return { duplicatesRemoved: 0, gameIdsMigrated: 0 };
    }
    
    const games = await response.json();
    console.log(`  Analyzing ${games.length} existing games for duplicates...`);
    
    // Group by canonical key: date_team1_team2_gender (teams sorted alphabetically)
    const groups = new Map();
    
    for (const game of games) {
      if (!game.home_team || !game.away_team || !game.date || !game.gender) {
        continue; // Skip games with missing required fields
      }
      
      const team1 = teamSlug(game.home_team);
      const team2 = teamSlug(game.away_team);
      const sortedTeams = [team1, team2].sort();
      const genderCode = game.gender.toLowerCase().charAt(0);
      const canonicalKey = `${game.date}_${sortedTeams[0]}_${sortedTeams[1]}_${genderCode}`;
      
      if (!groups.has(canonicalKey)) {
        groups.set(canonicalKey, []);
      }
      groups.get(canonicalKey).push(game);
    }
    
    // Process groups - fix IDs and remove duplicates
    const idsToDelete = [];
    let migratedCount = 0;
    
    for (const [key, gameGroup] of groups) {
      // Generate the CORRECT canonical game_id for this matchup
      const sampleGame = gameGroup[0];
      const team1 = teamSlug(sampleGame.home_team);
      const team2 = teamSlug(sampleGame.away_team);
      const sortedTeams = [team1, team2].sort();
      const genderCode = sampleGame.gender.toLowerCase().charAt(0);
      const dateStr = sampleGame.date.replace(/-/g, '');
      const correctGameId = `nhiaa_${sortedTeams[0]}_${genderCode}_${dateStr}_${sortedTeams[1]}`;
      
      if (gameGroup.length > 1) {
        // DUPLICATES FOUND
        console.log(`  Found ${gameGroup.length} duplicates for: ${key}`);
        
        // Score each game - higher score = keep it
        const scored = gameGroup.map(g => {
          let score = 0;
          if (g.home_score !== null && g.away_score !== null) score += 100;
          if (g.photog1) score += 10;
          if (g.photog2) score += 10;
          if (g.videog) score += 10;
          if (g.writer) score += 10;
          if (g.photos_url) score += 20;
          if (g.recap_url) score += 20;
          if (g.highlights_url) score += 20;
          if (g.notes) score += 5;
          if (g.game_description) score += 5;
          // Bonus if already has correct ID
          if (g.game_id === correctGameId) score += 50;
          
          return { game: g, score };
        });
        
        scored.sort((a, b) => b.score - a.score);
        const keeper = scored[0].game;
        
        console.log(`    Correct ID should be: ${correctGameId}`);
        console.log(`    Keeping: ${keeper.game_id} (score: ${scored[0].score})`);
        
        // If keeper has wrong ID, migrate it
        if (keeper.game_id !== correctGameId) {
          console.log(`    Migrating to correct ID: ${correctGameId}`);
          const migrated = await migrateGameId(keeper, correctGameId);
          if (migrated) {
            migratedCount++;
            idsToDelete.push(keeper.game_id); // Delete old record
          }
        }
        
        // Delete all other duplicates
        for (let i = 1; i < scored.length; i++) {
          console.log(`    Deleting: ${scored[i].game.game_id} (score: ${scored[i].score})`);
          idsToDelete.push(scored[i].game.game_id);
        }
        
      } else {
        // SINGLE RECORD - but check if ID needs fixing
        const game = gameGroup[0];
        if (game.game_id !== correctGameId) {
          console.log(`  Fixing ID: ${game.game_id} -> ${correctGameId}`);
          const migrated = await migrateGameId(game, correctGameId);
          if (migrated) {
            migratedCount++;
            idsToDelete.push(game.game_id);
          }
        }
      }
    }
    
    // Delete old records
    if (idsToDelete.length > 0) {
      let deleteCount = 0;
      
      for (const gameId of idsToDelete) {
        try {
          const deleteUrl = `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(gameId)}`;
          
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
          });
          
          if (deleteResponse.ok) {
            deleteCount++;
          } else {
            console.error(`Failed to delete ${gameId}:`, await deleteResponse.text());
          }
        } catch (deleteError) {
          console.error(`Error deleting ${gameId}:`, deleteError.message);
        }
      }
      
      console.log(`  Deleted ${deleteCount} old/duplicate games`);
      console.log(`  Migrated ${migratedCount} game IDs to canonical format`);
      return { duplicatesRemoved: deleteCount, gameIdsMigrated: migratedCount };
    } else {
      console.log(`  No duplicates or ID fixes needed`);
      return { duplicatesRemoved: 0, gameIdsMigrated: 0 };
    }
  } catch (error) {
    console.error('Error in cleanupDuplicates:', error.message);
    return { duplicatesRemoved: 0, gameIdsMigrated: 0 };
  }
}

// Migrate a game to a new game_id, preserving all data
async function migrateGameId(oldGame, newGameId) {
  try {
    // Create new record with correct ID and all existing data
    const newGame = { ...oldGame, game_id: newGameId };
    delete newGame.id; // Remove any auto-generated id field
    
    const insertResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(newGame)
      }
    );
    
    if (!insertResponse.ok) {
      console.error(`Failed to create migrated game:`, await insertResponse.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error migrating game:`, error.message);
    return false;
  }
}

async function getExistingGames() {
  // Fetch all NHIAA games from Supabase
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&select=game_id,date,time,away_score,home_score,photog1,photog2,videog,writer,notes,original_date,schedule_changed,photos_url,recap_url,highlights_url,live_stream_url,game_description,special_event,original_time`,
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
    
    // Preserve existing scores if scraper doesn't have one
    // This prevents manual score entries from being wiped out
    const awayScore = toIntOrNull(g.away_score) ?? toIntOrNull(existing.away_score);
    const homeScore = toIntOrNull(g.home_score) ?? toIntOrNull(existing.home_score);
    
    // Determine time: if we have scores (from scraper or existing), mark as FINAL
    // Otherwise use scraped time, or preserve existing time
    let time = g.time || null;
    if (awayScore !== null && homeScore !== null) {
      time = 'FINAL';
    } else if (!time && existing.time) {
      time = existing.time;
    }
    
    return {
      game_id: g.game_id,
      date: g.date,
      time: time,
      away_team: g.away_team,
      home_team: g.home_team,
      away_score: awayScore,
      home_score: homeScore,
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

// Sync database with NHIAA - remove games not in scrape, transfer coverage for rescheduled games
async function syncWithNHIAA(scrapedGames) {
  try {
    // Safeguard: if scrape returned too few games, NHIAA might be down
    if (scrapedGames.length < 1000) {
      console.log(`  Scrape only returned ${scrapedGames.length} games - skipping sync to avoid accidental deletion`);
      return { orphansRemoved: 0, coverageTransferred: 0 };
    }
    
    // Build set of scraped game_ids for fast lookup
    const scrapedGameIds = new Set(scrapedGames.map(g => g.game_id));
    
    // Fetch all NHIAA games from database
    const dbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&select=game_id,date,home_team,away_team,gender,photog1,photog2,videog,writer`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Range': '0-9999'
        }
      }
    );
    
    if (!dbResponse.ok) {
      console.error('Failed to fetch DB games for sync:', dbResponse.status);
      return { orphansRemoved: 0, coverageTransferred: 0 };
    }
    
    const dbGames = await dbResponse.json();
    
    // Find orphaned games (in DB but not in scrape)
    const orphanedGames = dbGames.filter(g => !scrapedGameIds.has(g.game_id));
    
    if (orphanedGames.length === 0) {
      console.log('  No orphaned games found - DB in sync with NHIAA');
      return { orphansRemoved: 0, coverageTransferred: 0 };
    }
    
    console.log(`  Found ${orphanedGames.length} orphaned games not in NHIAA scrape`);
    
    // Build lookup for scraped games by team matchup (for finding rescheduled games)
    const scrapedByMatchup = new Map();
    for (const game of scrapedGames) {
      const teams = [teamSlug(game.home_team), teamSlug(game.away_team)].sort();
      const key = `${teams[0]}_${teams[1]}_${game.gender}`;
      if (!scrapedByMatchup.has(key)) {
        scrapedByMatchup.set(key, []);
      }
      scrapedByMatchup.get(key).push(game);
    }
    
    let coverageTransferred = 0;
    
    // Process orphaned games - transfer coverage if they have assignments
    for (const orphan of orphanedGames) {
      const hasCoverage = orphan.photog1 || orphan.photog2 || orphan.videog || orphan.writer;
      
      if (hasCoverage) {
        // Look for matching rescheduled game
        const teams = [teamSlug(orphan.home_team), teamSlug(orphan.away_team)].sort();
        const matchupKey = `${teams[0]}_${teams[1]}_${orphan.gender}`;
        const matchingGames = scrapedByMatchup.get(matchupKey) || [];
        
        // Find a game with different date (the rescheduled game)
        const rescheduledGame = matchingGames.find(g => g.date !== orphan.date);
        
        if (rescheduledGame) {
          console.log(`  📅 Rescheduled: ${orphan.away_team} @ ${orphan.home_team} moved from ${orphan.date} to ${rescheduledGame.date}`);
          console.log(`     Transferring coverage: photog1=${orphan.photog1 || '-'}, photog2=${orphan.photog2 || '-'}, videog=${orphan.videog || '-'}, writer=${orphan.writer || '-'}`);
          
          // Transfer coverage to rescheduled game
          const transferResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(rescheduledGame.game_id)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                photog1: orphan.photog1 || null,
                photog2: orphan.photog2 || null,
                videog: orphan.videog || null,
                writer: orphan.writer || null,
                schedule_changed: true,
                original_date: orphan.date
              })
            }
          );
          
          if (transferResponse.ok) {
            coverageTransferred++;
          } else {
            console.error(`  Failed to transfer coverage for ${orphan.game_id}`);
          }
        } else {
          console.log(`  ⚠️ Orphaned with coverage but no reschedule found: ${orphan.away_team} @ ${orphan.home_team} on ${orphan.date}`);
        }
      } else {
        console.log(`  🗑️ Removing: ${orphan.away_team} @ ${orphan.home_team} on ${orphan.date}`);
      }
    }
    
    // Delete all orphaned games
    const orphanIds = orphanedGames.map(g => g.game_id);
    
    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=in.(${orphanIds.map(id => `"${id}"`).join(',')})`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      }
    );
    
    if (!deleteResponse.ok) {
      console.error('Failed to delete orphaned games:', await deleteResponse.text());
      return { orphansRemoved: 0, coverageTransferred };
    }
    
    console.log(`  ✅ Removed ${orphanedGames.length} orphaned games, transferred ${coverageTransferred} coverage assignments`);
    return { orphansRemoved: orphanedGames.length, coverageTransferred };
    
  } catch (error) {
    console.error('Error syncing with NHIAA:', error.message);
    return { orphansRemoved: 0, coverageTransferred: 0 };
  }
}

export default async (request) => {
  console.log('Ball603 Schedule Scraper - Starting...');
  
  try {
    // Step 1: Clean up any existing duplicates and fix malformed IDs
    console.log('Step 1: Checking for duplicate games and fixing IDs...');
    const { duplicatesRemoved, gameIdsMigrated } = await cleanupDuplicates();
    
    // Step 2: Scrape fresh data from NHIAA
    console.log('Step 2: Scraping NHIAA schedules...');
    const allGames = [];
    
    for (const { url, gender, division } of SCHEDULE_URLS) {
      console.log(`Fetching ${gender} ${division}...`);
      const response = await fetch(url);
      const html = await response.text();
      const games = parseSchedulePage(html, gender, division);
      allGames.push(...games);
      console.log(`  Found ${games.length} game entries`);
    }
    
    // Step 3: Deduplicate scraped data (prefer home team's schedule)
    const dedupedGames = deduplicateGames(allGames);
    console.log(`Total unique games from scrape: ${dedupedGames.length}`);
    
    // Step 4: Sync with NHIAA - remove orphans, transfer coverage for rescheduled games
    console.log('Step 4: Syncing database with NHIAA...');
    const { orphansRemoved, coverageTransferred } = await syncWithNHIAA(dedupedGames);
    
    // Step 5: Upsert to database
    console.log('Step 5: Upserting to Supabase...');
    const { rowCount, changesDetected } = await updateSupabase(dedupedGames);
    
    return new Response(JSON.stringify({
      success: true,
      gamesScraped: dedupedGames.length,
      gamesUpserted: rowCount,
      duplicatesRemoved: duplicatesRemoved,
      gameIdsMigrated: gameIdsMigrated || 0,
      orphansRemoved: orphansRemoved,
      coverageTransferred: coverageTransferred || 0,
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
  // Every 5 minutes during basketball season (Nov-Mar)
  schedule: "*/5 * * 1,2,3,11,12 *"
};
