// What the Farmington sync writes, and — more to the point — what it refuses to.
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-test';
process.env.SYNC_SECRET_KEY = 'testkey';
// Read at module load, so it has to be here rather than beside the test.
process.env.SMUGMUG_API_KEY = 'test-key';
delete process.env.SMUGMUG_ACCESS_TOKEN;   // the APIKey path, so nothing is signed
delete process.env.SMUGMUG_ACCESS_SECRET;

const { runFarmingtonSync } = await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington.mjs');
const runWrapper = (await import('/root/ball603/ball603-site-main/netlify/functions/run-farmington-sync.mjs')).default;

// The scheduled job, called the way Netlify's scheduler calls it.
const handler = async (event) => {
  const dry = (event.queryStringParameters || {}).dry;
  const { statusCode, body } = await runFarmingtonSync({ dryRun: dry === '1' || dry === 'true' });
  return { statusCode, body: JSON.stringify(body) };
};

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  console.log(`   ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
  cond ? pass++ : fail++;
};

const TEAMS = [
  { uTeam: 4575537, teamDescription: 'Girls Varsity Volleyball', sport: 63, gender: 2, level: 1, isActive: true },
  { uTeam: 11769193, teamDescription: 'Boys Varsity Football - Farmington-Nute', sport: 25, gender: 1, level: 1, isActive: true },
  { uTeam: 11852690, teamDescription: 'Boys Varsity Cross Country', sport: 11, gender: 1, level: 1, isActive: true },
  { uTeam: 4938722, teamDescription: 'Boys Varsity Baseball', sport: 3, gender: 1, level: 1, isActive: false }
];

const SCHEDULES = {
  4575537: [
    { uniqueGameId: 900001, fromDate: '2026-09-02T17:00:00', toDate: '2026-09-02T19:00:00',
      gameStatus: 'Normal', uniqueSiteId: 741475, siteName: 'Farmington HS', subSiteName: 'Gym',
      teamGenderId: 2, hslevelId: 1, eventSubcategoryId: 63, gameTitle: null, tournamentName: '',
      teams: [
        { uniqueTeamId: 4575537, isHome: true, score: 3, teamName: 'Farmington High School-NH', entityId: 4021, myTeam: true, gameWLTStatus: 'W' },
        { uniqueTeamId: 7443118, isHome: false, score: 0, teamName: 'Hillsboro-Deering High School', entityId: 10125, myTeam: false, gameWLTStatus: 'L' }
      ] },
    { uniqueGameId: 900002, fromDate: '2026-09-08T17:00:00', gameStatus: 'Normal',
      siteName: 'MOULTONBOROUGH ACADEMY', subSiteName: 'Gym', eventSubcategoryId: 63, teamGenderId: 2, hslevelId: 1,
      teams: [
        { uniqueTeamId: 4575537, isHome: false, score: null, teamName: 'Farmington High School-NH', entityId: 4021, myTeam: true, gameWLTStatus: null },
        { uniqueTeamId: 888, isHome: true, score: null, teamName: 'MOULTONBOROUGH ACADEMY', entityId: 115592, myTeam: false, gameWLTStatus: null }
      ] }
  ],
  // The co-op case: myTeam is false on BOTH sides.
  11769193: [
    { uniqueGameId: 900010, fromDate: '2026-09-12T12:00:00', gameStatus: 'Normal',
      siteName: 'Farmington HS', subSiteName: 'Farmington HS', eventSubcategoryId: 25, teamGenderId: 1, hslevelId: 1,
      teams: [
        { uniqueTeamId: 11769193, isHome: true, score: 8, teamName: 'Farmington-Nute', entityId: 0, myTeam: false, gameWLTStatus: 'L' },
        { uniqueTeamId: 7443118, isHome: false, score: 20, teamName: 'Hillsboro-Deering High School', entityId: 10125, myTeam: false, gameWLTStatus: 'W' }
      ] }
  ],
  // A 19-school meet.
  11852690: [
    { uniqueGameId: 900020, fromDate: '2026-10-21T16:00:00', gameStatus: 'Normal',
      siteName: 'Profile School', subSiteName: 'Bethlehem Country Club', eventSubcategoryId: 11, teamGenderId: 1, hslevelId: 1,
      gameTitle: 'Granite State Conference Championship Meet',
      teams: [
        { uniqueTeamId: 11852690, isHome: false, score: null, teamName: 'Farmington High School-NH', entityId: 4021, myTeam: true, gameWLTStatus: null },
        { uniqueTeamId: 1, isHome: true, score: null, teamName: 'Profile School', entityId: 2, myTeam: false },
        { uniqueTeamId: 3, isHome: false, score: null, teamName: 'Nute Middle/High School', entityId: 4, myTeam: false }
      ] }
  ]
};

function installFetch({ arbiterFails = new Set(), emptyAll = false } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, method: options.method || 'GET', body: options.body });
    const ok = (json) => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) });

    if (u.includes('/rest/v1/teams?select=shortname')) {
      return ok([{ shortname: 'Hillsboro-Deering' }, { shortname: 'Moultonborough' },
                 { shortname: 'Farmington' }, { shortname: 'Nute' }, { shortname: 'Profile' }]);
    }
    if (u.includes('widget/roster/')) return ok({ data: TEAMS });
    if (u.includes('widget/schedule/')) {
      const uteam = Number(u.match(/team\/(\d+)/)[1]);
      if (arbiterFails.has(uteam)) return { ok: false, status: 503, text: async () => 'down' };
      return ok({ data: emptyAll ? [] : (SCHEDULES[uteam] || []) });
    }
    if (u.includes('/rest/v1/farmington_')) return ok([]);
    throw new Error('unexpected fetch: ' + u);
  };
  return calls;
}

const writes = (calls) => calls.filter(c => c.url.includes('/rest/v1/farmington_') && c.method !== 'GET');
const gameWrites = (calls) => calls.filter(c => c.url.includes('farmington_games') && c.method === 'POST');
const allRows = (calls) => gameWrites(calls).flatMap(c => JSON.parse(c.body));

// ── 1. Manual scores are untouchable ────────────────────────────────────────
console.log('\n1. The sync never writes a hand-entered score');
{
  const calls = installFetch();
  const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const body = JSON.parse(res.body);
  const rows = allRows(calls);
  check('ran clean', res.statusCode === 200 && body.success, res.body.slice(0, 200));
  check('wrote every event', rows.length === 4, String(rows.length));
  const manualKeys = rows.flatMap(r => Object.keys(r)).filter(k => k.startsWith('manual_'));
  check('no manual_* key in any row', manualKeys.length === 0, manualKeys.join(','));
  check('and the delete protects them', calls.some(c =>
    c.method === 'DELETE' && c.url.includes('manual_my_score=is.null')));
}

// ── 2. The co-op trap ───────────────────────────────────────────────────────
console.log('\n2. A co-op game, where myTeam is false on both sides');
{
  const calls = installFetch();
  await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const row = allRows(calls).find(r => r.unique_game_id === 900010);
  check('opponent is the other school, not us', row.opponent_name === 'Hillsboro-Deering High School', row.opponent_name);
  check('linked to Ball603', row.opponent_ball603 === 'Hillsboro-Deering', String(row.opponent_ball603));
  check('our score, not theirs', row.arbiter_my_score === 8, String(row.arbiter_my_score));
  check('their score', row.arbiter_opp_score === 20, String(row.arbiter_opp_score));
  check('home', row.is_home === true, String(row.is_home));
  check('result is ours', row.arbiter_result === 'L', String(row.arbiter_result));
}

// ── 3. Meets ────────────────────────────────────────────────────────────────
console.log('\n3. A 3-school meet has no opponent');
{
  const calls = installFetch();
  await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const row = allRows(calls).find(r => r.unique_game_id === 900020);
  check('flagged as a meet', row.is_meet === true);
  check('no opponent invented', row.opponent_name === null, String(row.opponent_name));
  check('school count kept', row.team_count === 3, String(row.team_count));
}

// ── 4. Shouting ─────────────────────────────────────────────────────────────
console.log('\n4. MOULTONBOROUGH ACADEMY');
{
  const calls = installFetch();
  await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const row = allRows(calls).find(r => r.unique_game_id === 900002);
  check('display name is not shouting', row.opponent_name === 'Moultonborough Academy', row.opponent_name);
  check('still matches Ball603', row.opponent_ball603 === 'Moultonborough', String(row.opponent_ball603));
  check('null score stays null, not 0', row.arbiter_my_score === null, String(row.arbiter_my_score));
}

// ── 5. Inactive teams ───────────────────────────────────────────────────────
console.log('\n5. An out-of-season team');
{
  const calls = installFetch();
  await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const teamRows = calls.filter(c => c.url.includes('farmington_teams') && c.method === 'POST')
    .flatMap(c => JSON.parse(c.body));
  check('still recorded, marked inactive', teamRows.some(t => t.uteam === 4938722 && t.is_active === false));
  check('but its schedule is not fetched', !calls.some(c => c.url.includes('team/4938722')));
  check('and nothing prunes it', !calls.some(c => c.method === 'DELETE' && c.url.includes('uteam=eq.4938722')));
}

// ── 6. Pruning stays inside the live window ─────────────────────────────────
console.log('\n6. Pruning is scoped to the dates Arbiter just described');
{
  const calls = installFetch();
  await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const del = calls.find(c => c.method === 'DELETE' && c.url.includes('uteam=eq.4575537'));
  check('a delete was issued for volleyball', !!del);
  check('lower bound is the first fetched game', del.url.includes('game_date=gte.2026-09-02'), del.url);
  check('upper bound is the last', del.url.includes('game_date=lte.2026-09-08'), del.url);
  check('and it spares the ids we just wrote', del.url.includes('not.in.(900001,900002)'), del.url);
}

// ── 7. Arbiter having a bad day ─────────────────────────────────────────────
console.log('\n7. When a feed fails');
{
  const calls = installFetch({ arbiterFails: new Set([4575537]) });
  const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const body = JSON.parse(res.body);
  check('the other teams still sync', body.games === 2, String(body.games));
  check('the failure is reported', body.failedTeams.length === 1, JSON.stringify(body.failedTeams));
  check('nothing is pruned for the failed team', !calls.some(c =>
    c.method === 'DELETE' && c.url.includes('uteam=eq.4575537')));
}

console.log('\n8. When every feed fails');
{
  const calls = installFetch({ emptyAll: true });
  const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });
  check('reports failure', res.statusCode === 502, String(res.statusCode));
  check('and writes nothing at all', writes(calls).length === 0, String(writes(calls).length));
}

// ── 9. The manual door ──────────────────────────────────────────────────────
// A function with a schedule is unreachable over HTTP, so the door is the
// separate wrapper. These drive the real wrapper, not a stand-in for it.
console.log('\n9. The manual trigger');
{
  const req = (qs) => new Request('https://ball603.com/.netlify/functions/run-farmington-sync' + qs);

  let calls = installFetch();
  let res = await runWrapper(req('?key=wrong'));
  check('wrong key is turned away', res.status === 401, String(res.status));
  check('and touches nothing', writes(calls).length === 0, String(writes(calls).length));

  calls = installFetch();
  res = await runWrapper(req(''));
  check('no key at all is turned away', res.status === 401, String(res.status));
  check('still touches nothing', writes(calls).length === 0);

  calls = installFetch();
  res = await runWrapper(req('?key=testkey'));
  let body = await res.json();
  check('right key runs the real job', res.status === 200 && body.games === 4, JSON.stringify(body).slice(0, 120));
  check('and it wrote', gameWrites(calls).length > 0);

  calls = installFetch();
  res = await runWrapper(req('?key=testkey&dry=1'));
  body = await res.json();
  check('dry run reports the counts', body.dryRun === true && body.games === 4, String(body.games));
  check('but writes nothing', writes(calls).length === 0, String(writes(calls).length));

  calls = installFetch();
  res = await runWrapper(new Request('https://ball603.com/x', { method: 'OPTIONS' }));
  check('preflight is answered', res.status === 204, String(res.status));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n10. Which sport is a gallery');
{
  const { sportFromName, sportFromUrl } =
    await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington-photos.mjs');

  // Real album names off kjcardinal.smugmug.com/Sports/FHS.
  const byName = [
    ['FHS-Golf-at-Androscoggin-Valley-CC-Sept-8-2026', 'Golf'],
    ['Farmington-Nute-football-vs-Hillsboro-Deering-Sept-12-2026', 'Football'],
    ['FHS-Girls-Volleyball-at-Nute-Johnson-500-Kills-Sept-12-2026', 'Volleyball'],
    ['JV-Girls-Volleyball-vs-Trinity-Sept-9-2026', 'Volleyball'],
    ['2026-JV-Boys-Basketball-Tournament-Feb-24-2026', 'Basketball'],
    ['Farmington-Nute-Varsity-Soccer-at-Epping-Oct-31-2025', 'Soccer'],
    ['FHS-Orange-Black-Friday-Alumni-Game-Nov-28-2025', null]
  ];
  for (const [name, want] of byName) {
    check(`"${name.slice(0, 44)}" → ${want}`, sportFromName(name) === want, String(sportFromName(name)));
  }

  // Softball and baseball both end in "ball", and so does basketball — the
  // order the patterns are tried in is the only thing keeping them apart.
  check('softball is not baseball', sportFromName('FHS Softball vs Epping') === 'Softball');
  check('basketball is not baseball', sportFromName('Girls Basketball at Nute') === 'Basketball');

  // Real album URLs off ball603.smugmug.com, where the folder is the sport and
  // the name never mentions it.
  const byUrl = [
    ['https://ball603.smugmug.com/Volleyball/2026/Farmington-at-Nute-091126-KJ-CARDINAL', 'Volleyball'],
    ['https://ball603.smugmug.com/Basketball/2025-26/Groveton-Girls-at-Farmington-030426-Shawna-Hurlbert', 'Basketball'],
    ['https://ball603.smugmug.com/Baseball/2026/Farmington-at-Colebrook-June-3-2026', 'Baseball'],
    ['https://ball603.smugmug.com/Events/Some-Banquet', null]
  ];
  for (const [url, want] of byUrl) {
    check(`folder ${url.split('/')[3]} → ${want}`, sportFromUrl(url) === want, String(sportFromUrl(url)));
  }

  // "Trinity at Farmington (09.09.26)" has no sport in it at all, which is the
  // whole reason the two accounts are read differently.
  check('a Ball603 name alone gives nothing away',
    sportFromName('Trinity at Farmington (09.09.26) - KJ CARDINAL') === null);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n11. Every gallery keeps its own identity');
{
  const { albumKeyOf } =
    await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington-photos.mjs');

  // !albums sends the key outright.
  check('AlbumKey is used when it is there', albumKeyOf({ AlbumKey: '8RnCvB' }) === '8RnCvB');

  // !albumlist — the endpoint that actually reaches KJ's folder — does not.
  check('recovered from the album Uri',
    albumKeyOf({ Uri: '/api/v2/album/RRdxP4' }) === 'RRdxP4',
    String(albumKeyOf({ Uri: '/api/v2/album/RRdxP4' })));
  check('or from a nested Album uri',
    albumKeyOf({ Uris: { Album: { Uri: '/api/v2/album/P63fVG' } } }) === 'P63fVG');
  check('or the gallery address as a last resort',
    albumKeyOf({ WebUri: 'https://kjcardinal.smugmug.com/Sports/FHS/FHS-Golf-Sept-2-2026' })
      === 'web:kjcardinal.smugmug.com/Sports/FHS/FHS-Golf-Sept-2-2026');
  check('and nothing at all is nothing, not a shared key', albumKeyOf({}) === null);

  // The actual defect: 127 galleries with no AlbumKey became one row, because
  // undefined is the same map key every time.
  const albums = [
    { WebUri: 'https://kjcardinal.smugmug.com/Sports/FHS/A' },
    { WebUri: 'https://kjcardinal.smugmug.com/Sports/FHS/B' },
    { Uri: '/api/v2/album/CCC111' }
  ];
  const keys = new Set(albums.map(albumKeyOf));
  check('three keyless galleries stay three galleries', keys.size === 3, String(keys.size));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n11b. When a gallery happened');
{
  const { dateFromName } =
    await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington-photos.mjs');
  const day = (iso) => iso ? iso.slice(0, 10) : null;

  // Real album names off kjcardinal.smugmug.com/Sports/FHS.
  const cases = [
    ['FHS-Golf-at-Androscoggin-Valley-CC-Sept-8-2026', '2026-09-08'],
    ['Farmington-Nute-football-vs-Hillsboro-Deering-Sept-12-2026', '2026-09-12'],
    ['FHS Girls Volleyball at Nute - Johnson 500 Kills - Sept 12 2026', '2026-09-12'],
    ['2026-JV-Boys-Basketball-Tournament-Feb-24-2026', '2026-02-24'],
    ['FHS-Orange-Black-Friday-Alumni-Game-Nov-28-2025', '2025-11-28'],
    ['Farmington-Nute-Varsity-Soccer-at-Epping-Oct-31-2025', '2025-10-31'],
    ['FHS-Girls-Volleyball-vs-Inter-Lakes-Nov-8-2025-FINALS', '2025-11-08'],
    ['FHS-Girls-Varsity-Volleyball-Photo-Shoot-Oct-27-2025', '2025-10-27']
  ];
  for (const [name, want] of cases) {
    check(`"${name.slice(0, 46)}" → ${want}`, day(dateFromName(name)) === want, String(day(dateFromName(name))));
  }

  // A tournament album that leads with the season year must not be read as one.
  check('a leading year is not a date',
    day(dateFromName('2026-JV-Boys-Basketball-Tournament-Feb-24-2026')) === '2026-02-24');

  // Nothing to find, and nothing invented.
  check('a name with no date gives none', dateFromName('FHS Senior Night') === null);
  check('and neither does an empty one', dateFromName('') === null);
  check('Ball603 names carry their date differently, so nothing is guessed',
    dateFromName('Farmington at Nute (09.11.26) - KJ CARDINAL') === null,
    String(dateFromName('Farmington at Nute (09.11.26) - KJ CARDINAL')));

  // Rubbish in a name must not become a date.
  check('day 47 is not a day', dateFromName('Game Sept 47 2026') === null);
  check('year 1899 is not this century', dateFromName('Game Sept 8 1899') === null);

  // The calendar date has to survive being rendered in a US timezone — a
  // midnight UTC stamp reads as the day before in New Hampshire.
  const d = new Date(dateFromName('FHS Golf Sept 8 2026'));
  check('the date holds in Eastern time',
    d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }) === 'Sep 8',
    d.toLocaleDateString('en-US', { timeZone: 'America/New_York' }));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n12. The photo sync only deletes what it is sure about');
{
  const { runPhotoSync } =
    await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington-photos.mjs');

  const album = (n) => ({ Name: 'FHS Volleyball ' + n, Uri: '/api/v2/album/KJ' + n, UrlPath: '/Sports/FHS/g' + n });
  const full = (n) => ({ AlbumKey: 'KJ' + n, Name: 'FHS Volleyball ' + n, ImageCount: 10,
    WebUri: 'https://kjcardinal.smugmug.com/Sports/FHS/g' + n, Date: '2026-09-0' + (n % 9) + 'T12:00:00+00:00' });
  const b6 = (n) => ({ AlbumKey: 'B' + n, Name: 'Trinity at Farmington ' + n, ImageCount: 20,
    WebUri: 'https://ball603.smugmug.com/Volleyball/2026/g' + n, Date: '2026-09-01T12:00:00+00:00' });

  // held: what Supabase already has. kjFolder: what SmugMug lists. kjFails: the
  // folder listing 500s.
  function stub({ held = [], kjCount = 3, kjFails = false, b6Fails = false, slowAlbums = false } = {}) {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      const u = String(url);
      calls.push({ url: u, method: options.method || 'GET', body: options.body });
      const ok = (json) => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) });
      const bad = (s) => ({ ok: false, status: s, text: async () => 'nope' });

      if (u.includes('/rest/v1/farmington_albums')) {
        if ((options.method || 'GET') === 'GET') return ok(held);
        // PostgREST refuses a bulk insert whose objects do not all carry the
        // same keys (PGRST102). The stub has to refuse it too, or a live-only
        // failure stays invisible here.
        if ((options.method) === 'POST') {
          const batch = JSON.parse(options.body);
          const shapes = new Set(batch.map(o => Object.keys(o).sort().join(',')));
          if (shapes.size > 1) {
            return { ok: false, status: 400,
              text: async () => JSON.stringify({ code: 'PGRST102', message: 'All object keys must match',
                                                 _shapes: [...shapes] }) };
          }
        }
        return ok([]);
      }
      if (u.includes('!albumlist')) {
        if (kjFails) return bad(500);
        return ok({ Response: { AlbumList: Array.from({ length: kjCount }, (_, i) => album(i + 1)) } });
      }
      if (/\/api\/v2\/album\/KJ\d/.test(u) && !u.includes('!images')) {
        // Each gallery fetch costs real time, so a budget can run out.
        if (slowAlbums) await new Promise(r => setTimeout(r, 120));
        return ok({ Response: { Album: full(Number(u.match(/KJ(\d)/)[1])) } });
      }
      if (u.includes('user/ball603!albums')) {
        if (b6Fails) return bad(503);
        return ok({ Response: { Album: [b6(1), b6(2)] } });
      }
      if (u.includes('!images')) return ok({ Response: { AlbumImage: [] } });
      return ok({ Response: {} });
    };
    return calls;
  }

  const deletes = (calls, src) => calls.filter(c =>
    c.method === 'DELETE' && c.url.includes('farmington_albums') && c.url.includes('source=eq.' + src));

  // Everything healthy: both sides prune.
  let calls = stub({});
  let r = await runPhotoSync({});
  check('a healthy run writes both accounts', r.body.rows === 5, String(r.body.rows));
  check('and prunes each account', deletes(calls,'kjcardinal').length === 1 && deletes(calls,'ball603').length === 1,
    JSON.stringify(r.body.prune || {}));

  // KJ's folder listing fails. Ball603's galleries must survive.
  calls = stub({ kjFails: true });
  r = await runPhotoSync({});
  check('KJ failing does not delete Ball603 galleries', deletes(calls,'ball603').length === 1,
    JSON.stringify(r.body.sources.kjcardinal));
  check('and nothing is pruned on the account that failed', deletes(calls,'kjcardinal').length === 0);
  check('Ball603 still wrote', r.body.bySource.ball603.rows === 2, String(r.body.bySource.ball603.rows));

  // Ball603 fails. KJ's galleries must survive.
  calls = stub({ b6Fails: true });
  r = await runPhotoSync({});
  check('Ball603 failing does not delete KJ galleries', deletes(calls,'ball603').length === 0);
  check('KJ still wrote', r.body.bySource.kjcardinal.rows === 3, String(r.body.bySource.kjcardinal.rows));

  // A backlog the budget cannot finish: the galleries not reached yet are still
  // on SmugMug, so nothing on that account may be deleted.
  calls = stub({ kjCount: 8, slowAlbums: true });
  r = await runPhotoSync({ budgetMs: 200 });
  check('an unfinished account reports what is left',
    r.body.sources.kjcardinal.pending > 0, JSON.stringify(r.body.sources.kjcardinal));
  check('and is not pruned while it is behind', deletes(calls,'kjcardinal').length === 0,
    JSON.stringify(r.body.prune || {}));

  // Covers. SmugMug hands back a 150px square; the cards are 300px and 3:2.
  {
    const { upgradeThumb } =
      await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington-photos.mjs');
    const th = 'https://photos.smugmug.com/Sports/FHS/Game/i-mbm3BtL/0/K2NT34Dm/Th/DSC02247-Th.jpg';
    const want = 'https://photos.smugmug.com/Sports/FHS/Game/i-mbm3BtL/0/K2NT34Dm/M/DSC02247-M.jpg';
    check('the cover is asked for at a usable size', upgradeThumb(th) === want, String(upgradeThumb(th)));
    check('both the path and the filename change', !/Th/.test(upgradeThumb(th)), String(upgradeThumb(th)));
    check('a url that is not a Th is left alone',
      upgradeThumb('https://x/y/M/a-M.jpg') === 'https://x/y/M/a-M.jpg');
    check('and nothing is not something', upgradeThumb(null) === null);
  }

  // Second run: what was fetched last time is reused rather than fetched again.
  const alreadyHeld = [1,2,3].map(n => ({ album_key: 'KJ'+n, source: 'kjcardinal', name: 'FHS Volleyball '+n,
    url: 'https://kjcardinal.smugmug.com/Sports/FHS/g'+n, album_date: '2026-09-01T12:00:00+00:00',
    image_count: 10, sport: 'Volleyball', thumbnail_url: 't', hidden: false, sort_order: null }));
  calls = stub({ held: alreadyHeld });
  r = await runPhotoSync({});
  check('galleries already held are not fetched again',
    calls.filter(c => /\/api\/v2\/album\/KJ\d/.test(c.url) && !c.url.includes('!images')).length === 0,
    String(r.body.sources.kjcardinal.reused));
  check('and are still written, so the prune keeps them',
    r.body.bySource.kjcardinal.rows === 3, String(r.body.bySource.kjcardinal.rows));

  // The defect itself: reused rows arrive from Supabase carrying `hidden` and
  // `sort_order`, freshly fetched ones do not, and PostgREST rejects a batch
  // whose objects disagree. This mixes both in one write.
  const posted = calls.filter(c => c.method === 'POST' && c.url.includes('farmington_albums'))
    .flatMap(c => JSON.parse(c.body));
  const shapes = new Set(posted.map(o => Object.keys(o).sort().join(',')));
  check('reused and fetched galleries are written as one shape', shapes.size === 1,
    [...shapes].join('  ||  '));
  check('and curation columns are never written over',
    ![...shapes][0].includes('hidden') && ![...shapes][0].includes('sort_order'),
    [...shapes][0]);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n13. Telling a Short from a short video');
{
  const { isShort } =
    await import('/root/ball603/ball603-site-main/netlify/functions/sync-farmington-videos.mjs');

  const seen = [];
  const serve = (status) => { globalThis.fetch = async (u, o) => { seen.push({ u: String(u), m: o?.method }); return { status, ok: status === 200 }; }; };

  // youtube.com/shorts/<id> serves a real Short, and bounces anything else.
  serve(200);
  check('a 20-second upload that stays on /shorts/ is one', await isShort('abc', 'PT20S') === true);
  check('and it is asked with a HEAD, not a download', seen[0].m === 'HEAD', String(seen[0].m));
  check('at the shorts url', /youtube\.com\/shorts\/abc/.test(seen[0].u), seen[0].u);

  serve(303);
  check('a 20-second upload that redirects away is not', await isShort('abc', 'PT20S') === false);

  // Duration is only used to avoid asking. This channel has 39 uploads under
  // three minutes and none of them are Shorts, so length alone decides nothing.
  seen.length = 0;
  serve(200);
  check('an hour-long game is never asked about', await isShort('abc', 'PT1H5M30S') === false);
  check('and costs no request', seen.length === 0, String(seen.length));
  check('a live stream reporting P0D is not one either', await isShort('abc', 'P0D') === false);
  check('nor is something with no duration at all', await isShort('abc', null) === false);

  // A network blip must not brand a Short as an ordinary video for good.
  globalThis.fetch = async () => { throw new Error('offline'); };
  check('an unreachable check answers unknown, not false', await isShort('abc', 'PT20S') === null);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n14. Scrimmages are flagged on the way in');
{
  // Arbiter marks a friendly only by titling it. Every fixture that counts has
  // an empty title, so the title is all there is to go on.
  SCHEDULES[4575537].push({
    uniqueGameId: 900099, fromDate: '2026-08-24T15:30:00', gameStatus: 'Normal',
    siteName: 'Farmington CC', eventSubcategoryId: 29, teamGenderId: 2, hslevelId: 1,
    gameTitle: 'Scrimmage', tournamentName: '',
    teams: [
      { uniqueTeamId: 4575537, isHome: true, score: null, teamName: 'Farmington High School-NH', entityId: 4021, myTeam: true },
      { uniqueTeamId: 999, isHome: false, score: null, teamName: 'Newmarket High School', entityId: 5, myTeam: false }
    ]
  });

  const calls = installFetch();
  await handler({ httpMethod: 'GET', queryStringParameters: {} });
  const rows = allRows(calls);
  const scrim = rows.find(r => r.unique_game_id === 900099);
  const normal = rows.find(r => r.unique_game_id === 900001);

  check('the scrimmage is still written, not dropped', !!scrim);
  check('and flagged as one', scrim.is_scrimmage === true, String(scrim?.is_scrimmage));
  check('an ordinary fixture is not', normal.is_scrimmage === false, String(normal.is_scrimmage));
  check('the title is kept as Arbiter gave it', scrim.game_title === 'Scrimmage', String(scrim?.game_title));

  SCHEDULES[4575537].pop();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
