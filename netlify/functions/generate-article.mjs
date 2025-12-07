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

HOW TO READ A SCOREBOOK - FOLLOW THESE STEPS EXACTLY:

STEP 1 - FIND THE FINAL SCORES FIRST (MOST IMPORTANT):
- Look at the "RUNNING SCORE" rows at the VERY TOP of each page
- These are pre-printed numbers: 1,2,3,4,5...28 (row 1), 29,30,31...56 (row 2), etc.
- Numbers are crossed off or circled as points are scored
- THE HIGHEST CROSSED-OFF/CIRCLED NUMBER = FINAL SCORE
- Also check the "TEAM TOTALS" row at the BOTTOM of the player list
- A blowout game might have one team in the 60s-70s and another in single digits

STEP 2 - FIND QUARTER SCORES:
- Look for boxes labeled "1ST Q" or "FIRST Q SCORE", "FIRST HALF SCORE", "3RD Q" or "THIRD Q SCORE", "FINAL SCORE"
- These are CUMULATIVE scores, not per-quarter
- Convert to per-quarter: Q1=1stQ, Q2=Half-Q1, Q3=3rdQ-Half, Q4=Final-3rdQ

STEP 3 - FIND INDIVIDUAL POINTS:
- The "TP" column is the LAST column on the right side of the player grid (stands for "Total Points")
- DO NOT confuse TP with other columns like fouls, assists, or quarter-by-quarter scoring
- The TP column values should be small numbers (typically 2-30 per player)
- VALIDATION: All TP values added together MUST equal the team's final score

STEP 4 - MATCH PLAYERS TO ROSTER:
- Look at jersey "NO." column to identify players
- Use the roster below for correct name spellings

${rosterRef}

CRITICAL VALIDATION BEFORE RESPONDING:
1. Add up all awayScorers points - MUST equal awayFinal
2. Add up all homeScorers points - MUST equal homeFinal  
3. If the math doesn't work, you read something wrong - re-examine the image
4. In blowout games (40+ point difference), double-check you read the losing team's low score correctly

RETURN ONLY valid JSON (no markdown, no explanation):
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

ONLY include players who scored (TP > 0). Points must be NUMBERS not strings.`;

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
  
  // Format scorer line with 3PT if present
  function formatScorer(s) {
    let line = `- ${s.name}`;
    if (s.class) {
      line += ` (${s.class}${s.position ? ', ' + s.position : ''})`;
    }
    line += `: ${s.points} pts`;
    if (s.threePointers && s.threePointers > 0) {
      line += ` (${s.threePointers} 3PT)`;
    }
    return line;
  }
  
  // Format quarters with OT labels
  function formatQuarters(quarters) {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    const otCount = quarters.length - 4;
    for (let i = 1; i <= otCount; i++) {
      labels.push(otCount === 1 ? 'OT' : `OT${i}`);
    }
    return quarters.map((q, i) => `${labels[i]}: ${q}`).join(', ');
  }
  
  const hasOT = proofData.hasOT || proofData.awayQuarters.length > 4;
  
  // Build the prompt
  const prompt = `You are a sports writer for Ball603.com, covering New Hampshire high school basketball. Write an engaging game recap.

GAME RESULT: ${winner} ${winnerScore}, ${loser} ${loserScore}${hasOT ? ' (OT)' : ''}
DATE: ${proofData.date || 'Today'}
GENDER: ${proofData.gender || 'Varsity'}
DIVISION: ${proofData.division || ''}

SCORING BY PERIOD:
${proofData.awayTeam}: ${formatQuarters(proofData.awayQuarters)} = ${proofData.awayFinal}
${proofData.homeTeam}: ${formatQuarters(proofData.homeQuarters)} = ${proofData.homeFinal}

${proofData.awayTeam} SCORERS:
${awayScorersEnhanced.map(formatScorer).join('\n')}

${proofData.homeTeam} SCORERS:
${homeScorersEnhanced.map(formatScorer).join('\n')}

${proofData.notes ? `NOTES: ${proofData.notes}` : ''}

STYLE GUIDELINES:
- Write in an energetic, engaging sports journalism style
- Lead with the most exciting aspect (comeback, star performance, dominant win, overtime thriller, etc.)
- Mention class year (junior, senior, etc.) when referencing key players
- If a player had notable three-point shooting (3+ threes), mention it in the article
- Keep paragraphs short and punchy  
- Include period-by-period narrative if scores show an interesting flow
- If game went to overtime, emphasize the drama and clutch plays
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
