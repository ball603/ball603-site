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
const SPORTS = {
  63: { name: 'Volleyball',    emoji: '\u{1F3D0}', order: 1, ball603: 'gvolleyball' },
  50: { name: 'Soccer',        emoji: '⚽',     order: 2 },
  25: { name: 'Football',      emoji: '\u{1F3C8}', order: 3 },
  29: { name: 'Golf',          emoji: '⛳',     order: 4 },
  11: { name: 'Cross Country', emoji: '\u{1F3C3}', order: 5 },
   4: { name: 'Basketball',    emoji: '\u{1F3C0}', order: 6, ball603: 'basketball' },
   3: { name: 'Baseball',      emoji: '⚾',     order: 7, ball603: 'baseball' },
  51: { name: 'Softball',      emoji: '\u{1F94E}', order: 8 }
};

// Farmington fields no girls soccer, and Arbiter files the same squad under
// Boys on one row and Coed on another. On this site they are one thing.
const GENDERS = { 1: 'Boys', 2: 'Girls', 3: 'Coed' };
const genderLabel = (g, sportId) => (sportId === 50 ? 'Boys' : (GENDERS[g] || ''));

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
function opponentLabel(g) {
  if (g.is_meet) return g.game_title || g.tournament_name || `${g.team_count}-school meet`;
  return g.opponent_ball603 || g.opponent_name || 'Opponent TBA';
}
const versus = (g) => g.is_meet ? opponentLabel(g)
                                : `${g.is_home ? 'vs' : 'at'} ${opponentLabel(g)}`;

/* ── Ball603 links ──────────────────────────────────────────────────────── */

const ball603Covers = (sportId) => !!(SPORTS[sportId] && SPORTS[sportId].ball603);
const ball603Slug = (shortname) => String(shortname).toLowerCase().replace(/[^a-z0-9]/g, '');
const ball603Logo = (shortname) => `/logos/100px/${String(shortname).replace(/[^A-Za-z0-9]/g, '')}.png`;

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

/* ── Header ─────────────────────────────────────────────────────────────── */
/* Rendered from here rather than copied into five files, the same way Ball603
   injects its own header through nav-loader.js. */

// News is deliberately absent: with no way to pull Facebook posts into the
// page, a News tab was a link to an apology. The page still exists, unlinked.
const NAV = [
  { href: '/farmingtontigersnh/schedule',  label: 'Schedule',  key: 'schedule' },
  { href: '/farmingtontigersnh/standings', label: 'Standings', key: 'standings' },
  { href: '/farmingtontigersnh/rosters',   label: 'Rosters',   key: 'rosters' },
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

function renderHeader(active) {
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
        </div>
      </div>
    </header>`;
}

function renderFooter() {
  const mount = document.getElementById('ft-footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="ft-footer">
      <a class="ft-powered" href="https://ball603.com" target="_blank" rel="noopener">
        <span>Powered by</span>
        <img src="/logos/400px/Ball603-new-BLACK%20copy-400px.png" alt="Ball603">
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
  const site = btn.dataset.site || '';
  const sub = btn.dataset.sub || '';
  const maps = 'https://www.google.com/maps/search/?api=1&query=' +
               encodeURIComponent(site + ', New Hampshire');
  venueBox.innerHTML = `
    <h4>${esc(site || 'Location')}</h4>
    ${sub ? `<p>${esc(sub)}</p>` : ''}
    <a href="${esc(maps)}" target="_blank" rel="noopener">Directions &rarr;</a>`;
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
  SPORTS, GENDERS, genderLabel,
  esc, parseLocal, dateKey, todayKey, dayLabel, shortDate, timeLabel, weekWindow,
  scoreOf, resultOf, recordOf, opponentLabel, versus,
  ball603Covers, ball603Slug, ball603Logo, teamLink,
  load, sb, renderHeader, renderFooter, venuePin, closeVenue, pills, streakBadge
};

})();
