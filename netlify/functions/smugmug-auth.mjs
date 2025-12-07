// SmugMug OAuth 1.0a Authentication Flow
import crypto from 'crypto';

const SMUGMUG_API_KEY = process.env.SMUGMUG_API_KEY;
const SMUGMUG_API_SECRET = process.env.SMUGMUG_API_SECRET;

const REQUEST_TOKEN_URL = 'https://api.smugmug.com/services/oauth/1.0a/getRequestToken';
const AUTHORIZE_URL = 'https://api.smugmug.com/services/oauth/1.0a/authorize';
const ACCESS_TOKEN_URL = 'https://api.smugmug.com/services/oauth/1.0a/getAccessToken';

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
  // Sort and encode parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams)
  ].join('&');
  
  // Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  
  // Generate HMAC-SHA1 signature
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function buildAuthHeader(params) {
  return 'OAuth ' + Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(params[key])}"`)
    .join(', ');
}

async function getRequestToken(callbackUrl) {
  const params = {
    oauth_consumer_key: SMUGMUG_API_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_nonce: generateNonce(),
    oauth_version: '1.0',
    oauth_callback: callbackUrl
  };
  
  params.oauth_signature = generateSignature('POST', REQUEST_TOKEN_URL, params, SMUGMUG_API_SECRET);
  
  const response = await fetch(REQUEST_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': buildAuthHeader(params),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  const text = await response.text();
  const data = Object.fromEntries(new URLSearchParams(text));
  
  return {
    requestToken: data.oauth_token,
    requestTokenSecret: data.oauth_token_secret
  };
}

async function getAccessToken(requestToken, requestTokenSecret, verifier) {
  const params = {
    oauth_consumer_key: SMUGMUG_API_KEY,
    oauth_token: requestToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_nonce: generateNonce(),
    oauth_version: '1.0',
    oauth_verifier: verifier
  };
  
  params.oauth_signature = generateSignature('POST', ACCESS_TOKEN_URL, params, SMUGMUG_API_SECRET, requestTokenSecret);
  
  const response = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': buildAuthHeader(params),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  const text = await response.text();
  const data = Object.fromEntries(new URLSearchParams(text));
  
  return {
    accessToken: data.oauth_token,
    accessTokenSecret: data.oauth_token_secret
  };
}

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('', { headers });
  }
  
  if (!SMUGMUG_API_KEY || !SMUGMUG_API_SECRET) {
    return new Response(JSON.stringify({
      success: false,
      error: 'SmugMug API credentials not configured'
    }), { status: 500, headers });
  }
  
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  
  try {
    if (action === 'request_token') {
      // Use 'oob' (out-of-band) callback - user will manually copy the verifier
      const { requestToken, requestTokenSecret } = await getRequestToken('oob');
      
      const authUrl = `${AUTHORIZE_URL}?oauth_token=${requestToken}&Access=Full&Permissions=Modify`;
      
      return new Response(JSON.stringify({
        success: true,
        requestToken,
        requestTokenSecret,
        authUrl
      }), { headers });
      
    } else if (action === 'access_token') {
      const body = await req.json();
      const { requestToken, requestTokenSecret, verifier } = body;
      
      if (!requestToken || !requestTokenSecret || !verifier) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required parameters'
        }), { status: 400, headers });
      }
      
      const { accessToken, accessTokenSecret } = await getAccessToken(
        requestToken,
        requestTokenSecret,
        verifier
      );
      
      return new Response(JSON.stringify({
        success: true,
        accessToken,
        accessTokenSecret
      }), { headers });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), { status: 400, headers });
    
  } catch (error) {
    console.error('SmugMug auth error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/smugmug-auth"
};
