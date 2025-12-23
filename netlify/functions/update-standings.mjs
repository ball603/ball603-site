// Ball603 Update Standings from Games
// Calculates W-L-T records from the games table
// Called after manual score entry or on demand

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }
  
  console.log('Update Standings - Calculating from games table...');
  
  try {
    // Step 1: Fetch all completed NHIAA games
    const gamesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?level=eq.NHIAA&select=home_team,away_team,home_score,away_score,gender,division,date&or=(home_score.not.is.null,away_score.not.is.null)`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Range': '0-9999'
        }
      }
    );
    
    if (!gamesResponse.ok) {
      throw new Error(`Failed to fetch games: ${gamesResponse.status}`);
    }
    
    const games = await gamesResponse.json();
    console.log(`  Found ${games.length} completed games`);
    
    // Step 2: Calculate records for each team
    const teamRecords = new Map();
    
    for (const game of games) {
      // Skip games without scores
      if (game.home_score === null || game.away_score === null) continue;
      
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const homeScore = parseInt(game.home_score);
      const awayScore = parseInt(game.away_score);
      const gender = game.gender;
      const division = game.division;
      
      // Initialize team records if needed
      const homeKey = `${homeTeam}_${gender}_${division}`;
      const awayKey = `${awayTeam}_${gender}_${division}`;
      
      if (!teamRecords.has(homeKey)) {
        teamRecords.set(homeKey, {
          school: homeTeam,
          gender: gender,
          division: division,
          wins: 0,
          losses: 0,
          ties: 0
        });
      }
      
      if (!teamRecords.has(awayKey)) {
        teamRecords.set(awayKey, {
          school: awayTeam,
          gender: gender,
          division: division,
          wins: 0,
          losses: 0,
          ties: 0
        });
      }
      
      // Update records based on game result
      const homeRecord = teamRecords.get(homeKey);
      const awayRecord = teamRecords.get(awayKey);
      
      if (homeScore > awayScore) {
        // Home team won
        homeRecord.wins++;
        awayRecord.losses++;
      } else if (awayScore > homeScore) {
        // Away team won
        awayRecord.wins++;
        homeRecord.losses++;
      } else {
        // Tie
        homeRecord.ties++;
        awayRecord.ties++;
      }
    }
    
    console.log(`  Calculated records for ${teamRecords.size} teams`);
    
    // Step 3: Update standings table with calculated records
    const now = new Date().toISOString();
    let updatedCount = 0;
    
    for (const [key, record] of teamRecords) {
      const gamesPlayed = record.wins + record.losses + record.ties;
      const winPct = gamesPlayed > 0 ? (record.wins / gamesPlayed).toFixed(3) : '0.000';
      
      // Update only W-L-T fields, not rating/points
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/standings?school=eq.${encodeURIComponent(record.school)}&gender=eq.${encodeURIComponent(record.gender)}&division=eq.${encodeURIComponent(record.division)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            wins: record.wins,
            losses: record.losses,
            ties: record.ties,
            games_played: gamesPlayed,
            win_pct: winPct,
            updated_at: now
          })
        }
      );
      
      if (updateResponse.ok) {
        updatedCount++;
      }
    }
    
    console.log(`  Updated ${updatedCount} team standings`);
    
    return new Response(JSON.stringify({
      success: true,
      gamesAnalyzed: games.length,
      teamsUpdated: updatedCount,
      timestamp: now
    }), { status: 200, headers });
    
  } catch (error) {
    console.error('Update standings error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers });
  }
};
