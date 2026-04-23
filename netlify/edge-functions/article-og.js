// Netlify Edge Function: article-og.js
// Injects OG meta tags for article pages so Facebook/social crawlers see correct previews
// Handles both /article.html?id=xxx and /article/slug URL formats

export default async (request, context) => {
  const url = new URL(request.url);
  
  // Get the original URL path (before any rewrite)
  const originalPath = request.headers.get('x-netlify-original-path') || url.pathname;
  
  // Support both /article.html?id=xxx and /article/slug formats
  let articleId = url.searchParams.get('id');
  let articleSlug = null;
  
  // Check original path for slug
  const slugMatch = originalPath.match(/^\/article\/(.+)$/);
  if (slugMatch) {
    articleSlug = slugMatch[1];
  }
  
  // Also check current path
  if (!articleSlug) {
    const currentSlugMatch = url.pathname.match(/^\/article\/(.+)$/);
    if (currentSlugMatch) articleSlug = currentSlugMatch[1];
  }

  if (!articleId && !articleSlug) {
    return context.next();
  }

  // Fetch the original HTML page
  const response = await context.next();
  
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const supabaseUrl = Netlify.env.get('SUPABASE_URL');
  const supabaseKey = Netlify.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  try {
    let apiUrl;
    if (articleSlug) {
      apiUrl = `${supabaseUrl}/rest/v1/articles?slug=eq.${encodeURIComponent(articleSlug)}&select=title,excerpt,featured_image_url,slug,id&limit=1`;
    } else {
      apiUrl = `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&select=title,excerpt,featured_image_url,slug,id&limit=1`;
    }

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
    const pageUrl = article.slug 
      ? `https://ball603.com/article/${article.slug}`
      : `https://ball603.com/article.html?id=${article.id}`;

    let html = await response.text();

    // Replace generic meta tags with article-specific ones
    html = html
      .replace(/<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${escapeHtml(title)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${escapeHtml(description)}">`)
      .replace(/<meta property="og:image" content="[^"]*">/,
        `<meta property="og:image" content="${escapeHtml(image)}">`)
      .replace(/<meta property="og:url" content="[^"]*">/,
        `<meta property="og:url" content="${escapeHtml(pageUrl)}">`)
      .replace(/<title>Article \| Ball603<\/title>/,
        `<title>${escapeHtml(title)} | Ball603</title>`)
      .replace(/<meta name="description" content="">/,
        `<meta name="description" content="${escapeHtml(description)}">`);

    // Add Twitter card tags
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
    console.error('[article-og] error:', err);
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
  path: ['/article.html', '/article/*']
};
