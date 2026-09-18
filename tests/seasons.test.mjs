/* Contributor seasons roll over every July 1 without anyone touching the code:
   the "First Season" dropdowns (CMS and contributor portal) gain the new season,
   and "3rd Season" on profiles counts up. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SITE = '/root/ball603/ball603-site-main';
const S = require(`${SITE}/js/seasons.js`);

let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };
const day = (s) => new Date(s + 'T12:00:00');   // local noon, clear of any time-zone edge

console.log('\n1. The current season');
check('Sept. 18, 2026 is 2026-27', S.current(day('2026-09-18')) === '2026-27', S.current(day('2026-09-18')));
check('June 30, 2027 is still 2026-27', S.current(day('2027-06-30')) === '2026-27');
check('July 1, 2027 is 2027-28', S.current(day('2027-07-01')) === '2027-28');
check('Jan. 1, 2100 is 2099-00 (two-digit year wraps)', S.current(day('2100-01-01')) === '2099-00', S.current(day('2100-01-01')));

console.log('\n2. The dropdown list');
const now = S.list(day('2026-09-18'));
check('starts at 2021-22 and ends at 2026-27, oldest first', now[0] === '2021-22' && now.at(-1) === '2026-27' && now.length === 6, now.join(', '));
check('premise — the old hard-coded list stopped at 2025-26, so 2026-27 is the new one', now.includes('2026-27'));
const next = S.list(day('2027-07-01'));
check('on July 1, 2027 it adds 2027-28 by itself', next.at(-1) === '2027-28' && next.length === 7, next.join(', '));

console.log('\n3. "Nth Season" on profiles');
const d = day('2026-09-18');
check('first season 2026-27 → 1st Season', S.seasonLabel('2026-27', d) === '1st Season');
check('2025-26 → 2nd Season (it said 1st before, frozen in 2025-26)', S.seasonLabel('2025-26', d) === '2nd Season');
check('2021-22 → 6th Season', S.seasonLabel('2021-22', d) === '6th Season');
check('11th, 12th, 13th, 21st, 22nd', [11, 12, 13, 21, 22].map(S.ordinal).join(',') === '11th,12th,13th,21st,22nd');
check('blank or junk → no label', S.seasonLabel('', d) === '' && S.seasonLabel('Fall 2024', d) === '' && S.seasonLabel(null, d) === '');
check('a season that has not started → no label', S.seasonLabel('2030-31', d) === '');

console.log('\n4. The pages use it');
const src = (f) => readFileSync(`${SITE}/${f}`, 'utf8');
for (const f of ['admin.html', 'contributor-portal.html', 'our-team.html', 'index.html']) {
  check(`${f} loads /js/seasons.js`, src(f).includes('<script src="/js/seasons.js"></script>'));
}
check('CMS dropdown fills itself', /<select id="contribFirstSeason" data-seasons>/.test(src('admin.html')));
check('portal dropdown fills itself, with season counts', /<select id="profileFirstSeason" data-seasons="count">/.test(src('contributor-portal.html')));
check('no hard-coded season tables left in our-team.html / index.html',
  !/SEASON_ORDER/.test(src('our-team.html')) && !/'2025-26': '1st Season'/.test(src('index.html')));

console.log('\n5. In a browser, with the clock set');
{
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  const js = readFileSync(`${SITE}/js/seasons.js`, 'utf8');
  const portal = src('contributor-portal.html');
  const portalSelect = portal.slice(portal.indexOf('<select id="profileFirstSeason"'), portal.indexOf('</select>', portal.indexOf('<select id="profileFirstSeason"')) + 9);
  const admin = src('admin.html');
  const adminSelect = admin.slice(admin.indexOf('<select id="contribFirstSeason"'), admin.indexOf('</select>', admin.indexOf('<select id="contribFirstSeason"')) + 9);

  const load = async (when) => {
    await page.clock.setFixedTime(new Date(when + 'T12:00:00'));
    await page.setContent(`<body>${adminSelect}${portalSelect}<script>${js}</script></body>`);
    return page.evaluate(() => ({
      admin: [...document.querySelectorAll('#contribFirstSeason option')].map(o => [o.value, o.textContent]),
      portal: [...document.querySelectorAll('#profileFirstSeason option')].map(o => [o.value, o.textContent]),
    }));
  };

  let o = await load('2026-09-18');
  check('CMS: "Select..." first, then 2021-22 … 2026-27', o.admin[0][0] === '' && o.admin[0][1] === 'Select...' &&
    o.admin.slice(1).map(x => x[0]).join(',') === '2021-22,2022-23,2023-24,2024-25,2025-26,2026-27', o.admin.map(x => x[1]).join(' | '));
  check('portal: 2026-27 (1st season), 2021-22 (6th season)',
    o.portal.some(x => x[1] === '2026-27 (1st season)') && o.portal.some(x => x[1] === '2021-22 (6th season)') && o.portal[0][0] === '',
    o.portal.map(x => x[1]).join(' | '));

  o = await load('2027-07-01');
  check('on July 1, 2027 the CMS list ends with 2027-28', o.admin.at(-1)[0] === '2027-28', o.admin.at(-1)[1]);
  check('and the portal labels shift: 2026-27 (2nd season)', o.portal.some(x => x[1] === '2026-27 (2nd season)'));

  // A saved value survives the refill (the CMS sets it after the page has loaded).
  await page.evaluate(() => { const s = document.getElementById('contribFirstSeason'); s.value = '2023-24'; Ball603Seasons.fillSelect(s); });
  check('refilling keeps the chosen season', await page.$eval('#contribFirstSeason', s => s.value) === '2023-24');
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
