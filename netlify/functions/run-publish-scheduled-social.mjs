// Ball 603 — manual trigger for the scheduled-social publisher.
//
// publish-scheduled-social.mjs carries an `export const config = { schedule }`,
// which makes Netlify treat it as scheduled-only: it is not reachable over HTTP.
// This wrapper has no schedule, so it IS reachable, and runs the identical job.
//
// Use it to send a due Instagram post right now instead of waiting for the next
// 5-minute fire, or to check that the queue works after a deploy:
//
//   https://ball603.com/.netlify/functions/run-publish-scheduled-social
//
// It returns the same JSON summary the scheduled run logs — how many posts were
// due, which went out, which failed and why, plus what the Facebook mirror
// reconciled. Safe to run repeatedly: a post is claimed by exactly one run, an
// already-published container is recorded rather than posted again, and a post
// whose time hasn't come is ignored.

import { runScheduledSocial } from './publish-scheduled-social.mjs';

export default async (request) => runScheduledSocial();
