// Ball603 — publish scheduled articles.
//
// The CMS can park an article at status = 'scheduled' with a scheduled_at
// timestamp. Nothing used to act on that: every public page queries
// status = 'published', so a scheduled article would have sat in the CMS
// forever. This job is the missing half — it flips articles to 'published'
// once their scheduled_at has passed.
//
// Runs every 5 minutes, so an article goes live within 5 minutes of its slot.
// Not reachable over HTTP (Netlify treats a function with `config.schedule` as
// scheduled-only) — use run-publish-scheduled.mjs to fire it by hand.
//
// SAFETY: every write is filtered on status=eq.scheduled as well as the id, so
// two overlapping runs can't double-publish and a story you already published
// by hand is never touched. Re-running is harmless.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SITE_URL = 'https://ball603.com';

async function supabaseFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

// When the CMS publishes a game story immediately it also stamps the coverage
// URLs onto the game row. It deliberately SKIPS that for a scheduled story —
// the game shouldn't link to a recap that isn't live yet — so this job has to
// do it at publish time instead, or the game card would never get its link.
async function linkGame(article) {
  const gameId = article.game_id;
  if (!gameId || String(gameId).startsWith('manual_')) return null;

  const gameUpdate = {
    recap_url: `${SITE_URL}/article/${article.slug}`,
    recap_link: `/article/${article.slug}`
  };
  if (article.smugmug_gallery_url) gameUpdate.photos_url = article.smugmug_gallery_url;
  if (article.youtube_url) gameUpdate.highlights_url = article.youtube_url;

  const response = await supabaseFetch(
    `games?game_id=eq.${encodeURIComponent(gameId)}`,
    { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(gameUpdate) }
  );
  if (!response.ok) {
    return `GAME ${gameId}: ${response.status} ${await response.text()}`;
  }
  return null;
}

export async function runScheduledPublish() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not configured'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const now = new Date().toISOString();

  try {
    const dueResponse = await supabaseFetch(
      'articles' +
      '?select=id,slug,title,game_id,scheduled_at,smugmug_gallery_url,youtube_url' +
      '&status=eq.scheduled' +
      `&scheduled_at=lte.${encodeURIComponent(now)}` +
      '&order=scheduled_at.asc'
    );

    if (!dueResponse.ok) {
      throw new Error(`Lookup failed: ${dueResponse.status} ${await dueResponse.text()}`);
    }

    const due = await dueResponse.json();
    if (due.length === 0) {
      console.log('No scheduled articles are due.');
      return new Response(JSON.stringify({
        success: true, checked: now, due: 0, published: [], failures: []
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`${due.length} scheduled article(s) due.`);

    const published = [];
    const failures = [];

    for (const article of due) {
      // published_at takes the SCHEDULED time, not the time this job happened to
      // run. The homepage orders on published_at, so a story that went live a few
      // minutes late still sorts where the editor intended.
      const body = {
        status: 'published',
        published_at: article.scheduled_at || now,
        updated_at: now
      };

      // status=eq.scheduled in the filter makes this a no-op if another run (or a
      // person in the CMS) already published it.
      const response = await supabaseFetch(
        `articles?id=eq.${encodeURIComponent(article.id)}&status=eq.scheduled`,
        { method: 'PATCH', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(body) }
      );

      if (!response.ok) {
        failures.push(`PUBLISH ${article.slug}: ${response.status} ${await response.text()}`);
        continue;
      }

      const rows = await response.json();
      if (rows.length === 0) {
        console.log(`  = ${article.slug} was already published elsewhere; skipped`);
        continue;
      }

      const gameFailure = await linkGame(article);
      if (gameFailure) failures.push(gameFailure);

      published.push({
        slug: article.slug,
        title: article.title,
        scheduled_at: article.scheduled_at,
        game_linked: !!(article.game_id && !String(article.game_id).startsWith('manual_')) && !gameFailure
      });
      console.log(`  + Published ${article.slug} (scheduled ${article.scheduled_at})`);
    }

    return new Response(JSON.stringify({
      success: failures.length === 0,
      checked: now,
      due: due.length,
      published,
      failures
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Scheduled publish error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export default async (request) => runScheduledPublish();

export const config = {
  // Every 5 minutes, year round. An article goes live within 5 minutes of its
  // scheduled time.
  schedule: "*/5 * * * *"
};
