// AI Article Generation using Claude API
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Anthropic API key not configured' })
    };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { boxScore, gameInfo, style } = body;
    
    if (!boxScore) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Box score data required' })
      };
    }
    
    const prompt = `You are a sports writer for Ball603.com, a New Hampshire high school basketball news website. Write an engaging game recap article based on the following information.

STYLE GUIDELINES:
- Write in an energetic, engaging sports journalism style
- Lead with the most exciting aspect of the game (comeback, star performance, rivalry, etc.)
- Include specific stats and scoring details
- Mention standout players by name with their stats
- Keep paragraphs short and punchy
- Total length: 300-500 words
- Do NOT include a headline - just the article body
- Use present tense for immediacy where appropriate
- End with context about what's next for the teams if possible

GAME INFORMATION:
${gameInfo || 'Not provided'}

BOX SCORE / STATS / NOTES:
${boxScore}

Write the article now:`;

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
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Failed to generate article', details: errorText })
      };
    }
    
    const data = await response.json();
    const article = data.content?.[0]?.text || '';
    
    // Also generate a headline
    const headlineResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Based on this game recap, write a short, punchy headline (8 words or less). Just the headline, nothing else.\n\nArticle:\n${article}`
          }
        ]
      })
    });
    
    let headline = '';
    if (headlineResponse.ok) {
      const headlineData = await headlineResponse.json();
      headline = headlineData.content?.[0]?.text?.trim() || '';
    }
    
    // Generate excerpt
    const excerpt = article.split('.').slice(0, 2).join('.') + '.';
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        headline,
        article,
        excerpt
      })
    };
    
  } catch (error) {
    console.error('Generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate article', details: error.message })
    };
  }
};
