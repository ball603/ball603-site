// Ball603 Get RPI Rankings API
// Returns the latest weekly RPI snapshot from rpi_rankings table
// Used by the public rpi.html page
// Each division independently shows its own most recent data

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const DEFAULT_SPORT = 'basketball';
const DEFAULT_SEASON = '2025-26';

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const url = new URL(request.url);
    const gender = url.searchParams.get('gender');
    const division = url.searchParams.get('division');
    const sport = url.searchParams.get('sport') || DEFAULT_SPORT;
    const season = url.searchParams.get('season') || DEFAULT_SEASON;

    // Fetch all records for this sport/season ordered by week_of desc
    // Then keep only the latest record per team — this way each division
    // independently shows its own most recent publish date
    let filter = `sport=eq.${encodeURIComponent(sport)}&season=eq.${encodeURIComponent(season)}`;
    if (gender) filter += `&gender=eq.${encodeURIComponent(gender)}`;
    if (division) filter += `&division=eq.${encodeURIComponent(division)}`;

    const dataRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpi_rankings?${filter}&order=week_of.desc,rank.asc&select=team,gender,division,wins,losses,win_pct,owp,oowp,rpi,rank,high_rank,low_rank,last_rank,remaining_sos,calculated_at,week_of`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Range': '0-4999'
        }
      }
    );

    if (!dataRes.ok) {
      throw new Error('Failed to fetch RPI data');
    }

    const allRows = await dataRes.json();

    if (!allRows || allRows.length === 0) {
      return new Response(JSON.stringify({
        rankings: [],
        calculatedAt: null,
        weekOf: null,
        sport,
        season,
        message: 'No RPI data available yet'
      }), { status: 200, headers });
    }

    // Keep only the latest record per team+gender+division
    // Since rows are ordered week_of desc, the first occurrence of each team is the latest
    const seen = new Set();
    const rankings = [];
    for (const row of allRows) {
      const key = `${row.team}_${row.gender}_${row.division}`;
      if (!seen.has(key)) {
        seen.add(key);
        rankings.push(row);
      }
    }

    // Sort final results by division then rank
    rankings.sort((a, b) => {
      if (a.division !== b.division) return a.division.localeCompare(b.division);
      return (a.rank || 999) - (b.rank || 999);
    });

    // Use the most recent week_of across the returned data
    const latestWeek = allRows[0]?.week_of || null;
    const calculatedAt = allRows[0]?.calculated_at || null;

    return new Response(JSON.stringify({
      rankings,
      calculatedAt,
      weekOf: latestWeek,
      sport,
      season
    }), { status: 200, headers });

  } catch (err) {
    console.error('Get RPI error:', err);
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500, headers });
  }
};
