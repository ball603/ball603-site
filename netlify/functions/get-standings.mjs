// Ball603 Get Standings API
// Returns standings data from Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: standings, error } = await supabase
      .from('standings')
      .select('*')
      .order('rating', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    return new Response(JSON.stringify({ standings: standings || [] }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Get standings error:', error);
    return new Response(JSON.stringify({ error: error.message, standings: [] }), {
      status: 200, // Return 200 with empty standings instead of 500
      headers
    });
  }
};
