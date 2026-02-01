// Ball603 RPI Calculator
// Scheduled: Mondays at 6 AM ET (11 AM UTC)
// Also callable manually via POST from admin panel

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const GENDERS = ['Boys', 'Girls'];
const DIVISIONS = ['D-I', 'D-II', 'D-III', 'D-IV'];

// ===== HELPERS =====

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Range': '0-9999'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabaseUpsert(table, data, onConflict) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal,resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase UPSERT ${table} failed: ${res.status} ${text}`);
  }
  return res;
}

// ===== RPI CALCULATION =====

function calculateRPIForGender(completedGames, standings) {
  // Build team records and divisions from standings
  const teamRecords = new Map();
  const teamDivisions = new Map();
  
  for (const s of standings) {
    teamRecords.set(s.school, { wins: s.wins, losses: s.losses });
    teamDivisions.set(s.school, s.division);
  }
  
  const nhiaaTeams = new Set(standings.map(s => s.school));
  
  // Build opponent lists
  const teamsPlayedMap = new Map();
  for (const game of completedGames) {
    const h = game.home_team, a = game.away_team;
    if (!teamsPlayedMap.has(h)) teamsPlayedMap.set(h, []);
    if (!teamsPlayedMap.has(a)) teamsPlayedMap.set(a, []);
    teamsPlayedMap.get(h).push({ opp: a, wasHome: true });
    teamsPlayedMap.get(a).push({ opp: h, wasHome: false });
  }
  
  // 1. Calculate weighted WP for each team
  // Home win = 0.6, Road win = 1.4, Home loss = 1.4, Road loss = 0.6
  const teamWeightedWP = new Map();
  
  for (const teamName of nhiaaTeams) {
    let wW = 0, wL = 0;
    for (const game of completedGames) {
      const isHome = game.home_team === teamName;
      const isAway = game.away_team === teamName;
      if (!isHome && !isAway) continue;
      const tScore = isHome ? game.home_score : game.away_score;
      const oScore = isHome ? game.away_score : game.home_score;
      if (tScore > oScore) { wW += isHome ? 0.6 : 1.4; }
      else { wL += isHome ? 1.4 : 0.6; }
    }
    const tot = wW + wL;
    teamWeightedWP.set(teamName, tot > 0 ? wW / tot : 0);
  }
  
  // 2. Calculate OWP for each team (excluding head-to-head)
  const teamOWP = new Map();
  
  for (const teamName of nhiaaTeams) {
    const opponents = teamsPlayedMap.get(teamName);
    if (!opponents || opponents.length === 0) { teamOWP.set(teamName, 0); continue; }
    let sum = 0, cnt = 0;
    for (const { opp } of opponents) {
      let oW = 0, oL = 0;
      for (const game of completedGames) {
        const oppIsH = game.home_team === opp, oppIsA = game.away_team === opp;
        if (!oppIsH && !oppIsA) continue;
        // Exclude games against the team we're calculating for
        if (game.home_team === teamName || game.away_team === teamName) continue;
        const oS = oppIsH ? game.home_score : game.away_score;
        const xS = oppIsH ? game.away_score : game.home_score;
        if (oS > xS) oW++; else oL++;
      }
      const t = oW + oL;
      if (t > 0) { sum += oW / t; cnt++; }
    }
    teamOWP.set(teamName, cnt > 0 ? sum / cnt : 0);
  }
  
  // 3. Calculate OOWP for each team
  const teamOOWP = new Map();
  
  for (const teamName of nhiaaTeams) {
    const opponents = teamsPlayedMap.get(teamName);
    if (!opponents || opponents.length === 0) { teamOOWP.set(teamName, 0); continue; }
    let sum = 0, cnt = 0;
    for (const { opp } of opponents) {
      const v = teamOWP.get(opp);
      if (v !== undefined) { sum += v; cnt++; }
    }
    teamOOWP.set(teamName, cnt > 0 ? sum / cnt : 0);
  }
  
  // 4. Build results by division
  const allResults = [];
  
  for (const division of DIVISIONS) {
    const divTeams = [];
    
    for (const teamName of nhiaaTeams) {
      if (teamDivisions.get(teamName) !== division) continue;
      
      const wp = teamWeightedWP.get(teamName) || 0;
      const owp = teamOWP.get(teamName) || 0;
      const oowp = teamOOWP.get(teamName) || 0;
      const rpi = (wp * 0.25) + (owp * 0.50) + (oowp * 0.25);
      const rec = teamRecords.get(teamName);
      
      divTeams.push({
        team: teamName,
        division,
        wins: rec?.wins || 0,
        losses: rec?.losses || 0,
        win_pct: wp,
        owp,
        oowp,
        rpi
      });
    }
    
    // Sort by RPI descending to assign ranks
    divTeams.sort((a, b) => b.rpi - a.rpi);
    divTeams.forEach((t, i) => { t.rank = i + 1; });
    
    allResults.push(...divTeams);
  }
  
  return allResults;
}

// ===== MAIN HANDLER =====

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, GET' } });
  }
  
  try {
    console.log('Starting RPI calculation...');
    const weekOf = getMondayOfWeek();
    const now = new Date().toISOString();
    
    // 1. Fetch all completed NHIAA games
    const allGames = await supabaseGet(
      'games?select=home_team,away_team,home_score,away_score,gender,division' +
      '&level=eq.NHIAA&home_score=not.is.null&away_score=not.is.null'
    );
    console.log(`Fetched ${allGames.length} completed games`);
    
    // 2. Fetch all standings
    const allStandings = await supabaseGet(
      'standings?select=school,gender,division,wins,losses'
    );
    console.log(`Fetched ${allStandings.length} standings entries`);
    
    // 3. Calculate RPI for each gender
    const allResults = [];
    
    for (const gender of GENDERS) {
      const genderGames = allGames.filter(g => g.gender === gender);
      const genderStandings = allStandings.filter(s => s.gender === gender);
      
      if (genderStandings.length === 0) {
        console.log(`No standings for ${gender}, skipping`);
        continue;
      }
      
      const results = calculateRPIForGender(genderGames, genderStandings);
      
      // Tag with gender
      results.forEach(r => { r.gender = gender; });
      allResults.push(...results);
    }
    
    console.log(`Calculated RPI for ${allResults.length} total teams`);
    
    // 4. Fetch historical data for High/Low/Last
    let historyMap = new Map(); // key: "team_gender_division" -> { high, low, last }
    
    try {
      const history = await supabaseGet(
        `rpi_rankings?select=team,gender,division,rank,week_of&week_of=lt.${weekOf}&order=week_of.desc`
      );
      
      // Process history: group by team/gender/division
      for (const row of history) {
        const key = `${row.team}_${row.gender}_${row.division}`;
        if (!historyMap.has(key)) {
          historyMap.set(key, {
            high: row.rank,    // First row (most recent week) starts as high
            low: row.rank,     // and low
            last: row.rank     // Most recent = last week's rank
          });
        } else {
          const entry = historyMap.get(key);
          if (row.rank < entry.high) entry.high = row.rank;
          if (row.rank > entry.low) entry.low = row.rank;
          // last stays as the first row we saw (most recent week due to order)
        }
      }
      
      console.log(`Loaded history for ${historyMap.size} team entries`);
    } catch (histErr) {
      console.log('No historical data found (first run?)', histErr.message);
    }
    
    // 5. Build final rows with High/Low/Last
    const rows = allResults.map(r => {
      const key = `${r.team}_${r.gender}_${r.division}`;
      const hist = historyMap.get(key);
      
      let high_rank, low_rank, last_rank;
      
      if (hist) {
        high_rank = Math.min(r.rank, hist.high);
        low_rank = Math.max(r.rank, hist.low);
        last_rank = hist.last;
      } else {
        // First week for this team
        high_rank = r.rank;
        low_rank = r.rank;
        last_rank = null;
      }
      
      return {
        team: r.team,
        gender: r.gender,
        division: r.division,
        wins: r.wins,
        losses: r.losses,
        win_pct: parseFloat(r.win_pct.toFixed(4)),
        owp: parseFloat(r.owp.toFixed(4)),
        oowp: parseFloat(r.oowp.toFixed(4)),
        rpi: parseFloat(r.rpi.toFixed(4)),
        rank: r.rank,
        high_rank,
        low_rank,
        last_rank,
        calculated_at: now,
        week_of: weekOf
      };
    });
    
    // 6. Batch upsert into rpi_rankings
    if (rows.length > 0) {
      // Upsert in chunks of 100 to avoid request size limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await supabaseUpsert('rpi_rankings', chunk, 'team,gender,division,week_of');
      }
      console.log(`Upserted ${rows.length} rows for week_of=${weekOf}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      totalRows: rows.length,
      weekOf,
      calculatedAt: now,
      breakdown: GENDERS.map(g => ({
        gender: g,
        divisions: DIVISIONS.map(d => ({
          division: d,
          teams: rows.filter(r => r.gender === g && r.division === d).length
        }))
      }))
    }), { status: 200, headers });
    
  } catch (err) {
    console.error('RPI calculation error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers });
  }
};
