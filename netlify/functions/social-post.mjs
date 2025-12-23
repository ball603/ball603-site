// social-post.mjs - Post to Facebook and Instagram APIs

export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await request.json();
    const { platform, message, imageUrl } = body;

    const results = {};

    // Post to Facebook
    if (platform === 'facebook' || platform === 'all') {
      const fbResult = await postToFacebook(message, imageUrl);
      results.facebook = fbResult;
    }

    // Post to Instagram
    if (platform === 'instagram' || platform === 'all') {
      const igResult = await postToInstagram(message, imageUrl);
      results.instagram = igResult;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Social post error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};

async function postToFacebook(message, imageUrl) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return { success: false, error: 'Facebook credentials not configured' };
  }

  try {
    let endpoint;
    let body;

    if (imageUrl) {
      // Post with image
      endpoint = `https://graph.facebook.com/v24.0/${pageId}/photos`;
      body = new URLSearchParams({
        url: imageUrl,
        caption: message,
        access_token: accessToken
      });
    } else {
      // Text-only post
      endpoint = `https://graph.facebook.com/v24.0/${pageId}/feed`;
      body = new URLSearchParams({
        message: message,
        access_token: accessToken
      });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: body
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id || data.post_id };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function postToInstagram(message, imageUrl) {
  const userId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  // Instagram requires an image URL for posts
  if (!imageUrl) {
    return { success: false, error: 'Instagram requires an image URL to post' };
  }

  try {
    // Step 1: Create media container
    const createMediaUrl = `https://graph.instagram.com/v24.0/${userId}/media`;
    const createResponse = await fetch(createMediaUrl, {
      method: 'POST',
      body: new URLSearchParams({
        image_url: imageUrl,
        caption: message,
        access_token: accessToken
      })
    });

    const createData = await createResponse.json();

    if (createData.error) {
      return { success: false, error: createData.error.message };
    }

    const creationId = createData.id;

    // Step 2: Publish the media container
    const publishUrl = `https://graph.instagram.com/v24.0/${userId}/media_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken
      })
    });

    const publishData = await publishResponse.json();

    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, postId: publishData.id };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const config = {
  path: "/api/social-post"
};
