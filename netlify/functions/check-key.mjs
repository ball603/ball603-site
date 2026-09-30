// Ball 603 — validate a password without performing any action.
//
// The CMS and the score-entry pages both need to answer one question at login:
// "is this password right?" Without this endpoint they would have to probe a
// real endpoint and infer the answer from an error, which means a login
// attempt could half-perform a write.
//
// POST { scope: 'cms' | 'score', key }   (or the key as a header)
//   200 { ok: true, scope }  — correct
//   401                      — wrong
//   500                      — that key is not configured on the server
//
// It reveals nothing a guessing attacker could not learn from any other
// guarded endpoint, and it performs no work, touches no database, and returns
// no data.

import { requireCmsKey, requireScoreKey, authHeaders, isOptions } from './lib/auth.mjs';

export default async (request) => {
  const headers = authHeaders();

  if (isOptions(request)) return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }

  let body = {};
  try { body = await request.json(); } catch { /* key may be a header */ }

  const scope = body.scope === 'score' ? 'score' : 'cms';
  const denied = scope === 'score'
    ? requireScoreKey(request, body)
    : requireCmsKey(request, body);

  if (denied) return denied;
  return new Response(JSON.stringify({ ok: true, scope }), { status: 200, headers });
};
