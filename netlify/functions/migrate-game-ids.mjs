// Ball603 Game ID Migration Helper
// One-time migration from old ID format to new date-based format
// Preserves all assignments (photog1, photog2, videog, writer, etc.)
//
// Old high school format: bedford-vs-goffstown-boys-d-i
// New high school format: nhiaa_bedford_b_20251215_goffstown
//
// Old college format: dartmouth-vs-elms-college-men-college
// New college format: college_dart_m_20260101_elms
//
// Run once via: https://your-site.netlify.app/.netlify/functions/migrate-game-ids

/**
 * Generate new high school game ID
 */
function generateNewHSGameId(game) {
  const genderCode = game.gender === 'Boys' ? 'b' : 'g';
  const dateCode = game.date.replace(/-/g, '');
  const homeCode = game.home.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
  const awayCode = game.away.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
  return `nhiaa_${homeCode}_${genderCode}_${dateCode}_${awayCode}`;
}

/**
 * Generate new college game ID
 */
function generateNewCollegeGameId(game) {
  // Map gender - handle both Men/Women and Boys/Girls
  let genderCode;
  if (game.gender === 'Boys' || game.gender === 'Men') {
    genderCode = 'm';
  } else if (game.gender === 'Girls' || game.gender === 'Women') {
    genderCode = 'w';
  } else {
    genderCode = 'x'; // Unknown, shouldn't happen
  }
  
  const dateCode = game.date.replace(/-/g, '');
  const homeCode = game.home.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
  const awayCode = game.away.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
  return `college_${homeCode}_${genderCode}_${dateCode}_${awayCode}`;
}

/**
 * Create JWT for Google Sheets authentication
 */
async function createJWT(credentials) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const pemContents = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Migrate a single sheet tab
 */
async function migrateSheet(accessToken, spreadsheetId, sheetName, generateIdFn, normalizeGender = false) {
  console.log(`\nMigrating ${sheetName}...`);
  
  // Read existing data
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:W`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const { values: rows = [] } = await response.json();
  
  if (rows.length <= 1) {
    console.log(`  No data to migrate in ${sheetName}`);
    return { migrated: 0, withAssignments: 0, genderFixed: 0 };
  }
  
  // Standard 23-column header
  const standardHeader = [
    'game_id', 'date', 'time', 'away', 'away_score', 'home', 'home_score',
    'gender', 'level', 'division', 'photog1', 'photog2', 'videog', 'writer',
    'notes', 'original_date', 'schedule_changed', 'photos_url', 'recap_url',
    'highlights_url', 'live_stream_url', 'gamedescription', 'specialevent'
  ];
  
  const existingHeader = rows[0];
  console.log(`  Found ${rows.length - 1} games`);
  
  // Check if header needs updating
  const headerNeedsUpdate = existingHeader.join(',') !== standardHeader.join(',');
  if (headerNeedsUpdate) {
    console.log(`  Header will be updated to standard 23-column format`);
  }
  
  // Build column mapping from existing header
  const cols = {};
  for (const colName of standardHeader) {
    cols[colName] = existingHeader.indexOf(colName);
  }
  
  // Also check for location/conference which need to be dropped
  const locationCol = existingHeader.indexOf('location');
  const conferenceCol = existingHeader.indexOf('conference');
  
  let migrated = 0;
  let genderFixed = 0;
  let withAssignments = 0;
  const idMap = {};
  
  // Process each row
  const updatedRows = [standardHeader];
  
  for (let i = 1; i < rows.length; i++) {
    const oldRow = rows[i];
    
    // Build new row with standard columns
    const newRow = [];
    for (let j = 0; j < standardHeader.length; j++) {
      const colName = standardHeader[j];
      const oldIndex = cols[colName];
      if (oldIndex >= 0 && oldIndex < oldRow.length) {
        newRow.push(oldRow[oldIndex] || '');
      } else {
        newRow.push('');
      }
    }
    
    const oldId = newRow[0]; // game_id is always first
    
    // Normalize gender if needed (Men -> Boys, Women -> Girls)
    const genderIndex = 7; // gender is column 7 (0-indexed)
    if (normalizeGender) {
      if (newRow[genderIndex] === 'Men') {
        newRow[genderIndex] = 'Boys';
        genderFixed++;
      } else if (newRow[genderIndex] === 'Women') {
        newRow[genderIndex] = 'Girls';
        genderFixed++;
      }
    }
    
    const game = {
      date: newRow[1] || '',   // date
      away: newRow[3] || '',   // away
      home: newRow[5] || '',   // home
      gender: newRow[7] || ''  // gender
    };
    
    // Check if has assignment
    const hasAssignment = newRow[10] || newRow[11] || newRow[12] || newRow[13]; // photog1, photog2, videog, writer
    if (hasAssignment) {
      withAssignments++;
    }
    
    // Generate new ID
    if (game.date && game.home && game.away && game.gender) {
      const newId = generateIdFn(game);
      
      if (oldId !== newId) {
        idMap[oldId] = newId;
        newRow[0] = newId;
        migrated++;
        
        if (hasAssignment) {
          console.log(`  📋 ${oldId}`);
          console.log(`     → ${newId}`);
          console.log(`     Assignments: ${[newRow[10], newRow[11], newRow[12], newRow[13]].filter(Boolean).join(', ')}`);
        }
      }
    }
    
    updatedRows.push(newRow);
  }
  
  console.log(`  Migrated ${migrated} IDs (${withAssignments} have assignments)`);
  if (genderFixed > 0) {
    console.log(`  Fixed ${genderFixed} gender values (Men→Boys, Women→Girls)`);
  }
  
  // Write updated data back
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:W:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: updatedRows })
  });
  
  console.log(`  ✅ ${sheetName} updated successfully`);
  
  return { migrated, withAssignments, genderFixed, idMap };
}

/**
 * Main handler
 */
export default async (request) => {
  console.log('=== Ball603 Game ID Migration ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check for credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_SCHEDULE_ID) {
      throw new Error('Missing Google Sheets credentials');
    }
    
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const spreadsheetId = process.env.GOOGLE_SHEETS_SCHEDULE_ID;
    
    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(credentials)
      })
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Migrate high school games (Schedules tab)
    const hsResult = await migrateSheet(
      access_token, 
      spreadsheetId, 
      'Schedules', 
      generateNewHSGameId,
      false  // High school already uses Boys/Girls
    );
    
    // Migrate college games (CollegeSchedules tab)
    const collegeResult = await migrateSheet(
      access_token, 
      spreadsheetId, 
      'CollegeSchedules', 
      generateNewCollegeGameId,
      true  // College needs Men→Boys, Women→Girls conversion
    );
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      highSchool: {
        migrated: hsResult.migrated,
        withAssignments: hsResult.withAssignments
      },
      college: {
        migrated: collegeResult.migrated,
        withAssignments: collegeResult.withAssignments,
        genderFixed: collegeResult.genderFixed
      }
    };
    
    console.log('\n=== Migration Complete ===');
    console.log(JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// No schedule - this is a one-time manual run
