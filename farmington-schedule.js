/* The schedule table, shared by the Tigers schedule page and the team pages.
 *
 * The schedule page picks a sport, a gender and a level with its pill rows and
 * then draws this; a team page has already decided which team it is and draws
 * the same thing. The black bar, the golf course lines, the scroll-to-today
 * box and the row itself are all here so the two cannot disagree.
 */
(function (root) {
'use strict';


/* ── The black bar ─────────────────────────────────────────────────────── */
/* What you are looking at on the left, how they have done on the right — the
   same shape as the standings card. Last game and next game are gone; the table
   underneath already says both, in order. */

/* The sport pills can just say Volleyball; the bar names the actual team, and
   that includes whose it is. Girls' teams are stored as "Varsity Volleyball"
   because this year there is only the one side — but Farmington has fielded
   boys' volleyball before, so the bar says Girls (or Boys) outright. Only for a
   Boys/Girls split: Coed says nothing, and a name that already carries the
   gender ("Varsity Boys Basketball") is left alone. */
function teamTitle(team) {
  const g = team.gender;
  if ((g === 'Boys' || g === 'Girls') && !/\b(Boys|Girls)\b/.test(team.name)) {
    const prefix = FT.genderPrefix(g, team.sport_id);
    if (prefix) return `${prefix} ${team.name}`;
  }
  return team.name;
}

/* `link` turns the team's name into a link to its own page. The schedule page
   passes it; the team page does not, because it is already there. */
function cardBar(team, games, link) {
  const rec = FT.recordOf(games);
  const title = team ? teamTitle(team) : 'Every Team';
  // Bullets rather than bare spacing: four numbers in a row need something
  // between them or they read as one long figure.
  const dot = '<i class="ft-bardot">&bull;</i>';
  // The season sits at the end of the right-hand group, the same place the
  // rosters page puts it, so the three pages read alike.
  const season = `<span><em>Season</em> ${FT.esc(FT.seasonOfGames(games))}</span>`;
  const right = `
    <span class="ft-barstats">
      ${rec.played ? `
        <b>${rec.text}</b>${dot}
        <span>${rec.home} <em>Home</em></span>${dot}
        <span>${rec.away} <em>Away</em></span>${dot}
        ${FT.streakBadge(rec.streak)}${dot}` : ''}
      ${season}
    </span>`;
  const head = link && team ? FT.teamPageLink(team, title) : FT.esc(title);
  return `<div class="ft-cardbar"><h2>${head}</h2>${right}</div>`;
}

/* ── The schedule table ────────────────────────────────────────────────── */

/* `toToday` is only true on the first render. Opening the page part-way into a
   season on a wall of finished games is no use to anybody, so the first view
   starts at today — but once somebody has picked a sport they have asked to see
   that sport's schedule, and the answer to that is the whole thing from the
   first game, not the middle of it. */
/* `mount` is the element (or its id) the card goes into. `team` is null for
   All Sports, and `games` is whatever that view is a schedule of — the caller
   has already filtered, because only it knows what it is showing. */
function renderSchedule(mount, team, games, toToday, opts) {
  const all = !team;
  const body = typeof mount === 'string' ? document.getElementById(mount) : mount;
  if (!body) return;
  /* The schedule page is nothing but this table, so it scrolls inside a box
     sized to the window and opens at today. On a team page the table is one
     section among several, and a box measured against the viewport in the
     middle of a page is wrong twice over — so there it prints in full and the
     page itself scrolls. */
  const scroll = !opts || opts.scroll !== false;

  /* A record blending varsity, JV and Jr. High is a number nobody means, so the
     bar carries no stats in All Sports — only the season. A team page passes
     its own title and asks for the same plain bar, because the record is
     already in the bar at the top of that page and twice is once too many. */
  const plain = all || (opts && opts.stats === false);
  const title = (opts && opts.title) || (all ? 'Every Team' : teamTitle(team));
  const bar = plain
    ? `<div class="ft-cardbar"><h2>${FT.esc(title)}</h2>
         <span class="ft-barstats"><span><em>Season</em> ${FT.esc(FT.seasonOfGames(games))}</span></span></div>`
    : cardBar(team, games, scroll);

  if (!games.length) {
    body.innerHTML = `<div class="ft-card">${bar}<div class="ft-empty">No games on the schedule for this team yet.</div></div>`;
    return;
  }

  const today = FT.todayKey();
  const next = games.find(g => !FT.scoreOf(g) && g.game_date >= today);
  // Where "today" starts. Not the same as `next`: a game played earlier today
  // already has a score, and it is still part of today's schedule.
  const anchor = games.find(g => g.game_date >= today);

  /* On a phone the sport-specific view already says what it is: the black bar
     overhead reads "Girls Varsity Volleyball", so the sport emoji and the level
     beside every single row repeat it eleven times. Both stay on the desktop
     table, and both stay on All Sports even on a phone, where a mixed list of
     every team genuinely needs them. The location pin comes off narrow screens
     outright — it is the least-wanted column and the one that costs the most
     width. */
  const perSport = all ? '' : ' ft-hide-sm';

  body.innerHTML = `
    <div class="ft-card">${bar}
    <div class="${scroll ? 'ft-tablescroll' : 'ft-tablewrap'}">
    <table class="ft-table">
      <thead><tr>
        <th>Date</th>
        <th class="ctr${perSport}" aria-label="Sport"></th>
        <th class="${perSport.trim()}">Level</th>
        <th class="ft-hide-sm">Gender</th>
        <th class="grow">Match-up</th>
        <th>Time/Result</th>
        <th class="ctr ft-hide-sm">Location</th>
      </tr></thead>
      <tbody>${withCourses(games, next, anchor, perSport)}</tbody>
    </table></div></div>`;

  if (!scroll) return;
  sizeScroller();
  if (toToday) scrollToToday(false);
  else {
    const wrap = document.querySelector('.ft-tablescroll');
    if (wrap) wrap.scrollTop = 0;
  }
}

/* ── Today ─────────────────────────────────────────────────────────────── */
/* The schedule runs the whole season, and a season half over opens on a wall of
   finished games. What scrolls is the TABLE, not the page: the heading, the
   sport pills and the black bar stay where they are and the list underneath
   them starts at today, with the rest of the season reachable by scrolling up
   inside it.

   The first attempt at this scrolled the window instead, which pushed the
   heading off the top and left the pill row stranded over the table. */

// The box is as tall as the space left under the pills. Measured rather than
// guessed in CSS, because the rows above it come and go — a sport with two
// genders has an extra row of pills, and a magic number in a stylesheet cannot
// know that.
function sizeScroller() {
  const wrap = document.querySelector('.ft-tablescroll');
  if (!wrap) return;
  const top = wrap.getBoundingClientRect().top;
  wrap.style.maxHeight = Math.max(280, Math.round(window.innerHeight - top - 34)) + 'px';
}

function scrollToToday(smooth) {
  const wrap = document.querySelector('.ft-tablescroll');
  if (!wrap) return;
  const behavior = smooth ? 'smooth' : 'auto';
  const el = document.getElementById('ft-today-anchor');

  // Nothing left to play: the end of the season is where today belongs.
  if (!el) { wrap.scrollTo({ top: wrap.scrollHeight, behavior }); return; }

  // The column headings are pinned to the top of the box, so today has to clear
  // them or it opens underneath its own header.
  const head = wrap.querySelector('thead');
  const headH = head ? head.getBoundingClientRect().height : 0;
  // A golf day opens with its course on the line above, which is part of today
  // rather than the day before it — scroll to that instead, or it hides under
  // the pinned column headings.
  const prev = el.previousElementSibling;
  const top = prev && prev.classList.contains('ft-courserow') ? prev : el;
  const offset = top.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
  wrap.scrollTo({ top: Math.max(0, wrap.scrollTop + offset - headH), behavior });
}

// A window that changes shape changes how many rows fit, but not which row is
// at the top.
// Only the box is re-measured: a window that changes shape changes how many
// rows fit, not which row somebody had scrolled to.
window.addEventListener('resize', sizeScroller);

function row(g, isNext, isAnchor, perSport) {
  const sc = FT.scoreOf(g);
  const res = FT.resultOf(sc);

  const timeOrResult = sc
    ? `<span class="ft-result"><span class="${res}">${res}</span> ${sc.us}–${sc.them}</span>${
        sc.manual ? '<span class="ft-manual" title="Score entered by hand">●</span>' : ''}`
    : FT.esc(FT.timeLabel(g.starts_at));

  const status = (g.game_status && g.game_status !== 'Normal')
    ? `<div class="ft-status">${FT.esc(g.game_status)}</div>` : '';

  // A tint on the matches under a course heading, so three rows that share one
  // round read as one block rather than three unrelated games.
  const cls = [isNext ? 'ft-next' : '', FT.courseName(g) ? 'ft-coursegame' : ''].filter(Boolean).join(' ');

  return `
    <tr class="${cls}"${isAnchor ? ' id="ft-today-anchor"' : ''}>
      <td class="ft-datecell"><span class="ft-dow">${FT.esc(weekday(g.game_date))},</span> <b>${FT.esc(FT.shortDate(g.game_date))}</b></td>
      <td class="ctr${perSport}"><span class="ft-sport-emoji" title="${FT.esc(g.sport.name)}">${g.sport.emoji}</span></td>
      <td class="${(perSport || '').trim()}"><span class="ft-level">${FT.esc(g.team.level || '')}</span></td>
      <td class="ft-hide-sm"><span class="ft-level">${FT.esc(FT.genderLabel(g.gender_id, g.sport_id))}</span></td>
      <td class="grow"><div class="ft-matchup">${matchup(g)}</div></td>
      <td>${timeOrResult}${status}</td>
      <td class="ctr ft-hide-sm"><div class="ft-venue-cell">${FT.venuePin(g)}</div></td>
    </tr>`;
}

/* Golf's course, once, on a line of its own above that day's matches. Every
   other sport is untouched — this only fires on a game FT.courseName() claims,
   which today means golf and nothing else.

   Keyed on day + course rather than emitted whenever the course changes, so a
   golf match that lands between two soccer rows in All Sports cannot make the
   same course print twice. */
function withCourses(games, next, anchor, perSport) {
  const seen = new Set();
  let out = '';
  for (const g of games) {
    const key = FT.courseKey(g);
    if (key && !seen.has(key)) {
      seen.add(key);
      out += `<tr class="ft-courserow"><td colspan="7">${FT.courseLine(g)}</td></tr>`;
    }
    out += row(g, g === next, g === anchor, perSport);
  }
  return out;
}

function weekday(key) {
  const d = FT.parseLocal(key);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '';
}

function matchup(g) {
  if (g.is_meet) return FT.esc(FT.opponentLabel(g));
  if (!g.opponent_name) return `<span class="ft-tba">${FT.esc(FT.opponentLabel(g))}</span>`;

  const short = g.opponent_ball603;
  const label = FT.opponentLabel(g);
  // Ball603's logo when the name matches a Ball603 school, else Arbiter's art.
  const img = FT.opponentLogo(g, 'ft-oppimg');

  return `<span class="ft-ha${g.is_home ? ' home' : ''}">${g.is_home ? 'vs' : 'at'}</span>
          ${img}${FT.teamLink(short, g.sport_id, label)}`;
}

root.FTSchedule = {
  teamTitle: teamTitle, cardBar: cardBar, render: renderSchedule,
  sizeScroller: sizeScroller, scrollToToday: scrollToToday,
  row: row, matchup: matchup, weekday: weekday
};
})(typeof window !== 'undefined' ? window : globalThis);
