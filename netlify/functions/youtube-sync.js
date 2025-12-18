/**
 * Ball603 YouTube Sync - Netlify Scheduled Function
 * 
 * Automatically syncs YouTube videos to Supabase.
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const YOUTUBE_HANDLE = '@ball603nh';

// ===== YOUTUBE API FUNCTIONS =====

async function getChannelId(handle) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(searchUrl);
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`YouTube API Error: ${data.error.message}`);
  }
  
  if (data.items && data.items.length > 0) {
    const channel = data.items.find(item => 
      item.snippet.customUrl?.toLowerCase() === handle.toLowerCase() ||
      item.snippet.channelTitle.toLowerCase().includes('ball603')
    ) || data.items[0];
    
    return channel.snippet.channelId;
  }
  
  throw new Error(`Could not find channel for handle: ${handle}`);
}

async function getChannelUploadsPlaylistId(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`YouTube API Error: ${data.error.message}`);
  }
  
  if (data.items && data.items.length > 0) {
    return data.items[0].contentDetails.relatedPlaylists.uploads;
  }
  
  throw new Error(`Could not find uploads playlist for channel: ${channelId}`);
}

async function getPlaylistVideos(playlistId, maxResults = 50) {
  const videos = [];
  let nextPageToken = null;
  
  do {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${Math.min(maxResults - videos.length, 50)}&key=${YOUTUBE_API_KEY}`;
    
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`YouTube API Error: ${data.error.message}`);
    }
    
    if (data.items) {
      videos.push(...data.items);
    }
    
    nextPageToken = data.nextPageToken;
  } while (nextPageToken && videos.length < maxResults);
  
  return videos;
}

async function getVideoDetails(videoIds) {
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }
  
  const allDetails = [];
  
  for (const chunk of chunks) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`YouTube API Error: ${data.error.message}`);
    }
    
    if (data.items) {
      allDetails.push(...data.items);
    }
  }
  
  return allDetails;
}

// ===== SUPABASE FUNCTIONS =====

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : 'return=representation'
  };
  
  const options = { method, headers };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase Error: ${error}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function getExistingVideoIds() {
  const data = await supabaseRequest('youtube_videos?select=youtube_id');
  return new Set(data.map(v => v.youtube_id));
}

async function upsertVideos(videos) {
  if (videos.length === 0) return;
  
  const batchSize = 50;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    await supabaseRequest('youtube_videos?on_conflict=youtube_id', 'POST', batch);
  }
}

function getBestThumbnail(thumbnails) {
  return thumbnails.maxres?.url ||
         thumbnails.standard?.url ||
         thumbnails.high?.url ||
         thumbnails.medium?.url ||
         thumbnails.default?.url;
}

// ===== MAIN HANDLER =====

exports.handler = async function(event, context) {
  console.log('🏀 Ball603 YouTube Sync Starting...');
  
  // Validate environment
  if (!YOUTUBE_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing YOUTUBE_API_KEY' })
    };
  }
  if (!SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing SUPABASE_SERVICE_KEY' })
    };
  }
  
  try {
    // Get channel ID
    const channelId = await getChannelId(YOUTUBE_HANDLE);
    console.log(`Found channel: ${channelId}`);
    
    // Get uploads playlist
    const uploadsPlaylistId = await getChannelUploadsPlaylistId(channelId);
    
    // Get videos from YouTube
    const playlistItems = await getPlaylistVideos(uploadsPlaylistId, 100);
    console.log(`Found ${playlistItems.length} videos on YouTube`);
    
    // Get existing videos from Supabase
    const existingIds = await getExistingVideoIds();
    console.log(`Found ${existingIds.size} videos in database`);
    
    // Filter to new videos
    const videoIds = playlistItems.map(item => item.contentDetails.videoId);
    const newVideoIds = videoIds.filter(id => !existingIds.has(id));
    
    if (newVideoIds.length === 0) {
      console.log('All videos already synced');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'All videos already synced',
          synced: 0,
          total: playlistItems.length
        })
      };
    }
    
    console.log(`Syncing ${newVideoIds.length} new videos...`);
    
    // Get full details
    const videoDetails = await getVideoDetails(newVideoIds);
    
    // Transform and save
    const videosToInsert = videoDetails.map(video => ({
      youtube_id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail_url: getBestThumbnail(video.snippet.thumbnails),
      published_at: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      view_count: parseInt(video.statistics.viewCount || '0'),
      like_count: parseInt(video.statistics.likeCount || '0'),
      tags: video.snippet.tags || [],
      pinned: false,
      hidden: false,
      sort_order: 0
    }));
    
    await upsertVideos(videosToInsert);
    
    console.log(`Successfully synced ${videosToInsert.length} videos!`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Sync complete',
        synced: videosToInsert.length,
        total: playlistItems.length
      })
    };
    
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
