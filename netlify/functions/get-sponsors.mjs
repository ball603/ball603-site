// Ball603 Get Sponsors API
// Public endpoint for fetching sponsors by tier, page placement, or sport
//
// GET /.netlify/functions/get-sponsors?tier=presenting
// GET /.netlify/functions/get-sponsors?page=rpi&sport=baseball
// GET /.netlify/functions/get-sponsors?tier=town&team=Farmington
// GET /.netlify/functions/get-sponsors?tier=sport&team=Farmington&sport=basketball

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60'
};

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(request.url);
    const tier = url.searchParams.get('tier');
    const page = url.searchParams.get('page');   // schedule|standings|rpi|playoffs|rosters
    const sport = url.searchParams.get('sport'); // basketball|baseball|volleyball
    const team = url.searchParams.get('team');

    // Build Supabase query — always filter active only
    let queryUrl = `${SUPABASE_URL}/rest/v1/sponsors?active=eq.true&select=*`;

    if (tier) {
      queryUrl += `&tier=eq.${encodeURIComponent(tier)}`;
    }
    if (team) {
      // teams is comma-separated — use ilike to match any team in the list
      queryUrl += `&teams=ilike.*${encodeURIComponent(team)}*`;
    }

    const res = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);

    let sponsors = await res.json();

    // Client-side filtering for sport (comma-separated field)
    if (sport) {
      sponsors = sponsors.filter(s => {
        // Town tier sponsors apply to all sports — no sport filter needed
        if (s.tier === 'town' || s.tier === 'presenting') return true;
        const sportList = (s.sport || 'basketball').split(',').map(x => x.trim());
        return sportList.includes(sport);
      });
    }

    // Client-side filtering for page placement (comma-separated field)
    if (page) {
      sponsors = sponsors.filter(s => {
        // Presenting tier doesn't use page_placements — they're always sitewide
        if (s.tier === 'presenting') return true;
        const pages = (s.page_placements || '').split(',').map(x => x.trim()).filter(Boolean);
        return pages.includes(page);
      });
    }

    return new Response(JSON.stringify({ sponsors }), { status: 200, headers });

  } catch (err) {
    console.error('get-sponsors error:', err);
    return new Response(JSON.stringify({ sponsors: [], error: err.message }), { status: 200, headers });
  }
};
