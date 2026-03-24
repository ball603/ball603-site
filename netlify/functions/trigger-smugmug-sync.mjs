// trigger-smugmug-sync.mjs
// Proxy that triggers sync-smugmug using the server-side SYNC_SECRET_KEY.
// Called from admin.html — keeps the secret key out of the browser entirely.

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }

  const syncKey = process.env.SYNC_SECRET_KEY;
  if (!syncKey) {
    return new Response(JSON.stringify({ error: 'SYNC_SECRET_KEY not configured' }), { status: 500, headers });
  }

  try {
    // Call sync-smugmug internally using the secret key
    const baseUrl = process.env.URL || 'https://ball603.netlify.app';
    const res = await fetch(`${baseUrl}/.netlify/functions/sync-smugmug?key=${encodeURIComponent(syncKey)}`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};
