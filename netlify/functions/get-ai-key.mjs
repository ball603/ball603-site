// Returns Anthropic API key so the browser can call Claude directly
// Only accessible from the same origin (admin page)
export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'Key not configured' }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ key }), { status: 200, headers });
};
