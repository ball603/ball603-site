// Sync the Farmington Tigers' ArbiterSports schedule into Supabase.
//
// Scheduled from netlify.toml. Also runnable by hand:
//   /.netlify/functions/sync-farmington?key=YOUR_SYNC_KEY
// A manual run accepts &dry=1 to report what it would write without writing.
//
// The Arbiter widget only exposes the current season — an out-of-season team
// returns zero events — so this is also what makes past seasons persist.

import { runStandingsSync } from './sync-farmington-standings.mjs';
import { runVideoSync } from './sync-farmington-videos.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Farmington's two widget ids, read off the school's own schedule page.
const ROSTER_ID   = '53058ade-1725-4c3d-9bb1-081eaff86b86';
const SCHEDULE_ID = '7ce82436-e6e5-45b0-84cf-34ae27ee693f';
const ARBITER = 'https://widgetapi.arbitersports.com/api/v2/widget';

// ── Fetching ────────────────────────────────────────────────────────────────

async function arbiter(path) {
  const res = await fetch(`${ARBITER}/${path}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error(`Arbiter ${res.status} on ${path}`);
  const json = await res.json();
  return json.data || [];
}

const fetchTeams    = () => arbiter(`roster/${ROSTER_ID}/teams`);
const fetchSchedule = (uTeam) => arbiter(`schedule/${SCHEDULE_ID}/team/${uTeam}?eventtype=all`);

// ── Opponent names ──────────────────────────────────────────────────────────
// Arbiter spells schools the way the state directory does ("Wilton-Lyndeborough
// Coop High"); Ball603 uses shortnames ("Wilton-Lyndeborough"). This turns one
// into the other so a Tigers game can link straight to Ball603 coverage.

const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Co-ops and shortenings that no amount of suffix-stripping would reach.
const ALIASES = {
  mascomavalley:      'Mascoma',
  newportmtnroyal:    'Newport',
  farmingtonnute:     'Farmington',
  henrywilsonmemorial:'Farmington',
  hwms:               'Farmington',
  contoocookvalley:   'ConVal',
  coebrownnorthwood:  'Coe-Brown'
};

const TAIL_WORDS = new Set(['school', 'schools', 'high', 'middle', 'middle/high',
  'middle-high', 'hs/ms', 'hs', 'ms', 'regional', 'reg', 'coop', 'co-op',
  'academy', 'and', 'the', 'senior']);

function normalizeOpponent(raw, ball603Names) {
  if (!raw) return { display: null, ball603: null };

  // Arbiter tacks a qualifier onto the end of some entries:
  //   "Epping Middle and High Schools - Boys Varsity", "Inter-lakes ... - Blue"
  let display = String(raw).replace(/\s+/g, ' ').trim().split(' - ')[0].trim();

  // One school shouts ("MOULTONBOROUGH ACADEMY"). Fix it for display too, not
  // just for matching — the 25 opponents with no Ball603 page show this string.
  if (display === display.toUpperCase() && /[A-Z]{4}/.test(display)) {
    display = display.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  }

  const work0 = display.replace(/[\s-]+NH$/i, '').trim();   // "Farmington High School-NH"
  let work = work0;

  // A middle school is not the high school program. Pointing "Rochester Middle
  // School" at Spaulding's varsity page would be wrong, so these stay unlinked
  // and simply show under their own name. This deliberately does not catch
  // "Nute Middle/High School" or "Epping Middle and High Schools", which are the
  // high school programs under a combined-building name.
  if (/middle school|elementary|junior high|central school/i.test(work)) {
    return { display, ball603: null };
  }

  // "Manchester High School Central" and "Nashua High School North" put the
  // school-type words in the middle, so stripping only the tail leaves them
  // unmatched. The lookahead is what keeps "Epping Middle and High Schools"
  // intact — the infix is only removed when a name follows it.
  work = work.replace(/\s+High School\s+(?=\S)/i, ' ');

  let parts = work.split(' ');
  while (parts.length > 1 && TAIL_WORDS.has(parts[parts.length - 1].toLowerCase().replace(/[.,]$/, ''))) parts.pop();
  while (parts.length > 1 && TAIL_WORDS.has(parts[0].toLowerCase())) parts.shift();
  const core = parts.join(' ').trim();

  const aliased = ALIASES[nameKey(core)];
  if (aliased) return { display, ball603: aliased };

  const hit = ball603Names.find(n => nameKey(n) === nameKey(core));
  return { display, ball603: hit || null };
}

// Some middle school events arrive with only Farmington in `teams`, and the
// opponent named nowhere but the title: "HWMS JV Volleyball @ Strafford".
function opponentFromTitle(title) {
  if (!title) return null;
  const parts = String(title).split(/\s+(?:vs\.?|@|at)\s+/i);
  if (parts.length < 2) return null;
  const ours = /hwms|henry wilson|farmington|tigers/i;
  const them = parts.find(p => !ours.test(p));
  return them ? them.trim() : null;
}

// ── Supabase ────────────────────────────────────────────────────────────────

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Range': '0-4999',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const upsert = (table, rows, onConflict) => supabase(
  `${table}?on_conflict=${onConflict}`,
  { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) }
);

// A game the AD deletes, or reschedules into a brand new uniqueGameId, would
// otherwise sit on the site as a ghost forever, since an upsert never removes
// anything. Pruning is deliberately narrow:
//
//   * only for a team that returned events this run (an out-of-season team
//     returns none, and its saved season must survive untouched — that
//     persistence is the whole reason these tables exist),
//   * only inside the date window Arbiter just described for that team, so
//     next season's feed can never delete this season's games,
//   * and never a row somebody typed a score into by hand.
async function pruneRemoved(uteam, rows) {
  if (!rows.length) return 0;
  const dates = rows.map(r => r.game_date).filter(Boolean).sort();
  if (!dates.length) return 0;
  const ids = rows.map(r => r.unique_game_id).join(',');
  const query = [
    `uteam=eq.${uteam}`,
    `game_date=gte.${dates[0]}`,
    `game_date=lte.${dates[dates.length - 1]}`,
    `unique_game_id=not.in.(${ids})`,
    `manual_my_score=is.null`
  ].join('&');
  const gone = await supabase(`farmington_games?${query}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=representation' }
  });
  return (gone || []).length;
}

// ── Row building ────────────────────────────────────────────────────────────

function buildGameRow(event, team, ball603Names) {
  const roster = event.teams || [];
  const mine = roster.find(t => t.uniqueTeamId === team.uTeam);

  // `myTeam` is false on BOTH sides of a co-op event (Farmington-Nute football,
  // for one), so identifying our side by uniqueTeamId is the only reliable way.
  const others = roster.filter(t => t.uniqueTeamId !== team.uTeam);
  const isMeet = roster.length > 2;

  let opponentRaw = null, entityId = null, source = 'none';
  if (isMeet) {
    source = 'meet';
  } else if (others.length === 1) {
    opponentRaw = others[0].teamName;
    entityId = others[0].entityId || null;
    source = 'teams';
  } else {
    const fromTitle = opponentFromTitle(event.gameTitle);
    if (fromTitle) { opponentRaw = fromTitle; source = 'title'; }
  }

  const { display, ball603 } = normalizeOpponent(opponentRaw, ball603Names);

  const myScore  = mine ? mine.score : null;
  const oppScore = (!isMeet && others.length === 1) ? others[0].score : null;

  return {
    unique_game_id: event.uniqueGameId,
    uteam: team.uTeam,
    team_description: team.teamDescription || team.name || null,
    sport_id: event.eventSubcategoryId ?? team.sport ?? null,
    gender_id: event.teamGenderId ?? team.gender ?? null,
    level_id: event.hslevelId ?? team.level ?? null,

    starts_at: event.fromDate || null,
    ends_at: event.toDate || null,
    game_date: event.fromDate ? String(event.fromDate).slice(0, 10) : null,
    game_status: event.gameStatus || null,
    game_title: event.gameTitle || null,
    tournament_name: event.tournamentName || null,

    site_name: event.siteName || null,
    sub_site_name: event.subSiteName || null,
    unique_site_id: event.uniqueSiteId || null,
    is_home: mine ? !!mine.isHome : null,

    opponent_name: display,
    opponent_entity_id: entityId || null,
    opponent_ball603: ball603,
    opponent_source: source,

    team_count: roster.length,
    is_meet: isMeet,

    arbiter_my_score: Number.isFinite(myScore) ? myScore : null,
    arbiter_opp_score: Number.isFinite(oppScore) ? oppScore : null,
    arbiter_result: (mine && mine.gameWLTStatus) || null,

    // manual_my_score / manual_opp_score / manual_updated_at are deliberately
    // absent. They belong to whoever types a score into the Tigers score page,
    // and a sync that wrote them would undo that work every few hours.

    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ── The job ─────────────────────────────────────────────────────────────────
// Exported so run-farmington-sync.mjs can fire it by hand. Netlify treats a
// function carrying a schedule as scheduled-only and answers 403 to any HTTP
// request for it, so the manual door has to be a separate, unscheduled function
// — the same split publish-scheduled-articles / run-publish-scheduled uses.

export async function runFarmingtonSync({ dryRun = false } = {}) {
  if (!SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, body: { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' } };
  }

  const started = Date.now();

  try {
    // Ball603's own shortnames, so opponent matching follows the site rather
    // than a list frozen into this file.
    const ball603Names = [...new Set(
      (await supabase('teams?select=shortname') || []).map(t => t.shortname).filter(Boolean)
    )];

    const teams = await fetchTeams();
    const active = teams.filter(t => t.isActive);
    console.log(`Farmington: ${teams.length} teams, ${active.length} active`);

    const teamRows = teams.map(t => ({
      uteam: t.uTeam,
      description: t.teamDescription || t.name || String(t.uTeam),
      sport_id: t.sport ?? null,
      gender_id: t.gender ?? null,
      level_id: t.level ?? null,
      is_active: !!t.isActive,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const gameRows = [];
    const unmatched = new Map();
    const failedTeams = [];
    const byTeam = new Map();

    // Nineteen sequential round trips would flirt with the function timeout, so
    // fetch five at a time. One team's feed failing shouldn't cost us the rest.
    for (let i = 0; i < active.length; i += 5) {
      const batch = active.slice(i, i + 5);
      const results = await Promise.all(batch.map(async (team) => {
        try {
          return { team, events: await fetchSchedule(team.uTeam) };
        } catch (err) {
          console.error(`Schedule fetch failed for ${team.teamDescription} (${team.uTeam}):`, err.message);
          failedTeams.push(team.teamDescription || String(team.uTeam));
          return { team, events: [] };
        }
      }));
      for (const { team, events } of results) {
        const teamRowsOut = [];
        for (const ev of events) {
          const row = buildGameRow(ev, team, ball603Names);
          gameRows.push(row);
          teamRowsOut.push(row);
          if (!row.is_meet && row.opponent_name && !row.opponent_ball603) {
            unmatched.set(row.opponent_name, (unmatched.get(row.opponent_name) || 0) + 1);
          }
        }
        byTeam.set(team.uTeam, teamRowsOut);
      }
    }

    const report = {
      success: true,
      dryRun,
      teams: teamRows.length,
      activeTeams: active.length,
      games: gameRows.length,
      meets: gameRows.filter(g => g.is_meet).length,
      opponentFromTitle: gameRows.filter(g => g.opponent_source === 'title').length,
      opponentUnknown: gameRows.filter(g => g.opponent_source === 'none').length,
      linkedToBall603: gameRows.filter(g => g.opponent_ball603).length,
      // Anything here is a school the page will show plain, with no Ball603
      // link and no logo. Worth a look after each sync.
      unlinkedOpponents: [...unmatched.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} (${c})`),
      failedTeams,
      removed: 0,
      elapsedMs: 0
    };

    // Every feed failing means Arbiter is down, not that Farmington cancelled
    // its season. Write nothing rather than record an empty schedule.
    if (!gameRows.length) {
      report.success = false;
      report.error = 'No events returned for any active team — nothing written';
      console.error('Farmington sync:', JSON.stringify(report));
      return { statusCode: 502, body: report };
    }

    if (!dryRun) {
      await upsert('farmington_teams', teamRows, 'uteam');
      for (let i = 0; i < gameRows.length; i += 100) {
        await upsert('farmington_games', gameRows.slice(i, i + 100), 'unique_game_id,uteam');
      }
      for (const [uteam, rows] of byTeam) {
        report.removed += await pruneRemoved(uteam, rows);
      }
    }

    // Standings and videos ride along on the same schedule. A failure in either
    // must not cost us the games we just wrote, so each is reported rather than
    // thrown.
    try {
      const st = await runStandingsSync({ dryRun });
      report.standings = st.body;
    } catch (err) {
      console.error('Standings sync failed inside the games sync:', err);
      report.standings = { success: false, error: err.message };
    }

    try {
      const vid = await runVideoSync({ dryRun });
      report.videos = vid.body;
    } catch (err) {
      console.error('Video sync failed inside the games sync:', err);
      report.videos = { success: false, error: err.message };
    }

    report.elapsedMs = Date.now() - started;
    console.log('Farmington sync:', JSON.stringify(report));
    return { statusCode: 200, body: report };

  } catch (error) {
    console.error('Farmington sync failed:', error);
    return { statusCode: 500, body: { error: 'Sync failed', details: error.message } };
  }
}

// ── Scheduled entry point ───────────────────────────────────────────────────
// Fired by the schedule in netlify.toml. Nothing else can reach this.

export const handler = async () => {
  const { statusCode, body } = await runFarmingtonSync({ dryRun: false });
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
};
