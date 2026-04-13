// Save contributor display_order values using service key (bypasses RLS)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    // Expects: { orders: [{id: 1, display_order: 1}, ...] }
    const { orders } = await request.json();

    if (!orders || !Array.isArray(orders)) {
      return new Response(JSON.stringify({ error: 'orders array required' }), { status: 400, headers });
    }

    let errorCount = 0;
    for (const { id, display_order } of orders) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/contributors?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ display_order })
        }
      );
      if (!res.ok) {
        console.error(`Failed to update id=${id}:`, res.status, await res.text());
        errorCount++;
      }
    }

    if (errorCount > 0) {
      return new Response(JSON.stringify({ success: false, error: `${errorCount} updates failed` }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('save-contributor-order error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
