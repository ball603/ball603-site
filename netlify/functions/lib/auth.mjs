// Ball 603 — one place that decides whether a caller may perform a write.
//
// Lives in a subdirectory on purpose. Netlify turns each top-level file in
// netlify/functions into a deployed function; a file in lib/ that does not
// share its directory's name is shared code, not an endpoint.
//
// TWO SEPARATE KEYS, deliberately:
//
//   CMS_LOGIN_KJ        — the CMS. Full control of the site.
//   SCORE_ENTRY_KEY     — the score-entry pages handed to scorekeepers at
//                         games. A password that circulates on a sideline
//                         should not also open the CMS.
//
// NO LITERAL FALLBACKS. An earlier version of the CMS check ended in
// `|| 'some-password'`, and because the environment variable had never been
// set, that literal was the live key — published in readable function source.
// Reading only from the environment is half the fix; failing shut when it is
// missing is the other half. An unset key leaves the expected value as '',
// and '' === '' would admit a caller who sent nothing at all, so the guards
// below refuse before any comparison happens.

const CMS_KEY   = process.env.CMS_LOGIN_KJ || process.env.CMS_KEY || process.env.FARMINGTON_STORY_KEY || '';
const SCORE_KEY = process.env.SCORE_ENTRY_KEY || '';

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://ball603.com';

/* Guarded endpoints answer to our own origin only. The wildcard that used to
   sit here let any page on the internet call these with a user's browser. */
export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-cms-key, x-score-key',
    'Vary': 'Origin',
    ...extra
  };
}

/* Timing-safe-ish comparison. Not a defence against a remote attacker — network
   jitter swamps the signal — but it costs nothing and avoids the habit of
   short-circuiting on the first differing character. */
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Callers come in two shapes. Netlify's newer functions get a Web `Request`,
   whose headers need .get(); the older ones get an AWS-style `event` whose
   headers are a plain object with lower-cased names. Accepting both means one
   guard covers the whole codebase instead of two that can drift apart. */
function headerValue(reqOrEvent, name) {
  const h = reqOrEvent?.headers;
  if (!h) return '';
  if (typeof h.get === 'function') return h.get(name) || '';
  const lower = name.toLowerCase();
  for (const k of Object.keys(h)) {
    if (k.toLowerCase() === lower) return h[k] || '';
  }
  return '';
}

function presented(reqOrEvent, body, header) {
  const fromHeader = headerValue(reqOrEvent, header);
  if (fromHeader) return String(fromHeader);
  if (body && typeof body.key === 'string') return body.key;   // existing callers
  return '';
}

/* Returns null when the caller may proceed, or a Response to return as-is.

   401 vs 500 matters: 401 means "you sent the wrong password", 500 means
   "this server has no password configured". Collapsing them into one message
   turns a broken deploy into a support call about a forgotten password. */
function check(expected, request, body, header, label) {
  if (!expected) {
    return new Response(
      JSON.stringify({ error: `${label} key is not configured on the server` }),
      { status: 500, headers: authHeaders() }
    );
  }
  if (!sameSecret(presented(request, body, header), expected)) {
    return new Response(
      JSON.stringify({ error: 'Not authorised' }),
      { status: 401, headers: authHeaders() }
    );
  }
  return null;
}

export const requireCmsKey   = (request, body) => check(CMS_KEY,   request, body, 'x-cms-key',   'CMS');
export const requireScoreKey = (request, body) => check(SCORE_KEY, request, body, 'x-score-key', 'Score entry');

/* Either key opens these: the score pages write scores, and the CMS must be
   able to do everything the score pages can. */
export function requireCmsOrScoreKey(request, body) {
  if (requireCmsKey(request, body) === null) return null;
  if (requireScoreKey(request, body) === null) return null;
  return (CMS_KEY || SCORE_KEY)
    ? new Response(JSON.stringify({ error: 'Not authorised' }), { status: 401, headers: authHeaders() })
    : new Response(JSON.stringify({ error: 'No keys configured on the server' }), { status: 500, headers: authHeaders() });
}

/* Works for both shapes: Request has .method, the legacy event .httpMethod. */
export const isOptions = (reqOrEvent) =>
  (reqOrEvent?.method || reqOrEvent?.httpMethod) === 'OPTIONS';

export const preflight = (reqOrEvent) =>
  isOptions(reqOrEvent) ? new Response(null, { status: 204, headers: authHeaders() }) : null;

/* Legacy handlers return {statusCode, headers, body} rather than a Response.
   Converting here keeps the call site in those functions a one-liner. */
export async function asLegacy(response) {
  if (response === null) return null;
  return {
    statusCode: response.status,
    headers: authHeaders(),
    body: await response.text()
  };
}


/* ---------------------------------------------------------------------------
   Contributor identity.

   The contributor portal signs people in with Supabase Auth, but the functions
   it calls never checked — update-assignment accepted a game id and a value
   from anyone on the internet. This verifies the caller's access token with
   Supabase and returns the user, so a write can at least be tied to a real
   signed-in contributor.

   Note what this does and does not establish: it proves WHO is calling, not
   that they are entitled to change this particular row. Per-row ownership is
   a policy question — contributors currently coordinate by editing each
   other's slots — so it is deliberately left alone here rather than guessed at
   and quietly broken.
   --------------------------------------------------------------------------- */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export async function verifySupabaseUser(reqOrEvent) {
  const raw = headerValue(reqOrEvent, 'authorization');
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!token) return { ok: false, status: 401, error: 'Sign in required' };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: 'Auth is not configured on the server' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { ok: false, status: 401, error: 'Session expired — sign in again' };
    const user = await res.json();
    if (!user || !user.id) return { ok: false, status: 401, error: 'Sign in required' };
    return { ok: true, user };
  } catch (err) {
    console.error('verifySupabaseUser failed:', err.message);
    return { ok: false, status: 503, error: 'Could not verify your session' };
  }
}

/* Either a signed-in contributor or the CMS. Returns null when allowed. */
export async function requireContributorOrCms(reqOrEvent, body) {
  if (requireCmsKey(reqOrEvent, body) === null) return null;
  const v = await verifySupabaseUser(reqOrEvent);
  if (v.ok) return null;
  return new Response(JSON.stringify({ error: v.error }), { status: v.status, headers: authHeaders() });
}