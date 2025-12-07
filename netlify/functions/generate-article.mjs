// AI Article Generation using Claude API
// Supports two modes: 'extract' (read scorebook) and 'write' (generate article)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Anthropic API key not configured' }) };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    const mode = body.mode || 'extract';
    
    if (mode === 'extract') {
      return await handleExtract(body, headers);
    } else if (mode === 'write') {
      return await handleWrite(body, headers);
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid mode' }) };
    }
    
  } catch (error) {
    console.error('Generation error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to process request', details: error.message }) };
  }
};

// Mode 1: Extract box score from scorebook image
async function handleExtract(body, headers) {
  const { image, notes, gameInfo, awayRoster, homeRoster } = body;
  
  if (!image) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Scorebook image required' }) };
  }
  
  // Build roster reference for Claude
  let rosterRef = '';
  if (awayRoster) {
    rosterRef += `\n\n${gameInfo.away} ROSTER:\n`;
    awayRoster.players.forEach(p => {
      rosterRef += `#${p.number} ${p.name} (${p.class}, ${p.position})\n`;
    });
  }
  if (homeRoster) {
    rosterRef += `\n\n${gameInfo.home} ROSTER:\n`;
    homeRoster.players.forEach(p => {
      rosterRef += `#${p.number} ${p.name} (${p.class}, ${p.position})\n`;
    });
  }
  
  const systemPrompt = `You are an expert at reading standard basketball scorebooks. This is a two-page spread with the AWAY team on the LEFT page and HOME team on the RIGHT page.

HOW TO READ A SCOREBOOK:

1. TEAM NAMES: Found at top left of each page after "TEAM"

2. FINAL SCORES - CRITICAL: 
   - Look for the "FINAL SCORE" box near the top right area of each page
   - Also visible as the LAST crossed-off number in the "RUNNING SCORE" rows at the very top
   - The running score has numbers 1-28 on first row, 29-56 on second row, etc.
   - The highest crossed-off number IS the final score

3. QUARTER SCORES:
   - Look for boxes labeled "1ST Q SCORE" (or "FIRST Q"), "FIRST HALF SCORE", "3RD Q SCORE" (or "THIRD Q"), "FINAL SCORE"
   - Calculate quarters: Q1 = 1st Q score, Q2 = Half score minus Q1, Q3 = 3rd Q minus Half, Q4 = Final minus 3rd Q
   - Example: If 1st Q=26, Half=36, 3rd Q=61, Final=69 → Quarters are [26, 10, 25, 8]

4. INDIVIDUAL SCORING:
   - Players are listed in rows with jersey numbers in the "NO." column
   - The "TP" column (far right, "Total Points") shows each player's points
   - ONLY include players who have points in the TP column (TP > 0)
   - Do NOT list every player on the roster - only those who scored

5. PLAYER NAMES:
   - Use the roster below to match jersey numbers to correct name spellings
   - The scorebook handwriting may be messy - trust the roster for spelling

${rosterRef}

RETURN ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "awayTeam": "Team Name",
  "homeTeam": "Team Name", 
  "awayQuarters": [Q1, Q2, Q3, Q4],
  "homeQuarters": [Q1, Q2, Q3, Q4],
  "awayFinal": total,
  "homeFinal": total,
  "awayScorers": [{"name": "Player Name", "points": XX}, ...],
  "homeScorers": [{"name": "Player Name", "points": XX}, ...],
  "notes": "Any notable observations"
}

CRITICAL RULES:
- Points values should be NUMBERS not strings
- Only include players who actually scored (check TP column)
- Double-check final scores by looking at the RUNNING SCORE at the top
- The awayScorers points should add up to awayFinal
- The homeScorers points should add up to homeFinal`;

  // Build message content with image
  const messageContent = [];
  
  // Extract base64 data from data URL
  const matches = image.match(/^data:(.+);base64,(.+)$/);
  if (matches) {
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: matches[1],
        data: matches[2]
      }
    });
  }
  
  let textPrompt = `Extract the box score from this scorebook image.\n\nGame: ${gameInfo.away} at ${gameInfo.home} (${gameInfo.gender} ${gameInfo.division || ''})`;
  if (notes) {
    textPrompt += `\n\nAdditional notes from the user: ${notes}`;
  }
  messageContent.push({ type: 'text', text: textPrompt });
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', errorText);
    return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Failed to extract box score', details: errorText }) };
  }
  
  const data = await response.json();
  const rawText = data.content?.[0]?.text || '';
  
  // Parse JSON from response
  let extracted;
  try {
    // Try to find JSON in the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    console.error('Failed to parse extracted data:', e, rawText);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to parse extracted data', raw: rawText }) };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, extracted })
  };
}

// Mode 2: Write article from confirmed proof data
async function handleWrite(body, headers) {
  const { proofData, awayRoster, homeRoster } = body;
  
  if (!proofData) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Proof data required' }) };
  }
  
  // Build detailed player info from rosters
  function getPlayerInfo(name, roster) {
    if (!roster?.players) return null;
    const player = roster.players.find(p => 
      p.name.toLowerCase() === name.toLowerCase() ||
      p.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(p.name.toLowerCase())
    );
    return player;
  }
  
  // Enhance scorers with roster info
  const awayScorersEnhanced = proofData.awayScorers.map(s => {
    const info = getPlayerInfo(s.name, awayRoster);
    return {
      ...s,
      class: info?.class || '',
      position: info?.position || '',
      number: info?.number || ''
    };
  });
  
  const homeScorersEnhanced = proofData.homeScorers.map(s => {
    const info = getPlayerInfo(s.name, homeRoster);
    return {
      ...s,
      class: info?.class || '',
      position: info?.position || '',
      number: info?.number || ''
    };
  });
  
  // Determine winner
  const awayScore = parseInt(proofData.awayFinal) || 0;
  const homeScore = parseInt(proofData.homeFinal) || 0;
  const winner = awayScore > homeScore ? proofData.awayTeam : proofData.homeTeam;
  const loser = awayScore > homeScore ? proofData.homeTeam : proofData.awayTeam;
  const winnerScore = Math.max(awayScore, homeScore);
  const loserScore = Math.min(awayScore, homeScore);
  
  // Build the prompt
  const prompt = `You are a sports writer for Ball603.com, covering New Hampshire high school basketball. Write an engaging game recap.

GAME RESULT: ${winner} ${winnerScore}, ${loser} ${loserScore}
DATE: ${proofData.date || 'Today'}
GENDER: ${proofData.gender || 'Varsity'}
DIVISION: ${proofData.division || ''}

QUARTER SCORES:
${proofData.awayTeam}: ${proofData.awayQuarters.join(' - ')} = ${proofData.awayFinal}
${proofData.homeTeam}: ${proofData.homeQuarters.join(' - ')} = ${proofData.homeFinal}

${proofData.awayTeam} SCORERS:
${awayScorersEnhanced.map(s => `- ${s.name}${s.class ? ` (${s.class}${s.position ? ', ' + s.position : ''})` : ''}: ${s.points} pts`).join('\n')}

${proofData.homeTeam} SCORERS:
${homeScorersEnhanced.map(s => `- ${s.name}${s.class ? ` (${s.class}${s.position ? ', ' + s.position : ''})` : ''}: ${s.points} pts`).join('\n')}

${proofData.notes ? `NOTES: ${proofData.notes}` : ''}

STYLE GUIDELINES:
- Write in an energetic, engaging sports journalism style
- Lead with the most exciting aspect (comeback, star performance, dominant win, etc.)
- Mention class year (junior, senior, etc.) when referencing key players
- Keep paragraphs short and punchy  
- Include quarter-by-quarter narrative if scores show an interesting flow
- Total length: 300-450 words
- Do NOT include a headline - just the article body

Write the article:`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Failed to generate article', details: errorText }) };
  }
  
  const data = await response.json();
  const article = data.content?.[0]?.text || '';
  
  // Generate headline
  const headlineResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Write a short, punchy headline (8 words max) for this game recap. Just the headline, nothing else.\n\nGame: ${winner} ${winnerScore}, ${loser} ${loserScore}\n\nArticle:\n${article.substring(0, 500)}`
      }]
    })
  });
  
  let headline = `${winner} Defeats ${loser} ${winnerScore}-${loserScore}`;
  if (headlineResponse.ok) {
    const headlineData = await headlineResponse.json();
    headline = headlineData.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || headline;
  }
  
  // Generate excerpt
  const excerpt = article.split('.').slice(0, 2).join('.').trim() + '.';
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, headline, article, excerpt })
  };
}
