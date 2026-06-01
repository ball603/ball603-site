// Ball603 Reconcile Relink
// POST body: { articleId, expectedCurrentGameId, newGameId | null }
// 
// Safely updates a single article's game_id, with the following guards:
//   1. Article must exist
//   2. Article's CURRENT game_id must match expectedCurrentGameId (no race conditions / no
//      overwriting a fix that was already applied)
//   3. If newGameId is non-null, it must exist in games.game_id (no creating new orphans)
//   4. NULL is a valid target (orphans with no good match — article stays, just unlinks)
//
// Returns { success, before, after } on success, { error } on failure.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const HEADERS = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { articleId, expectedCurrentGameId, newGameId } = body;

  if (!articleId || expectedCurrentGameId === undefined) {
    return new Response(JSON.stringify({ error: 'Missing articleId or expectedCurrentGameId' }), { status: 400 });
  }

  try {
    // 1. Fetch the article and verify its CURRENT game_id matches what the UI thinks it is
    const articleResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&select=id,title,game_id`,
      { headers: HEADERS }
    );
    if (!articleResp.ok) {
      const t = await articleResp.text();
      return new Response(JSON.stringify({ error: `Article lookup failed: ${articleResp.status} ${t}` }), { status: 500 });
    }
    const articleRows = await articleResp.json();
    if (articleRows.length === 0) {
      return new Response(JSON.stringify({ error: `Article ${articleId} not found` }), { status: 404 });
    }
    const article = articleRows[0];

    if (article.game_id !== expectedCurrentGameId) {
      return new Response(JSON.stringify({
        error: 'Article game_id has changed since audit. Refresh and try again.',
        currentGameId: article.game_id,
        expectedCurrentGameId,
      }), { status: 409 });
    }

    // 2. If newGameId is non-null, verify it exists in games
    if (newGameId !== null && newGameId !== undefined && newGameId !== '') {
      const gameResp = await fetch(
        `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(newGameId)}&select=game_id,date,home_team,away_team,gender`,
        { headers: HEADERS }
      );
      if (!gameResp.ok) {
        const t = await gameResp.text();
        return new Response(JSON.stringify({ error: `Target game lookup failed: ${gameResp.status} ${t}` }), { status: 500 });
      }
      const gameRows = await gameResp.json();
      if (gameRows.length === 0) {
        return new Response(JSON.stringify({
          error: `Target game_id "${newGameId}" does not exist in games table. Cannot link to a non-existent game.`,
        }), { status: 400 });
      }
    }

    // 3. Apply the UPDATE
    const targetValue = (newGameId === null || newGameId === undefined || newGameId === '') ? null : newGameId;
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}`,
      {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify({ game_id: targetValue }),
      }
    );
    if (!updateResp.ok) {
      const t = await updateResp.text();
      return new Response(JSON.stringify({ error: `Update failed: ${updateResp.status} ${t}` }), { status: 500 });
    }
    const updated = await updateResp.json();
    const after = updated[0] || null;

    return new Response(JSON.stringify({
      success: true,
      before: { id: article.id, title: article.title, game_id: article.game_id },
      after: { id: after?.id, title: after?.title, game_id: after?.game_id },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Relink error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = {
  path: '/.netlify/functions/reconcile-relink'
};
