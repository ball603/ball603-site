// Ball603 NHIAA Girls Volleyball Standings Scraper
//
// SOURCE: the Arbiter Sports rankings widget API — the same backend that powers
// nhiaa.org/sports/fall/girls-volleyball/volleyball-girls-standings/.
//
// Do NOT scrape nhiaa.org HTML for this. Two traps there:
//   1. The pretty /sports/fall/... standings page is client-side rendered and
//      returns an empty shell to a server-side fetch.
//   2. The legacy /sports/standings/girls-volleyball/division-N pages ARE
//      server-rendered but are STALE — in Sept 2026 they were still serving the
//      completed 2025 season (Pinkerton 17-1) with last year's division
//      alignment. Scraping them produced 5 bogus "division mismatches".
// The widget API below is live and matches the NHIAA-issued division breakdown
// exactly (20 / 22 / 21 = 63 teams).
//
// WHAT THIS OWNS: W-L-T, games played, points and rating — imported directly
// from NHIAA. This deliberately differs from scrape-baseball-standings.mjs,
// which imports rating only and leaves W-L to update-standings.mjs. Volleyball
// has no scheduled update-standings run, so taking the record straight from the
// source is what keeps the standings page correct. Hitting "Recalculate
// Standings" in the CMS still works and will simply agree with NHIAA.
//
// RATING: NHIAA publishes no rating for volleyball, only points (4 per win).
// We store points in BOTH points and rating so the standings page — which sorts
// on rating — orders each division the way NHIAA does.

import { normalizeTeamName } from './scrape-gvolleyball-core.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SPORT  = 'gvolleyball';
const SEASON = '2026';
const GENDER = 'Girls';

// First day of the regular season. Used only by the stale-data guard below.
// Keep in sync with REGULAR_SEASON_START_DATE in scrape-gvolleyball-core.mjs.
const REGULAR_SEASON_START_DATE = '2026-09-02';

// Arbiter rankings widget that NHIAA embeds on its standings page.
const RANKINGS_WIDGET_ID = 'd59ccb58-2ab4-4dc2-931c-6970e261f94d';
const RANKINGS_BASE = `https://widgetapi.arbitersports.com/api/v2/widget/rankings/${RANKINGS_WIDGET_ID}`;

// Same sport/gender ids the schedule scraper uses. The rankings widget hosts
// every NHIAA fall sport, so we select the group by these rather than trusting
// a hardcoded id that could be renumbered.
const ARBITER_SPORT_ID  = 63;  // Volleyball
const ARBITER_GENDER_ID = 2;   // Girls
const ARBITER_LEVEL_ID  = 31;  // Varsity
const FALLBACK_GROUP_ID = 6;   // "Volleyball Standings" as of Sept 2026

// Arbiter division label → Ball603 division code.
const DIVISION_MAP = {
  'Division I':   'D-I',
  'Division II':  'D-II',
  'Division III': 'D-III',
  'Division 1':   'D-I',
  'Division 2':   'D-II',
  'Division 3':   'D-III'
};

function mapDivision(name) {
  if (!name) return null;
  const cleaned = String(name).replace(/\s+/g, ' ').trim();
  if (DIVISION_MAP[cleaned]) return DIVISION_MAP[cleaned];
  // Tolerate label drift ("Girls Volleyball Division II", "Div. II").
  const roman = cleaned.match(/\b(I{1,3})\b\s*$/);
  if (roman) return `D-${roman[1]}`;
  const arabic = cleaned.match(/\b([123])\b\s*$/);
  if (arabic) return `D-${'I'.repeat(Number(arabic[1]))}`;
  return null;
}

function toInt(value) {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

async function arbiterFetch(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Ball603Bot/1.0; +https://ball603.com)'
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

// The volleyball standings group id, resolved by sport/gender rather than
// hardcoded. Falls back to the known id if the groups list is unavailable.
export async function resolveGroupId() {
  try {
    const payload = await arbiterFetch(`${RANKINGS_BASE}/groups`);
    const groups = Array.isArray(payload?.data) ? payload.data
                 : Array.isArray(payload?.data?.groups) ? payload.data.groups
                 : Array.isArray(payload) ? payload : [];
    const match = groups.find(g =>
      Number(g.sportId) === ARBITER_SPORT_ID &&
      Number(g.genderId) === ARBITER_GENDER_ID &&
      (g.levelId === undefined || Number(g.levelId) === ARBITER_LEVEL_ID)
    );
    if (match?.rankingsGroupId != null) {
      console.log(`  Resolved rankings group ${match.rankingsGroupId} ("${match.name}")`);
      return match.rankingsGroupId;
    }
    console.log(`  ⚠️  No volleyball group in the groups list — falling back to ${FALLBACK_GROUP_ID}`);
  } catch (error) {
    console.log(`  ⚠️  Could not read groups list (${error.message}) — falling back to ${FALLBACK_GROUP_ID}`);
  }
  return FALLBACK_GROUP_ID;
}

// Turn the widget payload into standings rows.
// Every numeric field arrives as a string inside `values`; ties live only in the
// third component of `record` ("2-0-0"), never in a column of their own.
export function parseStandings(payload) {
  const divisions = payload?.data?.divisions;
  if (!Array.isArray(divisions)) {
    throw new Error('Unexpected payload shape — data.divisions is not an array');
  }

  const rows = [];
  const perDivision = {};
  const unmappedDivisions = [];

  for (const div of divisions) {
    const division = mapDivision(div?.name);
    if (!division) {
      unmappedDivisions.push(div?.name ?? '(unnamed)');
      continue;
    }

    const teams = Array.isArray(div?.teams) ? div.teams : [];
    perDivision[division] = { teams: teams.length };

    for (const team of teams) {
      const raw = team?.teamName || team?.schoolName || team?.values?.team;
      const school = normalizeTeamName(raw);
      if (!school) continue;

      const v = team?.values || {};
      const recordParts = String(v.record ?? '').split('-');
      const wins   = v.w != null ? toInt(v.w) : toInt(recordParts[0]);
      const losses = v.l != null ? toInt(v.l) : toInt(recordParts[1]);
      const ties   = toInt(recordParts[2]);
      const points = toInt(v.pts);
      const gamesPlayed = v.gp != null ? toInt(v.gp) : (wins + losses + ties);
      const decided = wins + losses + ties;

      rows.push({
        raw,
        school,
        gender: GENDER,
        division,
        wins,
        losses,
        ties,
        points,
        rating: points,          // NHIAA publishes no separate rating for volleyball
        games_played: gamesPlayed,
        win_pct: decided > 0 ? Number(((wins + ties * 0.5) / decided).toFixed(3)) : 0
      });
    }
  }

  if (unmappedDivisions.length > 0) {
    console.log(`  ⚠️  Unrecognized division label(s), skipped: ${unmappedDivisions.join(', ')}`);
  }

  return { rows, perDivision };
}

// A team plays at most one match per day, so a division reporting more games
// than days elapsed since the season opener means the source is serving a
// previous season. Refuse to import it rather than overwrite this year's
// standings with last year's. Self-clearing once the source is correct.
export function isStaleDivision(rows, division, today = new Date()) {
  if (rows.length === 0) return false;
  const start = new Date(REGULAR_SEASON_START_DATE + 'T00:00:00Z');
  const daysElapsed = Math.max(0, Math.floor((today - start) / 86400000));
  const maxGames = Math.max(...rows.map(r => r.games_played));
  if (maxGames > daysElapsed) {
    console.log(`  ⚠️  ${division}: SKIPPED as stale — a team shows ${maxGames} games played but only ${daysElapsed} day(s) have elapsed since ${REGULAR_SEASON_START_DATE}.`);
    return true;
  }
  return false;
}

async function supabaseFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

// `scraped` are the rows to write. `allScrapedSchools` is every school NHIAA
// listed, including any in a division skipped as stale — orphan detection has to
// use that wider set or a skipped division would look like 20 vanished teams.
async function updateStandings(scraped, allScrapedSchools) {
  const now = new Date().toISOString();

  // Existing rows for this sport/season, keyed by school, so we can tell an
  // update from an insert and notice a team that changed divisions.
  const existingResponse = await supabaseFetch(
    `standings?select=school,division&sport=eq.${SPORT}&season=eq.${SEASON}`,
    { headers: { 'Range': '0-9999' } }
  );
  const existingBySchool = new Map();
  if (existingResponse.ok) {
    for (const row of await existingResponse.json()) {
      existingBySchool.set(row.school, row.division);
    }
  }

  let updated = 0, inserted = 0;
  const divisionChanges = [];
  const failures = [];

  for (const s of scraped) {
    const currentDivision = existingBySchool.get(s.school);
    const record = {
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      points: s.points,
      rating: s.rating,
      games_played: s.games_played,
      win_pct: s.win_pct,
      division: s.division,
      gender: s.gender,
      scraped_at: now,
      updated_at: now
    };

    if (currentDivision === undefined) {
      // Team we don't have a row for. Insert it — NHIAA is the authority on who
      // is in the league, and skipping would leave the team invisible all season.
      const response = await supabaseFetch('standings', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ school: s.school, sport: SPORT, season: SEASON, ...record })
      });
      if (response.ok) {
        inserted++;
        console.log(`  + Inserted ${s.school} (${s.division}) — was not in the standings table`);
      } else {
        failures.push(`INSERT ${s.school}: ${response.status} ${await response.text()}`);
      }
      continue;
    }

    if (currentDivision !== s.division) {
      divisionChanges.push(`${s.school}: ${currentDivision} → ${s.division}`);
    }

    // Match on school only, not on division — otherwise a team that moved
    // divisions would never be found and would silently keep stale numbers.
    const response = await supabaseFetch(
      `standings?school=eq.${encodeURIComponent(s.school)}` +
      `&sport=eq.${SPORT}&season=eq.${SEASON}`,
      {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(record)
      }
    );
    if (response.ok) {
      updated++;
    } else {
      failures.push(`PATCH ${s.school}: ${response.status} ${await response.text()}`);
    }
  }

  // Teams sitting in our table that NHIAA no longer lists. Reported, never
  // deleted — a one-off source hiccup must not wipe the standings page.
  const seen = allScrapedSchools || new Set(scraped.map(s => s.school));
  const orphans = [...existingBySchool.keys()].filter(school => !seen.has(school));

  if (divisionChanges.length > 0) {
    console.log(`  ℹ️  ${divisionChanges.length} division change(s) applied:`);
    divisionChanges.forEach(m => console.log(`       ${m}`));
  }
  if (orphans.length > 0) {
    console.log(`  ⚠️  ${orphans.length} team(s) in our standings but not on NHIAA (left untouched): ${orphans.join(', ')}`);
  }
  if (failures.length > 0) {
    console.log(`  ❌ ${failures.length} write failure(s):`);
    failures.forEach(f => console.log(`       ${f}`));
  }

  return { updated, inserted, divisionChanges, orphans, failures };
}

// All the work lives here so run-gvolleyball-standings.mjs can trigger the same
// scrape on demand without duplicating logic (mirrors the schedules/core split).
export async function runStandingsScrape() {
  console.log('Ball603 Girls Volleyball Standings Scraper - Starting...');

  try {
    const groupId = await resolveGroupId();
    const url = `${RANKINGS_BASE}/${groupId}`;
    console.log(`Fetching standings: ${url}`);

    const payload = await arbiterFetch(url);
    const { rows, perDivision } = parseStandings(payload);
    console.log(`  Parsed ${rows.length} teams across ${Object.keys(perDivision).length} division(s)`);

    if (rows.length === 0) {
      // Treat an empty payload as a source failure, not as "every team vanished".
      return new Response(JSON.stringify({
        success: false,
        error: 'No teams parsed — the rankings payload was empty or its shape changed.',
        timestamp: new Date().toISOString()
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Stale check runs per division so one bad division can't block the others.
    const keep = [];
    for (const [division, info] of Object.entries(perDivision)) {
      const divisionRows = rows.filter(r => r.division === division);
      if (isStaleDivision(divisionRows, division)) {
        info.skipped = 'stale';
        continue;
      }
      keep.push(...divisionRows);
    }

    console.log(`Writing ${keep.length} teams...`);
    const allScrapedSchools = new Set(rows.map(r => r.school));
    const result = keep.length > 0
      ? await updateStandings(keep, allScrapedSchools)
      : { updated: 0, inserted: 0, divisionChanges: [], orphans: [], failures: [] };

    console.log(`  Updated ${result.updated}, inserted ${result.inserted}`);

    return new Response(JSON.stringify({
      success: result.failures.length === 0,
      groupId,
      divisions: perDivision,
      teamsScraped: rows.length,
      teamsWritten: keep.length,
      updated: result.updated,
      inserted: result.inserted,
      divisionChanges: result.divisionChanges,
      orphans: result.orphans,
      failures: result.failures,
      timestamp: new Date().toISOString()
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Standings scraper error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export default async (request) => runStandingsScrape();

export const config = {
  // Every 4 hours during volleyball season (August–November), matching the
  // cadence of scrape-baseball-standings.mjs.
  schedule: "0 */4 * 8,9,10,11 *"
};
