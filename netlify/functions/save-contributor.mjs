// save-contributor.mjs
import { requireCmsKey, asLegacy } from './lib/auth.mjs';
// Uses service key to bypass RLS on contributors table

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    /* Whole body first, so the guard can see the key. */
    const body = JSON.parse(event.body);
    const denied = await asLegacy(requireCmsKey(event, body));
    if (denied) return denied;

    const { id, updateData } = body;

    if (!id || !updateData) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and updateData required' }) };
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/contributors?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Supabase error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update contributor' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('save-contributor error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
