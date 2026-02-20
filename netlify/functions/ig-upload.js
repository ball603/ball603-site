// ig-upload.js - Step 1 of 2 for Instagram carousel posting
// Uploads all carousel images sequentially and returns their container IDs.
// Split from social-post.js to stay under Netlify's 26-second response limit.

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const userId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Instagram credentials not configured' }) };
  }

  try {
    const { imageUrls } = JSON.parse(event.body);

    if (!imageUrls || imageUrls.length === 0) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'imageUrls required' }) };
    }

    const API_VERSION = 'v19.0';
    const childIds = [];
    let lastError = null;

    // Upload each image sequentially with retry
    for (let index = 0; index < imageUrls.length; index++) {
      const url = imageUrls[index];
      let uploaded = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
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
          childIds.push(itemData.id);
          console.log(`Item ${index + 1}/${imageUrls.length} uploaded (attempt ${attempt})`);
          uploaded = true;
          break;
        } else {
          console.error(`Item ${index + 1} attempt ${attempt} failed:`, itemData.error);
          lastError = itemData.error?.message;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!uploaded) {
        console.error(`Failed to upload item ${index + 1} after 3 attempts`);
      }

      // Small pause between uploads to avoid rate limiting
      if (index < imageUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`Uploaded ${childIds.length}/${imageUrls.length} carousel items`);

    if (childIds.length < 2) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: lastError || 'Failed to upload enough images (need at least 2)' })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, childIds, uploaded: childIds.length, total: imageUrls.length })
    };

  } catch (error) {
    console.error('ig-upload error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
