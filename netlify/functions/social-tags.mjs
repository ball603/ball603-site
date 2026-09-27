// Ball 603 — the Instagram handles for schools and teams, on behalf of the CMS.
//
// POST { key, action, ... }
//
//   action: 'list'    {}                          → { rows: [...] }
//   action: 'save'    { rows: [{id, instagram}] }  → { saved }
//   action: 'resolve' { teams: [{school, sport, gender}] }
//                                                 → { handles: [...], detail }
//
// WHY A FUNCTION RATHER THAN DIRECT QUERIES. social_tags has RLS on and no
// policies, so the anon key in the page source cannot read or write it. These
// handles decide who gets tagged from the Ball 603 account, which is not
// something a passer-by should be able to edit. Same reasoning as
// publish-rpi-save.mjs and social-manage.mjs.
//
// TWO LEVELS OF TAG, both applied:
//   scope='team'   — the team's own account, keyed by school + sport + gender.
//   scope='school' — the school's athletics account.
//
// CO-OPS. A co-op fields one combined team, so games.home_team reads
// 'Pittsburg-Canaan' and there is no school by that name. Those school rows
// carry co_op_members, and the school-level tag expands to every member
// instead. The team row is untouched: if the co-op runs its own team account
// it still gets tagged. So Pittsburg-Canaan v Groveton resolves to the
// co-op's team account, Pittsburg, Canaan, Groveton's team account and
// Groveton — five handles, assuming all five are filled in.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const CMS_KEY = process.env.CMS_KEY || process.env.FARMINGTON_STORY_KEY || 'Gr@niteSt@teHoops';

// Instagram's own ceiling for tagged accounts is far higher, but a game post
// should never need more than a handful; a longer list means something has
// gone wrong upstream.
const MAX_HANDLES = 10;
const MAX_SAVE_ROWS = 600;

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      // social_tags is ~460 rows; PostgREST caps a page at 1000 by default.
      Range: '0-1999',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// A handle as Instagram will accept it: no @, lowercase, and never a numeric
// user ID, which is a different thing entirely and fails the whole container.
function cleanHandle(raw) {
  if (raw == null) return null;
  let v = String(raw).trim();
  if (!v) return null;
  const fromUrl = v.match(/instagram\.com\/+@?([^/?#\s]+)/i);
  if (fromUrl) v = fromUrl[1];
  v = v.replace(/^@+/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(v)) return null;
  if (/^\d+$/.test(v)) return null;
  return v;
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
      const rows = await supabase(
        'social_tags?select=id,scope,school,sport,gender,instagram,co_op_members,active' +
        '&order=school.asc,scope.asc,sport.asc,gender.asc'
      );
      return ok({ rows: rows || [], count: (rows || []).length });
    }

    // -----------------------------------------------------------------------
    if (action === 'save') {
      const rows = Array.isArray(body.rows) ? body.rows : null;
      if (!rows) return fail(400, 'rows must be an array');
      if (rows.length > MAX_SAVE_ROWS) return fail(400, `too many rows (${rows.length})`);
      if (rows.length === 0) return ok({ saved: 0, cleared: 0, rejected: [] });

      /* Only the handle is writable from the grid. The identity columns —
         scope, school, sport, gender — come from the seed and match what
         games spells, so letting the browser rewrite them would be a way to
         quietly break every lookup. */
      let saved = 0, cleared = 0;
      const rejected = [];

      for (const row of rows) {
        const id = row.id;
        if (id == null) { rejected.push({ id, reason: 'no id' }); continue; }

        const raw = row.instagram;
        const isBlank = raw == null || String(raw).trim() === '';
        const handle = isBlank ? null : cleanHandle(raw);

        if (!isBlank && handle === null) {
          // Say which ones didn't take rather than saving nothing and blaming
          // the whole batch.
          rejected.push({ id, value: String(raw).slice(0, 40), reason: 'not a usable Instagram username' });
          continue;
        }

        await supabase(`social_tags?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ instagram: handle, updated_at: new Date().toISOString() })
        });

        if (handle === null) cleared++; else saved++;
      }

      return ok({ saved, cleared, rejected });
    }

    // -----------------------------------------------------------------------
    // Given the teams in a story, the handles to tag on the cover photo.
    if (action === 'resolve') {
      const teams = Array.isArray(body.teams) ? body.teams : [];
      if (teams.length === 0) return ok({ handles: [], detail: [] });

      const names = [...new Set(teams.map(t => String(t.school || '').trim()).filter(Boolean))];
      if (names.length === 0) return ok({ handles: [], detail: [] });

      // One round trip for the named schools, then a second for any co-op
      // members those turn out to need.
      const inList = (list) => `(${list.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',')})`;
      let rows = await supabase(
        `social_tags?select=id,scope,school,sport,gender,instagram,co_op_members` +
        `&school=in.${encodeURIComponent(inList(names))}`
      ) || [];

      const memberNames = new Set();
      for (const r of rows) {
        if (r.scope !== 'school') continue;
        for (const m of (Array.isArray(r.co_op_members) ? r.co_op_members : [])) {
          const name = String(m || '').trim();
          if (name && !names.includes(name)) memberNames.add(name);
        }
      }

      if (memberNames.size) {
        const extra = await supabase(
          `social_tags?select=id,scope,school,sport,gender,instagram,co_op_members` +
          `&scope=eq.school&school=in.${encodeURIComponent(inList([...memberNames]))}`
        ) || [];
        rows = rows.concat(extra);
      }

      const byKey = new Map();
      for (const r of rows) {
        byKey.set(`${r.scope}|${r.school}|${r.sport || ''}|${r.gender || ''}`, r);
      }

      const detail = [];
      const handles = [];
      const seen = new Set();

      const add = (handle, why, school) => {
        const clean = cleanHandle(handle);
        if (!clean || seen.has(clean) || handles.length >= MAX_HANDLES) return;
        seen.add(clean);
        handles.push(clean);
        detail.push({ handle: clean, why, school });
      };

      for (const t of teams) {
        const school = String(t.school || '').trim();
        if (!school) continue;
        const sport = String(t.sport || '').trim();
        const gender = String(t.gender || '').trim();

        // The team's own account.
        const teamRow = byKey.get(`team|${school}|${sport}|${gender}`);
        if (teamRow?.instagram) add(teamRow.instagram, 'team', school);

        // The school account — or, for a co-op, each member school's.
        const schoolRow = byKey.get(`school|${school}||`);
        const members = Array.isArray(schoolRow?.co_op_members) ? schoolRow.co_op_members : [];

        if (members.length) {
          for (const m of members) {
            const memberRow = byKey.get(`school|${String(m).trim()}||`);
            if (memberRow?.instagram) add(memberRow.instagram, 'co-op school', String(m).trim());
            else detail.push({ handle: null, why: 'co-op school', school: String(m).trim(), missing: true });
          }
          // A co-op may also run its own school-level account.
          if (schoolRow?.instagram) add(schoolRow.instagram, 'co-op', school);
        } else if (schoolRow?.instagram) {
          add(schoolRow.instagram, 'school', school);
        } else {
          detail.push({ handle: null, why: 'school', school, missing: true });
        }

        if (!teamRow?.instagram && sport) {
          detail.push({ handle: null, why: 'team', school, sport, gender, missing: true });
        }
      }

      return ok({ handles, detail });
    }

    return fail(400, `Unknown action "${action}" — expected list, save or resolve`);

  } catch (err) {
    console.error('social-tags failed:', err);
    return fail(500, err.message);
  }
};
