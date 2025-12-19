const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const gender = event.queryStringParameters?.gender;
    
    let query = supabase.from('tournament_timeslots').select('*');
    
    if (gender) {
      query = query.eq('gender', gender);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ slots: data || [] })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
