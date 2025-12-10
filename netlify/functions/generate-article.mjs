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
    } else if (mode === 'social') {
      return await handleSocial(body, headers);
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
    // Only use first position if dual position (G/F -> G, F/C -> F)
    let position = s.position || '';
    if (position.includes('/')) {
      position = position.split('/')[0];
    }
    if (s.class) line += ` (${s.class}${position ? ', ' + position : ''})`;
    line += `: ${s.points} pts`;
    // Only include three-pointers if 3 or more
    if (s.threePointers && s.threePointers >= 3) line += ` (${s.threePointers} 3PT)`;
    return line;
  }
  
  // Filter scorers: only 10+ point scorers, OR just high scorer(s) if no one has 10+
  function filterScorersForArticle(scorers) {
    const doubleDigit = scorers.filter(s => s.points >= 10);
    if (doubleDigit.length > 0) {
      return doubleDigit;
    }
    // No double-digit scorers - return only high scorer(s) including ties
    if (scorers.length === 0) return [];
    const highScore = Math.max(...scorers.map(s => s.points));
    return scorers.filter(s => s.points === highScore);
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
  
  // Pre-analyze the data to find the real story
  const quarterDiffs = proofData.awayQuarters.map((q, i) => {
    const awayQ = parseInt(q) || 0;
    const homeQ = parseInt(proofData.homeQuarters[i]) || 0;
    return { quarter: i + 1, diff: Math.abs(awayQ - homeQ), awayQ, homeQ, winnerLed: awayWon ? awayQ > homeQ : homeQ > awayQ };
  });
  const biggestQuarterSwing = quarterDiffs.reduce((max, q) => q.diff > max.diff ? q : max, { diff: 0 });
  
  // Calculate half differentials
  const awayFirstHalf = (parseInt(proofData.awayQuarters[0]) || 0) + (parseInt(proofData.awayQuarters[1]) || 0);
  const awaySecondHalf = (parseInt(proofData.awayQuarters[2]) || 0) + (parseInt(proofData.awayQuarters[3]) || 0);
  const homeFirstHalf = (parseInt(proofData.homeQuarters[0]) || 0) + (parseInt(proofData.homeQuarters[1]) || 0);
  const homeSecondHalf = (parseInt(proofData.homeQuarters[2]) || 0) + (parseInt(proofData.homeQuarters[3]) || 0);
  const firstHalfDiff = Math.abs(awayFirstHalf - homeFirstHalf);
  const secondHalfDiff = Math.abs(awaySecondHalf - homeSecondHalf);
  const winnerFirstHalf = awayWon ? awayFirstHalf : homeFirstHalf;
  const loserFirstHalf = awayWon ? homeFirstHalf : awayFirstHalf;
  const winnerSecondHalf = awayWon ? awaySecondHalf : homeSecondHalf;
  const loserSecondHalf = awayWon ? homeSecondHalf : awaySecondHalf;
  
  // Find top scorers for each team
  const winnerTopScorer = winnerScorers.reduce((max, s) => s.points > max.points ? s : max, { points: 0 });
  const loserTopScorer = loserScorers.reduce((max, s) => s.points > max.points ? s : max, { points: 0 });
  
  // Check for notable three-point shooting (3+ threes)
  function getThreePointStory(scorer) {
    if (!scorer.threePointers || scorer.threePointers < 3) return null;
    const threePointPts = scorer.threePointers * 3;
    const pctFromThree = Math.round((threePointPts / scorer.points) * 100);
    if (pctFromThree >= 50) {
      return `${scorer.name} hit ${scorer.threePointers} three-pointers (${threePointPts} of ${scorer.points} points from beyond the arc)`;
    }
    return `${scorer.name} hit ${scorer.threePointers} three-pointers`;
  }
  
  // Determine the "story" of the game - LEDE LOGIC
  let ledeStory = '';
  let gameFlowStory = '';
  let threePointStory = '';
  let seasonOpenerNote = '';
  
  // Check for season openers
  const winnerOpener = awayWon ? proofData.awaySeasonOpener : proofData.homeSeasonOpener;
  const loserOpener = awayWon ? proofData.homeSeasonOpener : proofData.awaySeasonOpener;
  
  if (winnerOpener) {
    seasonOpenerNote = `SEASON OPENER: This is ${winner}'s first game of the season - mention "season opener" or "opened their season" somewhere in the article (not necessarily the lede).`;
  } else if (loserOpener) {
    seasonOpenerNote = `SEASON OPENER: This is ${loser}'s first game of the season - mention it somewhere in the article.`;
  }
  
  // LEDE PRIORITY:
  // 1. Winner has 25+ scorer -> lead with that player
  // 2. Loser has 30+ scorer AND winner has no 20+ scorer -> "Despite X's performance..." lede
  // 3. Otherwise -> standard "Team defeated Team" lede
  
  if (winnerTopScorer.points >= 25) {
    ledeStory = `LEAD WITH WINNER'S STAR: ${winnerTopScorer.name} scored ${winnerTopScorer.points} points to lead ${winner} to victory. This player MUST be in the first sentence.`;
    const threeStory = getThreePointStory(winnerTopScorer);
    if (threeStory) threePointStory = `THREE-POINT SHOOTING: ${threeStory} - mention this prominently.`;
  } else if (loserTopScorer.points >= 30 && winnerTopScorer.points < 20) {
    ledeStory = `DESPITE LOSS PERFORMANCE: ${loserTopScorer.name} scored ${loserTopScorer.points} points in a losing effort. Start with "Despite ${loserTopScorer.name}'s ${loserTopScorer.points}-point performance, ${winner} defeated ${loser}..."`;
    const threeStory = getThreePointStory(loserTopScorer);
    if (threeStory) threePointStory = `THREE-POINT SHOOTING: ${threeStory} - mention this prominently.`;
  } else if (winnerTopScorer.points >= 20) {
    ledeStory = `LEAD SCORER: ${winnerTopScorer.name} led ${winner} with ${winnerTopScorer.points} points. Include in first paragraph.`;
    const threeStory = getThreePointStory(winnerTopScorer);
    if (threeStory) threePointStory = `THREE-POINT SHOOTING: ${threeStory}.`;
  } else {
    ledeStory = `BALANCED SCORING: No dominant individual scorer. Focus on team victory.`;
  }
  
  // Check for other notable three-point performances (3+ threes)
  const allScorersWithThrees = [...winnerScorers, ...loserScorers].filter(s => s.threePointers >= 3);
  if (!threePointStory && allScorersWithThrees.length > 0) {
    const topThreeShooter = allScorersWithThrees.reduce((max, s) => s.threePointers > max.threePointers ? s : max);
    threePointStory = `THREE-POINT SHOOTING: ${getThreePointStory(topThreeShooter)}.`;
  }
  
  // GAME FLOW - check halves first, then quarters
  if (Math.abs(winnerFirstHalf - loserFirstHalf) <= 4 && (winnerSecondHalf - loserSecondHalf) >= 10) {
    gameFlowStory = `GAME FLOW: Close first half (${winnerFirstHalf}-${loserFirstHalf}), then ${winner} pulled away in the second half, outscoring ${loser} ${winnerSecondHalf}-${loserSecondHalf}.`;
  } else if ((winnerFirstHalf - loserFirstHalf) >= 10 && Math.abs(winnerSecondHalf - loserSecondHalf) <= 4) {
    gameFlowStory = `GAME FLOW: ${winner} built a big first-half lead (${winnerFirstHalf}-${loserFirstHalf}), then teams played evenly in the second half.`;
  } else if (secondHalfDiff >= 12) {
    const secondHalfWinner = winnerSecondHalf > loserSecondHalf ? winner : loser;
    gameFlowStory = `GAME FLOW: The second half was decisive - ${secondHalfWinner} outscored opponent ${Math.max(winnerSecondHalf, loserSecondHalf)}-${Math.min(winnerSecondHalf, loserSecondHalf)} after halftime.`;
  } else if (biggestQuarterSwing.diff >= 10) {
    gameFlowStory = `KEY QUARTER: Q${biggestQuarterSwing.quarter} was the turning point with a ${biggestQuarterSwing.diff}-point differential.`;
  } else if (biggestQuarterSwing.diff >= 6) {
    gameFlowStory = `QUARTER NOTE: Q${biggestQuarterSwing.quarter} saw the biggest swing (${biggestQuarterSwing.diff}-point difference).`;
  } else {
    gameFlowStory = `GAME FLOW: Competitive throughout with no single decisive run.`;
  }

  const prompt = `You are a factual sports reporter for Ball603.com, covering New Hampshire high school basketball. Write a straightforward game recap based ONLY on the facts provided.

GAME RESULT: ${winner} ${winnerScore}, ${loser} ${loserScore}${hasOT ? ' (OT)' : ''}
LOCATION: ${gameTown}, N.H.
DATE: ${gameDay}
GENDER: ${proofData.gender || 'Varsity'}
DIVISION: ${proofData.division || ''}

SCORING BY QUARTER:
${proofData.awayTeam}: ${formatQuarters(proofData.awayQuarters)} = ${proofData.awayFinal}
${proofData.homeTeam}: ${formatQuarters(proofData.homeQuarters)} = ${proofData.homeFinal}

HALFTIME: ${proofData.awayTeam} ${awayFirstHalf}, ${proofData.homeTeam} ${homeFirstHalf}

${proofData.awayTeam} (${awaySchoolInfo.mascot || 'Team'}) SCORERS TO MENTION:
${filterScorersForArticle(awayScorersEnhanced).map(formatScorer).join('\n')}

${proofData.homeTeam} (${homeSchoolInfo.mascot || 'Team'}) SCORERS TO MENTION:
${filterScorersForArticle(homeScorersEnhanced).map(formatScorer).join('\n')}

${proofData.notes ? `NOTES: ${proofData.notes}` : ''}

=== STORY ANALYSIS (FOLLOW THESE INSTRUCTIONS) ===
${ledeStory}
${gameFlowStory}
${threePointStory || ''}
${seasonOpenerNote || ''}

ARTICLE STRUCTURE:
1. DATELINE: Start with "${gameTown.toUpperCase()}, N.H. – "
2. FIRST SENTENCE: Follow the LEAD instruction above exactly.
3. GAME FLOW: Use the game flow analysis above as the main narrative element.
4. SUPPORTING SCORERS: See SCORER RULES below - THIS IS CRITICAL.
5. DO NOT include team records or gallery references - those will be added separately.
6. LENGTH: 250-350 words. Be concise.

=== SCORER RULES - READ THIS CAREFULLY ===
THIS IS MANDATORY - VIOLATING THESE RULES IS A SERIOUS ERROR:

1. ONLY mention players who scored 10+ points
2. If a team has ZERO players with 10+ points, mention ONLY the high scorer(s) for that team
3. NEVER list players who scored under 10 points unless they are the team's high scorer
4. NEVER write sentences like "Five other players contributed..." or list multiple single-digit scorers
5. If you don't have double-digit scorers to mention for a team, just state the high scorer and move on

WRONG: "Parker (6), Eldridge (6), and Samson (6) each added six points. Rudd and Daigneault added four apiece."
RIGHT: "Madison Parker led the team with six points." (only if no one scored 10+)

=== THREE-POINTER RULES ===
- Only mention three-pointers if a player made 3 OR MORE
- Do NOT mention 1 or 2 three-pointers - not noteworthy
- NEVER say "three three-pointers" - use: triples, trifectas, shots from deep, baskets from beyond the arc
- NEVER write "[X] three-pointers that accounted for [Y] points" - readers can do math
- GOOD: "Fifteen of Fogg's 20 points came from beyond the arc"
- GOOD: "Smith knocked down four triples"
- BAD: "Jones added a three-pointer"
- BAD: "Smith hit three three-pointers" (awkward phrasing)

=== POSITION RULES ===
- If a player's position is listed as "G/F" or "F/C", only use the FIRST position (Guard or Forward)
- Write "guard" not "guard/forward"

TONE RULES:
- Factual and straightforward - report what happened
- Use neutral verbs: "scored," "led," "added," "contributed," "finished with"
- Do NOT speculate about emotions, motivations, or drama
- Do NOT use dramatic words like "dominated," "exploded," "heroic," "clutch"
- No exclamation points
- Let the numbers tell the story

STRICT RULES - DO NOT:
- Mention playoffs, tournament implications, or postseason - it's too early in the season
- Speculate about what the win/loss "means" for either team
- Add commentary about team momentum or confidence
- Write anything about "advancing" or "playoff positioning"

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
  let article = data.content?.[0]?.text || '';
  
  // Build closing paragraph with records
  const awayRecord = proofData.awayRecord;
  const homeRecord = proofData.homeRecord;
  const awaySeasonOpener = proofData.awaySeasonOpener;
  const homeSeasonOpener = proofData.homeSeasonOpener;
  
  if (awayRecord && homeRecord) {
    let closingParagraph = '\n\n';
    
    // Build record sentences
    const winnerRecord = awayWon ? awayRecord : homeRecord;
    const loserRecord = awayWon ? homeRecord : awayRecord;
    const winnerOpener = awayWon ? awaySeasonOpener : homeSeasonOpener;
    const loserOpener = awayWon ? homeSeasonOpener : awaySeasonOpener;
    
    if (winnerOpener) {
      closingParagraph += `${winner} opens the season with a victory`;
    } else {
      closingParagraph += `${winner} improves to ${winnerRecord.wins}-${winnerRecord.losses}`;
    }
    
    if (loserOpener) {
      closingParagraph += `, while ${loser} falls to 0-1 in their season opener.`;
    } else {
      closingParagraph += `, while ${loser} falls to ${loserRecord.wins}-${loserRecord.losses}${loserRecord.wins === 0 ? ' on the young season' : ''}.`;
    }
    
    article += closingParagraph;
  }
  
  // Generate headline
  const marginOfVictory = winnerScore - loserScore;
  let headlineHint = '';
  if (marginOfVictory >= 20) {
    headlineHint = 'Large margin - use softer terms like "cruises past", "rolls past", "eases by", "handles". NEVER use "blowout", "dominates", "destroys", "crushes".';
  } else if (marginOfVictory >= 10) {
    headlineHint = 'Comfortable win - use terms like "tops", "beats", "defeats", "gets past".';
  } else if (marginOfVictory <= 5) {
    headlineHint = 'Close game - use terms like "edges", "holds off", "survives", "slips past".';
  }
  
  const headlineResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: `Write a headline under 45 characters for this basketball game. Use school name not mascot. No score in headline. Just the headline text, no quotes.

Game: ${winner} defeated ${loser} ${winnerScore}-${loserScore}
${headlineHint}

BANNED WORDS: blowout, dominates, destroys, crushes, demolishes, embarrasses, routs` }]
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
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, headline, article, excerpt, gameTown })
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

// Mode 4: Generate social posts from edited article (high school)
async function handleSocial(body, headers) {
  const { article, headline, proofData, schoolData, photographerName, galleryUrl } = body;
  
  if (!article || !proofData) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Article and proof data required' }) };
  }
  
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
  
  const winnerScorers = awayWon ? proofData.awayScorers : proofData.homeScorers;
  const loserScorers = awayWon ? proofData.homeScorers : proofData.awayScorers;
  
  // Sort scorers by points
  const sortedWinnerScorers = [...(winnerScorers || [])].sort((a, b) => b.points - a.points);
  const sortedLoserScorers = [...(loserScorers || [])].sort((a, b) => b.points - a.points);
  
  const winnerMascot = winnerSchoolInfo.mascot || '';
  const winnerEmoji = winnerSchoolInfo.emoji || MASCOT_EMOJIS[winnerMascot] || '🏀';
  const winnerAbbrev = SCHOOL_ABBREVIATIONS[winner] || winner.substring(0, 3).toUpperCase();
  const loserAbbrev = SCHOOL_ABBREVIATIONS[loser] || loser.substring(0, 3).toUpperCase();
  
  // Format scorers for Instagram: "Watson (11), Moulton (10)"
  function formatIgScorers(scorers) {
    const top = (scorers || []).filter(s => s.points >= 10);
    const list = top.length > 0 ? top : [scorers[0]].filter(Boolean);
    return list.map(s => `${s.name.split(' ').pop()} (${s.points})`).join(', ');
  }
  
  // Format scorers for Twitter: "Watson-11, Moulton-10"
  function formatTwitterScorers(scorers) {
    const top = (scorers || []).filter(s => s.points >= 10);
    const list = top.length > 0 ? top : [scorers[0]].filter(Boolean);
    return list.map(s => `${s.name.split(' ').pop()}-${s.points}`).join(', ');
  }
  
  const igHeader = `${winnerEmoji} 🏀 ${winner} ${winnerScore}, ${loser} ${loserScore} 🏀`;
  
  // Get lede from the edited article (first 2 sentences after dateline)
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
    body: JSON.stringify({ 
      success: true, 
      facebookPost, 
      instagramPost, 
      twitterPost,
      winnerEmoji
    })
  };
}
