// Ball603 NHIAA Girls Volleyball Schedule Scraper — REGULAR SCHEDULE
// Thin wrapper around scrape-gvolleyball-core.mjs which contains all logic.
// A parallel wrapper (scrape-gvolleyball-schedules-peak.mjs) runs the same
// scrape more frequently during weekday evening game hours in Sept-Oct.

import { runScrape } from './scrape-gvolleyball-core.mjs';

export default async (request) => runScrape();

export const config = {
  // Every 4 hours during volleyball season (August–November).
  // This is the baseline schedule. Peak-hours are handled by
  // scrape-gvolleyball-schedules-peak.mjs to catch scores as they roll in.
  schedule: "0 */4 * 8,9,10,11 *"
};
