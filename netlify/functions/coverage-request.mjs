// Ball603 Coverage Request API
// Contributors request games; KJ selects who actually covers when a game is
// oversubscribed. NHIAA limits the number of credentialed people per game.
//
// Source of truth for coverage is game_coverage_requests. The legacy
// photog1/photog2/videog/writer columns on `games` are kept as a MIRROR so
// story generation, galleries and reports keep working untouched. Only this
// function writes them, so the two cannot drift.
import { requireContributorOrCms, requireCmsKey, verifySupabaseUser, authHeaders, isOptions } from './lib/auth.mjs';
import { sendEmail, coverageDecisionEmail } from './lib/email.mjs';

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

      /* Deliberately NOT filtered by the caller's game ids. A full season is
         hundreds of games, and packing them into one `game_id=in.(...)` URL
         exceeded the length limit, so this call failed and the schedule
         silently fell back to the legacy photog1/photog2 columns - which is
         exactly how two names showed up on an over-limit game.
         The requests table is small (one row per person per claimed game), so
         fetching all of it and returning a map is both cheaper and safer. */
      const reqs = (await sb('game_coverage_requests?select=*')) || [];
      if (!reqs.length) return json({ success: true, games: {} }, 200, headers);

      const ids = [...new Set(reqs.map(r => String(r.game_id)))];
      const games = [];
      for (let i = 0; i < ids.length; i += 100) {     // chunked: bounded URLs
        const list = ids.slice(i, i + 100).map(x => `"${x.replace(/"/g, '')}"`).join(',');
        const part = await sb(`games?game_id=in.(${encodeURIComponent(list)})&select=game_id,is_playoff,round,sport,gender,division`);
        games.push(...(part || []));
      }

      const byGame = {};
      for (const g of games) {
        byGame[g.game_id] = summarize(g, reqs.filter(r => String(r.game_id) === String(g.game_id)));
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
        const removed = mine.filter(r => r.status === 'removed');
        return {
          game: g,
          limit: coverageLimit(g),
          selected: selected.map(r => ({ id: r.id, name: r.contributor_name, role: r.role })),
          pending:  pending.map(r  => ({ id: r.id, name: r.contributor_name, role: r.role })),
          // Shown so a removal can be undone. Without this they vanished from
          // the card and there was no way back.
          removed:  removed.map(r  => ({ id: r.id, name: r.contributor_name, role: r.role }))
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
        const existing = (await sb(`game_coverage_requests?game_id=eq.${gid(gameId)}&contributor_id=eq.${resolvedId}&select=id,status&limit=1`))?.[0];

        if (existing && existing.status === 'selected') {
          // Already covering it - a re-request only changes the role. Blindly
          // upserting status:'requested' here would demote them.
          await sb(`game_coverage_requests?id=eq.${existing.id}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ role })
          });
        } else if (existing) {
          // Revives a row KJ had marked 'removed', and clears its stale alert.
          await sb(`game_coverage_requests?id=eq.${existing.id}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ role, status: 'requested', decided_by: null, decided_at: null, decision_seen_at: null })
          });
        } else {
          await sb('game_coverage_requests', {
            method: 'POST', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              game_id: String(gameId),
              contributor_id: resolvedId,
              contributor_name: contributorName,
              role,
              status: 'requested'
            })
          });
        }
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

    /* ---- a contributor's unseen decisions, and dismissing them ----
       Only decisions KJ made ('cms') raise an alert. Auto-assignment does not:
       the person clicked request and saw the result immediately. */
    if (action === 'alerts' || action === 'dismiss') {
      const denied = await requireContributorOrCms(request, body);
      if (denied) return denied;

      /* Identify the caller from their own session, NOT from the body, so one
         contributor cannot read or clear another's alerts. The CMS may pass a
         contributorId explicitly. */
      let whoId = null;
      const v = await verifySupabaseUser(request);
      if (v.ok && v.user && v.user.email) {
        const rows = await sb(`contributors?email=ilike.${encodeURIComponent(String(v.user.email).replace(/[%_,()]/g, ''))}&select=id&limit=1`);
        whoId = rows?.[0]?.id || null;
      }
      if (!whoId && body.contributorId) {
        // CMS-key callers only (a contributor token never gets here with a
        // different id, because whoId above already resolved from their session).
        const cmsDenied = await requireCmsKey(request, body);
        if (!cmsDenied) whoId = body.contributorId;
      }
      if (!whoId) return json({ error: 'Could not identify your account' }, 403, headers);

      if (action === 'dismiss') {
        const ids = Array.isArray(body.requestIds) ? body.requestIds.filter(n => Number.isFinite(Number(n))).map(Number) : [];
        const filter = ids.length
          ? `id=in.(${ids.join(',')})&contributor_id=eq.${whoId}`   // scoped to them
          : `contributor_id=eq.${whoId}&decision_seen_at=is.null`;  // clear all
        await sb(`game_coverage_requests?${filter}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ decision_seen_at: new Date().toISOString() })
        });
        return json({ success: true, dismissed: ids.length || 'all' }, 200, headers);
      }

      const unseen = (await sb(
        `game_coverage_requests?contributor_id=eq.${whoId}&decision_seen_at=is.null&decided_by=eq.cms&status=in.(selected,removed)&select=*`
      )) || [];
      if (!unseen.length) return json({ success: true, alerts: [] }, 200, headers);

      const ids = [...new Set(unseen.map(r => String(r.game_id)))];
      const list = ids.map(x => `"${x.replace(/"/g, '')}"`).join(',');
      const games = (await sb(`games?game_id=in.(${encodeURIComponent(list)})&select=game_id,date,time,home_team,away_team,gender,division,is_playoff,round`)) || [];
      const byId = {}; games.forEach(g => { byId[String(g.game_id)] = g; });

      const today = new Date().toISOString().slice(0, 10);
      const alerts = unseen.map(r => {
        const g = byId[String(r.game_id)];
        if (!g) return null;
        return {
          requestId: r.id,
          gameId: r.game_id,
          decision: r.status === 'selected' ? 'selected' : 'removed',
          role: r.role,
          date: g.date,
          home: g.home_team,
          away: g.away_team,
          gender: g.gender,
          division: g.division,
          round: g.is_playoff ? (g.round || 'Playoff') : null
        };
      })
      .filter(Boolean)
      // Nobody wants to log in to notices about games that already happened.
      .filter(a => !a.date || a.date >= today)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

      return json({ success: true, alerts }, 200, headers);
    }

    /* ---- KJ picks who covers (CMS only) ---- */
    /* ---- put a removed person back in the running (CMS only) ----
       Back to 'requested', not 'selected': KJ still chooses. decided_by is
       cleared so this does NOT raise a "you were removed" alert. */
    if (action === 'restore') {
      const denied = await requireCmsKey(request, body);
      if (denied) return denied;

      const { gameId, requestId } = body;
      if (!gameId || !requestId) return json({ error: 'gameId and requestId are required' }, 400, headers);

      const game = await loadGame(gameId);
      if (!game) return json({ error: 'Game not found' }, 404, headers);

      await sb(`game_coverage_requests?id=eq.${encodeURIComponent(requestId)}&game_id=eq.${gid(gameId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'requested', decided_by: null, decided_at: null, decision_seen_at: new Date().toISOString() })
      });

      const reqs = await loadRequests(gameId);
      await syncLegacyColumns(gameId, reqs);
      return json({ success: true, ...summarize(game, reqs) }, 200, headers);
    }

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
          // 'removed' rather than back to 'requested': KJ took them off, so they
          // are out of the running and auto-assign must not put them back. The
          // row is kept so the alert has somewhere to live.
          status: action === 'select' ? 'selected' : 'removed',
          decided_at: new Date().toISOString(),
          decided_by: 'cms',
          decision_seen_at: null     // unseen -> contributor gets a banner
        })
      });

      reqs = await loadRequests(gameId);
      // Deliberately NOT reconcile() here: an explicit unselect must stick,
      // otherwise auto-assign would immediately put the person back.
      await syncLegacyColumns(gameId, reqs);

      /* Tell the person. Best effort - they also see it in the portal, so a
         mail failure must never undo a decision KJ already made. */
      let emailed = false;
      try {
        if (target.contributor_id) {
          const who = (await sb(`contributors?id=eq.${target.contributor_id}&select=name,email&limit=1`))?.[0];
          const full = (await sb(`games?game_id=eq.${gid(gameId)}&select=date,home_team,away_team,gender,division,is_playoff,round&limit=1`))?.[0];
          if (who && who.email) {
            const r = await sendEmail({
              to: who.email,
              ...coverageDecisionEmail({
                name: who.name,
                decision: action === 'select' ? 'selected' : 'removed',
                role: target.role,
                away: full?.away_team, home: full?.home_team, date: full?.date,
                gender: full?.gender, division: full?.division,
                round: full?.is_playoff ? (full.round || 'Playoff') : null
              })
            });
            emailed = r.sent;
          }
        }
      } catch (err) {
        console.error('Coverage decision email failed:', err.message);
      }

      return json({ success: true, emailed, ...summarize(game, reqs) }, 200, headers);
    }

    return json({ error: 'Invalid action. Use: status, cms-list, alerts, dismiss, request, withdraw, select, unselect, restore' }, 400, headers);

  } catch (err) {
    console.error('coverage-request error:', err);
    return json({ error: err.message || 'Server error' }, 500, headers);
  }
};
