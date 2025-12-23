// social-post.mjs - Post to Facebook and Instagram APIs
// Supports: multi-photo posts, carousels, collaborators, page tags, scheduling

export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await request.json();
    const { platform, message, imageUrls, tags, collaborators, scheduledTime } = body;

    const results = {};

    // Post to Facebook
    if (platform === 'facebook' || platform === 'all') {
      const fbResult = await postToFacebook(message, imageUrls || [], tags || [], scheduledTime);
      results.facebook = fbResult;
    }

    // Post to Instagram
    if (platform === 'instagram' || platform === 'all') {
      const igResult = await postToInstagram(message, imageUrls || [], collaborators || [], scheduledTime);
      results.instagram = igResult;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Social post error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};

async function postToFacebook(message, imageUrls, tags, scheduledTime) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return { success: false, error: 'Facebook credentials not configured' };
  }

  try {
    // Build the request body
    const params = new URLSearchParams({
      access_token: accessToken
    });
    
    // Add message
    if (message) {
      params.append('message', message);
    }
    
    // Add tags (Facebook Page IDs to mention)
    if (tags && tags.length > 0) {
      // For tagging pages in text, you'd @mention them
      // For tagging in photos, use tags parameter
      params.append('tags', tags.join(','));
    }
    
    // Handle scheduling
    if (scheduledTime) {
      const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
      params.append('scheduled_publish_time', unixTime);
      params.append('published', 'false');
    }

    let endpoint;
    let response;

    if (imageUrls.length === 0) {
      // Text-only post
      endpoint = `https://graph.facebook.com/v24.0/${pageId}/feed`;
      response = await fetch(endpoint, {
        method: 'POST',
        body: params
      });
      
    } else if (imageUrls.length === 1) {
      // Single photo post
      endpoint = `https://graph.facebook.com/v24.0/${pageId}/photos`;
      params.append('url', imageUrls[0]);
      if (message) {
        params.delete('message');
        params.append('caption', message);
      }
      response = await fetch(endpoint, {
        method: 'POST',
        body: params
      });
      
    } else {
      // Multi-photo post (upload photos, then create post with attached_media)
      const photoIds = [];
      
      for (const url of imageUrls) {
        const photoParams = new URLSearchParams({
          url: url,
          published: 'false',
          access_token: accessToken
        });
        
        const photoResponse = await fetch(
          `https://graph.facebook.com/v24.0/${pageId}/photos`,
          { method: 'POST', body: photoParams }
        );
        const photoData = await photoResponse.json();
        
        if (photoData.error) {
          console.error('Photo upload error:', photoData.error);
          continue;
        }
        
        photoIds.push(photoData.id);
      }
      
      if (photoIds.length === 0) {
        return { success: false, error: 'Failed to upload photos' };
      }
      
      // Create post with attached media
      const postParams = new URLSearchParams({
        access_token: accessToken
      });
      
      if (message) postParams.append('message', message);
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        postParams.append('scheduled_publish_time', unixTime);
        postParams.append('published', 'false');
      }
      
      // Add attached_media
      photoIds.forEach((id, i) => {
        postParams.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
      });
      
      response = await fetch(
        `https://graph.facebook.com/v24.0/${pageId}/feed`,
        { method: 'POST', body: postParams }
      );
    }

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id || data.post_id };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function postToInstagram(message, imageUrls, collaborators, scheduledTime) {
  const userId = process.env.INSTAGRAM_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  if (!imageUrls || imageUrls.length === 0) {
    return { success: false, error: 'Instagram requires at least one image' };
  }

  try {
    let creationId;
    
    if (imageUrls.length === 1) {
      // Single image post
      const params = new URLSearchParams({
        image_url: imageUrls[0],
        caption: message || '',
        access_token: accessToken
      });
      
      // Add collaborators
      if (collaborators && collaborators.length > 0) {
        params.append('collaborators', JSON.stringify(collaborators));
      }
      
      const createResponse = await fetch(
        `https://graph.instagram.com/v24.0/${userId}/media`,
        { method: 'POST', body: params }
      );
      
      const createData = await createResponse.json();
      
      if (createData.error) {
        return { success: false, error: createData.error.message };
      }
      
      creationId = createData.id;
      
    } else {
      // Carousel post (multiple images)
      const childIds = [];
      
      // Step 1: Create media containers for each image
      for (const url of imageUrls) {
        const itemParams = new URLSearchParams({
          image_url: url,
          is_carousel_item: 'true',
          access_token: accessToken
        });
        
        const itemResponse = await fetch(
          `https://graph.instagram.com/v24.0/${userId}/media`,
          { method: 'POST', body: itemParams }
        );
        
        const itemData = await itemResponse.json();
        
        if (itemData.error) {
          console.error('Carousel item error:', itemData.error);
          continue;
        }
        
        childIds.push(itemData.id);
      }
      
      if (childIds.length < 2) {
        return { success: false, error: 'Carousel requires at least 2 images' };
      }
      
      // Step 2: Create carousel container
      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: message || '',
        access_token: accessToken
      });
      
      // Add collaborators
      if (collaborators && collaborators.length > 0) {
        carouselParams.append('collaborators', JSON.stringify(collaborators));
      }
      
      const carouselResponse = await fetch(
        `https://graph.instagram.com/v24.0/${userId}/media`,
        { method: 'POST', body: carouselParams }
      );
      
      const carouselData = await carouselResponse.json();
      
      if (carouselData.error) {
        return { success: false, error: carouselData.error.message };
      }
      
      creationId = carouselData.id;
    }
    
    // Step 3: Publish the media
    // Note: If scheduling, we'd use scheduled_publish_time instead
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });
    
    // Handle scheduling (Instagram Content Publishing API)
    if (scheduledTime) {
      // Instagram scheduling requires business accounts and specific permissions
      // For now, we'll publish immediately and note that scheduling may require additional setup
      console.log('Note: Instagram scheduling requested for', scheduledTime);
    }
    
    const publishResponse = await fetch(
      `https://graph.instagram.com/v24.0/${userId}/media_publish`,
      { method: 'POST', body: publishParams }
    );
    
    const publishData = await publishResponse.json();
    
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }
    
    return { 
      success: true, 
      postId: publishData.id,
      collaboratorInvites: collaborators?.length || 0
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const config = {
  path: "/api/social-post"
};
