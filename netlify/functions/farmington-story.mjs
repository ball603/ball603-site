// "For the fans, by the fans" — saving and loading the three Tigers home page
// stories from the Ball603 CMS.
//
// GET  ?key=…              → all three slots, published or not, for the editor
// POST { key, slot, headline, body, image_url, published }
//
// Why this exists rather than the CMS writing to Supabase directly, the way it
// does for articles: a story body is HTML that gets injected into the Tigers
// home page. If the table were writable with the anon key — which is printed in
// farmington.js and in every page's source — then anyone at all could put
// anything on the front page of the site. So the table is read-only to anon and
// the service key lives here, behind a key that admin.html asks for and keeps
// in sessionStorage rather than carrying in its source.
//
// That is a good deal better than nothing and still not real security: whoever
// has the key can write, and the CMS has no accounts. Putting proper auth on
// admin.html is the actual fix, and a separate job.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// No default. An unset key means the endpoint refuses everything, rather than
// quietly falling back to something guessable.
const STORY_KEY = process.env.FARMINGTON_STORY_KEY;

const MAX_HEADLINE = 200;
const MAX_BODY = 60000;

/* The editor cannot produce a script tag, but this endpoint is the last thing
   between "some HTML" and the home page, so it is the right place to be sure.
   Scripts, iframes, object/embed and inline event handlers come out, and so do
   javascript: URLs. Everything TipTap actually emits — p, headings, lists,
   links, images, blockquote, the article-image divs — passes through. */
function sanitise(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, '')
    // on* handlers, quoted or bare.
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  const fail = (status, error) => new Response(JSON.stringify({ error }), { status, headers });

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!SUPABASE_SERVICE_KEY) return fail(500, 'Supabase service key not configured');
  if (!STORY_KEY) return fail(500, 'FARMINGTON_STORY_KEY is not set on this site');

  const url = new URL(request.url);

  try {
    if (request.method === 'GET') {
      if (url.searchParams.get('key') !== STORY_KEY) return fail(401, 'Wrong key');
      const rows = await supabase('farmington_stories?select=*&order=slot');
      return new Response(JSON.stringify({ stories: rows || [] }), { status: 200, headers });
    }

    if (request.method !== 'POST') return fail(405, 'GET or POST only');

    let body;
    try { body = await request.json(); }
    catch { return fail(400, 'Bad JSON'); }

    if (body.key !== STORY_KEY) return fail(401, 'Wrong key');

    const slot = Number(body.slot);
    if (![1, 2, 3].includes(slot)) return fail(400, 'slot must be 1, 2 or 3');

    const headline = String(body.headline || '').trim().slice(0, MAX_HEADLINE);
    const html = sanitise(body.body).slice(0, MAX_BODY);
    const published = !!body.published;

    // A slot with nothing in it cannot be published, whatever the toggle says —
    // otherwise the home page grows an empty card.
    const hasContent = !!(headline || html.replace(/<[^>]*>/g, '').trim() || body.image_url);

    const row = {
      slot,
      headline: headline || null,
      body: html || null,
      image_url: String(body.image_url || '').trim() || null,
      published: published && hasContent,
      updated_at: new Date().toISOString()
    };

    await supabase('farmington_stories?on_conflict=slot', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([row])
    });

    return new Response(JSON.stringify({
      success: true, slot, published: row.published,
      note: published && !hasContent ? 'Nothing in this slot yet, so it stays unpublished' : undefined
    }), { status: 200, headers });

  } catch (err) {
    console.error('farmington-story failed:', err);
    return fail(500, err.message);
  }
};
