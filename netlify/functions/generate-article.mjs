// AI Article Generation using Claude API
// Generates 4 versions: Full Article (AP Style), Facebook, Instagram, Twitter

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Mascot to Emoji mapping - will be expanded as you provide more
const MASCOT_EMOJIS = {
  'Tigers': '🐅',
  'Bears': '🐻',
  'Bulldogs': '🐶',
  'Eagles': '🦅',
  'Hawks': '🦅',
  'Falcons': '🦅',
  'Panthers': '🐆',
  'Cougars': '🐆',
  'Lions': '🦁',
  'Wolves': '🐺',
  'Cardinals': '🐦',
  'Blue Jays': '🐦',
  'Wildcats': '🐱',
  'Bobcats': '🐱',
  'Rams': '🐏',
  'Broncos': '🐴',
  'Mustangs': '🐴',
  'Colts': '🐴',
  'Knights': '⚔️',
  'Crusaders': '⚔️',
  'Warriors': '⚔️',
  'Spartans': '⚔️',
  'Giants': '🏔️',
  'Mountaineers': '⛰️',
  'Huskies': '🐕',
  'Timberwolves': '🐺',
  'Red Raiders': '🔴',
  'Raiders': '🏴‍☠️',
  'Pirates': '🏴‍☠️',
  'Sailors': '⛵',
  'Clippers': '⛵',
  'Yellow Jackets': '🐝',
  'Hornets': '🐝',
  'Astros': '⭐',
  'Stars': '⭐',
  'Comets': '☄️',
  'Thunder': '⚡',
  'Storm': '🌩️',
  'Tomahawks': '🪓',
  'Mohawks': '🪶',
  'Sachems': '🪶',
  'Timber Wolves': '🐺',
  'Owls': '🦉',
  'Skyhawks': '🦅',
  'Blue Devils': '😈',
  'Devils': '😈',
  'Demons': '😈'
};

// School abbreviations for Twitter
const SCHOOL_ABBREVIATIONS = {
  'Farmington': 'FHS',
  'Epping': 'EHS',
  'Portsmouth': 'PHS',
  'Dover': 'DHS',
  'Exeter': 'EHS',
  'Londonderry': 'LHS',
  'Manchester Central': 'MCH',
  'Manchester Memorial': 'MMH',
  'Manchester West': 'MWH',
  'Nashua North': 'NNH',
  'Nashua South': 'NSH',
  'Concord': 'CHS',
  'Keene': 'KHS',
  'Bedford': 'BHS',
  'Merrimack': 'MHS',
  'Windham': 'WHS',
  'Salem': 'SHS',
  'Pinkerton': 'PA',
  'Timberlane': 'THS',
  'Spaulding': 'SHS',
  'Bishop Guertin': 'BG',
  'Bishop Brady': 'BB',
  'Derryfield': 'DER',
  'Trinity': 'THS',
  'St. Thomas': 'STA',
  'Alvirne': 'AHS',
  'Hollis-Brookline': 'HB',
  'Souhegan': 'SOU',
  'Milford': 'MHS',
  'Coe-Brown': 'CBNA',
  'Prospect Mountain': 'PM',
  'Gilford': 'GHS',
  'Laconia': 'LHS',
  'Winnisquam': 'WHS',
  'Belmont': 'BHS',
  'Inter-Lakes': 'IL',
  'Berlin': 'BHS',
  'White Mountains': 'WM',
  'Profile': 'PHS',
  'Littleton': 'LHS',
  'Lisbon': 'LHS',
  'Pittsburg': 'PHS',
  'Colebrook': 'CHS',
  'Gorham': 'GHS',
  'Lin-Wood': 'LW',
  'Groveton': 'GHS',
  'Woodsville': 'WHS',
  'Raymond': 'RHS',
  'Sanborn': 'SHS',
  'Campbell': 'CHS',
  'Bow': 'BHS',
  'Hopkinton': 'HHS',
  'John Stark': 'JS',
  'Hillsboro-Deering': 'HD',
  'Conant': 'CHS',
  'Conval': 'CON',
  'Monadnock': 'MHS',
  'Fall Mountain': 'FM',
  'Stevens': 'SHS',
  'Newport': 'NHS',
  'Sunapee': 'SUH',
  'Mascoma': 'MAS',
  'Lebanon': 'LHS',
  'Hanover': 'HHS',
  'Plymouth': 'PHS',
  'Kennett': 'KHS',
  'Moultonborough': 'MHS',
  'Kingswood': 'KHS',
  'Newfound': 'NRH',
  'Franklin': 'FHS',
  'Winnacunnet': 'WHS',
  'Oyster River': 'OR',
  'Somersworth': 'SHS',
  'St. Thomas Aquinas': 'STA',
  'Newmarket': 'NHS',
  'Nute': 'NHS',
  'Pittsfield': 'PHS',
  'Mascenic': 'MAS',
  'Hinsdale': 'HHS',
  'Wilton-Lyndeborough': 'WL'
};

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

// Mode 2: Write all 4 article versions from confirmed proof data
async function handleWrite(body, headers) {
  const { proofData, awayRoster, homeRoster, schoolData, photographerName, galleryUrl } = body;
  
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
  
  // Determine winner/loser
  const awayScore = parseInt(proofData.awayFinal) || 0;
  const homeScore = parseInt(proofData.homeFinal) || 0;
  const awayWon = awayScore > homeScore;
  const winner = awayWon ? proofData.awayTeam : proofData.homeTeam;
  const loser = awayWon ? proofData.homeTeam : proofData.awayTeam;
  const winnerScore = Math.max(awayScore, homeScore);
  const loserScore = Math.min(awayScore, homeScore);
  
  // Get school info for winner and loser
  const awaySchoolInfo = schoolData?.away || {};
  const homeSchoolInfo = schoolData?.home || {};
  const winnerSchoolInfo = awayWon ? awaySchoolInfo : homeSchoolInfo;
  const loserSchoolInfo = awayWon ? homeSchoolInfo : awaySchoolInfo;
  
  // Get mascots
  const winnerMascot = winnerSchoolInfo.mascot || '';
  const loserMascot = loserSchoolInfo.mascot || '';
  
  // Get town for dateline (home team's town)
  const gameTown = homeSchoolInfo.town || proofData.homeTeam;
  
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
  
  // Format date for article
  function formatGameDate(dateStr) {
    if (!dateStr) return 'Friday night';
    try {
      const date = new Date(dateStr);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()] + ' night';
    } catch {
      return 'Friday night';
    }
  }
  
  const gameDay = formatGameDate(proofData.date);
  
  // Get double-digit scorers
  const winnerScorers = awayWon ? awayScorersEnhanced : homeScorersEnhanced;
  const loserScorers = awayWon ? homeScorersEnhanced : awayScorersEnhanced;
  const doubleDigitWinner = winnerScorers.filter(s => s.points >= 10);
  const doubleDigitLoser = loserScorers.filter(s => s.points >= 10);
  
  // Check for 25+ point scorer for lede
  const allScorers = [...awayScorersEnhanced, ...homeScorersEnhanced];
  const highScorer = allScorers.reduce((max, s) => s.points > max.points ? s : max, { points: 0 });
  const has25PlusScorer = highScorer.points >= 25;
  
  // Build the prompt for full article
  const prompt = `You are a veteran sports journalist writing for Ball603.com, covering New Hampshire high school basketball. Write an AP-style game recap following these EXACT guidelines:

GAME RESULT: ${winner} ${winnerScore}, ${loser} ${loserScore}${hasOT ? ' (OT)' : ''}
LOCATION: ${gameTown}, N.H.
DATE: ${gameDay}
GENDER: ${proofData.gender || 'Varsity'}
DIVISION: ${proofData.division || ''}

SCORING BY PERIOD:
${proofData.awayTeam}: ${formatQuarters(proofData.awayQuarters)} = ${proofData.awayFinal}
${proofData.homeTeam}: ${formatQuarters(proofData.homeQuarters)} = ${proofData.homeFinal}

${proofData.awayTeam} (${awaySchoolInfo.mascot || 'Team'}) SCORERS:
${awayScorersEnhanced.map(formatScorer).join('\n')}

${proofData.homeTeam} (${homeSchoolInfo.mascot || 'Team'}) SCORERS:
${homeScorersEnhanced.map(formatScorer).join('\n')}

${proofData.notes ? `NOTES: ${proofData.notes}` : ''}

MANDATORY STYLE GUIDELINES - FOLLOW EXACTLY:

1. DATELINE: Start with "${gameTown.toUpperCase()}, N.H. – " and then begin the story

2. FIRST PARAGRAPH (LEDE): Must include:
   - Who: Both school names
   - What: The outcome (who defeated whom)
   - Where: The location
   - When: ${gameDay}
   ${has25PlusScorer ? `- Include ${highScorer.name} with ${highScorer.points} points in the lede since they scored 25+` : ''}

3. BODY: 
   - Before writing, analyze the quarter scores to find the compelling narrative:
     * Did one team start strong or finish strong?
     * Was there a comeback?
     * Was there a dominant scoring performance?
     * Were there a lot of threes made?
   - Tell that story in the body paragraphs
   - ALTERNATE between school name and mascot (e.g., "Farmington took the lead... The Tigers extended it...")

4. SCORING PARAGRAPH: After the game narrative, list double-digit scorers:
   - Winner's double-digit scorers: ${doubleDigitWinner.length > 0 ? doubleDigitWinner.map(s => `${s.name} (${s.points})`).join(', ') : 'Top scorer: ' + winnerScorers[0]?.name + ' (' + winnerScorers[0]?.points + ')'}
   - Loser's double-digit scorers: ${doubleDigitLoser.length > 0 ? doubleDigitLoser.map(s => `${s.name} (${s.points})`).join(', ') : 'Top scorer: ' + loserScorers[0]?.name + ' (' + loserScorers[0]?.points + ')'}

5. RECORDS PARAGRAPH: Include team records at the end (you can reference win/loss streaks if known)

6. LENGTH: Minimum 300 words, aim for 350-400 words

7. TONE: Professional AP sports journalism style, aimed at parents and fans

DO NOT include a headline - just the article body starting with the dateline.

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
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Failed to generate article', details: errorText }) };
  }
  
  const data = await response.json();
  const article = data.content?.[0]?.text || '';
  
  // Generate headline (under 45 characters, school name not mascot, no score)
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
        content: `Write a short, punchy headline for this high school basketball game recap.

RULES:
- MUST be under 45 characters (this is critical for graphics)
- Use SCHOOL NAME, not mascot (e.g., "Farmington" not "Tigers")
- Do NOT include the score in the headline
- Make it engaging and descriptive of the game's story

Game: ${winner} defeated ${loser} ${winnerScore}-${loserScore}${hasOT ? ' in overtime' : ''}
${proofData.notes ? `Key storyline: ${proofData.notes}` : ''}
${has25PlusScorer ? `High scorer: ${highScorer.name} with ${highScorer.points} points` : ''}

Just output the headline, nothing else.`
      }]
    })
  });
  
  let headline = `${winner} Tops ${loser}`;
  if (headlineResponse.ok) {
    const headlineData = await headlineResponse.json();
    let generatedHeadline = headlineData.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || headline;
    // Ensure it's under 45 characters
    if (generatedHeadline.length > 45) {
      generatedHeadline = generatedHeadline.substring(0, 42) + '...';
    }
    headline = generatedHeadline;
  }
  
  // Generate excerpt (first 1-2 sentences for previews)
  const excerpt = article.split('.').slice(0, 2).join('.').trim() + '.';
  
  // --- Generate Social Media Versions ---
  
  // Get mascot emoji for winner
  const winnerEmoji = MASCOT_EMOJIS[winnerMascot] || '🏀';
  
  // Get school abbreviations
  const awayAbbrev = SCHOOL_ABBREVIATIONS[proofData.awayTeam] || proofData.awayTeam.substring(0, 3).toUpperCase();
  const homeAbbrev = SCHOOL_ABBREVIATIONS[proofData.homeTeam] || proofData.homeTeam.substring(0, 3).toUpperCase();
  
  // Format scorers for Twitter (last names only)
  function formatTwitterScorers(scorers, abbrev) {
    const top = scorers.filter(s => s.points >= 10);
    const scorerList = top.length > 0 ? top : [scorers[0]].filter(Boolean);
    return scorerList.map(s => {
      const lastName = s.name.split(' ').pop();
      return `${lastName} (${s.points})`;
    }).join(', ');
  }
  
  // Build Instagram header line
  // Format: 🐅🏀 at Farmington 55, Epping 44 🏀
  const igHeader = `${winnerEmoji}🏀 at ${proofData.homeTeam} ${winnerScore}, ${loserScore} 🏀`;
  
  // Get top scorers for IG
  const igScorers = [];
  if (winnerScorers[0]) igScorers.push(`${winnerScorers[0].name} (${winner}): ${winnerScorers[0].points} pts`);
  if (loserScorers[0]) igScorers.push(`${loserScorers[0].name} (${loser}): ${loserScorers[0].points} pts`);
  
  // Build Twitter header (same as IG)
  const twitterHeader = igHeader;
  
  // Twitter scorers by team
  const awayTwitterScorers = formatTwitterScorers(awayScorersEnhanced, awayAbbrev);
  const homeTwitterScorers = formatTwitterScorers(homeScorersEnhanced, homeAbbrev);
  
  // Assemble all versions
  
  // 1. FULL ARTICLE (already generated above)
  const fullArticle = article;
  
  // 2. FACEBOOK: Full story + gallery CTA
  let facebookPost = article;
  if (photographerName && galleryUrl) {
    facebookPost += `\n\nCheck out the full photo gallery by ${photographerName} over at ${galleryUrl}`;
  } else if (galleryUrl) {
    facebookPost += `\n\nCheck out the full photo gallery over at ${galleryUrl}`;
  }
  
  // 3. INSTAGRAM: Abbreviated with emojis
  // Get a short lede (first sentence after dateline)
  const articleSentences = article.replace(/^[A-Z]+,\s*N\.H\.\s*[–-]\s*/, '').split(/(?<=[.!?])\s+/);
  const igLede = articleSentences.slice(0, 2).join(' ');
  
  let instagramPost = `${igHeader}\n\n`;
  instagramPost += `${igLede}\n\n`;
  instagramPost += `📊 Leading Scorers:\n${igScorers.join('\n')}\n\n`;
  if (photographerName) {
    instagramPost += `READ MORE & check out the full photo gallery by ${photographerName} over at Ball603.com`;
  } else {
    instagramPost += `READ MORE & check out the full photo gallery over at Ball603.com`;
  }
  
  // 4. TWITTER: Header + scorers by team
  let twitterPost = `${twitterHeader}\n\n`;
  twitterPost += `${awayAbbrev}: ${awayTwitterScorers}\n`;
  twitterPost += `${homeAbbrev}: ${homeTwitterScorers}\n\n`;
  if (galleryUrl) {
    twitterPost += `READ MORE & check out the full gallery over at ${galleryUrl}`;
  } else {
    twitterPost += `READ MORE & check out the full gallery over at Ball603.com`;
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      headline, 
      article: fullArticle,
      excerpt,
      // Social versions
      facebookPost,
      instagramPost,
      twitterPost,
      // Metadata for debugging/display
      winnerEmoji,
      gameTown
    })
  };
}
