// Ball 603 — publish scheduled Instagram posts, and keep the Facebook mirror honest.
//
// WHY THIS EXISTS. Instagram's Content Publishing API has no scheduling
// parameter — /media_publish posts the moment it is called. social-post.js used
// to accept a scheduledTime for Instagram, ignore it, post immediately and
// report success. So scheduling has to happen on our side: social-post.js
// queues a row in scheduled_social_posts, and this job sends it at its slot.
//
// Runs every 5 minutes, so a post goes out within 5 minutes of its time. Not
// reachable over HTTP (Netlify treats a function with config.schedule as
// scheduled-only) — use run-publish-scheduled-social.mjs to fire it by hand.
//
// THE THING THIS FILE IS REALLY ABOUT: never posting the same photos twice.
// Instagram publishing is two calls — create a container, then publish it — and
// a function that dies between the publish call and the database write leaves a
// row that still says "pending" for a post that is already live. Three
// defences, in order:
//
//   1. A run CLAIMS a row by PATCHing it with status=eq.pending in the filter.
//      PostgREST returns the updated rows, so an empty result means another run
//      claimed it first. Same trick as publish-scheduled-articles.mjs.
//   2. The container id is written to the database BEFORE /media_publish is
//      called. A later attempt therefore knows a container exists.
//   3. Before publishing a container it already knows about, a run asks
//      Instagram for its status_code. PUBLISHED means the previous attempt
//      actually worked, so the row is closed out instead of posted again.
//
// Containers are built here, at publish time, and never at schedule time: an IG
// container expires after 24 hours, so one created when the post was queued
// would be dead before an evening slot the next day.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const IG_USER_ID = process.env.INSTAGRAM_USER_ID;
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const FB_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const API_VERSION = 'v19.0';
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

// At most this many Instagram posts per run. A backlog drains over successive
// runs rather than risking the function's time limit in one go.
const BATCH = 5;

// Give up after this many tries and say so, instead of retrying a permanently
// broken post every 5 minutes forever.
const MAX_ATTEMPTS = 3;

// A row left in 'publishing' longer than this was stranded by a crash or a
// timeout, not still working. It goes back in the queue, where defence 3 above
// stops it double-posting.
const STALE_CLAIM_MS = 10 * 60 * 1000;

// A post this far past its slot is stale news — a Tuesday recap should not
// appear on Wednesday afternoon because the cron was down. It is marked failed
// with the reason, so it can be sent by hand if it is still wanted. Raise this
// if you would rather have late posts than skipped ones.
const TOO_LATE_MS = 12 * 60 * 60 * 1000;

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function patchRow(id, body, extraFilter = '') {
  return supabase(`scheduled_social_posts?id=eq.${encodeURIComponent(id)}${extraFilter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() })
  });
}

const asArray = (v) => (Array.isArray(v) ? v : []);

// ---------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------

async function graphPost(path, params) {
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body: params });
  return res.json();
}

async function containerStatus(containerId) {
  const res = await fetch(
    `${GRAPH}/${encodeURIComponent(containerId)}` +
    `?fields=status_code,status&access_token=${encodeURIComponent(IG_TOKEN)}`
  );
  return res.json();
}

/* user_tags needs a position per handle — x and y are required for images, as
   a 0..1 fraction. Tags are invisible until the photo is tapped, so placement
   only has to stop them stacking: spread across the lower third, which on a
   game photo is usually floor or grass rather than a face. Mirrors
   buildUserTags() in social-post.js. */
function buildUserTags(handles) {
  const n = handles.length;
  return handles.map((username, i) => ({
    username,
    x: Number(((i + 1) / (n + 1)).toFixed(2)),
    y: 0.85
  }));
}

// Build the container for a queued post and return its id.
//
// Mirrors postToInstagram() in social-post.js, including the deliberate retries
// without the optional extras — one private or mistyped handle otherwise fails
// the container and the post is lost entirely. A container is not a post, so
// retrying it cannot double-publish.
//
// WHICH EXTRA IS GIVEN UP FIRST: the photo tags. A school's handle is
// replaceable and fixable in the tag grid; the collaborator slot carries the
// photographer's co-author credit on their own work.
async function buildContainer(post) {
  const imageUrls = asArray(post.image_urls);
  const collabs = asArray(post.collaborators);
  const photoTags = asArray(post.photo_tags);
  if (imageUrls.length === 0) throw new Error('No image URLs on the queued post');

  let droppedCollaborators = null;
  let droppedPhotoTags = null;

  const media = (params) => graphPost(`${IG_USER_ID}/media`, params);

  if (imageUrls.length === 1) {
    // Single image: both extras ride on the same container, so the fallback is
    // staged — tags first, then collaborators.
    const build = ({ withCollabs, withTags }) => {
      const p = new URLSearchParams({
        image_url: imageUrls[0],
        caption: post.caption || '',
        access_token: IG_TOKEN
      });
      // Up to 3 Instagram USERNAMES. Numeric user IDs are not accepted here.
      if (withCollabs && collabs.length) p.append('collaborators', JSON.stringify(collabs));
      if (withTags && photoTags.length) p.append('user_tags', JSON.stringify(buildUserTags(photoTags)));
      return p;
    };

    let data = await media(build({ withCollabs: true, withTags: true }));

    if (data.error && photoTags.length) {
      const reason = data.error.message;
      console.warn(`  photo tags refused (${reason}); retrying without`);
      const retry = await media(build({ withCollabs: true, withTags: false }));
      if (!retry.error) droppedPhotoTags = photoTags.slice();
      data = retry;
    }

    if (data.error && collabs.length) {
      const reason = data.error.message;
      console.warn(`  collaborators refused too (${reason}); retrying without both`);
      const retry = await media(build({ withCollabs: false, withTags: false }));
      if (!retry.error) {
        droppedCollaborators = collabs.slice();
        if (photoTags.length && !droppedPhotoTags) droppedPhotoTags = photoTags.slice();
      }
      data = retry;
    }

    if (data.error) throw new Error(`Container: ${data.error.message}`);
    return { containerId: data.id, children: 1, droppedCollaborators, droppedPhotoTags };
  }

  /* Carousel: children first, then the parent container. Photo tags go on the
     COVER child rather than the parent — Instagram positions a tag on one
     picture, so user_tags on a carousel parent would go nowhere. Collaborators
     are the opposite: parent only. */
  const children = await Promise.all(imageUrls.map(async (url, i) => {
    const buildItem = (withTags) => {
      const p = new URLSearchParams({
        image_url: url,
        is_carousel_item: 'true',
        access_token: IG_TOKEN
      });
      if (withTags && i === 0 && photoTags.length) {
        p.append('user_tags', JSON.stringify(buildUserTags(photoTags)));
      }
      return p;
    };

    let data = await media(buildItem(true));

    if (data.error && i === 0 && photoTags.length) {
      const reason = data.error.message;
      console.warn(`  cover photo tags refused (${reason}); retrying without`);
      data = await media(buildItem(false));
      if (!data.error) droppedPhotoTags = photoTags.slice();
    }

    if (!data.id) {
      console.error(`  carousel item ${i + 1} failed:`, data.error?.message);
      return null;
    }
    return data.id;
  }));

  const childIds = children.filter(Boolean);
  if (childIds.length === 0) throw new Error('Every carousel item failed to upload');

  const build = (withCollabs) => {
    const p = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: post.caption || '',
      access_token: IG_TOKEN
    });
    // Collaborators go on the parent container, never on the children.
    if (withCollabs && collabs.length) p.append('collaborators', JSON.stringify(collabs));
    return p;
  };

  let data = await media(build(true));
  if (data.error && collabs.length) {
    console.warn(`  collaborators refused (${data.error.message}); retrying without`);
    const retry = await media(build(false));
    if (!retry.error) droppedCollaborators = collabs.slice();
    data = retry;
  }

  if (data.error) throw new Error(`Carousel container: ${data.error.message}`);
  return { containerId: data.id, children: childIds.length, droppedCollaborators, droppedPhotoTags };
}

// Best effort: the panel's "View post" link. A post with no permalink is still
// a published post, so a failure here is logged and ignored.
async function fetchPermalink(mediaId) {
  try {
    const res = await fetch(
      `${GRAPH}/${encodeURIComponent(mediaId)}` +
      `?fields=permalink&access_token=${encodeURIComponent(IG_TOKEN)}`
    );
    const data = await res.json();
    return data.permalink || null;
  } catch (err) {
    console.warn(`  permalink lookup failed for ${mediaId}: ${err.message}`);
    return null;
  }
}

async function publishContainer(containerId) {
  const params = new URLSearchParams({ creation_id: containerId, access_token: IG_TOKEN });

  let data;
  for (let attempt = 1; attempt <= 5; attempt++) {
    data = await graphPost(`${IG_USER_ID}/media_publish`, params);
    // 9007 / 2207026 both mean "media not ready yet" — wait and try again.
    if (data.error && (data.error.code === 9007 || data.error.code === 2207026)) {
      if (attempt < 5) await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    break;
  }

  if (data.error) throw new Error(`Publish: ${data.error.message}`);
  return data.id;
}

async function sendOne(post) {
  const now = new Date();
  const lateBy = now.getTime() - new Date(post.scheduled_for).getTime();

  // Claim it. status=eq.pending in the filter means exactly one run can win;
  // an empty result means another already has it.
  const claimed = await patchRow(post.id, {
    status: 'publishing',
    claimed_at: now.toISOString(),
    attempts: (post.attempts || 0) + 1
  }, '&status=eq.pending');

  if (!claimed || claimed.length === 0) {
    console.log(`  = #${post.id} claimed by another run; skipped`);
    return { skipped: true };
  }
  const row = claimed[0];

  if (lateBy > TOO_LATE_MS) {
    const hours = Math.round(lateBy / 3600000);
    const why = `Not posted: this was ${hours} hours past its scheduled time when the ` +
                `queue reached it, so it was treated as stale rather than posted late. ` +
                `Send it by hand if it is still wanted.`;
    await patchRow(post.id, { status: 'failed', last_error: why });
    console.warn(`  ! #${post.id} too late (${hours}h); marked failed`);
    return { failed: true, id: post.id, error: why };
  }

  try {
    let containerId = row.ig_container_id;
    let dropped = null;

    /* A container we already know about means a previous attempt got at least
       this far. Ask Instagram what happened to it before touching it — this is
       the check that stops a timed-out run from posting the same photos twice. */
    if (containerId) {
      const status = await containerStatus(containerId);
      const code = status.status_code;
      console.log(`  #${post.id} existing container ${containerId}: ${code || status.error?.message}`);

      if (code === 'PUBLISHED') {
        // It went out last time and the database never heard. Close it out.
        await patchRow(post.id, {
          status: 'published',
          published_at: row.published_at || now.toISOString(),
          last_error: null
        });
        console.log(`  + #${post.id} was already published; recorded`);
        return { published: true, id: post.id, recovered: true };
      }

      if (code === 'IN_PROGRESS') {
        // Instagram is still processing. Put it back and let the next run look.
        await patchRow(post.id, { status: 'pending', claimed_at: null });
        return { deferred: true, id: post.id };
      }

      if (code === 'EXPIRED' || code === 'ERROR' || status.error) {
        // Unusable. Build a fresh one.
        console.log(`  #${post.id} container unusable; rebuilding`);
        containerId = null;
      }
    }

    if (!containerId) {
      const built = await buildContainer(row);
      containerId = built.containerId;
      dropped = {
        collaborators: built.droppedCollaborators,
        photoTags: built.droppedPhotoTags
      };
      // Written BEFORE publishing, on purpose — see defence 2 in the header.
      await patchRow(post.id, { ig_container_id: containerId });
    }

    const mediaId = await publishContainer(containerId);
    const permalink = await fetchPermalink(mediaId);

    // published_at is the real moment it went out, not the slot it was aimed
    // at. scheduled_for already records the intention.
    /* Anything Instagram refused is recorded against the row even though the
       post succeeded, so the panel can show it rather than implying every tag
       landed. last_error is the field the panel already surfaces; on a
       published row it renders as a warning rather than a failure. */
    const lost = [];
    if (dropped?.collaborators?.length) {
      lost.push(`the collaborator invite${dropped.collaborators.length > 1 ? 's' : ''} (${
        dropped.collaborators.map(h => '@' + h).join(', ')})`);
    }
    if (dropped?.photoTags?.length) {
      lost.push(`the photo tag${dropped.photoTags.length > 1 ? 's' : ''} (${
        dropped.photoTags.map(h => '@' + h).join(', ')})`);
    }

    await patchRow(post.id, {
      status: 'published',
      ig_media_id: mediaId,
      permalink,
      published_at: new Date().toISOString(),
      last_error: lost.length ? `Posted, but Instagram refused ${lost.join(' and ')}.` : null
    });

    console.log(`  + #${post.id} published as ${mediaId}`);
    return {
      published: true,
      id: post.id,
      mediaId,
      collaboratorsDropped: dropped?.collaborators || undefined,
      photoTagsDropped: dropped?.photoTags || undefined
    };

  } catch (err) {
    const attempts = (post.attempts || 0) + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    await patchRow(post.id, {
      status: giveUp ? 'failed' : 'pending',
      claimed_at: null,
      last_error: err.message.slice(0, 500)
    });
    console.error(`  ! #${post.id} attempt ${attempts}${giveUp ? ' (giving up)' : ''}: ${err.message}`);
    return { failed: giveUp, retrying: !giveUp, id: post.id, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Facebook mirror
//
// Facebook holds its own scheduled posts, so those rows are only a record that
// the post exists. This walks the ones whose time has passed and asks Facebook
// what became of them, so the CMS panel does not show a post as "scheduled"
// forever after it has gone live — or after it was deleted in Business Suite.
// ---------------------------------------------------------------------------

async function reconcileFacebook() {
  if (!FB_TOKEN) return { checked: 0, note: 'No Facebook token; skipped' };

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const due = await supabase(
    'scheduled_social_posts' +
    '?select=id,fb_post_id,scheduled_for' +
    '&platform=eq.facebook&status=eq.pending' +
    `&scheduled_for=lte.${encodeURIComponent(cutoff)}` +
    '&fb_post_id=not.is.null&limit=25'
  );

  let published = 0, gone = 0;
  for (const row of due || []) {
    try {
      const res = await fetch(
        `${GRAPH}/${encodeURIComponent(row.fb_post_id)}` +
        `?fields=is_published,scheduled_publish_time&access_token=${encodeURIComponent(FB_TOKEN)}`
      );
      const data = await res.json();

      if (data.error) {
        // Code 100 with a missing node means it is no longer there — deleted in
        // Business Suite, most likely. Anything else is left alone rather than
        // guessed at; a token problem should not mark real posts canceled.
        if (res.status === 404 || data.error.code === 100) {
          await patchRow(row.id, { status: 'canceled', last_error: 'No longer on Facebook (deleted there?)' }, '&status=eq.pending');
          gone++;
        }
        continue;
      }

      if (data.is_published === true) {
        await patchRow(row.id, {
          status: 'published',
          published_at: row.scheduled_for
        }, '&status=eq.pending');
        published++;
      }
    } catch (err) {
      console.error(`  FB reconcile ${row.fb_post_id}: ${err.message}`);
    }
  }
  return { checked: (due || []).length, published, gone };
}

// ---------------------------------------------------------------------------

export async function runScheduledSocial() {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' }
  });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return json({ success: false, error: 'SUPABASE_URL / service key not configured' }, 500);
  }

  const now = new Date();

  try {
    /* Recover anything stranded in 'publishing' by a crash or a timeout. Safe
       to do blindly: sendOne() re-checks the container's real status before it
       publishes, so a row that did go out is recorded rather than resent. */
    const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS).toISOString();
    const recovered = await supabase(
      'scheduled_social_posts' +
      '?status=eq.publishing' +
      `&claimed_at=lt.${encodeURIComponent(staleBefore)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'pending', updated_at: now.toISOString() })
      }
    );
    if (recovered?.length) {
      console.log(`Recovered ${recovered.length} stranded row(s) back to pending`);
    }

    const fb = await reconcileFacebook();

    if (!IG_USER_ID || !IG_TOKEN) {
      return json({
        success: false,
        error: 'Instagram credentials not configured',
        facebook: fb
      }, 500);
    }

    const due = await supabase(
      'scheduled_social_posts' +
      '?select=*' +
      '&platform=eq.instagram&status=eq.pending' +
      `&scheduled_for=lte.${encodeURIComponent(now.toISOString())}` +
      `&order=scheduled_for.asc&limit=${BATCH}`
    );

    if (!due || due.length === 0) {
      return json({
        success: true, checked: now.toISOString(), due: 0,
        published: [], failures: [],
        recovered: recovered?.length || 0,
        facebook: fb
      });
    }

    console.log(`${due.length} scheduled Instagram post(s) due.`);

    const published = [];
    const failures = [];
    const deferred = [];

    for (const post of due) {
      const outcome = await sendOne(post);
      if (outcome.published) published.push(outcome);
      else if (outcome.failed) failures.push(outcome);
      else if (outcome.deferred || outcome.retrying) deferred.push(outcome);
    }

    return json({
      success: failures.length === 0,
      checked: now.toISOString(),
      due: due.length,
      published,
      failures,
      deferred,
      recovered: recovered?.length || 0,
      facebook: fb
    });

  } catch (error) {
    console.error('Scheduled social error:', error);
    return json({ success: false, error: error.message }, 500);
  }
}

export default async (request) => runScheduledSocial();

export const config = {
  // Every 5 minutes. A post goes out within 5 minutes of its scheduled time.
  schedule: "*/5 * * * *"
};
