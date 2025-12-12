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

function generateOAuthHeader(method, url, queryParams = {}) {
  const oauthParams = {
    oauth_consumer_key: SMUGMUG_API_KEY,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_token: SMUGMUG_ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  
  // Combine OAuth params with query params for signature
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
  
  // Parse query parameters from endpoint
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
  
  // If we have access tokens, use OAuth
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
  
  // Otherwise, try anonymous access (public content only)
  const response = await fetch(`${fullUrl}${fullUrl.includes('?') ? '&' : '?'}APIKey=${SMUGMUG_API_KEY}`, {
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
      
      // Try to get folder albums directly
      const albumsEndpoint = '/api/v2/folder/user/ball603!albums?count=10';
      const albumsResult = await smugmugRequest(albumsEndpoint);
      
      // Try FolderAlbums with different path
      const folderAlbumsEndpoint = '/api/v2/folder/user/ball603!albumlist?count=10';
      const folderAlbumsResult = await smugmugRequest(folderAlbumsEndpoint);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          recentImages: {
            endpoint: recentEndpoint,
            count: recentResult?.Response?.Image?.length || 0,
            responseKeys: recentResult?.Response ? Object.keys(recentResult.Response) : null,
            code: recentResult?.Code,
            message: recentResult?.Message
          },
          albums: {
            endpoint: albumsEndpoint,
            count: albumsResult?.Response?.Album?.length || 0,
            responseKeys: albumsResult?.Response ? Object.keys(albumsResult.Response) : null,
            code: albumsResult?.Code,
            message: albumsResult?.Message
          },
          albumList: {
            endpoint: folderAlbumsEndpoint,
            count: folderAlbumsResult?.Response?.Album?.length || folderAlbumsResult?.Response?.AlbumList?.length || 0,
            responseKeys: folderAlbumsResult?.Response ? Object.keys(folderAlbumsResult.Response) : null,
            code: folderAlbumsResult?.Code,
            message: folderAlbumsResult?.Message
          }
        })
      };
    }
    
    if (action === 'albums') {
      // SmugMug limits to 100 per request, so we need to paginate
      // Also, HighlightImage expansion doesn't include the actual image URL directly
      // We need to request AlbumHighlightImage instead or fetch images separately
      
      let allAlbums = [];
      let start = 1;
      const pageSize = 100;
      let hasMore = true;
      
      // Fetch up to 500 albums (5 pages)
      while (hasMore && allAlbums.length < 500) {
        const endpoint = `/api/v2/user/ball603!albums?count=${pageSize}&start=${start}&SortDirection=Descending&SortMethod=LastUpdated`;
        const result = await smugmugRequest(endpoint);
        
        const albums = result?.Response?.Album || [];
        if (albums.length === 0) {
          hasMore = false;
        } else {
          allAlbums = allAlbums.concat(albums);
          start += albums.length;
          
          // Check if we got fewer than requested (means we're at the end)
          if (albums.length < pageSize) {
            hasMore = false;
          }
        }
      }
      
      // For thumbnails, we'll construct them from the album URL
      // SmugMug albums have a predictable thumbnail URL pattern
      // Or we can use the first image endpoint
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          albums: allAlbums.map(album => {
            // Try to get thumbnail from various sources
            let thumbUrl = null;
            
            // Method 1: Check if there's a direct thumbnail URL
            if (album.Uris?.AlbumHighlightImage?.Uri) {
              // We'd need to fetch this, but for now skip
            }
            
            // Method 2: Construct URL from album key (SmugMug pattern)
            // This requires fetching the first image - we'll do that client-side
            
            return {
              key: album.AlbumKey,
              name: album.Name,
              url: album.WebUri,
              imageCount: album.ImageCount || 0,
              date: album.DateModified || album.DateAdded || album.Date,
              highlightImage: thumbUrl,
              // Include the album images endpoint so client can fetch first image
              imagesUri: album.Uris?.AlbumImages?.Uri || null
            };
          }),
          debug: {
            totalReturned: allAlbums.length,
            pagesLoaded: Math.ceil(allAlbums.length / pageSize)
          }
        })
      };
    } else if (action === 'albumThumb' && albumKey) {
      // New action to fetch a single album's first image for thumbnail
      const endpoint = `/api/v2/album/${albumKey}!images?count=1&_expand=ImageSizes`;
      const result = await smugmugRequest(endpoint);
      
      const images = result?.Response?.AlbumImage || [];
      let thumbUrl = null;
      
      if (images.length > 0) {
        const img = images[0];
        const sizes = img.Uris?.ImageSizes?.ImageSizes || {};
        thumbUrl = sizes.SmallImageUrl || sizes.ThumbImageUrl || sizes.MediumImageUrl || img.ThumbnailUrl;
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          albumKey: albumKey,
          thumbnailUrl: thumbUrl
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
            medium: img.Uris?.ImageSizes?.ImageSizes?.MediumImageUrl || img.Uris?.ImageSizes?.ImageSizes?.SmallImageUrl,
            large: img.Uris?.ImageSizes?.ImageSizes?.LargeImageUrl || img.Uris?.ImageSizes?.ImageSizes?.MediumImageUrl,
            webUrl: img.WebUri
          }))
        })
      };
    } else if (action === 'galleryImages') {
      // Fetch images by gallery URL path (e.g., "Epping-Boys-at-Farmington-12-9-25-Michael-Griffin")
      const galleryPath = event.queryStringParameters?.path;
      const debug = event.queryStringParameters?.debug === 'true';
      
      if (!galleryPath) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Gallery path required' })
        };
      }
      
      // First, get the album info by URL path
      const albumEndpoint = `/api/v2/album/ball603-${galleryPath}?_expand=HighlightImage`;
      let albumResult = await smugmugRequest(albumEndpoint);
      
      // If that doesn't work, try looking up via user albums
      let albumKey = albumResult?.Response?.Album?.AlbumKey;
      
      if (!albumKey) {
        // Try searching for the album by name
        const searchEndpoint = `/api/v2/user/ball603!albums?count=200&_expand=HighlightImage`;
        const searchResult = await smugmugRequest(searchEndpoint);
        const albums = searchResult?.Response?.Album || [];
        
        // Find album where URL contains the path
        const matchingAlbum = albums.find(a => a.WebUri && a.WebUri.includes(galleryPath));
        albumKey = matchingAlbum?.AlbumKey;
      }
      
      if (!albumKey) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Gallery not found', path: galleryPath })
        };
      }
      
      // Now fetch images for this album
      const imagesEndpoint = `/api/v2/album/${albumKey}!images?count=500&_expand=ImageSizes`;
      const imagesResult = await smugmugRequest(imagesEndpoint);
      
      const images = imagesResult?.Response?.AlbumImage || [];
      
      // If debug mode, return raw size info for first image
      if (debug && images.length > 0) {
        const firstImg = images[0];
        const sizes = firstImg.Uris?.ImageSizes?.ImageSizes || {};
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            debug: true,
            availableSizeKeys: Object.keys(sizes),
            sampleSizes: {
              TinyImageUrl: sizes.TinyImageUrl,
              ThumbImageUrl: sizes.ThumbImageUrl,
              SmallImageUrl: sizes.SmallImageUrl,
              MediumImageUrl: sizes.MediumImageUrl,
              LargeImageUrl: sizes.LargeImageUrl,
              XLargeImageUrl: sizes.XLargeImageUrl,
              X2LargeImageUrl: sizes.X2LargeImageUrl,
              X3LargeImageUrl: sizes.X3LargeImageUrl,
              OriginalImageUrl: sizes.OriginalImageUrl
            },
            rawSizes: sizes
          })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          albumKey: albumKey,
          images: images.map(img => {
            // SmugMug ImageSizes structure
            const sizes = img.Uris?.ImageSizes?.ImageSizes || {};
            
            // Try to construct different size URLs from archivedUri
            // ArchivedUri format: .../i-KEY/0/HASH/D/filename-D.jpg
            // We can swap D for other size codes: Th, S, M, L, XL, X2, X3
            let x2large = null;
            let xlarge = null;
            let large = null;
            
            if (img.ArchivedUri) {
              // Replace /D/ and -D. with size codes
              x2large = img.ArchivedUri.replace(/\/D\//g, '/X2/').replace(/-D\./g, '-X2.');
              xlarge = img.ArchivedUri.replace(/\/D\//g, '/XL/').replace(/-D\./g, '-XL.');
              large = img.ArchivedUri.replace(/\/D\//g, '/L/').replace(/-D\./g, '-L.');
            }
            
            return {
              key: img.ImageKey,
              filename: img.FileName,
              caption: img.Caption,
              title: img.Title,
              thumbnail: sizes.ThumbImageUrl || sizes.TinyImageUrl || sizes.SmallImageUrl || img.ThumbnailUrl,
              medium: sizes.MediumImageUrl || sizes.SmallImageUrl || sizes.LargeImageUrl,
              large: sizes.LargeImageUrl || large,
              xlarge: sizes.XLargeImageUrl || xlarge,
              x2large: sizes.X2LargeImageUrl || x2large,
              original: img.ArchivedUri,
              webUrl: img.WebUri,
              archivedUri: img.ArchivedUri
            };
          })
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
