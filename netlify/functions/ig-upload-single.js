// ig-upload-single.js - Uploads ONE Instagram carousel image and returns its container ID.
// Called once per image from the frontend. Each call takes ~2s, well under Netlify's 26s limit.

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
    const { imageUrl } = JSON.parse(event.body);

    if (!imageUrl) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'imageUrl required' }) };
    }

    const API_VERSION = 'v19.0';

    const itemParams = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: accessToken
    });

    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
      { method: 'POST', body: itemParams }
    );
    const data = await response.json();

    if (data.error) {
      console.error('IG upload error:', data.error);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: data.error.message }) };
    }

    if (!data.id) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No ID returned from Instagram' }) };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, childId: data.id })
    };

  } catch (error) {
    console.error('ig-upload-single error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
