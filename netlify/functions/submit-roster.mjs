// submit-roster.mjs
// Netlify Function to handle roster form submissions
// Place in: netlify/functions/submit-roster.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side

const supabase = createClient(supabaseUrl, supabaseKey);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    let data;

    // Parse form data or JSON
    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body);
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      data = parseFormData(event.body, contentType);
    } else {
      data = JSON.parse(event.body);
    }

    // Validate required fields
    if (!data.school || !data.gender) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'School and gender are required' 
        })
      };
    }

    // Prepare the roster submission
    const submission = {
      school: data.school,
      gender: data.gender,
      division: data.division || null,
      submitted_by: data.submitted_by || data.coach_name || null,
      submitted_email: data.submitted_email || data.coach_email || null,
      submission_type: data.pdf_url ? 'pdf' : 'form',
      head_coach: data.head_coach || null,
      assistant_coaches: data.assistant_coaches || null,
      managers: data.managers || null,
      pdf_url: data.pdf_url || null,
      status: 'pending',
      players_json: []
    };

    // Parse players from form data
    if (data.players && Array.isArray(data.players)) {
      submission.players_json = data.players.map(p => ({
        number: p.number || '',
        name: p.name || '',
        class: p.class || '',
        position: p.position || ''
      })).filter(p => p.name); // Only include players with names
    }

    // Insert into database
    const { data: inserted, error } = await supabase
      .from('roster_submissions')
      .insert([submission])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to save submission' 
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Roster submitted successfully!',
        id: inserted.id
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Server error processing submission' 
      })
    };
  }
}

// Helper to parse URL-encoded form data
function parseFormData(body, contentType) {
  const data = {};
  const players = [];

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(body);
    
    // Extract regular fields
    for (const [key, value] of params.entries()) {
      // Check for player fields like player[0][name]
      const playerMatch = key.match(/player\[(\d+)\]\[(\w+)\]/);
      if (playerMatch) {
        const index = parseInt(playerMatch[1]);
        const field = playerMatch[2];
        if (!players[index]) players[index] = {};
        players[index][field] = value;
      } else {
        data[key] = value;
      }
    }

    if (players.length > 0) {
      data.players = players.filter(p => p && p.name);
    }
  }

  return data;
}
