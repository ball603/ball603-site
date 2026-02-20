// ig-publish.js - Step 2 of 2 for Instagram carousel posting
// Takes child IDs from ig-upload.js, creates the carousel container, and publishes.
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
    const { childIds, message, scheduledTime } = JSON.parse(event.body);

    if (!childIds || childIds.length < 2) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'childIds array with at least 2 items required' }) };
    }

    const API_VERSION = 'v19.0';

    // Step 1: Create carousel container
    const carouselParams = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: message || '',
      access_token: accessToken
    });

    console.log('Creating carousel container with', childIds.length, 'items...');

    const carouselResponse = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
      { method: 'POST', body: carouselParams }
    );
    const carouselData = await carouselResponse.json();

    if (carouselData.error) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: carouselData.error.message }) };
    }

    const creationId = carouselData.id;
    console.log('Carousel container created:', creationId);

    // Step 2: Brief wait for Instagram to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Publish
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });

    if (scheduledTime) {
      const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
      publishParams.append('scheduled_publish_time', unixTime);
      publishParams.append('published', 'false');
    }

    console.log('Publishing carousel...');

    const publishResponse = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${userId}/media_publish`,
      { method: 'POST', body: publishParams }
    );
    const publishData = await publishResponse.json();

    if (publishData.error) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: publishData.error.message }) };
    }

    console.log('Published successfully:', publishData.id);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, postId: publishData.id, imagesPosted: childIds.length })
    };

  } catch (error) {
    console.error('ig-publish error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
