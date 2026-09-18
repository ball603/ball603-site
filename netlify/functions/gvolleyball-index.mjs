// Ball603 girls volleyball standings, computed from our own games table.
//
// WHY: NHIAA's standings lag the scores. A result can sit in the schedule feed
// (or be entered by hand on Ball603) for a day or more before NHIAA counts it.
// The rating is fully defined by the NHIAA Index Plan, so we compute it
// ourselves the moment a score exists instead of waiting.
//
// THE FORMULA — NHIAA By-Law Article IV (Classification), Sect. 7, "NH Index
// Plan": a win earns points according to the WINNER's division and the
// OPPONENT's division; a loss earns nothing. Rating = total points ÷ games
// played. There is no opponents'-record component, so a team's rating never
// moves because of games it did not play. Verified against NHIAA's published
// standings for every D-I and D-III team on Sept. 18, 2026.
//
// NHIAA's own numbers are still read (by scrape-gvolleyball-standings.mjs) and
// kept in the nhiaa_* columns. Each run compares the two and writes a short
// explanation to `standings_note` for any team that differs. That note is shown
// only in the CMS Standings Check panel — never on a public page.
//
// No default export: this is a shared module, not a function endpoint (same as
// scrape-gvolleyball-core.mjs).

const SPORT  = 'gvolleyball';
const SEASON = '2026';

// Points for a win: INDEX_POINTS[winner's division][loser's division].
export const INDEX_POINTS = {
  'D-I':   { 'D-I': 4, 'D-II': 4, 'D-III': 3 },
  'D-II':  { 'D-I': 5, 'D-II': 4, 'D-III': 4 },
  'D-III': { 'D-I': 5, 'D-II': 5, 'D-III': 4 }
};

const shortDate = (d) => {
  const [, m, day] = String(d || '').split('-');
  return m && day ? `${Number(m)}/${Number(day)}` : String(d || '');
};

/* Compute W-L, points and rating for every team in `teams` from `games`.
   teams: [{ school, division }]
   games: [{ date, home_team, away_team, home_score, away_score, is_playoff }]
   Returns { bySchool: Map(school → row), skipped: [descriptions] }.
   A game only counts when both teams are listed (NHIAA's standings are the
   authority on who is in the league) and both scores are in. */
export function computeStandings(teams, games) {
  const division = new Map(teams.map(t => [t.school, t.division]));
  const bySchool = new Map(teams.map(t => [t.school, {
    school: t.school, division: t.division,
    wins: 0, losses: 0, ties: 0, points: 0, games_played: 0, rating: 0, win_pct: 0,
    games: []
  }]));
  const skipped = [];

  const sorted = [...games].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const g of sorted) {
    if (g.is_playoff) continue;
    if (g.home_score == null || g.away_score == null) continue;
    const hs = Number(g.home_score), as = Number(g.away_score);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;

    const home = bySchool.get(g.home_team), away = bySchool.get(g.away_team);
    if (!home || !away) {
      skipped.push(`${shortDate(g.date)} ${g.away_team} @ ${g.home_team} — ` +
        `${!home ? g.home_team : g.away_team} is not in the NHIAA volleyball standings`);
      continue;
    }

    for (const [me, opp, mine, theirs] of [[home, away, hs, as], [away, home, as, hs]]) {
      me.games_played++;
      let result;
      if (mine > theirs) {
        me.wins++; result = 'W';
        me.points += INDEX_POINTS[division.get(me.school)]?.[division.get(opp.school)] ?? 0;
      } else if (mine < theirs) {
        me.losses++; result = 'L';
      } else {
        // Volleyball cannot tie; counted rather than dropped so a bad score
        // shows up in the Standings Check instead of vanishing.
        me.ties++; result = 'T';
      }
      me.games.push({ date: g.date, opponent: opp.school, result, score: `${mine}-${theirs}` });
    }
  }

  for (const r of bySchool.values()) {
    r.rating = r.games_played ? Number((r.points / r.games_played).toFixed(5)) : 0;
    const decided = r.wins + r.losses + r.ties;
    r.win_pct = decided ? Number(((r.wins + r.ties * 0.5) / decided).toFixed(3)) : 0;
  }
  return { bySchool, skipped };
}

/* Compare one team's computed row with NHIAA's published numbers.
   Returns null when they agree, otherwise a one-line note for the CMS.
   `nhiaa` = { wins, losses, points, games_played } or nulls when NHIAA has not
   been read yet (a brand-new team) — no note then, there is nothing to compare. */
export function compareWithNhiaa(ours, nhiaa, aheadSchools = null) {
  if (!nhiaa || nhiaa.games_played == null) return null;
  const n = { w: nhiaa.wins ?? 0, l: nhiaa.losses ?? 0, p: nhiaa.points ?? 0, gp: nhiaa.games_played ?? 0 };
  if (ours.wins === n.w && ours.losses === n.l && ours.points === n.p && ours.games_played === n.gp) return null;

  const theirs = `NHIAA ${n.w}-${n.l}, ${n.p} pts`;
  const mine = `Ball603 ${ours.wins}-${ours.losses}, ${ours.points} pts`;

  if (ours.games_played > n.gp) {
    const extra = ours.games_played - n.gp;
    // An uncounted game leaves BOTH teams ahead of NHIAA, so prefer games whose
    // opponent is also ahead; otherwise fall back to the most recent ones.
    const both = aheadSchools ? ours.games.filter(g => aheadSchools.has(g.opponent)) : [];
    const pool = both.length >= extra ? both : ours.games;
    const recent = pool.slice(-extra)
      .map(g => `${shortDate(g.date)} ${g.result} vs ${g.opponent}`).join('; ');
    return `NHIAA hasn't counted ${extra} game${extra > 1 ? 's' : ''} yet (likely ${recent}). ${theirs} · ${mine}`;
  }
  if (ours.games_played < n.gp) {
    const missing = n.gp - ours.games_played;
    return `NHIAA counts ${missing} game${missing > 1 ? 's' : ''} Ball603 has no score for — check the schedule. ${theirs} · ${mine}`;
  }
  return `Same ${n.gp} games, different numbers — check the scores, or NHIAA may have an error. ${theirs} · ${mine}`;
}

async function sb(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

/* Recompute every volleyball standings row from the games table and write it.
   Needs no network access beyond Supabase, so it is cheap enough to run after
   every score save and every schedule scrape. Divisions and NHIAA's numbers are
   whatever the standings scraper last stored. */
export async function recomputeVolleyballStandings() {
  const stRes = await sb(
    `standings?sport=eq.${SPORT}&season=eq.${SEASON}` +
    `&select=school,division,nhiaa_wins,nhiaa_losses,nhiaa_points,nhiaa_games_played`,
    { headers: { Range: '0-9999' } });
  if (!stRes.ok) throw new Error(`standings read failed: ${stRes.status} ${await stRes.text()}`);
  const teams = await stRes.json();

  const gRes = await sb(
    `games?sport=eq.${SPORT}&season=eq.${SEASON}&level=eq.NHIAA` +
    `&home_score=not.is.null&away_score=not.is.null` +
    `&select=date,home_team,away_team,home_score,away_score,is_playoff`,
    { headers: { Range: '0-9999' } });
  if (!gRes.ok) throw new Error(`games read failed: ${gRes.status} ${await gRes.text()}`);
  const games = await gRes.json();

  const { bySchool, skipped } = computeStandings(teams, games);
  skipped.forEach(s => console.log(`  ⚠️  Not counted: ${s}`));

  const now = new Date().toISOString();
  let updated = 0, flagged = 0;
  const failures = [];
  // Teams with more games than NHIAA shows — used to pin down which game it is.
  const ahead = new Set(teams.filter(t => t.nhiaa_games_played != null &&
    bySchool.get(t.school).games_played > t.nhiaa_games_played).map(t => t.school));

  for (const t of teams) {
    const r = bySchool.get(t.school);
    const note = compareWithNhiaa(r, {
      wins: t.nhiaa_wins, losses: t.nhiaa_losses, points: t.nhiaa_points, games_played: t.nhiaa_games_played
    }, ahead);
    if (note) { flagged++; console.log(`  ≠ ${t.school}: ${note}`); }

    const res = await sb(
      `standings?school=eq.${encodeURIComponent(t.school)}&sport=eq.${SPORT}&season=eq.${SEASON}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          wins: r.wins, losses: r.losses, ties: r.ties,
          points: r.points, rating: r.rating,
          games_played: r.games_played, win_pct: r.win_pct,
          standings_note: note, updated_at: now
        })
      });
    if (res.ok) updated++;
    else failures.push(`${t.school}: ${res.status} ${await res.text()}`);
  }
  failures.forEach(f => console.log(`  ❌ ${f}`));
  console.log(`  Volleyball standings computed from ${games.length} scored games: ` +
    `${updated} teams written, ${flagged} differ from NHIAA`);
  return { teams: teams.length, gamesCounted: games.length, updated, flagged, skipped, failures };
}
