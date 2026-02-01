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
    try {
      const url = new URL(request.url);
      testMode = url.searchParams.get('test') === '1';
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

    // 3. Calculate RPI for each gender/division
    const allResults = [];

    for (const gender of GENDERS) {
      const games = allGames.filter(g => g.gender === gender);
      const standings = allStandings.filter(s => s.gender === gender);
      if (standings.length === 0) continue;

      const teamRecords = new Map();
      const teamDivisions = new Map();
      for (const s of standings) {
        teamRecords.set(s.school, { wins: s.wins, losses: s.losses });
        teamDivisions.set(s.school, s.division);
      }
      const teams = new Set(standings.map(s => s.school));

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
        allResults.push(...divTeams);
      }
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

    // 5. Build rows
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
