// Test football stats feed for the NEC Front Row sample site.
// Seven games that play out in real time with a mix of states:
// starting soon, live (quarters, clock, who has the ball), halftime and final.
// Nothing is stored. Everything is worked out from the current time, so
// every visitor sees the same games, and the response can be cached for a few seconds.
// When a real stats feed is available, the site points at that instead.

const GAMES = [
  { id: 'e1', away: 'NSU',  home: 'RMU'  },
  { id: 'e2', away: 'WAG',  home: 'CCSU' },
  { id: 'e3', away: 'RIO',  home: 'DUQ'  },
  { id: 'e4', away: 'GSU',  home: 'MERC' },
  { id: 'e5', away: 'NOVA', home: 'LIU'  },
  { id: 'e6', away: 'BRWN', home: 'UNH'  },
  { id: 'e7', away: 'ALB',  home: 'LIU'  },
];

// Real-time seconds for each part of a game
const PRE = 1800;          // shows as "starting soon" for 30 minutes
const Q = 1320;            // each quarter takes 22 real minutes
const HALF = 720;          // 12-minute halftime
const FINAL = 2400;        // stays "Final" for 40 minutes
const LIVE = Q * 4 + HALF;
export const CYCLE = PRE + LIVE + FINAL;
const QGAME = 900;         // a quarter is 15:00 on the game clock

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Every drive in one game: start time (game seconds), team with the ball, points scored at the end
function drives(seed) {
  const r = rng(seed), out = [];
  let t = 0, side = r() < 0.5 ? 'away' : 'home';
  // home team is a bit stronger, so scores aren't coin flips
  const edge = 0.04 + r() * 0.1;
  while (t < QGAME * 4) {
    const len = 150 + Math.floor(r() * 330);
    const x = r() + (side === 'home' ? edge : -edge);
    let pts = 0;
    if (x > 0.62) pts = r() < 0.9 ? 7 : (r() < 0.5 ? 6 : 8);
    else if (x > 0.42) pts = 3;
    else if (x < 0.02) pts = -2;  // safety for the other team
    const how = pts >= 6 ? (r() < 0.6 ? 'pass' : 'rush') : null;
    out.push({ t, end: t + len, side, pts, how });
    t += len;
    side = side === 'away' ? 'home' : 'away';
  }
  return out;
}

// Made-up rosters so the stat leaders have names
const FIRST = ['Jalen','Marcus','Tyler','Devin','Chris','Jordan','Isaiah','Caleb','Malik','Ethan','Darius','Logan','Xavier','Nate','Trey','Aiden','Cam','Elijah','Brandon','Jaylen'];
const LAST = ['Johnson','Williams','Carter','Brooks','Mitchell','Hayes','Coleman','Price','Sullivan','Bennett','Reed','Foster','Hughes','Ward','Morgan','Powell','Russell','Murphy','Gray','Daniels'];
const name = (r) => `${FIRST[Math.floor(r() * FIRST.length)][0]}. ${LAST[Math.floor(r() * LAST.length)]}`;

// End-of-game totals for one team; what's shown grows toward these as the game goes on
function teamPlan(seed){
  const r = rng(seed);
  const rush = 80 + Math.floor(r() * 180), pass = 120 + Math.floor(r() * 220);
  return {
    rush, pass,
    first: Math.round((rush + pass) / 17) + Math.floor(r() * 4),
    to: Math.floor(r() * 3.6), pen: 3 + Math.floor(r() * 8), top: 0.44 + r() * 0.12,
    qb: name(r), att: 22 + Math.floor(r() * 18), pct: 0.55 + r() * 0.15,
    rb: name(r), car: 12 + Math.floor(r() * 14), rbShare: 0.45 + r() * 0.2,
    wr: name(r), rec: 4 + Math.floor(r() * 6), wrShare: 0.3 + r() * 0.15,
  };
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function snapshot(nowMs = Date.now()) {
  const now = Math.floor(nowMs / 1000);
  return GAMES.map((g, i) => {
    const offset = Math.floor((i * CYCLE) / GAMES.length) + i * 137;
    const pos = (now + offset) % CYCLE;
    const cycleNo = Math.floor((now + offset) / CYCLE);
    const kickoff = (now - pos + PRE) * 1000;   // when this game kicks off (ms)

    let status, period = 0, clock = '', gameSec = 0;
    if (pos < PRE) { status = 'pre'; }
    else if (pos < PRE + LIVE) {
      let p = pos - PRE;
      if (p < Q * 2) { period = Math.floor(p / Q) + 1; }
      else if (p < Q * 2 + HALF) { status = 'half'; period = 2; gameSec = QGAME * 2; }
      else { p -= HALF; period = Math.floor(p / Q) + 1; }
      if (!status) {
        status = 'live';
        const inQ = (p % Q) / Q * QGAME;
        gameSec = (period - 1) * QGAME + inQ;
        clock = mmss(QGAME - inQ);
      }
    } else { status = 'final'; period = 4; gameSec = QGAME * 4; }

    const seed = cycleNo * 7919 + i * 104729;
    const score = { away: 0, home: 0 };
    const lines = { away: [0, 0, 0, 0], home: [0, 0, 0, 0] };
    const tds = { away: { pass: 0, rush: 0 }, home: { pass: 0, rush: 0 } };
    let poss = null;
    for (const d of drives(seed)) {
      if (d.t > gameSec) break;
      if (d.end <= gameSec) {
        const q = Math.min(3, Math.floor(Math.max(0, d.end - 1) / QGAME));
        if (d.pts > 0) { score[d.side] += d.pts; lines[d.side][q] += d.pts; }
        if (d.pts < 0) { const o = d.side === 'away' ? 'home' : 'away'; score[o] += 2; lines[o][q] += 2; }
        if (d.how) tds[d.side][d.how]++;
      } else poss = d.side;
    }
    if (status !== 'live') poss = null;

    // Team stats and leaders, growing with the game clock
    const f = gameSec / (QGAME * 4);
    const stats = {}, leaders = {};
    for (const side of ['away', 'home']) {
      const p = teamPlan(seed + (side === 'away' ? 11 : 23));
      const rush = Math.round(p.rush * f), pass = Math.round(p.pass * f);
      const att = Math.round(p.att * f), comp = Math.round(att * p.pct);
      stats[side] = {
        firstdowns: Math.round(p.first * f), totalyds: rush + pass, rushyds: rush, passyds: pass,
        turnovers: Math.floor(p.to * f), penalties: Math.floor(p.pen * f), penyds: Math.floor(p.pen * f) * 8,
        top: Math.round(gameSec * (side === 'away' ? p.top : 1 - p.top)),
      };
      leaders[side] = {
        pass: { name: p.qb, comp, att, yds: pass, td: tds[side].pass },
        rush: { name: p.rb, car: Math.round(p.car * f), yds: Math.round(rush * p.rbShare), td: tds[side].rush },
        rec:  { name: p.wr, rec: Math.round(p.rec * f), yds: Math.round(pass * p.wrShare), td: Math.ceil(tds[side].pass / 2) },
      };
    }
    // the home team's share of time of possession is what's left
    return { ...g, status, period, clock, score, poss, kickoff, lines, stats, leaders };
  });
}

export function toXml(games, nowMs = Date.now()) {
  const team = (g, side) => {
    const s = g.stats[side], L = g.leaders[side], played = Math.min(g.period, 4);
    const lines = g.status === 'pre' ? '' : g.lines[side].slice(0, Math.max(played, 1)).map((v, q) => `<lineprd prd="${q + 1}" score="${v}"/>`).join('');
    return `    <team vh="${side === 'away' ? 'V' : 'H'}" id="${side === 'away' ? g.away : g.home}" score="${g.score[side]}">
      <linescore>${lines}</linescore>
      <totals firstdowns="${s.firstdowns}" totalyds="${s.totalyds}" rushyds="${s.rushyds}" passyds="${s.passyds}" turnovers="${s.turnovers}" penalties="${s.penalties}" penyds="${s.penyds}" top="${mmss(s.top)}"/>
      <leaders>
        <pass name="${L.pass.name}" comp="${L.pass.comp}" att="${L.pass.att}" yds="${L.pass.yds}" td="${L.pass.td}"/>
        <rush name="${L.rush.name}" car="${L.rush.car}" yds="${L.rush.yds}" td="${L.rush.td}"/>
        <rec name="${L.rec.name}" rec="${L.rec.rec}" yds="${L.rec.yds}" td="${L.rec.td}"/>
      </leaders>
    </team>`;
  };
  const rows = games.map((g) => `  <game id="${g.id}" sport="football" status="${g.status}" period="${g.period}" clock="${g.clock}" kickoff="${new Date(g.kickoff).toISOString()}"${g.poss ? ` poss="${g.poss === 'away' ? 'V' : 'H'}"` : ''}>
${team(g, 'away')}
${team(g, 'home')}
  </game>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<livestats source="Pack Network test feed" conference="NEC" generated="${new Date(nowMs).toISOString()}">
${rows}
</livestats>
`;
}

export default async () =>
  new Response(toXml(snapshot()), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'access-control-allow-origin': '*',
      // one copy every 5 seconds serves everyone, so huge crowds don't add load
      'cache-control': 'public, max-age=5',
      'netlify-cdn-cache-control': 'public, max-age=5, stale-while-revalidate=10',
    },
  });
