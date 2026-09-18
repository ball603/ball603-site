// The Tigers site, driven against the real table shapes.
import { chromium } from 'playwright';
import { TEAMS, GAMES, STANDINGS, ROSTERS, B6_GAMES, VIDEOS, ALBUMS, STORIES, STORY_WITH_IMAGES, SOCCER_ROSTER } from './fixture2.mjs';
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';

const ROOT = '/root/ball603/ball603-site-main', PORT = 8321;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const WORDMARK = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAlgAAACfCAIAAACqdjCuAAABK0lEQVR42u3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBkXtMAAcHRrSEAAAAASUVORK5CYII=','base64');

const server = http.createServer((q,s)=>{
  let p = decodeURIComponent(q.url.split('?')[0]);
  // The redirects Netlify applies, so the tests exercise the real paths.
  const MAP = {
    '/farmingtontigersnh':'/farmingtontigersnh.html',
    '/farmingtontigersnh/videos':'/farmington-videos.html',
    '/farmingtontigersnh/photos':'/farmington-photos.html',
    '/farmingtontigersnh/news':'/farmington-news.html',
    '/farmingtontigersnh/schedule':'/farmington-schedule.html',
    '/farmingtontigersnh/standings':'/farmington-standings.html',
    '/farmingtontigersnh/rosters':'/farmington-rosters.html'
  };
  if (MAP[p]) p = MAP[p];
  // Any logo, .png or .jpg: the site zip ships without /logos, and the header
  // wordmark is a .jpg — a 404 there trips its onerror and swaps in the text
  // fallback, so every header test would be testing the fallback instead.
  // The wordmark gets a stand-in of its real 600x159 shape, so the tests that
  // measure how wide it is drawn are measuring something with the right ratio.
  if (p === '/logos/farmington-tigers-wordmark.jpg') { s.writeHead(200,{'Content-Type':'image/png'}); return s.end(WORDMARK); }
  if (p.startsWith('/logos/') && /\.(png|jpe?g)$/.test(p)) { s.writeHead(200,{'Content-Type':'image/png'}); return s.end(PNG); }
  const f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    s.writeHead(200,{'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
    return fs.createReadStream(f).pipe(s);
  }
  s.writeHead(404); s.end('nf');
});
await new Promise(r=>server.listen(PORT,r));
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });

let pass=0, fail=0;
const check=(l,c,x='')=>{ console.log(`   ${c?'PASS':'FAIL'}  ${l}${x?'  — '+x:''}`); c?pass++:fail++; };

async function open(page_path, { width=1300, breakDb=false, standings=STANDINGS, games=GAMES, b6fail=false, videos=VIDEOS, albums=ALBUMS, stories=STORIES, rosters=ROSTERS, future=false } = {}) {
  /* Service workers blocked. This suite is about what the pages do, and the
     Tigers site now installs a worker that caches farmington.js — which means
     one section could serve a later section a stale script and the failure
     would look like a bug in whatever ran last. The worker has its own suite
     (pwa.test.mjs) where it is the thing under test. */
  const ctx = await browser.newContext({ viewport:{width,height:1100}, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  // Thursday 17 September 2026, 10am. The week runs Sun 13 – Sat 19.
  // `future: true` rewinds to August, before anything has been played.
  await page.addInitScript((pre)=>{ const F=new Date(2026, pre?7:8, pre?1:17, 10,0,0).getTime(); const R=Date;
    Date=class extends R{constructor(...a){return a.length?new R(...a):new R(F);}static now(){return F;}};
    Date.prototype=R.prototype; }, future);

  await page.route('**/rest/v1/**', r=>{
    const u = r.request().url();
    if (breakDb) return r.fulfill({ status:500, body:'boom' });
    if (u.includes('farmington_teams')) return r.fulfill({ json: TEAMS });
    if (u.includes('farmington_games')) return r.fulfill({ json: games });
    if (u.includes('farmington_standings')) return r.fulfill({ json: standings });
    if (u.includes('farmington_videos')) return r.fulfill({ json: videos });
    if (u.includes('farmington_albums')) return r.fulfill({ json: albums });
    // The read policy only returns published rows, so the stub does too.
    if (u.includes('farmington_stories')) return r.fulfill({ json: stories.filter(s => s.published) });
    if (u.includes('roster_submissions')) return r.fulfill({ json: rosters });
    // Ball603's own standings, where the NHIAA points come from.
    if (u.includes('/standings?')) return r.fulfill({ json: [
      { school: 'Farmington', gender: 'Girls', points: 20, season: '2026' },
      { school: 'Nute',       gender: 'Girls', points: 24, season: '2026' },
      { school: 'Epping',     gender: 'Girls', points: 12, season: '2026' }
    ] });
    return r.fulfill({ json: [] });
  });
  // Arbiter's school crests. Without this they 404 and the onerror handler
  // pulls them out of the DOM, so a logo test would be testing the fallback.
  await page.route('**assets.arbitersports.com**', r =>
    r.fulfill({ status:200, contentType:'image/png', body: PNG }));
  await page.route('**/functions/get-games*', r =>
    b6fail ? r.fulfill({ status:500, body:'no' }) : r.fulfill({ json:{ games: B6_GAMES } }));

  await page.goto(`http://localhost:${PORT}${page_path}`, { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(800);
  return { page, ctx, errors };
}

// ── 1 ───────────────────────────────────────────────────────────────────────
console.log('\n1. Header');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh');
  const nav = await page.locator('.ft-navlink').allTextContents();
  check('nav is Schedule, Standings, Rosters, Photos, Videos',
    nav.join('/') === 'Schedule/Standings/Rosters/Photos/Videos', nav.join('/'));
  check('News is gone from the nav', !nav.includes('News'), nav.join('/'));
  check('the wordmark is the logo',
    (await page.locator('.ft-logo img').getAttribute('src')).includes('farmington-tigers-wordmark'));
  const bg = await page.locator('.ft-header').evaluate(e=>getComputedStyle(e).backgroundColor);
  check('header is pure black, so the logo does not read as a box', bg === 'rgb(0, 0, 0)', bg);
  const border = await page.locator('.ft-header').evaluate(e=>getComputedStyle(e).borderBottomColor);
  check('with the Ball603 orange hairline', border === 'rgb(246, 130, 32)', border);
  for (const [n,f] of [['Facebook','facebook.com/FarmingtonTigersNH'],['Instagram','instagram.com/farmingtontigersnh'],['X','x.com/FHStigersnh']])
    check(n+' links out', await page.locator(`.ft-social[href*="${f}"]`).count() === 1);
  check('no inline <style> anywhere', await page.locator('style').count() === 0);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 2 ───────────────────────────────────────────────────────────────────────
console.log('\n2. Recent Results and Upcoming Events');
{
  // Clock is Thursday 17 September. The last day that produced a result is
  // Wednesday the 16th (golf, won 50–41); the next day with anything still to
  // play is today, which has soccer at 4pm and a cross country meet at 9am.
  const { page, ctx, errors } = await open('/farmingtontigersnh');
  const heads = (await page.locator('.ft-card-head h2').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim());
  check('the week box is gone', !heads.some(h=>/Tiger Town/.test(h)), heads.join('/'));
  // Yesterday was the 16th and today the 17th, so both boxes name the day.
  check('the results box is headed Yesterday\'s Results', heads.includes("Yesterday's Results"), heads.join('/'));
  check('the events box is headed Today\'s Events', heads.includes("Today's Events"), heads.join('/'));
  check('the accent word stays orange', await page.locator('#recentHead .ft-accent').textContent() === 'Results' &&
    await page.locator('#upcomingHead .ft-accent').textContent() === 'Events');

  const recent = (await page.textContent('#recentBody')).replace(/\s+/g,' ');
  check('recent opens on the last day played', /September 16/.test(recent), recent.slice(0,90));
  check('with the result on it', /W 50–41/.test(recent), recent.slice(0,140));
  check('and nothing from today', !/September 17/.test(recent), recent.slice(0,140));
  check('older results are not dragged in', !/September 15|September 12/.test(recent));

  const up = (await page.textContent('#upcomingBody')).replace(/\s+/g,' ');
  check('upcoming opens on the next day with games', /September 17/.test(up), up.slice(0,90));
  check('the date line is just the date, with no "Today ·" in front',
    /^\s*Thursday, September 17/.test(up) && !/Today/.test(up), up.slice(0,60));
  check('and still orange, as today\'s date', await page.locator('#upcomingBody .ft-week-day.today').count() === 1);
  check('both of today\'s events are listed', /Newport/.test(up) && /6-school meet/.test(up), up.slice(0,200));
  check('each one names its team', /Varsity Soccer/.test(up) && /Jr\. High Cross Country/.test(up), up.slice(0,220));
  check('kick-off times, not results', /4:00PM/.test(up), up.slice(0,200));
  check('nothing from further out', !/September 18|September 19/.test(up));
  check('a hidden team never appears', !/Somersworth/.test(up + recent));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// A season that has not started: no results anywhere, but the schedule is full.
{
  const { page, ctx, errors } = await open('/farmingtontigersnh', { future: true });
  check('before the first game, recent says so',
    /No Tigers games played yet/.test(await page.textContent('#recentBody')),
    (await page.textContent('#recentBody')).replace(/\s+/g,' ').slice(0,80));
  check('and upcoming still has the opener',
    /September/.test(await page.textContent('#upcomingBody')),
    (await page.textContent('#upcomingBody')).replace(/\s+/g,' ').slice(0,80));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// The live case that broke it, 18 Sept 2026: yesterday's games were a Jr. High
// volleyball match and a meet, and Arbiter had no score for either. The box
// used to skip them and fall back to the last day with a number on it.
{
  const clone = (id, o) => ({ ...GAMES.find(g => g.unique_game_id === id), ...o });
  const games = [
    ...GAMES.filter(g => g.game_date !== '2026-09-16'),
    clone(60, { unique_game_id: 901, game_date: '2026-09-16', starts_at: '2026-09-16T16:30:00',
                opponent_name: 'Portsmouth Middle School', opponent_ball603: null }),
    clone(65, { unique_game_id: 902, game_date: '2026-09-16', starts_at: '2026-09-16T16:00:00' }),
    clone(40, { unique_game_id: 903, game_date: '2026-09-16', starts_at: '2026-09-16T17:00:00',
                opponent_name: 'Kingswood Regional High School', opponent_ball603: 'Kingswood' })
  ];
  // Premise: the fixture really has yesterday unscored and an older scored day.
  check('premise — nothing on the 16th has a score',
    games.filter(g => g.game_date === '2026-09-16').every(g => g.arbiter_my_score == null && g.manual_my_score == null));
  check('premise — the 15th does', games.some(g => g.game_date === '2026-09-15' && g.arbiter_my_score != null));

  const { page, ctx, errors } = await open('/farmingtontigersnh', { games });
  const recent = (await page.textContent('#recentBody')).replace(/\s+/g,' ');
  check('an unscored yesterday is still the most recent day', /September 16/.test(recent), recent.slice(0,90));
  check('not the older day that happens to have a score', !/September 15/.test(recent), recent.slice(0,90));
  check('every game from that day is listed',
    /Portsmouth/.test(recent) && /6-school meet/.test(recent) && /Kingswood/.test(recent), recent.slice(0,260));
  check('a match with no score says so', /Portsmouth.*No score yet/.test(recent), recent.slice(0,260));
  check('a meet reads as finished', /6-school meet.*Final/.test(recent), recent.slice(0,260));
  check('a postponed game says postponed', /Kingswood.*Postponed/.test(recent), recent.slice(0,260));
  check('and no kick-off times, which would read as still to come', !/\d:\d\d[AP]M/.test(recent), recent.slice(0,260));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}
// A result already in from today moves the box to today, with only the
// finished game — tonight's unplayed ones stay in Upcoming.
{
  const games = GAMES.map(g => g.unique_game_id === 41
    ? { ...g, arbiter_my_score: 2, arbiter_opp_score: 1, arbiter_result: 'W' } : g);
  const { page, ctx } = await open('/farmingtontigersnh', { games });
  const recent = (await page.textContent('#recentBody')).replace(/\s+/g,' ');
  const up = (await page.textContent('#upcomingBody')).replace(/\s+/g,' ');
  check('a score from today makes today the recent day', /September 17/.test(recent) && /W 2–1/.test(recent), recent.slice(0,140));
  check('and the box says Today\'s Results',
    (await page.textContent('#recentHead')).replace(/\s+/g,' ').trim() === "Today's Results",
    await page.textContent('#recentHead'));
  check('without today\'s unplayed meet', !/6-school meet/.test(recent), recent.slice(0,140));
  check('which is still upcoming', /6-school meet/.test(up), up.slice(0,140));
  check('and the scored game is not in both boxes', !/Newport/.test(up), up.slice(0,140));
  await ctx.close();
}
// Today with nothing scored yet is not "recent": yesterday is.
{
  const { page, ctx } = await open('/farmingtontigersnh');
  const recent = (await page.textContent('#recentBody')).replace(/\s+/g,' ');
  check('unplayed games today leave the box on yesterday', /September 16/.test(recent) && !/September 17/.test(recent), recent.slice(0,90));
  await ctx.close();
}
// Neither box on yesterday / today: they fall back to Recent and Upcoming.
{
  const games = GAMES.filter(g => g.game_date !== '2026-09-16' && g.game_date !== '2026-09-17');
  check('premise — nothing on the 16th or 17th',
    !games.some(g => g.game_date === '2026-09-16' || g.game_date === '2026-09-17'));
  check('premise — an older result and a later game exist',
    games.some(g => g.game_date === '2026-09-15' && g.arbiter_my_score != null) &&
    games.some(g => g.game_date === '2026-09-18'));
  const { page, ctx } = await open('/farmingtontigersnh', { games });
  const rh = (await page.textContent('#recentHead')).replace(/\s+/g,' ').trim();
  const uh = (await page.textContent('#upcomingHead')).replace(/\s+/g,' ').trim();
  const recent = (await page.textContent('#recentBody')).replace(/\s+/g,' ');
  const up = (await page.textContent('#upcomingBody')).replace(/\s+/g,' ');
  check('a day before yesterday is Recent Results', rh === 'Recent Results' && /September 15/.test(recent), `${rh} | ${recent.slice(0,60)}`);
  check('tomorrow is Upcoming Events, not Today\'s', uh === 'Upcoming Events' && /September 18/.test(up), `${uh} | ${up.slice(0,60)}`);
  await ctx.close();
}

// ── 3 ───────────────────────────────────────────────────────────────────────
console.log('\n3. Home standings box');
{
  const { page, ctx } = await open('/farmingtontigersnh');
  const chips = await page.locator('#standChips .ft-pill').allTextContents();
  check('one chip per in-season varsity sport', chips.length === 3, chips.join('/'));
  check('volleyball first', /Volleyball/.test(chips[0]), chips.join('/'));

  // The same segmented control as the standings page, not a row of orange
  // capsules: white pill on a grey track, orange text when selected.
  check('the selector is the shared pill control',
    await page.locator('#standChips .ft-pills').count() === 1 &&
    await page.locator('#standChips .ft-chip').count() === 0);
  const on = page.locator('#standChips .ft-pill.on');
  const st = await on.evaluate(e => { const s = getComputedStyle(e);
    return { bg: s.backgroundColor, color: s.color, radius: s.borderTopLeftRadius }; });
  check('the selected sport is not an orange box', st.bg !== 'rgb(246, 130, 32)', JSON.stringify(st));
  check('it is orange text on white instead',
    st.bg === 'rgb(255, 255, 255)' && /2[0-9]{2}, 9[0-9], /.test(st.color) === false && st.color !== 'rgb(17, 17, 17)',
    JSON.stringify(st));
  check('and the corners match the standings pills', st.radius === '6px', st.radius);
  const pageRadius = await open('/farmingtontigersnh/standings')
    .then(async r => { const v = await r.page.locator('#sportPills .ft-pill.on')
      .evaluate(e => getComputedStyle(e).borderTopLeftRadius); await r.ctx.close(); return v; });
  check('the two pages agree on the shape', st.radius === pageRadius, `${st.radius} vs ${pageRadius}`);
  // The table holds every division; this box shows only the Tigers' own.
  check('only divisions Farmington is in', !/Salem|Bedford|Hollis/.test(await page.textContent('#standBody')),
    (await page.textContent('#standBody')).replace(/\s+/g,' ').slice(0,100));
  check('Farmington highlighted', await page.locator('#standBody tr.ft-us').count() === 1);

  // "Full standings" used to be a bare link, so it always opened on whatever
  // sport the standings page happened to list first.
  const vbHref = await page.getAttribute('#standMore', 'href');
  check('full standings carries the sport being shown', /sport=63%7C2/.test(vbHref), vbHref);
  check('and the division with it', /division=63%7C2%7CDivision\+III/.test(vbHref), vbHref);

  await page.click('#standChips .ft-pill:has-text("Football")');
  await page.waitForTimeout(300);
  check('switching sport works', /Farmington-Nute/.test(await page.textContent('#standBody')));
  const fbHref = await page.getAttribute('#standMore', 'href');
  check('and the link follows the chip', /sport=25%7C1/.test(fbHref), fbHref);
  await ctx.close();
}

// The link is only worth carrying if the standings page acts on it.
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/standings?sport=25%7C1&division=25%7C1%7CDIV');
  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('a deep link opens on football, not the first sport', /Football/.test(bar), bar);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 3b ──────────────────────────────────────────────────────────────────────
console.log('\n3b. Home standings box is a top ten');
{
  // A fourteen-school division, Farmington twelfth in it.
  const row = (rank, name, us) => ({
    rankings_group_id: 335, unique_team_id: 900 + rank, group_name: '',
    division_name: 'Division III', sport_id: 63, gender_id: 2, level_id: 31, season: '2026',
    rank, team_name: name, school_logo_url: null, is_farmington: !!us,
    ball603_shortname: name, games_played: 6, wins: 14 - rank, losses: rank - 1,
    ties: null, points: null, rating: 1, record: null, extra: {}
  });
  const big = Array.from({ length: 14 }, (_, i) => row(i + 1, 'School' + (i + 1), false));
  const near = big.map(r => ({ ...r }));
  near[1] = { ...near[1], team_name: 'Farmington High School-NH', ball603_shortname: 'Farmington',
              is_farmington: true, unique_team_id: 4575537 };
  const far = big.map(r => ({ ...r }));
  far[11] = { ...far[11], team_name: 'Farmington High School-NH', ball603_shortname: 'Farmington',
              is_farmington: true, unique_team_id: 4575537 };

  {
    const { page, ctx } = await open('/farmingtontigersnh', { standings: near });
    check('a long division is cut to ten', await page.locator('#standBody tbody tr').count() === 10,
      String(await page.locator('#standBody tbody tr').count()));
    check('the eleventh is not shown', !/School11/.test(await page.textContent('#standBody')));
    check('Farmington is in it on merit', await page.locator('#standBody tr.ft-us').count() === 1);
    await ctx.close();
  }
  {
    const { page, ctx } = await open('/farmingtontigersnh', { standings: far });
    const rows = await page.locator('#standBody tbody tr').count();
    check('still ten rows when Farmington is outside the ten', rows === 10, String(rows));
    check('the tenth is given up to them', !/School10/.test(await page.textContent('#standBody')),
      (await page.textContent('#standBody')).replace(/\s+/g,' ').slice(0,160));
    check('the ninth is kept', /School9/.test(await page.textContent('#standBody')));
    const last = (await page.locator('#standBody tbody tr').last().textContent()).replace(/\s+/g,' ').trim();
    check('and Farmington sits at the bottom at its real rank', /^12\s*Farmington/.test(last), last);
    check('highlighted there too', await page.locator('#standBody tbody tr:last-child.ft-us').count() === 1);
    await ctx.close();
  }
}

// ── 4 ───────────────────────────────────────────────────────────────────────
console.log('\n4. Schedule — columns and defaults');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule');
  const head = (await page.locator('.ft-table thead').first().textContent()).replace(/\s+/g,' ').trim();
  check('columns are Date, sport, Level, Gender, Match-up, Time/Result, Location',
    /Date/.test(head) && /Level/.test(head) && /Gender/.test(head) &&
    /Match-up/.test(head) && /Time\/Result/.test(head) && /Location/.test(head), head);

  // The front door is the composite, not a guess at which sport matters today.
  check('opens on All Sports',
    /All Sports/.test(await page.textContent('#sportChips .ft-pill.on')),
    (await page.textContent('#sportChips .ft-pill.on')).trim());
  check('so no sport can hijack the front door',
    !/Cross Country|Volleyball|Soccer/.test(await page.textContent('#sportChips .ft-pill.on')));
  check('and no level row is offered yet', await page.locator('#teamPicker .ft-pill').count() === 0);

  await page.click('#sportChips .ft-pill:has-text("Soccer")');
  await page.waitForTimeout(300);
  const activeTeam = await page.getAttribute('#teamPicker .ft-pill.on', 'data-team');
  check('picking a sport still lands on its varsity side', activeTeam === '11770124', String(activeTeam));

  const opts = await page.locator('#teamPicker .ft-pill').allTextContents();
  check('levels read Varsity, JV, Jr. High in that order',
    opts[0].trim() === 'Varsity' && opts[1].trim() === 'JV' && /Jr\. High/.test(opts[2]), opts.join(' | '));

  // A single-team sport shows no level row at all rather than one lonely pill.
  await page.click('#sportChips .ft-pill:has-text("Cross Country")');
  await page.waitForTimeout(300);
  check('a one-team sport shows no level pills',
    await page.locator('#teamPicker .ft-pill').count() === 0);
  check('and still selects that team',
    /Cross Country/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());
  check('no team is called 7/8th or MS', !/7\/8th|MS JV|MS Varsity/.test(opts.join(' ')), opts.join(' | '));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 4a ──────────────────────────────────────────────────────────────────────
console.log('\n4a. Date on one line, venue behind the pin');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule');
  const cell = await page.locator('tbody .ft-datecell').first();
  const txt = (await cell.textContent()).replace(/\s+/g,' ').trim();
  check('the date reads as one phrase', /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(txt), txt);
  // How many visual lines the text actually occupies, rather than a guess from
  // the cell's height.
  const lines = await cell.evaluate(e => {
    const r = document.createRange();
    r.selectNodeContents(e);
    const tops = new Set([...r.getClientRects()].map(x => Math.round(x.top)));
    return tops.size;
  });
  check('on a single line', lines === 1, String(lines));
  check('the weekday no longer sits on its own row',
    await cell.evaluate(e => getComputedStyle(e.querySelector('b')).display) === 'inline',
    await cell.evaluate(e => getComputedStyle(e.querySelector('b')).display));

  // The column is the pin and nothing else.
  const venueCell = page.locator('tbody tr td').nth(6);
  check('the venue column carries no text', (await venueCell.textContent()).replace(/\s+/g,'') === '\u{1F4CD}',
    JSON.stringify((await venueCell.textContent()).trim()));
  // And on a phone it goes entirely: the pin is the least-wanted column and the
  // one that costs the most width, so the narrow table spends that width on the
  // match-up instead.
  check('and on a phone the column comes off altogether',
    await venueCell.evaluate(e => e.classList.contains('ft-hide-sm')));
  check('the address is not spelled out anywhere in the table',
    !/Franklin High School|Farmington CC/.test(await page.textContent('tbody')),
    (await page.textContent('tbody')).replace(/\s+/g,' ').slice(0,120));

  // But one click still produces it.
  await page.locator('tbody .ft-pin').first().click();
  await page.waitForTimeout(250);
  const v = (await page.textContent('.ft-venue')).replace(/\s+/g,' ').trim();
  check('the pin opens the venue', await page.locator('.ft-venue.on').count() === 1);
  check('naming the site', /\w/.test(v), v.slice(0,80));
  check('and nothing else', await page.locator('.ft-venue a').count() === 0,
    String(await page.locator('.ft-venue a').count()));
  await page.keyboard.press('Escape');
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 5 ───────────────────────────────────────────────────────────────────────
console.log('\n4b. All Sports');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule');
  const first = (await page.locator('#sportChips .ft-pill').first().textContent()).trim();
  check('All Sports sits on the left', /All Sports/.test(first), first);

  await page.click('#sportChips .ft-pill:has-text("All Sports")');
  await page.waitForTimeout(400);

  const rows = await page.locator('tbody tr').count();
  // 21 fixture games, less the hidden team's one, less the JV2 duplicate.
  check('every game from every team, de-duplicated', rows === 19, String(rows));
  const txt = await page.textContent('tbody');
  for (const [what, re] of [['volleyball',/Hillsboro-Deering/],['football',/Farmington-Nute|8–20/],
                            ['golf',/Inter-Lakes/],['soccer',/Gilford/],['Jr. High',/Chichester/]])
    check(`includes ${what}`, re.test(txt));
  check('a hidden team is still excluded', !/Somersworth/.test(txt));
  check('no level pills in this mode', await page.locator('#teamPicker .ft-pill').count() === 0);
  check('and no blended record in the bar', !/Home/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());
  check('the bar still says what this is', /Every Team/.test(await page.textContent('.ft-cardbar')));
  check('rows are in date order', await page.evaluate(() =>
    [...document.querySelectorAll('tbody .ft-datecell b')].map(e=>e.textContent).join('|')).then(d => d.startsWith('Sep 2')));

  // Choosing a sport comes back to that sport's varsity side.
  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(400);
  check('picking a sport defaults to Varsity',
    (await page.textContent('#teamPicker .ft-pill.on')).trim() === 'Varsity',
    await page.textContent('#teamPicker .ft-pill.on'));
  check('and the bar carries stats again', /\d+–\d+ Home/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

console.log('\n5. Schedule — the black bar');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(400);
  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('bar names the team', bar.startsWith('Varsity Volleyball'), bar);
  check('record counts the manual result', /2–1/.test(bar), bar);
  check('home split', /1–1 Home/.test(bar), bar);
  check('away split', /1–0 Away/.test(bar), bar);
  check('streak', /W1/.test(bar), bar);
  // Four figures and the season, so four separators between the five of them.
  check('the figures are separated by bullets',
    (await page.locator('.ft-bardot').count()) === 4, String(await page.locator('.ft-bardot').count()));
  check('HOME and AWAY are upper case on screen',
    await page.locator('.ft-barstats em').first().evaluate(e=>getComputedStyle(e).textTransform) === 'uppercase');
  check('no last-game or next-game blocks', await page.locator('.ft-summary').count() === 0);
  check('nothing beside the page heading',
    (await page.textContent('.ft-pagehead')).trim() === 'Schedule',
    await page.textContent('.ft-pagehead'));
  await ctx.close();
}

console.log('\n6. Schedule — rows');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(300);
  const first = page.locator('tbody tr').first();
  const t = (await first.textContent()).replace(/\s+/g,' ');
  check('date column', /Sep 2/.test(t) && /Wed/.test(t), t);
  check('sport emoji', /\u{1F3D0}/u.test(await first.locator('.ft-sport-emoji').textContent()));
  check('level reads Varsity', (await first.locator('.ft-level').first().textContent()).trim() === 'Varsity');
  check('gender reads Girls', /Girls/.test(t), t);
  check('vs for a home game', /vs/.test(await first.locator('.ft-ha').textContent()));
  check('result', /W 3–0/.test(t), t);
  // The venue lives behind the pin now, not in the row.
  check('location is a pin, not an address',
    /\u{1F4CD}/u.test(t) && !/Farmington HS/.test(t), t);

  // Ball603 covers volleyball, so opponents link out in a new tab.
  const link = first.locator('.ft-teamlink');
  check('opponent links to Ball603', (await link.getAttribute('href')) === 'https://ball603.com/hillsborodeering');
  check('and opens in a new tab', (await link.getAttribute('target')) === '_blank');
  await ctx.close();
}

// ── 7 ───────────────────────────────────────────────────────────────────────
console.log('\n6b. Splits work for sports Ball603 does not cover');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Golf")');
  await page.waitForTimeout(400);
  const s = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ');
  check('golf gets a home split too', /1–0 Home/.test(s), s.trim());
  check('and a streak', /W1/.test(s), s.trim());

  await page.click('#sportChips .ft-pill:has-text("Football")');
  await page.waitForTimeout(400);
  const f = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ');
  check('football too', /0–1 Home/.test(f), f.trim());
  check('with a losing streak', /L1/.test(f), f.trim());
  await ctx.close();
}

console.log('\n6c. Gender selector');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule');

  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(400);
  check('one-gender sport shows no gender row',
    await page.locator('#genderPills .ft-pill').count() === 0);

  await page.click('#sportChips .ft-pill:has-text("Basketball")');
  await page.waitForTimeout(400);
  // Coming from volleyball, which is Girls — basketball must still open on Boys.
  const genders = (await page.locator('#genderPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('basketball splits Boys and Girls', genders.join('/') === 'Boys/Girls', genders.join('/'));
  check('and opens on the first', (await page.textContent('#genderPills .ft-pill.on')).trim() === 'Boys');

  // The point of the gender row: levels no longer repeat themselves.
  const levels = (await page.locator('#teamPicker .ft-pill').allTextContents()).map(t=>t.trim());
  check('levels say Varsity and JV once each', levels.join('/') === 'Varsity/JV', levels.join('/'));
  check('bar names the boys team', /Varsity Boys Basketball/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());

  await page.click('#genderPills .ft-pill:has-text("Girls")');
  await page.waitForTimeout(400);
  check('switching gender switches team', /Varsity Girls Basketball/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());
  const gLevels = (await page.locator('#teamPicker .ft-pill').allTextContents()).map(t=>t.trim());
  check('girls have varsity only, so no level row', gLevels.length === 0, gLevels.join('/'));
  check('and the table follows', /Pittsfield/.test(await page.textContent('tbody')));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

console.log('\n7. Links only where Ball603 covers the sport');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Golf")');
  await page.waitForTimeout(300);
  const golf = (await page.textContent('tbody')).replace(/\s+/g,' ');
  check('golf opponent is named', /Inter-Lakes/.test(golf), golf);
  check('but not linked', await page.locator('tbody .ft-teamlink').count() === 0);

  await page.click('#sportChips .ft-pill:has-text("Football")');
  await page.waitForTimeout(300);
  check('football is not linked either', await page.locator('tbody .ft-teamlink').count() === 0);

  await page.click('#sportChips .ft-pill:has-text("Soccer")');
  await page.waitForTimeout(300);
  check('nor soccer', await page.locator('tbody .ft-teamlink').count() === 0);
  await ctx.close();
}

// ── 8 ───────────────────────────────────────────────────────────────────────
console.log('\n8. Merged teams');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Soccer")');
  await page.waitForTimeout(300);
  const opts = await page.locator('#teamPicker .ft-pill').allTextContents();
  check('soccer lists three levels, not five', opts.length === 3, opts.join(' | '));
  check('no Coed soccer entry survives', !/Coed/.test(opts.join(' ')), opts.join(' | '));

  await page.click('#teamPicker .ft-pill:has-text("Jr. High")');
  await page.waitForTimeout(300);
  const rows = await page.locator('tbody tr').allTextContents();
  check('Jr. High Soccer has all three merged games', rows.length === 3, String(rows.length));
  check('including the Coed MS one', rows.join(' ').includes('Pittsfield'));
  check('and the mislabelled Coed JV one', rows.join(' ').includes('Paul Elementary'));

  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(300);
  await page.click('#teamPicker .ft-pill:text-is("Jr. High - JV")');
  await page.waitForTimeout(300);
  const vb = await page.locator('tbody tr').allTextContents();
  check('the JV2 duplicate is not shown twice', vb.filter(r=>/Nottingham/.test(r)).length === 1,
    vb.map(r=>r.replace(/\s+/g,' ').slice(0,40)).join(' || '));
  check('but its unique game is kept', vb.some(r=>/Strafford/.test(r)), String(vb.length));
  await ctx.close();
}

// ── 9 ───────────────────────────────────────────────────────────────────────
console.log('\n9. Standings page');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/standings');

  const sportPills = (await page.locator('#sportPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('a pill per sport, not per division', sportPills.length === 3, sportPills.join('/'));
  check('football listed once despite two Arbiter groups',
    sportPills.filter(p => /Football/.test(p)).length === 1, sportPills.join('/'));
  check('no gender prefix while each sport has one team',
    sportPills.every(p => !/Girls|Boys|Coed/.test(p)), sportPills.join('/'));

  // The table still holds every division of every sport Farmington plays, but
  // this page shows only the one they are in — there is no choice to offer.
  check('no division row', await page.locator('#divisionPills .ft-pill').count() === 0);

  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('dark bar reads gender, level, sport, division',
    bar.startsWith('Girls Varsity Volleyball \u2013 Division III'), bar);
  check('no playoff line on volleyball', await page.locator('.ft-playoffline').count() === 0, bar);

  const us = (await page.textContent('tr.ft-us')).replace(/\s+/g,' ');
  check('Farmington highlighted with its record', /5–1/.test(us), us);
  check('postseason from Ball603 games', /0–1/.test(us), us);
  check('overall spans both halves of the season', /2–2/.test(us), us);
  check('streak reads off the last result', /L1/.test(us), us);
  check('rank is styled as the headline number', await page.locator('.ft-rank').count() > 0);

  check('other divisions are not on screen',
    !/Salem|Bedford|Hollis/.test(await page.textContent('tbody')),
    (await page.textContent('tbody')).replace(/\s+/g,' ').slice(0,100));
  check('NHIAA points are shown, not a rating', /Points/.test(await page.textContent('thead')),
    (await page.textContent('thead')).replace(/\s+/g,' ').trim());

  // Football: no Ball603 coverage, so reduced columns and no invented field size.
  await page.click('#sportPills .ft-pill:has-text("Football")');
  await page.waitForTimeout(400);
  const fhead = (await page.textContent('thead')).replace(/\s+/g,' ');
  check('football falls back to the reduced columns', !/Postseason/.test(fhead), fhead);
  check('no playoff line is invented for it',
    await page.locator('.ft-playoffline').count() === 0);
  // Two Arbiter groups publish this same bracket. It must appear once.
  check('football shows no division row either',
    await page.locator('#divisionPills .ft-pill').count() === 0);
  check('the duplicated bracket is shown once',
    await page.locator('tbody tr').count() === 2, String(await page.locator('tbody tr').count()));
  check('and Farmington appears once in it',
    await page.locator('tr.ft-us').count() === 1, String(await page.locator('tr.ft-us').count()));
  check('and only the DIV bracket Farmington is in, spelled out',
    /Division IV/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());
  // There is no girls football to tell this apart from.
  const fbar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('football is not called Boys', fbar.startsWith('Varsity Football – Division IV'), fbar);

  await page.click('#sportPills .ft-pill:has-text("Golf")');
  await page.waitForTimeout(400);
  const gbar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('and golf is not called Coed', gbar.startsWith('Varsity Golf –'), gbar);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 9b ──────────────────────────────────────────────────────────────────────
console.log('\n9b. Soccer — the co-op crest');
{
  // Arbiter files the Farmington-Nute soccer side under Nute's logo. On this
  // site the Tigers wear their own, whoever they co-op with.
  const NUTE_LOGO = 'https://assets.arbitersports.com/logos/organization/1';
  const soccer = [
    { rankings_group_id: 400, unique_team_id: 11770124, group_name: '', division_name: 'Division III',
      sport_id: 50, gender_id: 1, level_id: 31, season: '2026', rank: 1,
      team_name: 'Farmington-Nute', school_logo_url: NUTE_LOGO, is_farmington: true,
      ball603_shortname: 'Farmington', games_played: 5, wins: 4, losses: 1,
      ties: null, points: null, rating: 0.8, record: null, extra: {} },
    { rankings_group_id: 400, unique_team_id: 777, group_name: '', division_name: 'Division III',
      sport_id: 50, gender_id: 1, level_id: 31, season: '2026', rank: 2,
      team_name: 'Newport-Mtn. Royal', school_logo_url: NUTE_LOGO, is_farmington: false,
      ball603_shortname: 'Newport', games_played: 5, wins: 3, losses: 2,
      ties: null, points: null, rating: 0.6, record: null, extra: {} }
  ];
  const { page, ctx, errors } = await open('/farmingtontigersnh/standings', { standings: soccer });
  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('soccer is not called Boys', bar.startsWith('Varsity Soccer – Division III'), bar);
  const usLogo = await page.getAttribute('tr.ft-us img', 'src');
  check('Farmington flies the Tiger crest, not Nute\'s',
    usLogo === '/logos/100px/Farmington.png', String(usLogo));
  const theirs = await page.getAttribute('tbody tr:not(.ft-us) img', 'src');
  check('everybody else keeps Arbiter\'s logo', theirs === NUTE_LOGO, String(theirs));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// And the same on the home page box.
{
  const NUTE_LOGO = 'https://assets.arbitersports.com/logos/organization/1';
  const soccer = [
    { rankings_group_id: 400, unique_team_id: 11770124, group_name: '', division_name: 'Division III',
      sport_id: 50, gender_id: 1, level_id: 31, season: '2026', rank: 1,
      team_name: 'Farmington-Nute', school_logo_url: NUTE_LOGO, is_farmington: true,
      ball603_shortname: 'Farmington', games_played: 5, wins: 4, losses: 1,
      ties: null, points: null, rating: 0.8, record: null, extra: {} }
  ];
  const { page, ctx } = await open('/farmingtontigersnh', { standings: soccer });
  check('the home box uses the Tiger crest too',
    await page.getAttribute('#standBody tr.ft-us img', 'src') === '/logos/100px/Farmington.png',
    String(await page.getAttribute('#standBody tr.ft-us img', 'src')));
  const chip = (await page.locator('#standChips .ft-pill').first().textContent()).replace(/\s+/g,' ').trim();
  check('and the chip is not called Boys Soccer', !/Boys/.test(chip), chip);
  await ctx.close();
}

// ── 10 ──────────────────────────────────────────────────────────────────────
console.log('\n10. Standings when Ball603 games are unavailable');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/standings', { b6fail: true });
  const head = (await page.textContent('#standBody thead')).replace(/\s+/g,' ');
  check('falls back rather than breaking', !/Postseason/.test(head), head);
  check('the table still renders', await page.locator('#standBody tbody tr').count() === 3);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 11 ──────────────────────────────────────────────────────────────────────
console.log('\n11. Rosters');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/rosters');

  const sports = (await page.locator('#sportPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('a pill per sport with a roster', sports.length === 3, sports.join('/'));
  check('in playing order', /Volleyball/.test(sports[0]), sports.join('/'));
  check('nothing beside the heading',
    (await page.textContent('.ft-pagehead')).trim() === 'Rosters', await page.textContent('.ft-pagehead'));

  // Volleyball: one gender, two seasons.
  check('single-gender sport shows no gender row',
    await page.locator('#genderPills .ft-pill').count() === 0);
  const seasons = (await page.locator('#seasonPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('both volleyball seasons offered', seasons.join('/') === '2026/2025', seasons.join('/'));
  check('and it opens on the newest', (await page.textContent('#seasonPills .ft-pill.on')).trim() === '2026');

  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('black bar names the team, level and all', bar.startsWith('Girls Varsity Volleyball'), bar);
  check('with the squad size', /3 Players/.test(bar), bar);
  check('division and season', /D-III/.test(bar) && /2026/.test(bar), bar);
  check('bullet separators', await page.locator('.ft-cardbar .ft-bardot').count() === 2);

  const head = await page.textContent('.ft-table thead');
  check('uses Class, the field rosters carry', /Class/.test(head), head.replace(/\s+/g,' ').trim());
  check('no empty Ht column', !/Ht/.test(head));
  const order = (await page.locator('.ft-rostertable thead th').allTextContents()).map(t => t.trim());
  check('Class comes before Pos', order.indexOf('Class') < order.indexOf('Pos'), order.join('/'));
  check('and both after the player', order.indexOf('Player') < order.indexOf('Class'), order.join('/'));
  check('players listed', await page.locator('tbody tr').count() === 3);
  check('coach shown', /Tarsha Doyle/.test(await page.textContent('.ft-coaches')));
  check('but not bolded', await page.locator('.ft-coaches b').count() === 0);

  // Switching season swaps the roster.
  await page.click('#seasonPills .ft-pill:has-text("2025")');
  await page.waitForTimeout(300);
  check('last season loads', /Past Player/.test(await page.textContent('tbody')));

  // Basketball: two genders.
  await page.click('#sportPills .ft-pill:has-text("Basketball")');
  await page.waitForTimeout(300);
  const genders = (await page.locator('#genderPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('basketball splits Boys and Girls', genders.join('/') === 'Boys/Girls', genders.join('/'));
  check('and opens on Boys, not the Girls carried from volleyball',
    (await page.textContent('#genderPills .ft-pill.on')).trim() === 'Boys');
  check('showing the boys roster', /Owen Blake/.test(await page.textContent('tbody')));

  await page.click('#genderPills .ft-pill:has-text("Girls")');
  await page.waitForTimeout(300);
  check('switching gender switches roster', /Riley Perkins/.test(await page.textContent('tbody')));
  check('and the bar follows', /Girls Varsity Basketball/.test(await page.textContent('.ft-cardbar')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim());
  check('one season means no season row',
    await page.locator('#seasonPills .ft-pill').count() === 0);

  // A roster stored as a JSON string still renders.
  await page.click('#sportPills .ft-pill:has-text("Baseball")');
  await page.waitForTimeout(300);
  check('a roster stored as a JSON string still renders', await page.locator('tbody tr').count() === 1);
  // Level named, gender not — there is no girls baseball to distinguish it from.
  const bbar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('baseball reads Varsity Baseball', bbar.startsWith('Varsity Baseball'), bbar);
  check('and is not called Boys', !/Boys/.test(bbar), bbar);
  check('no roster PDF link', await page.locator('a[href$="roster.pdf"]').count() === 0);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 12 ──────────────────────────────────────────────────────────────────────
console.log('\n12. Deep links and failure');
{
  let r = await open('/farmingtontigersnh/schedule?sport=63&team=4575551');
  check('a link can name the sport and team',
    (await r.page.getAttribute('#teamPicker .ft-pill.on','data-team')) === '4575551',
    String(await r.page.getAttribute('#teamPicker .ft-pill.on','data-team')));
  check('and the sport pill follows', /Volleyball/.test(await r.page.textContent('#sportChips .ft-pill.on')));
  await r.ctx.close();

  r = await open('/farmingtontigersnh/schedule', { breakDb: true });
  check('a Supabase outage says so', /could not be loaded/i.test(await r.page.textContent('#scheduleBody')));
  check('without throwing', r.errors.length===0, r.errors[0]||'');
  await r.ctx.close();

  r = await open('/farmingtontigersnh/standings', { standings: [] });
  check('no standings in the off-season reads as off-season',
    /only while a sport is in season/i.test(await r.page.textContent('#standBody')));
  await r.ctx.close();
}

// ── 13 ──────────────────────────────────────────────────────────────────────
console.log('\n13. Venue pin');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(300);
  await page.locator('.ft-pin').last().click();
  await page.waitForTimeout(300);
  const v = (await page.textContent('.ft-venue')).replace(/\s+/g,' ');
  check('names the venue once', (v.match(/Newmarket HS/g)||[]).length === 1, v.trim());
  check('and the sub-venue', /Cross Gym/.test(v));
  // The address is not in Arbiter's feed, so there is nothing to send to a
  // maps app — the popover names the venue and stops there.
  check('no directions link', await page.locator('.ft-venue a').count() === 0,
    String(await page.locator('.ft-venue a').count()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Escape closes it', !(await page.locator('.ft-venue').evaluate(e=>e.classList.contains('on'))));
  await ctx.close();
}

// ── 14 ──────────────────────────────────────────────────────────────────────
console.log('\n14. Footer and link styling');
{
  for (const path of ['/farmingtontigersnh','/farmingtontigersnh/schedule','/farmingtontigersnh/standings','/farmingtontigersnh/rosters','/farmingtontigersnh/news']) {
    const { page, ctx } = await open(path);
    const foot = (await page.textContent('.ft-footer')).replace(/\s+/g,' ').trim();
    check(`${path} footer says Powered by`, /^Powered by$/i.test(foot), foot);
    check(`${path} footer carries the Ball603 mark`,
      await page.locator('.ft-powered img[src*="Ball603"]').count() === 1);
    check(`${path} footer links to Ball603`,
      (await page.getAttribute('.ft-powered','href')) === 'https://ball603.com');
    check(`${path} has no source credit left`, !/ArbiterSports|NHIAA|Enter a score/i.test(foot), foot);
    await ctx.close();
  }

  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(300);
  const deco = await page.locator('tbody .ft-teamlink').first().evaluate(e=>getComputedStyle(e).borderBottomWidth);
  check('opponent names are not underlined', deco === '0px', deco);

  // The streak badge, coloured by what it says.
  await ctx.close();
  const r = await open('/farmingtontigersnh/standings');
  await r.page.waitForTimeout(500);
  const badges = await r.page.locator('.ft-streak').allTextContents();
  check('streaks render as badges', badges.length > 0, badges.join(','));
  const loss = r.page.locator('.ft-streak.loss').first();
  if (await loss.count()) {
    const c = await loss.evaluate(e=>getComputedStyle(e).color);
    check('a losing streak is red', c === 'rgb(179, 38, 30)', c);
  }
  const winCount = await r.page.locator('.ft-streak.win').count();
  check('a winning streak gets the win class', winCount > 0, String(winCount));
  check('the group columns are separated', await r.page.locator('.ft-table th.sep').count() >= 3);
  await r.ctx.close();
}

// ── 15 ──────────────────────────────────────────────────────────────────────
console.log('\n15. Videos');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/videos');
  await page.route('**/img.youtube.com/**', r => r.fulfill({ status: 200, contentType:'image/png', body: '' }));

  const nav = await page.locator('.ft-navlink').allTextContents();
  check('Videos is still in the nav', nav.includes('Videos'), nav.join('/'));

  const cards = await page.locator('.ft-video').count();
  check('a card per video', cards === 4, String(cards));
  check('pinned video leads', /sweeps Hillsboro-Deering/.test(await page.locator('.ft-video h3').first().textContent()));

  const first = (await page.locator('.ft-video').first().textContent()).replace(/\s+/g,' ');
  check('duration over an hour formats as h:mm:ss',
    /1:05:30/.test(await page.locator('.ft-video-dur').first().textContent()),
    await page.locator('.ft-video-dur').first().textContent());
  check('view count shortened', /1.2K views/.test(first), first);
  check('date shown', /Sep 2, 2026/.test(first), first);

  // A short video must not print as 0:45:00 or 45:00.
  const durs = await page.locator('.ft-video-dur').allTextContents();
  check('a 45-second clip reads 0:45', durs.includes('0:45'), durs.join('/'));

  // Search covers title, description and tags.
  await page.fill('#videoSearch', 'football');
  await page.waitForTimeout(250);
  check('search by tag', await page.locator('.ft-video').count() === 1);
  await page.fill('#videoSearch', 'ceremony');
  await page.waitForTimeout(250);
  check('search by description', /Senior night/.test(await page.textContent('#videoBody')));
  await page.fill('#videoSearch', 'zzzz');
  await page.waitForTimeout(250);
  check('an empty result says so', /No videos match/.test(await page.textContent('#videoBody')));
  check('and the count reflects it', /0 of 4/.test(await page.textContent('#videoCount')),
    await page.textContent('#videoCount'));
  await page.fill('#videoSearch', '');
  await page.waitForTimeout(250);
  check('clearing restores every video', await page.locator('.ft-video').count() === 4);

  /* ── Shorts ────────────────────────────────────────────────────────────
     They arrive through the same uploads playlist as everything else and sit
     in the same date order. Only the drawing differs: 9:16 in a 16:9 grid. */
  const shortCard = page.locator('.ft-video[data-short="1"]');
  check('a Short is in the same grid, not a section of its own',
    await shortCard.count() === 1, String(await shortCard.count()));
  check('and in the one grid with everything else, not a section of its own',
    await page.locator('.ft-videogrid').count() === 1 &&
    await page.locator('.ft-videogrid .ft-video[data-short="1"]').count() === 1,
    String(await page.locator('.ft-videogrid').count()));
  check('it is badged', (await shortCard.locator('.ft-video-badge').textContent()).trim() === 'SHORT');
  check('only Shorts are badged', await page.locator('.ft-video-badge').count() === 1);

  // The card keeps its shape; the thumbnail inside it does not get cropped.
  const box = await shortCard.locator('.ft-video-thumb').boundingBox();
  const other = await page.locator('.ft-video:not([data-short="1"]) .ft-video-thumb').first().boundingBox();
  check('the card is the same size as every other', Math.abs(box.width - other.width) < 2 &&
    Math.abs(box.height - other.height) < 2, `${box.width}x${box.height} vs ${other.width}x${other.height}`);
  check('the thumbnail is shown whole, not cropped',
    await shortCard.locator('.ft-video-main').evaluate(e => getComputedStyle(e).objectFit) === 'contain');
  check('with a blurred fill behind it instead of black bars',
    await shortCard.locator('.ft-video-blur').count() === 1 &&
    /blur/.test(await shortCard.locator('.ft-video-blur').evaluate(e => getComputedStyle(e).filter)),
    await shortCard.locator('.ft-video-blur').evaluate(e => getComputedStyle(e).filter));
  check('and the fill is hidden from screen readers',
    await shortCard.locator('.ft-video-blur').getAttribute('aria-hidden') === 'true');
  check('a normal video has no blurred layer behind it',
    await page.locator('.ft-video:not([data-short="1"]) .ft-video-blur').count() === 0);

  // The player turns upright for it, and back again afterwards.
  await shortCard.click();
  await page.waitForTimeout(400);
  const ratio = await page.locator('#lightboxFrame').evaluate(e => {
    const r = e.getBoundingClientRect(); return r.width / r.height; });
  check('the player opens upright for a Short', ratio < 0.8, ratio.toFixed(2));
  check('and it still fits on the screen',
    (await page.locator('#lightboxFrame').boundingBox()).height <= 1100,
    String((await page.locator('#lightboxFrame').boundingBox()).height));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('.ft-video:not([data-short="1"])').first().click();
  await page.waitForTimeout(400);
  const wide = await page.locator('#lightboxFrame').evaluate(e => {
    const r = e.getBoundingClientRect(); return r.width / r.height; });
  check('and lies back down for an ordinary video', wide > 1.6, wide.toFixed(2));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // The player.
  await page.locator('.ft-video').first().click();
  await page.waitForTimeout(300);
  check('clicking opens the player', await page.locator('#lightbox').evaluate(e=>e.classList.contains('on')));
  const src = await page.getAttribute('#lightboxFrame','src');
  check('embedded from the no-cookie domain', src.startsWith('https://www.youtube-nocookie.com/embed/aaa11111111'), src);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check('Escape closes it', !(await page.locator('#lightbox').evaluate(e=>e.classList.contains('on'))));
  check('and the iframe is torn down so the audio stops',
    (await page.getAttribute('#lightboxFrame','src')) === '', await page.getAttribute('#lightboxFrame','src'));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();

  const empty = await open('/farmingtontigersnh/videos', { videos: [] });
  check('no videos yet reads plainly', /No videos yet/.test(await empty.page.textContent('#videoBody')));
  await empty.ctx.close();
}

// ── 16 ──────────────────────────────────────────────────────────────────────
console.log('\n16. Photos');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/photos');
  const nav = await page.locator('.ft-navlink').allTextContents();
  check('Photos is in the nav', nav.includes('Photos'), nav.join('/'));
  check('and it is the active tab',
    (await page.textContent('.ft-navlink.on')).trim() === 'Photos',
    (await page.textContent('.ft-navlink.on')).trim());

  check('a card per gallery', await page.locator('.ft-gallery').count() === 5,
    String(await page.locator('.ft-gallery').count()));
  check('the count says so', /5 galleries/.test(await page.textContent('#photoCount')),
    (await page.textContent('#photoCount')).trim());

  // Newest first, across both accounts — the volleyball gallery KJ shot on the
  // 12th leads, the Ball603 basketball album from March is last.
  const names = await page.locator('.ft-gallery h3').allTextContents();
  check('newest first', /Johnson 500 Kills/.test(names[0]), names[0]);
  check('and the two sources are interleaved by date',
    /Trinity at Farmington/.test(names[2]), names.join(' | '));
  check('no source is credited on the card',
    !/KJ Cardinal Photography|Ball603 Photo/.test(await page.textContent('#photoBody')));

  // Each card is a link out to SmugMug, opening away from the site.
  const a = page.locator('.ft-gallery').first();
  check('the whole card is the link',
    (await a.getAttribute('href')).includes('kjcardinal.smugmug.com'), await a.getAttribute('href'));
  check('opening in a new tab', await a.getAttribute('target') === '_blank');
  check('with rel noopener', (await a.getAttribute('rel') || '').includes('noopener'));
  check('photo counts shown', /212 photos/.test(await page.textContent('#photoBody')));

  // Sport pills, built from whatever sports have galleries.
  const pills = (await page.locator('#sportPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('All Photos leads the pills', /All Photos/.test(pills[0]), pills.join('/'));
  check('a pill per sport that has galleries', pills.length === 4, pills.join('/'));
  check('in playing order, volleyball before basketball',
    pills.findIndex(p=>/Volleyball/.test(p)) < pills.findIndex(p=>/Basketball/.test(p)), pills.join('/'));
  check('the album with no sport gets no pill of its own',
    !pills.some(p=>/Alumni|Other|null/.test(p)), pills.join('/'));

  await page.click('#sportPills .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(300);
  check('filtering by sport narrows the grid', await page.locator('.ft-gallery').count() === 2,
    String(await page.locator('.ft-gallery').count()));
  check('and works for a Ball603 album, whose name never says volleyball',
    /Trinity at Farmington/.test(await page.textContent('#photoBody')),
    (await page.textContent('#photoBody')).replace(/\s+/g,' ').slice(0,140));
  check('the count follows', /2 galleries of 5/.test(await page.textContent('#photoCount')),
    (await page.textContent('#photoCount')).trim());
  check('and the sport is in the address bar', /sport=Volleyball/.test(page.url()), page.url());

  await page.click('#sportPills .ft-pill:has-text("All Photos")');
  await page.waitForTimeout(300);
  check('All Photos restores everything', await page.locator('.ft-gallery').count() === 5);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// Search, and the states either side of it.
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/photos');
  const search = page.locator('#photoSearch');

  // Two galleries say Nute: the volleyball match at Nute, and the Farmington-Nute
  // football co-op. Both are right.
  await search.fill('nute');
  await page.waitForTimeout(300);
  check('search by opponent', await page.locator('.ft-gallery').count() === 2,
    String(await page.locator('.ft-gallery').count()));
  await search.fill('nute volleyball');
  await page.waitForTimeout(300);
  check('every word has to match, so two words narrow it',
    await page.locator('.ft-gallery').count() === 1,
    String(await page.locator('.ft-gallery').count()));

  await search.fill('basketball');
  await page.waitForTimeout(300);
  check('search finds a sport the album name never mentions',
    /Groveton/.test(await page.textContent('#photoBody')),
    (await page.textContent('#photoBody')).replace(/\s+/g,' ').slice(0,120));

  await search.fill('zzz');
  await page.waitForTimeout(300);
  check('an empty result says so', /No galleries match/.test(await page.textContent('#photoBody')));

  await search.fill('');
  await page.waitForTimeout(300);
  check('clearing restores every gallery', await page.locator('.ft-gallery').count() === 5);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// Nothing synced yet, and a database that will not answer.
{
  const { page, ctx } = await open('/farmingtontigersnh/photos', { albums: [] });
  check('no galleries yet reads plainly', /No galleries here yet/.test(await page.textContent('#photoBody')),
    (await page.textContent('#photoBody')).replace(/\s+/g,' ').trim().slice(0,70));
  check('and no pill row is drawn', await page.locator('#sportPills .ft-pill').count() === 0);
  await ctx.close();
}
{
  const { page, ctx } = await open('/farmingtontigersnh/photos', { breakDb: true });
  check('a broken database says refresh, not nothing',
    /could not be loaded/.test(await page.textContent('#photoBody')),
    (await page.textContent('#photoBody')).replace(/\s+/g,' ').trim().slice(0,80));
  await ctx.close();
}

// ── 17 ──────────────────────────────────────────────────────────────────────
console.log('\n17. For the fans, by the fans');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh');
  const heads = (await page.locator('.ft-card-head h2').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim());
  check('the news box is renamed', heads.includes('For the fans, by the fans'), heads.join(' / '));
  check('and Tiger News is gone', !heads.some(h=>/Tiger News/.test(h)), heads.join(' / '));
  check('with no All news link left over', await page.locator('a[href$="/news"]').count() === 0);

  const stories = page.locator('.ft-story');
  check('a story per published slot', await stories.count() === 2, String(await stories.count()));
  check('the draft slot is not on the page',
    !/Half-written/.test(await page.textContent('#storyBody')),
    (await page.textContent('#storyBody')).replace(/\s+/g,' ').slice(0,120));
  check('in slot order',
    /senior night/.test(await stories.first().locator('h3').textContent()),
    await stories.first().locator('h3').textContent());

  // The body is article HTML and has to arrive as HTML, not as text.
  const body = stories.first().locator('.ft-story-body');
  check('the story runs in full, both paragraphs', await body.locator('p').count() === 2,
    String(await body.locator('p').count()));
  check('and its formatting survives', await body.locator('strong').count() === 1);
  check('lists survive too', await stories.nth(1).locator('.ft-story-body li').count() === 2,
    String(await stories.nth(1).locator('.ft-story-body li').count()));
  check('a lead image is shown where there is one',
    await stories.first().locator('.ft-story-lead').count() === 1);
  check('and not invented where there is not',
    await stories.nth(1).locator('.ft-story-lead').count() === 0);
  check('no byline or date', !/By |Sep \d/.test(await page.textContent('#storyBody')),
    (await page.textContent('#storyBody')).replace(/\s+/g,' ').slice(0,100));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// Between stories, and when the database will not answer.
{
  const { page, ctx, errors } = await open('/farmingtontigersnh', { stories: [] });
  check('no stories falls back to Facebook rather than an empty box',
    /Nothing from the fans just yet/.test(await page.textContent('#storyBody')),
    (await page.textContent('#storyBody')).replace(/\s+/g,' ').trim().slice(0,80));
  check('and still offers somewhere to go',
    await page.locator('#storyBody a[href*="facebook.com/FarmingtonTigersNH"]').count() === 1);
  check('the rest of the page is unaffected', await page.locator('#standBody tbody tr').count() > 0);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// A story whose body carries something it should not. The save endpoint strips
// these, but the page must not be the only thing standing between a script tag
// and the front page.
{
  const nasty = [{ slot: 1, headline: 'Ordinary headline',
    body: '<p>Fine.</p><img src=x onerror="window.__owned=1"><a href="javascript:window.__owned=2">click</a>',
    image_url: null, published: true }];
  const { page, ctx } = await open('/farmingtontigersnh', { stories: nasty });
  await page.waitForTimeout(500);
  check('the story still renders', await page.locator('.ft-story').count() === 1);
  check('the ordinary paragraph survives', /Fine\./.test(await page.textContent('.ft-story-body')));
  check('and nothing ran', await page.evaluate(() => window.__owned) === undefined,
    String(await page.evaluate(() => window.__owned)));
  check('the handler is gone from the markup',
    !/onerror/i.test(await page.innerHTML('.ft-story-body')),
    (await page.innerHTML('.ft-story-body')).slice(0,140));
  check('and the javascript: link is defused',
    !/javascript:/i.test(await page.innerHTML('.ft-story-body')),
    (await page.innerHTML('.ft-story-body')).slice(0,140));
  await ctx.close();
}

// ── 18 ──────────────────────────────────────────────────────────────────────
console.log('\n18. Images inside a story');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh', { stories: STORY_WITH_IMAGES });
  const img = (n) => page.locator('.ft-story-body .article-image').nth(n);
  const box = async (n) => await img(n).boundingBox();
  const css = async (n, prop) => await img(n).evaluate((e, p) => getComputedStyle(e)[p], prop);

  check('every image survives the sanitiser',
    await page.locator('.ft-story-body .article-image').count() === 3,
    String(await page.locator('.ft-story-body .article-image').count()));

  // Sizes are widths, and they are distinct.
  const [small, medium, large] = [await box(0), await box(1), await box(2)];
  check('small is small', Math.round(small.width) === 170, String(small.width));
  check('medium is bigger than small', medium.width > small.width, `${small.width} → ${medium.width}`);
  check('large runs the width of the column', large.width > medium.width * 1.5,
    `${medium.width} → ${large.width}`);

  // Floating is what makes text wrap.
  check('the left one floats left', await css(0, 'float') === 'left', await css(0, 'float'));
  check('the right one floats right', await css(1, 'float') === 'right', await css(1, 'float'));
  check('the centred one does not float', await css(2, 'float') === 'none', await css(2, 'float'));

  // The real question: does the text actually sit beside the picture?
  const para = await page.locator('.ft-story-body p').nth(1).boundingBox();
  check('text runs alongside a floated image, not under it',
    para.y < small.y + small.height && para.y + para.height > small.y,
    `image ${Math.round(small.y)}–${Math.round(small.y + small.height)}, text ${Math.round(para.y)}`);

  // Nothing is cropped: the rendered box keeps the picture's own proportions.
  const shape = await img(0).locator('img').evaluate(e => ({
    fit: getComputedStyle(e).objectFit,
    w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height,
    natW: e.naturalWidth, natH: e.naturalHeight
  }));
  check('the image is not cropped to a shape', shape.fit !== 'cover', shape.fit);
  // The small one is a real 40x50 portrait — the 8x10 case.
  check('a portrait photo is a portrait photo', shape.natH > shape.natW,
    `${shape.natW}x${shape.natH}`);
  check('and keeps its own proportions rather than being squared off',
    Math.abs((shape.w / shape.h) - (shape.natW / shape.natH)) < 0.02,
    `rendered ${(shape.w/shape.h).toFixed(3)} vs real ${(shape.natW/shape.natH).toFixed(3)}`);
  check('shown whole, taller than it is wide', shape.h > shape.w,
    `${Math.round(shape.w)}x${Math.round(shape.h)}`);

  // Open in a new tab.
  const link = img(1).locator('a');
  check('a linked image opens in a new tab', await link.getAttribute('target') === '_blank');
  check('with rel noopener', (await link.getAttribute('rel') || '').includes('noopener'));
  check('and the sanitiser left it alone',
    (await link.getAttribute('href') || '').includes('Farmington.png'), await link.getAttribute('href'));
  check('an unlinked image has no anchor', await img(0).locator('a').count() === 0);

  check('captions are shown', /Small, left/.test(await page.textContent('.ft-story-body')));

  // The float must not escape the story and push the next one about.
  const storyBox = await page.locator('.ft-story').first().boundingBox();
  check('the story is tall enough to contain its floats',
    storyBox.height > large.height, `${storyBox.height} vs ${large.height}`);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// On a phone there is no room to wrap round anything.
{
  const { page, ctx } = await open('/farmingtontigersnh', { stories: STORY_WITH_IMAGES, width: 420 });
  const first = page.locator('.ft-story-body .article-image').first();
  check('images stop floating on a narrow screen',
    await first.evaluate(e => getComputedStyle(e).float) === 'none',
    await first.evaluate(e => getComputedStyle(e).float));
  const w = (await first.boundingBox()).width;
  const col = (await page.locator('.ft-story-body').boundingBox()).width;
  check('and run the full width of the column', Math.abs(w - col) < 2, `${w} vs ${col}`);
  await ctx.close();
}

// ── 19 ──────────────────────────────────────────────────────────────────────
console.log('\n19. The Farmington-Nute soccer roster');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/rosters',
    { rosters: [...ROSTERS, SOCCER_ROSTER] });

  const pills = (await page.locator('#sportPills .ft-pill').allTextContents()).map(t=>t.trim());
  check('soccer gets a pill of its own', pills.some(p=>/Soccer/.test(p)), pills.join('/'));
  check('named properly, not "soccer" with a trophy',
    pills.some(p=>/\u26bd\s*Soccer/.test(p) || (/Soccer/.test(p) && !/soccer/.test(p))),
    pills.join('/'));
  check('and in playing order, after volleyball',
    pills.findIndex(p=>/Volleyball/.test(p)) < pills.findIndex(p=>/Soccer/.test(p)), pills.join('/'));

  await page.click('#sportPills .ft-pill:has-text("Soccer")');
  await page.waitForTimeout(400);

  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ').trim();
  check('the bar says Varsity Soccer, not Boys Varsity soccer',
    bar.startsWith('Varsity Soccer'), bar);
  check('with the squad size', /19 Players/.test(bar), bar);
  check('and the division', /D-III/.test(bar), bar);
  check('no gender row for a sport with one side',
    await page.locator('#genderPills .ft-pill').count() === 0);

  check('every player is listed', await page.locator('tbody tr').count() === 19,
    String(await page.locator('tbody tr').count()));

  const head = (await page.textContent('thead')).replace(/\s+/g,' ').trim();
  check('a School column, because this squad has two', /School/.test(head), head);
  check('and no empty Pos or Ht column', !/Pos/.test(head) && !/Ht/.test(head), head);

  const body = (await page.textContent('tbody')).replace(/\s+/g,' ');
  check('Nute players are marked as Nute', /Nute/.test(body));
  check('Farmington players as Farmington', /Farmington/.test(body));

  // The two things about this roster that a tidier-up would have "fixed".
  const numbers = await page.locator('tbody tr td.num').allTextContents();
  check('both number 20s are kept', numbers.filter(n=>n.trim()==='20').length === 2,
    numbers.join(','));
  check('and the two with no number are still on the list',
    numbers.filter(n=>n.trim()==='').length === 2, JSON.stringify(numbers));
  check('Ezekiel Gillen among them', /Ezekiel Gillen/.test(body));

  const coaches = (await page.textContent('.ft-coaches')).replace(/\s+/g,' ');
  check('head coach', /Erik Carney/.test(coaches), coaches);
  check('assistant', /Jocelyn Schoonmaker/.test(coaches), coaches);
  check('head coach is not bolded', await page.locator('.ft-coaches b').count() === 0);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// The School column belongs to this roster and must not appear on the others.
{
  const { page, ctx } = await open('/farmingtontigersnh/rosters');
  check('a single-school roster shows no School column',
    !/School/.test(await page.textContent('thead')),
    (await page.textContent('thead')).replace(/\s+/g,' ').trim());
  await ctx.close();
}

// ── 20 ──────────────────────────────────────────────────────────────────────
console.log('\n20. Scrimmages never reach the site');
{
  // The 24 August golf friendly against Newmarket: Arbiter titles it
  // "Scrimmage" and it must not appear anywhere or count for anything.
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule?sport=all');
  await page.waitForTimeout(400);
  const all = (await page.textContent('tbody')).replace(/\s+/g,' ');
  check('not in the All Sports composite', !/Aug 24/.test(all), all.slice(0,150));
  check('and the opponent is not listed for that day',
    !/Aug 24.{0,40}Newmarket/.test(all));
  check('while the rest of golf is still there', /Inter-Lakes/.test(all));

  await page.click('#sportChips .ft-pill:has-text("Golf")');
  await page.waitForTimeout(400);
  const golf = (await page.textContent('tbody')).replace(/\s+/g,' ');
  check('not on the golf schedule either', !/Aug 24/.test(golf), golf.slice(0,150));
  // The fixture carries one real golf fixture besides the scrimmage.
  check('the real golf fixture is untouched', /Sep 16.*Inter-Lakes/.test(golf), golf.slice(0,90));
  check('and it is the only row on the golf schedule',
    await page.locator('tbody tr').count() === 1, String(await page.locator('tbody tr').count()));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// A scrimmage that somehow carried a score must still not move the record.
{
  const scored = GAMES.map(g => g.is_scrimmage
    ? { ...g, arbiter_my_score: 99, arbiter_opp_score: 0, arbiter_result: 'W' } : g);
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  const before = await page.evaluate(async () => {
    const r = await (window.FT.load());
    const t = r.teams.find(x => x.uteam === 11770786);
    return { games: t.games.length, record: window.FT.recordOf(t.games).text };
  });
  check('a golf record built only from fixtures that count', /^\d+–\d+$/.test(before.record), before.record);
  check('and the scrimmage is not among the games', before.games === GAMES.filter(g =>
    g.uteam === 11770786 && !g.is_scrimmage).length, `${before.games}`);
  await ctx.close();
  void scored;
}

// ── 21 ──────────────────────────────────────────────────────────────────────
console.log('\n21. The schedule opens on today');
{
  // Clock is Thursday 17 September, with games behind and ahead of it.
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule?sport=all');
  await page.waitForTimeout(600);

  // The page itself must not move. That was the bug: scrolling the window
  // pushed the heading off and stranded the pill row over the table.
  check('the page has not scrolled itself', await page.evaluate(() => window.scrollY) === 0,
    String(await page.evaluate(() => window.scrollY)));
  check('the Schedule heading is still on screen',
    (await page.locator('.ft-pagehead h1').boundingBox()).y > 0);
  check('and so is the sport row',
    (await page.locator('#sportChips').boundingBox()).y > 0);
  check('the pill row is not sticky any more',
    await page.locator('#sportChips').evaluate(e => getComputedStyle(e).position) === 'static',
    await page.locator('#sportChips').evaluate(e => getComputedStyle(e).position));

  // The table is what scrolls.
  const wrap = page.locator('.ft-tablescroll');
  check('the table sits in its own scrolling box', await wrap.count() === 1);
  check('which is scrollable', await wrap.evaluate(e => e.scrollHeight > e.clientHeight + 10));
  check('and is scrolled down inside itself', await wrap.evaluate(e => e.scrollTop) > 0,
    String(await wrap.evaluate(e => e.scrollTop)));

  // Today is the first row you see in it.
  const anchor = page.locator('#ft-today-anchor');
  check('today is marked', await anchor.count() === 1);
  check('and it is today, not the next unplayed game',
    /Sep 17/.test(await anchor.textContent()), (await anchor.textContent()).replace(/\s+/g,' '));
  /* Today goes to the top of the box — or as near as the remaining games
     allow. A row cannot be pulled to the top when there is not a boxful of
     season left below it, which is true of any scrolling list and is the state
     this fixture is in. Either is right; being stuck halfway with room to
     spare is not. */
  const seat = await page.evaluate(() => {
    const w = document.querySelector('.ft-tablescroll');
    const a = document.getElementById('ft-today-anchor');
    const h = w.querySelector('thead').getBoundingClientRect().height;
    return {
      rel: Math.round(a.getBoundingClientRect().top - w.getBoundingClientRect().top - h),
      atEnd: w.scrollTop >= w.scrollHeight - w.clientHeight - 2,
      visible: a.getBoundingClientRect().top >= w.getBoundingClientRect().top &&
               a.getBoundingClientRect().bottom <= w.getBoundingClientRect().bottom + 1
    };
  });
  check('today is in view inside the box', seat.visible, JSON.stringify(seat));
  check('and as close to the top as the season allows',
    Math.abs(seat.rel) <= 3 || seat.atEnd, JSON.stringify(seat));

  // The headings stay put while the season scrolls past.
  check('column headings are pinned inside the box',
    await page.locator('.ft-tablescroll thead th').first().evaluate(e => getComputedStyle(e).position) === 'sticky');

  // The past is above, inside the box.
  const first = (await page.locator('tbody tr').first().textContent()).replace(/\s+/g,' ');
  check('finished games are above it, still there', /Sep 2/.test(first), first.slice(0,60));
  check('nothing has been hidden', await page.locator('tbody tr').count() > 10,
    String(await page.locator('tbody tr').count()));

  // The Today pill and the orange marks on today's row are gone.
  check('no Today button', await page.locator('.ft-today-btn').count() === 0);
  check('no orange line above today',
    await page.locator('#ft-today-anchor td').first()
      .evaluate(e => getComputedStyle(e).borderTopWidth) === '0px',
    await page.locator('#ft-today-anchor td').first().evaluate(e => getComputedStyle(e).borderTopWidth));
  const nextBg = await page.locator('tr.ft-next td').first().evaluate(e => getComputedStyle(e).backgroundColor);
  check('and no orange wash on the next game',
    nextBg === 'rgba(0, 0, 0, 0)' || nextBg === 'rgb(255, 255, 255)' || nextBg === 'rgb(252, 252, 252)',
    nextBg);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// A season not yet started: today is the first row anyway, so the box stays put.
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule?sport=all', { future: true });
  await page.waitForTimeout(600);
  check('before the first game the box is at the top',
    await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop) === 0,
    String(await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop)));
  check('and the anchor is the opening fixture',
    await page.locator('#ft-today-anchor').count() === 1);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// Switching sport lands on that sport's today rather than wherever the last
// one had been scrolled to.
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule?sport=all');
  await page.waitForTimeout(600);
  await page.click('#sportChips .ft-pill:has-text("Volleyball")');
  await page.waitForTimeout(500);
  const seat = await page.evaluate(() => {
    const w = document.querySelector('.ft-tablescroll');
    const a = document.getElementById('ft-today-anchor');
    if (!a) return null;
    const h = w.querySelector('thead').getBoundingClientRect().height;
    return {
      rel: Math.round(a.getBoundingClientRect().top - w.getBoundingClientRect().top - h),
      atEnd: w.scrollTop >= w.scrollHeight - w.clientHeight - 2
    };
  });
  check('a new sport also opens on its today',
    seat && (Math.abs(seat.rel) <= 3 || seat.atEnd), JSON.stringify(seat));
  await ctx.close();
}

// A real season is long enough that today genuinely reaches the top.
{
  // 40 volleyball fixtures either side of 17 September.
  const base = GAMES.find(g => g.uteam === 4575537 && !g.is_meet);
  const many = [];
  for (let i = -20; i < 20; i++) {
    const d = new Date(Date.UTC(2026, 8, 17 + i));
    const key = d.toISOString().slice(0, 10);
    many.push({ ...base, unique_game_id: 800000 + i + 50, game_date: key,
      starts_at: key + 'T17:00:00',
      arbiter_my_score: i < 0 ? 3 : null, arbiter_opp_score: i < 0 ? 1 : null,
      arbiter_result: i < 0 ? 'W' : null, manual_my_score: null, manual_opp_score: null });
  }
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule?sport=all', { games: many });
  await page.waitForTimeout(700);
  const seat = await page.evaluate(() => {
    const w = document.querySelector('.ft-tablescroll');
    const a = document.getElementById('ft-today-anchor');
    const h = w.querySelector('thead').getBoundingClientRect().height;
    return { rel: Math.round(a.getBoundingClientRect().top - w.getBoundingClientRect().top - h),
             rows: document.querySelectorAll('tbody tr').length,
             scrollTop: Math.round(w.scrollTop) };
  });
  check('over a full season today lands at the top of the box',
    Math.abs(seat.rel) <= 3, JSON.stringify(seat));
  check('with the finished half above it', seat.scrollTop > 100, String(seat.scrollTop));
  check('and every fixture still on the page', seat.rows === 40, String(seat.rows));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 22 ──────────────────────────────────────────────────────────────────────
console.log('\n22. On a phone');
{
  const PAGES = ['/farmingtontigersnh', '/farmingtontigersnh/schedule',
                 '/farmingtontigersnh/standings', '/farmingtontigersnh/rosters',
                 '/farmingtontigersnh/photos', '/farmingtontigersnh/videos'];

  for (const path of PAGES) {
    const { page, ctx, errors } = await open(path, { width: 390 });
    await page.waitForTimeout(700);
    const name = path.replace('/farmingtontigersnh', '') || '/home';

    // The page itself never drags sideways.
    const over = await page.evaluate(() =>
      Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth));
    check(`${name} does not scroll sideways`, over <= 0, String(over));

    // The nav becomes a hamburger, to the right of the socials.
    check(`${name} hides the nav row`,
      await page.locator('.ft-nav').evaluate(e => getComputedStyle(e).display) === 'none');
    check(`${name} shows a hamburger`,
      await page.locator('.ft-burger').evaluate(e => getComputedStyle(e).display) !== 'none');
    const order = await page.evaluate(() => {
      const s = document.querySelector('.ft-social').getBoundingClientRect();
      const b = document.querySelector('.ft-burger').getBoundingClientRect();
      return b.left >= s.left;
    });
    check(`${name} puts it right of the socials`, order);

    check(`${name} has no page errors`, errors.length === 0, errors[0] || '');
    await ctx.close();
  }
}

// The drawer itself.
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule', { width: 390 });
  await page.waitForTimeout(500);
  // Closed is off-screen and hidden rather than display:none, so that opening
  // it animates. Visibility is what keeps it out of the tab order meanwhile.
  check('the drawer starts closed',
    await page.locator('#ft-drawer').evaluate(e => getComputedStyle(e).visibility) === 'hidden');
  await page.locator('#ft-burger').click();
  await page.waitForTimeout(250);
  check('the hamburger opens it',
    await page.locator('#ft-drawer').evaluate(e => getComputedStyle(e).visibility) === 'visible');
  // Links only: the drawer's last row is the My Teams button, not a page.
  const links = await page.locator('#ft-drawer a.ft-drawerlink').allTextContents();
  check('with every nav link in it',
    links.join('/') === 'Schedule/Standings/Rosters/Photos/Videos', links.join('/'));
  check('and the current page marked',
    (await page.locator('.ft-drawerlink.on').textContent()).trim() === 'Schedule');
  check('it says so to a screen reader',
    await page.locator('#ft-burger').getAttribute('aria-expanded') === 'true');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check('Escape closes it',
    await page.locator('#ft-drawer').evaluate(e => getComputedStyle(e).visibility) === 'hidden');
  await ctx.close();
}

// Tables: one line per row, and their own sideways scroll.
{
  /* Rosters are deliberately NOT in this list any more. The schedule and the
     standings carry more columns than a phone can hold and scroll inside their
     own box; the roster is narrow enough to fit outright, and now does — see
     the section below. */
  for (const [path, sel] of [['/farmingtontigersnh/schedule', '.ft-tablescroll'],
                             ['/farmingtontigersnh/standings', '.ft-tablewrap']]) {
    const { page, ctx } = await open(path, { width: 390 });
    await page.waitForTimeout(700);
    const name = path.split('/').pop();
    check(`${name} table sits in a sideways-scrolling box`,
      await page.locator(sel).count() >= 1);
    check(`${name} that box is the thing that scrolls`,
      await page.locator(sel).first().evaluate(e => {
        const o = getComputedStyle(e).overflowX;
        return (o === 'auto' || o === 'scroll') && e.scrollWidth > e.clientWidth;
      }));
    // Every row is exactly one line tall.
    const lines = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('tbody tr')].slice(0, 12);
      return rows.map(r => {
        const h = r.getBoundingClientRect().height;
        const cell = getComputedStyle(r.querySelector('td'));
        return Math.round(h / (parseFloat(cell.lineHeight) || 19));
      });
    });
    check(`${name} rows are a single line`, lines.every(n => n <= 2), JSON.stringify(lines));
    await ctx.close();
  }
}

// Sport pills: all of them reachable without dragging the row sideways.
{
  for (const w of [390, 360]) {
    const { page, ctx } = await open('/farmingtontigersnh/schedule', { width: w });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const track = document.querySelector('#sportChips .ft-pills');
      const pills = [...track.querySelectorAll('.ft-pill')];
      const t = track.getBoundingClientRect();
      return {
        count: pills.length,
        wraps: getComputedStyle(track).flexWrap,
        offRight: pills.filter(p => p.getBoundingClientRect().right > t.right + 1).length,
        rows: new Set(pills.map(p => Math.round(p.getBoundingClientRect().top))).size
      };
    });
    check(`at ${w}px every sport is on screen`, info.offRight === 0, JSON.stringify(info));
    check(`at ${w}px the row wraps rather than scrolls`, info.wraps === 'wrap', info.wraps);
    check(`at ${w}px it takes no more than two rows`, info.rows <= 2, String(info.rows));
    await ctx.close();
  }
}

// ── 23 ──────────────────────────────────────────────────────────────────────
console.log('\n23. The ticker');
{
  // Clock is Thursday 17 September: games on the 16th, 17th and 18th.
  const { page, ctx, errors } = await open('/farmingtontigersnh');
  await page.waitForTimeout(800);
  check('a ticker appears under the header', await page.locator('.ft-ticker').count() === 1);
  const cards = page.locator('.ft-tcard');
  check('with a card per game in the three-day window', await cards.count() > 0,
    String(await cards.count()));
  const txt = (await page.textContent('.ft-ticker')).replace(/\s+/g,' ');
  check('yesterday\'s golf result is on it', /Inter-Lakes/.test(txt), txt.slice(0,160));
  check('today\'s soccer is too', /Newport/.test(txt), txt.slice(0,200));
  check('and tomorrow\'s volleyball', /Epping/.test(txt), txt.slice(0,240));
  check('nothing from further out', !/Newmarket/.test(txt), txt.slice(0,240));
  check('a finished game says Final', /Final/i.test(txt));
  check('the bar says SCORES', /Scores/i.test(await page.textContent('.ft-ticker-label')),
    await page.textContent('.ft-ticker-label'));

  /* Height. The card started at 3px of padding, went to 13 and is now 21 —
     ten pixels taller, then another sixteen, both of them KJ's. Asserting the
     padding rather than the pixel height, because the height also moves if the
     type inside it ever changes and that is not what is being promised here. */
  const pad = await page.locator('.ft-tcard').first()
    .evaluate(e => getComputedStyle(e).paddingTop);
  check('the cards carry the full 26px of extra height', pad === '21px', pad);
  const tall = await page.locator('.ft-ticker').evaluate(e => Math.round(e.getBoundingClientRect().height));
  check('which makes the strip about 80px deep', tall >= 78 && tall <= 92, String(tall));

  // The status is small, orange and hard right.
  const st = await page.locator('.ft-tcard-status').first().evaluate(e => {
    const s = getComputedStyle(e);
    const card = e.closest('.ft-tcard').getBoundingClientRect();
    const own = e.getBoundingClientRect();
    return { size: parseFloat(s.fontSize), colour: s.color, align: s.textAlign,
             fromRight: Math.round(card.right - own.right) };
  });
  check('the status is small', st.size <= 11, String(st.size));
  check('and orange', st.colour === 'rgb(246, 130, 32)', st.colour);
  check('and sits against the right edge of its card', st.fromRight <= 20, String(st.fromRight));

  // Three cards on a wide screen need no arrows, and an arrow that cannot do
  // anything should not be there.
  check('two arrows exist', await page.locator('.ft-ticker-arrow').count() === 2);
  check('but they are hidden while everything fits',
    await page.locator('.ft-ticker-arrow').first().evaluate(e => getComputedStyle(e).display) === 'none');
  check('it sits below the header, not above it', await page.evaluate(() => {
    const h = document.querySelector('.ft-header').getBoundingClientRect();
    const t = document.querySelector('.ft-ticker').getBoundingClientRect();
    return t.top >= h.bottom - 1;
  }));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// Nothing on: no strip at all rather than one saying so.
{
  const { page, ctx } = await open('/farmingtontigersnh', { future: true });
  await page.waitForTimeout(800);
  check('out of season the ticker is not drawn', await page.locator('.ft-ticker').count() === 0);
  check('and leaves no empty box behind',
    await page.locator('#ft-ticker').evaluate(e => e.getBoundingClientRect().height) === 0);
  await ctx.close();
}

// Arrows, on a strip with more than fits.
{
  // Eleven games today, so the ticker has to be paged through.
  const base = GAMES.find(g => g.uteam === 4575537 && !g.is_meet);
  // Distinct opponents on purpose: shape() folds together two games on the
  // same day against the same school, which is what makes the JV2 volleyball
  // squad show up once rather than twice.
  const foes = ['Epping','Newmarket','Nute','Trinity','Franklin','Gilford',
                'Belmont','Raymond','Mascenic','Sunapee','Newport'];
  const many = foes.map((foe, i) => ({
    ...base, unique_game_id: 700000 + i, game_date: '2026-09-17',
    starts_at: '2026-09-17T1' + (i % 8) + ':00:00',
    opponent_ball603: foe, opponent_name: foe,
    arbiter_my_score: null, arbiter_opp_score: null, arbiter_result: null,
    manual_my_score: null, manual_opp_score: null
  }));
  const { page, ctx, errors } = await open('/farmingtontigersnh', { games: many, width: 1000 });
  await page.waitForTimeout(900);

  const arrows = page.locator('.ft-ticker-arrow');
  check('the arrows appear when there is more than fits',
    await arrows.first().evaluate(e => getComputedStyle(e).display) !== 'none');
  const gap = await page.evaluate(() => {
    const l = document.querySelector('.ft-ticker-label').getBoundingClientRect();
    const a = document.querySelector('.ft-ticker-arrow').getBoundingClientRect();
    return Math.round(a.left - l.right);
  });
  check('the left one sits against the SCORES block', Math.abs(gap) <= 2, String(gap));
  check('the right one is at the far end', await page.evaluate(() => {
    const inner = document.querySelector('.ft-ticker-inner').getBoundingClientRect();
    const a = [...document.querySelectorAll('.ft-ticker-arrow')].pop().getBoundingClientRect();
    return Math.abs(a.right - inner.right) <= 2;
  }));

  check('the left arrow starts disabled, being already at the start',
    await arrows.first().isDisabled());
  check('the right one does not', !(await arrows.last().isDisabled()));

  const before = await page.locator('.ft-ticker-scroll').evaluate(e => e.scrollLeft);
  await arrows.last().click();
  await page.waitForTimeout(900);
  const after = await page.locator('.ft-ticker-scroll').evaluate(e => e.scrollLeft);
  check('pressing the right arrow moves the strip along', after > before + 100,
    `${before} → ${after}`);
  check('and the left one wakes up', !(await arrows.first().isDisabled()));

  await arrows.first().click();
  await page.waitForTimeout(900);
  check('the left arrow takes it back',
    await page.locator('.ft-ticker-scroll').evaluate(e => e.scrollLeft) < after,
    String(await page.locator('.ft-ticker-scroll').evaluate(e => e.scrollLeft)));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// On a phone, swiping replaces them.
{
  const { page, ctx } = await open('/farmingtontigersnh', { width: 390 });
  await page.waitForTimeout(900);
  check('no arrows on a phone',
    await page.locator('.ft-ticker-arrow').first().evaluate(e => getComputedStyle(e).display) === 'none');
  check('the strip is still swipeable',
    await page.locator('.ft-ticker-scroll').evaluate(e => {
      const o = getComputedStyle(e).overflowX; return o === 'auto' || o === 'scroll'; }));
  await ctx.close();
}


// ── 24 ──────────────────────────────────────────────────────────────────────
console.log('\n24. Every page says what it is');
{
  for (const [path, heading] of [['/farmingtontigersnh/schedule', 'Schedule'],
                                 ['/farmingtontigersnh/standings', 'Standings'],
                                 ['/farmingtontigersnh/rosters', 'Rosters'],
                                 ['/farmingtontigersnh/photos', 'Photos'],
                                 ['/farmingtontigersnh/videos', 'Videos']]) {
    const { page, ctx } = await open(path);
    await page.waitForTimeout(600);
    const h = (await page.locator('.ft-pagehead h1').first().textContent() || '').trim();
    check(`${heading} has a page heading`, h === heading, h);
    await ctx.close();
  }
}

// ── 25 ──────────────────────────────────────────────────────────────────────
console.log('\n25. The season on the black bar');
{
  // Clock is September 2026, which is the 2026-27 school year.
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule');
  await page.waitForTimeout(700);
  check('All Sports carries the season', /Season\s*2026-27/.test(
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ')),
    (await page.textContent('.ft-cardbar')).replace(/\s+/g,' '));

  await page.locator('.ft-pill', { hasText: 'Volleyball' }).first().click();
  await page.waitForTimeout(400);
  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ');
  check('and so does a single team, after its record', /2–1.*Season 2026-27/.test(bar), bar);
  check('it sits on the right, past the title', await page.evaluate(() => {
    const h = document.querySelector('.ft-cardbar h2').getBoundingClientRect();
    const spans = [...document.querySelectorAll('.ft-barstats span')];
    const season = spans.find(x => /Season/.test(x.textContent));
    return season.getBoundingClientRect().left > h.right;
  }));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/standings');
  await page.waitForTimeout(700);
  const bar = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ');
  // Arbiter files the season as a bare "2026", which would leave the standings
  // bar and the schedule bar disagreeing about the same season on the same
  // site. A bare year is replaced with the school year.
  check('standings say the same season the schedule does', /Season\s*2026-27/.test(bar), bar);
  check('and the qualifying line is still beside it, not pushed to the far end',
    await page.evaluate(() => document.querySelectorAll('.ft-barright').length === 1));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 26 ──────────────────────────────────────────────────────────────────────
console.log('\n26. The schedule on a phone');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule', { width: 390 });
  await page.waitForTimeout(700);

  check('the weekday is gone',
    await page.locator('.ft-dow').first().evaluate(e => getComputedStyle(e).display) === 'none');
  check('but the date itself is not',
    /Sep/.test((await page.locator('.ft-datecell').first().textContent()).trim()),
    (await page.locator('.ft-datecell').first().textContent()).trim());

  // All Sports is a mixed list, so the sport and the level are the only things
  // telling one row from the next. They stay.
  // Scoped to the table: the sport pills carry the same emoji class.
  const shownIn = (sel) => page.locator(`tbody ${sel}`).first()
    .evaluate(e => getComputedStyle(e.closest('td')).display !== 'none');
  check('All Sports keeps the sport column', await shownIn('.ft-sport-emoji'));
  check('All Sports keeps the level column', await shownIn('.ft-level'));

  await page.locator('.ft-pill', { hasText: 'Volleyball' }).first().click();
  await page.waitForTimeout(400);
  const barText = (await page.textContent('.ft-cardbar')).replace(/\s+/g,' ');
  check('the bar now names the team itself', /Volleyball/.test(barText), barText.slice(0,60));
  check('so the sport column comes off', !(await shownIn('.ft-sport-emoji')));
  check('and the level column with it', !(await shownIn('.ft-level')));
  check('the location pin is gone too',
    await page.locator('.ft-venue-cell').first()
      .evaluate(e => getComputedStyle(e.closest('td')).display) === 'none');

  const sizes = await page.locator('.ft-matchup').first().evaluate(e => ({
    ha: parseFloat(getComputedStyle(e.querySelector('.ft-ha')).fontSize),
    row: parseFloat(getComputedStyle(e.closest('td')).fontSize)
  }));
  check('"at" and "vs" are smaller than the opponent', sizes.ha < sizes.row,
    `${sizes.ha} vs ${sizes.row}`);

  check('and the table no longer has to scroll sideways to be read',
    await page.locator('.ft-tablescroll').evaluate(e => e.scrollWidth <= e.clientWidth + 1),
    await page.locator('.ft-tablescroll').evaluate(e => `${e.scrollWidth}/${e.clientWidth}`));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 27 ──────────────────────────────────────────────────────────────────────
console.log('\n27. My Teams');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh');
  await page.waitForTimeout(900);

  // The star wears its name on a wide screen.
  check('the star is labelled in the bar',
    (await page.textContent('#ft-star')).trim() === 'My Teams',
    (await page.textContent('#ft-star')).trim());
  check('the modal starts hidden',
    await page.locator('#ft-favmodal').evaluate(e => getComputedStyle(e).visibility) === 'hidden');

  await page.locator('#ft-star').click();
  await page.waitForTimeout(350);
  check('the star opens it',
    await page.locator('#ft-favmodal').evaluate(e => getComputedStyle(e).visibility) === 'visible');
  check('and it is centred, not stuck to an edge', await page.evaluate(() => {
    const m = document.querySelector('#ft-favmodal').getBoundingClientRect();
    return Math.abs((m.left + m.right) / 2 - window.innerWidth / 2) < 3;
  }));
  check('it says what starring does',
    /first in the scores ticker/i.test(
      (await page.textContent('.ft-modal-intro')).replace(/\s+/g, ' ')),
    (await page.textContent('.ft-modal-intro')).replace(/\s+/g, ' '));
  check('a row per team, each with a checkbox',
    await page.locator('#ft-favmodal-list .ft-mrow input[type=checkbox]').count() > 1,
    String(await page.locator('#ft-favmodal-list .ft-mrow').count()));
  check('none of them ticked yet',
    await page.locator('#ft-favmodal-list input:checked').count() === 0);

  // Grouped by sport, sports A to Z.
  const heads = (await page.locator('.ft-mgroup-head').allTextContents())
    .map(t => t.replace(/[^A-Za-z ]/g, '').trim());
  check('the teams are grouped under their sport', heads.length > 1, heads.join('/'));
  check('and the sports run alphabetically',
    heads.join('|') === [...heads].sort((a, b) => a.localeCompare(b)).join('|'), heads.join('/'));

  // Inside a sport: gender first, then level. Basketball is the one with both.
  const bball = await page.locator('.ft-mgroup', { has: page.locator('.ft-mgroup-head', { hasText: 'Basketball' }) })
    .locator('.ft-mrow-name').allTextContents();
  check('varsity comes before JV inside a sport',
    bball.findIndex(x => /Varsity Boys/.test(x)) < bball.findIndex(x => /JV Boys/.test(x)),
    bball.join('/'));
  check('and a programme stays together rather than interleaving by level',
    bball.findIndex(x => /JV Boys/.test(x)) < bball.findIndex(x => /Girls/.test(x)),
    bball.join('/'));

  // Search narrows the list without losing what is already ticked.
  const all = await page.locator('#ft-favmodal-list .ft-mrow').count();
  await page.fill('#ft-fav-search', 'basketball');
  await page.waitForTimeout(200);
  const shown = await page.locator('#ft-favmodal-list .ft-mrow:visible').count();
  check('the search box narrows the list', shown > 0 && shown < all, `${shown} of ${all}`);
  // "Basketball" is nobody's team name here, so this only works because the
  // sport heading is searched too.
  check('searching a sport name finds its teams', shown === bball.length,
    `${shown} vs ${bball.length}`);
  check('and the headings of empty sports go with their rows',
    await page.locator('.ft-mgroup-head:visible').count() === 1,
    String(await page.locator('.ft-mgroup-head:visible').count()));
  await page.fill('#ft-fav-search', 'zzzz');
  await page.waitForTimeout(200);
  check('and says so when nothing matches',
    /No team by that name/.test(await page.textContent('#ft-favmodal-list')));
  await page.fill('#ft-fav-search', '');
  await page.waitForTimeout(200);
  check('clearing it brings them all back',
    await page.locator('#ft-favmodal-list .ft-mrow:visible').count() === all);

  // Ticking changes nothing until Save.
  const order = () => page.locator('.ft-tcard').evaluateAll(els => els.map(e => e.dataset.uteam));
  const before = await order();
  const lastTeam = before[before.length - 1];
  check('the ticker starts in time order, not team order', before[0] !== lastTeam, before.join('/'));

  await page.locator(`#ft-favmodal-list input[data-fav="${lastTeam}"]`).check();
  await page.waitForTimeout(300);
  check('ticking a box alone does not move the ticker',
    (await order()).join('/') === before.join('/'), (await order()).join('/'));
  check('nor does it write anything',
    await page.evaluate(() => localStorage.getItem('ft_favourite_teams')) === null,
    String(await page.evaluate(() => localStorage.getItem('ft_favourite_teams'))));

  await page.locator('#ft-fav-save').click();
  await page.waitForTimeout(600);
  check('Save closes the modal',
    await page.locator('#ft-favmodal').evaluate(e => getComputedStyle(e).visibility) === 'hidden');
  const after = await order();
  check('and the saved team leads the ticker', after[0] === lastTeam,
    `${before.join('/')} → ${after.join('/')}`);
  check('its card wears a star', await page.locator('.ft-tcard[data-starred] .ft-tcard-star').count() === 1,
    String(await page.locator('.ft-tcard-star').count()));
  check('and only that one does',
    await page.locator('.ft-tcard-star').count() === 1,
    String(await page.locator('.ft-tcard-star').count()));
  check('the star is orange, so it reads at a glance',
    await page.locator('.ft-tcard-star').first().evaluate(e => getComputedStyle(e).color) === 'rgb(246, 130, 32)',
    await page.locator('.ft-tcard-star').first().evaluate(e => getComputedStyle(e).color));
  check('nothing has been dropped from it', after.length === before.length,
    `${before.length} → ${after.length}`);
  check('the home page card lists it',
    await page.locator('#favBody .ft-favchip').count() === 1,
    await page.textContent('#favBody'));
  check('and counts it', /1 chosen/.test(await page.textContent('#favCount')),
    await page.textContent('#favCount'));

  // Closing without saving leaves what was there.
  await page.locator('#favPick').click();
  await page.waitForTimeout(350);
  check('the card\'s own button opens the same modal',
    await page.locator('#ft-favmodal').evaluate(e => getComputedStyle(e).visibility) === 'visible');
  check('and it opens showing what is actually saved',
    await page.locator('#ft-favmodal-list input:checked').count() === 1);
  await page.locator('#ft-favmodal-list input:checked').first().uncheck();
  await page.locator('#ft-fav-close').click();
  await page.waitForTimeout(400);
  check('closing without saving changes nothing',
    await page.locator('#favBody .ft-favchip').count() === 1,
    await page.textContent('#favBody'));

  // Clear All, then Save, is how somebody empties it.
  await page.locator('#ft-star').click();
  await page.waitForTimeout(300);
  check('re-opening shows the box ticked again, not the abandoned edit',
    await page.locator('#ft-favmodal-list input:checked').count() === 1);
  await page.locator('#ft-fav-clear').click();
  check('Clear All unticks everything',
    await page.locator('#ft-favmodal-list input:checked').count() === 0);
  await page.locator('#ft-fav-save').click();
  await page.waitForTimeout(500);
  check('saving that empties the card',
    await page.locator('#favBody .ft-favchip').count() === 0);
  check('and the count goes quiet', (await page.textContent('#favCount')).trim() === '',
    await page.textContent('#favCount'));

  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}
{
  // A choice made on the home page is still a choice on the schedule page.
  const { page, ctx } = await open('/farmingtontigersnh');
  await page.waitForTimeout(900);
  await page.locator('#ft-star').click();
  await page.waitForTimeout(300);
  const who = await page.locator('#ft-favmodal-list input').first().getAttribute('data-fav');
  await page.locator('#ft-favmodal-list input').first().check();
  await page.locator('#ft-fav-save').click();
  await page.waitForTimeout(400);
  // localhost, not 127.0.0.1: the store is per-origin, and the two are
  // different origins to a browser even though they are the same machine.
  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/schedule`);
  await page.waitForTimeout(900);
  await page.locator('#ft-star').click();
  await page.waitForTimeout(350);
  check('a choice made on the home page holds on the next page',
    await page.locator(`#ft-favmodal-list input[data-fav="${who}"]:checked`).count() === 1,
    `${who} | store=${await page.evaluate(() => localStorage.getItem('ft_favourite_teams'))}`);
  await ctx.close();
}

// ── 28 ──────────────────────────────────────────────────────────────────────
console.log('\n28. My Teams on a phone');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh', { width: 390 });
  await page.waitForTimeout(900);
  // Scoped to the star: the install button in the bar wears the same label class.
  check('the bar drops the label, keeping the star',
    await page.locator('#ft-star .ft-starbtn-label').evaluate(e => getComputedStyle(e).display) === 'none');
  check('but the star itself is still there',
    await page.locator('#ft-star').isVisible());

  await page.locator('#ft-burger').click();
  await page.waitForTimeout(350);
  const rows = (await page.locator('#ft-drawer .ft-drawerlink').allTextContents())
    .map(t => t.trim());
  // Last of the things somebody can actually see. Install App sits below it and
  // is hidden until the browser offers it, so "the bottom" means the bottom of
  // what is on show.
  const visible = rows.filter((_, i) => i < rows.length - 1 || rows[i] !== 'Install App');
  check('the drawer carries My Teams below the pages',
    visible[visible.length - 1] === 'My Teams', rows.join('/'));
  check('and every page above it', rows.slice(0, 5).join('/') === 'Schedule/Standings/Rosters/Photos/Videos',
    rows.join('/'));
  await page.locator('#ft-drawer-star').click();
  await page.waitForTimeout(400);
  check('and it opens the modal',
    await page.locator('#ft-favmodal').evaluate(e => getComputedStyle(e).visibility) === 'visible');
  check('closing the drawer behind it', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#ft-drawer')).visibility === 'hidden'));
  check('the modal fits the screen', await page.evaluate(() => {
    const m = document.querySelector('#ft-favmodal').getBoundingClientRect();
    return m.left >= 0 && m.right <= window.innerWidth + 1 && m.height <= window.innerHeight;
  }));
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 29 ──────────────────────────────────────────────────────────────────────
console.log('\n29. The chrome is not bold');
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule');
  await page.waitForTimeout(700);
  const weight = (sel) => page.locator(sel).first()
    .evaluate(e => Number(getComputedStyle(e).fontWeight));
  check('nav links are not bold', await weight('.ft-navlink') <= 400,
    String(await weight('.ft-navlink')));
  check('nor the selected one', await weight('.ft-navlink.on') <= 400,
    String(await weight('.ft-navlink.on')));
  check('nor the sport pills', await weight('.ft-pill') <= 500,
    String(await weight('.ft-pill')));
  check('nor the selected pill', await weight('.ft-pill.on') <= 500,
    String(await weight('.ft-pill.on')));
  await ctx.close();
}
{
  const { page, ctx } = await open('/farmingtontigersnh/schedule', { width: 390 });
  await page.waitForTimeout(700);
  await page.locator('#ft-burger').click();
  await page.waitForTimeout(300);
  check('nor the drawer links',
    await page.locator('.ft-drawerlink').first().evaluate(e => Number(getComputedStyle(e).fontWeight)) <= 400,
    await page.locator('.ft-drawerlink').first().evaluate(e => getComputedStyle(e).fontWeight));
  await ctx.close();
}

// ── 30 ──────────────────────────────────────────────────────────────────────
console.log('\n30. The wordmark on a phone');
{
  const { page, ctx } = await open('/farmingtontigersnh', { width: 390 });
  await page.waitForTimeout(700);
  const box = await page.locator('.ft-logo img').evaluate(e => {
    const r = e.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width) };
  });
  // It was 28px tall and pinned at 140 wide, which is why raising the height
  // alone changed nothing on screen. Both had to move together.
  check('the wordmark is 16px taller than it was', box.h >= 43, JSON.stringify(box));
  check('and actually drawn that tall, not held back by max-width',
    Math.abs(box.w / box.h - 600 / 159) < 0.05, JSON.stringify(box));
  const bar = await page.locator('.ft-header-inner').evaluate(e => Math.round(e.getBoundingClientRect().height));
  check('the bar itself is the same height it was', bar === 60, String(bar));
  check('and nothing in it has been pushed off the side', await page.evaluate(() => {
    const inner = document.querySelector('.ft-header-inner').getBoundingClientRect();
    const last = document.querySelector('#ft-burger').getBoundingClientRect();
    return last.right <= inner.right + 1 && last.left > 0;
  }));
  check('the page still does not scroll sideways',
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await ctx.close();
}

// ── 31 ──────────────────────────────────────────────────────────────────────
console.log('\n31. Picking a sport shows the whole schedule');
{
  const { page, ctx, errors } = await open('/farmingtontigersnh/schedule');
  await page.waitForTimeout(800);
  // The first view still opens at today — a season half over otherwise greets
  // somebody with a wall of finished games.
  check('the page still opens at today',
    await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop) > 0,
    String(await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop)));

  await page.locator('.ft-pill', { hasText: 'Volleyball' }).first().click();
  await page.waitForTimeout(500);
  check('but picking a sport starts at its first game',
    await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop) === 0,
    String(await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop)));
  const first = (await page.locator('tbody tr').first().textContent()).replace(/\s+/g,' ').trim();
  check('which is a played game, not today\'s', /Sep 2/.test(first), first.slice(0, 60));

  // And so does changing level within it.
  await page.locator('#teamPicker .ft-pill', { hasText: 'JV' }).first().click();
  await page.waitForTimeout(400);
  check('changing level does the same',
    await page.locator('.ft-tablescroll').evaluate(e => e.scrollTop) === 0);
  check('no page errors', errors.length===0, errors[0]||'');
  await ctx.close();
}

// ── 32 ──────────────────────────────────────────────────────────────────────
console.log('\n32. Rosters fit a phone');
{
  /* The roster used to be held at 520px like every other table and scrolled
     sideways, which put Class, Position and School off the edge — the columns
     somebody opens a roster to read. It has at most five columns and they all
     fit, so it is sized to the screen instead. */
  for (const width of [430, 390, 360]) {
    const { page, ctx, errors } = await open('/farmingtontigersnh/rosters',
      { width, rosters: [...ROSTERS, SOCCER_ROSTER] });
    await page.waitForTimeout(800);

    // Soccer is the widest real roster: it carries a School column.
    const soccer = page.locator('#sportPills .ft-pill', { hasText: 'Soccer' });
    if (await soccer.count()) { await soccer.first().click(); await page.waitForTimeout(500); }

    const box = await page.locator('.ft-rosterwrap').evaluate(e =>
      ({ scrollW: e.scrollWidth, clientW: e.clientWidth }));
    check(`at ${width}px the roster does not scroll sideways`,
      box.scrollW <= box.clientW + 1, `${box.scrollW} vs ${box.clientW}`);

    const shown = await page.evaluate(() =>
      [...document.querySelectorAll('.ft-rostertable thead th')]
        .filter(th => getComputedStyle(th).display !== 'none').map(th => th.textContent.trim()));
    check(`  Class is on screen`, shown.includes('Class'), shown.join('/'));
    check(`  School too`, shown.includes('School'), shown.join('/'));

    // Every column fully inside the box, not clipped at the right edge.
    const inside = await page.evaluate(() => {
      const wrap = document.querySelector('.ft-rosterwrap').getBoundingClientRect();
      return [...document.querySelectorAll('.ft-rostertable thead th')]
        .filter(th => getComputedStyle(th).display !== 'none')
        .every(th => th.getBoundingClientRect().right <= wrap.right + 1);
    });
    check('  and every heading sits inside the screen', inside);

    check('  the page itself still does not scroll sideways',
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    check('  no page errors', errors.length === 0, errors[0] || '');
    await ctx.close();
  }
}
{
  // Height is what gives way when the columns run out of room.
  const withHeight = { ...ROSTERS[0], id: 900, players_json: JSON.stringify([
    { number: '4', name: 'Ava Thibodeau', class: 'Sr', position: 'OH', height: "5'9\"" }]) };
  const { page, ctx } = await open('/farmingtontigersnh/rosters',
    { width: 390, rosters: [withHeight] });
  await page.waitForTimeout(800);
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll('.ft-rostertable thead th')]
      .filter(th => getComputedStyle(th).display !== 'none').map(th => th.textContent.trim()));
  check('height steps aside on a phone', !shown.includes('Ht'), shown.join('/'));
  check('but Class and Pos stay',
    shown.includes('Class') && shown.includes('Pos'), shown.join('/'));
  await ctx.close();
}
{
  // On a desktop nothing is hidden and the order is still Class then Pos.
  const { page, ctx } = await open('/farmingtontigersnh/rosters',
    { rosters: [{ ...ROSTERS[0], id: 901, players_json: JSON.stringify([
      { number: '4', name: 'Ava Thibodeau', class: 'Sr', position: 'OH', height: "5'9\"" }]) }] });
  await page.waitForTimeout(700);
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll('.ft-rostertable thead th')]
      .filter(th => getComputedStyle(th).display !== 'none').map(th => th.textContent.trim()));
  check('a wide screen keeps height', shown.includes('Ht'), shown.join('/'));
  check('and still reads Class then Pos',
    shown.indexOf('Class') < shown.indexOf('Pos'), shown.join('/'));
  await ctx.close();
}

// ── 33 ──────────────────────────────────────────────────────────────────────
console.log('\n33. Dark on a phone, light on a desktop');
/* The phone theme is one block of variables in farmington.css, so the risk is
   not the block — it is a colour somewhere that never went through a variable
   and stays white on a black page, or text that was fine on white and is now
   unreadable. So besides spot checks, every page gets two sweeps:

     SURFACES — no visible element on a phone has a light background.
     CONTRAST — every visible run of text clears WCAG AA against whatever is
                actually behind it, found by compositing up the tree.

   Both sweeps count what they looked at, and each page first asserts its data
   actually rendered — an empty page has nothing light on it and nothing to
   read, and would pass both for the wrong reason. */

const sweep = () => {
  const P = s => { const m = s.match(/[\d.]+/g); if (!m) return null;
    return { r:+m[0], g:+m[1], b:+m[2], a: m[3] === undefined ? 1 : +m[3] }; };
  const over = (top, under) => ({ r: top.r*top.a + under.r*(1-top.a),
    g: top.g*top.a + under.g*(1-top.a), b: top.b*top.a + under.b*(1-top.a), a:1 });
  const lum = c => { const f = v => { v/=255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; };
    return .2126*f(c.r) + .7152*f(c.g) + .0722*f(c.b); };
  const ratio = (a,b) => { const x=lum(a), y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  const hex = c => '#' + [c.r,c.g,c.b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
  // What is actually behind an element: its own background, then each
  // ancestor's, composited until something is opaque. The page is the floor.
  const behind = el => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = P(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let acc = { r:255, g:255, b:255, a:1 };
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  };
  const shown = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    }
    return true;
  };
  const isOrange = c => Math.abs(c.r-246)<6 && Math.abs(c.g-130)<6 && Math.abs(c.b-32)<6 ||
                        Math.abs(c.r-217)<6 && Math.abs(c.g-107)<6 && Math.abs(c.b-18)<6;

  const out = { texts:0, surfaces:0, light:[], low:[], onOrange:[] };
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT','STYLE','IMG','SVG','PICTURE','SOURCE','OPTION','BR'].includes(el.tagName) || el.closest('svg')) continue;
    if (!shown(el)) continue;
    const cs = getComputedStyle(el);
    const bg = P(cs.backgroundColor);
    const r = el.getBoundingClientRect();
    if (bg && bg.a > 0.5 && r.width*r.height > 150) {
      out.surfaces++;
      if (lum(bg) > .5) out.light.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${hex(bg)}`);
    }
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    const isField = ['INPUT','SELECT','TEXTAREA'].includes(el.tagName) && el.type !== 'checkbox' && el.type !== 'hidden';
    if (!isField && !/[A-Za-z0-9]/.test(own)) continue;
    const back = behind(el);
    let fg = P(cs.color); if (fg.a < 1) fg = over(fg, back);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    const cr = ratio(fg, back);
    const label = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(own || el.value || '').slice(0,24)}" ${hex(fg)} on ${hex(back)} = ${cr.toFixed(2)}`;
    if (isOrange(back)) { out.onOrange.push(label); continue; }
    out.texts++;
    if (cr < need) out.low.push(label);
  }
  return out;
};

const PHONE_PAGES = [
  ['/farmingtontigersnh',           '#recentBody tbody tr, #recentBody .ft-week-game, #storyBody .ft-story'],
  ['/farmingtontigersnh/schedule',  '#scheduleBody tbody tr'],
  ['/farmingtontigersnh/standings', '#standBody tbody tr'],
  ['/farmingtontigersnh/rosters',   '#rosterBody tbody tr'],
  ['/farmingtontigersnh/photos',    '#photoBody .ft-gallery'],
  ['/farmingtontigersnh/videos',    '#videoBody .ft-video'],
  ['/farmingtontigersnh/news',      '.ft-placeholder a'],
  ['/farmingtonscore.html',         '.ft-card.ft-pad input'],
  ['/farmington-offline.html',      '.ft-btn']
];
const onOrangeSeen = new Set();
for (const [path, rows] of PHONE_PAGES) {
  const { page, ctx, errors } = await open(path, { width: 390 });
  await page.waitForTimeout(600);
  const n = await page.locator(rows).count();
  check(`${path}: premise — the page actually rendered (${rows})`, n > 0, String(n));
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(`${path}: the page is Ball603's mobile black`, bodyBg === 'rgb(13, 13, 13)', bodyBg);
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  check(`${path}: native controls are told it is dark`, scheme === 'dark', scheme);
  const r = await page.evaluate(sweep);
  check(`${path}: premise — the sweeps had something to look at`, r.texts > 5 && r.surfaces > 3,
    `${r.texts} texts, ${r.surfaces} surfaces`);
  check(`${path}: no light surface anywhere`, r.light.length === 0, r.light.slice(0,5).join(' | '));
  check(`${path}: every run of text clears AA`, r.low.length === 0, r.low.slice(0,6).join(' | '));
  r.onOrange.forEach(x => onOrangeSeen.add(x.replace(/"[^"]*"/, '')));
  check(`${path}: no page errors`, errors.length === 0, errors.join('; '));
  await ctx.close();
}

// Spot checks on the pieces most likely to go wrong.
{
  const { page, ctx } = await open('/farmingtontigersnh/standings', { width: 390 });
  await page.waitForTimeout(600);
  const st = await page.evaluate(() => {
    const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'missing'; };
    return { card: g('.ft-card', 'backgroundColor'), bar: g('.ft-cardbar', 'backgroundColor'),
             barText: g('.ft-cardbar h2', 'color'), th: g('.ft-table th', 'backgroundColor'),
             us: g('.ft-table tr.ft-us td', 'backgroundColor'), usText: g('.ft-table tr.ft-us td', 'color'),
             rank: g('.ft-rank', 'color') };
  });
  check('cards are Ball603\'s #1e1e1e', st.card === 'rgb(30, 30, 30)', st.card);
  // The bar used to be painted with the ink colour, which turns white here.
  check('the standings bar stays black rather than following the ink to white',
    st.bar === 'rgb(0, 0, 0)' && st.barText === 'rgb(255, 255, 255)', JSON.stringify(st));
  check('table headers are a dark grey, not #ececec', st.th === 'rgb(38, 38, 38)', st.th);
  check('the Farmington row is a dark orange tint with white text',
    st.us === 'rgb(61, 42, 0)' && st.usText === 'rgb(255, 255, 255)', `${st.us} ${st.usText}`);
  check('rank is still the logo orange', st.rank === 'rgb(246, 130, 32)', st.rank);
  const pill = await page.evaluate(() => {
    const e = document.querySelector('.ft-pill.on'); if (!e) return null;
    const cs = getComputedStyle(e);
    return { bg: cs.backgroundColor, color: cs.color, tray: getComputedStyle(e.parentElement).backgroundColor };
  });
  check('premise — there is a selected pill', !!pill);
  check('the selected pill is lifted out of a dark tray in orange text',
    pill && pill.tray === 'rgb(38, 38, 38)' && pill.bg === 'rgb(53, 53, 53)' && pill.color === 'rgb(246, 130, 32)',
    JSON.stringify(pill));
  await ctx.close();
}
{
  // Streak badges and W/L on a dark card: the light-theme green and red are
  // both under 3:1 on #1e1e1e.
  const { page, ctx } = await open('/farmingtontigersnh/schedule', { width: 390 });
  await page.waitForTimeout(600);
  const c = await page.evaluate(() => {
    const g = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).color : null; };
    return { W: g('.ft-result .W'), L: g('.ft-result .L') };
  });
  check('premise — the schedule has a win and a loss to look at', c.W && c.L, JSON.stringify(c));
  check('wins are the light green', c.W === 'rgb(139, 214, 148)', c.W);
  check('losses are the light red', c.L === 'rgb(242, 147, 140)', c.L);
  await ctx.close();
}
{
  // The footer credit: the black wordmark would vanish on a black page.
  const { page, ctx } = await open('/farmingtontigersnh', { width: 390 });
  const src = await page.locator('.ft-powered img').evaluate(e => e.currentSrc);
  check('on a phone the footer carries the white wordmark from Ball603\'s navbar',
    src.endsWith('/Ball603-new-WHITE.svg'), src);
  const box = await page.locator('.ft-powered img').evaluate(e => ({ w: e.getBoundingClientRect().width,
    h: e.getBoundingClientRect().height, loaded: e.complete && e.naturalWidth > 0 }));
  // Loaded, not just sized: a broken image draws its alt text at much the same width.
  check('the footer wordmark actually loads', box.loaded, JSON.stringify(box));
  // An SVG with no width or height of its own can collapse to nothing; this one
  // is 276x74, so at 22px tall it should be about 82 wide.
  check('and it is actually drawn, at the wordmark\'s shape', box.h === 22 && box.w > 70 && box.w < 95, JSON.stringify(box));
  // My Teams is a modal on the same card colours: open it and sweep it too.
  await page.click('#ft-star');
  await page.waitForTimeout(400);
  const open_ = await page.locator('.ft-modal.on').count();
  check('premise — the My Teams modal opened', open_ === 1, String(open_));
  const bg = await page.locator('.ft-modal.on').evaluate(e => getComputedStyle(e).backgroundColor);
  check('the modal is a dark card', bg === 'rgb(30, 30, 30)', bg);
  const r = await page.locator('.ft-modal.on').evaluate((m, fn) => {
    // Only the modal: hide everything else from the sweep.
    const f = new Function('return (' + fn + ')')();
    const res = f(); return res;
  }, sweep.toString());
  check('and nothing on the page with it open is light or unreadable',
    r.light.length === 0 && r.low.length === 0, [...r.light, ...r.low].slice(0,6).join(' | '));
  await ctx.close();
}
{
  // The score page's inputs were a literal #fff.
  const { page, ctx } = await open('/farmingtonscore.html', { width: 390 });
  const f = await page.locator('.ft-card.ft-pad input').first().evaluate(e => {
    const cs = getComputedStyle(e); return { bg: cs.backgroundColor, color: cs.color }; });
  check('score entry fields are dark with white type',
    f.bg === 'rgb(20, 20, 20)' && f.color === 'rgb(255, 255, 255)', JSON.stringify(f));
  await ctx.close();
}

// Desktop is untouched.
for (const path of ['/farmingtontigersnh', '/farmingtontigersnh/standings', '/farmingtontigersnh/schedule']) {
  const { page, ctx } = await open(path, { width: 1300 });
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundColor,
    card: getComputedStyle(document.querySelector('.ft-card, .ft-summary > div') || document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
    scheme: getComputedStyle(document.documentElement).colorScheme,
    logo: document.querySelector('.ft-powered img')?.currentSrc || ''
  }));
  check(`${path} on a desktop is still light`,
    st.body === 'rgb(246, 246, 246)' && st.card === 'rgb(255, 255, 255)' && st.ink === 'rgb(20, 20, 20)' && st.scheme !== 'dark',
    JSON.stringify(st));
  check(`${path} on a desktop keeps the black footer wordmark`, st.logo.includes('Ball603-new-BLACK'), st.logo);
  await ctx.close();
}
{
  // Either side of the line: 760 is dark, 761 is not.
  for (const [w, dark] of [[760, true], [761, false]]) {
    const { page, ctx } = await open('/farmingtontigersnh/standings', { width: w });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check(`${w}px is ${dark ? 'dark' : 'light'} — the same line the phone layout uses`,
      dark ? bg === 'rgb(13, 13, 13)' : bg === 'rgb(246, 246, 246)', bg);
    await ctx.close();
  }
}
if (onOrangeSeen.size) {
  console.log('   NOTE  text on an orange surface, left alone (same on light and dark):');
  [...onOrangeSeen].forEach(x => console.log('         ' + x));
}

// ── 34 ──────────────────────────────────────────────────────────────────────
console.log('\n34. Score entry: sport, then a day at a time');
{
  const { page, ctx, errors } = await open('/farmingtonscore.html', { width: 390 });
  const posts = [];
  await page.route('**/.netlify/functions/farmington-score', async r => {
    const body = JSON.parse(r.request().postData() || '{}');
    posts.push(body);
    if (String(body.password).toLowerCase() !== 'tigers') return r.fulfill({ status: 401, json: { error: 'Wrong password' } });
    if (body.unique_game_id === -1) return r.fulfill({ status: 404, json: { error: 'No such game' } });
    return r.fulfill({ json: { game: { manual_my_score: body.my_score ?? null, manual_opp_score: body.opp_score ?? null } } });
  });
  const visible = (sel) => page.locator(sel).evaluate(e => e.classList.contains('on')).catch(() => false);
  const txt = async (sel) => (await page.textContent(sel)).replace(/\s+/g, ' ').trim();

  await page.fill('#pw', 'nope'); await page.click('#loginBtn'); await page.waitForTimeout(300);
  check('a wrong password is turned away', /not right/.test(await txt('#loginErr')), await txt('#loginErr'));
  await page.fill('#pw', 'Tigers'); await page.click('#loginBtn'); await page.waitForTimeout(500);
  check('the right one opens the sport picker', await visible('#s-sport'));

  const sports = await page.locator('.ft-sportbtn').allTextContents();
  const names = sports.map(s => s.replace(/[^A-Za-z ]/g, '').trim());
  check('premise — there are sports to choose from', names.length >= 3, names.join('/'));
  check('one button per sport, in the site\'s order',
    names.join('/') === 'Volleyball/Soccer/Football/Golf/Basketball', names.join('/'));
  check('cross country is left off: its meets have no score to type', !names.includes('Cross Country'));

  // Soccer, today: Thursday the 17th, varsity at home to Newport.
  await page.click('.ft-sportbtn:has-text("Soccer")'); await page.waitForTimeout(200);
  check('picking a sport opens that sport\'s games', await visible('#s-games'));
  check('headed with the sport', /Soccer/.test(await txt('#daySport')), await txt('#daySport'));
  check('and opening on today', await txt('#dayDate') === 'Today · Thursday, September 17', await txt('#dayDate'));
  let rows = await page.locator('#gameList .ft-gitem').allTextContents();
  check('today\'s soccer game is listed', rows.length === 1 && /vs Newport/.test(rows[0]), rows.join(' | '));
  check('with its team named, since every level shares the list', /Varsity Soccer/.test(rows[0]), rows[0]);

  // Forward a day: nothing on the 18th, and a shortcut to the days either side.
  await page.click('#dayNext'); await page.waitForTimeout(150);
  check('the right arrow moves a day forward', await txt('#dayDate') === 'Friday, September 18', await txt('#dayDate'));
  check('an empty day says so', /No soccer games on this day/.test(await txt('#gameList')), await txt('#gameList'));
  const jumps = await page.locator('.ft-jump').allTextContents();
  check('with a jump to the nearest game day either side',
    jumps.length === 2 && /Sep 17/.test(jumps[0]) && /Sep 19/.test(jumps[1]), jumps.join(' | '));
  await page.click('.ft-jump:has-text("Sep 19")'); await page.waitForTimeout(150);
  rows = await page.locator('#gameList .ft-gitem').allTextContents();
  check('the jump lands on that day', await txt('#dayDate') === 'Saturday, September 19', await txt('#dayDate'));
  check('a JV game appears alongside, and its status shows', rows.length === 1 && /JV Soccer/.test(rows[0]) && /Postponed/.test(rows[0]), rows.join(' | '));

  // Back two days to the 17th, then one more to the 16th: the left arrow.
  await page.click('#dayPrev'); await page.click('#dayPrev'); await page.click('#dayPrev'); await page.waitForTimeout(150);
  check('the left arrow moves a day back', await txt('#dayDate') === 'Wednesday, September 16', await txt('#dayDate'));

  // Volleyball on the 18th: varsity and JV both, varsity first even though JV starts earlier.
  await page.click('#sportBack'); await page.waitForTimeout(100);
  check('the back link returns to the sports', await visible('#s-sport'));
  await page.click('.ft-sportbtn:has-text("Volleyball")'); await page.waitForTimeout(150);
  check('a new sport starts on today again', /^Today/.test(await txt('#dayDate')), await txt('#dayDate'));
  await page.click('#dayNext'); await page.waitForTimeout(150);
  rows = await page.locator('#gameList .ft-gitem').allTextContents();
  check('every level is on the one day', rows.length === 2, rows.join(' | '));
  check('varsity first, then JV', /Varsity Volleyball/.test(rows[0]) && /JV Volleyball/.test(rows[1]), rows.join(' | '));
  check('an unplayed game shows its start time', /6:15PM/.test(rows[0]), rows[0]);

  // Enter a score and check exactly what is sent.
  await page.locator('#gameList .ft-gitem').first().click(); await page.waitForTimeout(150);
  check('tapping a game opens score entry', await visible('#s-score'));
  check('the home team is on the left', await txt('#leftLabel') === 'Farmington', await txt('#leftLabel'));
  await page.fill('#leftScore', '3'); await page.fill('#rightScore', '1');
  await page.click('#saveBtn'); await page.waitForTimeout(300);
  const sent = posts[posts.length - 1];
  check('the save carries the right game and our score first',
    sent.unique_game_id === 4 && sent.uteam === 4575537 && sent.my_score === 3 && sent.opp_score === 1 && sent.password === 'Tigers',
    JSON.stringify(sent));
  check('and the done screen confirms it', await visible('#s-done') && /3–1/.test(await txt('#doneSub')), await txt('#doneSub'));

  await page.click('#anotherBtn'); await page.waitForTimeout(150);
  check('"Enter another" returns to the same sport and day',
    await visible('#s-games') && await txt('#dayDate') === 'Friday, September 18' && /Volleyball/.test(await txt('#daySport')),
    await txt('#dayDate'));
  rows = await page.locator('#gameList .ft-gitem').allTextContents();
  check('where the game now shows the score just entered', /3–1 entered/.test(rows[0]), rows[0]);
  check('no page errors', errors.length === 0, errors.join('; '));
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed`);






await browser.close(); server.close();
process.exit(fail?1:0);
