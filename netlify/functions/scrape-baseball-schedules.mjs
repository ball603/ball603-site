// Ball603 NHIAA Baseball Schedule Scraper
// Runs via Netlify scheduled functions
// Preserves assignments and detects schedule changes
// Uses Supabase instead of Google Sheets

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Sport and season for this scraper (baseball-specific)
const SPORT = 'baseball';
const SEASON = '2026';

const SCHEDULE_URLS = [
  { url: 'https://www.nhiaa.org/sports/schedules/boys-baseball/division-1', gender: 'Boys', division: 'D-I' },
  { url: 'https://www.nhiaa.org/sports/schedules/boys-baseball/division-2', gender: 'Boys', division: 'D-II' },
  { url: 'https://www.nhiaa.org/sports/schedules/boys-baseball/division-3', gender: 'Boys', division: 'D-III' },
  { url: 'https://www.nhiaa.org/sports/schedules/boys-baseball/division-4', gender: 'Boys', division: 'D-IV' },
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
    'Fall Mountain Reg': 'Fall Mountain',
    'Fall Mountain Reg.': 'Fall Mountain',
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
    'Man. Central-Man. West': 'Central-West',
    'Manchester Central-Manchester West': 'Central-West',
    'Manchester Central/West': 'Central-West',
    'Mount Royal-Holy Family': 'Mount Royal-Holy Family',
    'Mt. Royal-Holy Family': 'Mount Royal-Holy Family',
    'Mt Royal-Holy Family': 'Mount Royal-Holy Family',
    'Mount Royal/Holy Family': 'Mount Royal-Holy Family',
    'Holy Family-Mount Royal': 'Mount Royal-Holy Family',
    'Holy Family': 'Mount Royal-Holy Family',
    'Mascenic Regional High School': 'Mascenic',
    'Mascoma Valley': 'Mascoma',
    'Mascoma Valley Regional High School': 'Mascoma',
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
    'Central-West': 'centralwest',
    'Mount Royal-Holy Family': 'mountroyalholyfamily',
    'Mascenic': 'mascenic',
    'Mascoma': 'mascoma',
    'Mascoma Valley': 'mascoma',
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
      
      // SAFEGUARD: Don't accept scores for future dates (NHIAA data entry errors)
      // Compare dates only (ignore time) - a game is "future" only if it's AFTER today
      const today = new Date();
      const todayEST = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const todayDateStr = `${todayEST.getFullYear()}-${String(todayEST.getMonth() + 1).padStart(2, '0')}-${String(todayEST.getDate()).padStart(2, '0')}`;
      const isFutureGame = isoDate > todayDateStr; // String comparison works for YYYY-MM-DD format
      
      // Check if completed game (8 cells) or upcoming (5 cells with time)
      if (cells.length >= 8 && (cells[4] === 'W' || cells[4] === 'L') && !isFutureGame) {
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
      } else if (cells.length >= 8 && (cells[4] === 'W' || cells[4] === 'L') && isFutureGame) {
        // NHIAA has scores for a future game - ignore them and use time if available
        console.log(`  WARNING: Ignoring scores for future game: ${awayTeam} @ ${homeTeam} on ${isoDate}`);
        time = cells.length >= 5 ? cells[4] : '';
        // If the "time" we got is actually W/L, try to find real time or leave blank
        if (time === 'W' || time === 'L') {
          time = '';
        }
      } else if (cells.length >= 5) {
        // Upcoming game: cells[4] is the time
        time = cells[4];
      }
      
      // Check if this game has been postponed/rescheduled
      let isPostponed = false;
      if (time && (time.toLowerCase().includes('reschedul') || time.toLowerCase().includes('postpon'))) {
        console.log(`  ⏭️ Postponed/rescheduled game detected: ${awayTeam} @ ${homeTeam} on ${isoDate} (${time})`);
        isPostponed = true;
      }
      
      // Game ID uses sorted team slugs for consistency (handles inconsistent home/away on NHIAA)
      const team1 = teamSlug(homeTeam);
      const team2 = teamSlug(awayTeam);
      const sortedTeams = [team1, team2].sort();
      const genderCode = gender === 'Boys' ? 'b' : 'g';
      const dateStr = isoDate.replace(/-/g, '');
      const baseGameId = `nhiaa_${sortedTeams[0]}_${genderCode}_${dateStr}_${sortedTeams[1]}`;
      // Handle same game seen from both teams vs true doubleheader
      let gameId = baseGameId;
      const existingWithSameId = games.filter(g => g.game_id === baseGameId || g.game_id.startsWith(baseGameId + '_g'));
      if (existingWithSameId.some(g => g.game_id === baseGameId)) {
        // Base ID exists — check if it's the same game or a true doubleheader
        const existing = existingWithSameId.find(g => g.game_id === baseGameId);
        // Primary check: different scheduled times = true doubleheader
        const parseTimeToMins = t => {
          if (!t || t === 'FINAL' || t === 'TBD' || t === 'TBA' || t === '') return null;
          const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
          if (!m) return null;
          let h = parseInt(m[1]), min = parseInt(m[2] || '0');
          const ampm = (m[3] || '').toUpperCase();
          if (ampm === 'PM' && h !== 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          return h * 60 + min;
        };
        const newMins = parseTimeToMins(time);
        const existingMins = parseTimeToMins(existing.time);
        // True doubleheader = times differ by MORE than 30 minutes
        const timeDiff = (newMins !== null && existingMins !== null) ? Math.abs(newMins - existingMins) : null;
        const differentTimes = timeDiff !== null && timeDiff > 30;
        if (differentTimes) {
          // True doubleheader — check if _g2/_g3 already exists within 30 mins of new time
          const closeTimeEntry = existingWithSameId.find(g => {
            if (g.game_id === baseGameId) return false;
            const gMins = parseTimeToMins(g.time);
            return gMins !== null && newMins !== null && Math.abs(gMins - newMins) <= 30;
          });
          if (closeTimeEntry) {
            gameId = closeTimeEntry.game_id;
            if (newMins < parseTimeToMins(closeTimeEntry.time)) closeTimeEntry.time = time;
          } else {
            let n = 2;
            while (existingWithSameId.some(g => g.game_id === `${baseGameId}_g${n}`)) n++;
            gameId = `${baseGameId}_g${n}`;
          }
        } else {
          // Same or close times — same game, prefer earlier time
          if (newMins !== null && existingMins !== null && newMins < existingMins) {
            existing.time = time;
          }
          gameId = baseGameId;
        }
      }
      
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
        isFromHomeTeam: !isAway,  // true if this data came from the home team's schedule
        isPostponed: isPostponed
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
  
  const intermediateGames = [];
  
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
    
    // If ANY version of this game is marked postponed, mark the final result as postponed
    if (duplicates.some(g => g.isPostponed)) {
      bestGame.isPostponed = true;
    }
    
    intermediateGames.push(bestGame);
  }
  
  // Step 3: Handle back-to-back date conflicts (NHIAA sometimes shows different dates for same game)
  // Group by matchup (teams + gender), ignoring date
  const gamesByMatchup = new Map();
  
  for (const game of intermediateGames) {
    const team1 = teamSlug(game.home_team);
    const team2 = teamSlug(game.away_team);
    const sortedTeams = [team1, team2].sort();
    const genderCode = game.gender.toLowerCase().charAt(0);
    const matchupKey = `${sortedTeams[0]}_${sortedTeams[1]}_${genderCode}`;
    
    if (!gamesByMatchup.has(matchupKey)) {
      gamesByMatchup.set(matchupKey, []);
    }
    gamesByMatchup.get(matchupKey).push(game);
  }
  
  const finalGames = [];
  
  for (const [matchupKey, matchupGames] of gamesByMatchup) {
    if (matchupGames.length === 1) {
      // Only one game for this matchup - keep it
      finalGames.push(matchupGames[0]);
      continue;
    }
    
    // Sort by date to find consecutive games
    matchupGames.sort((a, b) => a.date.localeCompare(b.date));
    
    // Track which games to skip (duplicates on consecutive dates)
    const skipIndices = new Set();
    
    for (let i = 0; i < matchupGames.length - 1; i++) {
      if (skipIndices.has(i)) continue;
      
      const game1 = matchupGames[i];
      const game2 = matchupGames[i + 1];
      
      // Check if dates are consecutive (back-to-back)
      const date1 = new Date(game1.date + 'T12:00:00');
      const date2 = new Date(game2.date + 'T12:00:00');
      const diffDays = (date2 - date1) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        // Back-to-back dates found - keep only the home team's version
        console.log(`  ⚠️ Back-to-back conflict: ${game1.away_team} @ ${game1.home_team} on ${game1.date} vs ${game2.date}`);
        
        // Prefer home team's record, or if both/neither are home, prefer the one with scores
        let keeper, discard;
        
        if (game1.isFromHomeTeam && !game2.isFromHomeTeam) {
          keeper = game1;
          discard = game2;
        } else if (game2.isFromHomeTeam && !game1.isFromHomeTeam) {
          keeper = game2;
          discard = game1;
        } else {
          // Both or neither from home - prefer one with scores, otherwise later date
          if (game1.home_score !== null && game2.home_score === null) {
            keeper = game1;
            discard = game2;
          } else if (game2.home_score !== null && game1.home_score === null) {
            keeper = game2;
            discard = game1;
          } else {
            // Default to later date (usually more accurate)
            keeper = game2;
            discard = game1;
          }
        }
        
        console.log(`    Keeping ${keeper.date} (isFromHomeTeam: ${keeper.isFromHomeTeam}), discarding ${discard.date}`);
        
        // Mark the discarded game to skip
        skipIndices.add(matchupGames.indexOf(discard));
        
        // Merge scores if keeper doesn't have them but discard does
        if (keeper.home_score === null && discard.home_score !== null) {
          keeper.home_score = discard.home_score;
          keeper.away_score = discard.away_score;
          keeper.status = discard.status;
          keeper.time = discard.time;
        }
      }
    }
    
    // Add all non-skipped games
    for (let i = 0; i < matchupGames.length; i++) {
      if (!skipIndices.has(i)) {
        finalGames.push(matchupGames[i]);
      }
    }
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
    // Pairs of (old_game_id, new_game_id) for non-keeper duplicates whose linked content
    // must be re-pointed to the surviving keeper BEFORE deletion.
    // (Keeper migrations already cascade inside migrateGameId().)
    const nonKeeperCascadePairs = [];
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
      
      // If ALL games in this group have distinct _g2/_g3 suffixes, they're intentional doubleheaders
      const isDoubleheader = gameGroup.length > 1 && 
        gameGroup.every(g => g.game_id && (g.game_id === correctGameId || g.game_id.match(/_g\d+$/)));
      if (isDoubleheader) {
        // All games are legitimate doubleheader entries — skip duplicate processing
        continue;
      }

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

        // Track keeper's final ID so non-keepers cascade to the right target.
        let keeperFinalId = (keeper.game_id === correctGameId) ? correctGameId : null;
        let keeperMigrationFailed = false;

        // If keeper has wrong ID, migrate it (migrateGameId cascades its own articles)
        if (keeper.game_id !== correctGameId) {
          console.log(`    Migrating to correct ID: ${correctGameId}`);
          const migrated = await migrateGameId(keeper, correctGameId);
          if (migrated) {
            migratedCount++;
            idsToDelete.push(keeper.game_id); // Delete old record
            keeperFinalId = correctGameId;
          } else {
            keeperMigrationFailed = true;
            console.error(`    Keeper migration failed — skipping non-keeper cascade for this group to avoid orphaning content`);
          }
        }

        // Mark non-keeper duplicates for deletion ONLY if keeper migration succeeded (or wasn't needed).
        // Otherwise leave them all in place; next scrape will retry.
        if (!keeperMigrationFailed && keeperFinalId) {
          for (let i = 1; i < scored.length; i++) {
            const dupId = scored[i].game.game_id;
            console.log(`    Deleting: ${dupId} (score: ${scored[i].score})`);
            nonKeeperCascadePairs.push({ oldId: dupId, newId: keeperFinalId });
            idsToDelete.push(dupId);
          }
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

    // Cascade article references for non-keeper duplicates BEFORE deleting.
    // If any cascade fails, drop that old ID from the delete list so we don't orphan its links.
    if (nonKeeperCascadePairs.length > 0) {
      console.log(`  Cascading linked-content references for ${nonKeeperCascadePairs.length} non-keeper duplicate(s)...`);
      const safeToDelete = new Set(idsToDelete);
      for (const { oldId, newId } of nonKeeperCascadePairs) {
        const cr = await cascadeGameIdReferences(oldId, newId);
        if (!cr.success) {
          console.error(`  Removing ${oldId} from delete list (cascade failed — preserving to keep linked content alive)`);
          safeToDelete.delete(oldId);
        }
      }
      // Reduce idsToDelete to only entries still safe to delete
      idsToDelete.length = 0;
      safeToDelete.forEach(id => idsToDelete.push(id));
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

// Migrate a game to a new game_id, preserving all data AND linked content references.
// Order: (1) insert new game row, (2) cascade articles.game_id to new ID, (3) return.
// The caller then deletes the OLD game_id row — by which point nothing references it.
async function migrateGameId(oldGame, newGameId) {
  try {
    const oldGameId = oldGame.game_id;

    // Step 1: Create new record with correct ID and all existing data
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

    // Step 2: Cascade article references from old → new ID.
    // If this fails, return false so caller does NOT delete the old row (would orphan links).
    const cascadeResult = await cascadeGameIdReferences(oldGameId, newGameId);
    if (!cascadeResult.success) {
      console.error(`Cascade failed during migration ${oldGameId} → ${newGameId}; aborting (old row will NOT be deleted to preserve linked content)`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error migrating game:`, error.message);
    return false;
  }
}

// Cascade UPDATE on tables that reference games.game_id (currently: articles only).
// MUST be called BEFORE deleting an old game row so linked content never points at a dead game_id.
// NOTE: bash_content.game_id is UUID-typed and references a separate Bash Tournament data model,
// NOT the NHIAA games table. The NHIAA scrapers do not touch bash_content.
// Returns { success, articlesUpdated, errors } — caller should abort deletion if !success.
async function cascadeGameIdReferences(oldGameId, newGameId) {
  const result = { success: true, articlesUpdated: 0, errors: [] };

  // Defensive no-op
  if (!oldGameId || !newGameId || oldGameId === newGameId) {
    return result;
  }

  // articles.game_id is text-typed and matches games.game_id directly
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?game_id=eq.${encodeURIComponent(oldGameId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ game_id: newGameId })
      }
    );
    if (!r.ok) {
      result.success = false;
      result.errors.push(`articles PATCH ${r.status}: ${await r.text()}`);
    } else {
      const rows = await r.json();
      result.articlesUpdated = Array.isArray(rows) ? rows.length : 0;
      if (result.articlesUpdated > 0) {
        console.log(`    🔗 Re-linked ${result.articlesUpdated} article(s): ${oldGameId} → ${newGameId}`);
      }
    }
  } catch (err) {
    result.success = false;
    result.errors.push(`articles PATCH error: ${err.message}`);
  }

  if (!result.success) {
    console.error(`    ❌ Cascade FAILED ${oldGameId} → ${newGameId}:`, result.errors.join('; '));
  }
  return result;
}

// Returns a Set of game_ids (from the given list) that have at least one row in articles.
// Used to "protect" orphan games with linked content from being silently deleted when
// NHIAA changes the schedule.
async function getLinkedGameIds(gameIds) {
  const linked = new Set();
  if (!gameIds || gameIds.length === 0) return linked;

  // Batch lookups in chunks of 30 to stay under URL length limits
  const BATCH = 30;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Range': '0-9999'
  };

  for (let i = 0; i < gameIds.length; i += BATCH) {
    const chunk = gameIds.slice(i, i + BATCH);
    const inFilter = `in.(${chunk.map(id => `"${id}"`).join(',')})`;

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/articles?game_id=${inFilter}&select=game_id`, { headers });
      if (r.ok) {
        const rows = await r.json();
        rows.forEach(row => { if (row.game_id) linked.add(row.game_id); });
      } else {
        console.error('  articles lookup failed:', r.status, await r.text());
      }
    } catch (err) {
      console.error('  articles lookup error:', err.message);
    }
  }

  return linked;
}

async function getExistingGames() {
  // Fetch all NHIAA games from Supabase for this sport/season
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&sport=eq.${SPORT}&season=eq.${SEASON}&select=game_id,date,time,home_team,away_team,gender,division,away_score,home_score,photog1,photog2,videog,writer,notes,original_date,schedule_changed,photos_url,recap_url,highlights_url,live_stream_url,game_description,special_event,original_time,manual_override,is_playoff`,
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
  
  // Build list of locked games for cross-checking duplicates
  const lockedGames = Object.values(existingGames).filter(g => g.manual_override);
  
  let changesDetected = 0;
  
  // Build upsert data, preserving assignments
  const upsertData = games.map(g => {
    const existing = existingGames[g.game_id] || {};
    
    // Skip games with manual_override — do not overwrite
    if (existing.manual_override) {
      console.log(`  🔒 Skipping locked game: ${g.home_team} vs ${g.away_team} on ${g.date}`);
      return null;
    }
    
    // Skip playoff games — they are managed via lockSeeds and the admin, not by the scraper.
    // Even if the game_id doesn't match, the dominated check below will also catch them
    // via team+date matching against locked playoff records.
    if (existing.is_playoff) {
      console.log(`  🏆 Skipping playoff game: ${g.home_team} vs ${g.away_team} on ${g.date}`);
      return null;
    }
    
    // Check if this game duplicates a LOCKED game in the DB
    if (!existing.game_id) {
      const dominated = lockedGames.find(locked => {
        if (locked.game_id === g.game_id) return false;
        if (locked.home_team !== g.home_team || locked.away_team !== g.away_team) return false;
        if (locked.gender !== g.gender) return false;
        // For regular-season locked games, require score match to avoid false positives
        // with doubleheaders (same teams, same day). For playoff-locked games, teams+date
        // is sufficient — playoffs never have doubleheaders.
        if (!locked.is_playoff) {
          if (locked.home_score === null || g.home_score === null) return false;
          if (parseInt(locked.home_score) !== parseInt(g.home_score) || 
              parseInt(locked.away_score) !== parseInt(g.away_score)) return false;
        }
        const d1 = new Date(locked.date + 'T12:00:00');
        const d2 = new Date(g.date + 'T12:00:00');
        const diffDays = Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
        return diffDays <= 28;
      });
      if (dominated) {
        console.log(`  🔒 Skipping duplicate of locked game: ${g.away_team} @ ${g.home_team} on ${g.date} (locked version: ${dominated.date})`);
        return null;
      }
    }
    
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
      sport: SPORT,
      season: SEASON,
      // Set status based on whether we have scores (manual or scraped)
      // This prevents the scraper from reverting manually-entered scores to 'scheduled'
      status: time === 'FINAL' ? 'final' : 'scheduled',
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
  }).filter(Boolean); // Remove null entries (locked games)
  
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

// Sync database with NHIAA.
// For each game in DB but NOT in latest scrape ("orphan"):
//   (a) If there's a rescheduled match (same teams + gender, different date): cascade
//       article links to the new game_id, transfer FULL content fields
//       (assignments + content URLs), then delete the old row.
//   (b) If no reschedule match but the game has linked content (article/bash): PRESERVE
//       (do not delete). It will appear in the audit page for manual review.
//   (c) If no reschedule match and no linked content: delete (legacy behavior).
async function syncWithNHIAA(scrapedGames) {
  try {
    // Safeguard: if scrape returned dramatically fewer games than the DB has, NHIAA might be down.
    // Baseball typically scrapes ~600-800 games per run (4 divisions, ~140 teams, ~16 games each).
    // Compare to DB count rather than absolute number, so the safeguard adapts to the season.
    // Skip if scrape count < 50% of DB count (and DB has >100 games — first runs always proceed).
    const dbCountResp = await fetch(
      `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&sport=eq.${SPORT}&season=eq.${SEASON}&select=game_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'count=exact',
          'Range': '0-0'
        }
      }
    );
    const dbCountHeader = dbCountResp.headers.get('content-range') || '';
    const dbCount = parseInt(dbCountHeader.split('/').pop()) || 0;
    if (dbCount > 100 && scrapedGames.length < dbCount * 0.5) {
      console.log(`  Scrape returned ${scrapedGames.length} games vs ${dbCount} in DB (<50%) — skipping sync to avoid accidental mass deletion`);
      return { orphansRemoved: 0, coverageTransferred: 0, preservedWithLinks: 0, cascadesPerformed: 0 };
    }
    console.log(`  Sync safeguard OK: scrape ${scrapedGames.length} vs DB ${dbCount}`);
    
    // Build set of scraped game_ids for fast lookup
    const scrapedGameIds = new Set(scrapedGames.map(g => g.game_id));
    
    // Fetch all NHIAA games from database for this sport/season.
    // Include ALL transferable content fields, not just coverage assignments.
    // Also include manual_override so we can skip locked orphans (mirrors basketball behavior).
    const dbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&sport=eq.${SPORT}&season=eq.${SEASON}&or=(is_playoff.is.null,is_playoff.eq.false)&select=game_id,date,home_team,away_team,gender,photog1,photog2,videog,writer,notes,photos_url,recap_url,highlights_url,live_stream_url,game_description,special_event,manual_override`,
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
      return { orphansRemoved: 0, coverageTransferred: 0, preservedWithLinks: 0, cascadesPerformed: 0 };
    }
    
    const dbGames = await dbResponse.json();
    
    // Find orphaned games (in DB but not in scrape).
    // Exclude games with manual_override — never auto-delete an admin-locked row
    // (e.g. doubleheaders inserted manually because NHIAA exposes no distinct times).
    const allOrphanedGames = dbGames.filter(g => !scrapedGameIds.has(g.game_id));
    const lockedOrphans = allOrphanedGames.filter(g => g.manual_override);
    const orphanedGames = allOrphanedGames.filter(g => !g.manual_override);

    if (lockedOrphans.length > 0) {
      for (const g of lockedOrphans) {
        console.log(`  🔒 Preserving locked orphan: ${g.away_team} @ ${g.home_team} on ${g.date} (manual_override=true)`);
      }
    }
    
    if (orphanedGames.length === 0) {
      console.log('  No orphaned games found - DB in sync with NHIAA');
      return { orphansRemoved: 0, coverageTransferred: 0, preservedWithLinks: 0, cascadesPerformed: 0 };
    }
    
    console.log(`  Found ${orphanedGames.length} orphaned games not in NHIAA scrape`);

    // Pre-fetch which orphan game_ids have linked articles.
    // These get special treatment: cascade on reschedule, or preserve if no reschedule.
    const orphanIds = orphanedGames.map(g => g.game_id);
    const linkedIds = await getLinkedGameIds(orphanIds);
    if (linkedIds.size > 0) {
      console.log(`  ${linkedIds.size} orphan(s) have linked articles — extra care will be taken`);
    }
    
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
    let cascadesPerformed = 0;
    let preservedWithLinks = 0;
    const idsToDelete = [];

    // Process orphaned games
    for (const orphan of orphanedGames) {
      const isLinked = linkedIds.has(orphan.game_id);
      
      // Look for matching rescheduled game (same teams + gender, different date, within 14 days)
      const teams = [teamSlug(orphan.home_team), teamSlug(orphan.away_team)].sort();
      const matchupKey = `${teams[0]}_${teams[1]}_${orphan.gender}`;
      const matchingGames = scrapedByMatchup.get(matchupKey) || [];
      const orphanDate = new Date(orphan.date + 'T12:00:00');
      const rescheduleCandidates = matchingGames
        .filter(g => g.date !== orphan.date)
        .map(g => ({
          game: g,
          distanceDays: Math.abs((new Date(g.date + 'T12:00:00') - orphanDate) / 86400000)
        }))
        .filter(c => c.distanceDays <= 14)
        .sort((a, b) => a.distanceDays - b.distanceDays);
      const rescheduledGame = rescheduleCandidates[0]?.game;
      
      if (rescheduledGame) {
        console.log(`  📅 Rescheduled: ${orphan.away_team} @ ${orphan.home_team} moved from ${orphan.date} to ${rescheduledGame.date}`);

        // 1. Cascade article references if any exist
        if (isLinked) {
          const cr = await cascadeGameIdReferences(orphan.game_id, rescheduledGame.game_id);
          if (!cr.success) {
            console.error(`  ❌ Cascade failed for ${orphan.game_id} → ${rescheduledGame.game_id}; PRESERVING orphan to keep linked content alive`);
            preservedWithLinks++;
            continue; // skip transfer + delete
          }
          cascadesPerformed++;
        }

        // 2. Transfer full content fields (assignments + content URLs + notes)
        const transferBody = {};
        if (orphan.photog1) transferBody.photog1 = orphan.photog1;
        if (orphan.photog2) transferBody.photog2 = orphan.photog2;
        if (orphan.videog) transferBody.videog = orphan.videog;
        if (orphan.writer) transferBody.writer = orphan.writer;
        if (orphan.notes) transferBody.notes = orphan.notes;
        if (orphan.photos_url) transferBody.photos_url = orphan.photos_url;
        if (orphan.recap_url) transferBody.recap_url = orphan.recap_url;
        if (orphan.highlights_url) transferBody.highlights_url = orphan.highlights_url;
        if (orphan.live_stream_url) transferBody.live_stream_url = orphan.live_stream_url;
        if (orphan.game_description) transferBody.game_description = orphan.game_description;
        if (orphan.special_event) transferBody.special_event = orphan.special_event;
        
        if (Object.keys(transferBody).length > 0) {
          transferBody.schedule_changed = true;
          transferBody.original_date = orphan.date;
          
          console.log(`     Transferring fields: ${Object.keys(transferBody).join(', ')}`);
          
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
              body: JSON.stringify(transferBody)
            }
          );
          
          if (transferResponse.ok) {
            coverageTransferred++;
          } else {
            console.error(`  Failed to transfer content for ${orphan.game_id}: ${await transferResponse.text()}`);
          }
        }

        // 3. Mark old game for deletion (now safe: references cascaded, content transferred)
        idsToDelete.push(orphan.game_id);

      } else {
        // No rescheduled match
        if (isLinked) {
          // Has linked content but NHIAA has no replacement — preserve, do not delete.
          preservedWithLinks++;
          console.log(`  🔒 Preserving orphan with linked content (no NHIAA match): ${orphan.away_team} @ ${orphan.home_team} on ${orphan.date} [${orphan.game_id}]`);
        } else {
          // No content, no match — safe to remove
          console.log(`  🗑️ Removing: ${orphan.away_team} @ ${orphan.home_team} on ${orphan.date}`);
          idsToDelete.push(orphan.game_id);
        }
      }
    }
    
    // Delete only orphans marked for deletion (preserved ones stay)
    if (idsToDelete.length === 0) {
      console.log(`  ✅ Nothing to delete. Preserved ${preservedWithLinks} orphan(s) with linked content.`);
      return { orphansRemoved: 0, coverageTransferred, preservedWithLinks, cascadesPerformed };
    }

    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=in.(${idsToDelete.map(id => `"${id}"`).join(',')})`,
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
      return { orphansRemoved: 0, coverageTransferred, preservedWithLinks, cascadesPerformed };
    }
    
    console.log(`  ✅ Removed ${idsToDelete.length} orphan(s), transferred ${coverageTransferred} content payload(s), cascaded ${cascadesPerformed} link(s), preserved ${preservedWithLinks} orphan(s) with linked content`);
    return { orphansRemoved: idsToDelete.length, coverageTransferred, preservedWithLinks, cascadesPerformed };
    
  } catch (error) {
    console.error('Error syncing with NHIAA:', error.message);
    return { orphansRemoved: 0, coverageTransferred: 0, preservedWithLinks: 0, cascadesPerformed: 0 };
  }
}

export default async (request) => {
  console.log('Ball603 Baseball Schedule Scraper - Starting...');
  
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
    
    // Step 3b: Filter out postponed/rescheduled games
    // These will become orphans and get deleted in sync phase
    const postponedGames = dedupedGames.filter(g => g.isPostponed);
    const activeGames = dedupedGames.filter(g => !g.isPostponed);
    if (postponedGames.length > 0) {
      console.log(`Filtered out ${postponedGames.length} postponed/rescheduled games:`);
      postponedGames.forEach(g => console.log(`  - ${g.away_team} @ ${g.home_team} on ${g.date}`));
    }
    
    // Step 4: Sync with NHIAA - remove orphans, transfer coverage for rescheduled games,
    // cascade article references, and preserve orphans with linked content.
    console.log('Step 4: Syncing database with NHIAA...');
    const { orphansRemoved, coverageTransferred, preservedWithLinks, cascadesPerformed } = await syncWithNHIAA(activeGames);
    
    // Step 5: Upsert to database
    console.log('Step 5: Upserting to Supabase...');
    const { rowCount, changesDetected } = await updateSupabase(activeGames);
    
    return new Response(JSON.stringify({
      success: true,
      gamesScraped: activeGames.length,
      postponedGames: postponedGames.length,
      gamesUpserted: rowCount,
      duplicatesRemoved: duplicatesRemoved,
      gameIdsMigrated: gameIdsMigrated || 0,
      orphansRemoved: orphansRemoved,
      coverageTransferred: coverageTransferred || 0,
      cascadesPerformed: cascadesPerformed || 0,
      preservedWithLinks: preservedWithLinks || 0,
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
  // Every 4 hours during baseball season (February-June)
  schedule: "0 */4 * 2,3,4,5,6 *"
};
