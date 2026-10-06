// Fake NEC live stats feed for the multiview demo.
// Four basketball games that play out in real time. Nothing is stored:
// the score, clock and status are worked out from the current time,
// so every visitor sees the same games. Each game lasts 50 minutes
// (two 20-minute halves, a 5-minute halftime, 5 minutes as Final), then a new one starts.

const GAMES = [
  { id: 'g1', sport: 'MBB', label: "Men's Basketball", away: ['LIU', 'LIU'], home: ['WAG', 'Wagner'], offset: 1900 },
  { id: 'g2', sport: 'WBB', label: "Women's Basketball", away: ['FDU', 'Fairleigh Dickinson'], home: ['CCSU', 'Central Connecticut'], offset: 600 },
  { id: 'g3', sport: 'MBB', label: "Men's Basketball", away: ['LEM', 'Le Moyne'], home: ['STO', 'Stonehill'], offset: 1350 },
  { id: 'g4', sport: 'WBB', label: "Women's Basketball", away: ['CHS', 'Chicago State'], home: ['MERC', 'Mercyhurst'], offset: 2800 },
];

const HALF = 1200, BREAK = 300, CYCLE = HALF * 2 + BREAK * 2; // seconds

// Small seeded random so a game's scoring is the same for everyone
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// All scoring plays for one game: [gameSecond, side, points]
function plays(seed) {
  const r = rng(seed), out = [];
  let t = 15;
  while (t < HALF * 2) {
    const side = r() < 0.5 ? 'away' : 'home';
    const x = r();
    const pts = x < 0.28 ? 3 : x < 0.85 ? 2 : 1;
    out.push([t, side, pts]);
    t += 18 + Math.floor(r() * 34);
  }
  return out;
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function snapshot(nowMs = Date.now()) {
  const now = Math.floor(nowMs / 1000);
  return GAMES.map((g, i) => {
    const pos = (now + g.offset) % CYCLE;
    const cycleNo = Math.floor((now + g.offset) / CYCLE);
    // game seconds played so far, plus status
    let played, status, period, clock;
    if (pos < HALF) { played = pos; status = 'live'; period = 1; clock = mmss(HALF - pos); }
    else if (pos < HALF + BREAK) { played = HALF; status = 'half'; period = 1; clock = '0:00'; }
    else if (pos < HALF * 2 + BREAK) { played = pos - BREAK; status = 'live'; period = 2; clock = mmss(HALF * 2 + BREAK - pos); }
    else { played = HALF * 2; status = 'final'; period = 2; clock = '0:00'; }

    const score = { away: 0, home: 0 };
    let last = null;
    for (const p of plays(cycleNo * 7919 + i * 104729)) {
      if (p[0] > played) break;
      score[p[1]] += p[2];
      last = p;
    }
    const lastplay = last
      ? `${g[last[1]][0]} ${last[2] === 3 ? '3-pointer' : last[2] === 2 ? 'basket' : 'free throw'}`
      : 'Tip-off';
    return { ...g, status, period, clock, score, lastplay };
  });
}

export function toXml(games, nowMs = Date.now()) {
  const rows = games.map((g) => `  <game id="${g.id}" sport="${g.sport}" label="${esc(g.label)}" status="${g.status}" period="${g.period}" clock="${g.clock}">
    <team vh="V" id="${g.away[0]}" name="${esc(g.away[1])}" score="${g.score.away}"/>
    <team vh="H" id="${g.home[0]}" name="${esc(g.home[1])}" score="${g.score.home}"/>
    <lastplay>${esc(g.lastplay)}</lastplay>
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
      'cache-control': 'no-store',
    },
  });
