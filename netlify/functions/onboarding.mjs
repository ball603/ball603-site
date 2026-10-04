// Ball603 Contributor Onboarding API
//
// Replaces the checklist KJ carried in his head. The catalogue of steps lives
// in onboarding_tasks; each person's outstanding items in contributor_onboarding;
// the handbook in resource_pages.
//
// Reads are open to any signed-in contributor. Writes are split: a contributor
// may only ever tick their OWN task, and only tasks owned by contributors. The
// CMS can do anything.
import { requireContributorOrCms, requireCmsKey, verifySupabaseUser, authHeaders, isOptions, contributorLookupPaths } from './lib/auth.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return data;
}

/* Placeholders a handbook page may use. Anything unset renders as a plain
   note rather than leaving {{SMUGMUG_PASSWORD}} on screen for contributors. */
const CREDENTIALS = {
  '{{SMUGMUG_USERNAME}}': () => process.env.SMUGMUG_USERNAME || '',
  '{{SMUGMUG_PASSWORD}}': () => process.env.SMUGMUG_PASSWORD || '',
  '{{SCORE_PASSWORD}}':   () => process.env.SCORE_ENTRY_KEY   || ''
};

/* ------------------------------------------------------------------ *
 * Self-checking tasks
 *
 * These three used to be ticked by hand, which meant the checklist
 * recorded who clicked a box rather than who did the thing - someone
 * could fill their handle in properly and still be nagged, or tick the
 * box with the field empty and drop off the radar. They are now worked
 * out from the data every time the checklist is read.
 *
 * Anything not listed here has nothing to check against (reading the
 * handbook, signing the agreement) and stays a checkbox.
 * ------------------------------------------------------------------ */
const DERIVED = {
  add_instagram:    (c) => !!String(c?.instagram_username || '').trim(),
  complete_profile: (c) => !!String(c?.bio || '').trim() && !!String(c?.headshot_url || '').trim()
  // set_password is handled separately - it needs the auth table, not this row
};

function fillCredentials(text) {
  let out = String(text || '');
  for (const [token, get] of Object.entries(CREDENTIALS)) {
    if (!out.includes(token)) continue;
    const value = get();
    out = out.split(token).join(value || '(ask KJ \u2014 not set up yet)');
  }
  return out;
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

/* Which contributor is making this call, established from their own session
   rather than from anything the page sends. */
async function callerContributorId(request) {
  const v = await verifySupabaseUser(request);
  if (!v.ok || !v.user?.email) return null;
  for (const path of contributorLookupPaths(v.user, 'id')) {
    const rows = await sb(path);
    if (rows?.[0]?.id) return rows[0].id;
  }
  return null;
}

/* Role flags -> the role names used in onboarding_tasks.roles */
function rolesFor(contributor) {
  const r = [];
  if (contributor?.is_photographer) r.push('photographer');
  if (contributor?.is_videographer) r.push('videographer');
  if (contributor?.is_writer)       r.push('writer');
  return r;
}

export default async (request) => {
  const headers = authHeaders();
  if (isOptions(request)) return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400, headers); }

  const action = String(body.action || '');

  try {
    /* ---------- the task catalogue (CMS, when building a checklist) ---------- */
    if (action === 'tasks') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;
      const tasks = await sb('onboarding_tasks?active=eq.true&select=*&order=sort_order.asc');
      return json({ success: true, tasks: tasks || [] }, 200, headers);
    }

    /* ---------- assign a checklist to someone (CMS) ---------- */
    if (action === 'assign') {
      const denied = await requireCmsKey(request, body);
      if (denied) return denied;

      const { contributorId } = body;
      const keys = Array.isArray(body.taskKeys) ? body.taskKeys : null;
      if (!contributorId) return json({ error: 'contributorId is required' }, 400, headers);

      let chosen = keys;
      if (!chosen) {
        // No explicit list: preselect from their role flags.
        const who = (await sb(`contributors?id=eq.${contributorId}&select=*&limit=1`))?.[0];
        if (!who) return json({ error: 'Contributor not found' }, 404, headers);
        const roles = rolesFor(who);
        const all = await sb('onboarding_tasks?active=eq.true&select=task_key,roles');
        chosen = (all || [])
          .filter(t => !t.roles || t.roles.length === 0 || t.roles.some(r => roles.includes(r)))
          .map(t => t.task_key);
      }

      if (chosen.length) {
        // merge-duplicates so re-assigning never wipes progress already made
        await sb('contributor_onboarding?on_conflict=contributor_id,task_key', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(chosen.map(k => ({ contributor_id: contributorId, task_key: k })))
        });
      }

      // Remove anything KJ unticked, but never remove something already done.
      const current = await sb(`contributor_onboarding?contributor_id=eq.${contributorId}&select=id,task_key,status`);
      const drop = (current || [])
        .filter(r => !chosen.includes(r.task_key) && r.status === 'pending')
        .map(r => r.id);
      if (drop.length) {
        await sb(`contributor_onboarding?id=in.(${drop.join(',')})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      }

      const list = await sb(`contributor_onboarding?contributor_id=eq.${contributorId}&select=*`);
      return json({ success: true, items: list || [] }, 200, headers);
    }

    /* ---------- one person's checklist ---------- */
    if (action === 'status') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;

      let id = body.contributorId || null;
      const mine = await callerContributorId(request);
      // A contributor can only ever read their own; the CMS may name anyone.
      if (mine) id = mine;
      if (!id) return json({ error: 'Could not identify your account' }, 403, headers);

      /* The password view can be absent (the migration has not been run)
         or return nothing (this person has no login at all). Neither is an
         error - the task just falls back to whatever is stored. */
      const [tasks, items, me, pwRows] = await Promise.all([
        sb('onboarding_tasks?select=*&order=sort_order.asc'),
        sb(`contributor_onboarding?contributor_id=eq.${id}&select=*`),
        sb(`contributors?id=eq.${id}&select=instagram_username,bio,headshot_url&limit=1`)
          .catch(() => null),
        sb(`contributor_password_status?contributor_id=eq.${id}&select=password_changed&limit=1`)
          .catch(() => null)
      ]);
      const byKey = {};
      (tasks || []).forEach(t => { byKey[t.task_key] = t; });

      const who = me?.[0] || null;
      const passwordChanged = pwRows?.[0]
        ? pwRows[0].password_changed === true
        : null;   // null = unknown, leave the stored status alone

      // What the data says about a task, or null if it cannot be judged.
      const derive = (key) => {
        if (key === 'set_password') return passwordChanged;
        if (!who || !DERIVED[key]) return null;
        return DERIVED[key](who);
      };

      const decorate = (it) => {
        const truth = derive(it.task_key);
        const status = truth === null ? it.status : (truth ? 'done' : 'pending');
        return {
          ...it,
          status,
          selfChecking: truth !== null,
          label:  byKey[it.task_key]?.label  || it.task_key,
          detail: byKey[it.task_key]?.detail || '',
          owner:  byKey[it.task_key]?.owner  || 'contributor',
          automatic: !!byKey[it.task_key]?.automatic,
          sort_order: byKey[it.task_key]?.sort_order ?? 999
        };
      };

      const merged = (items || []).map(decorate);

      /* A self-checking task is worth showing even when nobody ever seeded a
         row for this person - the answer comes from their data either way,
         and a missing row is exactly how someone slips through. */
      const present = new Set(merged.map(m => m.task_key));
      for (const key of Object.keys(byKey)) {
        if (present.has(key)) continue;
        if (derive(key) === null) continue;
        merged.push(decorate({ contributor_id: id, task_key: key, status: 'pending' }));
      }
      merged.sort((a, b) => a.sort_order - b.sort_order);

      /* Keep the stored rows in step, so the CMS overview tells the same
         story. Best effort - a failure here must not break the checklist. */
      const drifted = merged.filter(m =>
        m.selfChecking && m.status !== (items || []).find(i => i.task_key === m.task_key)?.status);
      if (drifted.length) {
        Promise.all(drifted.map(m => sb('contributor_onboarding', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            contributor_id: id,
            task_key: m.task_key,
            status: m.status,
            completed_at: m.status === 'done' ? new Date().toISOString() : null,
            completed_by: m.status === 'done' ? 'checked automatically' : null
          })
        }))).catch(err => console.warn('onboarding sync:', err.message));
      }

      const outstanding = merged.filter(m => m.owner === 'contributor' && m.status === 'pending');
      return json({
        success: true,
        contributorId: id,
        items: merged,
        outstanding,
        remaining: outstanding.length,
        allDone: merged.length > 0 && merged.every(m => m.status !== 'pending')
      }, 200, headers);
    }

    /* ---------- tick something off ---------- */
    if (action === 'complete' || action === 'reopen') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;

      const { taskKey } = body;

      /* Refuse to hand-tick something the system works out for itself. The
         portal does not offer a checkbox for these, so reaching here means
         a stale page or a direct call - either way the honest answer is
         that clicking cannot change it. */
      if (taskKey === 'set_password' || DERIVED[taskKey]) {
        return json({
          error: 'This one ticks itself once the work is done - there is nothing to click.'
        }, 400, headers);
      }
      if (!taskKey) return json({ error: 'taskKey is required' }, 400, headers);

      const mine = await callerContributorId(request);
      const isCms = (await requireCmsKey(request, body)) === null;
      const targetId = mine || body.contributorId;
      if (!targetId) return json({ error: 'Could not identify your account' }, 403, headers);

      /* A contributor may only tick their own contributor-owned tasks. Without
         this, anyone signed in could mark KJ's admin steps done, or complete
         someone else's agreement for them. */
      if (!isCms) {
        if (!mine) return json({ error: 'Could not identify your account' }, 403, headers);
        const t = (await sb(`onboarding_tasks?task_key=eq.${encodeURIComponent(taskKey)}&select=owner&limit=1`))?.[0];
        if (!t) return json({ error: 'Unknown task' }, 404, headers);
        if (t.owner !== 'contributor') return json({ error: 'That step is handled by KJ' }, 403, headers);
      }

      const patch = action === 'complete'
        ? { status: 'done', completed_at: new Date().toISOString(), completed_by: isCms && !mine ? 'cms' : 'contributor' }
        : { status: 'pending', completed_at: null, completed_by: null };

      await sb(`contributor_onboarding?contributor_id=eq.${targetId}&task_key=eq.${encodeURIComponent(taskKey)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch)
      });

      const items = await sb(`contributor_onboarding?contributor_id=eq.${targetId}&select=*`);
      const remaining = (items || []).filter(i => i.status === 'pending').length;
      return json({ success: true, remaining }, 200, headers);
    }

    /* ---------- the handbook ---------- */
    if (action === 'resources') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;
      const pages = await sb('resource_pages?visible=eq.true&select=slug,title,summary,body,sort_order&order=sort_order.asc');
      // Credentials are substituted HERE, on the server, for a signed-in
      // contributor only. They live in Netlify env vars, never in the database
      // and never in the page source - so rotating one updates the handbook
      // everywhere with no edit.
      return json({ success: true, pages: (pages || []).map(p => ({ ...p, body: fillCredentials(p.body) })) }, 200, headers);
    }

    if (action === 'save-resource') {
      const denied = await requireCmsKey(request, body);
      if (denied) return denied;
      const { slug, title, summary, bodyText, sortOrder, visible } = body;
      if (!slug || !title) return json({ error: 'slug and title are required' }, 400, headers);

      await sb('resource_pages?on_conflict=slug', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          slug: String(slug).trim(),
          title,
          summary: summary || null,
          body: bodyText || '',
          sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100,
          visible: visible !== false,
          updated_at: new Date().toISOString()
        })
      });
      return json({ success: true }, 200, headers);
    }

    /* ---------- CMS overview: who is stalled ---------- */
    if (action === 'overview') {
      const denied = await requireCmsKey(request, body);
      if (denied) return denied;

      const [people, items, tasks] = await Promise.all([
        sb('contributors?active=eq.true&select=id,name,email&order=name.asc'),
        sb('contributor_onboarding?select=contributor_id,task_key,status'),
        sb('onboarding_tasks?select=task_key,label,owner')
      ]);
      const byKey = {}; (tasks || []).forEach(t => { byKey[t.task_key] = t; });

      const rows = (people || []).map(p => {
        const mine = (items || []).filter(i => i.contributor_id === p.id);
        const pending = mine.filter(i => i.status === 'pending');
        return {
          id: p.id, name: p.name, email: p.email,
          total: mine.length,
          done: mine.filter(i => i.status !== 'pending').length,
          pending: pending.map(i => ({
            key: i.task_key,
            label: byKey[i.task_key]?.label || i.task_key,
            owner: byKey[i.task_key]?.owner || 'contributor'
          }))
        };
      }).filter(r => r.total > 0);

      return json({
        success: true,
        rows,
        stalled: rows.filter(r => r.pending.length > 0).length
      }, 200, headers);
    }

    return json({ error: 'Invalid action. Use: tasks, assign, status, complete, reopen, resources, save-resource, overview' }, 400, headers);

  } catch (err) {
    console.error('onboarding error:', err);
    return json({ error: err.message || 'Server error' }, 500, headers);
  }
};
