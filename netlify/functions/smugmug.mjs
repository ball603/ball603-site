// SmugMug API integration for browsing albums
// Uses OAuth 1.0a for authentication

import crypto from 'crypto';

const SMUGMUG_API_KEY = process.env.SMUGMUG_API_KEY;
const SMUGMUG_API_SECRET = process.env.SMUGMUG_API_SECRET;
const SMUGMUG_ACCESS_TOKEN = process.env.SMUGMUG_ACCESS_TOKEN;
const SMUGMUG_ACCESS_SECRET = process.env.SMUGMUG_ACCESS_SECRET;

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const sortedParams = Object.keys(params).sort().map(key => 
    `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
  ).join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateOAuthHeader(method, url, additionalParams = {}) {
  const oauthParams = {
    oauth_consumer_key: SMUGMUG_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: SMUGMUG_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...additionalParams
  };
  
  const signature = generateOAuthSignature(
    method, 
    url, 
    oauthParams, 
    SMUGMUG_API_SECRET, 
    SMUGMUG_ACCESS_SECRET
  );
  
  oauthParams.oauth_signature = signature;
  
  const headerParts = Object.keys(oauthParams).sort().map(key =>
    `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`
  );
  
  return `OAuth ${headerParts.join(', ')}`;
}

async function smugmugRequest(endpoint) {
  const baseUrl = 'https://api.smugmug.com';
  const url = `${baseUrl}${endpoint}`;
  
  // If we have access tokens, use OAuth
  if (SMUGMUG_ACCESS_TOKEN && SMUGMUG_ACCESS_SECRET) {
    const authHeader = generateOAuthHeader('GET', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      }
    });
    
    return response.json();
  }
  
  // Otherwise, try anonymous access (public content only)
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}APIKey=${SMUGMUG_API_KEY}`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  return response.json();
}

export default async (req, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('', { headers });
  }
  
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'albums';
    const albumKey = url.searchParams.get('albumKey');
    const search = url.searchParams.get('search');
    
    let result;
    
    if (action === 'albums') {
      // Get user's albums
      let endpoint = '/api/v2/user/ball603!albums?count=50&_expand=HighlightImage';
      if (search) {
        endpoint += `&_filter=Name&_filtervalue=${encodeURIComponent(search)}`;
      }
      result = await smugmugRequest(endpoint);
      
      // Format albums for the CMS
      const albums = result?.Response?.Album || [];
      return new Response(JSON.stringify({
        success: true,
        albums: albums.map(album => ({
          key: album.AlbumKey,
          name: album.Name,
          url: album.WebUri,
          imageCount: album.ImageCount,
          date: album.Date,
          highlightImage: album.Uris?.HighlightImage?.Image?.ThumbnailUrl || null
        }))
      }), { headers });
      
    } else if (action === 'images' && albumKey) {
      // Get images from a specific album
      const endpoint = `/api/v2/album/${albumKey}!images?count=20&_expand=ImageSizes`;
      result = await smugmugRequest(endpoint);
      
      const images = result?.Response?.AlbumImage || [];
      return new Response(JSON.stringify({
        success: true,
        images: images.map(img => ({
          key: img.ImageKey,
          filename: img.FileName,
          caption: img.Caption,
          thumbnail: img.Uris?.ImageSizes?.ImageSizes?.SmallImageUrl || img.ThumbnailUrl,
          webUrl: img.WebUri
        }))
      }), { headers });
      
    } else if (action === 'check') {
      // Check if SmugMug is configured
      const hasTokens = !!(SMUGMUG_ACCESS_TOKEN && SMUGMUG_ACCESS_SECRET);
      return new Response(JSON.stringify({
        success: true,
        configured: !!SMUGMUG_API_KEY,
        authenticated: hasTokens,
        message: hasTokens ? 'SmugMug connected' : 'SmugMug API key set, but access tokens needed for private albums'
      }), { headers });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, 
      headers 
    });
    
  } catch (error) {
    console.error('SmugMug API error:', error);
    return new Response(JSON.stringify({ 
      error: 'SmugMug API error', 
      details: error.message 
    }), { 
      status: 500, 
      headers 
    });
  }
};

export const config = {
  path: "/api/smugmug"
};
