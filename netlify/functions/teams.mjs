// Ball603 Teams API
// Netlify Function: /.netlify/functions/teams
// Uses fetch to call Supabase REST API directly (no npm dependencies)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // GET - List teams with filters
    if (method === 'GET') {
      // Build query string for filters
      let queryParts = [];
      
      if (params.id) {
        queryParts.push(`id=eq.${params.id}`);
      }
      if (params.level) {
        queryParts.push(`level=eq.${encodeURIComponent(params.level)}`);
      }
      if (params.division) {
        queryParts.push(`division=eq.${encodeURIComponent(params.division)}`);
      }
      if (params.gender) {
        queryParts.push(`gender=eq.${encodeURIComponent(params.gender)}`);
      }
      if (params.active !== undefined) {
        queryParts.push(`active=eq.${params.active}`);
      }
      if (params.search) {
        // Search across multiple fields
        const search = encodeURIComponent(`%${params.search}%`);
        queryParts.push(`or=(shortname.ilike.${search},full_name.ilike.${search},mascot.ilike.${search})`);
      }
      
      // Add ordering
      queryParts.push('order=level.asc,division.asc,shortname.asc');
      
      const endpoint = `teams?${queryParts.join('&')}`;
      const data = await supabaseRequest(endpoint);
      
      // Single team request
      if (params.id) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, team: data[0] || null })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          teams: data || [],
          count: data?.length || 0
        })
      };
    }

    // POST - Create team(s)
    if (method === 'POST') {
      // Bulk import
      if (body.teams && Array.isArray(body.teams)) {
        const results = { inserted: 0, updated: 0, errors: [] };
        
        for (const team of body.teams) {
          try {
            // Check if team exists by shortname + gender
            const genderFilter = team.gender ? `gender=eq.${encodeURIComponent(team.gender)}` : 'gender=is.null';
            const existing = await supabaseRequest(
              `teams?shortname=eq.${encodeURIComponent(team.shortname)}&${genderFilter}&limit=1`
            );
            
            if (existing && existing.length > 0) {
              // Update existing
              await supabaseRequest(
                `teams?id=eq.${existing[0].id}`,
                { method: 'PATCH', body: JSON.stringify(team) }
              );
              results.updated++;
            } else {
              // Insert new
              await supabaseRequest(
                'teams',
                { method: 'POST', body: JSON.stringify(team) }
              );
              results.inserted++;
            }
          } catch (err) {
            results.errors.push({ team: team.shortname, error: err.message });
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: results.errors.length === 0,
            results 
          })
        };
      }

      // Single team create
      const data = await supabaseRequest('teams', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, team: data[0] })
      };
    }

    // PUT - Update team
    if (method === 'PUT') {
      const teamId = params.id || body.id;
      if (!teamId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Team ID required' })
        };
      }

      // Remove id from update payload
      const updateData = { ...body };
      delete updateData.id;

      const data = await supabaseRequest(
        `teams?id=eq.${teamId}`,
        { method: 'PATCH', body: JSON.stringify(updateData) }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, team: data[0] })
      };
    }

    // DELETE - Delete team
    if (method === 'DELETE') {
      if (!params.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Team ID required' })
        };
      }

      await supabaseRequest(
        `teams?id=eq.${params.id}`,
        { method: 'DELETE', prefer: 'return=minimal' }
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, deleted: params.id })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Teams API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}
