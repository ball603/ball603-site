// Ball 603 — read and manage the scheduled social queue, on behalf of the CMS.
//
// POST { key, action, ... }
//
//   action: 'list'    { status?, limit? }        → { posts: [...] }
//   action: 'update'  { id, scheduled_for?, caption?, collaborators? }
//                                                → { post }
//   action: 'cancel'  { id }                     → { post } or an honest refusal
//
// WHY A FUNCTION RATHER THAN DIRECT QUERIES FROM admin.html.
// scheduled_social_posts has RLS on and no policies at all, so the anon key
// cannot read or write it. That is deliberate: the anon key is printed in the
// source of every page on the site, and a write policy would let any passer-by
// queue a post to the Ball 603 Instagram account. Same reasoning as
// publish-rpi-save.mjs. The service key stays here, behind the CMS password.
//
// TWO PLATFORMS, TWO DIFFERENT TRUTHS.
//   Instagram — we hold the post, so the row IS the post. Editing it is just a
//     database write, and publish-scheduled-social.mjs picks it up at its slot.
//   Facebook — Facebook holds the post; our row is only a mirror. So an edit
//     must go to the Graph API as well, or the CMS would show a change that
//     Facebook never heard about. Note the asymmetry in what Meta allows:
//     POST /{post-id} with message and scheduled_publish_time is documented,
//     but DELETE is "only select developers", with Business Suite as the
//     documented route. So cancel can fail on Facebook, and when it does this
//     says so rather than marking the row canceled and leaving the post live.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const FB_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// The CMS's own password — nothing new to remember or to set in Netlify. Same
// honest limits as publish-rpi-save.mjs: it stops a passer-by, not a determined
// person, and it is here because the alternative stops nobody at all.
const CMS_KEY = process.env.CMS_KEY || process.env.FARMINGTON_STORY_KEY || 'Gr@niteSt@teHoops';

const API_VERSION = 'v19.0';
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

const MIN_LEAD_MS = 10 * 60 * 1000;
const MAX_LEAD_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_COLLABORATORS = 3;

const EDITABLE = new Set(['pending', 'failed']);

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

function cleanCollaborators(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const handle = String(raw || '').trim().replace(/^@+/, '').toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(handle)) continue;
    if (/^\d+$/.test(handle)) continue;   // a numeric ID is not a username
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
    if (out.length === MAX_COLLABORATORS) break;
  }
  return out;
}

function parseSchedule(value) {
  const when = new Date(value);
  if (isNaN(when.getTime())) return { error: `Could not read "${value}" as a date and time` };
  const lead = when.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) return { error: 'Scheduled time must be at least 10 minutes from now' };
  if (lead > MAX_LEAD_MS) return { error: 'Scheduled time cannot be more than 6 months out' };
  return { when };
}

async function getRow(id) {
  const rows = await supabase(`scheduled_social_posts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  return rows && rows[0] ? rows[0] : null;
}

function patchRow(id, body) {
  return supabase(`scheduled_social_posts?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() })
  });
}

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  const fail = (status, error, extra = {}) =>
    new Response(JSON.stringify({ error, ...extra }), { status, headers });
  const ok = (obj) => new Response(JSON.stringify({ ok: true, ...obj }), { status: 200, headers });

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return fail(405, 'POST only');
  if (!SUPABASE_SERVICE_KEY) return fail(500, 'Supabase service key not configured');

  let body;
  try { body = await request.json(); }
  catch { return fail(400, 'Bad JSON'); }

  if (body.key !== CMS_KEY) return fail(401, 'Wrong key');

  const action = String(body.action || '');

  try {
    // -----------------------------------------------------------------------
    if (action === 'list') {
      const limit = Math.min(Math.max(parseInt(body.limit, 10) || 100, 1), 300);
      let filter = '';
      if (body.status === 'upcoming') {
        filter = '&status=in.(pending,publishing)';
      } else if (body.status && body.status !== 'all') {
        filter = `&status=eq.${encodeURIComponent(body.status)}`;
      }

      const posts = await supabase(
        'scheduled_social_posts?select=*' + filter +
        `&order=scheduled_for.desc&limit=${limit}`
      );

      return ok({ posts: posts || [], count: (posts || []).length });
    }

    // -----------------------------------------------------------------------
    if (action === 'update') {
      if (body.id == null) return fail(400, 'id is required');
      const row = await getRow(body.id);
      if (!row) return fail(404, `No queued post with id ${body.id}`);

      if (!EDITABLE.has(row.status)) {
        return fail(409,
          row.status === 'published'
            ? 'That post has already gone out, so it cannot be edited here.'
            : row.status === 'publishing'
              ? 'That post is being sent right now. Try again in a minute.'
              : `A ${row.status} post cannot be edited.`);
      }

      const update = {};
      let when = null;

      if (body.scheduled_for != null && body.scheduled_for !== '') {
        const parsed = parseSchedule(body.scheduled_for);
        if (parsed.error) return fail(400, parsed.error);
        when = parsed.when;
        update.scheduled_for = when.toISOString();
      }

      if (body.caption != null) update.caption = String(body.caption);

      if (body.collaborators != null) {
        if (row.platform !== 'instagram') {
          return fail(400, 'Collaborators are an Instagram feature.');
        }
        update.collaborators = cleanCollaborators(body.collaborators);
      }

      if (Object.keys(update).length === 0) return fail(400, 'Nothing to change');

      /* Putting a failed post back in the queue is a fresh start, not a fourth
         attempt: the attempt count resets and the old container id is dropped,
         because whatever went wrong may have been the container itself. */
      if (row.status === 'failed') {
        if (!when) return fail(400, 'Give a new date and time to put a failed post back in the queue');
        update.status = 'pending';
        update.attempts = 0;
        update.last_error = null;
        update.claimed_at = null;
        update.ig_container_id = null;
      }

      // Facebook holds the post, so it has to be told too. Doing this BEFORE
      // the database write means a refusal from Facebook leaves the row
      // matching reality rather than showing an edit that never landed.
      const fbNotes = [];
      if (row.platform === 'facebook') {
        if (!row.fb_post_id) return fail(409, 'That Facebook post has no post id on file, so it cannot be edited from here.');
        if (!FB_TOKEN) return fail(500, 'Facebook token not configured');

        const params = new URLSearchParams({ access_token: FB_TOKEN });
        if (update.caption != null) params.append('message', update.caption);
        if (when) params.append('scheduled_publish_time', String(Math.floor(when.getTime() / 1000)));

        const res = await fetch(`${GRAPH}/${encodeURIComponent(row.fb_post_id)}`, {
          method: 'POST', body: params
        });
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          return fail(502, `Facebook refused the change: ${data.error.message}`, { fb_error: data.error });
        }
        fbNotes.push('Updated on Facebook.');
      }

      const updated = await patchRow(row.id, update);
      return ok({ post: (updated || [])[0] || null, notes: fbNotes });
    }

    // -----------------------------------------------------------------------
    if (action === 'cancel') {
      if (body.id == null) return fail(400, 'id is required');
      const row = await getRow(body.id);
      if (!row) return fail(404, `No queued post with id ${body.id}`);

      if (row.status === 'published') {
        return fail(409, 'That post has already gone out. Delete it in the Instagram or Facebook app.');
      }
      if (row.status === 'publishing') {
        return fail(409, 'That post is being sent right now. Try again in a minute.');
      }
      if (row.status === 'canceled') return ok({ post: row, notes: ['Already canceled.'] });

      if (row.platform === 'facebook') {
        if (!row.fb_post_id) return fail(409, 'No Facebook post id on file for that row.');
        if (!FB_TOKEN) return fail(500, 'Facebook token not configured');

        const res = await fetch(
          `${GRAPH}/${encodeURIComponent(row.fb_post_id)}?access_token=${encodeURIComponent(FB_TOKEN)}`,
          { method: 'DELETE' }
        );
        const data = await res.json().catch(() => ({}));

        /* Meta documents DELETE on a page post as available to "select
           developers" only, with Business Manager as the route for everyone
           else. If it refuses, the post is still scheduled on Facebook — so
           the row must NOT be marked canceled. Saying so is the whole point;
           a tidy green checkmark here would mean a post going out that he
           believes he cancelled. */
        if (data.error || !res.ok) {
          return fail(502,
            `Facebook would not delete this post: ${data.error?.message || res.status}. ` +
            `It is still scheduled. Remove it in Meta Business Suite, then press Refresh here.`,
            { fb_error: data.error || null, still_scheduled: true });
        }
      }

      const updated = await patchRow(row.id, {
        status: 'canceled',
        claimed_at: null,
        last_error: null
      });
      return ok({ post: (updated || [])[0] || null });
    }

    return fail(400, `Unknown action "${action}" — expected list, update or cancel`);

  } catch (err) {
    console.error('social-manage failed:', err);
    return fail(500, err.message);
  }
};
