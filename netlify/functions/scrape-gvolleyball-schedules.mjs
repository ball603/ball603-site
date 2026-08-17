// Ball603 NHIAA Girls Volleyball Schedule Scraper
// Hits Arbiter Sports widget API (widgetapi.arbitersports.com) since the new
// NHIAA site is client-side rendered — old HTML scraping approach won't work.
//
// Preserves manual overrides, playoff games, and coverage assignments.
// Runs via Netlify scheduled functions during volleyball season (Aug-Nov).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Sport and season for this scraper (girls volleyball is a fall sport, single-year format like baseball)
const SPORT = 'gvolleyball';
const SEASON = '2026';

// Arbiter Sports widget API — the new source of truth for NHIAA schedule data
const NHIAA_WIDGET_ID = '92f2f187-ae71-4509-b5ba-fe68f442b0b9';
const ARBITER_SPORT_ID = 63;   // volleyball
const ARBITER_GENDER_ID = 2;   // girls
const ARBITER_URL = `https://widgetapi.arbitersports.com/api/v2/widget/schedule/${NHIAA_WIDGET_ID}/sport/${ARBITER_SPORT_ID}?gender=${ARBITER_GENDER_ID}`;

// Classification code → Ball603 division
// Verified from Aug 2026 API response
const CLASSIFICATION_TO_DIVISION = {
  8912: 'D-I',
  8913: 'D-II',
  8914: 'D-III'
};

// gameTypeId allowlist — ONLY regular-season game types are imported.
// From Aug 2026 sample data:
//   gameTypeId 3, 4 → observed on jamborees, alumni games, preseason (SKIP)
//   gameTypeId 1, 2 → EXPECTED for regular season (allow)
// If real regular-season games start getting filtered out, check the logs
// for "Skipped: N by gameTypeId" and expand this set as needed.
const REGULAR_SEASON_GAME_TYPE_IDS = new Set([1, 2]);

// Team entityId → Ball603 canonical short name
// Populated from Aug 2026 API sample plus historical volleyball teams.
// UNMAPPED teams fall back to normalizeTeamName(teamName) and log a warning
// so you can add the missing entityId to this map.
const TEAM_ID_MAP = {
  // D-I
  4912:   'Concord',
  8651:   'Goffstown',
  10240:  'Hollis-Brookline',
  11610:  'Keene',
  18140:  'Pinkerton',
  // D-II
  1523:   'Belmont',            // Note: API returns "Belmont High School - NH"
  3101:   'Campbell',
  8503:   'Gilford',
  12075:  'Laconia',
  14509:  'Merrimack Valley',
  115607: 'Sanborn',
  // D-III
  10899:  'Inter-Lakes',        // API returns "Inter-lakes Middle High School"
  14051:  'Mascenic',
  14052:  'Mascoma'             // API returns "Mascoma Valley Regional High School"
};

// Normalize team names when entityId lookup misses.
// Reuses conventions from baseball scraper, with volleyball-specific additions
// for team-name variants seen in the Arbiter API (e.g. "Hollis Brookline" no hyphen).
function normalizeTeamName(name) {
  if (!name) return name;
  const normalizations = {
    'Alvirne High School': 'Alvirne',
    'Bedford High School': 'Bedford',
    'Belmont High School': 'Belmont',
    'Belmont High School - NH': 'Belmont',
    'Bishop Brady High School': 'Bishop Brady',
    'Bishop Guertin High School': 'Bishop Guertin',
    'Bow High School': 'Bow',
    'Campbell High School': 'Campbell',
    'Coe-Brown Northwood': 'Coe-Brown',
    'Coe-Brown Northwood Academy': 'Coe-Brown',
    'ConVal Regional High School': 'ConVal',
    'Concord Christian Academy': 'Concord Christian',
    'Concord High School': 'Concord',
    'Dover High School': 'Dover',
    'Epping Middle High School': 'Epping',
    'Exeter High School': 'Exeter',
    'Fall Mountain Regional High School': 'Fall Mountain',
    'Farmington High School': 'Farmington',
    'Gilford High School': 'Gilford',
    'Goffstown High School': 'Goffstown',
    'Hanover High School': 'Hanover',
    'Hillsboro-Deering High School': 'Hillsboro-Deering',
    'Hollis-Brookline High School': 'Hollis-Brookline',
    'Hollis Brookline High School': 'Hollis-Brookline',  // API variant (no hyphen)
    'Inter-Lakes Middle High School': 'Inter-Lakes',
    'Inter-lakes Middle High School': 'Inter-Lakes',     // API variant (lowercase 'l')
    'John Stark Regional High School': 'John Stark',
    'Keene High School': 'Keene',
    'Kingswood Regional High School': 'Kingswood',
    'Laconia High School': 'Laconia',
    'Londonderry High School': 'Londonderry',
    'Manchester Central High School': 'Manchester Central',
    'Manchester Memorial High School': 'Manchester Memorial',
    'Manchester West High School': 'Manchester West',
    'Mascenic Regional High School': 'Mascenic',
    'Mascoma Valley': 'Mascoma',
    'Mascoma Valley Regional High School': 'Mascoma',
    'Merrimack High School': 'Merrimack',
    'Merrimack Valley High School': 'Merrimack Valley',
    'Milford High School': 'Milford',
    'Monadnock Regional High School': 'Monadnock',
    'Moultonborough Academy': 'Moultonborough',
    'Nashua High School North': 'Nashua North',
    'Nashua High School South': 'Nashua South',
    'Newfound Regional High School': 'Newfound',
    'Nute High School': 'Nute',
    'Oyster River High School': 'Oyster River',
    'Pelham High School': 'Pelham',
    'Pembroke Academy': 'Pembroke',
    'Pinkerton Academy': 'Pinkerton',
    'Plymouth Regional High School': 'Plymouth',
    'Portsmouth Christian Academy': 'Portsmouth Christian',
    'Portsmouth High School': 'Portsmouth',
    'Prospect Mountain High School': 'Prospect Mountain',
    'Raymond High School': 'Raymond',
    'Saint Thomas Aquinas High School': 'St. Thomas Aquinas',
    'Salem High School': 'Salem',
    'Sanborn Regional High School': 'Sanborn',
    'Sanborn Regional High School ': 'Sanborn',  // API sometimes has trailing space
    'Somersworth High School': 'Somersworth',
    'Souhegan High School': 'Souhegan',
    'Spaulding High School': 'Spaulding',
    'Sunapee High School': 'Sunapee',
    'Timberlane Regional High School': 'Timberlane',
    'Trinity High School': 'Trinity',
    'Windham High School': 'Windham',
    'Winnacunnet High School': 'Winnacunnet',
    'Winnisquam Regional High School': 'Winnisquam',
  };
  const trimmed = name.trim();
  return normalizations[trimmed] || normalizations[name] || trimmed;
}

// Convert team name to a slug for use in game_id (matches baseball scraper convention)
function teamSlug(name) {
  if (!name) return '';
  const slugMap = {
    'Alvirne': 'alvirne',
    'Bedford': 'bedford',
    'Belmont': 'belmont',
    'Bishop Brady': 'bishopbrady',
    'Bishop Guertin': 'bishopguertin',
    'Bow': 'bow',
    'Campbell': 'campbell',
    'Coe-Brown': 'coebrown',
    'ConVal': 'conval',
    'Concord Christian': 'concordchristian',
    'Concord': 'concord',
    'Dover': 'dover',
    'Epping': 'epping',
    'Exeter': 'exeter',
    'Fall Mountain': 'fallmountain',
    'Farmington': 'farmington',
    'Gilford': 'gilford',
    'Goffstown': 'goffstown',
    'Hanover': 'hanover',
    'Hillsboro-Deering': 'hillsborodeering',
    'Hollis-Brookline': 'hollisbrookline',
    'Inter-Lakes': 'interlakes',
    'John Stark': 'johnstark',
    'Keene': 'keene',
    'Kingswood': 'kingswood',
    'Laconia': 'laconia',
    'Londonderry': 'londonderry',
    'Manchester Central': 'manchestercentral',
    'Manchester Memorial': 'manchestermemorial',
    'Manchester West': 'manchesterwest',
    'Mascenic': 'mascenic',
    'Mascoma': 'mascoma',
    'Merrimack': 'merrimack',
    'Merrimack Valley': 'merrimackvalley',
    'Milford': 'milford',
    'Monadnock': 'monadnock',
    'Moultonborough': 'moultonborough',
    'Nashua North': 'nashuanorth',
    'Nashua South': 'nashuasouth',
    'Newfound': 'newfound',
    'Nute': 'nute',
    'Oyster River': 'oysterriver',
    'Pelham': 'pelham',
    'Pembroke': 'pembroke',
    'Pinkerton': 'pinkerton',
    'Plymouth': 'plymouth',
    'Portsmouth Christian': 'portsmouthchristian',
    'Portsmouth': 'portsmouth',
    'Prospect Mountain': 'prospectmountain',
    'Raymond': 'raymond',
    'St. Thomas Aquinas': 'stthomasaquinas',
    'Salem': 'salem',
    'Sanborn': 'sanborn',
    'Somersworth': 'somersworth',
    'Souhegan': 'souhegan',
    'Spaulding': 'spaulding',
    'Sunapee': 'sunapee',
    'Timberlane': 'timberlane',
    'Trinity': 'trinity',
    'Windham': 'windham',
    'Winnacunnet': 'winnacunnet',
    'Winnisquam': 'winnisquam',
  };
  if (slugMap[name]) return slugMap[name];
  // Fallback: lowercase, alphanumeric only
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to convert score to integer or null
function toIntOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = parseInt(val);
  return isNaN(num) ? null : num;
}

// Resolve a team entry from the API into { name, division }
// Uses entityId → canonical name map when possible; falls back to normalizeTeamName.
function resolveTeam(teamEntry, unknownIds) {
  const entityId = teamEntry.entityId;
  const canonical = TEAM_ID_MAP[entityId];
  let name;
  if (canonical) {
    name = canonical;
  } else {
    name = normalizeTeamName(teamEntry.teamName);
    // Track unmapped entityIds so we can log at the end for easy map updates
    if (entityId) {
      unknownIds.set(entityId, { teamName: teamEntry.teamName, normalized: name });
    }
  }
  const division = CLASSIFICATION_TO_DIVISION[teamEntry.classification] || null;
  return { name, division };
}

// Fetch the full girls-volleyball schedule from Arbiter.
// Returns the raw `data` array (array of game objects).
async function fetchArbiterSchedule() {
  const response = await fetch(ARBITER_URL, {
    headers: {
      'Accept': '*/*',
      'Origin': 'https://www.nhiaa.org',
      'Referer': 'https://www.nhiaa.org/',
      'User-Agent': 'Ball603-Scraper/1.0 (+https://ball603.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Arbiter API returned ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(`Arbiter API returned success:false — message: ${payload.message}`);
  }
  if (!Array.isArray(payload.data)) {
    throw new Error('Arbiter API response missing data array');
  }
  return payload.data;
}

// Transform Arbiter API game objects into Ball603-shaped game records.
// Filters out jamborees, alumni games, sub-varsity, and multi-team events.
function parseGames(arbiterGames) {
  const games = [];
  const unknownIds = new Map();
  let skippedMultiTeam = 0;
  let skippedByTitle = 0;
  let skippedSubVarsity = 0;
  let skippedNoDivision = 0;
  let skippedFutureScores = 0;
  // Track which gameTypeIds get filtered out — helps quickly diagnose if
  // legitimate regular-season games are being dropped by an incomplete allowlist.
  const skippedGameTypeCounts = new Map();

  // Compute today in ET for future-date safeguard
  const now = new Date();
  const nowET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const todayDateStr = `${nowET.getFullYear()}-${String(nowET.getMonth() + 1).padStart(2, '0')}-${String(nowET.getDate()).padStart(2, '0')}`;

  for (const g of arbiterGames) {
    // Must have exactly 2 teams (skip jamborees, TBA-opponent games)
    if (!Array.isArray(g.teams) || g.teams.length !== 2) {
      skippedMultiTeam++;
      continue;
    }

    // Skip preseason / jamboree / alumni / scrimmage by title
    const title = (g.gameTitle || '').toLowerCase();
    if (title.includes('jamboree') || title.includes('alumni') || title.includes('scrimmage') || title.includes('pre-season') || title.includes('preseason')) {
      skippedByTitle++;
      continue;
    }

    // Varsity only
    if (g.hslevelId !== 1) {
      skippedSubVarsity++;
      continue;
    }

    // Regular-season only (allowlist). Blocks jamborees, alumni games, exhibitions,
    // and anything else with an unfamiliar gameTypeId.
    if (!REGULAR_SEASON_GAME_TYPE_IDS.has(g.gameTypeId)) {
      const key = g.gameTypeId ?? 'null';
      skippedGameTypeCounts.set(key, (skippedGameTypeCounts.get(key) || 0) + 1);
      continue;
    }

    // Resolve teams
    const homeEntry = g.teams.find(t => t.isHome);
    const awayEntry = g.teams.find(t => !t.isHome);
    if (!homeEntry || !awayEntry) {
      skippedMultiTeam++;
      continue;
    }
    const home = resolveTeam(homeEntry, unknownIds);
    const away = resolveTeam(awayEntry, unknownIds);

    // Division comes from home team's classification (fall back to away)
    const division = home.division || away.division;
    if (!division) {
      // Cross-division or unclassified — likely a non-league game we can't confidently place.
      // Log and skip to avoid contaminating standings.
      skippedNoDivision++;
      console.log(`  ⚠️  Skipping game with no division: ${away.name} @ ${home.name} on ${g.fromDate?.slice(0, 10)} (home cls=${homeEntry.classification}, away cls=${awayEntry.classification})`);
      continue;
    }

    // Date & time from fromDate (ISO)
    const fromDate = new Date(g.fromDate);
    const isoDate = g.fromDate.slice(0, 10); // "YYYY-MM-DD"
    const isFutureGame = isoDate > todayDateStr;

    // Time formatted 12-hour like "6:00 PM"
    const hours24 = fromDate.getHours();
    const minutes = fromDate.getMinutes();
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    // The Arbiter timestamps are already local-clock (no timezone suffix), so use as-is
    let time = `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;

    // Scores — null when scheduled
    let homeScore = toIntOrNull(homeEntry.score);
    let awayScore = toIntOrNull(awayEntry.score);

    // Future-date safeguard: never accept scores for future games (NHIAA data entry errors)
    if (isFutureGame && (homeScore !== null || awayScore !== null)) {
      console.log(`  ⚠️  Ignoring scores for future game: ${away.name} @ ${home.name} on ${isoDate}`);
      homeScore = null;
      awayScore = null;
      skippedFutureScores++;
    }

    // Status: FINAL if both scores present, else scheduled
    const isFinal = homeScore !== null && awayScore !== null;
    if (isFinal) time = 'FINAL';

    // Status flags from API
    const isCancelled = (g.gameStatus || '').toLowerCase() === 'cancelled';
    const isPostponed = (g.gameStatus || '').toLowerCase() === 'postponed';
    if (isCancelled || isPostponed) {
      console.log(`  ⏭️  ${isCancelled ? 'Cancelled' : 'Postponed'}: ${away.name} @ ${home.name} on ${isoDate}`);
    }

    // Build game_id (matches baseball convention: nhiaa_{team1}_g_{YYYYMMDD}_{team2} sorted)
    const slug1 = teamSlug(home.name);
    const slug2 = teamSlug(away.name);
    const sortedSlugs = [slug1, slug2].sort();
    const dateStr = isoDate.replace(/-/g, '');
    const gameId = `nhiaa_${sortedSlugs[0]}_g_${dateStr}_${sortedSlugs[1]}`;

    games.push({
      game_id: gameId,
      date: isoDate,
      time,
      home_team: home.name,
      away_team: away.name,
      home_score: homeScore,
      away_score: awayScore,
      gender: 'Girls',
      level: 'NHIAA',
      division,
      status: isFinal ? 'final' : 'scheduled',
      isPostponed: isPostponed || isCancelled,
      // Extras (not written to DB but useful for debugging & orphan handling)
      _arbiterUniqueGameId: g.uniqueGameId,
      _siteName: g.siteName,
      _subSiteName: g.subSiteName
    });
  }

  // Deduplicate: if the same game_id appears twice (shouldn't happen with single API call, but be safe)
  const byId = new Map();
  for (const game of games) {
    if (!byId.has(game.game_id)) {
      byId.set(game.game_id, game);
    } else {
      // Same game appeared twice — prefer the one with scores
      const existing = byId.get(game.game_id);
      if (existing.home_score === null && game.home_score !== null) {
        byId.set(game.game_id, game);
      }
    }
  }
  const dedupedGames = Array.from(byId.values());

  // Log filtering stats
  console.log(`  Parse stats: ${dedupedGames.length} varsity regular-season games kept`);
  console.log(`    Skipped: ${skippedMultiTeam} multi-team/incomplete, ${skippedByTitle} by title (jamboree/alumni/scrimmage), ${skippedSubVarsity} sub-varsity, ${skippedNoDivision} no division`);
  if (skippedGameTypeCounts.size > 0) {
    const breakdown = Array.from(skippedGameTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `gameTypeId=${id}: ${n}`)
      .join(', ');
    console.log(`    Skipped by gameTypeId allowlist: ${breakdown}`);
    console.log(`    (If regular-season games are missing, expand REGULAR_SEASON_GAME_TYPE_IDS)`);
  }
  if (skippedFutureScores > 0) console.log(`    ${skippedFutureScores} future games had scores stripped as safeguard`);

  // Log unmapped entityIds — these are the fastest way to expand the team map
  if (unknownIds.size > 0) {
    console.log(`  📋 Unmapped entityIds (add to TEAM_ID_MAP):`);
    for (const [id, info] of unknownIds) {
      console.log(`    ${id}: '${info.normalized}',  // was "${info.teamName}"`);
    }
  }

  return dedupedGames;
}

// Fetch all existing gvolleyball games (used to preserve manual overrides,
// playoff records, and coverage assignments during upsert).
async function getExistingGames() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?sport=eq.${SPORT}&season=eq.${SEASON}&level=eq.NHIAA&select=*`,
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
  const lookup = {};
  for (const game of games) {
    lookup[game.game_id] = game;
  }
  return lookup;
}

// Cascade article references from an old game_id to a new one before deleting the old row.
async function cascadeGameIdReferences(oldGameId, newGameId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?game_id=eq.${encodeURIComponent(oldGameId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ game_id: newGameId })
      }
    );
    if (!response.ok) {
      console.error(`Cascade failed for ${oldGameId} → ${newGameId}:`, await response.text());
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error(`Cascade error for ${oldGameId} → ${newGameId}:`, err.message);
    return { success: false };
  }
}

// Sync DB with the fresh scrape.
// For each game in DB but NOT in latest scrape (orphan):
//   - If teams+gender match another scraped game within 14 days → rescheduled: cascade content, delete orphan
//   - If orphan has linked content but no match → preserve
//   - Otherwise → delete
// Never touches manual_override or is_playoff games.
async function syncWithNHIAA(scrapedGames) {
  try {
    const existingGames = await getExistingGames();
    const existingIds = new Set(Object.keys(existingGames));
    const scrapedIds = new Set(scrapedGames.map(g => g.game_id));

    // Orphans = existing games not in latest scrape
    const orphans = Object.values(existingGames).filter(existing => {
      if (existing.manual_override) return false; // never touch locked games
      if (existing.is_playoff) return false;      // playoffs managed separately
      return !scrapedIds.has(existing.game_id);
    });

    if (orphans.length === 0) {
      console.log(`  No orphans to reconcile`);
      return { orphansRemoved: 0, coverageTransferred: 0, preservedWithLinks: 0, cascadesPerformed: 0 };
    }

    console.log(`  Found ${orphans.length} orphan(s) to reconcile`);

    // Build lookup of scraped games by matchup (sorted teams) for reschedule detection
    const scrapedByMatchup = new Map();
    for (const g of scrapedGames) {
      const key = [teamSlug(g.home_team), teamSlug(g.away_team)].sort().join('_');
      if (!scrapedByMatchup.has(key)) scrapedByMatchup.set(key, []);
      scrapedByMatchup.get(key).push(g);
    }

    const idsToDelete = [];
    let coverageTransferred = 0;
    let preservedWithLinks = 0;
    let cascadesPerformed = 0;

    for (const orphan of orphans) {
      const hasLinkedContent = !!(orphan.photog1 || orphan.photog2 || orphan.videog || orphan.writer ||
                                   orphan.notes || orphan.photos_url || orphan.recap_url ||
                                   orphan.highlights_url || orphan.live_stream_url ||
                                   orphan.game_description || orphan.special_event);

      const matchupKey = [teamSlug(orphan.home_team), teamSlug(orphan.away_team)].sort().join('_');
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

        // Cascade article references if any linked content exists
        if (hasLinkedContent) {
          const cr = await cascadeGameIdReferences(orphan.game_id, rescheduledGame.game_id);
          if (!cr.success) {
            console.error(`  ❌ Cascade failed for ${orphan.game_id} → ${rescheduledGame.game_id}; PRESERVING orphan`);
            preservedWithLinks++;
            continue;
          }
          cascadesPerformed++;
        }

        // Transfer content fields to the new game record
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

        idsToDelete.push(orphan.game_id);
      } else {
        // No rescheduled match
        if (hasLinkedContent) {
          preservedWithLinks++;
          console.log(`  🔒 Preserving orphan with linked content: ${orphan.away_team} @ ${orphan.home_team} on ${orphan.date}`);
        } else {
          console.log(`  🗑️  Removing: ${orphan.away_team} @ ${orphan.home_team} on ${orphan.date}`);
          idsToDelete.push(orphan.game_id);
        }
      }
    }

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

// Upsert scraped games, preserving assignments, manual overrides, and playoff records.
async function updateSupabase(games) {
  const existingGames = await getExistingGames();
  console.log(`  Found ${Object.keys(existingGames).length} existing gvolleyball games`);

  let changesDetected = 0;

  const upsertData = games.map(g => {
    const existing = existingGames[g.game_id] || {};

    // Skip manual overrides — do not overwrite
    if (existing.manual_override) {
      console.log(`  🔒 Skipping locked game: ${g.home_team} vs ${g.away_team} on ${g.date}`);
      return null;
    }

    // Skip playoff games — managed separately
    if (existing.is_playoff) {
      console.log(`  🏆 Skipping playoff game: ${g.home_team} vs ${g.away_team} on ${g.date}`);
      return null;
    }

    // Detect schedule change on games that have coverage assignments
    const hasAssignment = existing.photog1 || existing.photog2 || existing.videog || existing.writer;
    let originalDate = existing.original_date || null;
    let scheduleChanged = existing.schedule_changed || false;
    if (hasAssignment && existing.date && existing.date !== g.date) {
      originalDate = existing.original_date || existing.date;
      scheduleChanged = true;
      changesDetected++;
      console.log(`  ⚠️  Schedule change: ${g.home_team} vs ${g.away_team} moved from ${existing.date} to ${g.date}`);
    }
    if (hasAssignment && !originalDate) {
      originalDate = g.date;
    }

    // Preserve manually-entered scores if scraper doesn't have them
    const awayScore = toIntOrNull(g.away_score) ?? toIntOrNull(existing.away_score);
    const homeScore = toIntOrNull(g.home_score) ?? toIntOrNull(existing.home_score);

    // Time: mark FINAL if we have scores, else use scraped time or preserve existing
    let time = g.time || null;
    if (awayScore !== null && homeScore !== null) {
      time = 'FINAL';
    } else if (!time && existing.time) {
      time = existing.time;
    }

    return {
      game_id: g.game_id,
      date: g.date,
      time,
      away_team: g.away_team,
      home_team: g.home_team,
      away_score: awayScore,
      home_score: homeScore,
      gender: g.gender,
      level: g.level,
      division: g.division,
      sport: SPORT,
      season: SEASON,
      status: time === 'FINAL' ? 'final' : 'scheduled',
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
  }).filter(Boolean);

  if (changesDetected > 0) {
    console.log(`  ⚠️  Total schedule changes detected: ${changesDetected}`);
  }

  // Batch upsert
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
      console.error(`Batch ${i}-${i + batchSize} error:`, errorText);
    } else {
      totalUpserted += batch.length;
    }
  }

  return { rowCount: totalUpserted, changesDetected };
}

export default async (request) => {
  console.log('Ball603 Girls Volleyball Schedule Scraper - Starting...');

  try {
    // Step 1: Fetch from Arbiter API
    console.log('Step 1: Fetching schedule from Arbiter API...');
    const arbiterGames = await fetchArbiterSchedule();
    console.log(`  Received ${arbiterGames.length} game entries from Arbiter`);

    // Step 2: Parse & filter into Ball603 shape
    console.log('Step 2: Parsing & filtering...');
    const allGames = parseGames(arbiterGames);

    // Step 3: Separate postponed/cancelled from active
    const postponedGames = allGames.filter(g => g.isPostponed);
    const activeGames = allGames.filter(g => !g.isPostponed);
    if (postponedGames.length > 0) {
      console.log(`  ${postponedGames.length} postponed/cancelled games will be treated as orphans`);
    }

    // Step 4: Sync with existing DB records (orphan handling, content preservation)
    console.log('Step 4: Syncing database with fresh scrape...');
    const { orphansRemoved, coverageTransferred, preservedWithLinks, cascadesPerformed } = await syncWithNHIAA(activeGames);

    // Step 5: Upsert
    console.log('Step 5: Upserting to Supabase...');
    const { rowCount, changesDetected } = await updateSupabase(activeGames);

    return new Response(JSON.stringify({
      success: true,
      gamesScraped: activeGames.length,
      postponedGames: postponedGames.length,
      gamesUpserted: rowCount,
      orphansRemoved,
      coverageTransferred,
      cascadesPerformed,
      preservedWithLinks,
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
  // Every 4 hours during volleyball season (August–November)
  schedule: "0 */4 * 8,9,10,11 *"
};
