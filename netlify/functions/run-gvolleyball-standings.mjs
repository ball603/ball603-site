// Ball603 — manual trigger for the girls volleyball standings scrape.
//
// scrape-gvolleyball-standings.mjs carries an `export const config = { schedule }`,
// which makes Netlify treat it as scheduled-only: it is not reachable over HTTP.
// This wrapper has no schedule, so it IS reachable, and runs the identical scrape.
//
// Use it right after a deploy (or any time the standings look stale) instead of
// waiting up to four hours for the next cron fire:
//
//   https://ball603.com/.netlify/functions/run-gvolleyball-standings
//
// It returns the same JSON summary the scheduled run logs — teams scraped,
// updated, inserted, plus any division changes, orphans or write failures.
// Safe to run repeatedly: every write is an idempotent update keyed on school.

import { runStandingsScrape } from './scrape-gvolleyball-standings.mjs';

export default async (request) => runStandingsScrape();
