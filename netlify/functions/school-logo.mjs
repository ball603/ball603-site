// Ball 603 — serve opponent school crests from our own domain.
//
// The Tigers pages used to point <img src> straight at the upstream provider's
// asset host, which put the provider's name in every visitor's network tab.
// This function fetches the image server-side and hands it back from
// ball603.com, so nothing about the origin is visible to the browser.
//
//   /school-logo/<entityId>          (pretty path, see _redirects)
//   /.netlify/functions/school-logo?id=<entityId>
//   /.netlify/functions/school-logo?u=<encoded absolute url>
//
// `u` exists because standings rows carry a stored absolute logo URL rather
// than a bare id. It is NOT a general proxy: the host must be on ALLOWED_HOSTS
// or the request is refused, otherwise this would happily fetch anything on
// the internet on our behalf and under our name.

const ALLOWED_HOSTS = new Set([
  'assets.arbitersports.com',
  'cdn.arbitersports.com'
]);

const BASE = 'https://assets.arbitersports.com/logos/school/';

// A day in the browser, a week at the edge. Crests essentially never change,
// and every cache hit is one less upstream request with our name on it.
const CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

// A 1x1 transparent GIF, so a missing crest renders as nothing rather than a
// broken-image icon.
const BLANK = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const blank = () => new Response(BLANK, {
  status: 200,
  headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'public, max-age=3600' }
});

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const u = url.searchParams.get('u');

  let target = null;

  if (id) {
    // Ids are opaque upstream keys. Anything outside this alphabet is not one,
    // and letting it through would allow path traversal into the asset host.
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return blank();
    target = BASE + encodeURIComponent(id) + '.jpg';
  } else if (u) {
    let parsed;
    try { parsed = new URL(u); } catch { return blank(); }
    if (parsed.protocol !== 'https:') return blank();
    if (!ALLOWED_HOSTS.has(parsed.hostname)) return blank();
    target = parsed.toString();
  } else {
    return blank();
  }

  try {
    const res = await fetch(target, { headers: { 'Accept': 'image/*' } });
    if (!res.ok) return blank();

    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return blank();   // never pass back HTML

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': CACHE,
        // Nothing here should identify where the bytes came from.
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    console.error('school-logo failed:', err.message);
    return blank();
  }
};
