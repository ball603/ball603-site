/**
 * Ball603 YouTube Video Sync Script
 * 
 * Fetches videos from the Ball603 YouTube channel and syncs them to Supabase.
 * 
 * SETUP:
 * 1. Get a YouTube Data API key from Google Cloud Console (free)
 *    - Go to https://console.cloud.google.com
 *    - Create a project (or use existing)
 *    - Enable "YouTube Data API v3"
 *    - Create credentials > API Key
 * 
 * 2. Set environment variables:
 *    - YOUTUBE_API_KEY: Your YouTube Data API key
 *    - SUPABASE_URL: Your Supabase project URL
 *    - SUPABASE_SERVICE_KEY: Your Supabase service role key (not anon key)
 * 
 * 3. Run: node youtube-sync.js
 * 
 * For automation, set up as a scheduled Netlify Function or GitHub Action.
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const YOUTUBE_HANDLE = '@ball603nh';

// ===== YOUTUBE API FUNCTIONS =====

async function getChannelId(handle) {
  // First, try to get channel by handle
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(searchUrl);
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`YouTube API Error: ${data.error.message}`);
  }
  
  if (data.items && data.items.length > 0) {
    // Find the exact match
    const channel = data.items.find(item => 
      item.snippet.customUrl?.toLowerCase() === handle.toLowerCase() ||
      item.snippet.channelTitle.toLowerCase().includes('ball603')
    ) || data.items[0];
    
    console.log(`Found channel: ${channel.snippet.channelTitle} (${channel.snippet.channelId})`);
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
  // YouTube API allows max 50 IDs per request
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
  
  // Upsert in batches
  const batchSize = 50;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    await supabaseRequest('youtube_videos?on_conflict=youtube_id', 'POST', batch);
    console.log(`Upserted ${Math.min(i + batchSize, videos.length)}/${videos.length} videos`);
  }
}

// ===== MAIN SYNC FUNCTION =====

async function syncYouTubeVideos() {
  console.log('🏀 Ball603 YouTube Sync Starting...\n');
  
  // Validate environment
  if (!YOUTUBE_API_KEY) {
    throw new Error('Missing YOUTUBE_API_KEY environment variable');
  }
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
  }
  
  try {
    // Step 1: Get channel ID from handle
    console.log(`📺 Looking up channel: ${YOUTUBE_HANDLE}`);
    const channelId = await getChannelId(YOUTUBE_HANDLE);
    
    // Step 2: Get uploads playlist ID
    console.log('📋 Getting uploads playlist...');
    const uploadsPlaylistId = await getChannelUploadsPlaylistId(channelId);
    
    // Step 3: Get all videos from playlist
    console.log('🎬 Fetching videos from channel...');
    const playlistItems = await getPlaylistVideos(uploadsPlaylistId, 200); // Get up to 200 videos
    console.log(`   Found ${playlistItems.length} videos on YouTube`);
    
    // Step 4: Get existing video IDs from Supabase
    console.log('🔍 Checking existing videos in database...');
    const existingIds = await getExistingVideoIds();
    console.log(`   Found ${existingIds.size} videos in database`);
    
    // Step 5: Filter to only new videos (or get all for full sync)
    const videoIds = playlistItems.map(item => item.contentDetails.videoId);
    const newVideoIds = videoIds.filter(id => !existingIds.has(id));
    
    if (newVideoIds.length === 0) {
      console.log('\n✅ All videos are already synced!');
      return { synced: 0, total: playlistItems.length };
    }
    
    console.log(`\n📥 Found ${newVideoIds.length} new videos to sync`);
    
    // Step 6: Get full details for new videos
    console.log('📊 Fetching video details...');
    const videoDetails = await getVideoDetails(newVideoIds);
    
    // Step 7: Transform to Supabase format
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
    
    // Step 8: Upsert to Supabase
    console.log('💾 Saving to database...');
    await upsertVideos(videosToInsert);
    
    console.log(`\n✅ Successfully synced ${videosToInsert.length} new videos!`);
    return { synced: videosToInsert.length, total: playlistItems.length };
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

function getBestThumbnail(thumbnails) {
  // Prefer maxres > standard > high > medium > default
  return thumbnails.maxres?.url ||
         thumbnails.standard?.url ||
         thumbnails.high?.url ||
         thumbnails.medium?.url ||
         thumbnails.default?.url;
}

// ===== RUN =====
syncYouTubeVideos()
  .then(result => {
    console.log('\n📊 Summary:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
