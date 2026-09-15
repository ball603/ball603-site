/**
 * Ball603 — coverage gap
 * ─────────────────────────────────────────────────────────────────────────────
 * Works out which schools we have NOT covered yet this season, so the
 * contributor portal can show a live list instead of one somebody has to retype.
 *
 * "Covered" means the same thing here as it does in conversation: the school
 * appears in a PUBLISHED story for this sport that has a SmugMug gallery. A
 * story with no gallery doesn't count, because the point of the list is to find
 * schools nobody has shot yet.
 *
 * A school is tied to a story through its linked game first (games.away_team /
 * games.home_team — note the _team suffix; the get-games API renames them to
 * away/home but the table does not), falling back to the game_data blob the
 * story creator saves for stories with no linked game.
 *
 * The roster of "all schools" is the standings table for that sport and season,
 * which is seeded from NHIAA and is the same 63 schools the standings page shows.
 *
 * Manual overrides let the CMS correct the result by hand when the data and
 * reality disagree:
 *   alsoUncovered — force these schools back onto the list
 *   markCovered   — drop these schools off it
 *
 * Usage:
 *   const gap = await Ball603Coverage.compute({ client: supabaseClient });
 *   gap.missing        -> ['Alvirne', 'Campbell', ...]
 *   gap.byDivision     -> [{ division: 'D-I', total: 20, covered: 13, missing: [...] }, ...]
 *   gap.covered / gap.total
 */
(function () {
  'use strict';

  const SPORT_LABELS = {
    basketball: 'Basketball',
    baseball: 'Baseball',
    gvolleyball: 'Girls Volleyball'
  };

  // Current sport/season, from the same endpoint the rest of the site uses.
  async function currentSportAndSeason() {
    try {
      const res = await fetch('/.netlify/functions/get-site-settings');
      const data = await res.json();
      const s = (data && data.settings) || {};
      if (s.current_sport) {
        return { sport: s.current_sport, season: s.current_season || null };
      }
    } catch (e) {
      /* fall through to the month guess below */
    }
    // Same in-season guess the RPI and team pages make.
    const month = new Date().getMonth() + 1;
    const sport = (month >= 12 || month <= 3) ? 'basketball'
      : (month >= 4 && month <= 7) ? 'baseball'
      : 'gvolleyball';
    return { sport, season: null };
  }

  const clean = v => String(v == null ? '' : v).trim();

  async function compute(options) {
    const opts = options || {};
    const client = opts.client;
    if (!client) throw new Error('Ball603Coverage.compute needs { client }');

    const overrides = opts.overrides || {};
    const alsoUncovered = (overrides.alsoUncovered || []).map(clean).filter(Boolean);
    const markCovered = (overrides.markCovered || []).map(clean).filter(Boolean);

    let sport = opts.sport;
    let season = opts.season;
    if (!sport || !season) {
      const current = await currentSportAndSeason();
      sport = sport || current.sport;
      season = season || current.season;
    }

    // Roster for the sport/season. If the season we were handed has no rows —
    // the week the site flips to basketball but the new standings aren't seeded
    // yet, say — fall back to the newest season that does, and flag it so the
    // caller can label the result instead of passing last year off as this year.
    let seasonFellBack = false;
    let standings = await fetchStandings(client, sport, season);
    if (!standings.length) {
      const newest = await newestSeason(client, sport);
      if (newest && newest !== season) {
        seasonFellBack = !!season;
        season = newest;
        standings = await fetchStandings(client, sport, season);
      }
    }

    const { data: games } = await client
      .from('games')
      .select('game_id,away_team,home_team,date,gender')
      .eq('sport', sport)
      .eq('season', season);

    const gameById = new Map();
    let seasonStart = null;
    for (const g of (games || [])) {
      gameById.set(String(g.game_id), g);
      if (g.date && (!seasonStart || g.date < seasonStart)) seasonStart = g.date;
    }

    // Only stories from this season. The articles table has no season column, so
    // the first game of the season is the cutoff — no hardcoded date to age out.
    let articleQuery = client
      .from('articles')
      .select('game_id,game_data,smugmug_gallery_url')
      .eq('status', 'published')
      .eq('sport', sport);
    if (seasonStart) articleQuery = articleQuery.gte('article_date', seasonStart);
    const { data: articles } = await articleQuery;

    // Basketball fields a boys team AND a girls team at every school, and those
    // are two different assignments — covering the Bedford girls says nothing
    // about the Bedford boys. So coverage is tracked per school AND gender.
    // Single-gender sports (volleyball, baseball) collapse back to one entry per
    // school on their own, because the roster only holds one gender.
    const genders = [...new Set(standings.map(r => clean(r.gender)).filter(Boolean))];
    const splitByGender = genders.length > 1;

    const key = (school, gender) => splitByGender ? `${school}|${gender}` : school;

    const storiesByKey = new Map();
    const storiesBySchoolAnyGender = new Set();
    for (const a of (articles || [])) {
      if (!clean(a.smugmug_gallery_url)) continue;
      const g = a.game_id != null ? gameById.get(String(a.game_id)) : null;
      const gd = a.game_data || {};
      const away = clean((g && g.away_team) || gd.awayTeam || gd.away);
      const home = clean((g && g.home_team) || gd.homeTeam || gd.home);
      const gender = clean((g && g.gender) || gd.gender);
      for (const school of [away, home]) {
        if (!school) continue;
        storiesBySchoolAnyGender.add(school);
        if (gender) storiesByKey.set(key(school, gender), (storiesByKey.get(key(school, gender)) || 0) + 1);
      }
    }

    const isCovered = (school, gender) => {
      // Overrides are typed as plain school names and apply to every team at
      // that school — simpler to use than making someone write "Bedford (Boys)".
      if (markCovered.includes(school)) return true;
      if (alsoUncovered.includes(school)) return false;
      if (storiesByKey.has(key(school, gender))) return true;
      // A story we can't pin to a gender (no linked game, nothing in game_data)
      // counts for the school as a whole. Better to leave a covered school off
      // the list than to keep sending people somewhere we've already been.
      if (!splitByGender) return storiesBySchoolAnyGender.has(school);
      const anyGenderedStory = genders.some(gn => storiesByKey.has(key(school, gn)));
      return storiesBySchoolAnyGender.has(school) && !anyGenderedStory;
    };

    // Group by division, and by gender too when the sport has both.
    const label = (school, gender) => splitByGender ? `${school} (${gender})` : school;
    const groups = new Map();
    for (const row of standings) {
      const school = clean(row.school);
      const gender = clean(row.gender);
      if (!school) continue;
      const groupName = splitByGender
        ? `${clean(row.division) || 'Other'} ${gender}`.trim()
        : (clean(row.division) || 'Other');
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName).push({ school, gender });
    }

    const byDivision = [];
    const missing = [];
    let rosterCount = 0;
    for (const groupName of [...groups.keys()].sort()) {
      const teams = groups.get(groupName).sort((a, b) => a.school.localeCompare(b.school));
      const gone = teams.filter(t => !isCovered(t.school, t.gender));
      rosterCount += teams.length;
      missing.push(...gone.map(t => label(t.school, t.gender)));
      byDivision.push({
        division: groupName,
        total: teams.length,
        covered: teams.length - gone.length,
        missing: gone.map(t => label(t.school, t.gender))
      });
    }

    // A hand-added school that isn't on the standings roster at all still belongs
    // on the list — that's the point of the override.
    const roster = new Set(standings.map(r => clean(r.school)));
    const extras = alsoUncovered.filter(s => !roster.has(s) && !markCovered.includes(s));
    if (extras.length) {
      missing.push(...extras);
      byDivision.push({ division: 'Added manually', total: extras.length, covered: 0, missing: extras.slice().sort() });
    }

    const total = rosterCount + extras.length;
    return {
      sport,
      season,
      sportLabel: SPORT_LABELS[sport] || sport,
      // "teams" when a school fields two (basketball), "schools" otherwise.
      unit: splitByGender ? 'teams' : 'schools',
      splitByGender,
      // True when the configured season had no standings rows and we fell back
      // to the newest season that did — the caller can say so rather than
      // quietly showing last year's roster as if it were this year's.
      seasonFellBack,
      total,
      covered: total - missing.length,
      missing: missing.slice().sort((a, b) => a.localeCompare(b)),
      byDivision,
      storiesByKey
    };
  }

  async function fetchStandings(client, sport, season) {
    if (!season) return [];
    const { data } = await client
      .from('standings')
      .select('school,division,gender')
      .eq('sport', sport)
      .eq('season', season);
    return data || [];
  }

  async function newestSeason(client, sport) {
    const { data } = await client
      .from('standings')
      .select('season')
      .eq('sport', sport);
    const seasons = [...new Set((data || []).map(r => r.season).filter(Boolean))].sort();
    return seasons.length ? seasons[seasons.length - 1] : null;
  }

  window.Ball603Coverage = { compute };
})();
