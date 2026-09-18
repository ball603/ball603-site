/* The girls volleyball game scraper's divisions. A school is not in one division
   for every sport: Arbiter's `classification` is the school's general one, and
   for Hollis-Brookline, Prospect Mountain and Winnisquam it disagrees with the
   volleyball alignment. Games must be filed under the VOLLEYBALL division. */
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'svc-test';
const { parseGames, fetchVolleyballDivisions } =
  await import('/root/ball603/ball603-site-main/netlify/functions/scrape-gvolleyball-core.mjs');

let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };
const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };

// Arbiter's shape, with the classification codes as the live feed has them:
// 8912 = D-I, 8913 = D-II, 8914 = D-III.
const team = (entityId, teamName, classification, isHome, score = null) => ({ entityId, teamName, classification, isHome, score });
const game = (id, date, home, away) => ({ uniqueGameId: id, fromDate: `${date}T18:00:00`, gameTitle: '', hslevelId: 1, gameTypeId: 3,
  gameStatus: 'Normal', teams: [home, away] });
const HB = (isHome, s) => team(10240, 'Hollis Brookline High School', 8912, isHome, s);     // school: D-I
const LAC = (isHome, s) => team(12075, 'Laconia High School', 8913, isHome, s);              // school: D-II
const PM = (isHome, s) => team(18639, 'Prospect Mountain High School', 8913, isHome, s);     // school: D-II
const RAY = (isHome, s) => team(0, 'Raymond High School', 8914, isHome, s);                   // school: D-III
const MEM = (isHome, s) => team(0, 'Manchester Memorial High School', 8912, isHome, s);      // school: D-I
const NEW = (isHome, s) => team(0, 'Brand New Academy', 8914, isHome, s);                     // not in standings

const FEED = [
  game(1, '2026-09-02', HB(true, 3), LAC(false, 0)),
  game(2, '2026-09-02', PM(true, 1), RAY(false, 3)),
  game(3, '2026-09-04', HB(true, 3), MEM(false, 0)),
  game(4, '2026-09-05', NEW(true, 3), RAY(false, 1))
];
// What the volleyball standings say (NHIAA's per-division volleyball groups).
const STANDINGS = new Map([['Hollis-Brookline', 'D-II'], ['Laconia', 'D-II'], ['Prospect Mountain', 'D-III'],
  ['Raymond', 'D-III'], ['Manchester Memorial', 'D-I']]);

const byTeams = (games, home, away) => games.find(g => g.home_team === home && g.away_team === away);

console.log('\n1. The volleyball division, not the school classification');
{
  const games = quiet(() => parseGames(FEED, STANDINGS));
  check('premise — every game parsed', games.length === 4, games.map(g => `${g.away_team}@${g.home_team}`).join(', '));
  const lac = byTeams(games, 'Hollis-Brookline', 'Laconia');
  check('Laconia at Hollis-Brookline is D-II, both teams\' volleyball division', lac && lac.division === 'D-II', lac && lac.division);
  const pm = byTeams(games, 'Prospect Mountain', 'Raymond');
  check('Raymond at Prospect Mountain is D-III', pm && pm.division === 'D-III', pm && pm.division);
  const mem = byTeams(games, 'Hollis-Brookline', 'Manchester Memorial');
  check('a cross-division match goes under the home team\'s volleyball division', mem && mem.division === 'D-II', mem && mem.division);
}

console.log('\n2. The old way, for comparison');
{
  // With no standings at all, the scraper behaves exactly as it did — which is
  // how these games came to be filed wrong. Shows the test can tell the two apart.
  const games = quiet(() => parseGames(FEED));
  check('without standings, classification puts Hollis-Brookline\'s home game in D-I',
    byTeams(games, 'Hollis-Brookline', 'Laconia').division === 'D-I');
  check('and Prospect Mountain\'s in D-II', byTeams(games, 'Prospect Mountain', 'Raymond').division === 'D-II');
}

console.log('\n3. A school the standings do not list yet');
{
  let logged = '';
  const log = console.log; console.log = (m) => { logged += m + '\n'; };
  const games = parseGames(FEED, STANDINGS);
  console.log = log;
  const g = byTeams(games, 'Brand New Academy', 'Raymond');
  check('falls back to its classification rather than being dropped', g && g.division === 'D-III', g && g.division);
  check('and is named in the log so it can be checked', /classification.*Brand New Academy/.test(logged), logged.split('\n').find(l => /classification/.test(l)) || '(no line)');
}

console.log('\n4. Reading the standings');
{
  globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => [
    { school: 'Hollis-Brookline', division: 'D-II' }, { school: 'Prospect Mountain', division: 'D-III' }, { school: null, division: 'D-I' }] });
  const m = await fetchVolleyballDivisions();
  check('builds school → division', m.get('Hollis-Brookline') === 'D-II' && m.get('Prospect Mountain') === 'D-III', JSON.stringify([...m]));
  check('skipping rows with no school', m.size === 2);

  globalThis.fetch = async () => ({ ok: false, status: 503 });
  const down = await quiet(() => fetchVolleyballDivisions());
  check('Supabase down: an empty map, so the scrape still runs on classification', down instanceof Map && down.size === 0);
  globalThis.fetch = async () => { throw new Error('network'); };
  const threw = await quiet(() => fetchVolleyballDivisions());
  check('a network error is the same, not a crash', threw instanceof Map && threw.size === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
