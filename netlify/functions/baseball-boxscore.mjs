// Dedicated Baseball Boxscore Story generator
// Uses Netlify v2 (export default) for extended timeout support

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { fileBase64, fileMimeType, gameData, notes, photographerName, schoolData } = body;

    if (!fileBase64 || !gameData) {
      return new Response(JSON.stringify({ error: 'fileBase64 and gameData required' }), { status: 400, headers });
    }

    const awaySchoolInfo = schoolData?.away || {};
    const homeSchoolInfo = schoolData?.home || {};
    const gameTown = homeSchoolInfo.town || gameData.homeTeam;
    const awayMascot = awaySchoolInfo.mascot || '';
    const homeMascot = homeSchoolInfo.mascot || '';

    function formatGameDate(dateStr) {
      if (!dateStr) return 'Tuesday';
      try {
        const d = new Date(dateStr + 'T12:00:00');
        return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
      } catch { return 'Tuesday'; }
    }
    const gameDay = formatGameDate(gameData.date);

    let mediaType = fileMimeType;
    if (!mediaType || mediaType === 'application/octet-stream') {
      if (fileBase64.startsWith('JVBERi')) mediaType = 'application/pdf';
      else if (fileBase64.startsWith('/9j/')) mediaType = 'image/jpeg';
      else mediaType = 'image/png';
    }

    const combinedPrompt = `You are a sports data reader and AP-style reporter for Ball603.com covering NH high school baseball.

TASK 1: Read this boxscore image and extract all stats.
TASK 2: Write a detailed game recap article using those stats.

GAME INFO:
- Away: ${gameData.awayTeam}${awayMascot ? ' (' + awayMascot + ')' : ''}
- Home: ${gameData.homeTeam}${homeMascot ? ' (' + homeMascot + ')' : ''}
- Location: ${gameTown}, N.H.
- Date: ${gameDay}
- Division: ${gameData.division || 'N/A'}${gameData.is_playoff ? ' | PLAYOFF: ' + (gameData.round || 'Playoff') : ''}
${notes ? '- Notes: ' + notes : ''}
${photographerName ? '- Photographer: ' + photographerName : ''}

CRITICAL EXTRACTION RULES:

LINE SCORE (top of image):
- There is a compact summary row at the very top showing: team abbreviation | inning columns (1 2 3 4 5 6 7) | R | H | E
- The R, H, E in the LINE SCORE are the OFFICIAL team totals for the game
- Extract awayR, awayH, awayE, homeR, homeH, homeE EXCLUSIVELY from this line score row
- Do NOT use the batting table TEAM totals row for H or E — those columns (AB R H RBI BB SO) are different stats
- The batting table's "H" column is individual player hits, not the same as the line score H
- awayR must equal the final score for the away team; homeR must equal the final score for the home team

INNINGS:
- Extract only the innings actually played (do not pad to 7 if game ended early)
- An "X" in an inning means the home team did not bat (walk-off) — store as "X"

BATTING TABLE (below line score):
- Extract per-player: name, position, AB, R, H, RBI, BB, SO
- Do NOT use batting table totals for awayH/homeH/awayE/homeE

PITCHING TABLE:
- Extract per-pitcher: name, IP, H, R, ER, BB, SO, decision (W/L/S)

OTHER:
- Use ONLY the mascot in parentheses above — never invent or guess
- Mascot nicknames only from second paragraph onward in the article

ARTICLE REQUIREMENTS:
- AP style, past tense, third person
- Mascot nicknames only from second paragraph onward
- Lead with most compelling stat: dominant pitcher, big inning, shutout, multi-hit game
- Name winning/losing pitchers with their line
- Highlight standout individual performances
- 180-280 words
- End with each team's updated record if derivable from context

Respond ONLY with valid JSON (no markdown):
{
  "awayInnings": [],
  "homeInnings": [],
  "awayR": 0, "awayH": 0, "awayE": 0,
  "homeR": 0, "homeH": 0, "homeE": 0,
  "awayBatters": [{"name":"","pos":"","ab":0,"r":0,"h":0,"rbi":0,"bb":0,"so":0}],
  "homeBatters": [{"name":"","pos":"","ab":0,"r":0,"h":0,"rbi":0,"bb":0,"so":0}],
  "awayPitchers": [{"name":"","ip":"","h":0,"r":0,"er":0,"bb":0,"so":0,"decision":""}],
  "homePitchers": [{"name":"","ip":"","h":0,"r":0,"er":0,"bb":0,"so":0,"decision":""}],
  "awayNotes": "",
  "homeNotes": "",
  "headline": "",
  "article": "",
  "excerpt": ""
}`;

    const msgContent = mediaType === 'application/pdf'
      ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }, { type: 'text', text: combinedPrompt }]
      : [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } }, { type: 'text', text: combinedPrompt }];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: msgContent }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Claude API error:', err);
      return new Response(JSON.stringify({ error: 'Claude API error: ' + res.status }), { status: 500, headers });
    }

    const aiData = await res.json();
    let stats;
    try {
      let raw = aiData.content?.[0]?.text || '';
      raw = raw.replace(/```json|```/g, '').trim();
      stats = JSON.parse(raw);
    } catch (e) {
      console.error('Parse error:', e, 'Raw:', aiData.content?.[0]?.text?.substring(0, 200));
      return new Response(JSON.stringify({ error: 'Failed to parse Claude response' }), { status: 500, headers });
    }

    const awayInnings = stats.awayInnings || [];
    const homeInnings = stats.homeInnings || [];
    const awayWon = (stats.awayR || 0) > (stats.homeR || 0);

    const inningHeaders = awayInnings.map((_, i) =>
      `<th style="padding:6px 8px; text-align:center; color:#666; font-weight:500;">${i+1}</th>`).join('');

    const scoreBoxHtml = `
      <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:center;">
        <thead>
          <tr style="border-bottom:2px solid #ddd;">
            <th style="text-align:left; padding:8px 10px; font-weight:600;">Team</th>
            ${inningHeaders}
            <th style="padding:6px 8px; font-weight:700; border-left:2px solid #ccc;">R</th>
            <th style="padding:6px 8px; font-weight:500; color:#666;">H</th>
            <th style="padding:6px 8px; font-weight:500; color:#666;">E</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:left; padding:10px; font-weight:600;">${gameData.awayTeam}</td>
            ${awayInnings.map(v => `<td style="padding:8px;">${v}</td>`).join('')}
            <td style="padding:8px; font-weight:700; font-size:15px; border-left:2px solid #ccc; color:${awayWon ? '#f57c00' : '#333'}">${stats.awayR}</td>
            <td style="padding:8px;">${stats.awayH}</td>
            <td style="padding:8px;">${stats.awayE}</td>
          </tr>
          <tr style="border-top:1px solid #eee;">
            <td style="text-align:left; padding:10px; font-weight:600;">${gameData.homeTeam}</td>
            ${homeInnings.map(v => `<td style="padding:8px;">${v}</td>`).join('')}
            <td style="padding:8px; font-weight:700; font-size:15px; border-left:2px solid #ccc; color:${!awayWon ? '#f57c00' : '#333'}">${stats.homeR}</td>
            <td style="padding:8px;">${stats.homeH}</td>
            <td style="padding:8px;">${stats.homeE}</td>
          </tr>
        </tbody>
      </table>`;

    return new Response(JSON.stringify({
      success: true,
      headline: stats.headline || '',
      article: stats.article || '',
      excerpt: stats.excerpt || '',
      scoreBoxHtml,
      stats
    }), { status: 200, headers });

  } catch (err) {
    console.error('baseball-boxscore error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/.netlify/functions/baseball-boxscore' };
