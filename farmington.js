/* Farmington Tigers — shared data layer, header and formatting.
 *
 * Every Tigers page loads this and farmington.css. Nothing is styled inline,
 * and no page talks to Supabase on its own: pages ask FT for teams, games,
 * standings and rosters, and get them already merged, named and sorted the way
 * farmington_teams says they should be.
 */
(function () {
'use strict';

const SB  = 'https://suncdkxfqkwwnmhosxcf.supabase.co/rest/v1/';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNka3hmcWt3d25taG9zeGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTk4MzIsImV4cCI6MjA4MDYzNTgzMn0.aT6V8Zx_YozqOh1ZnC6x-czI9vo-QhHKmP69PgY-8xw';

/* ── Vocabulary ─────────────────────────────────────────────────────────── */

// Arbiter's numeric sport ids, with the emoji the schedule uses to flag each
// one and the Ball603 sport key where Ball603 covers it. A sport with no
// ball603 key gets no team links — Ball603 has no page to send anyone to.
// `roster` is how roster_submissions spells the sport, which is NOT the same
// question as `ball603`. A roster can be filed for a sport Ball603 does not
// cover — the Tigers' soccer squad is exactly that — and the two were the same
// field until one arrived, at which point the page called it "soccer" with a
// trophy beside it because nothing matched.
const SPORTS = {
  63: { name: 'Volleyball',    emoji: '\u{1F3D0}', order: 1, ball603: 'gvolleyball', roster: 'gvolleyball' },
  50: { name: 'Soccer',        emoji: '⚽',     order: 2, roster: 'soccer' },
  25: { name: 'Football',      emoji: '\u{1F3C8}', order: 3, roster: 'football' },
  29: { name: 'Golf',          emoji: '⛳',     order: 4, roster: 'golf' },
  11: { name: 'Cross Country', emoji: '\u{1F3C3}', order: 5, roster: 'crosscountry' },
   4: { name: 'Basketball',    emoji: '\u{1F3C0}', order: 6, ball603: 'basketball', roster: 'basketball' },
   3: { name: 'Baseball',      emoji: '⚾',     order: 7, ball603: 'baseball',   roster: 'baseball' },
  51: { name: 'Softball',      emoji: '\u{1F94E}', order: 8, roster: 'softball' }
};

// Farmington fields no girls soccer, and Arbiter files the same squad under
// Boys on one row and Coed on another. On this site they are one thing.
const GENDERS = { 1: 'Boys', 2: 'Girls', 3: 'Coed' };
const genderLabel = (g, sportId) => (sportId === 50 ? 'Boys' : (GENDERS[g] || ''));

/* Sports that only ever have the one gender, so naming it says nothing. There
   is no girls football, soccer or golf to tell the boys' side apart from, and
   no girls baseball or boys softball either — "Varsity Soccer" is the whole
   name. Volleyball is deliberately not here: Farmington has fielded a boys
   season before and will again, so "Girls Varsity Volleyball" earns its prefix
   even in a year when it is the only volleyball on the site.

   Distinct from genderLabel, which still answers "which gender is this row" for
   the Ball603 lookups that key on it. This one is only ever for display. */
const ONE_GENDER = new Set([50, 25, 29, 3, 51]);  // soccer, football, golf, baseball, softball
// Takes Arbiter's numeric gender id, or a label already in hand — rosters come
// from Ball603's submissions table, which stores "Girls" rather than a 2.
const genderPrefix = (g, sportId) => {
  if (ONE_GENDER.has(Number(sportId))) return '';
  return typeof g === 'string' ? g : genderLabel(g, sportId);
};

/* ── Escaping ───────────────────────────────────────────────────────────── */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ── Dates ──────────────────────────────────────────────────────────────── */
/* Games are stored as bare wall-clock strings ("2026-09-02T18:15:00") so that
   nothing can shift them. Parsing by hand keeps that promise: `new Date()` on a
   bare string is browser-dependent, and that is how a 6:15 game becomes 2:15
   for somebody. */

function parseLocal(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
}

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayKey = () => dateKey(new Date());

function dayLabel(key, opts) {
  const d = parseLocal(key);
  if (!d) return key;
  const long = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (opts && opts.plain) return long;
  if (key === todayKey()) return 'Today · ' + long;
  return long;
}

const shortDate = (key) => {
  const d = parseLocal(key);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
};

/* "2025-26", the way the submitted rosters already write it. A school year runs
   August to June, so a date in the autumn belongs to the year that is starting
   and one in the spring to the year that is ending; July is the gap between
   them and counts as the year ahead. Derived rather than stored because the
   games and standings feeds carry no season of their own, and a schedule bar
   that disagreed with the roster bar would be worse than no season at all. */
function seasonLabel(key) {
  const d = (key && parseLocal(key)) || new Date();
  const start = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// The season a list of games belongs to. The first game is the one to ask: a
// team viewed in June is still in the season that began the previous autumn.
const seasonOfGames = (games) =>
  seasonLabel(games && games.length ? games[0].game_date : null);

function timeLabel(s) {
  const d = parseLocal(s);
  // Midnight means the AD never set a time, not a game at midnight.
  if (!d || (d.getHours() === 0 && d.getMinutes() === 0)) return 'TBA';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '');
}

/* The current Sunday-to-Saturday week, read off the visitor's own clock. It
   rolls over by itself at Sunday midnight — there is nothing scheduled to run
   and nothing to go stale. */
function weekWindow(now) {
  const base = now || new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start, end, from: dateKey(start), to: dateKey(end) };
}

/* ── Scores ─────────────────────────────────────────────────────────────── */
/* A hand-entered score always wins. That is the whole point of the manual
   columns: the sync refreshes Arbiter's numbers five times a day and would
   otherwise walk over anything typed in by hand. */

function scoreOf(g) {
  if (g.manual_my_score != null && g.manual_opp_score != null) {
    return { us: g.manual_my_score, them: g.manual_opp_score, manual: true };
  }
  if (g.arbiter_my_score != null && g.arbiter_opp_score != null) {
    return { us: g.arbiter_my_score, them: g.arbiter_opp_score, manual: false };
  }
  return null;
}
const resultOf = (sc) => sc ? (sc.us > sc.them ? 'W' : sc.us < sc.them ? 'L' : 'T') : null;

/* Everything derivable from one team's own games: the record, the home and away
   splits, and the current streak. This works for every sport and every level,
   because it only ever looks at Farmington's results. It is also exactly why the
   division standings table cannot show the same splits for the other schools in
   it — we hold Farmington's schedule, not theirs. */
function recordOf(games) {
  let w = 0, l = 0, t = 0, hw = 0, hl = 0, aw = 0, al = 0;
  const results = [];

  // Oldest first, so the streak reads off the end.
  const played = games
    .filter(g => !g.is_meet && scoreOf(g))
    .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));

  for (const g of played) {
    const r = resultOf(scoreOf(g));
    if (r === 'W') w++; else if (r === 'L') l++; else t++;
    results.push(r);
    // A tie belongs in the record but not in a home or away win-loss split.
    if (r === 'T') continue;
    if (g.is_home) { if (r === 'W') hw++; else hl++; }
    else           { if (r === 'W') aw++; else al++; }
  }

  let streak = '—';
  if (results.length) {
    const last = results[results.length - 1];
    let n = 0;
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
    streak = last + n;
  }

  return {
    w, l, t, played: w + l + t,
    text: `${w}–${l}${t ? '–' + t : ''}`,
    home: `${hw}–${hl}`, away: `${aw}–${al}`, streak
  };
}

/* How an opponent is named anywhere on the site: the Ball603 shortname when the
   school has one, so the summary strip and This Week read the same as the table
   rather than "Epping Middle and High Schools" in one place and "Epping" in the
   next. Meets have no opponent and are named by the meet instead. */
/* "Somersworth Middle School" is Somersworth to everyone who reads this site,
   and the extra words cost a column's worth of width on a phone. Only the
   school-type tail comes off, and only when the name actually ends in one.
   Schools whose name the tail rule can't reach are renamed outright in
   OPPONENT_RENAMES instead. */
const SCHOOL_TAIL = /\s+(?:middle|high|senior|junior|jr\.?|sr\.?|and|&|\/|-|\s)+\s*schools?\s*$/i;

function shortenSchool(name) {
  const out = String(name || '').replace(SCHOOL_TAIL, '').trim();
  return out || String(name || '');
}

// Arbiter's name → what this site calls the school. Paul Elementary is the
// Wakefield school, and the other two are known by their town.
const OPPONENT_RENAMES = {
  'Deerfield Community School': 'Deerfield',
  'Chichester Central School':  'Chichester',
  'Paul Elementary School':     'Wakefield'
};

function opponentShort(g) {
  const name = g.opponent_name && OPPONENT_RENAMES[g.opponent_name.trim()];
  return g.opponent_ball603 || name || shortenSchool(g.opponent_name);
}

function opponentLabel(g) {
  if (g.is_meet) return g.game_title || g.tournament_name || `${g.team_count}-school meet`;
  return opponentShort(g) || 'Opponent TBA';
}

/* An opponent's crest. Ball603's logo first whenever the short name matches a
   Ball603 school — so Portsmouth Middle School and Dover Middle School wear the
   Portsmouth and Dover high school logos — then Arbiter's school art, then
   nothing. Each image falls through to the next if it isn't there. */
function opponentLogo(g, cls) {
  if (!g || g.is_meet) return '';
  const short = opponentShort(g);
  const srcs = [
    short ? ball603Logo(short) : null,
    g.opponent_entity_id ? `https://assets.arbitersports.com/logos/school/${encodeURIComponent(g.opponent_entity_id)}.jpg` : null
  ].filter(Boolean);
  if (!srcs.length) return '';
  const next = srcs[1] ? ` data-next="${esc(srcs[1])}"` : '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(srcs[0])}"${next} alt="" ` +
    `onerror="if(this.dataset.next){this.src=this.dataset.next;this.removeAttribute('data-next')}else{this.remove()}">`;
}

/* ── Favourite teams ────────────────────────────────────────────────────── */
/* Whose games come first in the ticker. Kept in localStorage, so it is this
   browser's list and nobody's account — there are no accounts, and a family
   that follows the JV volleyball side should not have to make one. */

const FAV_KEY = 'ft_favourite_teams';

function favourites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : [];
  } catch { return []; }          // private browsing, or someone edited it by hand
}

const isFavourite = (uteam) => favourites().includes(Number(uteam));

// The one way anything is written. Everything else goes through here so that
// there is a single place the event is fired from.
function setFavourites(ids) {
  const next = [...new Set((ids || []).map(Number).filter(Number.isFinite))];
  try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* nothing to do */ }
  // Every mounted list and the ticker redraw themselves off this.
  document.dispatchEvent(new CustomEvent('ft:favourites'));
  return next;
}

function toggleFavourite(uteam) {
  const id = Number(uteam);
  const now = favourites();
  return setFavourites(now.includes(id) ? now.filter(x => x !== id) : now.concat(id));
}

const versus = (g) => g.is_meet ? opponentLabel(g)
                                : `${g.is_home ? 'vs' : 'at'} ${opponentLabel(g)}`;

/* NHIAA writes a division differently depending on the sport: volleyball and
   soccer publish "Division III", football publishes "DIV" and "D1 - Central".
   The site says "Division IV" throughout rather than echoing whichever
   shorthand the feed happened to use. */
const ROMAN = { '1': 'I', 'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV' };
function divisionLabel(name) {
  if (!name) return '';
  const raw = String(name).trim();
  if (/^division\b/i.test(raw)) return raw;               // already spelled out
  // IV before I, or "DIV" would match as Division I with a stray V.
  const m = raw.match(/^D\s*(IV|III|II|I|1)\b\s*(?:[-\u2013]\s*(.+))?$/i);
  if (!m) return raw;
  const roman = ROMAN[m[1].toUpperCase()];
  if (!roman) return raw;
  return `Division ${roman}${m[2] ? ' ' + m[2].trim() : ''}`;
}

/* ── Ball603 links ──────────────────────────────────────────────────────── */

const ball603Covers = (sportId) => !!(SPORTS[sportId] && SPORTS[sportId].ball603);
const ball603Slug = (shortname) => String(shortname).toLowerCase().replace(/[^a-z0-9]/g, '');
const ball603Logo = (shortname) => `/logos/100px/${String(shortname).replace(/[^A-Za-z0-9]/g, '')}.png`;

/* The crest to show beside a standings row. Arbiter hands back whatever logo
   the co-op entry carries, which for soccer is Nute's — Farmington and Nute
   field one team and Arbiter files it under Nute's mark. On a Farmington site
   the Tigers wear their own, whoever they co-op with, so our own rows are
   forced to the Farmington crest and everybody else keeps Arbiter's. */
const schoolLogo = (row) =>
  (row && row.is_farmington ? ball603Logo('Farmington') : ((row && row.school_logo_url) || ''));

// A team name is a link only when Ball603 actually covers that sport. Sending a
// soccer visitor to a Ball603 page with no soccer on it would be a dead end.
function teamLink(shortname, sportId, label) {
  const text = esc(label || shortname || '');
  if (!shortname || !ball603Covers(sportId)) return text;
  return `<a class="ft-teamlink" href="https://ball603.com/${esc(ball603Slug(shortname))}"
             target="_blank" rel="noopener">${text}</a>`;
}

/* ── Loading ────────────────────────────────────────────────────────────── */

async function sb(path) {
  const res = await fetch(SB + path, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: '0-4999' }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}`);
  return res.json();
}

let loadPromise = null;

function load() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [teams, games, standings, rosters] = await Promise.all([
      sb('farmington_teams?select=*'),
      sb('farmington_games?select=*&order=starts_at'),
      sb('farmington_standings?select=*&order=rank').catch(() => []),
      sb('roster_submissions?school=eq.Farmington&status=eq.approved&select=*').catch(() => [])
    ]);
    return shape(teams || [], games || [], standings || [], rosters || []);
  })();
  return loadPromise;
}

/* Turn the raw tables into what the pages actually want: teams named and
   ordered the Farmington way, merged squads folded together, hidden ones gone.
   Every page shares this so none of them can disagree about what a team is. */
function shape(rawTeams, rawGames, standings, rosters) {
  const byId = new Map(rawTeams.map(t => [t.uteam, t]));

  // Follow merge_into to whichever team a squad is displayed as. The loop guard
  // is not paranoia: a typo pointing two rows at each other would hang the page.
  function resolve(uteam, depth) {
    const t = byId.get(uteam);
    if (!t || !t.merge_into || (depth || 0) > 5) return uteam;
    return resolve(t.merge_into, (depth || 0) + 1);
  }

  const visible = rawTeams
    .filter(t => !t.hidden)
    .sort((a, b) =>
      (a.level_rank ?? 99) - (b.level_rank ?? 99) ||
      (a.sort_order ?? 99) - (b.sort_order ?? 99) ||
      String(a.display_name || a.description).localeCompare(String(b.display_name || b.description)));

  for (const t of visible) {
    t.name = t.display_name || t.description;
    t.level = t.level_label || '';
    t.games = [];
  }
  const visibleById = new Map(visible.map(t => [t.uteam, t]));

  // Arbiter carries the JV2 volleyball squad as a second team whose three games
  // are already on the Jr. High JV schedule under different game ids. Merging
  // without this check would show those matchups twice.
  const seen = new Set();
  for (const g of rawGames) {
    // Pre-season friendlies are kept in the table but never shown: they are not
    // part of a record and nobody browsing a schedule means them. One test
    // here rather than one on each page, so the schedule, the home page boxes
    // and every record agree about what a season is.
    if (g.is_scrimmage) continue;
    // A game switched off by hand because Arbiter has it wrong (filed under
    // the wrong team, entered twice). The sync never writes this column, so it
    // stays off; the corrected game is usually a hand-added row (is_manual).
    if (g.hidden) continue;
    const target = resolve(g.uteam);
    const team = visibleById.get(target);
    if (!team) continue;
    const dupeKey = `${target}|${g.game_date}|${(g.opponent_name || '').toLowerCase()}`;
    if (seen.has(dupeKey)) continue;
    seen.add(dupeKey);
    g.team = team;
    g.sport = SPORTS[g.sport_id] || { name: 'Other', emoji: '\u{1F3C6}', order: 99 };
    team.games.push(g);
  }
  for (const t of visible) {
    t.games.sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
    // From the games rather than the team row, because a merged squad arrives
    // under two gender ids (Boys on one Arbiter row, Coed on the other) and the
    // games are what genderLabel already reconciles.
    const first = t.games[0];
    t.gender = first ? genderLabel(first.gender_id, first.sport_id) : '';
  }

  const games = visible.flatMap(t => t.games)
    .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));

  // Sports that have a team with at least one game, in playing order.
  const sports = [...new Set(games.map(g => g.sport_id))]
    .filter(id => SPORTS[id])
    .sort((a, b) => SPORTS[a].order - SPORTS[b].order);

  return {
    teams: visible, teamsById: visibleById, games, sports, standings, rosters,
    // The varsity team of a sport, which is what a page should open on: a
    // record that blends varsity, JV and Jr. High is a number nobody means.
    varsityOf(sportId) {
      return visible.find(t => t.level_rank === 1 && t.games.some(g => g.sport_id === sportId))
          || visible.find(t => t.games.some(g => g.sport_id === sportId))
          || null;
    },
    teamsInSport(sportId) {
      return visible.filter(t => t.games.some(g => g.sport_id === sportId));
    },
    // The genders a sport is actually played at, in a stable order. One entry
    // means the sport needs no gender row at all.
    gendersInSport(sportId) {
      const seen = [];
      for (const t of this.teamsInSport(sportId)) {
        if (t.gender && !seen.includes(t.gender)) seen.push(t.gender);
      }
      return seen.sort((a, b) => ['Boys', 'Girls', 'Coed'].indexOf(a) - ['Boys', 'Girls', 'Coed'].indexOf(b));
    },
    // Distinct from varsityOf, which falls back to any team so that clicking a
    // Jr-High-only sport still selects something. This one answers the actual
    // question "does Farmington field a varsity side in this sport".
    hasVarsity(sportId) {
      return visible.some(t => t.level_rank === 1 && t.games.some(g => g.sport_id === sportId));
    }
  };
}

/* ── Installable app ────────────────────────────────────────────────────── */
/* One origin, one app. The Tigers site is served only from
   ball603.com/farmingtontigersnh/ — farmingtontigersnh.com redirects here — so
   the manifest's scope, the worker's scope and the start URL are all simply
   that path.

   It used to answer on both hosts, and a PWA is defined relative to the origin
   it is installed from, so every one of those three had to be worked out at
   runtime from the hostname. That was the root of a long chase over an app icon
   that would not change: the two origins each needed their own manifest path,
   worker scope and icon fetch, and fixing one did nothing for the other.

   The manifest link is still written from here rather than into six HTML heads,
   because that keeps it in one place — but it is now a constant. */
const PWA = {
  base: '/farmingtontigersnh/',
  manifest: '/farmingtontigersnh/manifest.json',
  worker: '/farmingtontigersnh/sw.js'
};

function setupPwa() {
  let link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = PWA.manifest;

  if (!('serviceWorker' in navigator)) return;
  // Service workers need a secure context. Saying so beats a red console error
  // that looks like the code is broken.
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.info('[Tigers] Not a secure context, so no app install here:', location.origin);
    return;
  }

  navigator.serviceWorker.register(PWA.worker, { scope: PWA.base })
    .then(reg => {
      // A deploy should reach an installed app on the next launch, not whenever
      // the browser next feels like checking.
      reg.update();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });
    })
    .catch(err => console.warn('[Tigers] Service worker did not register:', err.message));
}

/* ── Pull to refresh ────────────────────────────────────────────────────── */
/* Only inside the installed app, and only on iOS.
 *
 * A PWA opened from the Home Screen on iOS has no browser chrome and no pull to
 * refresh — Safari's own lives in the toolbar that standalone mode removes, so
 * the gesture everybody expects simply does nothing and the only way to get
 * fresh scores is to close the app and reopen it. Android's PWA shell keeps its
 * native gesture, which is why this stays out of the way there: two of them
 * would fire at once.
 *
 * In an ordinary browser tab it does not run either. The browser already has
 * one, and a second would either double up or fight it. */
const PULL_THRESHOLD = 68;      // how far to drag before a release counts
const PULL_MAX = 104;           // how far the spinner travels, however hard you pull

/* Whether a downward drag starting here belongs to the page or to something
   inside it. The schedule table is its own scrolling box: a drag that starts in
   a half-scrolled table is that table's, not a refresh. */
function dragOwnedByPage(target) {
  for (let el = target; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    const scrolls = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (scrolls && el.scrollTop > 0) return false;
  }
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
}

function setupPullToRefresh() {
  const el = document.getElementById('ft-pull');
  if (!el) return;
  // Android's shell already does this; a browser tab already does this.
  if (!isStandalone() || !isIOS()) return;

  document.body.classList.add('ft-can-pull');

  let startY = 0, pulling = false, ready = false, busy = false;

  const move = (distance) => {
    el.style.transform = `translate(-50%, ${distance}px)`;
    // The arrow turns a full half circle over the pull, so "far enough" is
    // something you can see rather than something you have to guess.
    el.style.setProperty('--ft-pull-turn', `${Math.min(180, (distance / PULL_THRESHOLD) * 180)}deg`);
    el.style.opacity = String(Math.min(1, distance / 28));
  };

  const reset = () => {
    el.classList.add('ft-pull-easing');
    move(0);
    el.classList.remove('ft-pull-ready');
    setTimeout(() => el.classList.remove('ft-pull-easing'), 240);
    pulling = false; ready = false;
  };

  document.addEventListener('touchstart', (e) => {
    if (busy || e.touches.length !== 1) return;
    // A drawer or the My Teams sheet is open: the page behind it is not what
    // the finger is on.
    if (document.body.classList.contains('ft-locked')) return;
    if (!dragOwnedByPage(e.target)) return;
    startY = e.touches[0].clientY;
    pulling = true;
    ready = false;
    el.classList.remove('ft-pull-easing');
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!pulling || busy) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { move(0); return; }
    // preventDefault needs a non-passive listener. Without it iOS rubber-bands
    // the whole page underneath the spinner.
    if (e.cancelable) e.preventDefault();
    // Resistance, so a long drag does not run away down the screen.
    const distance = Math.min(PULL_MAX, dy * 0.52);
    move(distance);
    ready = distance >= PULL_THRESHOLD;
    el.classList.toggle('ft-pull-ready', ready);
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!pulling || busy) return;
    if (!ready) { reset(); return; }
    busy = true;
    el.classList.add('ft-pull-easing', 'ft-pull-busy');
    move(PULL_THRESHOLD);
    // Everything on these pages comes from a fetch on load, so a reload is the
    // honest way to refresh all of it at once.
    refreshNow();
  }, { passive: true });

  document.addEventListener('touchcancel', () => { if (!busy) reset(); }, { passive: true });
}

// Pulled out so a test can stand in for it, and so there is one place to change
// if this ever becomes a re-fetch rather than a reload.
function refreshNow() { location.reload(); }

/* The install prompt.
 *
 * On Chrome this is an event the browser hands over once it decides the site is
 * installable, and pressing a button replays it. On iOS there is no such event
 * and no API at all: Safari has never let a page offer to install itself, so
 * the only route is Share → Add to Home Screen and the most a site can do is
 * say so. That is not a gap in this code — Ball603 shows a how-to sheet there
 * for the same reason, which is the thing KJ went looking for and did not find.
 */
let installPrompt = null;

// iPadOS reports itself as a Mac, so the touch check is what catches an iPad.
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const DISMISS_KEY = 'ft_install_dismissed';
// Dismissing hides the banner for a week rather than forever: somebody saying
// "not now" on a Tuesday in November may well mean it come basketball season.
function bannerDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && (Date.now() - at) < 7 * 864e5;
  } catch { return false; }
}

function wireInstall(openSheet) {
  // The row at the foot of the menu and the banner. Both offer the same thing.
  const buttons = ['ft-install', 'ft-banner-install']
    .map(id => document.getElementById(id)).filter(Boolean);
  const banner = document.getElementById('ft-install-banner');
  if (!buttons.length) return;

  /* Offerable, which is not the same as "the browser gave us a prompt". On iOS
     there will never be a prompt and the answer is still yes — there is just
     something to explain rather than something to press. */
  const canOffer = () => !isStandalone() && (!!installPrompt || isIOS());
  const sync = () => {
    const on = canOffer();
    buttons.forEach(b => { b.hidden = !on; });
    if (banner) banner.hidden = !on || bannerDismissed() || !isIOS() && !installPrompt;
  };
  sync();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    sync();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* fine */ }
    sync();
  });

  for (const btn of buttons) {
    btn.addEventListener('click', async () => {
      if (banner) banner.hidden = true;
      // No prompt to replay means iOS, where the sheet is the whole feature.
      if (!installPrompt) { openSheet(); return; }
      const prompt = installPrompt;
      installPrompt = null;             // a prompt can only be used once
      buttons.forEach(b => { b.hidden = true; });
      try { await prompt.prompt(); }
      catch (err) { console.warn('[Tigers] Install prompt:', err.message); }
    });
  }

  const dismiss = document.getElementById('ft-banner-dismiss');
  if (dismiss) {
    dismiss.addEventListener('click', () => {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* fine */ }
      if (banner) banner.hidden = true;
    });
  }
}

/* ── Header ─────────────────────────────────────────────────────────────── */
/* Rendered from here rather than copied into five files, the same way Ball603
   injects its own header through nav-loader.js. */

// News is deliberately absent: with no way to pull Facebook posts into the
// page, a News tab was a link to an apology. The page still exists, unlinked.
const NAV = [
  { href: '/farmingtontigersnh/schedule',  label: 'Schedule',  key: 'schedule' },
  { href: '/farmingtontigersnh/standings', label: 'Standings', key: 'standings' },
  { href: '/farmingtontigersnh/rosters',   label: 'Rosters',   key: 'rosters' },
  { href: '/farmingtontigersnh/photos',    label: 'Photos',    key: 'photos' },
  { href: '/farmingtontigersnh/videos',    label: 'Videos',    key: 'videos' }
];

const SOCIAL = [
  { href: 'https://www.facebook.com/FarmingtonTigersNH/', title: 'Facebook',
    path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
  { href: 'https://www.instagram.com/farmingtontigersnh/', title: 'Instagram',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
  { href: 'https://x.com/FHStigersnh', title: 'X',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z' }
];

/* The My Teams list, grouped under the sport each team plays.

   Sports run A to Z by name rather than in the SPORTS playing order the rest of
   the site uses: this is a list somebody is scanning for one team by name, not
   a season in progress, and alphabetical is the order you can guess.

   Inside a sport, gender first and then level — Boys Varsity, Boys JV, Girls
   Varsity — so the squads of one programme stay together instead of interleaving
   by level across both. A sport with only one gender skips straight to level.

   A team with no games at all is left out. There is nothing of theirs for the
   ticker to put first, so starring them would be a tick that did nothing. */
const GENDER_ORDER = ['Boys', 'Girls', 'Coed'];

function groupTeamsBySport(teams) {
  const groups = new Map();
  for (const t of teams || []) {
    const first = t.games && t.games[0];
    if (!first || !first.sport) continue;
    const key = first.sport.name;
    if (!groups.has(key)) groups.set(key, { sport: key, emoji: first.sport.emoji, teams: [] });
    groups.get(key).teams.push(t);
  }
  const rank = (g) => {
    const i = GENDER_ORDER.indexOf(g);
    return i === -1 ? GENDER_ORDER.length : i;
  };
  for (const g of groups.values()) {
    g.teams.sort((a, b) =>
      rank(a.gender) - rank(b.gender) ||
      (a.level_rank ?? 99) - (b.level_rank ?? 99) ||
      String(a.name).localeCompare(String(b.name)));
  }
  return [...groups.values()].sort((a, b) => a.sport.localeCompare(b.sport));
}

// Set when the header is rendered, which is every page. A page that wants to
// open My Teams from its own button asks through FT.openMyTeams rather than
// reaching into the header's markup.
let openFavModal = null;

const INSTALL_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" class="ft-star-icon" aria-hidden="true">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
  </svg>`;

// Outline in the bar, solid inside the modal's own heading — one shape, drawn
// twice, rather than two stars that nearly match.
const STAR_SVG = `
  <svg class="ft-star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/>
  </svg>`;

function renderHeader(active) {
  setupPwa();
  const mount = document.getElementById('ft-header');
  if (!mount) return;
  mount.innerHTML = `
    <header class="ft-header">
      <div class="ft-header-inner">
        <a href="/farmingtontigersnh" class="ft-logo">
          <img src="/logos/farmington-tigers-wordmark.jpg"
               alt="Farmington Tigers"
               onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ft-logo-text',textContent:'FARMINGTON TIGERS'}))">
        </a>
        <nav class="ft-nav">
          ${NAV.map(n => `<a class="ft-navlink${n.key === active ? ' on' : ''}" href="${n.href}">${n.label}</a>`).join('')}
        </nav>
        <div class="ft-header-right">
          ${SOCIAL.map(s => `
            <a class="ft-social" href="${s.href}" target="_blank" rel="noopener"
               title="${s.title}" aria-label="${s.title}">
              <svg viewBox="0 0 24 24"><path d="${s.path}"/></svg>
            </a>`).join('')}
          <button class="ft-iconbtn" id="ft-share" type="button" title="Share this page" aria-label="Share this page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>
            </svg>
          </button>
          <!-- The star carries its own label on a wide screen. On a phone the
               label is in the drawer instead, where there is room for it. -->
          <button class="ft-iconbtn ft-starbtn" id="ft-star" type="button"
                  title="My teams" aria-label="My teams" aria-haspopup="dialog">
            ${STAR_SVG}
            <span class="ft-starbtn-label">My Teams</span>
          </button>
          <!-- No install button in this bar. It is for the site's own tools —
               share, My Teams — and installing is offered by the banner and the
               menu instead. -->
          <button class="ft-burger" id="ft-burger" type="button"
                  aria-label="Menu" aria-expanded="false" aria-controls="ft-drawer">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>

    <!-- The same links again, stacked, sliding in from the right the way
         Ball603's does. Only one of the two is ever on screen: the row
         disappears under 760px and this replaces it. -->
    <div class="ft-veil-nav" id="ft-drawer-veil"></div>
    <nav class="ft-drawer" id="ft-drawer" aria-label="Menu">
      <div class="ft-drawer-head">
        <span>Menu</span>
        <button class="ft-drawer-close" id="ft-drawer-close" type="button" aria-label="Close">&times;</button>
      </div>
      ${NAV.map(n => `<a class="ft-drawerlink${n.key === active ? ' on' : ''}" href="${n.href}">${n.label}</a>`).join('')}
      <!-- The star's label lives here on a phone, where the bar has no room
           for it. Same button, same modal. -->
      <button class="ft-drawerlink ft-drawerstar" id="ft-drawer-star" type="button" aria-haspopup="dialog">
        ${STAR_SVG}<span>My Teams</span>
      </button>
      <!-- Hidden until the browser says the site is installable, which it only
           does on a platform and a visit where installing would actually work. -->
      <button class="ft-drawerlink ft-drawerstar" id="ft-install" type="button" hidden>
        ${INSTALL_SVG}<span>Install App</span>
      </button>
      <!-- Last, for the people keeping score at the game. Only in the drawer,
           and the drawer only opens on a phone, so desktop never shows it. -->
      <a class="ft-drawerlink ft-drawerscore" id="ft-drawer-score" href="/farmingtonscore">Score Entry</a>
    </nav>

    <!-- Pull to refresh. Parked above the top of the screen and moved down by
         the drag; does nothing at all outside the installed app. -->
    <div class="ft-pull" id="ft-pull" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>
      </svg>
    </div>

    <div id="ft-ticker"></div>

    <!-- Home page, phone only: the pages people come for, one tap away.
         Hidden on desktop, where the same links sit in the header. Photos is
         the optional third: shown only when it fits without scrolling
         (fitQuickLinks below). -->
    ${active !== 'home' ? '' : `<nav class="ft-quick" aria-label="Quick links">
      ${NAV.filter(n => ['schedule', 'standings', 'photos'].includes(n.key)).map(n =>
        `<a class="ft-quicklink" href="${n.href}" data-key="${n.key}">${n.label}</a>`).join('')}
    </nav>`}

    <!-- My teams. A modal rather than another slide-out: choosing from a list
         of a dozen is a job you finish and confirm, not a menu you glance at,
         and Ball603 asks the same question the same way. -->
    <div class="ft-modal-veil" id="ft-fav-veil"></div>
    <div class="ft-modal" id="ft-favmodal" role="dialog" aria-modal="true" aria-label="My teams">
      <div class="ft-modal-head">
        <span class="ft-modal-star">${STAR_SVG}</span>
        <button class="ft-modal-close" id="ft-fav-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="ft-modal-body">
        <p class="ft-modal-intro">Select your favorite teams. Their games will appear first
          in the scores ticker.</p>
        <h3 class="ft-modal-label">Teams</h3>
        <div class="ft-modal-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <input id="ft-fav-search" type="search" autocomplete="off"
                 placeholder="Search teams&hellip;" aria-label="Search teams">
        </div>
        <div class="ft-modal-list" id="ft-favmodal-list">
          <div class="ft-loading">Loading teams&hellip;</div>
        </div>
      </div>
      <div class="ft-modal-foot">
        <button class="ft-btn ft-btn-quiet" id="ft-fav-clear" type="button">Clear All</button>
        <button class="ft-btn ft-btn-go" id="ft-fav-save" type="button">Save Favorites</button>
      </div>
    </div>

    <!-- How to add the app on iOS, where Safari offers no install button of its
         own and never has. Three steps, because that is the whole of it. -->
    <div class="ft-modal-veil" id="ft-howto-veil"></div>
    <div class="ft-modal ft-howto" id="ft-howto" role="dialog" aria-modal="true"
         aria-label="Add the Tigers app">
      <div class="ft-modal-head">
        <img class="ft-howto-icon" src="/icons/farmington/v2/icon-192.png" alt="">
        <button class="ft-modal-close" id="ft-howto-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="ft-modal-body">
        <h3 class="ft-howto-title">Add the Tigers to your Home Screen</h3>
        <p class="ft-modal-intro">Safari has no install button, so this is the way in on an
          iPhone or iPad. It takes about five seconds.</p>
        <ol class="ft-howto-steps">
          <li><span class="ft-howto-num">1</span><span class="ft-howto-text">Tap the
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-label="Share">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg> Share button at the bottom of Safari</span></li>
          <li><span class="ft-howto-num">2</span><span class="ft-howto-text">Scroll down and tap
            <b>Add to Home Screen</b></span></li>
          <li><span class="ft-howto-num">3</span><span class="ft-howto-text">Tap <b>Add</b></span></li>
        </ol>
      </div>
      <div class="ft-modal-foot ft-howto-foot">
        <button class="ft-btn ft-btn-go" id="ft-howto-done" type="button">Got it</button>
      </div>
    </div>

    <!-- The bottom banner, the way Ball603 does it. Only where installing is
         actually possible, and "Not now" buys a week of quiet. -->
    <div class="ft-install-banner" id="ft-install-banner" hidden>
      <img src="/icons/farmington/v2/icon-192.png" alt="">
      <div class="ft-install-copy">
        <b>Get the Tigers app</b>
        <span>Scores and schedules, one tap from your Home Screen</span>
      </div>
      <div class="ft-install-actions">
        <button class="ft-btn ft-btn-go" id="ft-banner-install" type="button">Install</button>
        <button class="ft-banner-dismiss" id="ft-banner-dismiss" type="button">Not now</button>
      </div>
    </div>`;

  /* The drawer and the modal open and close the same way. Escape and the
     backdrop close either — anything you can only shut with the button that
     opened it is something people get stuck in. */
  const panels = [
    { el: 'ft-drawer', veil: 'ft-drawer-veil', open: 'ft-burger', close: 'ft-drawer-close' },
    { el: 'ft-favmodal', veil: 'ft-fav-veil', open: null, close: 'ft-fav-close' },
    { el: 'ft-howto', veil: 'ft-howto-veil', open: null, close: 'ft-howto-close' }
  ].map(p => ({
    el: document.getElementById(p.el), veil: document.getElementById(p.veil),
    opener: p.open ? document.getElementById(p.open) : null,
    closer: document.getElementById(p.close)
  }));

  const shut = (p) => {
    p.el.classList.remove('on');
    p.veil.classList.remove('on');
    if (p.opener) {
      p.opener.classList.remove('on');
      p.opener.setAttribute('aria-expanded', 'false');
    }
    if (!panels.some(q => q.el.classList.contains('on'))) document.body.classList.remove('ft-locked');
  };
  const shutAll = () => panels.forEach(shut);
  const show = (p) => {
    shutAll();
    p.el.classList.add('on');
    p.veil.classList.add('on');
    if (p.opener) {
      p.opener.classList.add('on');
      p.opener.setAttribute('aria-expanded', 'true');
    }
    document.body.classList.add('ft-locked');
  };

  for (const p of panels) {
    if (p.opener) {
      p.opener.addEventListener('click', () => {
        if (p.el.classList.contains('on')) { shutAll(); return; }
        show(p);
      });
    }
    p.closer.addEventListener('click', () => shut(p));
    p.veil.addEventListener('click', () => shut(p));
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shutAll(); });

  /* ── The My Teams modal ──────────────────────────────────────────────── */
  /* Ticking a box changes nothing until Save is pressed. That is deliberate:
     somebody working down a list of a dozen teams is mid-thought, and a ticker
     that reshuffled under them after every tick would be answering a question
     they had not finished asking. Closing without saving leaves what they had. */
  const modal = panels.find(p => p.el.id === 'ft-favmodal');
  const list = document.getElementById('ft-favmodal-list');
  const search = document.getElementById('ft-fav-search');
  let teamGroups = [];
  const teamCount = () => teamGroups.reduce((n, g) => n + g.teams.length, 0);

  function drawModalList() {
    const chosen = favourites();
    if (!teamGroups.length) {
      list.innerHTML = '<div class="ft-empty">No teams to choose from yet.</div>';
      return;
    }
    list.innerHTML = teamGroups.map(grp => `
      <div class="ft-mgroup">
        <div class="ft-mgroup-head">
          <span aria-hidden="true">${grp.emoji}</span>${esc(grp.sport)}
        </div>
        ${grp.teams.map(t => `
          <label class="ft-mrow">
            <span class="ft-mrow-name">${esc(t.name)}</span>
            <input type="checkbox" data-fav="${t.uteam}"${chosen.includes(t.uteam) ? ' checked' : ''}>
          </label>`).join('')}
      </div>`).join('');
    filterModalList();
  }

  /* Hiding rather than re-rendering, so a box ticked before the search box was
     touched is still ticked after it is cleared. A sport heading goes when
     every team under it has gone, which is the difference between a filtered
     list and a list with gaps in it. Searching the sport name matches its whole
     group, so "basketball" finds all four basketball teams even though not one
     of them is called that. */
  function filterModalList() {
    const q = (search.value || '').trim().toLowerCase();
    for (const grp of list.querySelectorAll('.ft-mgroup')) {
      const sport = grp.querySelector('.ft-mgroup-head').textContent.toLowerCase();
      let shown = 0;
      for (const row of grp.querySelectorAll('.ft-mrow')) {
        const name = row.querySelector('.ft-mrow-name').textContent.toLowerCase();
        row.hidden = q !== '' && !name.includes(q) && !sport.includes(q);
        if (!row.hidden) shown++;
      }
      grp.hidden = shown === 0;
    }
    const any = [...list.querySelectorAll('.ft-mrow')].some(r => !r.hidden);
    let none = list.querySelector('.ft-mrow-none');
    if (!any && teamCount()) {
      if (!none) {
        none = document.createElement('div');
        none.className = 'ft-empty ft-mrow-none';
        none.textContent = 'No team by that name.';
        list.appendChild(none);
      }
    } else if (none) none.remove();
  }

  search.addEventListener('input', filterModalList);

  document.getElementById('ft-fav-clear').addEventListener('click', () => {
    for (const box of list.querySelectorAll('input[type=checkbox]')) box.checked = false;
  });

  document.getElementById('ft-fav-save').addEventListener('click', () => {
    const picked = [...list.querySelectorAll('input[type=checkbox]:checked')]
      .map(b => Number(b.dataset.fav));
    setFavourites(picked);
    shut(modal);
  });

  /* Opened from three places — the star in the bar, its twin at the foot of the
     drawer, and the card on the home page. Each one re-reads the store on the
     way in, so the boxes always show what is actually saved rather than
     whatever was left behind by a visit somebody cancelled. */
  openFavModal = () => {
    drawModalList();
    search.value = '';
    filterModalList();
    show(modal);
    // The search box takes focus on a real keyboard only: on a phone it would
    // throw up the on-screen one and cover the list somebody came to read.
    if (window.matchMedia('(min-width:761px)').matches) search.focus();
  };

  for (const id of ['ft-star', 'ft-drawer-star']) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => openFavModal());
  }

  load().then(data => {
    teamGroups = groupTeamsBySport(data.teams);
    drawModalList();
    document.addEventListener('ft:favourites', drawModalList);
  }).catch(() => {
    list.innerHTML = '<div class="ft-empty">Teams could not be loaded.</div>';
  });

  const howto = panels.find(p => p.el.id === 'ft-howto');
  document.getElementById('ft-howto-done').addEventListener('click', () => shut(howto));
  wireInstall(() => show(howto));
  setupPullToRefresh();

  // Share, the way Ball603 does it: the OS sheet where there is one, the
  // clipboard where there is not.
  document.getElementById('ft-share').addEventListener('click', async () => {
    const url = location.href;
    const title = (document.title || 'Farmington Tigers').replace(/\s*\|\s*.*$/, '').trim();
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (err) { if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      const btn = document.getElementById('ft-share');
      btn.classList.add('ft-copied');
      setTimeout(() => btn.classList.remove('ft-copied'), 1400);
    } catch { /* nothing useful to offer if even the clipboard is refused */ }
  });

  renderTicker();
  document.addEventListener('ft:favourites', renderTicker);
  fitQuickLinks();
  window.addEventListener('resize', fitQuickLinks);
  // The web font can land after the first measure and change the widths.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitQuickLinks);
}

/* ── Quick links ──────────────────────────────────────────────────────────
   SCHEDULE and STANDINGS always; PHOTOS only if the row has room for it on
   this screen. The row never scrolls sideways, so on a narrow phone Photos
   simply is not there (it is still in the menu). */
function fitQuickLinks() {
  const row = document.querySelector('.ft-quick');
  const photos = row && row.querySelector('[data-key="photos"]');
  if (!row || !photos) return;
  photos.hidden = false;
  // Measured from the boxes themselves: the row is centred, and a centred row
  // that overflows spills off BOTH ends, which scrollWidth does not report.
  const cs = getComputedStyle(row);
  const room = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const links = [...row.children].filter(a => !a.hidden);
  const need = links.reduce((w, a) => w + a.getBoundingClientRect().width, 0) +
               parseFloat(cs.columnGap || cs.gap || 0) * (links.length - 1);
  if (need > room + 1) photos.hidden = true;
}

/* ── Ticker ─────────────────────────────────────────────────────────────── */
/* Yesterday, today and tomorrow, and nothing at all outside that. A strip that
   is permanently there saying "no recent scores" is a strip that stops being
   looked at; one that only appears on the days either side of a game is worth
   a glance every time.

   Fed by FT.load() rather than its own query, so it inherits every rule the
   rest of the site already follows — hidden teams, merged squads, scrimmages
   and hand-entered scores — instead of quietly disagreeing with the schedule
   page about what a game is. */

function tickerWindow(now) {
  const base = now || new Date();
  const day = (offset) => dateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset));
  return { from: day(-1), to: day(1), today: day(0) };
}

/* The small orange line on the right of a card. Short on purpose — it sits at
   9px and anything longer than a couple of words stops being readable. Today's
   games are just a time; another day gets the weekday in front of it so nobody
   turns up on the wrong evening. */
function tickerLabel(g, win) {
  const sc = scoreOf(g);
  if (sc) return 'Final';
  const time = timeLabel(g.starts_at);
  if (g.game_date === win.today) return time;
  const d = parseLocal(g.game_date);
  const day = d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '';
  return `${day} ${time}`.trim();
}

async function renderTicker() {
  const mount = document.getElementById('ft-ticker');
  if (!mount) return;
  let data;
  try { data = await load(); } catch { return; }

  const win = tickerWindow();
  const favs = favourites();
  const games = (data.games || [])
    .filter(g => g.game_date >= win.from && g.game_date <= win.to)
    // Starred teams first, and inside each half still in time order. Somebody
    // who has told us they follow the JV side should not have to scroll past
    // four varsity games to find them.
    .sort((a, b) => {
      const fa = favs.includes(a.team.uteam) ? 0 : 1;
      const fb = favs.includes(b.team.uteam) ? 0 : 1;
      return fa - fb || String(a.starts_at).localeCompare(String(b.starts_at));
    });

  if (!games.length) return;            // nothing on, so nothing shown

  mount.innerHTML = `
    <div class="ft-ticker">
      <div class="ft-ticker-inner">
        <span class="ft-ticker-label"><span>Scores</span></span>
        <button class="ft-ticker-arrow" data-dir="-1" type="button" aria-label="Earlier games">&#8249;</button>
        <div class="ft-ticker-scroll">${games.map(tickerCard).join('')}</div>
        <button class="ft-ticker-arrow" data-dir="1" type="button" aria-label="Later games">&#8250;</button>
      </div>
    </div>`;

  const strip = mount.querySelector('.ft-ticker-scroll');
  const arrows = [...mount.querySelectorAll('.ft-ticker-arrow')];

  // Most of a screenful per press rather than a fixed number of pixels, so it
  // moves the same amount whatever the card width happens to be.
  for (const a of arrows) {
    a.addEventListener('click', () => {
      strip.scrollBy({ left: Number(a.dataset.dir) * strip.clientWidth * 0.8, behavior: 'smooth' });
    });
  }

  // An arrow that cannot do anything says so, and the pair disappear entirely
  // when everything already fits.
  const updateArrows = () => {
    const room = strip.scrollWidth - strip.clientWidth;
    mount.querySelector('.ft-ticker').classList.toggle('ft-ticker-fits', room < 4);
    arrows[0].disabled = strip.scrollLeft <= 1;
    arrows[1].disabled = strip.scrollLeft >= room - 1;
  };
  strip.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

/* The teams on the left, and on the right a small column with what this is and
   when — the same shape Ball603's ticker uses, where the sport sits above an
   orange FINAL. */
function tickerCard(g) {
  const win = tickerWindow();
  const sc = scoreOf(g);
  const status = tickerLabel(g, win);
  const res = resultOf(sc);
  const opp = opponentLabel(g);
  const href = `/farmingtontigersnh/schedule?sport=${esc(g.sport_id)}`;

  // A star on the games belonging to a team somebody has chosen. They already
  // sort to the front of the strip, but the front of the strip is also just
  // where the earliest game sits — the star is what says which is which.
  const starred = isFavourite(g.team.uteam);
  const star = starred
    ? '<span class="ft-tcard-star" title="One of my teams" aria-label="One of my teams">\u2605</span>'
    : '';

  const meta = `
    <span class="ft-tcard-meta">
      <span class="ft-tcard-sub">${star}${g.sport.emoji} ${esc(g.team.level || g.team.name)}</span>
      <span class="ft-tcard-status">${esc(status)}</span>
    </span>`;

  // Which team the card belongs to, so that the starred ones can be told apart
  // from the rest without reading the label and guessing.
  const owner = `data-uteam="${esc(g.team.uteam)}"${starred ? ' data-starred="1"' : ''}`;

  // A meet has no opponent and no score, so it gets one line instead of two.
  if (g.is_meet) {
    return `
      <a class="ft-tcard" href="${href}" ${owner}>
        <span class="ft-tcard-teams"><span class="ft-tcard-meet">${esc(opp)}</span></span>
        ${meta}
      </a>`;
  }

  const row = (name, img, score, won) => `
    <span class="ft-tcard-row${won ? ' win' : ''}">
      ${img || '<i class="ft-tcard-nologo"></i>'}
      <span class="ft-tcard-name">${esc(name)}</span>
      <span class="ft-tcard-score">${score}</span>
    </span>`;

  return `
    <a class="ft-tcard" href="${href}" ${owner}>
      <span class="ft-tcard-teams">
        ${row('Farmington', `<img src="${esc(ball603Logo('Farmington'))}" alt="" onerror="this.remove()">`, sc ? sc.us : '', res === 'W')}
        ${row(opp, opponentLogo(g), sc ? sc.them : '', res === 'L')}
      </span>
      ${meta}
    </a>`;
}

function renderFooter() {
  const mount = document.getElementById('ft-footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="ft-footer">
      <a class="ft-powered" href="https://ball603.com" target="_blank" rel="noopener">
        <span>Powered by</span>
        <picture>
          <!-- The black wordmark vanishes on the phone theme's dark page, so a
               phone gets the white one Ball603's own navbar uses. Same 760px
               as the theme itself in farmington.css. -->
          <source media="(max-width:760px)" srcset="/Ball603-new-WHITE.svg">
          <img src="/logos/400px/Ball603-new-BLACK%20copy-400px.png" alt="Ball603">
        </picture>
      </a>
    </footer>`;
}

/* A row of pills, the segmented control the Ball603 standings page uses for
   divisions. Pages hand over {value, label, emoji} and get the markup back, so
   the sport row and the level row cannot drift apart. */
function pills(items, activeValue, attr) {
  return `<div class="ft-pills">` + items.map(i =>
    `<button class="ft-pill${String(i.value) === String(activeValue) ? ' on' : ''}" ${attr}="${esc(i.value)}">` +
    (i.emoji ? `<span class="ft-sport-emoji">${i.emoji}</span>` : '') +
    esc(i.label) + `</button>`).join('') + `</div>`;
}

/* A streak as a badge rather than two bare characters. */
function streakBadge(text) {
  if (!text || text === '\u2014') return '<span class="ft-streak">\u2014</span>';
  const cls = text[0] === 'W' ? ' win' : text[0] === 'L' ? ' loss' : '';
  return `<span class="ft-streak${cls}">${esc(text)}</span>`;
}

/* ── Venue popover ──────────────────────────────────────────────────────── */
/* One popover for the whole page, opened by any 📍 button present or future. */

let venueBox = null, veil = null;

function ensureVenue() {
  if (venueBox) return;
  veil = document.createElement('div');
  veil.className = 'ft-veil';
  venueBox = document.createElement('div');
  venueBox.className = 'ft-venue';
  venueBox.setAttribute('role', 'dialog');
  venueBox.setAttribute('aria-label', 'Game location');
  document.body.append(veil, venueBox);
  veil.addEventListener('click', closeVenue);
  window.addEventListener('resize', closeVenue);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVenue(); });
}

function closeVenue() {
  if (!venueBox) return;
  venueBox.classList.remove('on');
  veil.classList.remove('on');
}

function openVenue(btn) {
  ensureVenue();
  // The venue as Arbiter names it, and nothing else. Arbiter's schedule feed
  // carries siteName and subSiteName but no street address, and there is no
  // venue endpoint to look one up from — so a Directions link was the only way
  // to turn this into something a car could follow, and KJ would rather people
  // took the name to their own maps app than be sent out to Google.
  const site = btn.dataset.site || '';
  const sub = btn.dataset.sub || '';
  venueBox.innerHTML = `
    <h4>${esc(site || 'Location')}</h4>
    ${sub ? `<p>${esc(sub)}</p>` : ''}`;
  venueBox.classList.add('on');
  veil.classList.add('on');

  // Place it under the pin, then pull it back inside the viewport.
  const r = btn.getBoundingClientRect();
  const bw = venueBox.offsetWidth, bh = venueBox.offsetHeight;
  let left = r.left, top = r.bottom + 7;
  if (left + bw > window.innerWidth - 10) left = window.innerWidth - bw - 10;
  if (left < 10) left = 10;
  if (top + bh > window.innerHeight - 10) top = Math.max(10, r.top - bh - 7);
  venueBox.style.left = left + 'px';
  venueBox.style.top = top + 'px';
}

document.addEventListener('click', (e) => {
  const pin = e.target.closest('.ft-pin');
  if (pin) { e.stopPropagation(); openVenue(pin); return; }
  if (!e.target.closest('.ft-venue')) closeVenue();
});

// The heading is the site and the line under it is the sub-site, carried apart
// so a gym at "Farmington HS" does not print "Farmington HS" twice.
function venuePin(game) {
  const site = game.site_name || '';
  if (!site) return '';
  const sub = (game.sub_site_name && game.sub_site_name !== site) ? game.sub_site_name : '';
  const full = sub ? `${site} — ${sub}` : site;
  return `<button class="ft-pin" data-site="${esc(site)}" data-sub="${esc(sub)}"
                  title="${esc(full)}" aria-label="Location: ${esc(full)}">\u{1F4CD}</button>`;
}

/* ── Exported ───────────────────────────────────────────────────────────── */

window.FT = {
  SPORTS, GENDERS, genderLabel, genderPrefix, shortenSchool,
  favourites, isFavourite, toggleFavourite, setFavourites, groupTeamsBySport,
  esc, parseLocal, dateKey, todayKey, dayLabel, shortDate, timeLabel, weekWindow,
  seasonLabel, seasonOfGames,
  scoreOf, resultOf, recordOf, opponentLabel, versus, divisionLabel,
  ball603Covers, ball603Slug, ball603Logo, schoolLogo, teamLink, opponentLogo,
  load, sb, renderHeader, renderFooter, venuePin, closeVenue, pills, streakBadge,
  openMyTeams: () => { if (openFavModal) openFavModal(); }
};

})();
