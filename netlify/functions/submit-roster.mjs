// submit-roster.mjs
// Netlify Function to handle roster form submissions with PDF upload support
// Place in: netlify/functions/submit-roster.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

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
    let data = {};
    let pdfBuffer = null;
    let pdfFilename = null;

    // Parse based on content type
    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body);
    } else if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data
      const parsed = parseMultipartForm(event.body, contentType, event.isBase64Encoded);
      data = parsed.fields;
      pdfBuffer = parsed.file?.buffer;
      pdfFilename = parsed.file?.filename;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      data = parseUrlEncoded(event.body);
    } else {
      // Try JSON as fallback
      try {
        data = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid request format' })
        };
      }
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

    // Handle PDF upload if present
    let pdfUrl = null;
    if (pdfBuffer && pdfFilename) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const safeName = data.school.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const safeGender = data.gender.toLowerCase();
        const storagePath = `${safeName}-${safeGender}-${timestamp}.pdf`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('roster-pdfs')
          .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('PDF upload error:', uploadError);
          // Continue without PDF - don't fail the whole submission
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('roster-pdfs')
            .getPublicUrl(storagePath);
          
          pdfUrl = urlData?.publicUrl;
        }
      } catch (uploadErr) {
        console.error('PDF upload exception:', uploadErr);
        // Continue without PDF
      }
    }

    // Prepare the roster submission
    const submission = {
      school: data.school,
      gender: data.gender,
      division: data.division || null,
      submitted_by: data.submitted_by || data.coach_name || null,
      submitted_email: data.submitted_email || data.coach_email || null,
      submission_type: pdfUrl ? 'pdf' : 'form',
      head_coach: data.head_coach || null,
      assistant_coaches: data.assistant_coaches || null,
      managers: data.managers || null,
      pdf_url: pdfUrl,
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
      })).filter(p => p.name);
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
        message: pdfUrl 
          ? 'PDF roster uploaded successfully! We\'ll review and enter the data soon.'
          : 'Roster submitted successfully!',
        id: inserted.id,
        hasPdf: !!pdfUrl
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

// Parse multipart form data
function parseMultipartForm(body, contentType, isBase64Encoded) {
  const fields = {};
  let file = null;

  // Get boundary from content type
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return { fields, file };
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  // Decode body if base64 encoded
  let bodyBuffer;
  if (isBase64Encoded) {
    bodyBuffer = Buffer.from(body, 'base64');
  } else {
    bodyBuffer = Buffer.from(body, 'binary');
  }

  const bodyStr = bodyBuffer.toString('binary');
  const parts = bodyStr.split(`--${boundary}`);

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;

    // Split headers and content
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headerSection = part.substring(0, headerEndIndex);
    const content = part.substring(headerEndIndex + 4);

    // Parse Content-Disposition
    const dispositionMatch = headerSection.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    // Remove trailing \r\n
    let value = content;
    if (value.endsWith('\r\n')) {
      value = value.slice(0, -2);
    }

    if (filename) {
      // This is a file
      const contentTypeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
      const fileContentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
      
      // Only accept PDFs
      if (fileContentType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
        file = {
          filename: filename,
          contentType: fileContentType,
          buffer: Buffer.from(value, 'binary')
        };
      }
    } else {
      // Regular field
      // Handle array notation like player[0][name]
      const arrayMatch = fieldName.match(/^(\w+)\[(\d+)\]\[(\w+)\]$/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1] + 's'; // player -> players
        const index = parseInt(arrayMatch[2]);
        const prop = arrayMatch[3];
        
        if (!fields[arrayName]) fields[arrayName] = [];
        if (!fields[arrayName][index]) fields[arrayName][index] = {};
        fields[arrayName][index][prop] = value;
      } else {
        fields[fieldName] = value;
      }
    }
  }

  // Clean up players array (remove empty slots)
  if (fields.players) {
    fields.players = fields.players.filter(p => p && p.name);
  }

  return { fields, file };
}

// Parse URL-encoded form data
function parseUrlEncoded(body) {
  const data = {};
  const players = [];
  const params = new URLSearchParams(body);
  
  for (const [key, value] of params.entries()) {
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

  return data;
}
