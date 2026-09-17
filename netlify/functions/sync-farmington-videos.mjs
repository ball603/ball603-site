// Pull the Farmington Tigers' YouTube uploads into Supabase.
//
// Same job Ball603's youtube-sync.js does for @ball603, against the school's
// own channel. Two deliberate differences:
//
//   * The channel id is pinned rather than searched for. youtube-sync resolves
//     @ball603 through the search endpoint, which costs 100 quota units of the
//     10,000 a day and can return somebody else's channel if the handle is
//     ambiguous. The id below was read off the channel page and never changes.
//   * Only genuinely new videos are written. The pinned / hidden / sort_order
//     columns belong to whoever curates the page, and re-upserting every video
//     on every run would reset them.
//
// Not a function of its own — sync-farmington calls it, so videos refresh on
// the same schedule as games and standings with no extra cron and no
// unauthenticated URL that writes.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// youtube.com/@farmingtontigers5070
const CHANNEL_ID = 'UC35IPw60HGRyVgpIVfQsaIA';
const YT = 'https://www.googleapis.com/youtube/v3';

async function youtube(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${YT}/${path}${sep}key=${YOUTUBE_API_KEY}`);
  if (!res.ok) throw new Error(`YouTube ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Range: '0-4999',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// The largest thumbnail YouTube actually has. maxres does not exist for every
// upload, so falling back down the list avoids a page of broken images.
function bestThumbnail(thumbs) {
  for (const size of ['maxres', 'standard', 'high', 'medium', 'default']) {
    if (thumbs && thumbs[size] && thumbs[size].url) return thumbs[size].url;
  }
  return null;
}

export async function runVideoSync({ dryRun = false } = {}) {
  if (!YOUTUBE_API_KEY) {
    return { statusCode: 200, body: { success: false, skipped: true, error: 'YOUTUBE_API_KEY not configured' } };
  }
  if (!SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, body: { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' } };
  }

  const started = Date.now();
  try {
    const channel = await youtube(`channels?part=contentDetails,snippet&id=${CHANNEL_ID}`);
    const item = (channel.items || [])[0];
    if (!item) throw new Error(`Channel ${CHANNEL_ID} returned nothing`);
    const uploads = item.contentDetails.relatedPlaylists.uploads;

    // Walk the uploads playlist. 200 is well past the ~96 the channel holds, so
    // this stays one or two pages while leaving room to grow.
    const ids = [];
    let pageToken = '';
    while (ids.length < 200) {
      const page = await youtube(
        `playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=50` +
        (pageToken ? `&pageToken=${pageToken}` : ''));
      ids.push(...(page.items || []).map(i => i.contentDetails.videoId));
      pageToken = page.nextPageToken;
      if (!pageToken) break;
    }

    const existing = new Set(((await supabase('farmington_videos?select=youtube_id')) || [])
      .map(v => v.youtube_id));
    const fresh = ids.filter(id => !existing.has(id));

    const report = {
      success: true, dryRun, channel: item.snippet.title,
      onChannel: ids.length, alreadyHave: existing.size, new: fresh.length, elapsedMs: 0
    };

    if (!fresh.length) {
      report.elapsedMs = Date.now() - started;
      console.log('Farmington videos:', JSON.stringify(report));
      return { statusCode: 200, body: report };
    }

    const rows = [];
    for (let i = 0; i < fresh.length; i += 50) {
      const details = await youtube(
        `videos?part=snippet,contentDetails,statistics&id=${fresh.slice(i, i + 50).join(',')}`);
      for (const v of (details.items || [])) {
        rows.push({
          youtube_id: v.id,
          title: v.snippet.title,
          description: v.snippet.description,
          thumbnail_url: bestThumbnail(v.snippet.thumbnails),
          published_at: v.snippet.publishedAt,
          duration: v.contentDetails.duration,
          view_count: parseInt(v.statistics.viewCount || '0', 10),
          like_count: parseInt(v.statistics.likeCount || '0', 10),
          tags: v.snippet.tags || [],
          synced_at: new Date().toISOString()
          // pinned / hidden / sort_order are left to their defaults on insert
          // and never touched again — they belong to whoever curates the page.
        });
      }
    }

    if (!dryRun && rows.length) {
      for (let i = 0; i < rows.length; i += 50) {
        await supabase('farmington_videos?on_conflict=youtube_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows.slice(i, i + 50))
        });
      }
    }

    report.written = rows.length;
    report.elapsedMs = Date.now() - started;
    console.log('Farmington videos:', JSON.stringify(report));
    return { statusCode: 200, body: report };

  } catch (error) {
    console.error('Farmington video sync failed:', error);
    return { statusCode: 500, body: { error: 'Video sync failed', details: error.message } };
  }
}
