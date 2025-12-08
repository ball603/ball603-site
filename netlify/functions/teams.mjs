// Ball603 Teams API
// Netlify Function: /.netlify/functions/teams
// Handles CRUD operations for teams table

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

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
      // Single team by ID
      if (params.id) {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (error) throw error;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, team: data })
        };
      }

      // List teams with optional filters
      let query = supabase.from('teams').select('*');
      
      if (params.level) query = query.eq('level', params.level);
      if (params.division) query = query.eq('division', params.division);
      if (params.gender) query = query.eq('gender', params.gender);
      if (params.active !== undefined) query = query.eq('active', params.active === 'true');
      if (params.search) {
        query = query.or(`shortname.ilike.%${params.search}%,full_name.ilike.%${params.search}%,mascot.ilike.%${params.search}%`);
      }
      
      // Default ordering
      query = query.order('level').order('division').order('shortname');

      const { data, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          teams: data,
          count: data.length 
        })
      };
    }

    // POST - Create team(s)
    if (method === 'POST') {
      // Bulk import
      if (body.teams && Array.isArray(body.teams)) {
        const results = { inserted: 0, updated: 0, errors: [] };
        
        for (const team of body.teams) {
          // Check if team exists by shortname
          const { data: existing } = await supabase
            .from('teams')
            .select('id')
            .eq('shortname', team.shortname)
            .eq('gender', team.gender || null)
            .single();

          if (existing) {
            // Update existing
            const { error } = await supabase
              .from('teams')
              .update(team)
              .eq('id', existing.id);
            
            if (error) {
              results.errors.push({ team: team.shortname, error: error.message });
            } else {
              results.updated++;
            }
          } else {
            // Insert new
            const { error } = await supabase
              .from('teams')
              .insert(team);
            
            if (error) {
              results.errors.push({ team: team.shortname, error: error.message });
            } else {
              results.inserted++;
            }
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
      const { data, error } = await supabase
        .from('teams')
        .insert(body)
        .select()
        .single();
      
      if (error) throw error;
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, team: data })
      };
    }

    // PUT - Update team
    if (method === 'PUT') {
      if (!params.id && !body.id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Team ID required' })
        };
      }

      const teamId = params.id || body.id;
      delete body.id; // Remove id from update payload

      const { data, error } = await supabase
        .from('teams')
        .update(body)
        .eq('id', teamId)
        .select()
        .single();
      
      if (error) throw error;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, team: data })
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

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', params.id);
      
      if (error) throw error;
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
