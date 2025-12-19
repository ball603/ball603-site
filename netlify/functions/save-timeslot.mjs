import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    
    let result;
    
    if (id) {
      // Update existing slot
      const { data, error } = await supabase
        .from('tournament_timeslots')
        .update({
          slot_date,
          slot_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new slot
      const { data, error } = await supabase
        .from('tournament_timeslots')
        .insert({
          team,
          gender,
          slot_date,
          slot_time
        })
        .select();
      
      if (error) throw error;
      result = data;
    }
    
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
