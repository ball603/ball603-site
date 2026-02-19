// Ball603 Manual Score Entry API
// Allows contributors to enter scores via /finalscore and /playoffscores pages
// Supports live scoring with game_status and auto-advance for playoffs

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Check if a status indicates the game is final
function isFinalStatus(status) {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === 'FINAL' || s.startsWith('FINAL-');
}

// Extract overtime info from status for display
function getOvertimeDisplay(status) {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === 'FINAL-OT') return 'OT';
  if (s === 'FINAL-2OT') return '2OT';
  if (s === 'FINAL-3OT') return '3OT';
  if (s === 'FINAL-4OT') return '4OT';
  return null;
}

// Bracket advancement mapping
// Maps (round, position) -> (next_round, next_position, slot)
// slot: 'home' or 'away' in the next game
const ADVANCEMENT_MAP = {
  // Prelims -> Quarters
  'Prelims_1': { nextRound: 'Quarters', nextPosition: 1, slot: 'home' },
  'Prelims_2': { nextRound: 'Quarters', nextPosition: 1, slot: 'away' },
  'Prelims_3': { nextRound: 'Quarters', nextPosition: 2, slot: 'home' },
  'Prelims_4': { nextRound: 'Quarters', nextPosition: 2, slot: 'away' },
  'Prelims_5': { nextRound: 'Quarters', nextPosition: 3, slot: 'home' },
  'Prelims_6': { nextRound: 'Quarters', nextPosition: 3, slot: 'away' },
  'Prelims_7': { nextRound: 'Quarters', nextPosition: 4, slot: 'home' },
  'Prelims_8': { nextRound: 'Quarters', nextPosition: 4, slot: 'away' },
  // Quarters -> Semis
  'Quarters_1': { nextRound: 'Semis', nextPosition: 1, slot: 'home' },
  'Quarters_2': { nextRound: 'Semis', nextPosition: 1, slot: 'away' },
  'Quarters_3': { nextRound: 'Semis', nextPosition: 2, slot: 'home' },
  'Quarters_4': { nextRound: 'Semis', nextPosition: 2, slot: 'away' },
  // Semis -> Final
  'Semis_1': { nextRound: 'Final', nextPosition: 1, slot: 'home' },
  'Semis_2': { nextRound: 'Final', nextPosition: 1, slot: 'away' }
};

// Generate game_id for a playoff game
function generateGameId(season, gender, division, round, position) {
  const seasonSlug = season.replace('-', '');
  const genderSlug = gender.toLowerCase().charAt(0);
  const divSlug = division.replace('-', '').toLowerCase();
  const roundSlug = round.toLowerCase();
  return `playoff_${seasonSlug}_${genderSlug}_${divSlug}_${roundSlug}_${position}`;
}

// Advance winner to next round
async function advanceWinner(game, winnerTeam, winnerSeed) {
  const advanceKey = `${game.round}_${game.bracket_position}`;
  const advancement = ADVANCEMENT_MAP[advanceKey];
  
  if (!advancement) {
    // This is the final - no advancement needed
    console.log('No advancement needed (Final game)');
    return null;
  }
  
  const nextGameId = generateGameId(
    game.season,
    game.gender,
    game.division,
    advancement.nextRound,
    advancement.nextPosition
  );
  
  // Get the next game
  const getResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(nextGameId)}`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  
  if (!getResponse.ok) {
    console.error('Failed to get next game:', nextGameId);
    return null;
  }
  
  const nextGames = await getResponse.json();
  if (!nextGames || nextGames.length === 0) {
    console.error('Next game not found:', nextGameId);
    return null;
  }
  
  const nextGame = nextGames[0];
  
  // Determine update based on slot
  let updateData = {};
  
  if (advancement.slot === 'home') {
    updateData.home_team = winnerTeam;
    updateData.home_seed = winnerSeed;
  } else {
    updateData.away_team = winnerTeam;
    updateData.away_seed = winnerSeed;
  }
  
  // For semis and finals at neutral sites, check if we need to swap based on seed
  if (advancement.nextRound === 'Semis' || advancement.nextRound === 'Final') {
    // After updating, check if both teams are set
    const newHomeSeed = updateData.home_seed || nextGame.home_seed;
    const newAwaySeed = updateData.away_seed || nextGame.away_seed;
    const newHomeTeam = updateData.home_team || nextGame.home_team;
    const newAwayTeam = updateData.away_team || nextGame.away_team;
    
    if (newHomeSeed && newAwaySeed && newHomeTeam && newAwayTeam) {
      // Both teams known - higher seed (lower number) should be "home"
      if (newAwaySeed < newHomeSeed) {
        // Swap - away seed is actually higher (lower number = better seed)
        updateData.home_team = newAwayTeam;
        updateData.home_seed = newAwaySeed;
        updateData.away_team = newHomeTeam;
        updateData.away_seed = newHomeSeed;
      }
    }
  } else {
    // For quarters, update location to winner's gym
    if (advancement.slot === 'home') {
      updateData.location = `${winnerTeam} HS`;
    }
  }
  
  // Update the next game
  const updateResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(nextGameId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    }
  );
  
  if (!updateResponse.ok) {
    console.error('Failed to update next game:', await updateResponse.text());
    return null;
  }
  
  console.log(`Advanced ${winnerTeam} (${winnerSeed}) to ${advancement.nextRound} position ${advancement.nextPosition}`);
  
  return {
    advanced: true,
    nextRound: advancement.nextRound,
    nextPosition: advancement.nextPosition,
    nextGameId
  };
}

export default async (request) => {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { game_id, away_score, home_score, time, game_status } = await request.json();
    
    // Validate inputs
    if (!game_id) {
      return new Response(JSON.stringify({ error: 'game_id is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase config');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the current game with all relevant fields
    const getResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(game_id)}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    if (!getResponse.ok) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const games = await getResponse.json();
    if (!games || games.length === 0) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentGame = games[0];

    // Build update data
    let updateData = {};

    // If resetting to 0-0 (null scores), restore original time and clear status
    if (away_score === null && home_score === null) {
      updateData = {
        away_score: null,
        home_score: null,
        time: currentGame?.original_time || 'TBD',
        game_status: null
      };
    } else {
      // Saving a score
      const awayScoreInt = parseInt(away_score) || 0;
      const homeScoreInt = parseInt(home_score) || 0;
      
      // Determine the status to save
      // If game_status is provided, use it; otherwise use time field for backward compatibility
      const status = game_status || time || 'FINAL';
      
      updateData = {
        away_score: awayScoreInt,
        home_score: homeScoreInt,
        game_status: status,
        status: null  // Clear any 'scheduled' status so team pages show the score
      };
      
      // Set time field based on status for backward compatibility with schedule display
      if (isFinalStatus(status)) {
        const ot = getOvertimeDisplay(status);
        updateData.time = ot ? `FINAL (${ot})` : 'FINAL';
      } else {
        // Live game - show status (Halftime, End 3rd, etc.)
        updateData.time = status;
      }

      // If this game doesn't have original_time saved yet, save current time
      if (!currentGame?.original_time && currentGame?.time && !currentGame.time.includes('FINAL')) {
        updateData.original_time = currentGame.time;
      }
    }

    // Update the game
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=eq.${encodeURIComponent(game_id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Supabase update error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to update game' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if this is a playoff game that just became final
    let advancementResult = null;
    
    if (currentGame.is_playoff && 
        isFinalStatus(updateData.game_status) && 
        updateData.away_score !== null && 
        updateData.home_score !== null) {
      
      // Determine winner
      const homeWins = updateData.home_score > updateData.away_score;
      const winnerTeam = homeWins ? currentGame.home_team : currentGame.away_team;
      const winnerSeed = homeWins ? currentGame.home_seed : currentGame.away_seed;
      
      console.log(`Playoff game final: ${currentGame.away_team} ${updateData.away_score} @ ${currentGame.home_team} ${updateData.home_score}`);
      console.log(`Winner: ${winnerTeam} (seed ${winnerSeed})`);
      
      // Advance winner to next round
      advancementResult = await advanceWinner(currentGame, winnerTeam, winnerSeed);
    }

    return new Response(JSON.stringify({ 
      success: true,
      game_id,
      away_score: updateData.away_score,
      home_score: updateData.home_score,
      game_status: updateData.game_status,
      time: updateData.time,
      advancement: advancementResult
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Update score error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
