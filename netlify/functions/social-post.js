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
  
  // Helper function to check media container status
  async function checkMediaStatus(mediaId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${mediaId}?fields=status_code,status&access_token=${accessToken}`
      );
      const statusData = await statusResponse.json();
      console.log(`Media ${mediaId} status (attempt ${i + 1}):`, statusData.status_code);
      
      if (statusData.status_code === 'FINISHED') {
        return { ready: true };
      } else if (statusData.status_code === 'ERROR') {
        return { ready: false, error: statusData.status || 'Media processing failed' };
      }
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return { ready: false, error: 'Media processing timeout' };
  }
  
  // Helper to delay between API calls
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    let creationId;
    
    if (imageUrls.length === 1) {
      // Single image post
      const params = new URLSearchParams({
        image_url: imageUrls[0],
        caption: message || '',
        access_token: accessToken
      });
      
      // Collaborators for single image
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
      
      // Wait for media to be ready
      const status = await checkMediaStatus(creationId);
      if (!status.ready) {
        return { success: false, error: status.error };
      }
      
    } else {
      // Carousel post - upload items SEQUENTIALLY with delays to avoid rate limits
      console.log('Creating', imageUrls.length, 'Instagram carousel items sequentially...');
      
      const childIds = [];
      const failedItems = [];
      
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`Uploading carousel item ${i + 1}/${imageUrls.length}...`);
        
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
            console.error(`Carousel item ${i + 1} error:`, itemData.error);
            failedItems.push({ index: i + 1, error: itemData.error.message });
          } else if (itemData.id) {
            // Check if this item is ready
            const status = await checkMediaStatus(itemData.id, 5);
            if (status.ready) {
              childIds.push(itemData.id);
              console.log(`Carousel item ${i + 1} ready: ${itemData.id}`);
            } else {
              console.error(`Carousel item ${i + 1} failed processing:`, status.error);
              failedItems.push({ index: i + 1, error: status.error });
            }
          }
        } catch (err) {
          console.error(`Carousel item ${i + 1} exception:`, err.message);
          failedItems.push({ index: i + 1, error: err.message });
        }
        
        // Delay between uploads to avoid rate limiting (500ms between items)
        if (i < imageUrls.length - 1) {
          await delay(500);
        }
      }
      
      console.log(`Carousel upload complete: ${childIds.length} succeeded, ${failedItems.length} failed`);
      
      if (childIds.length < 2) {
        const errorMsg = failedItems.length > 0 
          ? `Only ${childIds.length} images processed. Failures: ${failedItems.map(f => `#${f.index}: ${f.error}`).join('; ')}`
          : 'Carousel requires at least 2 successfully processed images';
        return { success: false, error: errorMsg };
      }
      
      // Log if some images failed but we can still proceed
      if (failedItems.length > 0) {
        console.log(`Proceeding with ${childIds.length}/${imageUrls.length} images. Failed: ${failedItems.map(f => `#${f.index}`).join(', ')}`);
      }
      
      console.log('Created carousel item IDs:', childIds);
      
      // Brief delay before creating container
      await delay(1000);
      
      // Step 2: Create carousel container
      const carouselParams = new URLSearchParams({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: message || '',
        access_token: accessToken
      });
      
      // Collaborators for carousel
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
      
      // Wait for carousel container to be ready
      const carouselStatus = await checkMediaStatus(creationId);
      if (!carouselStatus.ready) {
        return { success: false, error: carouselStatus.error };
      }
    }
    
    // Step 3: Publish the media
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
      collaboratorInvites: collaborators?.length || 0,
      imagesPosted: imageUrls.length === 1 ? 1 : childIds.length,
      imagesRequested: imageUrls.length
    };

  } catch (error) {
    console.error('Instagram error:', error);
    return { success: false, error: error.message };
  }
}
