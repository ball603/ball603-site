// SmugMug API integration for browsing albums
import crypto from 'crypto';

const SMUGMUG_API_KEY = process.env.SMUGMUG_API_KEY;
const SMUGMUG_API_SECRET = process.env.SMUGMUG_API_SECRET;
const SMUGMUG_ACCESS_TOKEN = process.env.SMUGMUG_ACCESS_TOKEN;
const SMUGMUG_ACCESS_SECRET = process.env.SMUGMUG_ACCESS_SECRET;

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams)
  ].join('&');
  
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateOAuthHeader(method, url) {
  const oauthParams = {
    oauth_consumer_key: SMUGMUG_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: SMUGMUG_ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  
  oauthParams.oauth_signature = generateSignature(
    method, 
    url, 
    oauthParams, 
    SMUGMUG_API_SECRET, 
    SMUGMUG_ACCESS_SECRET
  );
  
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`);
  
  return `OAuth ${headerParts.join(', ')}`;
}

async function smugmugRequest(endpoint) {
  const baseUrl = 'https://api.smugmug.com';
  const url = `${baseUrl}${endpoint}`;
  
  // If we have access tokens, use OAuth
  if (SMUGMUG_ACCESS_TOKEN && SMUGMUG_ACCESS_SECRET) {
    const authHeader = generateOAuthHeader('GET', url.split('?')[0]);
    
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

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    const action = event.queryStringParameters?.action || 'albums';
    const albumKey = event.queryStringParameters?.albumKey;
    const search = event.queryStringParameters?.search;
    
    if (action === 'check') {
      const hasTokens = !!(SMUGMUG_ACCESS_TOKEN && SMUGMUG_ACCESS_SECRET);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          configured: !!SMUGMUG_API_KEY,
          authenticated: hasTokens,
          message: hasTokens ? 'SmugMug connected' : 'SmugMug API key set, but access tokens needed for private albums'
        })
      };
    }
    
    if (action === 'debug') {
      // Try to get recent images to confirm API access works
      const recentEndpoint = '/api/v2/user/ball603!recentimages?count=5';
      const recentResult = await smugmugRequest(recentEndpoint);
      
      // Try to get folder contents
      const folderEndpoint = '/api/v2/folder/user/ball603';
      const folderResult = await smugmugRequest(folderEndpoint);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          recentImages: {
            endpoint: recentEndpoint,
            count: recentResult?.Response?.Image?.length || 0,
            responseKeys: recentResult?.Response ? Object.keys(recentResult.Response) : null
          },
          folder: {
            endpoint: folderEndpoint,
            name: folderResult?.Response?.Folder?.Name,
            responseKeys: folderResult?.Response ? Object.keys(folderResult.Response) : null,
            uris: folderResult?.Response?.Folder?.Uris ? Object.keys(folderResult?.Response?.Folder?.Uris) : null
          }
        })
      };
    }
    
    if (action === 'albums') {
      // Try searching for recent albums via the user's album list
      let endpoint = '/api/v2/user/ball603!albums?count=100&_expand=HighlightImage&SortDirection=Descending&SortMethod=LastUpdated&Scope=ball603';
      let result = await smugmugRequest(endpoint);
      
      let albums = result?.Response?.Album || [];
      
      // If that didn't work, try the search endpoint
      if (albums.length === 0) {
        endpoint = '/api/v2/album!search?count=100&Scope=ball603&SortDirection=Descending&SortMethod=LastUpdated&_expand=HighlightImage';
        result = await smugmugRequest(endpoint);
        albums = result?.Response?.Album || [];
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          albums: albums.map(album => ({
            key: album.AlbumKey,
            name: album.Name,
            url: album.WebUri,
            imageCount: album.ImageCount || 0,
            date: album.DateModified || album.DateAdded || album.Date,
            highlightImage: album.Uris?.HighlightImage?.Image?.ThumbnailUrl || null
          })),
          debug: {
            totalReturned: albums.length,
            endpoint: endpoint,
            rawResponse: result?.Response ? Object.keys(result.Response) : null
          }
        })
      };
      
    } else if (action === 'images' && albumKey) {
      const endpoint = `/api/v2/album/${albumKey}!images?count=20&_expand=ImageSizes`;
      const result = await smugmugRequest(endpoint);
      
      const images = result?.Response?.AlbumImage || [];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          images: images.map(img => ({
            key: img.ImageKey,
            filename: img.FileName,
            caption: img.Caption,
            thumbnail: img.Uris?.ImageSizes?.ImageSizes?.SmallImageUrl || img.ThumbnailUrl,
            webUrl: img.WebUri
          }))
        })
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    };
    
  } catch (error) {
    console.error('SmugMug API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'SmugMug API error', 
        details: error.message 
      })
    };
  }
};
