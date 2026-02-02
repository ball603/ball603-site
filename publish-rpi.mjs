// Ball603 RPI Calculator
// Scheduled: Mondays at 6 AM ET (11 AM UTC)
// Also callable manually via POST from admin panel
// Add ?test=1 to URL for diagnostic mode

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Parse URL params safely
    let testMode = false;
    let debugTeam = null;
    let debugGender = null;
    try {
      const url = new URL(request.url);
      testMode = url.searchParams.get('test') === '1';
      debugTeam = url.searchParams.get('debug');
      debugGender = url.searchParams.get('gender');
    } catch (e) {
      // Scheduled invocations may not have a real URL
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response('', { status: 204, headers });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    // ===== TEST MODE: Quick diagnostic =====
    if (testMode) {
      return new Response(JSON.stringify({
        success: true,
        test: true,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_KEY,
        supabaseUrlPrefix: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'MISSING',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }), { status: 200, headers });
    }

    // Validate env vars
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing env vars. SUPABASE_URL: ' + (SUPABASE_URL ? 'set' : 'MISSING') + ', SUPABASE_SERVICE_KEY: ' + (SUPABASE_KEY ? 'set' : 'MISSING')
      }), { status: 500, headers });
    }

    // ===== HELPERS =====
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
        throw new Error(`GET ${path.substring(0, 60)} => ${res.status}: ${text.substring(0, 200)}`);
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
        throw new Error(`UPSERT ${table} => ${res.status}: ${text.substring(0, 200)}`);
      }
    }

    // ===== MAIN LOGIC =====
    const GENDERS = ['Boys', 'Girls'];
    const DIVISIONS = ['D-I', 'D-II', 'D-III', 'D-IV'];

    function getMondayOfWeek() {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    }

    const weekOf = getMondayOfWeek();
    const now = new Date().toISOString();

    // 1. Fetch games
    const allGames = await supabaseGet(
      'games?select=home_team,away_team,home_score,away_score,gender,division&level=eq.NHIAA&home_score=not.is.null&away_score=not.is.null'
    );

    // 2. Fetch standings
    const allStandings = await supabaseGet(
      'standings?select=school,gender,division,wins,losses'
    );

    // 3. Fetch future/remaining games (no scores yet)
    const futureGames = await supabaseGet(
      'games?select=home_team,away_team,gender,division&level=eq.NHIAA&home_score=is.null'
    );

    // 4. Calculate RPI for each gender/division
    const allResults = [];

    for (const gender of GENDERS) {
      const games = allGames.filter(g => g.gender === gender);
      const standings = allStandings.filter(s => s.gender === gender);
      const future = futureGames.filter(g => g.gender === gender);
      if (standings.length === 0) continue;

      const teamRecords = new Map();
      const teamDivisions = new Map();
      for (const s of standings) {
        teamRecords.set(s.school, { wins: s.wins, losses: s.losses });
        teamDivisions.set(s.school, s.division);
      }
      const teams = new Set(standings.map(s => s.school));

      // Build remaining opponents map from future games
      const remainingOpps = new Map();
      for (const g of future) {
        if (!remainingOpps.has(g.home_team)) remainingOpps.set(g.home_team, []);
        if (!remainingOpps.has(g.away_team)) remainingOpps.set(g.away_team, []);
        remainingOpps.get(g.home_team).push(g.away_team);
        remainingOpps.get(g.away_team).push(g.home_team);
      }

      // Build opponent lists from completed games
      const oppMap = new Map();
      for (const g of games) {
        if (!oppMap.has(g.home_team)) oppMap.set(g.home_team, []);
        if (!oppMap.has(g.away_team)) oppMap.set(g.away_team, []);
        oppMap.get(g.home_team).push({ opp: g.away_team, wasHome: true });
        oppMap.get(g.away_team).push({ opp: g.home_team, wasHome: false });
      }

      // Weighted WP: Home win=0.6, Road win=1.4, Home loss=1.4, Road loss=0.6
      const weightedWP = new Map();
      for (const team of teams) {
        let wW = 0, wL = 0;
        for (const g of games) {
          const isH = g.home_team === team, isA = g.away_team === team;
          if (!isH && !isA) continue;
          const ts = isH ? g.home_score : g.away_score;
          const os = isH ? g.away_score : g.home_score;
          if (ts > os) wW += isH ? 0.6 : 1.4;
          else wL += isH ? 1.4 : 0.6;
        }
        const t = wW + wL;
        weightedWP.set(team, t > 0 ? wW / t : 0);
      }

      // OWP (exclude head-to-head)
      const owpCalc = new Map();
      for (const team of teams) {
        const opps = oppMap.get(team);
        if (!opps || opps.length === 0) { owpCalc.set(team, 0); continue; }
        let sum = 0, cnt = 0;
        for (const { opp } of opps) {
          let oW = 0, oL = 0;
          for (const g of games) {
            const oH = g.home_team === opp, oA = g.away_team === opp;
            if (!oH && !oA) continue;
            if (g.home_team === team || g.away_team === team) continue;
            if ((oH ? g.home_score : g.away_score) > (oH ? g.away_score : g.home_score)) oW++;
            else oL++;
          }
          if (oW + oL > 0) { sum += oW / (oW + oL); cnt++; }
        }
        owpCalc.set(team, cnt > 0 ? sum / cnt : 0);
      }

      // OOWP
      const oowpCalc = new Map();
      for (const team of teams) {
        const opps = oppMap.get(team);
        if (!opps || opps.length === 0) { oowpCalc.set(team, 0); continue; }
        let sum = 0, cnt = 0;
        for (const { opp } of opps) {
          const v = owpCalc.get(opp);
          if (v !== undefined) { sum += v; cnt++; }
        }
        oowpCalc.set(team, cnt > 0 ? sum / cnt : 0);
      }

      // Build results by division
      const genderResults = [];
      for (const div of DIVISIONS) {
        const divTeams = [];
        for (const team of teams) {
          if (teamDivisions.get(team) !== div) continue;
          const wp = weightedWP.get(team) || 0;
          const owp = owpCalc.get(team) || 0;
          const oowp = oowpCalc.get(team) || 0;
          const rec = teamRecords.get(team);
          divTeams.push({
            team, gender, division: div,
            wins: rec?.wins || 0, losses: rec?.losses || 0,
            win_pct: wp, owp, oowp,
            rpi: (wp * 0.25) + (owp * 0.50) + (oowp * 0.25)
          });
        }
        divTeams.sort((a, b) => b.rpi - a.rpi);
        divTeams.forEach((t, i) => { t.rank = i + 1; });
        genderResults.push(...divTeams);
      }

      // Build team -> RPI lookup for this gender (across all divisions)
      const teamRPI = new Map();
      for (const r of genderResults) {
        teamRPI.set(r.team, r.rpi);
      }

      // Calculate Remaining SOS = average RPI of remaining opponents
      for (const r of genderResults) {
        const opps = remainingOpps.get(r.team);
        if (!opps || opps.length === 0) {
          r.remaining_sos = null;
        } else {
          let sum = 0, cnt = 0;
          for (const opp of opps) {
            const oppRpi = teamRPI.get(opp);
            if (oppRpi !== undefined) {
              sum += oppRpi;
              cnt++;
            }
          }
          r.remaining_sos = cnt > 0 ? sum / cnt : null;
        }
      }

      allResults.push(...genderResults);
    }

    // ===== DEBUG MODE =====
    if (debugTeam && debugGender) {
      // Re-derive detailed breakdown for the requested team
      const gender = debugGender;
      const team = debugTeam;
      const games = allGames.filter(g => g.gender === gender);
      const standings = allStandings.filter(s => s.gender === gender);
      const future = futureGames.filter(g => g.gender === gender);
      
      const teamRecords = new Map();
      const teamDivisions = new Map();
      for (const s of standings) {
        teamRecords.set(s.school, { wins: s.wins, losses: s.losses });
        teamDivisions.set(s.school, s.division);
      }
      const teams = new Set(standings.map(s => s.school));
      
      if (!teams.has(team)) {
        return new Response(JSON.stringify({
          error: 'Team not found: ' + team,
          gender: gender,
          availableTeams: [...teams].sort()
        }, null, 2), { status: 200, headers });
      }
      
      // Build opponent list
      const oppMap = new Map();
      for (const g of games) {
        if (!oppMap.has(g.home_team)) oppMap.set(g.home_team, []);
        if (!oppMap.has(g.away_team)) oppMap.set(g.away_team, []);
        oppMap.get(g.home_team).push({ opp: g.away_team, wasHome: true });
        oppMap.get(g.away_team).push({ opp: g.home_team, wasHome: false });
      }
      
      // 1. WEIGHTED WIN % - show each game
      const debugGames = [];
      let wW = 0, wL = 0;
      for (const g of games) {
        const isH = g.home_team === team, isA = g.away_team === team;
        if (!isH && !isA) continue;
        const ts = isH ? g.home_score : g.away_score;
        const os = isH ? g.away_score : g.home_score;
        const won = ts > os;
        const loc = isH ? 'Home' : 'Away';
        const weight = won ? (isH ? 0.6 : 1.4) : (isH ? 1.4 : 0.6);
        if (won) wW += weight; else wL += weight;
        debugGames.push({
          opponent: isH ? g.away_team : g.home_team,
          score: ts + '-' + os,
          location: loc,
          result: won ? 'W' : 'L',
          weight: weight,
          weightType: won ? (isH ? 'Home W (0.6)' : 'Road W (1.4)') : (isH ? 'Home L (1.4)' : 'Road L (0.6)')
        });
      }
      const wpTotal = wW + wL;
      const weightedWPVal = wpTotal > 0 ? wW / wpTotal : 0;
      
      // 2. OWP - each opponent's record excluding games vs this team
      const opps = oppMap.get(team) || [];
      const debugOWP = [];
      let owpSum = 0, owpCnt = 0;
      for (const { opp } of opps) {
        let oW = 0, oL = 0;
        const oppGamesDetail = [];
        for (const g of games) {
          const oH = g.home_team === opp, oA = g.away_team === opp;
          if (!oH && !oA) continue;
          if (g.home_team === team || g.away_team === team) continue; // exclude H2H
          const oppScore = oH ? g.home_score : g.away_score;
          const otherScore = oH ? g.away_score : g.home_score;
          const oppWon = oppScore > otherScore;
          if (oppWon) oW++; else oL++;
          oppGamesDetail.push({
            vs: oH ? g.away_team : g.home_team,
            score: oppScore + '-' + otherScore,
            result: oppWon ? 'W' : 'L'
          });
        }
        const oppWP = (oW + oL) > 0 ? oW / (oW + oL) : null;
        if (oppWP !== null) { owpSum += oppWP; owpCnt++; }
        debugOWP.push({
          opponent: opp,
          division: teamDivisions.get(opp) || 'unknown',
          recordExcludingH2H: oW + '-' + oL,
          winPct: oppWP !== null ? parseFloat(oppWP.toFixed(4)) : null,
          gamesExcludingH2H: oppGamesDetail
        });
      }
      const owpVal = owpCnt > 0 ? owpSum / owpCnt : 0;
      
      // 3. OOWP - each opponent's OWP
      // First compute OWP for all teams
      const allOWP = new Map();
      for (const t of teams) {
        const tOpps = oppMap.get(t) || [];
        let s = 0, c = 0;
        for (const { opp: o } of tOpps) {
          let ow = 0, ol = 0;
          for (const g of games) {
            const oh = g.home_team === o, oa = g.away_team === o;
            if (!oh && !oa) continue;
            if (g.home_team === t || g.away_team === t) continue;
            if ((oh ? g.home_score : g.away_score) > (oh ? g.away_score : g.home_score)) ow++; else ol++;
          }
          if (ow + ol > 0) { s += ow / (ow + ol); c++; }
        }
        allOWP.set(t, c > 0 ? s / c : 0);
      }
      
      const debugOOWP = [];
      let oowpSum = 0, oowpCnt = 0;
      for (const { opp } of opps) {
        const v = allOWP.get(opp);
        if (v !== undefined) { oowpSum += v; oowpCnt++; }
        debugOOWP.push({
          opponent: opp,
          owpValue: v !== undefined ? parseFloat(v.toFixed(4)) : null
        });
      }
      const oowpVal = oowpCnt > 0 ? oowpSum / oowpCnt : 0;
      
      const rpiVal = (weightedWPVal * 0.25) + (owpVal * 0.50) + (oowpVal * 0.25);
      
      // Find the team's result in allResults
      const teamResult = allResults.find(r => r.team === team && r.gender === gender);
      
      return new Response(JSON.stringify({
        team: team,
        gender: gender,
        division: teamDivisions.get(team),
        record: teamRecords.get(team),
        totalNHIAAGamesInDB: games.length,
        
        step1_weightedWinPct: {
          explanation: 'Home W=0.6, Road W=1.4, Home L=1.4, Road L=0.6. WP = weightedWins / (weightedWins + weightedLosses)',
          games: debugGames,
          weightedWins: parseFloat(wW.toFixed(4)),
          weightedLosses: parseFloat(wL.toFixed(4)),
          weightedWinPct: parseFloat(weightedWPVal.toFixed(4)),
          contributes: '25% of RPI = ' + parseFloat((weightedWPVal * 0.25).toFixed(4))
        },
        
        step2_OWP: {
          explanation: 'For each opponent, calculate their W-L record EXCLUDING games vs ' + team + '. Average all opponent win%s.',
          opponents: debugOWP,
          owpSum: parseFloat(owpSum.toFixed(4)),
          owpCount: owpCnt,
          owpAverage: parseFloat(owpVal.toFixed(4)),
          contributes: '50% of RPI = ' + parseFloat((owpVal * 0.50).toFixed(4))
        },
        
        step3_OOWP: {
          explanation: 'For each opponent, get THEIR OWP value. Average all.',
          opponents: debugOOWP,
          oowpSum: parseFloat(oowpSum.toFixed(4)),
          oowpCount: oowpCnt,
          oowpAverage: parseFloat(oowpVal.toFixed(4)),
          contributes: '25% of RPI = ' + parseFloat((oowpVal * 0.25).toFixed(4))
        },
        
        finalRPI: {
          formula: '(WP × 0.25) + (OWP × 0.50) + (OOWP × 0.25)',
          calculation: parseFloat(weightedWPVal.toFixed(4)) + ' × 0.25 + ' + parseFloat(owpVal.toFixed(4)) + ' × 0.50 + ' + parseFloat(oowpVal.toFixed(4)) + ' × 0.25',
          rpi: parseFloat(rpiVal.toFixed(4)),
          rank: teamResult ? teamResult.rank : null
        }
      }, null, 2), { status: 200, headers });
    }

    // 4. Fetch historical data for High/Low/Last
    const historyMap = new Map();
    try {
      const history = await supabaseGet(
        'rpi_rankings?select=team,gender,division,rank,week_of&week_of=lt.' + weekOf + '&order=week_of.desc'
      );
      for (const row of history) {
        const key = row.team + '_' + row.gender + '_' + row.division;
        if (!historyMap.has(key)) {
          historyMap.set(key, { high: row.rank, low: row.rank, last: row.rank });
        } else {
          const e = historyMap.get(key);
          if (row.rank < e.high) e.high = row.rank;
          if (row.rank > e.low) e.low = row.rank;
        }
      }
    } catch (histErr) {
      // First run or table empty - that's fine
    }

    // 6. Build rows
    const rows = allResults.map(function(r) {
      const key = r.team + '_' + r.gender + '_' + r.division;
      const h = historyMap.get(key);
      return {
        team: r.team, gender: r.gender, division: r.division,
        wins: r.wins, losses: r.losses,
        win_pct: parseFloat(r.win_pct.toFixed(4)),
        owp: parseFloat(r.owp.toFixed(4)),
        oowp: parseFloat(r.oowp.toFixed(4)),
        rpi: parseFloat(r.rpi.toFixed(4)),
        rank: r.rank,
        high_rank: h ? Math.min(r.rank, h.high) : r.rank,
        low_rank: h ? Math.max(r.rank, h.low) : r.rank,
        last_rank: h ? h.last : null,
        remaining_sos: r.remaining_sos !== null ? parseFloat(r.remaining_sos.toFixed(4)) : null,
        calculated_at: now,
        week_of: weekOf
      };
    });

    // 6. Upsert
    if (rows.length > 0) {
      var CHUNK = 100;
      for (var i = 0; i < rows.length; i += CHUNK) {
        await supabaseUpsert('rpi_rankings', rows.slice(i, i + CHUNK), 'team,gender,division,week_of');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalRows: rows.length,
      weekOf: weekOf,
      calculatedAt: now
    }), { status: 200, headers: headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: String(err.message || err)
    }), { status: 500, headers: headers });
  }
};
