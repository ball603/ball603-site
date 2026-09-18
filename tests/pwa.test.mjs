/* The Tigers PWA, driven through a server that mimics Netlify's rewrites so the
   URLs the browser sees are the ones it will see in production. Service workers
   need a secure context, and http://localhost counts as one. */
import { chromium } from 'playwright';
import { TEAMS, GAMES, STANDINGS, ROSTERS, VIDEOS, ALBUMS, STORIES } from './fixture2.mjs';
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';

const ROOT = '/root/ball603/ball603-site-main', PORT = 8351;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
               '.jpg':'image/jpeg','.json':'application/json' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

/* The two versions that have to move together, read straight off the files.
   A cached asset replaced at the same URL is served from the old cache forever,
   which is how a fixed Home Screen icon stayed broken through two deploys. */
const SW_SRC = fs.readFileSync(path.join(ROOT, 'farmington-sw.js'), 'utf8');
const CACHE_NAME = (SW_SRC.match(/const CACHE = '([^']+)'/) || [])[1];

// The Netlify rules this depends on, transcribed from _redirects.
const MAP = {
  '/farmingtontigersnh':            '/farmingtontigersnh.html',
  '/farmingtontigersnh/':           '/farmingtontigersnh.html',
  '/farmingtontigersnh/schedule':   '/farmington-schedule.html',
  '/farmingtontigersnh/standings':  '/farmington-standings.html',
  '/farmingtontigersnh/rosters':    '/farmington-rosters.html',
  '/farmingtontigersnh/photos':     '/farmington-photos.html',
  '/farmingtontigersnh/videos':     '/farmington-videos.html',
  '/farmingtontigersnh/manifest.json': '/farmington-manifest.json',
  '/farmingtontigersnh/sw.js':      '/farmington-sw.js'
};

let offline = false;               // flipped to make the network "fail"
const served = [];

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  served.push(p);
  if (MAP[p]) p = MAP[p];

  if (offline && !p.endsWith('sw.js')) { s.destroy(); return; }

  if (p.startsWith('/logos/') || p.startsWith('/icons/')) {
    const real = path.join(ROOT, p);
    if (fs.existsSync(real)) {
      s.writeHead(200, { 'Content-Type': 'image/png' });
      return fs.createReadStream(real).pipe(s);
    }
    s.writeHead(200, { 'Content-Type': 'image/png' }); return s.end(PNG);
  }
  const f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    const headers = { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' };
    // The header _headers grants the worker.
    if (p === '/farmington-sw.js') headers['Service-Worker-Allowed'] = '/';
    s.writeHead(200, headers);
    return fs.createReadStream(f).pipe(s);
  }
  s.writeHead(404); s.end('nf');
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };

async function open(pathname = '/farmingtontigersnh/', width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/rest/v1/**', r => {
    const u = r.request().url();
    if (u.includes('farmington_teams')) return r.fulfill({ json: TEAMS });
    if (u.includes('farmington_games')) return r.fulfill({ json: GAMES });
    if (u.includes('farmington_standings')) return r.fulfill({ json: STANDINGS });
    if (u.includes('farmington_videos')) return r.fulfill({ json: VIDEOS });
    if (u.includes('farmington_albums')) return r.fulfill({ json: ALBUMS });
    if (u.includes('farmington_stories')) return r.fulfill({ json: STORIES.filter(x => x.published) });
    if (u.includes('roster_submissions')) return r.fulfill({ json: ROSTERS });
    return r.fulfill({ json: [] });
  });
  await page.route('**/functions/**', r => r.fulfill({ json: { games: [] } }));
  await page.goto(`http://localhost:${PORT}${pathname}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}

// ── 1 ───────────────────────────────────────────────────────────────────────
console.log('\n1. The manifest');
{
  const { page, ctx, errors } = await open();
  const href = await page.evaluate(() =>
    document.querySelector('link[rel="manifest"]')?.getAttribute('href'));
  check('every page links a manifest', !!href, String(href));
  check('and it is the Tigers one, under the Tigers path',
    href === '/farmingtontigersnh/manifest.json', String(href));

  const res = await page.request.get(`http://localhost:${PORT}${href}`);
  check('which the server actually serves', res.ok(), String(res.status()));
  const m = await res.json();

  check('named for the app, not the page', m.name === 'Farmington Tigers', m.name);
  check('with a short name that fits under an icon',
    m.short_name === 'Tigers' && m.short_name.length <= 12, m.short_name);
  check('it opens standalone, not in a browser tab', m.display === 'standalone', m.display);

  /* start_url and scope are relative on purpose: the same file is served at
     /farmingtontigersnh/manifest.json and, on the Tigers domain, at
     /manifest.json, and "./" means the right thing in both places. */
  check('start_url is relative', m.start_url === './', m.start_url);
  check('scope is relative', m.scope === './', m.scope);

  const resolved = new URL(m.start_url, `http://localhost:${PORT}${href}`).pathname;
  check('so here it resolves to the Tigers home page',
    resolved === '/farmingtontigersnh/', resolved);
  const home = await page.request.get(`http://localhost:${PORT}${resolved}`);
  check('and that URL serves the home page', home.ok() && (await home.text()).includes('ft-header'),
    String(home.status()));

  // On the Tigers domain the same file sits at the root instead.
  check('on the Tigers domain the same file means the site root',
    new URL(m.start_url, 'https://farmingtontigersnh.com/manifest.json').pathname === '/');

  check('no page errors', errors.length === 0, errors[0] || '');
  await ctx.close();
}

// ── 2 ───────────────────────────────────────────────────────────────────────
console.log('\n2. The icons');
{
  const { page, ctx } = await open();
  const href = await page.evaluate(() => document.querySelector('link[rel="manifest"]').href);
  const m = await (await page.request.get(href)).json();

  const sizes = m.icons.map(i => `${i.sizes}/${i.purpose}`);
  check('a 192 and a 512, which is what installing needs',
    m.icons.some(i => i.sizes === '192x192') && m.icons.some(i => i.sizes === '512x512'),
    sizes.join(' '));
  /* Two sets, not one marked "any maskable". A launcher crops a maskable icon to
     roughly the middle 80%, and the tiger's ears are in the outer 20% — so the
     full-bleed artwork is offered as "any" and a padded copy as "maskable". */
  check('separate any and maskable icons',
    m.icons.some(i => i.purpose === 'any') && m.icons.some(i => i.purpose === 'maskable'),
    sizes.join(' '));
  check('none of them claims to be both',
    !m.icons.some(i => (i.purpose || '').includes(' ')), sizes.join(' '));

  for (const icon of m.icons) {
    const r = await page.request.get(`http://localhost:${PORT}${icon.src}`);
    check(`${icon.src.split('/').pop()} is there`, r.ok(), String(r.status()));
  }
  const apple = await page.evaluate(() =>
    document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'));
  check('iOS has its own icon', /farmington/.test(apple || ''), String(apple));
  check('which is served too',
    (await page.request.get(`http://localhost:${PORT}${apple}`)).ok());
  await ctx.close();
}

// ── 3 ───────────────────────────────────────────────────────────────────────
console.log('\n3. The service worker');
{
  const { page, ctx, errors } = await open();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null ||
    navigator.serviceWorker.getRegistrations().then(r => r.length > 0), null, { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  const regs = await page.evaluate(async () => {
    const list = await navigator.serviceWorker.getRegistrations();
    return list.map(r => ({ scope: new URL(r.scope).pathname,
                            script: r.active ? new URL(r.active.scriptURL).pathname : null }));
  });
  check('a worker is registered', regs.length === 1, JSON.stringify(regs));

  /* The scope is the whole point. Ball603's own worker is registered at the root
     with scope "/", so it already controls these URLs; a narrower scope is what
     takes them back. It must not reach the rest of Ball603 either. */
  check('scoped to the Tigers section and no wider',
    regs[0].scope === '/farmingtontigersnh/', regs[0].scope);
  check('and served from inside that scope, which is what allows it',
    regs[0].script === '/farmingtontigersnh/sw.js', String(regs[0].script));

  check('the page is being controlled by it',
    await page.evaluate(() => !!navigator.serviceWorker.controller));
  check('no page errors', errors.length === 0, errors[0] || '');
  await ctx.close();
}

// ── 4 ───────────────────────────────────────────────────────────────────────
console.log('\n4. What it will and will not hold on to');
{
  const { page, ctx } = await open();
  await page.waitForTimeout(2500);

  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const mine = names.filter(n => n.startsWith('tigers-'));
    const c = await caches.open(mine[0]);
    return { names: mine, urls: (await c.keys()).map(r => new URL(r.url).pathname + new URL(r.url).search) };
  });
  check('it keeps its own cache, separate from Ball603\'s',
    cached.names.length === 1 && cached.names[0].startsWith('tigers-'), cached.names.join());
  check('the stylesheet is in it, for an offline launch',
    cached.urls.includes('/farmington.css'), cached.urls.join(' '));
  check('and the script', cached.urls.includes('/farmington.js'), cached.urls.join(' '));
  check('and the offline page', cached.urls.includes('/farmington-offline.html'),
    cached.urls.join(' '));

  /* Scores must never come from a cache. A stale score is worse than no score,
     and the Supabase rows behind every page on this site are scores. */
  check('no Supabase responses are cached',
    !cached.urls.some(u => /rest\/v1|supabase/.test(u)), cached.urls.join(' '));
  await ctx.close();
}

// ── 5 ───────────────────────────────────────────────────────────────────────
console.log('\n5. Fresh script, even with a worker in the way');
{
  /* The whole reason farmington.css and farmington.js carry no-cache headers is
     that a page served against an hour-old script throws before it renders. A
     service worker that answered those two from cache would reintroduce exactly
     that bug, so while the network is up they must come from the network. */
  const { page, ctx } = await open();
  await page.waitForTimeout(2500);

  const before = served.filter(p => p === '/farmington.js').length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const after = served.filter(p => p === '/farmington.js').length;

  check('the script is fetched again on a reload rather than served from cache',
    after > before, `${before} → ${after}`);
  await ctx.close();
}

// ── 6 ───────────────────────────────────────────────────────────────────────
console.log('\n6. Offline');
{
  const { page, ctx } = await open();
  await page.waitForTimeout(2500);
  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/schedule`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  offline = true;
  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/schedule`, { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  await page.waitForTimeout(1200);
  /* Checked on the page heading rather than on the word "Schedule", which is in
     the nav of every page including the offline one — a test that would have
     passed whatever came back. */
  const heading = await page.locator('.ft-pagehead h1').first().textContent().catch(() => '');
  check('a page you have already opened still opens with no network',
    heading.trim() === 'Schedule', `heading: ${heading.trim() || '(none)'}`);
  check('and it is the real page, not the offline one',
    await page.locator('.ft-offline').count() === 0);

  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/rosters`, { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  await page.waitForTimeout(1200);
  check('and one you have not gets the offline page, not a browser error',
    await page.locator('.ft-offline h1').count() === 1,
    (await page.title().catch(() => '')) || '(no title)');
  check('which says so in as many words',
    /offline/i.test(await page.locator('.ft-offline h1').textContent().catch(() => '')),
    await page.locator('.ft-offline h1').textContent().catch(() => ''));
  check('and still looks like the Tigers site',
    await page.locator('.ft-header').count() === 1);
  offline = false;
  await ctx.close();
}

// ── 7 ───────────────────────────────────────────────────────────────────────
console.log('\n7. Installing');
{
  const { page, ctx } = await open();
  await page.waitForTimeout(1500);
  await page.locator('#ft-burger').click();
  await page.waitForTimeout(400);

  const row = page.locator('#ft-install');
  check('the menu carries an install row', await row.count() === 1);
  /* Hidden until the browser says the site is installable. Headless Chromium
     never fires beforeinstallprompt, so what is checked here is that it starts
     hidden and that the wiring shows it when the event arrives. */
  check('which stays out of the way until it is offered',
    await row.evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));

  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    e.prompt = () => Promise.resolve();
    window.dispatchEvent(e);
  });
  await page.waitForTimeout(300);
  check('and appears when it is', !(await row.evaluate(e => e.hidden && e.getBoundingClientRect().height === 0)));
  check('reading as an action, not a setting',
    (await row.textContent()).trim() === 'Install App', (await row.textContent()).trim());
  await ctx.close();
}
{
  /* No install button in the header bar. KJ asked for it out: that bar is for
     the site's own tools, and installing is offered by the banner and the menu.
     Asserted rather than just deleted, so it cannot drift back in. */
  const { page, ctx } = await open('/farmingtontigersnh/', 1300);
  await page.waitForTimeout(1200);
  check('nothing in the header bar offers to install',
    await page.locator('#ft-install-bar').count() === 0);
  const barText = (await page.textContent('.ft-header-right')).replace(/\s+/g, ' ').trim();
  check('and the bar carries only share and My Teams',
    !/install/i.test(barText), barText.slice(0, 60));
  await ctx.close();
}

// ── 7b ──────────────────────────────────────────────────────────────────────
console.log('\n7b. The icons iOS actually uses');
{
  const { page, ctx } = await open();
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="apple-touch-icon"]')]
      .map(l => ({ sizes: l.getAttribute('sizes'), href: l.getAttribute('href') })));
  check('iOS is given a sized icon', links.length >= 1, JSON.stringify(links));
  check('including the 180 an iPhone wants',
    links.some(l => l.sizes === '180x180'), JSON.stringify(links));
  check('every one of them is spelled with its size',
    links.every(l => l.sizes), JSON.stringify(links));
  for (const l of links) {
    const r = await page.request.get(`http://localhost:${PORT}${l.href}`);
    check(`${l.href.split('/').pop()} is served`, r.ok(), String(r.status()));
  }
  await ctx.close();
}

// ── 8 ──────────────────────────────────────────────────────────────────────
console.log('\n8. One origin, no leftovers');
{
  /* The site used to answer on two hosts and the app had to work out its paths
     from the hostname. It does not any more — farmingtontigersnh.com redirects
     — so the paths are constants and nothing should still be branching on the
     old domain. */
  const JS = fs.readFileSync(path.join(ROOT, 'farmington.js'), 'utf8');
  const code = JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('no hostname branching left in the app code',
    !/farmingtontigersnh\.com/.test(code),
    (code.match(/.*farmingtontigersnh\.com.*/) || ['none'])[0].trim().slice(0, 70));

  const { page, ctx } = await open();
  const paths = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel="manifest"]').getAttribute('href')
  }));
  check('the manifest is the one under the Tigers path',
    paths.manifest === '/farmingtontigersnh/manifest.json', paths.manifest);
  await ctx.close();

  // And _redirects carries nothing for the old host but the redirect itself.
  const RULES = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const hostRules = RULES.filter(l => /farmingtontigersnh\.com/.test(l));
  check('only the two redirects mention the old domain', hostRules.length === 2,
    String(hostRules.length));
  check('and both of them are the 301',
    hostRules.every(l => l.endsWith('301!')), hostRules.join(' | '));
}

// ── 9 ───────────────────────────────────────────────────────────────────────
console.log('\n9. iPhone, where there is no prompt to give');
{
  /* Safari has never let a page install itself, so beforeinstallprompt never
     fires there and the button has nothing to replay. Without the iOS path the
     install row simply never appeared — which is exactly what KJ hit. */
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
               '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/rest/v1/**', r => r.fulfill({ json: [] }));
  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const banner = page.locator('#ft-install-banner');
  check('the banner appears with no prompt event at all',
    !(await banner.evaluate(e => e.hidden && e.getBoundingClientRect().height === 0)));
  check('and says what it is offering',
    /Get the Tigers app/i.test(await banner.textContent()),
    (await banner.textContent()).replace(/\s+/g, ' ').trim().slice(0, 60));
  check('it clears the home indicator', await banner.evaluate(e =>
    getComputedStyle(e).paddingBottom !== '0px'));

  await page.locator('#ft-burger').click();
  await page.waitForTimeout(400);
  check('and the menu offers it too',
    !(await page.locator('#ft-install').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0)));
  await page.locator('#ft-drawer-close').click();
  await page.waitForTimeout(300);

  // Pressing it can only explain, so it must actually explain.
  await page.locator('#ft-banner-install').click();
  await page.waitForTimeout(400);
  const sheet = page.locator('#ft-howto');
  check('pressing Install opens the instructions',
    await sheet.evaluate(e => getComputedStyle(e).visibility) === 'visible');
  const steps = await page.locator('.ft-howto-steps li').allTextContents();
  check('three steps', steps.length === 3, String(steps.length));
  check('starting with Share', /share/i.test(steps[0]), steps[0].replace(/\s+/g, ' ').trim());
  check('then Add to Home Screen', /add to home screen/i.test(steps[1]),
    steps[1].replace(/\s+/g, ' ').trim());
  check('the banner steps aside while it is open',
    await banner.evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  check('Got it closes it', await (async () => {
    await page.locator('#ft-howto-done').click();
    await page.waitForTimeout(400);
    return await sheet.evaluate(e => getComputedStyle(e).visibility) === 'hidden';
  })());

  // "Not now" has to stick, or it is not a dismissal.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('#ft-banner-dismiss').click();
  await page.waitForTimeout(300);
  check('Not now hides it', await banner.evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('and it stays hidden on the next visit',
    await page.locator('#ft-install-banner').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  check('but the menu still has it, for anyone who changes their mind', await (async () => {
    await page.locator('#ft-burger').click();
    await page.waitForTimeout(400);
    return !(await page.locator('#ft-install').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  })());
  check('the week is remembered, not the click',
    await page.evaluate(() => {
      const at = Number(localStorage.getItem('ft_install_dismissed'));
      return Number.isFinite(at) && Date.now() - at < 60000;
    }));

  check('no page errors', errors.length === 0, errors[0] || '');
  await ctx.close();
}

// ── 10 ──────────────────────────────────────────────────────────────────────
console.log('\n10. Already installed');
{
  // Opened from the Home Screen, there is nothing to install and nothing to say.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
               '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  await page.route('**/rest/v1/**', r => r.fulfill({ json: [] }));
  await page.addInitScript(() => { window.navigator.standalone = true; });
  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  check('no banner', await page.locator('#ft-install-banner').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  await page.locator('#ft-burger').click();
  await page.waitForTimeout(400);
  check('and no install row in the menu',
    await page.locator('#ft-install').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  await ctx.close();
}

// ── 11 ──────────────────────────────────────────────────────────────────────
console.log('\n11. Desktop, where the banner would be noise');
{
  const { page, ctx } = await open('/farmingtontigersnh/', 1300);
  await page.waitForTimeout(1200);
  check('no banner without an install prompt',
    await page.locator('#ft-install-banner').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0));
  await ctx.close();
}

// ── 12 ──────────────────────────────────────────────────────────────────────
console.log('\n12. Icons cannot go stale');
{
  const { page, ctx } = await open();
  const iconUrls = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel*="icon"]')]
      .map(l => l.getAttribute('href')).filter(h => h && h.includes('/icons/')));
  const href = await page.evaluate(() => document.querySelector('link[rel="manifest"]').href);
  const m = await (await page.request.get(href)).json();
  const all = [...iconUrls, ...m.icons.map(i => i.src)];

  /* Every icon URL carries a version. This is the thing that actually fixes a
     stale Home Screen icon: a URL nothing has ever requested cannot be sitting
     in the service worker's cache, or the browser's, or iOS's. */
  const version = (CACHE_NAME.match(/v(\d+)$/) || [])[1];
  check('the worker names a version', !!version, String(CACHE_NAME));
  check('every icon is served from a versioned folder',
    all.every(u => /\/icons\/farmington\/v\d+\//.test(u)),
    all.filter(u => !/\/icons\/farmington\/v\d+\//.test(u)).join(' ') || 'all versioned');
  /* The icon folder and the cache name used to have to match exactly. That
     made every CSS or JS change to the shell drag the icons to a new URL too.
     What actually matters is narrower: every icon comes from ONE folder, and
     that folder is never AHEAD of the cache — so moving the icons always comes
     with a cache bump, while a cache bump no longer forces an icon move. */
  const folders = [...new Set(all.map(u => (u.match(/\/icons\/farmington\/v(\d+)\//) || [])[1]))];
  const iconVersion = folders.length === 1 ? folders[0] : null;
  check('every icon comes from the same versioned folder', !!iconVersion, folders.join(','));
  check('and that folder is never ahead of the worker\'s cache',
    iconVersion && +iconVersion <= +version,
    `cache ${CACHE_NAME} vs icons v${iconVersion}`);
  for (const u of all) {
    check(`${u.split('/').pop()} is served`,
      (await page.request.get(`http://localhost:${PORT}${u}`)).ok());
  }

  // The worker's own shell list has to point at the same folder, or installing
  // it warms the cache with files nothing on the page will ever ask for.
  const shellIcons = [...SW_SRC.matchAll(/'(\/icons\/[^']+)'/g)].map(x => x[1]);
  check('the worker pre-caches from that folder too',
    shellIcons.length > 0 && shellIcons.every(u => u.includes(`/icons/farmington/v${iconVersion}/`)),
    shellIcons.join(' ') || '(none)');
  await ctx.close();
}
{
  /* And a previous version's cache is actually thrown away.
     The cleanup lives in `activate`, which only runs when a NEW worker takes
     over — a plain reload leaves the running one in place and nothing happens,
     which is correct and is why this unregisters first. Deploying a worker with
     a changed CACHE name is what triggers it in the real world. */
  const { page, ctx } = await open();
  await page.evaluate(async () => {
    const c = await caches.open('tigers-v0-stale');
    await c.put('/icons/farmington/v2/icon-192.png', new Response('old bytes'));
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const names = await page.evaluate(() => caches.keys());
  check('a previous version\'s cache is deleted when a new worker activates',
    !names.includes('tigers-v0-stale'), names.join());
  check('leaving only the current one',
    names.filter(n => n.startsWith('tigers-')).join() === CACHE_NAME,
    names.join());
  // Ball603's own caches share this origin and must be left alone.
  await page.evaluate(() => caches.open('ball603-v30'));
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  check('and Ball603\'s cache untouched',
    (await page.evaluate(() => caches.keys())).includes('ball603-v30'),
    (await page.evaluate(() => caches.keys())).join());
  await ctx.close();
}

// ── 13 ──────────────────────────────────────────────────────────────────────
console.log('\n13. The icon route');
{
  /* This used to check a root /apple-touch-icon.png on the Tigers domain, added
     when the site was served there and iOS was drawing a letter tile instead of
     the app icon. That domain now redirects, so nothing is served from it and
     the rule would never fire — the icon comes off the link tags on
     ball603.com, which is what section 7b covers. What is left to assert is
     that no such rule was left behind on the wrong host. */
  const RULES = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => l.split(/\s+/)[0]);
  check('no root apple-touch-icon rule on any host',
    !RULES.some(u => /\/apple-touch-icon(-precomposed)?\.png$/.test(u)),
    RULES.filter(u => /apple-touch/.test(u)).join(' ') || 'none');
  check('ball603.com in particular has none',
    !RULES.some(u => u.startsWith('/apple-touch-icon')),
    RULES.filter(u => u.startsWith('/apple-touch')).join(' ') || 'none');
}

// ── 14 ──────────────────────────────────────────────────────────────────────
console.log('\n14. One canonical home');
{
  /* farmingtontigersnh.com now redirects to ball603.com rather than serving a
     second copy of the site. Netlify uses the FIRST matching rule, so where
     these sit in the file is the whole behaviour. */
  const LINES = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split('\n');
  const rules = LINES.map((l, i) => ({ i, parts: l.trim().split(/\s+/) }))
    .filter(r => r.parts[0] && !r.parts[0].startsWith('#'));

  const tigersHost = rules.filter(r => /^https:\/\/(www\.)?farmingtontigersnh\.com\/\*$/.test(r.parts[0]));
  check('both Tigers hostnames redirect wholesale', tigersHost.length === 2,
    tigersHost.map(r => r.parts[0]).join(' '));
  check('as a permanent redirect, forced',
    tigersHost.every(r => r.parts[2] === '301!'), tigersHost.map(r => r.parts[2]).join(' '));
  check('landing under the Tigers path on ball603',
    tigersHost.every(r => r.parts[1] === 'https://ball603.com/farmingtontigersnh/:splat'),
    tigersHost.map(r => r.parts[1]).join(' '));

  // First rule wins, so nothing may sit above them.
  check('and nothing matches before them',
    tigersHost.every(r => r.i < rules.filter(x => !tigersHost.includes(x))[0].i),
    `first other rule at line ${rules.filter(x => !tigersHost.includes(x))[0].i + 1}`);

  // The root always resolves to the trailing-slash form, which is the app's
  // start URL and the root of the service worker's scope.
  const splat = (url) => url.replace(/^https:\/\/(www\.)?farmingtontigersnh\.com/, '');
  check('the bare domain lands on the app\'s start URL',
    'https://ball603.com/farmingtontigersnh/' + splat('https://farmingtontigersnh.com/').slice(1)
      === 'https://ball603.com/farmingtontigersnh/');
  check('and a section page keeps its path',
    'https://ball603.com/farmingtontigersnh/' + splat('https://farmingtontigersnh.com/schedule').slice(1)
      === 'https://ball603.com/farmingtontigersnh/schedule');
}
{
  // Every Tigers page names its own canonical URL on ball603.com.
  const PAGES = {
    'farmingtontigersnh.html':   'https://ball603.com/farmingtontigersnh',
    'farmington-schedule.html':  'https://ball603.com/farmingtontigersnh/schedule',
    'farmington-standings.html': 'https://ball603.com/farmingtontigersnh/standings',
    'farmington-rosters.html':   'https://ball603.com/farmingtontigersnh/rosters',
    'farmington-photos.html':    'https://ball603.com/farmingtontigersnh/photos',
    'farmington-videos.html':    'https://ball603.com/farmingtontigersnh/videos'
  };
  for (const [file, url] of Object.entries(PAGES)) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const m = html.match(/<link rel="canonical" href="([^"]+)"/);
    check(`${file} names its canonical`, !!m && m[1] === url, m ? m[1] : '(none)');
    check('  exactly once', (html.match(/rel="canonical"/g) || []).length === 1);
    check('  on ball603.com, not the Tigers domain',
      !!m && !/farmingtontigersnh\.com/.test(m[1]), m ? m[1] : '(none)');
  }
}
{
  // The config Netlify reads. Redirects in netlify.toml would override
  // _redirects entirely, so having both is the one thing to rule out.
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  check('netlify.toml declares no redirects, so _redirects is the only source',
    !/\[\[redirects\]\]/.test(toml));
  check('and no build step that could leave _redirects behind',
    !/^\s*\[build\]/m.test(toml));
}

// ── 15 ──────────────────────────────────────────────────────────────────────
console.log('\n15. Pull to refresh');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
               '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// A real drag: touchstart, a few touchmoves, touchend, dispatched on the element
// under the finger so the handlers see what they would on a phone.
const DRAG = `(async (fromY, toY, selector) => {
  const el = document.querySelector(selector || 'main') || document.body;
  const touch = (y) => {
    const t = new Touch({ identifier: 1, target: el, clientX: 180, clientY: y });
    return { touches: [t], targetTouches: [t], changedTouches: [t] };
  };
  const fire = (type, y) => el.dispatchEvent(
    new TouchEvent(type, { ...touch(y), bubbles: true, cancelable: type === 'touchmove' }));
  fire('touchstart', fromY);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    fire('touchmove', fromY + ((toY - fromY) * i) / steps);
    await new Promise(r => setTimeout(r, 16));
  }
  fire('touchend', toY);
  await new Promise(r => setTimeout(r, 60));
})`;

/* A drag that ends in a refresh tears down the page mid-call, which rejects the
   evaluate. That is the gesture working, not a failure. */
const drag = (page, from, to, sel) =>
  page.evaluate(`${DRAG}(${from}, ${to}, ${sel ? JSON.stringify(sel) : 'null'})`)
    .catch(err => {
      if (!/Execution context was destroyed|Target closed/.test(err.message)) throw err;
    });

async function iphone({ standalone = true, path = '/farmingtontigersnh/' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, userAgent: IPHONE, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  /* Real fixtures, not empty arrays. Two of these checks are about a page being
     scrolled or a table being part-scrolled when the drag starts, and with no
     data the pages were too short to scroll at all — the tests passed without
     ever exercising what they claimed to. */
  await page.route('**/rest/v1/**', r => {
    const u = r.request().url();
    if (u.includes('farmington_teams')) return r.fulfill({ json: TEAMS });
    if (u.includes('farmington_games')) return r.fulfill({ json: GAMES });
    if (u.includes('farmington_standings')) return r.fulfill({ json: STANDINGS });
    if (u.includes('roster_submissions')) return r.fulfill({ json: ROSTERS });
    if (u.includes('farmington_videos')) return r.fulfill({ json: VIDEOS });
    if (u.includes('farmington_albums')) return r.fulfill({ json: ALBUMS });
    if (u.includes('farmington_stories')) return r.fulfill({ json: STORIES.filter(x => x.published) });
    return r.fulfill({ json: [] });
  });
  await page.route('**/functions/**', r => r.fulfill({ json: { games: [] } }));
  if (standalone) await page.addInitScript(() => { window.navigator.standalone = true; });
  // Stand in for the reload so the test can see that it was asked for.
  /* location.reload cannot be redefined, so rather than stub it the test counts
     the real navigation it causes. That has the happy side effect of testing
     the actual behaviour — the page really does reload — instead of testing
     that a function was called. */
  let reloads = 0;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) reloads++; });

  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  reloads = 0;                       // the first load is not a refresh

  /* The spinner spins for the moment between the release and the page going
     away, which is too short to catch by polling. An observer records that it
     happened and parks the answer in sessionStorage, which survives the reload.
     Wrapped in try/catch because private browsing can refuse it. */
  await page.evaluate(() => {
    try { sessionStorage.removeItem('ft_saw_spin'); } catch { /* fine */ }
    const el = document.getElementById('ft-pull');
    if (!el) return;
    new MutationObserver(() => {
      if (el.classList.contains('ft-pull-busy')) {
        try { sessionStorage.setItem('ft_saw_spin', '1'); } catch { /* fine */ }
      }
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  return { page, ctx, errors, reloadCount: () => reloads,
           sawSpin: () => page.evaluate(() => {
             try { return sessionStorage.getItem('ft_saw_spin') === '1'; } catch { return false; }
           }) };
}

{
  const { page, ctx, errors, reloadCount, sawSpin } = await iphone();
  check('the installed app has a pull indicator', await page.locator('#ft-pull').count() === 1);
  check('which starts invisible',
    await page.locator('#ft-pull').evaluate(e => getComputedStyle(e).opacity) === '0');
  check('and the page is told it can be pulled',
    await page.evaluate(() => document.body.classList.contains('ft-can-pull')));

  // A short drag is not a refresh.
  await drag(page, 120, 150);
  await page.waitForTimeout(400);
  check('a short pull does nothing', reloadCount() === 0, String(reloadCount()));
  check('and springs the spinner back',
    /0px\)?$/.test((await page.locator('#ft-pull').evaluate(e => e.style.transform)).trim()),
    await page.locator('#ft-pull').evaluate(e => e.style.transform));

  // A long one is.
  await drag(page, 120, 360);
  await page.waitForTimeout(1500);
  check('a long pull reloads the page', reloadCount() === 1, String(reloadCount()));
  check('and the spinner spun while it did', await sawSpin());
  check('no page errors', errors.length === 0, errors[0] || '');
  await ctx.close();
}
{
  // Upwards is scrolling, not refreshing.
  const { page, ctx, reloadCount } = await iphone();
  await drag(page, 400, 150);
  await page.waitForTimeout(500);
  check('dragging up never refreshes', reloadCount() === 0, String(reloadCount()));
  await ctx.close();
}
{
  // Not from half way down the page.
  // The home page is the tall one: stories, two score boxes, My Teams, standings.
  const { page, ctx, reloadCount } = await iphone({ path: '/farmingtontigersnh/' });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(() => window.scrollY);
  // Without this the next check passes for the wrong reason on a short page.
  check('the page is actually scrolled before the drag', scrolled > 0, `scrollY ${scrolled}`);
  await drag(page, 120, 360);
  await page.waitForTimeout(600);
  check('a pull part-way down the page does not refresh', reloadCount() === 0,
    `scrollY ${scrolled}, reloads ${reloadCount()}`);
  await ctx.close();
}
{
  /* The schedule's table is its own scrolling box. A drag that starts inside it
     while it is scrolled belongs to the table, not to the page. */
  const { page, ctx, reloadCount } = await iphone({ path: '/farmingtontigersnh/schedule' });
  await page.waitForTimeout(600);
  const inner = await page.evaluate(() => {
    const box = document.querySelector('.ft-tablescroll');
    if (!box) return null;
    box.scrollTop = 60;
    return box.scrollTop;
  });
  check('the inner table is actually scrolled before the drag', !!inner, `scrollTop ${inner}`);
  if (inner) {
    await drag(page, 300, 520, '.ft-tablescroll tbody tr');
    await page.waitForTimeout(600);
    check('a drag inside a scrolled table is the table\'s, not a refresh',
      reloadCount() === 0, `inner scrollTop ${inner}, reloads ${reloadCount()}`);
  } else {
    check('a drag inside a scrolled table is the table\'s, not a refresh', true, '(no inner box)');
  }
  await ctx.close();
}
{
  // Not while a panel is over the page.
  const { page, ctx, reloadCount } = await iphone();
  await page.locator('#ft-burger').click();
  await page.waitForTimeout(400);
  await drag(page, 120, 360);
  await page.waitForTimeout(600);
  check('a pull with the menu open does not refresh', reloadCount() === 0, String(reloadCount()));
  await ctx.close();
}
{
  // In a browser tab, Safari's own gesture is there and ours must not be.
  const { page, ctx, reloadCount } = await iphone({ standalone: false });
  check('a browser tab is left to its own pull to refresh',
    !(await page.evaluate(() => document.body.classList.contains('ft-can-pull'))));
  await drag(page, 120, 360);
  await page.waitForTimeout(600);
  check('so a pull there does nothing of ours', reloadCount() === 0, String(reloadCount()));
  await ctx.close();
}
{
  /* Android's PWA shell keeps its native gesture, so ours stays out of the way
     there — two firing at once is worse than one. */
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
               '(KHTML, like Gecko) Chrome/125 Mobile Safari/537.36'
  });
  const page = await ctx.newPage();
  await page.route('**/rest/v1/**', r => r.fulfill({ json: [] }));
  await page.emulateMedia({ media: 'screen' });
  await page.addInitScript(() => {
    const mm = window.matchMedia.bind(window);
    window.matchMedia = (q) => q.includes('standalone')
      ? { matches: true, addEventListener() {}, removeEventListener() {} } : mm(q);
  });
  await page.goto(`http://localhost:${PORT}/farmingtontigersnh/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('an installed Android app keeps Chrome\'s own gesture',
    !(await page.evaluate(() => document.body.classList.contains('ft-can-pull'))));
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
