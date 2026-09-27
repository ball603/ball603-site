// social-post.js - Post to Facebook and Instagram APIs
// Supports: multi-photo posts, carousels, collaborators, page tags, scheduling
//
// SCHEDULING, AND WHY INSTAGRAM IS DIFFERENT FROM FACEBOOK.
//
// Facebook schedules server-side: send scheduled_publish_time with
// published=false and Facebook holds the post. That has always worked here.
//
// Instagram has no equivalent. The Content Publishing API takes no scheduling
// parameter at all — /media_publish goes out the moment you call it. This file
// used to pretend otherwise: `scheduledTime` was destructured, passed into
// postToInstagram(), and then never mentioned again, so a post scheduled for
// 7pm went out immediately and the CMS reported success.
//
// So an Instagram post with a scheduledTime is now QUEUED into
// scheduled_social_posts instead of published, and publish-scheduled-social.mjs
// sends it at its slot. Note what is deliberately NOT done here: the media
// container is not created at schedule time. IG containers expire after 24
// hours, so one built now would be dead before tomorrow evening's slot. Only
// the image URLs are stored; the container is built at publish time.
//
// COLLABORATORS had the same bug — destructured, passed in, never referenced.
// They are now sent to the /media container, and note the format: Instagram
// takes up to 3 *usernames*. The numeric "Instagram User ID" the CMS has been
// collecting is not accepted for this, which is why contributors.instagram_username
// exists (see sql/scheduled-social-posts.sql).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Facebook's own window for scheduled posts is 10 minutes to 6 months out. The
// same bounds are applied to the Instagram queue, not because Instagram cares,
// but because a slot years away is a typo rather than a plan.
const MIN_LEAD_MS = 10 * 60 * 1000;
const MAX_LEAD_MS = 180 * 24 * 60 * 60 * 1000;

const MAX_COLLABORATORS = 3;

// Instagram handles: letters, numbers, period, underscore, 30 characters.
// A leading @ is what a person types, so it is accepted and stripped.
function cleanCollaborators(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const handle = String(raw || '').trim().replace(/^@+/, '').toLowerCase();
    // A numeric value is an Instagram User ID, not a username. Silently
    // dropping it is right: sending it would fail the whole container.
    if (!/^[a-z0-9._]{1,30}$/.test(handle)) continue;
    if (/^\d+$/.test(handle)) continue;
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
    if (out.length === MAX_COLLABORATORS) break;
  }
  return out;
}

function parseSchedule(scheduledTime) {
  const when = new Date(scheduledTime);
  if (isNaN(when.getTime())) return { error: `Could not read "${scheduledTime}" as a date and time` };
  const lead = when.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) {
    return { error: 'Scheduled time must be at least 10 minutes from now' };
  }
  if (lead > MAX_LEAD_MS) {
    return { error: 'Scheduled time cannot be more than 6 months out' };
  }
  return { when };
}

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

async function queuePost(row) {
  const inserted = await supabase('scheduled_social_posts', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
  return Array.isArray(inserted) ? inserted[0] : inserted;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { platform, message, imageUrls, tags, collaborators, scheduledTime,
            articleId, articleTitle } = body;

    const igCollaborators = cleanCollaborators(collaborators);

    console.log('Social post request:', {
      platform,
      imageCount: imageUrls?.length,
      hasMessage: !!message,
      scheduledTime: scheduledTime || null,
      collaborators: igCollaborators
    });

    // Validate the slot once, up front, so a bad time is a 400 rather than a
    // Facebook post that goes out while Instagram refuses.
    let when = null;
    if (scheduledTime) {
      const parsed = parseSchedule(scheduledTime);
      if (parsed.error) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: parsed.error })
        };
      }
      when = parsed.when;
    }

    const results = {};

    // Post to Facebook
    if (platform === 'facebook' || platform === 'all') {
      const fbResult = await postToFacebook(message, imageUrls || [], tags || [], scheduledTime);
      results.facebook = fbResult;

      /* Facebook is holding the post itself, so this row is only a mirror —
         it is how the CMS's Scheduled Posts panel knows the post exists.
         Reading Facebook's /scheduled_posts edge instead would be guesswork:
         Meta's docs do not say whether it covers photo posts, and nearly
         every Ball 603 post has photos. Failing to record the mirror must not
         fail the response, because the post really is scheduled by then. */
      if (fbResult.success && when && fbResult.postId) {
        try {
          const row = await queuePost({
            platform: 'facebook',
            status: 'pending',
            caption: message || null,
            image_urls: imageUrls || [],
            collaborators: [],
            scheduled_for: when.toISOString(),
            article_id: articleId != null ? String(articleId) : null,
            article_title: articleTitle || null,
            fb_post_id: String(fbResult.postId),
            permalink: `https://www.facebook.com/${fbResult.postId}`
          });
          fbResult.queueId = row?.id || null;
        } catch (err) {
          console.error('FB scheduled, but recording it failed:', err);
          fbResult.note = 'Scheduled on Facebook, but it will not appear in the ' +
                          'CMS Scheduled Posts list: ' + err.message;
        }
      }
    }

    // Post to Instagram
    if (platform === 'instagram' || platform === 'all') {
      if (when) {
        // Queue it. See the header for why we hold this ourselves.
        if (!SUPABASE_SERVICE_KEY) {
          results.instagram = {
            success: false,
            error: 'Cannot schedule an Instagram post: Supabase service key not configured'
          };
        } else if (!imageUrls || imageUrls.length === 0) {
          results.instagram = { success: false, error: 'Instagram requires at least one image' };
        } else {
          try {
            const row = await queuePost({
              platform: 'instagram',
              status: 'pending',
              caption: message || null,
              image_urls: imageUrls,
              collaborators: igCollaborators,
              scheduled_for: when.toISOString(),
              article_id: articleId != null ? String(articleId) : null,
              article_title: articleTitle || null
            });
            results.instagram = {
              success: true,
              scheduled: true,
              queueId: row?.id || null,
              scheduled_for: when.toISOString(),
              imagesQueued: imageUrls.length,
              collaborators: igCollaborators
            };
          } catch (err) {
            /* Deliberately NOT falling back to posting immediately. Posting now
               when the editor asked for 7pm is the exact bug being fixed — an
               honest failure he can retry is better than a surprise post. */
            console.error('Instagram queue failed:', err);
            results.instagram = {
              success: false,
              error: 'Could not schedule the Instagram post: ' + err.message +
                     ' — nothing was posted.'
            };
          }
        }
      } else {
        const igResult = await postToInstagram(message, imageUrls || [], igCollaborators);
        results.instagram = igResult;
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, results })
    };

  } catch (error) {
    console.error('Social post error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function postToFacebook(message, imageUrls, tags, scheduledTime) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return { success: false, error: 'Facebook credentials not configured' };
  }

  const API_VERSION = 'v19.0';

  try {
    let response;
    let data;

    if (imageUrls.length === 0) {
      // Text-only post
      const params = new URLSearchParams({
        message: message || '',
        access_token: accessToken
      });
      
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        params.append('scheduled_publish_time', unixTime);
        params.append('published', 'false');
      }
      
      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${pageId}/feed`, {
        method: 'POST',
        body: params
      });
      data = await response.json();
      
    } else if (imageUrls.length === 1) {
      // Single photo post
      const photoParams = new URLSearchParams({
        url: imageUrls[0],
        access_token: accessToken
      });
      if (message) {
        photoParams.append('caption', message);
      }
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        photoParams.append('scheduled_publish_time', unixTime);
        photoParams.append('published', 'false');
      }
      
      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${pageId}/photos`, {
        method: 'POST',
        body: photoParams
      });
      data = await response.json();
      
    } else {
      // Multi-photo post - upload in parallel for speed
      console.log('Uploading', imageUrls.length, 'photos to Facebook in parallel...');
      
      const uploadPromises = imageUrls.map(async (url) => {
        const photoParams = new URLSearchParams({
          url: url,
          published: 'false',
          access_token: accessToken
        });
        
        const photoResponse = await fetch(
          `https://graph.facebook.com/${API_VERSION}/${pageId}/photos`,
          { method: 'POST', body: photoParams }
        );
        return photoResponse.json();
      });
      
      const photoResults = await Promise.all(uploadPromises);
      const photoIds = [];
      let lastError = null;
      
      for (const photoData of photoResults) {
        if (photoData.error) {
          console.error('Photo upload error:', photoData.error);
          lastError = photoData.error.message;
        } else if (photoData.id) {
          photoIds.push(photoData.id);
        }
      }
      
      if (photoIds.length === 0) {
        return { success: false, error: lastError || 'Failed to upload any photos to Facebook' };
      }
      
      console.log('Uploaded photo IDs:', photoIds);
      
      // Step 2: Create post with attached media
      const postParams = new URLSearchParams({
        access_token: accessToken
      });
      
      if (message) postParams.append('message', message);
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        postParams.append('scheduled_publish_time', unixTime);
        postParams.append('published', 'false');
      }
      
      // Add attached_media - each as separate parameter
      photoIds.forEach((id, i) => {
        postParams.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
      });
      
      console.log('Creating FB post with attached media...');
      
      response = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${pageId}/feed`,
        { method: 'POST', body: postParams }
      );
      data = await response.json();
    }

    console.log('FB final response:', JSON.stringify(data));

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id || data.post_id };

  } catch (error) {
    console.error('Facebook error:', error);
    return { success: false, error: error.message };
  }
}

// NOTE: publish-scheduled-social.mjs has its own copy of the create-then-publish
// sequence rather than importing this one. The two look alike but their retry
// rules differ in a way that matters: this one is a single interactive attempt,
// while the scheduled worker records the container id to the database and
// re-checks an existing container's status_code before publishing, so a
// function timeout cannot post the same photo set twice. Keep them in step.
async function postToInstagram(message, imageUrls, collaborators) {
  const userId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  if (!imageUrls || imageUrls.length === 0) {
    return { success: false, error: 'Instagram requires at least one image' };
  }

  const API_VERSION = 'v19.0';
  const collabs = Array.isArray(collaborators) ? collaborators : [];

  // Set once if the post had to go out without its collaborator tags, so the
  // CMS can say so instead of implying they were invited.
  let collaboratorsDropped = null;

  const createMedia = async (params) => {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
      { method: 'POST', body: params }
    );
    return res.json();
  };

  /* One rejected handle — a private account, a typo, someone who has
     collaborator invites switched off — fails the whole container, which would
     mean no post at all. A container is not a post, so retrying without the
     tags is free and cannot double-publish. Better to get the photos up and
     report the lost tag than to lose the post over it. */
  const createMediaAllowingCollabLoss = async (buildParams) => {
    const first = await createMedia(buildParams(true));
    if (!first.error || collabs.length === 0) return first;

    console.warn('IG container failed with collaborators, retrying without:', first.error.message);
    const retry = await createMedia(buildParams(false));
    if (!retry.error) {
      collaboratorsDropped = { handles: collabs.slice(), reason: first.error.message };
    }
    return retry;
  };

  try {
    let creationId;
    let childIds = [];

    if (imageUrls.length === 1) {
      // Single image post
      const buildParams = (withCollabs) => {
        const params = new URLSearchParams({
          image_url: imageUrls[0],
          caption: message || '',
          access_token: accessToken
        });
        // Up to 3 usernames, JSON-encoded. Usernames, NOT numeric user IDs.
        if (withCollabs && collabs.length) {
          params.append('collaborators', JSON.stringify(collabs));
        }
        return params;
      };

      console.log('Creating single IG media...', collabs.length ? `collaborators: ${collabs.join(', ')}` : '');

      const createData = await createMediaAllowingCollabLoss(buildParams);
      console.log('IG create response:', JSON.stringify(createData));

      if (createData.error) {
        return { success: false, error: createData.error.message };
      }

      creationId = createData.id;

    } else {
      // Carousel post - parallel uploads for speed
      console.log('Creating', imageUrls.length, 'Instagram carousel items (parallel)...');

      const uploadResults = await Promise.all(imageUrls.map(async (url, index) => {
        const itemParams = new URLSearchParams({
          image_url: url,
          is_carousel_item: 'true',
          access_token: accessToken
        });
        const itemResponse = await fetch(
          `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
          { method: 'POST', body: itemParams }
        );
        const itemData = await itemResponse.json();
        if (itemData.id) {
          console.log(`Carousel item ${index + 1}/${imageUrls.length} uploaded`);
          return itemData.id;
        } else {
          console.error(`Carousel item ${index + 1} failed:`, itemData.error);
          return null;
        }
      }));

      childIds = uploadResults.filter(id => id !== null);
      console.log(`Successfully created ${childIds.length}/${imageUrls.length} carousel items`, childIds);

      // Step 2: Create carousel container.
      // Collaborators belong on the parent container, never on the children.
      const buildCarouselParams = (withCollabs) => {
        const params = new URLSearchParams({
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption: message || '',
          access_token: accessToken
        });
        if (withCollabs && collabs.length) {
          params.append('collaborators', JSON.stringify(collabs));
        }
        return params;
      };

      console.log('Creating IG carousel container...', collabs.length ? `collaborators: ${collabs.join(', ')}` : '');

      const carouselData = await createMediaAllowingCollabLoss(buildCarouselParams);
      console.log('IG carousel response:', JSON.stringify(carouselData));
      
      if (carouselData.error) {
        return { success: false, error: carouselData.error.message };
      }
      
      creationId = carouselData.id;
    }
    
    // Step 3: Publish the media with retry (no fixed delay - only wait if Instagram says not ready)
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });
    
    console.log('Publishing IG media:', creationId);
    
    let publishData;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const publishResponse = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${userId}/media_publish`,
        { method: 'POST', body: publishParams }
      );
      publishData = await publishResponse.json();
      console.log(`IG publish attempt ${attempt}:`, JSON.stringify(publishData));
      
      // If media not ready, wait and retry
      if (publishData.error && (publishData.error.code === 9007 || publishData.error.code === 2207026)) {
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      break;
    }
    
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }
    
    const result = {
      success: true,
      postId: publishData.id,
      imagesPosted: creationId ? (imageUrls.length === 1 ? 1 : childIds.length) : 0
    };

    if (collaboratorsDropped) {
      // Say it plainly. The post is up; the tags are not.
      result.collaboratorsDropped = collaboratorsDropped.handles;
      result.note = `Posted, but Instagram refused the collaborator tag${
        collaboratorsDropped.handles.length > 1 ? 's' : ''} (${
        collaboratorsDropped.handles.map(h => '@' + h).join(', ')}): ${
        collaboratorsDropped.reason}`;
    } else if (collabs.length) {
      result.collaboratorsInvited = collabs.slice();
    }

    return result;

  } catch (error) {
    console.error('Instagram error:', error);
    return { success: false, error: error.message };
  }
}
