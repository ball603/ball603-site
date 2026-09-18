/* Girls volleyball standings computed from Ball603's own games with the NHIAA
   Index Plan (By-Law Art. IV Sect. 7), so a result counts the moment its score
   is in instead of when NHIAA gets to it. NHIAA's numbers are kept alongside,
   and differences are explained in a CMS-only Standings Check panel. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'svc-test';
const SITE = '/root/ball603/ball603-site-main';
const { INDEX_POINTS, computeStandings, compareWithNhiaa, recomputeVolleyballStandings } =
  await import(`${SITE}/netlify/functions/gvolleyball-index.mjs`);

let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };
const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };
const g = (date, home, away, hs, as, extra = {}) => ({ date, home_team: home, away_team: away, home_score: hs, away_score: as, ...extra });

console.log('\n1. The Index Plan point table');
{
  const teams = [{ school: 'Salem', division: 'D-I' }, { school: 'Hollis-Brookline', division: 'D-II' },
                 { school: 'Farmington', division: 'D-III' }, { school: 'Nute', division: 'D-III' }];
  const games = [
    g('2026-09-02', 'Farmington', 'Salem', 3, 1),            // D-III beats D-I → 5
    g('2026-09-03', 'Salem', 'Nute', 3, 0),                  // D-I beats D-III → 3
    g('2026-09-04', 'Hollis-Brookline', 'Salem', 3, 2),      // D-II beats D-I → 5
    g('2026-09-05', 'Farmington', 'Nute', 3, 0),             // D-III beats D-III → 4
    g('2026-09-06', 'Farmington', 'Hollis-Brookline', 0, 3), // D-II beats D-III → 4
  ];
  const { bySchool } = computeStandings(teams, games);
  const f = bySchool.get('Farmington'), s = bySchool.get('Salem'), h = bySchool.get('Hollis-Brookline'), n = bySchool.get('Nute');
  check('a D-III win over a D-I team is worth 5', INDEX_POINTS['D-III']['D-I'] === 5);
  check('Farmington 2-1 with 9 points (5 + 4, loss 0)', f.wins === 2 && f.losses === 1 && f.points === 9, `${f.wins}-${f.losses} ${f.points}`);
  check('rating = points ÷ games played = 3.00000', f.rating === 3, String(f.rating));
  check('Salem gets 3 for beating a D-III team', s.points === 3 && s.wins === 1 && s.losses === 2, `${s.wins}-${s.losses} ${s.points}`);
  check('Hollis-Brookline 9 points: 5 (D-I) + 4 (D-III)', h.points === 9, String(h.points));
  check('a winless team has 0 points and a 0 rating', n.points === 0 && n.rating === 0 && n.games_played === 2);
  check('rating keeps 5 decimals (Salem 3 ÷ 3 games)', s.rating === 1);
}

console.log('\n2. Which games count');
{
  const teams = [{ school: 'Farmington', division: 'D-III' }, { school: 'Nute', division: 'D-III' }];
  const { bySchool, skipped } = computeStandings(teams, [
    g('2026-09-02', 'Farmington', 'Nute', 3, 0),
    g('2026-09-03', 'Farmington', 'Nute', null, null),                   // not played yet
    g('2026-10-30', 'Farmington', 'Nute', 3, 1, { is_playoff: true }),   // tournament
    g('2026-09-04', 'Farmington', 'Out Of State Prep', 3, 0),            // not an NHIAA team
  ]);
  const f = bySchool.get('Farmington');
  check('only the scored regular-season NHIAA game counts', f.games_played === 1 && f.points === 4, `${f.games_played} gp, ${f.points} pts`);
  check('the non-NHIAA opponent is reported, not silently counted', skipped.length === 1 && /Out Of State Prep/.test(skipped[0]), skipped.join(' | '));
}

console.log('\n3. Real data, Sept. 18, 2026: every team against NHIAA\'s published standings');
{
  const fx = JSON.parse(readFileSync(new URL('./fixtures/gvolleyball-2026-09-18.json', import.meta.url)));
  const teams = fx.nhiaa.map(([school, division]) => ({ school, division }));
  const games = fx.games.map(([date, h, a, hs, as]) => g(date, h, a, hs, as));
  check('premise — the fixture is the full league (63 teams, 152 scored games)', teams.length === 63 && games.length === 152,
    `${teams.length} teams, ${games.length} games`);
  const { bySchool, skipped } = computeStandings(teams, games);
  check('every game is between two listed teams', skipped.length === 0, skipped.join(' | '));

  const diff = (div) => fx.nhiaa.filter(r => r[1] === div).filter(([school, , w, l, p, gp]) => {
    const o = bySchool.get(school);
    return !(o.wins === w && o.losses === l && o.points === p && o.games_played === gp);
  }).map(r => r[0]);

  const d1 = diff('D-I');
  check('D-I: all 20 teams match NHIAA exactly (W, L, points, games)', d1.length === 0, d1.join(', '));
  const d3 = diff('D-III');
  check('D-III: only St. Thomas Aquinas and Mascoma differ (the Sept. 16 match NHIAA had not counted)',
    d3.join(',') === 'Mascoma,St. Thomas Aquinas', d3.join(', '));
  const sta = bySchool.get('St. Thomas Aquinas');
  check('we have STA 6-0, 24 points', sta.wins === 6 && sta.losses === 0 && sta.points === 24, `${sta.wins}-${sta.losses} ${sta.points}`);

  const d2unbeaten = fx.nhiaa.filter(r => r[1] === 'D-II' && r[3] === 0).map(r => r[0]);
  const d2bad = diff('D-II');
  check('D-II: every unbeaten team matches NHIAA', d2unbeaten.every(s => !d2bad.includes(s)), d2unbeaten.filter(s => d2bad.includes(s)).join(', '));
  check('premise — that includes Hollis-Brookline\'s 21 points (the 5-point win over D-I Manchester Memorial)',
    bySchool.get('Hollis-Brookline').points === 21);
  check('D-II: the 15 teams with a loss all differ — NHIAA credits their losses with 4 points',
    d2bad.length === 15 && d2bad.every(s => { const r = fx.nhiaa.find(x => x[0] === s); return r[3] > 0 && r[4] === 4 * r[5]; }),
    `${d2bad.length}: ${d2bad.join(', ')}`);
  const pem = bySchool.get('Pembroke');
  check('Pembroke is 0-6 with 0 points here, not NHIAA\'s 24', pem.points === 0 && pem.losses === 6);
}

console.log('\n4. Comparing with NHIAA — the note for the CMS');
{
  const ours = { wins: 6, losses: 0, points: 24, games_played: 6,
    games: [{ date: '2026-09-14', opponent: 'Raymond', result: 'W' }, { date: '2026-09-16', opponent: 'Mascoma', result: 'W' }] };
  check('identical numbers → no note', compareWithNhiaa({ ...ours }, { wins: 6, losses: 0, points: 24, games_played: 6 }) === null);
  const ahead = compareWithNhiaa(ours, { wins: 5, losses: 0, points: 20, games_played: 5 });
  check('one more game than NHIAA → "hasn\'t counted", naming the latest game',
    /NHIAA hasn't counted 1 game yet/.test(ahead) && /9\/16 W vs Mascoma/.test(ahead) && !/Raymond/.test(ahead), ahead);
  const behind = compareWithNhiaa({ ...ours, games_played: 4, wins: 4, points: 16 }, { wins: 5, losses: 0, points: 20, games_played: 5 });
  check('fewer games than NHIAA → we are missing a score', /Ball603 has no score for/.test(behind), behind);
  const same = compareWithNhiaa({ wins: 0, losses: 6, points: 0, games_played: 6, games: [] }, { wins: 0, losses: 6, points: 24, games_played: 6 });
  check('same games, different points → flagged as a scoring difference', /^Same 6 games, different numbers/.test(same) && /NHIAA 0-6, 24 pts/.test(same), same);
  check('a team NHIAA has not been read for yet → no note', compareWithNhiaa(ours, { games_played: null }) === null);
  // The real case: NHIAA had counted STA's 9/17 game but not the 9/16 one, so
  // "most recent" guesses wrong. Mascoma is also ahead of NHIAA; Prospect Mountain is not.
  const sta = { wins: 6, losses: 0, points: 24, games_played: 6, games: [
    { date: '2026-09-14', opponent: 'Raymond', result: 'W' }, { date: '2026-09-16', opponent: 'Mascoma', result: 'W' },
    { date: '2026-09-17', opponent: 'Prospect Mountain', result: 'W' }] };
  const n5 = { wins: 5, losses: 0, points: 20, games_played: 5 };
  check('premise — without knowing who else is ahead, it guesses the latest game (9/17)', /9\/17 W vs Prospect Mountain/.test(compareWithNhiaa(sta, n5)));
  const pinned = compareWithNhiaa(sta, n5, new Set(['St. Thomas Aquinas', 'Mascoma']));
  check('knowing Mascoma is also ahead, it names the 9/16 Mascoma match', /9\/16 W vs Mascoma/.test(pinned) && !/Prospect/.test(pinned), pinned);
}

// A fake Supabase that records every request.
function fakeSupabase({ standings, games }) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('/rest/v1/standings') && (opts.method || 'GET') === 'GET') return ok(standings);
    if (u.includes('/rest/v1/games')) {
      // Honour the sport filter, so a query that leaves volleyball out gets none.
      const out = decodeURIComponent(u).includes('sport=not.in.(basketball,gvolleyball)')
        ? games.filter(x => x.sport !== 'gvolleyball') : games;
      return ok(out);
    }
    return new Response(null, { status: 204 });
  };
  return calls;
}

console.log('\n5. Writing the standings');
{
  const calls = fakeSupabase({
    standings: [
      { school: 'St. Thomas Aquinas', division: 'D-III', nhiaa_wins: 1, nhiaa_losses: 0, nhiaa_points: 4, nhiaa_games_played: 1 },
      { school: 'Mascoma', division: 'D-III', nhiaa_wins: 0, nhiaa_losses: 1, nhiaa_points: 0, nhiaa_games_played: 1 },
      { school: 'Salem', division: 'D-I', nhiaa_wins: 1, nhiaa_losses: 0, nhiaa_points: 3, nhiaa_games_played: 1 },
    ],
    games: [g('2026-09-10', 'Salem', 'Mascoma', 3, 0), g('2026-09-16', 'Mascoma', 'St. Thomas Aquinas', 0, 3),
            g('2026-09-17', 'St. Thomas Aquinas', 'Mascoma', 3, 1)]
  });
  const r = await quiet(() => recomputeVolleyballStandings());
  const get = calls.find(c => c.url.includes('/rest/v1/games'));
  check('reads only this season\'s scored NHIAA volleyball games',
    /sport=eq\.gvolleyball/.test(get.url) && /season=eq\.2026/.test(get.url) && /level=eq\.NHIAA/.test(get.url) &&
    /home_score=not\.is\.null/.test(get.url) && /away_score=not\.is\.null/.test(get.url), get.url);
  const patches = calls.filter(c => c.method === 'PATCH');
  check('one write per team', patches.length === 3 && r.updated === 3, `${patches.length}`);
  const staP = patches.find(c => c.url.includes(encodeURIComponent('St. Thomas Aquinas')));
  check('STA written 2-0, 8 points, rating 4, with the public columns',
    staP.body.wins === 2 && staP.body.losses === 0 && staP.body.points === 8 && staP.body.rating === 4 && staP.body.games_played === 2,
    JSON.stringify(staP.body));
  check('STA gets a note: NHIAA has not counted a game', /NHIAA hasn't counted 1 game/.test(staP.body.standings_note || ''), staP.body.standings_note);
  const salemP = patches.find(c => c.url.includes('Salem'));
  check('Salem matches NHIAA → note cleared to null (not left over from an earlier run)',
    'standings_note' in salemP.body && salemP.body.standings_note === null, JSON.stringify(salemP.body));
  check('the write never touches NHIAA\'s own columns', patches.every(c => !Object.keys(c.body).some(k => k.startsWith('nhiaa_'))));
  check('every write is scoped to volleyball 2026', patches.every(c => /sport=eq\.gvolleyball/.test(c.url) && /season=eq\.2026/.test(c.url)));
  check('the summary counts the flagged teams', r.flagged === 2, String(r.flagged));
}

console.log('\n6. The NHIAA standings scraper stores NHIAA\'s numbers separately, then computes');
{
  const src = readFileSync(`${SITE}/netlify/functions/scrape-gvolleyball-standings.mjs`, 'utf8');
  check('runs hourly, August–November', /schedule:\s*"0 \* \* 8,9,10,11 \*"/.test(src));
  const { runStandingsScrape } = await import(`${SITE}/netlify/functions/scrape-gvolleyball-standings.mjs`);
  const team = (name, w, l, pts, gp, rating) => ({ teamName: name, values: { w: String(w), l: String(l), pts: String(pts), gp: String(gp), rating: String(rating) } });
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u.endsWith('/groups')) return ok({ data: [{ sportId: 63, genderId: 2, levelId: 31, rankingsGroupId: 335, name: 'Division III' }] });
    if (u.includes('/rankings/')) return ok({ data: { divisions: [{ name: 'Division III', teams: [
      team('St. Thomas Aquinas High School', 1, 0, 4, 1, 4), team('Mascoma Valley Regional High School', 0, 1, 0, 1, 0)] }] } });
    if (u.includes('/rest/v1/standings') && (opts.method || 'GET') === 'GET') {
      return ok(u.includes('nhiaa_') ? [
        { school: 'St. Thomas Aquinas', division: 'D-III', nhiaa_wins: 1, nhiaa_losses: 0, nhiaa_points: 4, nhiaa_games_played: 1 },
        { school: 'Mascoma', division: 'D-III', nhiaa_wins: 0, nhiaa_losses: 1, nhiaa_points: 0, nhiaa_games_played: 1 }]
        : [{ school: 'St. Thomas Aquinas', division: 'D-III' }, { school: 'Mascoma', division: 'D-III' }]);
    }
    if (u.includes('/rest/v1/games')) return ok([g('2026-09-16', 'Mascoma', 'St. Thomas Aquinas', 0, 3), g('2026-09-17', 'St. Thomas Aquinas', 'Mascoma', 3, 0)]);
    return new Response(null, { status: 204 });
  };
  const res = await quiet(() => runStandingsScrape());
  const body = await res.json();
  const patches = calls.filter(c => c.method === 'PATCH');
  const nhiaaWrites = patches.filter(c => 'nhiaa_points' in c.body);
  check('premise — both teams parsed and written', body.teamsScraped === 2 && nhiaaWrites.length === 2, JSON.stringify(body).slice(0, 200));
  check('NHIAA\'s numbers go only to the nhiaa_* columns (plus division)',
    nhiaaWrites.every(c => !('wins' in c.body) && !('points' in c.body) && !('rating' in c.body)) &&
    nhiaaWrites.find(c => c.url.includes('Aquinas')).body.nhiaa_points === 4 && nhiaaWrites[0].body.division === 'D-III',
    JSON.stringify(nhiaaWrites[0].body));
  const computed = patches.filter(c => 'standings_note' in c.body);
  const sta = computed.find(c => c.url.includes('Aquinas'));
  check('then the public numbers are computed from the games: STA 2-0, 8 points', sta && sta.body.wins === 2 && sta.body.points === 8,
    sta && JSON.stringify(sta.body));
  const order = patches.indexOf(nhiaaWrites[1]) < patches.indexOf(computed[0]);
  check('NHIAA import happens first, so the comparison uses fresh numbers', order);
  check('the response reports the computation', body.success === true && body.computed && body.computed.teamsWritten === 2 && body.computed.differFromNhiaa === 2,
    JSON.stringify(body.computed));
}

console.log('\n7. Score entry and the schedule scraper recompute straight away');
{
  const src = readFileSync(`${SITE}/netlify/functions/update-standings.mjs`, 'utf8');
  check('update-standings leaves volleyball out of the W-L-only pass', /sport=not\.in\.\(basketball,gvolleyball\)/.test(src));
  const { default: updateStandings } = await import(`${SITE}/netlify/functions/update-standings.mjs`);
  const calls = fakeSupabase({
    standings: [{ school: 'Farmington', division: 'D-III', sport: 'gvolleyball', gender: 'Girls', nhiaa_wins: 0, nhiaa_losses: 0, nhiaa_points: 0, nhiaa_games_played: 0 },
                { school: 'Nute', division: 'D-III', sport: 'gvolleyball', gender: 'Girls', nhiaa_wins: 0, nhiaa_losses: 0, nhiaa_points: 0, nhiaa_games_played: 0 }],
    games: [g('2026-09-18', 'Farmington', 'Nute', 3, 1, { sport: 'gvolleyball', gender: 'Girls', division: 'D-III' })]
  });
  const res = await quiet(() => updateStandings(new Request('https://x/.netlify/functions/update-standings', { method: 'POST' })));
  const body = await res.json();
  const f = calls.find(c => c.method === 'PATCH' && c.url.includes('Farmington') && c.body && 'standings_note' in c.body);
  check('saving a score (update-standings) writes volleyball points and rating', f && f.body.points === 4 && f.body.rating === 4, f && JSON.stringify(f.body));
  check('and says so in its response', body.volleyball && body.volleyball.teamsWritten === 2, JSON.stringify(body.volleyball));
  const zeroed = calls.some(c => c.method === 'PATCH' && /sport=eq\.gvolleyball/.test(c.url) && c.body && c.body.wins === 0 && !('standings_note' in c.body));
  check('volleyball W-L is not zeroed by the generic pass any more', !zeroed);

  const core = readFileSync(`${SITE}/netlify/functions/scrape-gvolleyball-core.mjs`, 'utf8');
  const up = core.indexOf('await updateSupabase(activeGames)'), rc = core.indexOf('recomputeVolleyballStandings()');
  check('the schedule scraper recomputes after writing the games', up > 0 && rc > up);
}

console.log('\n8. The CMS Standings Check panel (private)');
{
  const admin = readFileSync(`${SITE}/admin.html`, 'utf8');
  const card = admin.slice(admin.indexOf('<!-- Volleyball Standings Check'), admin.indexOf('<!-- Ticker Settings -->'));
  const fnStart = admin.indexOf('    async function loadStandingsCheck() {');
  const fnEnd = admin.indexOf('    async function recalculateStandings() {');
  check('premise — card and function found in admin.html', card.length > 100 && fnStart > 0 && fnEnd > fnStart);
  check('loads when the Settings tab opens', /if \(tab === 'settings'\) \{\s*loadSiteSettings\(\);\s*loadStandingsCheck\(\);/.test(admin));
  const fn = admin.slice(fnStart, fnEnd);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  const rows = [
    { school: 'St. Thomas Aquinas', division: 'D-III', wins: 6, losses: 0, points: 24, rating: 4, nhiaa_wins: 5, nhiaa_losses: 0, nhiaa_points: 20, nhiaa_rating: 4,
      standings_note: "NHIAA hasn't counted 1 game yet (likely 9/17 W vs Prospect Mountain). NHIAA 5-0, 20 pts · Ball603 6-0, 24 pts", scraped_at: '2026-09-18T17:26:35Z' },
    { school: 'Pembroke', division: 'D-II', wins: 0, losses: 6, points: 0, rating: 0, nhiaa_wins: 0, nhiaa_losses: 6, nhiaa_points: 24, nhiaa_rating: 4,
      standings_note: 'Same 6 games, different numbers — check the scores, or NHIAA may have an error. NHIAA 0-6, 24 pts · Ball603 0-6, 0 pts', scraped_at: '2026-09-18T17:26:35Z' },
    { school: 'Salem', division: 'D-I', wins: 6, losses: 0, points: 24, rating: 4, nhiaa_wins: 6, nhiaa_losses: 0, nhiaa_points: 24, nhiaa_rating: 4, standings_note: null, scraped_at: '2026-09-18T17:26:35Z' },
    { school: '<b>X</b>', division: 'D-I', wins: 0, losses: 0, points: 0, rating: 0, standings_note: '<img src=x onerror=alert(1)>', scraped_at: null },
  ];
  const setup = async (data, error = null) => {
    await page.goto('about:blank');   // fresh page each time, so the stubs can be redeclared
    await page.setContent(`<body>${card}<script>
      const FAKE = ${JSON.stringify({ data, error })};
      const q = { select(){return q}, eq(){return q}, then(r){ r(FAKE) } };
      const db = { from(){ return q } };
      ${fn}
    </script></body>`);
    await page.evaluate(() => loadStandingsCheck());
  };
  await setup(rows);
  const summary = await page.textContent('#standingsCheckSummary');
  check('summary counts the differing teams', /3 of 4 teams differ from NHIAA/.test(summary), summary);
  const trs = await page.$$eval('.standings-check-row', els => els.map(e => e.innerText.replace(/\s+/g, ' ')));
  check('lists only teams with a note, D-I before D-II before D-III', trs.length === 3 && /X/.test(trs[0]) && /Pembroke/.test(trs[1]) && /Aquinas/.test(trs[2]), trs.join(' | '));
  check('shows both sets of numbers', /0-6 · 0 pts · 0\.000/.test(trs[1]) && /0-6 · 24 pts · 4\.000/.test(trs[1]), trs[1]);
  check('the reason is readable, without repeating the numbers', /NHIAA may have an error\./.test(trs[1]) && !/Ball603 0-6/.test(trs[1]), trs[1]);
  check('team names and notes are escaped, not run as HTML', (await page.$('#standingsCheckList img')) === null && (await page.$('#standingsCheckList td b')) === null);

  await setup(rows.filter(r => !r.standings_note));
  check('all matching → one line saying so', /All 1 teams match NHIAA/.test(await page.textContent('#standingsCheckSummary')));
  await setup(null, { message: 'column standings.nhiaa_wins does not exist' });
  check('before the SQL is run → tells you to run it', /Run the SQL/.test(await page.textContent('#standingsCheckSummary')));
  await browser.close();

  const pub = ['standings.html', 'index.html', 'playoffs.html', 'netlify/functions/get-standings.mjs']
    .filter(f => /standings_note|nhiaa_(wins|losses|points|rating|games_played)/.test(readFileSync(`${SITE}/${f}`, 'utf8')));
  check('nothing public reads the note or NHIAA columns', pub.length === 0, pub.join(', '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
