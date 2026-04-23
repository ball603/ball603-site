// Netlify Edge Function: article-og.js
// Intercepts requests to /article.html?id=... and injects OG meta tags
// so Facebook, Twitter, and other crawlers see the correct article preview

export default async (request, context) => {
  const url = new URL(request.url);
  const articleId = url.searchParams.get('id');

  // Only intercept article pages with an ID
  if (!articleId) {
    return context.next();
  }

  // Check if this is a social crawler (Facebook, Twitter, LinkedIn, Slack, etc.)
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isCrawler = 
    ua.includes('facebookexternalhit') ||
    ua.includes('twitterbot') ||
    ua.includes('linkedinbot') ||
    ua.includes('slackbot') ||
    ua.includes('telegrambot') ||
    ua.includes('whatsapp') ||
    ua.includes('discordbot') ||
    ua.includes('googlebot') ||
    ua.includes('applebot') ||
    url.searchParams.has('_escaped_fragment_');

  // Fetch the original HTML page
  const response = await context.next();
  
  // Only modify HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Fetch article data from Supabase
  const supabaseUrl = Netlify.env.get('SUPABASE_URL');
  const supabaseKey = Netlify.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  try {
    const apiUrl = `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&select=title,excerpt,featured_image_url,slug,published_at&limit=1`;
    const articleRes = await fetch(apiUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!articleRes.ok) return response;

    const articles = await articleRes.json();
    if (!articles || articles.length === 0) return response;

    const article = articles[0];
    const title = article.title || 'Ball603';
    const description = article.excerpt || 'New Hampshire sports coverage from Ball603.com';
    const image = article.featured_image_url || 'https://ball603.com/logo.png';
    const pageUrl = `https://ball603.com/article.html?id=${articleId}`;

    // Read the HTML and inject updated meta tags
    let html = await response.text();

    // Replace the generic OG tags with article-specific ones
    html = html
      .replace(
        '<meta property="og:title" content="Ball603">',
        `<meta property="og:title" content="${escapeHtml(title)}">`
      )
      .replace(
        '<meta property="og:description" content="New Hampshire Basketball Coverage">',
        `<meta property="og:description" content="${escapeHtml(description)}">`
      )
      .replace(
        '<meta property="og:image" content="https://ball603.com/logo.png">',
        `<meta property="og:image" content="${escapeHtml(image)}">`
      )
      .replace(
        '<meta property="og:url" content="https://ball603.com">',
        `<meta property="og:url" content="${escapeHtml(pageUrl)}">`
      )
      .replace(
        '<title>Article | Ball603</title>',
        `<title>${escapeHtml(title)} | Ball603</title>`
      )
      .replace(
        '<meta name="description" content="">',
        `<meta name="description" content="${escapeHtml(description)}">`
      );

    // Also add Twitter card tags if not present
    if (!html.includes('twitter:card')) {
      const twitterTags = `
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">`;
      html = html.replace('</head>', twitterTags + '\n</head>');
    }

    return new Response(html, {
      status: response.status,
      headers: response.headers
    });

  } catch (err) {
    console.error('article-og edge function error:', err);
    return response;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const config = {
  path: '/article.html'
};
