export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id, team, gender, slot_date, slot_time } = JSON.parse(event.body);
    
    if (!team || !gender || !slot_date || !slot_time) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    const supabaseHeaders = {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    
    let response;
    
    if (id) {
      // Update existing slot
      response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/tournament_timeslots?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            slot_date,
            slot_time,
            updated_at: new Date().toISOString()
          })
        }
      );
    } else {
      // Insert new slot
      response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/tournament_timeslots`,
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            team,
            gender,
            slot_date,
            slot_time
          })
        }
      );
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, slot: result?.[0] })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
