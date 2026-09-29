// Ball 603 — read and work the sponsor enquiry list, on behalf of the CMS.
//
// POST { key, action, ... }
//
//   action: 'list'   { status?, limit? }        → { inquiries: [...], counts }
//   action: 'update' { id, status?, admin_notes? } → { inquiry }
//   action: 'delete' { id }                     → { ok }
//
// The public half of this pair is sponsor-inquiry.mjs, which takes submissions
// from sponsor.html. This half is the CMS side and is guarded by the CMS
// password, because it exposes the name, email and phone number of everybody
// who has enquired — the one genuinely personal dataset on the site.
//
// sponsor_inquiries has RLS on with no policies, so the anon key in the page
// source cannot read it. That is the point: an open read policy here would
// publish a contact list.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

/* The CMS key. Read from the environment only — there is deliberately no
   literal fallback here.

   There used to be one, and because the repo root is Netlify's publish
   directory this file was being served as readable text at
   /netlify/functions/<name>, so that fallback was a published password. The
   env var was never set, which made the fallback the live key. /netlify/* is
   now blocked in _redirects, and the key comes from CMS_LOGIN_KJ.

   If CMS_LOGIN_KJ is missing the guarded actions refuse rather than falling
   back to anything, so a misconfigured deploy fails shut, not open. */
const CMS_KEY = process.env.CMS_LOGIN_KJ || process.env.CMS_KEY || process.env.FARMINGTON_STORY_KEY || '';

const STATUSES = new Set(['new', 'contacted', 'won', 'passed']);
const MAX_NOTES = 4000;

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
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  const fail = (status, error) =>
    new Response(JSON.stringify({ error, ...(status === 401 ? {} : {}) }), { status, headers });
  const ok = (obj) => new Response(JSON.stringify({ ok: true, ...obj }), { status: 200, headers });

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return fail(405, 'POST only');
  if (!SUPABASE_SERVICE_KEY) return fail(500, 'Supabase service key not configured');

  let body;
  try { body = await request.json(); }
  catch { return fail(400, 'Bad JSON'); }

  /* Fail shut. With no fallback literal, an unset CMS_LOGIN_KJ leaves CMS_KEY
     as '' — and '' === '' would let an empty key straight through. Refuse
     before the comparison is ever reached. */
  if (!CMS_KEY) return fail(500, 'CMS key is not configured on the server');
  if (body.key !== CMS_KEY) return fail(401, 'Wrong key');

  const action = String(body.action || '');

  try {
    // -----------------------------------------------------------------------
    if (action === 'list') {
      const limit = Math.min(Math.max(parseInt(body.limit, 10) || 200, 1), 500);
      const filter = (body.status && body.status !== 'all' && STATUSES.has(body.status))
        ? `&status=eq.${encodeURIComponent(body.status)}`
        : '';

      const inquiries = await supabase(
        'sponsor_inquiries?select=*' + filter +
        `&order=created_at.desc&limit=${limit}`
      );

      /* A separate count per status, so the tab badge and the filter labels
         reflect the whole table rather than whatever the current page shows.
         ip_hash and user_agent are deliberately left out of what goes back to
         the browser — they are abuse controls, not case notes. */
      const all = await supabase('sponsor_inquiries?select=status');
      const counts = { new: 0, contacted: 0, won: 0, passed: 0, total: (all || []).length };
      for (const r of all || []) {
        if (counts[r.status] != null) counts[r.status]++;
      }

      const safe = (inquiries || []).map(({ ip_hash, user_agent, ...rest }) => rest);
      return ok({ inquiries: safe, counts });
    }

    // -----------------------------------------------------------------------
    if (action === 'update') {
      if (body.id == null) return fail(400, 'id is required');

      const update = { updated_at: new Date().toISOString() };

      if (body.status != null) {
        if (!STATUSES.has(body.status)) {
          return fail(400, `status must be one of ${[...STATUSES].join(', ')}`);
        }
        update.status = body.status;
        // Stamp the moment it moved, so "how long did that take" is answerable
        // later without keeping a separate history.
        if (body.status === 'contacted') update.contacted_at = new Date().toISOString();
        if (body.status === 'won' || body.status === 'passed') {
          update.resolved_at = new Date().toISOString();
        }
      }

      if (body.admin_notes != null) {
        update.admin_notes = String(body.admin_notes).slice(0, MAX_NOTES) || null;
      }

      if (Object.keys(update).length === 1) return fail(400, 'Nothing to change');

      const rows = await supabase(`sponsor_inquiries?id=eq.${encodeURIComponent(body.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(update)
      });

      if (!rows || rows.length === 0) return fail(404, `No enquiry with id ${body.id}`);

      const { ip_hash, user_agent, ...safe } = rows[0];
      return ok({ inquiry: safe });
    }

    // -----------------------------------------------------------------------
    // For spam that slipped past the honeypot. Real leads get 'passed', not
    // deletion, so the record of who asked survives.
    if (action === 'delete') {
      if (body.id == null) return fail(400, 'id is required');
      await supabase(`sponsor_inquiries?id=eq.${encodeURIComponent(body.id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return ok({ deleted: body.id });
    }

    return fail(400, `Unknown action "${action}" — expected list, update or delete`);

  } catch (err) {
    console.error('sponsor-inquiries failed:', err);
    return fail(500, err.message);
  }
};
