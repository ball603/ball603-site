# Ball603 / Farmington Tigers test suites

Playwright, driving the real pages against stubbed Supabase responses. About 693
checks. Each file runs standalone with `node <file>` and prints a pass/fail line.

They expect the site checked out at `/root/ball603/ball603-site-main` — change the
`ROOT` constant at the top of each file if it lives somewhere else. Chromium is
expected at `/opt/pw-browsers/chromium`.

| File | What it covers |
|---|---|
| `site.test.mjs` | The Farmington pages: schedule, standings, rosters, photos, videos, home. ~561 checks. Serves the site over a local HTTP server that mimics Netlify's rewrites. Blocks service workers on purpose — see below. |
| `pwa.test.mjs` | Manifest, icons, service worker scope and caching, offline, install prompts, pull-to-refresh. This is the one place the worker is under test. ~132 checks. |
| `sync.test.mjs` | The Farmington sync functions: games, standings, videos, photos. ~102 checks. |
| `cron.test.mjs` | The DST-proof schedule: that the sync fires at the right five Eastern hours across both daylight-saving switches. ~30 checks. |
| `standings.test.mjs` | Ball603's NHIAA volleyball standings scraper — group resolution and the points-vs-rating distinction. |
| `page.test.mjs` | Ball603's `standings.html` rendered against a stubbed feed. |
| `rosters.test.mjs` | The `get-rosters` function Ball603's team pages use: varsity rosters only, now that JV and Jr. High rosters share the table. |
| `vbdivision.test.mjs` | The girls volleyball game scraper files each game under the teams' volleyball division (from the standings), not Arbiter's school-wide classification. |
| `rpi.test.mjs` | The NCAA-style volleyball RPI bonuses and penalties (`js/rpi-ncaa.js`): top-2 / bottom-2 of each division, the two-position step, ties, idle teams. |
| `vbstandings.test.mjs` | Girls volleyball standings computed from Ball603's games with the NHIAA Index Plan: the point table, which games count, a real Sept. 18, 2026 snapshot checked team by team against NHIAA (`fixtures/gvolleyball-2026-09-18.json`), the NHIAA comparison notes, the recompute after score entry and scraping, and the private CMS Standings Check panel. |
| `seasons.test.mjs` | Contributor seasons roll over every July 1 (`js/seasons.js`): the First Season dropdowns in the CMS and contributor portal, and "Nth Season" on profiles (our-team and home page), checked with the clock set to different dates. |
| `seed.test.mjs` | The NHIAA tiebreaker engine ("Seed Decoder"). |
| `fixture2.mjs` | Shared fixtures: teams, games, standings, rosters, videos, albums, stories. |

## Two things worth knowing

**`site.test.mjs` blocks service workers** (`serviceWorkers: 'block'`). The site
installs a worker that caches `farmington.js`, and without this one section can serve
a later section a stale script — a failure in section 28 was once actually stale
JavaScript from section 3.

**Watch for tests that pass for the wrong reason.** Several here assert a premise
first for exactly that reason: "the page is actually scrolled before the drag",
"the inner table is actually scrolled before the drag". With empty fixture data those
pages were too short to scroll, so the real assertion was vacuously true.

The suites take about four minutes each; run them detached and tail the output rather
than blocking on them.
