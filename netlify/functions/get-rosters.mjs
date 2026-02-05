// get-rosters.mjs
// Netlify Function to fetch approved rosters from Supabase
// 
// Usage:
//   GET /.netlify/functions/get-rosters                     → All approved rosters (defaults to basketball)
//   GET /.netlify/functions/get-rosters?school=X            → Rosters for one school (basketball)
//   GET /.netlify/functions/get-rosters?school=X&gender=Boys → Specific roster (basketball)
//   GET /.netlify/functions/get-rosters?school=X&sport=baseball → Baseball rosters for school

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const school = params.school;
    const gender = params.gender;
    const sport = params.sport;

    // Build Supabase REST API URL
    let url = `${supabaseUrl}/rest/v1/roster_submissions?status=eq.approved&select=id,school,gender,season,players_json,head_coach,assistant_coaches,managers,sport`;

    // Add optional filters
    if (school) {
      url += `&school=eq.${encodeURIComponent(school)}`;
    }
    if (gender) {
      url += `&gender=eq.${encodeURIComponent(gender)}`;
    }
    
    // Sport filtering:
    // - If sport param provided (e.g., 'baseball'), filter by that sport
    // - If no sport param, default to basketball (handles both NULL and 'basketball' values)
    if (sport) {
      url += `&sport=eq.${encodeURIComponent(sport)}`;
    } else {
      // Default to basketball - include both NULL and 'basketball' for backward compatibility
      url += `&or=(sport.is.null,sport.eq.basketball)`;
    }

    // Order by school, then gender
    url += '&order=school.asc,gender.asc';

    // Fetch from Supabase
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to fetch rosters' })
      };
    }

    const rosters = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: rosters.length,
        rosters: rosters
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
}
