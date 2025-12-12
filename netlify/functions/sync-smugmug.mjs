// Sync SmugMug albums to Supabase
// Run manually or schedule via Netlify scheduled functions
import crypto from 'crypto';

const SMUGMUG_API_KEY = process.env.SMUGMUG_API_KEY;
const SMUGMUG_API_SECRET = process.env.SMUGMUG_API_SECRET;
const SMUGMUG_ACCESS_TOKEN = process.env.SMUGMUG_ACCESS_TOKEN;
const SMUGMUG_ACCESS_SECRET = process.env.SMUGMUG_ACCESS_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

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

function generateOAuthHeader(method, url, queryParams = {}) {
  const oauthParams = {
    oauth_consumer_key: SMUGMUG_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: SMUGMUG_ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  
  const allParams = { ...oauthParams, ...queryParams };
  
  oauthParams.oauth_signature = generateSignature(
    method, 
    url, 
    allParams, 
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
  const fullUrl = `${baseUrl}${endpoint}`;
  
  const [path, queryString] = endpoint.split('?');
  const baseUrlWithPath = `${baseUrl}${path}`;
  const queryParams = {};
  
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value !== undefined) {
        queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
  }
  
  if (SMUGMUG_ACCESS_TOKEN && SMUGMUG_ACCESS_SECRET) {
    const authHeader = generateOAuthHeader('GET', baseUrlWithPath, queryParams);
    
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      }
    });
    
    return response.json();
  }
  
  const response = await fetch(`${fullUrl}${fullUrl.includes('?') ? '&' : '?'}APIKey=${SMUGMUG_API_KEY}`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  return response.json();
}

async function fetchAllAlbums() {
  let allAlbums = [];
  let start = 1;
  const pageSize = 100;
  let hasMore = true;
  
  console.log('Fetching albums from SmugMug...');
  
  while (hasMore) {
    const endpoint = `/api/v2/user/ball603!albums?count=${pageSize}&start=${start}&SortDirection=Descending&SortMethod=LastUpdated`;
    const result = await smugmugRequest(endpoint);
    
    const albums = result?.Response?.Album || [];
    if (albums.length === 0) {
      hasMore = false;
    } else {
      allAlbums = allAlbums.concat(albums);
      start += albums.length;
      console.log(`Fetched ${allAlbums.length} albums so far...`);
      
      if (albums.length < pageSize) {
        hasMore = false;
      }
    }
    
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Total albums fetched: ${allAlbums.length}`);
  return allAlbums;
}

async function fetchThumbnail(albumKey) {
  try {
    const endpoint = `/api/v2/album/${albumKey}!images?count=1&_expand=ImageSizes`;
    const result = await smugmugRequest(endpoint);
    
    const images = result?.Response?.AlbumImage || [];
    if (images.length > 0) {
      const img = images[0];
      const sizes = img.Uris?.ImageSizes?.ImageSizes || {};
      return sizes.SmallImageUrl || sizes.ThumbImageUrl || sizes.MediumImageUrl || img.ThumbnailUrl || null;
    }
  } catch (err) {
    console.warn(`Failed to fetch thumbnail for ${albumKey}:`, err.message);
  }
  return null;
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
  
  // Check for secret key to prevent unauthorized syncs
  // Scheduled functions don't have query params - check if this is a scheduled run
  const isScheduled = !event.queryStringParameters || Object.keys(event.queryStringParameters).length === 0;
  const syncKey = event.queryStringParameters?.key;
  const expectedKey = process.env.SYNC_SECRET_KEY || 'ball603-sync';
  
  // Allow scheduled runs OR manual runs with correct key
  if (!isScheduled && syncKey !== expectedKey) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized. Provide ?key=YOUR_SYNC_KEY' })
    };
  }
  
  if (!SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' })
    };
  }
  
  // Helper function to upsert to Supabase via REST API
  async function upsertToSupabase(records) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/smugmug_albums`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(records)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase upsert failed: ${response.status} ${errorText}`);
    }
    
    return response;
  }
  
  try {
    // Fetch all albums from SmugMug
    const albums = await fetchAllAlbums();
    
    // Process in batches to fetch thumbnails
    const batchSize = 10;
    const processedAlbums = [];
    
    console.log('Fetching thumbnails...');
    
    for (let i = 0; i < albums.length; i += batchSize) {
      const batch = albums.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (album) => {
          const thumbnail = await fetchThumbnail(album.AlbumKey);
          return {
            album_key: album.AlbumKey,
            name: album.Name,
            url: album.WebUri,
            image_count: album.ImageCount || 0,
            album_date: album.DateModified || album.DateAdded || album.Date,
            thumbnail_url: thumbnail,
            synced_at: new Date().toISOString()
          };
        })
      );
      
      processedAlbums.push(...batchResults);
      console.log(`Processed ${processedAlbums.length}/${albums.length} albums...`);
      
      // Small delay between batches
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Upsert to Supabase in batches
    console.log('Saving to Supabase...');
    const upsertBatchSize = 50;
    let upsertedCount = 0;
    
    for (let i = 0; i < processedAlbums.length; i += upsertBatchSize) {
      const batch = processedAlbums.slice(i, i + upsertBatchSize);
      
      await upsertToSupabase(batch);
      
      upsertedCount += batch.length;
      console.log(`Upserted ${upsertedCount}/${processedAlbums.length} to Supabase...`);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Synced ${processedAlbums.length} albums to Supabase`,
        albumCount: processedAlbums.length,
        syncedAt: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Sync failed',
        details: error.message
      })
    };
  }
};
