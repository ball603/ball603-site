// tournament-schedule.mjs
// GET  ?season=2025-26&gender=Boys&division=D-IV  → returns schedule overrides
// POST { season, gender, division, round, date_display, site }  → saves override

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const season = url.searchParams.get('season');
      const gender = url.searchParams.get('gender');
      const division = url.searchParams.get('division');

      let query = `${SUPABASE_URL}/rest/v1/tournament_schedule?`;
      const parts = [];
      if (season) parts.push(`season=eq.${encodeURIComponent(season)}`);
      if (gender) parts.push(`gender=eq.${encodeURIComponent(gender)}`);
      if (division) parts.push(`division=eq.${encodeURIComponent(division)}`);
      parts.push('order=updated_at.asc');
      query += parts.join('&');

      const res = await fetch(query, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const data = await res.json();
      return new Response(JSON.stringify(data || []), { status: 200, headers: CORS });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { season, gender, division, round, date_display, site } = body;

      if (!season || !gender || !division || !round) {
        return new Response(JSON.stringify({ error: 'season, gender, division, round required' }), { status: 400, headers: CORS });
      }

      // Delete existing row for this (season, gender, division, round) first
      const delUrl = `${SUPABASE_URL}/rest/v1/tournament_schedule?season=eq.${encodeURIComponent(season)}&gender=eq.${encodeURIComponent(gender)}&division=eq.${encodeURIComponent(division)}&round=eq.${encodeURIComponent(round)}`;
      await fetch(delUrl, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });

      // Only insert if there's actually an override value to store
      const hasOverride = (date_display !== null && date_display !== undefined && date_display !== '') ||
                          (site !== null && site !== undefined && site !== '');

      if (hasOverride) {
        const payload = {
          season, gender, division, round,
          date_display: date_display || null,
          site: site || null,
          updated_at: new Date().toISOString()
        };

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/tournament_schedule`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
          }
        );

        if (!res.ok) {
          const err = await res.text();
          return new Response(JSON.stringify({ error: err }), { status: 500, headers: CORS });
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });

  } catch (err) {
    console.error('tournament-schedule error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
};
