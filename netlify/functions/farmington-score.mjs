// Farmington Tigers manual score entry.
//
// Writes ONLY the manual_* columns on farmington_games. sync-farmington never
// touches those, so a score typed here survives every later sync — which is the
// entire reason the table carries two sets of score columns.
//
// POST { unique_game_id, uteam, my_score, opp_score, password }
// POST { unique_game_id, uteam, clear: true, password }   — removes the override

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Same shared password the Ball603 score pages use, overridable per-site.
const PASSWORD = (process.env.FARMINGTON_SCORE_PASSWORD || 'tigers').toLowerCase();

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }
  if (!SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase service key not configured' }), { status: 500, headers });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400, headers }); }

  if (String(body.password || '').toLowerCase() !== PASSWORD) {
    return new Response(JSON.stringify({ error: 'Wrong password' }), { status: 401, headers });
  }

  const gameId = Number(body.unique_game_id);
  const uteam = Number(body.uteam);
  if (!Number.isInteger(gameId) || !Number.isInteger(uteam)) {
    return new Response(JSON.stringify({ error: 'unique_game_id and uteam are required' }), { status: 400, headers });
  }

  let patch;
  if (body.clear === true) {
    patch = { manual_my_score: null, manual_opp_score: null, manual_updated_at: null };
  } else {
    const my = Number(body.my_score), opp = Number(body.opp_score);
    // A typo of 300 instead of 3 should bounce here rather than sit on the site.
    const sane = (n) => Number.isInteger(n) && n >= 0 && n <= 300;
    if (!sane(my) || !sane(opp)) {
      return new Response(JSON.stringify({ error: 'Scores must be whole numbers between 0 and 300' }),
                          { status: 400, headers });
    }
    patch = { manual_my_score: my, manual_opp_score: opp, manual_updated_at: new Date().toISOString() };
  }

  const url = `${SUPABASE_URL}/rest/v1/farmington_games` +
              `?unique_game_id=eq.${gameId}&uteam=eq.${uteam}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(patch)
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('Farmington score write failed:', res.status, detail);
    return new Response(JSON.stringify({ error: 'Could not save the score', detail }), { status: 502, headers });
  }

  const rows = await res.json();
  if (!rows.length) {
    return new Response(JSON.stringify({ error: 'No such game' }), { status: 404, headers });
  }

  return new Response(JSON.stringify({ success: true, game: rows[0] }), { status: 200, headers });
};
