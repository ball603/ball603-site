// Ball603 NHIAA Girls Volleyball Schedule Scraper — PEAK GAME HOURS
// Fires more frequently to catch scores as they're posted on weekday
// evenings during the heart of the season (Sept-Oct). Thin wrapper around
// scrape-gvolleyball-core.mjs; the baseline every-4-hours schedule lives in
// scrape-gvolleyball-schedules.mjs.

import { runScrape } from './scrape-gvolleyball-core.mjs';

export default async (request) => runScrape();

export const config = {
  // Every 30 minutes, weekday evenings 6:00pm–11:30pm ET, Sept–Oct.
  //
  // Cron is UTC. EDT (Sept–Oct) is UTC-4, so the target ET window
  // (Mon–Fri 6:00pm–11:30pm) maps to two UTC windows:
  //   • 22:00–23:59 UTC on Mon–Fri (= same-day ET 6–8pm)
  //   • 00:00–03:59 UTC on Tue–Sat (= previous-day ET 8–11:30pm)
  //
  // A single cron can't express those two weekday sets independently, so this
  // expression uses "Mon–Sat" (1–6) with the union of hours. That produces
  // a small number of over-fires each week:
  //   • Sun 8:00–11:30pm ET (Mon 00–03 UTC): ~7 extra runs/week
  //   • Sat 6:00–7:30pm ET (Sat 22–23 UTC): ~4 extra runs/week
  // These are cost-free (the scrape is idempotent) and worth accepting for
  // the simpler configuration.
  schedule: "0,30 22,23,0-3 * 9,10 1-6"
};
