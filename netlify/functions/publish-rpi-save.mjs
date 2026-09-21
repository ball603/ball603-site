// Writing a week's RPI rankings, on behalf of the CMS.
//
// POST { key, sport, season, week_of, rows: [...] }
//   → { deleted, inserted, sport, season, week_of }
//
// WHY THIS EXISTS. The CMS used to write rpi_rankings straight from the browser
// with the anon key, and that has never actually worked: the table carries one
// policy, "Allow public read access", and nothing for insert, update or delete.
// So the delete silently matched nothing (a blocked delete is a no-op, not an
// error) and the insert came back "new row violates row-level security policy".
// Basketball appeared to work only because a scheduled function used to publish
// it with the service key instead.
//
// The fix is not a write policy for anon. The anon key is printed in the source
// of every page on the site, so that would leave the rankings — which feed the
// Seed Decoder and the marquee matchups — writable by anybody who views source.
// The service key stays here, in Netlify's environment, behind the CMS
// password, which is the same shape as farmington-story and farmington-score.
//
// The RPI itself is still calculated in the CMS, where KJ can see the preview
// before publishing. This endpoint only stores what he has already looked at.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

/* The CMS's own password, so there is nothing new to remember or to set in
   Netlify. Same reasoning, and the same honest limits, as farmington-story:
   the string is also a constant in admin.html, which is served to anyone, so
   it stops a passer-by rather than a determined person. It is here because the
   alternative — an anon write policy — would stop nobody at all. */
const CMS_KEY = process.env.CMS_KEY || process.env.FARMINGTON_STORY_KEY || 'Gr@niteSt@teHoops';

// The sports the CMS has buttons for. A typo in the body should be a 400
// rather than a table full of rows nothing will ever read.
const SPORTS = new Set(['basketball', 'baseball', 'gvolleyball']);

// Every column the CMS calculates, and nothing else. A stray field from a
// future version of the CMS would otherwise fail the whole insert on an
// unknown column; this way it is simply dropped.
const NUMERIC = ['wins', 'losses', 'win_pct', 'owp', 'oowp', 'rpi', 'rank',
                 'high_rank', 'low_rank', 'last_rank', 'remaining_sos'];
const TEXT = ['team', 'gender', 'division'];

const MAX_ROWS = 2000;
const CHUNK = 500;

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

/* One row, cleaned. Numbers arrive as numbers from the CMS but a string would
   be accepted by Postgres and then sort as text, so they are coerced here;
   anything genuinely absent stays null rather than becoming 0, because a null
   rank and a rank of zero mean different things to the pages that read this. */
function clean(row, meta) {
  const out = { ...meta };
  for (const k of TEXT) {
    const v = row[k];
    out[k] = v == null || v === '' ? null : String(v).trim();
  }
  for (const k of NUMERIC) {
    const v = row[k];
    if (v == null || v === '') { out[k] = null; continue; }
    const n = Number(v);
    out[k] = Number.isFinite(n) ? n : null;
  }
  out.calculated_at = row.calculated_at || meta.calculated_at;
  return out;
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

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return fail(405, 'POST only');
  if (!SUPABASE_SERVICE_KEY) return fail(500, 'Supabase service key not configured');

  let body;
  try { body = await request.json(); }
  catch { return fail(400, 'Bad JSON'); }

  if (body.key !== CMS_KEY) return fail(401, 'Wrong key');

  const sport = String(body.sport || '');
  const season = String(body.season || '').trim();
  const weekOf = String(body.week_of || '').trim();

  if (!SPORTS.has(sport)) return fail(400, `sport must be one of ${[...SPORTS].join(', ')}`);
  if (!/^\d{4}(-\d{2})?$/.test(season)) return fail(400, 'season must look like 2026 or 2025-26');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return fail(400, 'week_of must be YYYY-MM-DD');

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows || !rows.length) return fail(400, 'rows must be a non-empty array');
  if (rows.length > MAX_ROWS) return fail(400, `too many rows (${rows.length})`);

  const meta = { sport, season, week_of: weekOf, calculated_at: new Date().toISOString() };
  const clean_rows = rows.map(r => clean(r, meta));

  // A row with no team is a bug upstream, and it would sit in the table
  // unreachable for ever. Better to refuse the whole publish and say so.
  const nameless = clean_rows.filter(r => !r.team).length;
  if (nameless) return fail(400, `${nameless} row${nameless > 1 ? 's' : ''} arrived with no team name`);

  const scope = `sport=eq.${encodeURIComponent(sport)}` +
                `&season=eq.${encodeURIComponent(season)}` +
                `&week_of=eq.${encodeURIComponent(weekOf)}`;

  try {
    /* Replace the week rather than merge into it: a team that has dropped out
       of a division since the last publish must not be left behind, and the
       table's unique index is (team, gender, division, week_of) — it does not
       include the sport, so an upsert keyed on it could reach across into
       another sport's rows for the same week. Deleting by sport, season and
       week is the only scope that means exactly what the CMS means. */
    const gone = await supabase(`rpi_rankings?${scope}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' }
    });
    const deleted = (gone || []).length;

    /* PostgREST inserts an array as a single statement, so each chunk is
       all-or-nothing. If one fails after an earlier chunk has landed the week
       is half written — the response says so plainly, and pressing Publish
       again is a clean retry because everything above recalculates from the
       games table. */
    let inserted = 0;
    for (let i = 0; i < clean_rows.length; i += CHUNK) {
      const chunk = clean_rows.slice(i, i + CHUNK);
      try {
        await supabase('rpi_rankings', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(chunk)
        });
      } catch (err) {
        return fail(500, `Saved ${inserted} of ${clean_rows.length} rows, then: ${err.message}. ` +
          `The week is incomplete — press Publish again.`, { deleted, inserted });
      }
      inserted += chunk.length;
    }

    console.log(`RPI published: ${sport} ${season} week of ${weekOf} — ` +
      `${deleted} old rows removed, ${inserted} written`);

    return new Response(JSON.stringify({
      ok: true, sport, season, week_of: weekOf, deleted, inserted
    }), { status: 200, headers });

  } catch (err) {
    console.error('RPI publish failed:', err);
    return fail(500, err.message);
  }
};
