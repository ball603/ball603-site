// Ball603 — manual trigger for the scheduled-article publisher.
//
// publish-scheduled-articles.mjs carries an `export const config = { schedule }`,
// which makes Netlify treat it as scheduled-only: it is not reachable over HTTP.
// This wrapper has no schedule, so it IS reachable, and runs the identical job.
//
// Use it to push a due article live right now instead of waiting for the next
// 5-minute fire, or to check that scheduling works after a deploy:
//
//   https://ball603.com/.netlify/functions/run-publish-scheduled
//
// It returns the same JSON summary the scheduled run logs — how many articles
// were due, which ones went live, and any failures. Safe to run repeatedly:
// nothing is published twice, and an article whose time hasn't come is ignored.

import { runScheduledPublish } from './publish-scheduled-articles.mjs';

export default async (request) => runScheduledPublish();
