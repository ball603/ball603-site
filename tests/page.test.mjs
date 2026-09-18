/* standings.html itself, rendered against stubbed feeds, to prove the Rating
   column lands where it should and the division comes out in NHIAA's order. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';

const ROOT = '/root/ball603/ball603-site-main', PORT = 8341;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

// Division I as NHIAA publishes it, already through the fixed scraper: points
// and rating are two different numbers.
const TEAMS = [
  ['Bedford', 5, 0, 20, 4],
  ['Salem', 6, 0, 24, 4],
  ['Bishop Guertin', 4, 1, 16, 3.2],
  ['Nashua North', 3, 2, 12, 2.4],
  ['Dover', 3, 3, 12, 2],
  ['Goffstown', 2, 2, 8, 2],
  ['Nashua South', 3, 4, 12, 1.71429],
  ['Alvirne', 0, 4, 0, 0]
].map(([school, wins, losses, points, rating]) => ({
  school, wins, losses, ties: 0, points, rating,
  games_played: wins + losses, win_pct: wins / (wins + losses || 1),
  sport: 'gvolleyball', season: '2026', gender: 'Girls', division: 'D-I'
}));

const server = http.createServer((q, s) => {
  const url = new URL(q.url, 'http://x');
  let p = decodeURIComponent(url.pathname);

  if (p.startsWith('/.netlify/functions/')) {
    const fn = p.replace('/.netlify/functions/', '');
    const json = (body) => { s.writeHead(200, {'Content-Type':'application/json'}); s.end(JSON.stringify(body)); };
    // Tagged with whatever sport the page asked for, so the same fixture can
    // drive the volleyball table and a non-volleyball one.
    /* Tagged with whatever sport the page asked for, so the same fixture can
       drive the volleyball table and a non-volleyball one. The page picks the
       gender itself — Girls for volleyball, Boys for everything else — so the
       rows have to follow it or the filter finds nothing. */
    if (fn === 'get-standings') {
      const sport = url.searchParams.get('sport') || 'gvolleyball';
      const gender = sport === 'gvolleyball' ? 'Girls' : 'Boys';
      return json({ standings: TEAMS.map(t => ({ ...t, sport, gender })) });
    }
    if (fn === 'get-games') return json({ games: [] });
    if (fn === 'playoff-seeds') return json({ seeds: [], locked: false });
    if (fn === 'resolve-tiebreakers') return json({ tieGroups: [] });
    return json({});
  }
  if (p === '/') p = '/standings.html';
  if (p.startsWith('/logos/')) { s.writeHead(200, {'Content-Type':'image/png'}); return s.end(PNG); }
  const f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    s.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
    return fs.createReadStream(f).pipe(s);
  }
  s.writeHead(404); s.end('nf');
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };

async function open(width = 1300, sport = 'gvolleyball') {
  const ctx = await browser.newContext({ viewport: { width, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/standings.html?sport=${sport}&division=D-I`,
    { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.standings-table', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { page, ctx, errors };
}

console.log('\n1. The volleyball table');
{
  const { page, ctx, errors } = await open();
  const heads = (await page.locator('.standings-table thead .sub-row th').allTextContents())
    .map(t => t.trim());
  check('Points and Rating are both there', heads.includes('Points') && heads.includes('Rating'),
    heads.join('/'));
  check('Points comes first, as on the NHIAA page',
    heads.indexOf('Points') < heads.indexOf('Rating'), heads.join('/'));
  check('and both sit under Regular Season', await page.evaluate(() => {
    const group = [...document.querySelectorAll('.group-row th')].find(th => /Regular/.test(th.textContent));
    return Number(group.getAttribute('colspan')) === 3;
  }));

  const rows = await page.locator('.standings-table tbody tr').evaluateAll(trs =>
    trs.map(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
      return { team: tr.querySelector('.team-name')?.textContent.trim(), cells };
    }));

  check('every team is listed', rows.length === 8, String(rows.length));
  const order = rows.map(r => r.team);
  check('Nashua South is below Dover', order.indexOf('Nashua South') > order.indexOf('Dover'),
    order.join(' > '));
  check('and below Goffstown', order.indexOf('Nashua South') > order.indexOf('Goffstown'),
    order.join(' > '));
  check('Alvirne is last', order[order.length - 1] === 'Alvirne', order.join(' > '));

  const nashua = rows.find(r => r.team === 'Nashua South');
  check('the points cell shows a whole number', nashua.cells.includes('12'), nashua.cells.join('|'));
  check('and the rating cell three decimals', nashua.cells.includes('1.714'), nashua.cells.join('|'));
  check('they are not the same cell', nashua.cells.filter(c => c === '12').length >= 1);

  const bedford = rows.find(r => r.team === 'Bedford');
  check('a round rating still reads as a rating', bedford.cells.includes('4.000'), bedford.cells.join('|'));
  check('beside its 20 points', bedford.cells.includes('20'), bedford.cells.join('|'));

  // The site registers a service worker; this harness does not serve one, and
  // the browser complains about that rather than about the page.
  const real = errors.filter(e => !/ServiceWorker/i.test(e));
  check('the headings line up with the numbers underneath them',
    await page.evaluate(() => {
      const visible = (row) => [...row.children].filter(c => getComputedStyle(c).display !== 'none').length;
      return visible(document.querySelector('.standings-table thead .sub-row')) + 2 ===
             visible(document.querySelector('.standings-table tbody tr'));
    }));

  check('no page errors', real.length === 0, real[0] || '');
  await ctx.close();
}

console.log('\n2. On a phone');
{
  const { page, ctx } = await open(390);
  const shown = await page.evaluate(() => {
    const ths = [...document.querySelectorAll('.standings-table thead .sub-row th')];
    return ths.filter(th => getComputedStyle(th).display !== 'none').map(th => th.textContent.trim());
  });
  // Rating is what the table is sorted on, so it is the one that has to survive
  // the narrow screen. Points goes the way Home and Away already do.
  check('Rating survives', shown.includes('Rating'), shown.join('/'));
  check('Points steps aside, like Home and Away', !shown.includes('Points'), shown.join('/'));
  /* The header row and the body have to agree on how many columns there are, or
     the numbers sit under the wrong headings. # and Team live in the group row
     above with rowspan=2, so the sub-row is two cells short of a body row by
     design — that difference is the thing being checked, not zero. */
  check('the headings still line up with the numbers underneath them',
    await page.evaluate(() => {
      const visible = (row) => [...row.children].filter(c => getComputedStyle(c).display !== 'none').length;
      const head = visible(document.querySelector('.standings-table thead .sub-row'));
      const body = visible(document.querySelector('.standings-table tbody tr'));
      return { head, body };
    }).then(r => r.head + 2 === r.body),
    JSON.stringify(await page.evaluate(() => {
      const visible = (row) => [...row.children].filter(c => getComputedStyle(c).display !== 'none').length;
      return { head: visible(document.querySelector('.standings-table thead .sub-row')),
               body: visible(document.querySelector('.standings-table tbody tr')) };
    })));
  await ctx.close();
}

console.log('\n3. Every other sport is untouched');
{
  // Baseball and the rest publish a rating and no points total, and their table
  // has to come out exactly as it did before volleyball gained a column.
  const { page, ctx } = await open(1300, 'baseball');
  const heads = (await page.locator('.standings-table thead .sub-row th').allTextContents())
    .map(t => t.trim());
  check('one Rating column, no Points', heads.includes('Rating') && !heads.includes('Points'),
    heads.join('/'));
  check('and Regular Season spans two columns again', await page.evaluate(() => {
    const group = [...document.querySelectorAll('.group-row th')].find(th => /Regular/.test(th.textContent));
    return Number(group.getAttribute('colspan')) === 2;
  }));
  check('the headings line up with the numbers', await page.evaluate(() => {
    const visible = (row) => [...row.children].filter(c => getComputedStyle(c).display !== 'none').length;
    return visible(document.querySelector('.standings-table thead .sub-row')) + 2 ===
           visible(document.querySelector('.standings-table tbody tr'));
  }));
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
