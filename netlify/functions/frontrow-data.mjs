/* The site's data, built from the CMS database.
 *
 * Replaces the hand-maintained data/events.json and data/replays.json. It
 * emits exactly the shapes those files had, so none of the page code changed -
 * only the two addresses fr.js fetches.
 *
 * Why a function rather than a published file:
 *   - Visitors never touch the database. This runs on the server with a key
 *     that never reaches a browser, and Netlify's network caches the answer,
 *     so a thousand people watching on a Saturday cost one query a minute.
 *   - There is no separate "publish" step to forget. The `visible` switch on
 *     each item IS the publish action, which matters mid-game when a stream
 *     address needs fixing and waiting on a deploy isn't an option.
 *
 * Needs two environment variables in Netlify (Project settings → Environment
 * variables), NOT in the repo:
 *   SUPABASE_URL          the project URL
 *   SUPABASE_SERVICE_KEY  the secret / service_role key
 * The service key bypasses row-level security, which is exactly why it only
 * ever lives here and never in a page.
 */

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const ZONE = 'America/New_York';

// A page is useless if this is stale by more than a minute or two, and
// pointless to recompute more often than that.
const CACHE = 'public, max-age=60, stale-while-revalidate=300';

async function q(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/* "2026-10-06T17:30" in the league's own time, which is what the old files
   held. Doing it with Intl rather than by hand is what keeps November right. */
function localStamp(iso) {
  if (!iso) return '';
  const p = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date(iso)).forEach(x => { p[x.type] = x.value; });
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

// Everything a page needs to draw a team: name, short form, colour.
function teamMap(schools) {
  const out = {};
  for (const s of schools) {
    out[s.key] = { name: s.name, mascot: s.mascot || '', abbr: s.abbr || s.key.toUpperCase().slice(0, 4),
                   color: s.color || '#3a4a63', nec: s.member === 'full' || s.member === 'associate' };
  }
  return out;
}

// A paid item's playback address is never written into a public response.
// Today nothing is paid, but the rule belongs in the code, not in a promise.
const streamOf = c => (c.access === 'paid' ? null : c.stream_url || null);

export default async (req) => {
  if (!URL_ || !KEY) {
    return json({ error: 'The site is not connected to its database yet. '
      + 'SUPABASE_URL and SUPABASE_SERVICE_KEY need setting in Netlify.' }, 500, 'no-store');
  }

  const what = new URL(req.url).searchParams.get('what') || 'events';

  try {
    const [schools, sports] = await Promise.all([
      q('schools?select=key,name,abbr,mascot,color,member,city,state&order=sort'),
      q('sports?select=key,name&active=is.true&order=sort')
    ]);
    const teams = teamMap(schools);
    const sportName = Object.fromEntries(sports.map(s => [s.key, s.name]));

    if (what === 'events') {
      // What's on now or next: a day either side, so a late finish and
      // tomorrow's early start both show without a second request.
      const from = new Date(Date.now() - 36 * 3600e3).toISOString();
      const to   = new Date(Date.now() + 36 * 3600e3).toISOString();
      const rows = await q('content?select=id,title,starts_at,sport,home,away,status,stream_url,access'
        + `&visible=is.true&status=in.(scheduled,live)&starts_at=gte.${from}&starts_at=lte.${to}`
        + '&order=starts_at.asc');

      return json({
        updated: new Date().toISOString(),
        teams,
        events: rows.map(c => {
          const h = schools.find(s => s.key === c.home);
          return {
            id: c.id,
            sport: sportName[c.sport] || '',
            sportKey: c.sport || '',
            away: c.away || '', home: c.home || '',
            venue: '',
            city: h && h.city ? `${h.city}, ${h.state || ''}`.replace(/, $/, '') : '',
            stream: streamOf(c),
            kickoff: c.starts_at
          };
        }),
        sports: sports.map(s => ({ key: s.key, name: s.name })),
        schools: schools.filter(s => s.member !== 'opponent')
          .map(s => ({ key: s.key, name: s.name, mascot: s.mascot || '',
                       abbr: s.abbr || '', color: s.color || '', member: s.member }))
      }, 200, CACHE);
    }

    if (what === 'replays') {
      // The on-demand library. Column-compressed the way the old file was -
      // 1,700 rows of repeated key names is a lot of bytes for a phone.
      const rows = await q('content?select=id,title,starts_at,sport,kind,home,away,duration_seconds,stream_url,access'
        + '&visible=is.true&status=eq.archived&order=starts_at.desc&limit=5000');

      const cols = ['id','date','sport','kind','away','home','sep','title','label','dur','hls'];
      return json({
        updated: new Date().toISOString(),
        sports: sports.map(s => ({ key: s.key, name: s.name })),
        teams,
        cols,
        items: rows.map(c => [
          c.id,
          localStamp(c.starts_at),
          c.sport || '',
          c.kind || 'game',
          c.away || '',
          c.home || '',
          c.kind === 'game' && c.away && c.home ? 'at' : '',
          // A game's name is drawn from its teams; only the rest need a title.
          c.kind === 'game' && c.away && c.home ? '' : (c.title || ''),
          '',
          c.duration_seconds ?? null,
          streamOf(c)
        ])
      }, 200, CACHE);
    }

    return json({ error: 'what must be "events" or "replays"' }, 400, 'no-store');

  } catch (e) {
    // A page showing nothing is better than a page showing something wrong,
    // so say so plainly and let the caller decide.
    return json({ error: String(e.message || e) }, 502, 'no-store');
  }
};

function json(body, status, cache) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache,
      // Netlify's own network honours this separately from the browser's.
      'netlify-cdn-cache-control': cache
    }
  });
}

export const config = { path: '/api/data' };
