// Ball603 Get RPI Rankings API
// Returns the latest weekly RPI snapshot from rpi_rankings table
// Used by the public rpi.html page

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  try {
    const url = new URL(request.url);
    const gender = url.searchParams.get('gender');
    const division = url.searchParams.get('division');
    
    // Step 1: Get the latest week_of
    const weekRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpi_rankings?select=week_of&order=week_of.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    if (!weekRes.ok) {
      throw new Error('Failed to fetch latest week');
    }
    
    const weekData = await weekRes.json();
    
    if (!weekData || weekData.length === 0) {
      return new Response(JSON.stringify({
        rankings: [],
        calculatedAt: null,
        weekOf: null,
        message: 'No RPI data available yet'
      }), { status: 200, headers });
    }
    
    const latestWeek = weekData[0].week_of;
    
    // Step 2: Fetch all data for that week, optionally filtered
    let filter = `week_of=eq.${latestWeek}`;
    if (gender) filter += `&gender=eq.${encodeURIComponent(gender)}`;
    if (division) filter += `&division=eq.${encodeURIComponent(division)}`;
    
    const dataRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpi_rankings?${filter}&order=rank.asc&select=team,gender,division,wins,losses,win_pct,owp,oowp,rpi,rank,high_rank,low_rank,last_rank,remaining_sos,calculated_at,week_of`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Range': '0-999'
        }
      }
    );
    
    if (!dataRes.ok) {
      throw new Error('Failed to fetch RPI data');
    }
    
    const rankings = await dataRes.json();
    
    // Get the calculated_at from the first row
    const calculatedAt = rankings.length > 0 ? rankings[0].calculated_at : null;
    
    return new Response(JSON.stringify({
      rankings,
      calculatedAt,
      weekOf: latestWeek
    }), { status: 200, headers });
    
  } catch (err) {
    console.error('Get RPI error:', err);
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500, headers });
  }
};
