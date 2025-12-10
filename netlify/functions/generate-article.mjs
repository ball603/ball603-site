// AI Article Generation using Claude API
// Supports three modes: 'extract' (read scorebook), 'write' (generate from scorebook data), 'boxscore' (parse pasted boxscore)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Mascot to Emoji mapping
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
  'Demons': '😈',
  'Penmen': '🖊️',
  'Wildcats': '🐱'
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
  'Wilton-Lyndeborough': 'WL',
  // Collegiate
  'UNH': 'UNH',
  'Dartmouth': 'DART',
  'SNHU': 'SNHU',
  'Saint Anselm': 'SA',
  'Franklin Pierce': 'FPU',
  'Keene State': 'KSC',
  'Plymouth State': 'PSU',
  'New England College': 'NEC',
  'Colby-Sawyer': 'CSC',
  'Rivier': 'RIV'
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
    } else if (mode === 'boxscore') {
      return await handleBoxscore(body, headers);
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
- THE HIGHEST CROSSED-OFF/CIRCLED NUMBER = FINAL SCORE
- Also check the "TEAM TOTALS" row at the BOTTOM of the player list

STEP 2 - FIND QUARTER SCORES:
- Look for boxes labeled "1ST Q", "FIRST HALF SCORE", "3RD Q", "FINAL SCORE"
- Convert to per-quarter: Q1=1stQ, Q2=Half-Q1, Q3=3rdQ-Half, Q4=Final-3rdQ

STEP 3 - FIND INDIVIDUAL POINTS:
- The "TP" column is the LAST column (Total Points)
- VALIDATION: All TP values added together MUST equal the team's final score

STEP 4 - MATCH PLAYERS TO ROSTER:
${rosterRef}

RETURN ONLY valid JSON:
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

  const messageContent = [];
  
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
    return { statusCode: response.status, headers, body: JSON.stringify({ error: 'Failed to extract box score', details: errorText }) };
  }
  
  const data = await response.json();
  const rawText = data.content?.[0]?.text || '';
  
  let extracted;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to parse extracted data', raw: rawText }) };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, extracted })
  };
}

// Mode 2: Write article from scorebook data (high school)
async function handleWrite(body, headers) {
  const { proofData, awayRoster, homeRoster, schoolData, photographerName, galleryUrl } = body;
  
  if (!proofData) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Proof data required' }) };
  }
  
  function getPlayerInfo(name, roster) {
    if (!roster?.players) return null;
    return roster.players.find(p => 
      p.name.toLowerCase() === name.toLowerCase() ||
      p.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(p.name.toLowerCase())
    );
  }
  
  const awayScorersEnhanced = proofData.awayScorers.map(s => {
    const info = getPlayerInfo(s.name, awayRoster);
    return { ...s, class: info?.class || '', position: info?.position || '', number: info?.number || '' };
  });
  
  const homeScorersEnhanced = proofData.homeScorers.map(s => {
    const info = getPlayerInfo(s.name, homeRoster);
    return { ...s, class: info?.class || '', position: info?.position || '', number: info?.number || '' };
  });
  
  const awayScore = parseInt(proofData.awayFinal) || 0;
  const homeScore = parseInt(proofData.homeFinal) || 0;
  const awayWon = awayScore > homeScore;
  const winner = awayWon ? proofData.awayTeam : proofData.homeTeam;
  const loser = awayWon ? proofData.homeTeam : proofData.awayTeam;
  const winnerScore = Math.max(awayScore, homeScore);
  const loserScore = Math.min(awayScore, homeScore);
  
  const awaySchoolInfo = schoolData?.away || {};
  const homeSchoolInfo = schoolData?.home || {};
  const winnerSchoolInfo = awayWon ? awaySchoolInfo : homeSchoolInfo;
  const gameTown = homeSchoolInfo.town || proofData.homeTeam;
  
  function formatScorer(s) {
    let line = `- ${s.name}`;
    if (s.class) line += ` (${s.class}${s.position ? ', ' + s.position : ''})`;
    line += `: ${s.points} pts`;
    if (s.threePointers && s.threePointers > 0) line += ` (${s.threePointers} 3PT)`;
    return line;
  }
  
  function formatQuarters(quarters) {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    const otCount = quarters.length - 4;
    for (let i = 1; i <= otCount; i++) labels.push(otCount === 1 ? 'OT' : `OT${i}`);
    return quarters.map((q, i) => `${labels[i]}: ${q}`).join(', ');
  }
  
  const hasOT = proofData.hasOT || proofData.awayQuarters.length > 4;
  
  function formatGameDate(dateStr) {
    if (!dateStr) return 'Friday night';
    try {
      const date = new Date(dateStr);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()] + ' night';
    } catch { return 'Friday night'; }
  }
  
  const gameDay = formatGameDate(proofData.date);
  const winnerScorers = awayWon ? awayScorersEnhanced : homeScorersEnhanced;
  const loserScorers = awayWon ? homeScorersEnhanced : awayScorersEnhanced;
  const doubleDigitWinner = winnerScorers.filter(s => s.points >= 10);
  const doubleDigitLoser = loserScorers.filter(s => s.points >= 10);
  const allScorers = [...awayScorersEnhanced, ...homeScorersEnhanced];
  const highScorer = allScorers.reduce((max, s) => s.points > max.points ? s : max, { points: 0 });
  const has25PlusScorer = highScorer.points >= 25;
  
  const prompt = `You are a factual sports reporter for Ball603.com, covering New Hampshire high school basketball. Write a straightforward game recap based ONLY on the facts provided.

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

MANDATORY STYLE GUIDELINES:
1. DATELINE: Start with "${gameTown.toUpperCase()}, N.H. – " and then begin the story
2. FIRST PARAGRAPH: State who won, final score, location, and date. Include top scorer if they scored 20+ points.
3. BODY: Report the facts. Mention quarter scoring if relevant. ALTERNATE between school name and mascot.
4. SCORING PARAGRAPH: List all double-digit scorers for both teams with their point totals.
5. LENGTH: 250-350 words. Be concise.
6. TONE: Factual and straightforward. Report what happened, not how exciting it was.

STRICT RULES - DO NOT:
- Speculate about player emotions, motivations, or thoughts
- Use dramatic words like "dominated," "exploded," "heroic," "clutch," "electric," "sizzling"
- Invent narrative drama or momentum shifts you can't prove from the stats
- Add commentary about the "meaning" of the game
- Use exclamation points
- Describe plays you didn't witness (only report scoring totals)

DO:
- State facts from the scorebook
- Use neutral verbs: "scored," "led," "added," "contributed," "finished with"
- Let the numbers speak for themselves
- Keep sentences short and direct

DO NOT include a headline - just the article body starting with the dateline.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
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
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: `Write a headline under 45 characters for this game. Use school name not mascot. No score. Just the headline.\n\nGame: ${winner} defeated ${loser} ${winnerScore}-${loserScore}` }]
    })
  });
  
  let headline = `${winner} Tops ${loser}`;
  if (headlineResponse.ok) {
    const hd = await headlineResponse.json();
    let gen = hd.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || headline;
    if (gen.length > 45) gen = gen.substring(0, 42) + '...';
    headline = gen;
  }
  
  const excerpt = article.split('.').slice(0, 2).join('.').trim() + '.';
  
  // Generate social posts
  const winnerMascot = winnerSchoolInfo.mascot || '';
  const winnerEmoji = winnerSchoolInfo.emoji || MASCOT_EMOJIS[winnerMascot] || '🏀';
  const winnerAbbrev = SCHOOL_ABBREVIATIONS[winner] || winner.substring(0, 3).toUpperCase();
  const loserAbbrev = SCHOOL_ABBREVIATIONS[loser] || loser.substring(0, 3).toUpperCase();
  
  // Sort scorers by points (highest first)
  const sortedWinnerScorers = [...winnerScorers].sort((a, b) => b.points - a.points);
  const sortedLoserScorers = [...loserScorers].sort((a, b) => b.points - a.points);
  
  // Format scorers for Instagram: "Watson (11), Moulton (10)"
  function formatIgScorers(scorers) {
    const top = scorers.filter(s => s.points >= 10);
    const list = top.length > 0 ? top : [scorers[0]].filter(Boolean);
    return list.map(s => `${s.name.split(' ').pop()} (${s.points})`).join(', ');
  }
  
  // Format scorers for Twitter: "Watson-11, Moulton-10"
  function formatTwitterScorers(scorers) {
    const top = scorers.filter(s => s.points >= 10);
    const list = top.length > 0 ? top : [scorers[0]].filter(Boolean);
    return list.map(s => `${s.name.split(' ').pop()}-${s.points}`).join(', ');
  }
  
  const igHeader = `${winnerEmoji} 🏀 ${winner} ${winnerScore}, ${loser} ${loserScore} 🏀`;
  
  const articleSentences = article.replace(/^[A-Z]+,\s*N\.H\.\s*[–-]\s*/, '').split(/(?<=[.!?])\s+/);
  const igLede = articleSentences.slice(0, 2).join(' ');
  
  let facebookPost = article;
  if (photographerName && galleryUrl) facebookPost += `\n\nCheck out the full photo gallery by ${photographerName} over at ${galleryUrl}`;
  else if (galleryUrl) facebookPost += `\n\nCheck out the full photo gallery over at ${galleryUrl}`;
  
  let instagramPost = `${igHeader}\n\n${igLede}\n\n📊 Leading Scorers\n${winnerAbbrev}: ${formatIgScorers(sortedWinnerScorers)}\n${loserAbbrev}: ${formatIgScorers(sortedLoserScorers)}\n\n`;
  instagramPost += photographerName ? `READ MORE & check out the full photo gallery by ${photographerName} over at Ball603.com` : `READ MORE & check out the full photo gallery over at Ball603.com`;
  
  let twitterPost = `${igHeader}\n\n${winnerAbbrev}: ${formatTwitterScorers(sortedWinnerScorers)}\n${loserAbbrev}: ${formatTwitterScorers(sortedLoserScorers)}\n\n`;
  twitterPost += galleryUrl ? `READ MORE & check out the full gallery over at ${galleryUrl}` : `READ MORE & check out the full gallery over at Ball603.com`;
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, headline, article, excerpt, facebookPost, instagramPost, twitterPost, winnerEmoji, gameTown })
  };
}

// Mode 3: Write article from pasted boxscore (collegiate with full stats)
async function handleBoxscore(body, headers) {
  const { boxscoreText, gameInfo, notes, schoolData, photographerName, galleryUrl } = body;
  
  if (!boxscoreText) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Boxscore text required' }) };
  }
  
  const awaySchoolInfo = schoolData?.away || {};
  const homeSchoolInfo = schoolData?.home || {};
  const gameTown = homeSchoolInfo.town || gameInfo.homeTeam;
  
  function formatGameDate(dateStr) {
    if (!dateStr) return 'Saturday night';
    try {
      const date = new Date(dateStr);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()] + ' night';
    } catch { return 'Saturday night'; }
  }
  
  const gameDay = formatGameDate(gameInfo.date);
  
  // First, have Claude parse the boxscore to extract structured data
  const parsePrompt = `Parse this basketball boxscore and extract the data. Return ONLY valid JSON.

BOXSCORE:
${boxscoreText}

EXPECTED TEAMS: ${gameInfo.awayTeam} (away) vs ${gameInfo.homeTeam} (home)

Return JSON in this exact format:
{
  "awayTeam": "Team Name",
  "homeTeam": "Team Name",
  "awayScore": number,
  "homeScore": number,
  "periodScores": {
    "away": [array of period scores],
    "home": [array of period scores]
  },
  "awayPlayers": [
    {"name": "Full Name", "minutes": 0, "points": 0, "rebounds": 0, "assists": 0, "steals": 0, "blocks": 0, "turnovers": 0, "fgMade": 0, "fgAttempted": 0, "threeMade": 0, "threeAttempted": 0, "ftMade": 0, "ftAttempted": 0}
  ],
  "homePlayers": [same format],
  "teamStats": {
    "away": {"totalRebounds": 0, "teamAssists": 0, "teamSteals": 0, "teamBlocks": 0, "teamTurnovers": 0, "fgPercent": "0%", "threePercent": "0%", "ftPercent": "0%"},
    "home": {same format}
  }
}

Include all available stats. Use 0 for any stats not provided. Include all players who played.`;

  const parseResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 3000, messages: [{ role: 'user', content: parsePrompt }] })
  });
  
  if (!parseResponse.ok) {
    const errorText = await parseResponse.text();
    return { statusCode: parseResponse.status, headers, body: JSON.stringify({ error: 'Failed to parse boxscore', details: errorText }) };
  }
  
  const parseData = await parseResponse.json();
  const parseText = parseData.content?.[0]?.text || '';
  
  let boxData;
  try {
    const jsonMatch = parseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      boxData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to parse boxscore data', raw: parseText }) };
  }
  
  // Determine winner/loser
  const awayScore = boxData.awayScore || 0;
  const homeScore = boxData.homeScore || 0;
  const awayWon = awayScore > homeScore;
  const winner = awayWon ? boxData.awayTeam : boxData.homeTeam;
  const loser = awayWon ? boxData.homeTeam : boxData.awayTeam;
  const winnerScore = Math.max(awayScore, homeScore);
  const loserScore = Math.min(awayScore, homeScore);
  const winnerPlayers = awayWon ? boxData.awayPlayers : boxData.homePlayers;
  const loserPlayers = awayWon ? boxData.homePlayers : boxData.awayPlayers;
  
  // Format player stats for the prompt
  function formatPlayerStats(players) {
    return players.map(p => {
      let line = `${p.name}: ${p.points} pts`;
      if (p.rebounds) line += `, ${p.rebounds} reb`;
      if (p.assists) line += `, ${p.assists} ast`;
      if (p.steals) line += `, ${p.steals} stl`;
      if (p.blocks) line += `, ${p.blocks} blk`;
      if (p.threeMade) line += ` (${p.threeMade}-${p.threeAttempted} 3PT)`;
      return line;
    }).join('\n');
  }
  
  // Build article prompt
  const articlePrompt = `You are a factual sports reporter for Ball603.com. Write a straightforward game recap for this collegiate basketball game based ONLY on the facts provided.

GAME RESULT: ${winner} ${winnerScore}, ${loser} ${loserScore}
LOCATION: ${gameTown}
DATE: ${gameDay}
GENDER: ${gameInfo.gender || 'Men'}

${boxData.awayTeam} PLAYERS:
${formatPlayerStats(boxData.awayPlayers || [])}

${boxData.homeTeam} PLAYERS:
${formatPlayerStats(boxData.homePlayers || [])}

TEAM STATS:
${boxData.awayTeam}: FG ${boxData.teamStats?.away?.fgPercent || 'N/A'}, 3PT ${boxData.teamStats?.away?.threePercent || 'N/A'}, FT ${boxData.teamStats?.away?.ftPercent || 'N/A'}
${boxData.homeTeam}: FG ${boxData.teamStats?.home?.fgPercent || 'N/A'}, 3PT ${boxData.teamStats?.home?.threePercent || 'N/A'}, FT ${boxData.teamStats?.home?.ftPercent || 'N/A'}

${notes ? `ADDITIONAL NOTES: ${notes}` : ''}

MANDATORY STYLE GUIDELINES:
1. DATELINE: Start with "${gameTown.toUpperCase()} – " and then begin the story
2. FIRST PARAGRAPH: State who won, final score, location, and date. Include any 20+ point scorers.
3. BODY: Report the facts. Include relevant stats like rebounds, assists, shooting percentages.
4. SCORING/STATS PARAGRAPH: List key performers with their stat lines.
5. LENGTH: 300-400 words. Be concise.
6. TONE: Factual and straightforward. Report what happened.

STRICT RULES - DO NOT:
- Speculate about player emotions, motivations, or thoughts
- Use dramatic words like "dominated," "exploded," "heroic," "clutch," "electric"
- Invent narrative drama or momentum shifts you can't prove from the stats
- Add commentary about the "meaning" of the game
- Use exclamation points

DO:
- State facts from the boxscore
- Use neutral verbs: "scored," "led," "added," "contributed," "finished with"
- Let the numbers speak for themselves
- Keep sentences short and direct

DO NOT include a headline - just the article body starting with the dateline.`;

  const articleResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: articlePrompt }] })
  });
  
  if (!articleResponse.ok) {
    const errorText = await articleResponse.text();
    return { statusCode: articleResponse.status, headers, body: JSON.stringify({ error: 'Failed to generate article', details: errorText }) };
  }
  
  const articleData = await articleResponse.json();
  const article = articleData.content?.[0]?.text || '';
  
  // Generate headline
  const headlineResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: `Write a headline under 45 characters for this game. Use school name not mascot. No score. Just the headline.\n\nGame: ${winner} defeated ${loser} ${winnerScore}-${loserScore}` }]
    })
  });
  
  let headline = `${winner} Tops ${loser}`;
  if (headlineResponse.ok) {
    const hd = await headlineResponse.json();
    let gen = hd.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || headline;
    if (gen.length > 45) gen = gen.substring(0, 42) + '...';
    headline = gen;
  }
  
  const excerpt = article.split('.').slice(0, 2).join('.').trim() + '.';
  
  // Generate social posts
  const winnerSchoolInfo = awayWon ? awaySchoolInfo : homeSchoolInfo;
  const winnerMascot = winnerSchoolInfo.mascot || '';
  const winnerEmoji = winnerSchoolInfo.emoji || MASCOT_EMOJIS[winnerMascot] || '🏀';
  const winnerAbbrev = SCHOOL_ABBREVIATIONS[winner] || winner.substring(0, 3).toUpperCase();
  const loserAbbrev = SCHOOL_ABBREVIATIONS[loser] || loser.substring(0, 3).toUpperCase();
  
  // Sort players by points (highest first)
  const sortedWinnerPlayers = [...(winnerPlayers || [])].sort((a, b) => b.points - a.points);
  const sortedLoserPlayers = [...(loserPlayers || [])].sort((a, b) => b.points - a.points);
  
  // Format scorers for Instagram: "Watson (11), Moulton (10)"
  function formatIgScorers(players) {
    const top = (players || []).filter(p => p.points >= 10);
    const list = top.length > 0 ? top : [players[0]].filter(Boolean);
    return list.map(p => `${p.name.split(' ').pop()} (${p.points})`).join(', ');
  }
  
  // Format scorers for Twitter: "Watson-11, Moulton-10"
  function formatTwitterScorers(players) {
    const top = (players || []).filter(p => p.points >= 10);
    const list = top.length > 0 ? top : [players[0]].filter(Boolean);
    return list.map(p => `${p.name.split(' ').pop()}-${p.points}`).join(', ');
  }
  
  const igHeader = `${winnerEmoji} 🏀 ${winner} ${winnerScore}, ${loser} ${loserScore} 🏀`;
  
  const articleSentences = article.replace(/^[A-Z]+\s*[–-]\s*/, '').split(/(?<=[.!?])\s+/);
  const igLede = articleSentences.slice(0, 2).join(' ');
  
  let facebookPost = article;
  if (photographerName && galleryUrl) facebookPost += `\n\nCheck out the full photo gallery by ${photographerName} over at ${galleryUrl}`;
  else if (galleryUrl) facebookPost += `\n\nCheck out the full photo gallery over at ${galleryUrl}`;
  
  let instagramPost = `${igHeader}\n\n${igLede}\n\n📊 Leading Scorers\n${winnerAbbrev}: ${formatIgScorers(sortedWinnerPlayers)}\n${loserAbbrev}: ${formatIgScorers(sortedLoserPlayers)}\n\n`;
  instagramPost += photographerName ? `READ MORE & check out the full photo gallery by ${photographerName} over at Ball603.com` : `READ MORE & check out the full photo gallery over at Ball603.com`;
  
  let twitterPost = `${igHeader}\n\n${winnerAbbrev}: ${formatTwitterScorers(sortedWinnerPlayers)}\n${loserAbbrev}: ${formatTwitterScorers(sortedLoserPlayers)}\n\n`;
  twitterPost += galleryUrl ? `READ MORE & check out the full gallery over at ${galleryUrl}` : `READ MORE & check out the full gallery over at Ball603.com`;
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      headline, 
      article, 
      excerpt, 
      facebookPost, 
      instagramPost, 
      twitterPost,
      winnerEmoji,
      gameTown,
      parsedData: boxData // Include parsed data for debugging
    })
  };
}
