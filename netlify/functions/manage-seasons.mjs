// Ball603 Season Manager API
// Handles create, finalize, and status actions for the Season Manager CMS tab
//
// POST /.netlify/functions/manage-seasons
//   { action: 'finalize', sport, season }        → sets scraper_active=false, stamps finalized_at
//   { action: 'create',   sport, season }        → inserts new season row, sets is_current=true, scraper_active=true
//   { action: 'activate_scraper', sport, season }→ flips scraper_active=true for an existing season
//   { action: 'deactivate_scraper', sport, season } → flips scraper_active=false
//
// GET  /.netlify/functions/manage-seasons        → returns all seasons for status dashboard

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

async function supabase(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
    },
    body: body ? JSON.stringify(body) : null
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // ── GET: return all seasons for the dashboard ──────────────────────────────
  if (request.method === 'GET') {
    const result = await supabase('seasons?select=*&order=sport.asc,created_at.desc');
    if (!result.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch seasons' }), { status: 500, headers });
    }
    return new Response(JSON.stringify({ seasons: result.data }), { status: 200, headers });
  }

  // ── POST: perform an action ────────────────────────────────────────────────
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
    }

    const { action, sport, season } = body;

    if (!action || !sport) {
      return new Response(JSON.stringify({ error: 'action and sport are required' }), { status: 400, headers });
    }

    // ── FINALIZE: disable scraper, stamp finalized_at ────────────────────────
    if (action === 'finalize') {
      if (!season) return new Response(JSON.stringify({ error: 'season required' }), { status: 400, headers });

      const result = await supabase(
        `seasons?sport=eq.${encodeURIComponent(sport)}&season=eq.${encodeURIComponent(season)}`,
        'PATCH',
        { scraper_active: false, finalized_at: new Date().toISOString() }
      );

      if (!result.ok) {
        return new Response(JSON.stringify({ error: 'Failed to finalize season', detail: result.data }), { status: 500, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${sport} ${season} finalized — scraper disabled`
      }), { status: 200, headers });
    }

    // ── CREATE: insert new season, mark previous as not current ─────────────
    if (action === 'create') {
      if (!season) return new Response(JSON.stringify({ error: 'season required' }), { status: 400, headers });

      // Mark all previous seasons for this sport as not current
      await supabase(
        `seasons?sport=eq.${encodeURIComponent(sport)}`,
        'PATCH',
        { is_current: false }
      );

      // Insert the new season
      const result = await supabase(
        'seasons',
        'POST',
        {
          sport,
          season,
          is_current: true,
          scraper_active: true,
          created_at: new Date().toISOString()
        }
      );

      if (!result.ok) {
        // If duplicate, return a friendly error
        if (result.status === 409 || JSON.stringify(result.data).includes('unique')) {
          return new Response(JSON.stringify({ error: `Season ${sport} ${season} already exists` }), { status: 409, headers });
        }
        return new Response(JSON.stringify({ error: 'Failed to create season', detail: result.data }), { status: 500, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${sport} ${season} created — scraper active`
      }), { status: 200, headers });
    }

    // ── ACTIVATE / DEACTIVATE SCRAPER ─────────────────────────────────────────
    if (action === 'activate_scraper' || action === 'deactivate_scraper') {
      if (!season) return new Response(JSON.stringify({ error: 'season required' }), { status: 400, headers });

      const scraper_active = action === 'activate_scraper';
      const result = await supabase(
        `seasons?sport=eq.${encodeURIComponent(sport)}&season=eq.${encodeURIComponent(season)}`,
        'PATCH',
        { scraper_active }
      );

      if (!result.ok) {
        return new Response(JSON.stringify({ error: 'Failed to update scraper status' }), { status: 500, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Scraper ${scraper_active ? 'enabled' : 'disabled'} for ${sport} ${season}`
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};
