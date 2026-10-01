// Ball603 Coverage Request API
// Contributors request games; KJ selects who actually covers when a game is
// oversubscribed. NHIAA limits the number of credentialed people per game.
//
// Source of truth for coverage is game_coverage_requests. The legacy
// photog1/photog2/videog/writer columns on `games` are kept as a MIRROR so
// story generation, galleries and reports keep working untouched. Only this
// function writes them, so the two cannot drift.
import { requireContributorOrCms, requireCmsKey, authHeaders, isOptions } from './lib/auth.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const ROLES = ['photog', 'videog', 'writer'];

/* ------------------------------------------------------------------ *
 * NHIAA credential limits.
 *   2  - regular season, First Round / Prelims, Quarters, Semis
 *   5  - ALL finals (every sport and division)
 *   5  - boys D-I BASKETBALL semifinals only
 * ------------------------------------------------------------------ */
export function coverageLimit(game) {
  if (!game) return 2;
  const round = String(game.round || '').trim();

  if (game.is_playoff !== true) return 2;
  if (round === 'Final') return 5;

  if (round === 'Semis') {
    const sport = String(game.sport || '').toLowerCase();
    const gender = String(game.gender || '').trim().toLowerCase();
    const division = String(game.division || '').trim().toUpperCase();
    if (sport === 'basketball' && gender === 'boys' && division === 'D-I') return 5;
    return 2;
  }
  return 2; // First Round, Prelims, Quarters, anything unrecognized
}

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

const gid = (id) => encodeURIComponent(String(id));

async function loadGame(gameId) {
  const rows = await sb(`games?game_id=eq.${gid(gameId)}&select=game_id,is_playoff,round,sport,gender,division,photog1,photog2,videog,writer&limit=1`);
  return (rows && rows[0]) || null;
}

/* The upsert key is (game_id, contributor_id). Postgres treats NULLs as
   distinct, so a null id would quietly create duplicate requests for the same
   person. Resolve the id from the name before writing. */
async function resolveContributorId(contributorId, contributorName) {
  if (contributorId) return contributorId;
  if (!contributorName) return null;
  const esc = String(contributorName).trim().replace(/[%_,()]/g, '');
  const rows = await sb(`contributors?name=ilike.${encodeURIComponent(esc)}&select=id&limit=1`);
  return (rows && rows[0] && rows[0].id) || null;
}

async function loadRequests(gameId) {
  return (await sb(`game_coverage_requests?game_id=eq.${gid(gameId)}&select=*&order=requested_at.asc`)) || [];
}

/* Mirror the selected people into the legacy columns.
   Only 4 columns exist, so for a 5-person final the 5th lives in the
   requests table only - which is why the UI reads from that table. */
async function syncLegacyColumns(gameId, requests) {
  const selected = requests.filter(r => r.status === 'selected');
  const photogs = selected.filter(r => r.role === 'photog').map(r => r.contributor_name);
  const videog  = selected.find(r => r.role === 'videog');
  const writer  = selected.find(r => r.role === 'writer');

  await sb(`games?game_id=eq.${gid(gameId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      photog1: photogs[0] || null,
      photog2: photogs[1] || null,
      videog:  videog ? videog.contributor_name : null,
      writer:  writer ? writer.contributor_name : null
    })
  });
}

/* The auto-assign rule: if the number of people who want the game is at or
   under the limit, they all get it. Only an oversubscribed game waits for KJ.
   Never demotes anyone KJ has already chosen. */
async function reconcile(gameId, game, requests) {
  const limit = coverageLimit(game);
  const active = requests.filter(r => r.status === 'requested' || r.status === 'selected');

  if (active.length > 0 && active.length <= limit) {
    const toPromote = active.filter(r => r.status !== 'selected').map(r => r.id);
    if (toPromote.length) {
      await sb(`game_coverage_requests?id=in.(${toPromote.join(',')})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'selected', decided_at: new Date().toISOString(), decided_by: 'auto' })
      });
      requests = requests.map(r => toPromote.includes(r.id) ? { ...r, status: 'selected' } : r);
    }
  }
  await syncLegacyColumns(gameId, requests);
  return requests;
}

function summarize(game, requests) {
  const limit = coverageLimit(game);
  const selected = requests.filter(r => r.status === 'selected');
  const pending  = requests.filter(r => r.status === 'requested');
  return {
    gameId: game.game_id,
    limit,
    selected: selected.map(r => ({ id: r.id, name: r.contributor_name, role: r.role, contributorId: r.contributor_id })),
    pending:  pending.map(r  => ({ id: r.id, name: r.contributor_name, role: r.role, contributorId: r.contributor_id })),
    pendingCount: pending.length,
    spotsLeft: Math.max(0, limit - selected.length),
    needsDecision: pending.length > 0
  };
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

export default async (request) => {
  const headers = authHeaders();
  if (isOptions(request)) return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON body' }, 400, headers); }

  const action = String(body.action || '');

  try {
    /* ---- read-only: anyone signed in ---- */
    if (action === 'status') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;

      const ids = Array.isArray(body.gameIds) ? body.gameIds.slice(0, 500) : [];
      if (!ids.length) return json({ success: true, games: {} }, 200, headers);

      const list = ids.map(i => `"${String(i).replace(/"/g, '')}"`).join(',');
      const [games, reqs] = await Promise.all([
        sb(`games?game_id=in.(${encodeURIComponent(list)})&select=game_id,is_playoff,round,sport,gender,division`),
        sb(`game_coverage_requests?game_id=in.(${encodeURIComponent(list)})&select=*`)
      ]);
      const byGame = {};
      for (const g of games || []) {
        byGame[g.game_id] = summarize(g, (reqs || []).filter(r => String(r.game_id) === String(g.game_id)));
      }
      return json({ success: true, games: byGame }, 200, headers);
    }

    /* ---- CMS: every game that needs a decision, in one call ----
       admin.html authenticates with the CMS password, not a Supabase session,
       so it cannot read the table directly under RLS. It reads through here. */
    if (action === 'cms-list') {
      const denied = await requireCmsKey(request, body);
      if (denied) return denied;

      const reqs = (await sb('game_coverage_requests?select=*&order=requested_at.asc')) || [];
      if (!reqs.length) return json({ success: true, games: [], pendingGames: 0 }, 200, headers);

      const ids = [...new Set(reqs.map(r => String(r.game_id)))];
      const games = [];
      // Chunked so a long season cannot blow the URL length limit.
      for (let i = 0; i < ids.length; i += 100) {
        const list = ids.slice(i, i + 100).map(x => `"${x.replace(/"/g, '')}"`).join(',');
        const part = await sb(`games?game_id=in.(${encodeURIComponent(list)})&select=game_id,date,time,home_team,away_team,sport,gender,division,is_playoff,round`);
        games.push(...(part || []));
      }

      const today = new Date().toISOString().slice(0, 10);
      const out = games.map(g => {
        const mine = reqs.filter(r => String(r.game_id) === String(g.game_id));
        const selected = mine.filter(r => r.status === 'selected');
        const pending  = mine.filter(r => r.status === 'requested');
        return {
          game: g,
          limit: coverageLimit(g),
          selected: selected.map(r => ({ id: r.id, name: r.contributor_name, role: r.role })),
          pending:  pending.map(r  => ({ id: r.id, name: r.contributor_name, role: r.role }))
        };
      }).filter(r => !body.upcomingOnly || !r.game.date || r.game.date >= today);

      out.sort((a, b) => String(a.game.date || '').localeCompare(String(b.game.date || '')));
      const pendingGames = out.filter(r => r.pending.length > 0).length;
      return json({ success: true, games: out, pendingGames }, 200, headers);
    }

    /* ---- contributor asks for a game ---- */
    if (action === 'request' || action === 'withdraw') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;

      const { gameId, contributorId, contributorName, role } = body;
      if (!gameId || !contributorName) return json({ error: 'gameId and contributorName are required' }, 400, headers);

      const game = await loadGame(gameId);
      if (!game) return json({ error: 'Game not found' }, 404, headers);

      const resolvedId = await resolveContributorId(contributorId, contributorName);

      if (action === 'request') {
        if (!ROLES.includes(role)) return json({ error: `role must be one of: ${ROLES.join(', ')}` }, 400, headers);
        if (!resolvedId) return json({ error: 'Could not identify your contributor record. Contact an admin.' }, 400, headers);
        // Upsert keyed on (game_id, contributor_id): re-requesting changes role,
        // it never creates a duplicate or silently drops the person.
        await sb('game_coverage_requests?on_conflict=game_id,contributor_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            game_id: String(gameId),
            contributor_id: resolvedId,
            contributor_name: contributorName,
            role
          })
        });
      } else {
        if (resolvedId) {
          await sb(`game_coverage_requests?game_id=eq.${gid(gameId)}&contributor_id=eq.${resolvedId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        } else {
          await sb(`game_coverage_requests?game_id=eq.${gid(gameId)}&contributor_name=eq.${encodeURIComponent(contributorName)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        }
      }

      let reqs = await loadRequests(gameId);
      reqs = await reconcile(gameId, game, reqs);
      return json({ success: true, ...summarize(game, reqs) }, 200, headers);
    }

    /* ---- KJ picks who covers (CMS only) ---- */
    if (action === 'select' || action === 'unselect') {
      const denied = await requireCmsKey(request, body);
      if (denied) return denied;

      const { gameId, requestId } = body;
      if (!gameId || !requestId) return json({ error: 'gameId and requestId are required' }, 400, headers);

      const game = await loadGame(gameId);
      if (!game) return json({ error: 'Game not found' }, 404, headers);

      let reqs = await loadRequests(gameId);
      const target = reqs.find(r => String(r.id) === String(requestId));
      if (!target) return json({ error: 'Request not found for this game' }, 404, headers);

      if (action === 'select') {
        const limit = coverageLimit(game);
        const selectedCount = reqs.filter(r => r.status === 'selected').length;
        // Refuse rather than silently exceed the credential limit.
        if (target.status !== 'selected' && selectedCount >= limit) {
          return json({
            error: `This game is limited to ${limit} ${limit === 1 ? 'person' : 'people'}. Remove someone first.`,
            limit, selectedCount
          }, 409, headers);
        }
      }

      await sb(`game_coverage_requests?id=eq.${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: action === 'select' ? 'selected' : 'requested',
          decided_at: new Date().toISOString(),
          decided_by: 'cms'
        })
      });

      reqs = await loadRequests(gameId);
      // Deliberately NOT reconcile() here: an explicit unselect must stick,
      // otherwise auto-assign would immediately put the person back.
      await syncLegacyColumns(gameId, reqs);
      return json({ success: true, ...summarize(game, reqs) }, 200, headers);
    }

    return json({ error: 'Invalid action. Use: status, cms-list, request, withdraw, select, unselect' }, 400, headers);

  } catch (err) {
    console.error('coverage-request error:', err);
    return json({ error: err.message || 'Server error' }, 500, headers);
  }
};
