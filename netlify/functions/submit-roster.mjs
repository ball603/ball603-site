// submit-roster.mjs
// Netlify Function to handle roster form submissions with PDF/image upload and Claude AI parsing
// Uses fetch directly - no npm dependencies required

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Claude parsing prompt with all the rules
const PARSING_PROMPT = `You are extracting basketball roster data from an uploaded document/image.

EXTRACT THE FOLLOWING:
1. All players with: jersey number, full name, class/grade, position
2. Head Coach name
3. Assistant Coach names (comma-separated)
4. Manager names (comma-separated)

CLASS CONVERSIONS:
- Senior, 12, 2026 → SR
- Junior, 11, 2027 → JR
- Sophomore, 10, 2028 → SO
- Freshman, 9, 2029 → FR
- 8th grade → 8th
- 7th grade → 7th

POSITION FORMATTING:
- Use abbreviations: G, F, C, G/F, F/C
- Guard → G, Forward → F, Center → C

NAME CAPITALIZATION RULES:
Flag these for review (include in flagged_names array):
- Mc prefix → McDonald, McLaughlin, etc.
- Mac prefix (followed by consonant) → MacDonald, MacNeil, etc.
- O' apostrophe → O'Brien, O'Hern, O'Meara, etc.
- Di prefix → DiBlasio, DiLullo, etc.

Whitelisted French names (keep La/Le/Du capitalization):
- LaFlamme, LaPierre, LaPanne, LaMothe, LaValley
- LeBlanc, LeClaire
- DuBreuil

Standard capitalization for: Larson, Lawson, Daniels, Dean, Lorenz, Duffy, Dixon, Dillon, etc.

IGNORE:
- Athletic Directors, Principals, Athletic Trainers
- Anyone listed directly under the school name tag (that's usually a manager)

RESPOND WITH ONLY THIS JSON FORMAT (no markdown, no explanation):
{
  "players": [
    {"number": "23", "name": "John Smith", "class": "SR", "position": "G"}
  ],
  "head_coach": "Coach Name",
  "assistant_coaches": "Asst1, Asst2",
  "managers": "Manager Name",
  "flagged_names": ["McDonald", "O'Brien"],
  "notes": "Any issues or uncertainties"
}

Sort players by jersey number (ascending). If number is unclear, use empty string.`;

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
    let fileBuffer = null;
    let fileFilename = null;
    let fileMimeType = null;

    // Parse based on content type
    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body);
    } else if (contentType.includes('multipart/form-data')) {
      const parsed = parseMultipartForm(event.body, contentType, event.isBase64Encoded);
      data = parsed.fields;
      fileBuffer = parsed.file?.buffer;
      fileFilename = parsed.file?.filename;
      fileMimeType = parsed.file?.contentType;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      data = parseUrlEncoded(event.body);
    } else {
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

    // Handle file upload if present
    let fileUrl = null;
    let parsedPlayers = [];
    let parsedCoaches = {};
    let parsingNotes = null;
    let flaggedNames = [];

    if (fileBuffer && fileFilename) {
      try {
        const timestamp = Date.now();
        const safeName = data.school.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const safeGender = data.gender.toLowerCase();
        const ext = fileFilename.split('.').pop().toLowerCase();
        const storagePath = `${safeName}-${safeGender}-${timestamp}.${ext}`;

        // Upload to Supabase Storage via REST API
        const uploadResponse = await fetch(
          `${supabaseUrl}/storage/v1/object/roster-pdfs/${storagePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': fileMimeType || 'application/octet-stream',
              'x-upsert': 'false'
            },
            body: fileBuffer
          }
        );

        if (uploadResponse.ok) {
          fileUrl = `${supabaseUrl}/storage/v1/object/public/roster-pdfs/${storagePath}`;
          
          // Parse with Claude API if we have the key
          if (anthropicKey) {
            const parseResult = await parseRosterWithClaude(fileBuffer, fileMimeType);
            if (parseResult) {
              parsedPlayers = parseResult.players || [];
              parsedCoaches = {
                head_coach: parseResult.head_coach,
                assistant_coaches: parseResult.assistant_coaches,
                managers: parseResult.managers
              };
              flaggedNames = parseResult.flagged_names || [];
              parsingNotes = parseResult.notes;
              
              if (flaggedNames.length > 0) {
                parsingNotes = (parsingNotes ? parsingNotes + '\n' : '') + 
                  'Names to verify: ' + flaggedNames.join(', ');
              }
            }
          }
        } else {
          console.error('File upload failed:', await uploadResponse.text());
        }
      } catch (uploadErr) {
        console.error('File upload exception:', uploadErr);
      }
    }

    // Determine submission type
    let submissionType = 'form';
    if (fileUrl) {
      const ext = fileFilename?.split('.').pop().toLowerCase();
      if (ext === 'pdf') submissionType = 'pdf';
      else if (['png', 'jpg', 'jpeg'].includes(ext)) submissionType = 'image';
    }

    // Prepare the roster submission
    const submission = {
      school: data.school,
      gender: data.gender,
      division: data.division || null,
      submitted_by: data.submitted_by || data.coach_name || null,
      submitted_email: data.submitted_email || data.coach_email || null,
      submission_type: submissionType,
      head_coach: parsedCoaches.head_coach || data.head_coach || null,
      assistant_coaches: parsedCoaches.assistant_coaches || data.assistant_coaches || null,
      managers: parsedCoaches.managers || data.managers || null,
      pdf_url: fileUrl,
      status: 'pending',
      players_json: [],
      notes: parsingNotes
    };

    // Use parsed players if available, otherwise use form data
    if (parsedPlayers.length > 0) {
      submission.players_json = parsedPlayers;
    } else if (data.players && Array.isArray(data.players)) {
      submission.players_json = data.players.map(p => ({
        number: p.number || '',
        name: p.name || '',
        class: p.class || '',
        position: p.position || ''
      })).filter(p => p.name);
    }

    // Insert into database via Supabase REST API
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/roster_submissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(submission)
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Supabase insert error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to save submission' 
        })
      };
    }

    const inserted = await insertResponse.json();

    // Build response message
    let message = 'Roster submitted successfully!';
    if (fileUrl && parsedPlayers.length > 0) {
      message = `Roster uploaded and parsed! Found ${parsedPlayers.length} players. We'll review and approve it soon.`;
    } else if (fileUrl) {
      message = 'Roster uploaded successfully! We\'ll review and enter the data soon.';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: message,
        id: inserted[0]?.id,
        hasFile: !!fileUrl,
        playersParsed: parsedPlayers.length
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

// Parse roster with Claude API
async function parseRosterWithClaude(fileBuffer, mimeType) {
  try {
    const base64Data = fileBuffer.toString('base64');
    
    // Determine content type for Claude
    let mediaType = mimeType;
    if (!mediaType || mediaType === 'application/octet-stream') {
      // Try to detect from content
      if (base64Data.startsWith('JVBERi')) mediaType = 'application/pdf';
      else if (base64Data.startsWith('/9j/')) mediaType = 'image/jpeg';
      else if (base64Data.startsWith('iVBOR')) mediaType = 'image/png';
    }
    
    // Build the message content based on file type
    let content;
    if (mediaType === 'application/pdf') {
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data
          }
        },
        {
          type: 'text',
          text: PARSING_PROMPT
        }
      ];
    } else {
      // Image (PNG/JPG)
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        },
        {
          type: 'text',
          text: PARSING_PROMPT
        }
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return null;
    }

    const result = await response.json();
    const textContent = result.content?.find(c => c.type === 'text')?.text;
    
    if (!textContent) {
      console.error('No text content in Claude response');
      return null;
    }

    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Sort players by number
      if (parsed.players && Array.isArray(parsed.players)) {
        parsed.players.sort((a, b) => {
          const numA = parseInt(a.number) || 999;
          const numB = parseInt(b.number) || 999;
          return numA - numB;
        });
      }
      
      return parsed;
    } catch (parseErr) {
      console.error('Failed to parse Claude response as JSON:', parseErr);
      console.error('Response was:', textContent);
      return null;
    }

  } catch (err) {
    console.error('Claude parsing error:', err);
    return null;
  }
}

// Parse multipart form data
function parseMultipartForm(body, contentType, isBase64Encoded) {
  const fields = {};
  let file = null;

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return { fields, file };
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];

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

    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headerSection = part.substring(0, headerEndIndex);
    const content = part.substring(headerEndIndex + 4);

    const dispositionMatch = headerSection.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    let value = content;
    if (value.endsWith('\r\n')) {
      value = value.slice(0, -2);
    }

    if (filename) {
      const contentTypeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
      const fileContentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
      const ext = filename.split('.').pop().toLowerCase();
      
      // Accept PDF, PNG, JPG
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      const validExts = ['pdf', 'png', 'jpg', 'jpeg'];
      
      if (validTypes.includes(fileContentType) || validExts.includes(ext)) {
        file = {
          filename: filename,
          contentType: fileContentType,
          buffer: Buffer.from(value, 'binary')
        };
      }
    } else {
      const arrayMatch = fieldName.match(/^(\w+)\[(\d+)\]\[(\w+)\]$/);
      if (arrayMatch) {
        const arrayName = arrayMatch[1] + 's';
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
