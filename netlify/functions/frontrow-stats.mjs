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
    out.push({ t, end: t + len, side, pts });
    t += len;
    side = side === 'away' ? 'home' : 'away';
  }
  return out;
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

    const score = { away: 0, home: 0 };
    let poss = null;
    for (const d of drives(cycleNo * 7919 + i * 104729)) {
      if (d.t > gameSec) break;
      if (d.end <= gameSec) {
        if (d.pts > 0) score[d.side] += d.pts;
        if (d.pts < 0) score[d.side === 'away' ? 'home' : 'away'] += 2;
      } else poss = d.side;
    }
    if (status !== 'live') poss = null;
    return { ...g, status, period, clock, score, poss, kickoff };
  });
}

export function toXml(games, nowMs = Date.now()) {
  const rows = games.map((g) => `  <game id="${g.id}" sport="football" status="${g.status}" period="${g.period}" clock="${g.clock}" kickoff="${new Date(g.kickoff).toISOString()}"${g.poss ? ` poss="${g.poss === 'away' ? 'V' : 'H'}"` : ''}>
    <team vh="V" id="${g.away}" score="${g.score.away}"/>
    <team vh="H" id="${g.home}" score="${g.score.home}"/>
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
