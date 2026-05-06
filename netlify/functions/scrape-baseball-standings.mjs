// Ball603 NHIAA Baseball Standings Scraper
// Runs every 4 hours starting April 1 via Netlify scheduled functions

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Sport and season for this scraper (baseball-specific)
const SPORT = 'baseball';
const SEASON = '2026';

// Normalize team names to match games table (mirrors scrape-baseball-schedules.mjs)
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

const STANDINGS_URLS = [
  { url: 'https://www.nhiaa.org/sports/standings/boys-baseball/division-1', gender: 'Boys', division: 'D-I' },
  { url: 'https://www.nhiaa.org/sports/standings/boys-baseball/division-2', gender: 'Boys', division: 'D-II' },
  { url: 'https://www.nhiaa.org/sports/standings/boys-baseball/division-3', gender: 'Boys', division: 'D-III' },
  { url: 'https://www.nhiaa.org/sports/standings/boys-baseball/division-4', gender: 'Boys', division: 'D-IV' },
];

function parseStandingsPage(html, gender, division) {
  const standings = [];
  
  // Find the standings table - look for rows with School | W | L | T | Points | Rating
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    
    // Skip header rows (contain <th>)
    if (rowContent.includes('<th')) continue;
    
    const cells = [];
    // More robust cell extraction - captures content including nested tags
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      // Strip all HTML tags from the cell content and trim whitespace
      const cellContent = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      cells.push(cellContent);
    }
    
    // We expect: School, W, L, T, Points, Rating
    if (cells.length >= 6) {
      const school = cells[0];
      const wins = parseInt(cells[1]) || 0;
      const losses = parseInt(cells[2]) || 0;
      const ties = parseInt(cells[3]) || 0;
      const points = parseFloat(cells[4]) || 0;
      const rating = parseFloat(cells[5]) || 0;
      
      if (school && school.length > 0) {
        standings.push({
          school: normalizeTeamName(school),
          gender,
          division,
          wins,
          losses,
          ties,
          points,
          rating,
          games_played: wins + losses + ties,
          win_pct: (wins + losses + ties) > 0 ? (wins / (wins + losses + ties)).toFixed(3) : '0.000'
        });
      }
    }
  }
  
  return standings;
}

function calculatePlayoffPicture(standings) {
  // Baseball playoff spots per division (70% rule)
  // D-I: 22 teams → 15 playoff spots
  // D-II: 19 teams → 13 playoff spots
  // D-III: 22 teams → 15 playoff spots
  // D-IV: 22 teams → 15 playoff spots
  
  const PLAYOFF_SPOTS = {
    'D-I': 15,
    'D-II': 13,
    'D-III': 15,
    'D-IV': 15
  };
  
  // Group by division (baseball is boys-only)
  const groups = {};
  standings.forEach(team => {
    const key = team.division;
    if (!groups[key]) groups[key] = [];
    groups[key].push(team);
  });
  
  // For each division, sort by rating and determine qualification
  Object.keys(groups).forEach(division => {
    const teams = groups[division];
    const tournamentSpots = PLAYOFF_SPOTS[division] || Math.floor(teams.length * 0.7);
    
    teams.sort((a, b) => b.rating - a.rating);
    
    teams.forEach((team, index) => {
      team.seed = index + 1;
      team.qualifies = index < tournamentSpots;
      team.tournament_spots = tournamentSpots;
    });
  });
  
  return standings;
}

async function updateSupabase(standings) {
  const now = new Date().toISOString();
  let updatedCount = 0;
  let insertedCount = 0;
  let failedInserts = [];
  
  // Log first 5 teams to verify parsing
  console.log('  Sample of parsed teams:');
  standings.slice(0, 5).forEach(t => {
    console.log(`    ${t.school} (${t.gender} ${t.division}): ${t.wins}-${t.losses}-${t.ties}, Rating: ${t.rating}`);
  });
  
  // First, get existing teams to know which are new vs existing
  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/standings?select=school,gender,division&sport=eq.${SPORT}&season=eq.${SEASON}`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  const existingTeams = new Set();
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    for (const team of existing) {
      existingTeams.add(`${team.school}_${team.gender}_${team.division}`);
    }
  }
  
  // Process each team
  for (const s of standings) {
    const teamKey = `${s.school}_${s.gender}_${s.division}`;
    
    if (existingTeams.has(teamKey)) {
      // Existing team: Only update rating/points/seed/qualifies (NOT W-L)
      // IMPORTANT: Must include sport and season in WHERE clause to avoid updating basketball records!
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/standings?school=eq.${encodeURIComponent(s.school)}&gender=eq.${encodeURIComponent(s.gender)}&division=eq.${encodeURIComponent(s.division)}&sport=eq.${SPORT}&season=eq.${SEASON}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            points: s.points,
            rating: s.rating,
            seed: s.seed || null,
            qualifies: s.qualifies || false,
            tournament_spots: s.tournament_spots || null,
            scraped_at: now
          })
        }
      );
      
      if (response.ok) {
        updatedCount++;
      } else {
        const errorText = await response.text();
        failedInserts.push(`UPDATE ${s.school}: ${response.status} - ${errorText}`);
      }
    } else {
      // New team: Insert full record with W-L from NHIAA (will be recalculated by update-standings)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/standings`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            school: s.school,
            gender: s.gender,
            division: s.division,
            sport: SPORT,
            season: SEASON,
            wins: s.wins,
            losses: s.losses,
            ties: s.ties,
            points: s.points,
            rating: s.rating,
            games_played: s.games_played,
            win_pct: s.win_pct,
            seed: s.seed || null,
            qualifies: s.qualifies || false,
            tournament_spots: s.tournament_spots || null,
            scraped_at: now,
            updated_at: now
          })
        }
      );
      
      if (response.ok) {
        insertedCount++;
      } else {
        const errorText = await response.text();
        failedInserts.push(`INSERT ${s.school}: ${response.status} - ${errorText}`);
      }
    }
  }
  
  if (failedInserts.length > 0) {
    console.log(`  ⚠️ Failed inserts/updates (${failedInserts.length} total):`);
    failedInserts.slice(0, 10).forEach(msg => console.log(`    ${msg}`));
    if (failedInserts.length > 10) {
      console.log(`    ... and ${failedInserts.length - 10} more failures`);
    }
  }
  
  console.log(`  Updated ${updatedCount} existing teams (ratings only), inserted ${insertedCount} new teams`);
  return updatedCount + insertedCount;
}

// Calculate W-L-T records from games table and update standings
async function updateRecordsFromGames() {
  console.log('Calculating W-L records from games table...');
  
  // Team names are now normalized at parse time, no mapping needed
  
  // Step 1: Get all existing standings to find each team's actual division
  const standingsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/standings?select=school,gender,division&sport=eq.${SPORT}&season=eq.${SEASON}`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  // Build lookup: "TeamName_Gender" -> actual division
  const teamDivisionMap = new Map();
  if (standingsResponse.ok) {
    const standings = await standingsResponse.json();
    for (const s of standings) {
      teamDivisionMap.set(`${s.school}_${s.gender}`, s.division);
    }
    console.log(`  Loaded ${teamDivisionMap.size} team divisions from standings`);
  }
  
  // Fetch all completed NHIAA games for this sport/season
  const gamesResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&sport=eq.${SPORT}&season=eq.${SEASON}&select=home_team,away_team,home_score,away_score,gender,division&or=(home_score.not.is.null,away_score.not.is.null)`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  if (!gamesResponse.ok) {
    console.error('Failed to fetch games for W-L calculation');
    return 0;
  }
  
  const games = await gamesResponse.json();
  console.log(`  Found ${games.length} completed games`);
  
  // Calculate records for each team
  const teamRecords = new Map();
  
  for (const game of games) {
    if (game.home_score === null || game.away_score === null) continue;
    
    // Team names now match between games and standings (both normalized)
    const homeTeam = game.home_team;
    const awayTeam = game.away_team;
    const homeScore = parseInt(game.home_score);
    const awayScore = parseInt(game.away_score);
    const gender = game.gender;
    
    // Look up each team's ACTUAL division from standings (handles cross-division games)
    const homeDivision = teamDivisionMap.get(`${homeTeam}_${gender}`) || game.division;
    const awayDivision = teamDivisionMap.get(`${awayTeam}_${gender}`) || game.division;
    
    const homeKey = `${homeTeam}_${gender}_${homeDivision}`;
    const awayKey = `${awayTeam}_${gender}_${awayDivision}`;
    
    if (!teamRecords.has(homeKey)) {
      teamRecords.set(homeKey, { school: homeTeam, gender, division: homeDivision, wins: 0, losses: 0, ties: 0 });
    }
    if (!teamRecords.has(awayKey)) {
      teamRecords.set(awayKey, { school: awayTeam, gender, division: awayDivision, wins: 0, losses: 0, ties: 0 });
    }
    
    const homeRecord = teamRecords.get(homeKey);
    const awayRecord = teamRecords.get(awayKey);
    
    if (homeScore > awayScore) {
      homeRecord.wins++;
      awayRecord.losses++;
    } else if (awayScore > homeScore) {
      awayRecord.wins++;
      homeRecord.losses++;
    } else {
      homeRecord.ties++;
      awayRecord.ties++;
    }
  }
  
  console.log(`  Calculated records for ${teamRecords.size} teams`);
  
  // Update standings with calculated records
  const now = new Date().toISOString();
  let updatedCount = 0;
  let failedUpdates = [];
  
  for (const [key, record] of teamRecords) {
    const gamesPlayed = record.wins + record.losses + record.ties;
    const winPct = gamesPlayed > 0 ? (record.wins / gamesPlayed).toFixed(3) : '0.000';
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/standings?school=eq.${encodeURIComponent(record.school)}&gender=eq.${encodeURIComponent(record.gender)}&division=eq.${encodeURIComponent(record.division)}&sport=eq.${SPORT}&season=eq.${SEASON}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
          games_played: gamesPlayed,
          win_pct: winPct,
          updated_at: now
        })
      }
    );
    
    if (response.ok) {
      const result = await response.json();
      if (result.length > 0) {
        updatedCount++;
      } else {
        failedUpdates.push(`${record.school} (${record.gender} ${record.division}) - no standings entry`);
      }
    } else {
      failedUpdates.push(`${record.school} (${record.gender} ${record.division}) - API error`);
    }
  }
  
  if (failedUpdates.length > 0) {
    console.log(`  ⚠️ Failed to update ${failedUpdates.length} teams:`);
    failedUpdates.slice(0, 10).forEach(t => console.log(`    - ${t}`));
    if (failedUpdates.length > 10) console.log(`    ... and ${failedUpdates.length - 10} more`);
  }
  
  console.log(`  Updated ${updatedCount} team W-L records`);
  return updatedCount;
}

// Delete standings rows for this sport/season whose school name isn't in the
// freshly-scraped set. Scoped per (gender, division) so a failed scrape of one
// division doesn't wipe out data from another. Only runs for divisions that
// successfully returned at least one row in this scrape.
async function cleanupStaleStandings(freshStandings) {
  console.log('Step 1.5: Cleaning up stale standings rows...');
  
  // Group fresh schools by gender+division
  const freshByDivision = new Map();
  for (const s of freshStandings) {
    const key = `${s.gender}|${s.division}`;
    if (!freshByDivision.has(key)) freshByDivision.set(key, new Set());
    freshByDivision.get(key).add(s.school);
  }
  
  // Fetch existing rows for this sport/season
  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/standings?select=school,gender,division&sport=eq.${SPORT}&season=eq.${SEASON}`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-9999'
      }
    }
  );
  
  if (!existingResponse.ok) {
    console.error('  Failed to fetch existing standings for cleanup');
    return 0;
  }
  
  const existing = await existingResponse.json();
  let deleted = 0;
  
  for (const row of existing) {
    const key = `${row.gender}|${row.division}`;
    const freshSet = freshByDivision.get(key);
    
    // Safety net: only delete from divisions that the scrape returned data for.
    // If a division failed to scrape, leave its old data alone.
    if (!freshSet) continue;
    if (freshSet.has(row.school)) continue;
    
    const deleteUrl = `${SUPABASE_URL}/rest/v1/standings` +
      `?school=eq.${encodeURIComponent(row.school)}` +
      `&gender=eq.${encodeURIComponent(row.gender)}` +
      `&division=eq.${encodeURIComponent(row.division)}` +
      `&sport=eq.${SPORT}` +
      `&season=eq.${SEASON}`;
    
    const delResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (delResponse.ok) {
      deleted++;
      console.log(`  Deleted stale row: ${row.school} (${row.gender} ${row.division})`);
    } else {
      console.error(`  Failed to delete stale row ${row.school}: ${delResponse.status}`);
    }
  }
  
  console.log(`  Removed ${deleted} stale standings rows`);
  return deleted;
}

export default async (request) => {
  console.log('Ball603 Baseball Standings Scraper - Starting...');
  
  try {
    let allStandings = [];
    
    for (const { url, gender, division } of STANDINGS_URLS) {
      console.log(`Fetching ${gender} ${division} baseball standings...`);
      const response = await fetch(url);
      const html = await response.text();
      const standings = parseStandingsPage(html, gender, division);
      allStandings.push(...standings);
      console.log(`  Found ${standings.length} teams`);
    }
    
    allStandings = calculatePlayoffPicture(allStandings);
    console.log(`Total teams: ${allStandings.length}`);
    
    const rowCount = await updateSupabase(allStandings);
    
    // Remove any stale rows (e.g. from prior name-normalization fixes) so the
    // standings table only contains teams from this run's scrape.
    const staleDeleted = await cleanupStaleStandings(allStandings);
    
    // Now update W-L records from our games table
    console.log('Step 2: Updating W-L records from baseball games...');
    const recordsUpdated = await updateRecordsFromGames();
    
    return new Response(JSON.stringify({
      success: true,
      teamsScraped: allStandings.length,
      recordsUpdated: recordsUpdated,
      staleRowsDeleted: staleDeleted,
      timestamp: new Date().toISOString()
    }), { status: 200 });
    
  } catch (error) {
    console.error('Baseball scraper error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// Cron schedule: Every 4 hours starting April 1 through June
// 0 */4 1-30 4,5,6 * = At minute 0 past every 4th hour on every day-of-month from 1 through 30 in April, May, and June
export const config = {
  schedule: "0 */4 1-30 4,5,6 *"
};
