// social-post.js - Post to Facebook and Instagram APIs
// Supports: multi-photo posts, carousels, collaborators, page tags, scheduling

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { platform, message, imageUrls, tags, collaborators, scheduledTime } = body;

    console.log('Social post request:', { platform, imageCount: imageUrls?.length, hasMessage: !!message });

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, results })
    };

  } catch (error) {
    console.error('Social post error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function postToFacebook(message, imageUrls, tags, scheduledTime) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return { success: false, error: 'Facebook credentials not configured' };
  }

  const API_VERSION = 'v19.0';

  try {
    let response;
    let data;

    if (imageUrls.length === 0) {
      // Text-only post
      const params = new URLSearchParams({
        message: message || '',
        access_token: accessToken
      });
      
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        params.append('scheduled_publish_time', unixTime);
        params.append('published', 'false');
      }
      
      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${pageId}/feed`, {
        method: 'POST',
        body: params
      });
      data = await response.json();
      
    } else if (imageUrls.length === 1) {
      // Single photo post
      const photoParams = new URLSearchParams({
        url: imageUrls[0],
        access_token: accessToken
      });
      if (message) {
        photoParams.append('caption', message);
      }
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        photoParams.append('scheduled_publish_time', unixTime);
        photoParams.append('published', 'false');
      }
      
      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${pageId}/photos`, {
        method: 'POST',
        body: photoParams
      });
      data = await response.json();
      
    } else {
      // Multi-photo post - upload in parallel for speed
      console.log('Uploading', imageUrls.length, 'photos to Facebook in parallel...');
      
      const uploadPromises = imageUrls.map(async (url) => {
        const photoParams = new URLSearchParams({
          url: url,
          published: 'false',
          access_token: accessToken
        });
        
        const photoResponse = await fetch(
          `https://graph.facebook.com/${API_VERSION}/${pageId}/photos`,
          { method: 'POST', body: photoParams }
        );
        return photoResponse.json();
      });
      
      const photoResults = await Promise.all(uploadPromises);
      const photoIds = [];
      let lastError = null;
      
      for (const photoData of photoResults) {
        if (photoData.error) {
          console.error('Photo upload error:', photoData.error);
          lastError = photoData.error.message;
        } else if (photoData.id) {
          photoIds.push(photoData.id);
        }
      }
      
      if (photoIds.length === 0) {
        return { success: false, error: lastError || 'Failed to upload any photos to Facebook' };
      }
      
      console.log('Uploaded photo IDs:', photoIds);
      
      // Step 2: Create post with attached media
      const postParams = new URLSearchParams({
        access_token: accessToken
      });
      
      if (message) postParams.append('message', message);
      if (scheduledTime) {
        const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
        postParams.append('scheduled_publish_time', unixTime);
        postParams.append('published', 'false');
      }
      
      // Add attached_media - each as separate parameter
      photoIds.forEach((id, i) => {
        postParams.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
      });
      
      console.log('Creating FB post with attached media...');
      
      response = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${pageId}/feed`,
        { method: 'POST', body: postParams }
      );
      data = await response.json();
    }

    console.log('FB final response:', JSON.stringify(data));

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id || data.post_id };

  } catch (error) {
    console.error('Facebook error:', error);
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

  const API_VERSION = 'v19.0';
  
  // Helper function to check media container status (only used for final container)
  async function waitForMediaReady(mediaId, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${mediaId}?fields=status_code&access_token=${accessToken}`
      );
      const statusData = await statusResponse.json();
      console.log(`Media ${mediaId} status check ${i + 1}: ${statusData.status_code}`);
      
      if (statusData.status_code === 'FINISHED') {
        return { ready: true };
      } else if (statusData.status_code === 'ERROR') {
        return { ready: false, error: 'Media processing failed' };
      }
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { ready: false, error: 'Media processing timeout' };
  }

  try {
    let creationId;
    let childIds = [];
    
    if (imageUrls.length === 1) {
      // Single image post
      const params = new URLSearchParams({
        image_url: imageUrls[0],
        caption: message || '',
        access_token: accessToken
      });
      
      if (collaborators && collaborators.length > 0) {
        params.append('collaborators', collaborators.join(','));
      }
      
      console.log('Creating single IG media...');
      
      const createResponse = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
        { method: 'POST', body: params }
      );
      
      const createData = await createResponse.json();
      console.log('IG create response:', JSON.stringify(createData));
      
      if (createData.error) {
        return { success: false, error: createData.error.message };
      }
      
      creationId = createData.id;
      
    } else {
      // Carousel post - upload items sequentially with minimal delay
      console.log('Creating', imageUrls.length, 'Instagram carousel items...');
      
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        
        try {
          const itemParams = new URLSearchParams({
            image_url: url,
            is_carousel_item: 'true',
            access_token: accessToken
          });
          
          const itemResponse = await fetch(
            `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
            { method: 'POST', body: itemParams }
          );
          
          const itemData = await itemResponse.json();
          
          if (itemData.error) {
            console.error(`Item ${i + 1} error:`, itemData.error.message);
          } else if (itemData.id) {
            childIds.push(itemData.id);
            console.log(`Item ${i + 1}/${imageUrls.length} created: ${itemData.id}`);
          }
        } catch (err) {
          console.error(`Item ${i + 1} exception:`, err.message);
        }
        
        // Small delay between uploads (200ms)
        if (i < imageUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Carousel items created: ${childIds.length}/${imageUrls.length}`);
      
      if (childIds.length < 2) {
        return { success: false, error: `Only ${childIds.length} images uploaded - carousel needs at least 2` };
      }
      
      // Brief pause before creating container
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create carousel container
      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: message || '',
        access_token: accessToken
      });
      
      if (collaborators && collaborators.length > 0) {
        carouselParams.append('collaborators', collaborators.join(','));
      }
      
      console.log('Creating IG carousel container...');
      
      const carouselResponse = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${userId}/media`,
        { method: 'POST', body: carouselParams }
      );
      
      const carouselData = await carouselResponse.json();
      console.log('IG carousel response:', JSON.stringify(carouselData));
      
      if (carouselData.error) {
        return { success: false, error: carouselData.error.message };
      }
      
      creationId = carouselData.id;
    }
    
    // Wait for container to be ready before publishing
    const status = await waitForMediaReady(creationId);
    if (!status.ready) {
      return { success: false, error: status.error };
    }
    
    // Publish
    console.log('Publishing IG media:', creationId);
    
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken
    });
    
    const publishResponse = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${userId}/media_publish`,
      { method: 'POST', body: publishParams }
    );
    
    const publishData = await publishResponse.json();
    console.log('IG publish response:', JSON.stringify(publishData));
    
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }
    
    return { 
      success: true, 
      postId: publishData.id,
      imagesPosted: imageUrls.length === 1 ? 1 : childIds.length,
      imagesRequested: imageUrls.length
    };

  } catch (error) {
    console.error('Instagram error:', error);
    return { success: false, error: error.message };
  }
}
