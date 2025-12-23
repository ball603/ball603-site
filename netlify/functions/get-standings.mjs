// Ball603 Get Standings API
// Returns standings data from Supabase via REST API

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/standings?select=*&order=rating.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    const standings = await response.json();
    
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
