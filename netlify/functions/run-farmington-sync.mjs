// Ball603 — manual trigger for the Farmington Tigers schedule sync.
//
// sync-farmington.mjs carries a schedule in netlify.toml, which makes Netlify
// treat it as scheduled-only: it answers 403 to any HTTP request, key or no key.
// This wrapper has no schedule, so it IS reachable, and runs the identical job.
// Same split as publish-scheduled-articles / run-publish-scheduled.
//
//   https://ball603.com/.netlify/functions/run-farmington-sync?key=YOUR_SYNC_KEY
//
// Add &dry=1 to report what it would write without writing anything — useful
// after a deploy, or before trusting a change to the opponent matching.
//
// Safe to run repeatedly: every write is an upsert keyed on the Arbiter game
// id, and hand-entered scores are never touched.

import { runFarmingtonSync } from './sync-farmington.mjs';

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const url = new URL(request.url);
  const expectedKey = process.env.SYNC_SECRET_KEY || 'ball603-sync';

  if (url.searchParams.get('key') !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Provide ?key=YOUR_SYNC_KEY' }),
      { status: 401, headers }
    );
  }

  const dry = url.searchParams.get('dry');
  const { statusCode, body } = await runFarmingtonSync({ dryRun: dry === '1' || dry === 'true' });

  return new Response(JSON.stringify(body), { status: statusCode, headers });
};
