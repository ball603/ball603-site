/* The roster card, shared by the Tigers rosters page and the team pages.
 *
 * The rosters page lets you walk every sport, level and past season; a team
 * page shows one team's current roster and nothing else. Both draw the same
 * card — the columns a submission actually filled in, the coaches line, the
 * black bar — so it is built here once, and each page decides which
 * submission to hand it.
 */
(function (root) {
'use strict';


/* Rosters are filed under Ball603's sport keys, so they have to be matched back
   to the vocabulary the rest of the site uses for emoji, name and ordering. */
function sportMeta(key) {
  const hit = Object.entries(FT.SPORTS).find(([, s]) => (s.roster || s.ball603) === key);
  // The numeric id comes back too, because the heading needs it to decide
  // whether naming the gender says anything.
  return hit ? { ...hit[1], id: Number(hit[0]) } : { name: key, emoji: '\u{1F3C6}', order: 99, id: null };
}

/* Level, the same row the schedule page has. roster_submissions.level is blank
   for every roster Ball603 has ever collected — its form only takes varsity —
   so blank means Varsity, and JV / Jr. High rosters carry theirs explicitly.
   The row only appears once a sport has more than one level on file. */
const LEVEL_ORDER = ['Varsity', 'JV', 'Jr. High', 'Jr. High - JV'];
const levelOf = (r) => (r.level && String(r.level).trim()) || 'Varsity';

/* Submitted rosters carry name / number / position / class. Older ones have
   used grade and height, so each column takes the first field it finds and a
   column nobody filled in is dropped rather than shown empty. */
const val = (p, fields) => {
  for (const f of fields) if (p && p[f] != null && String(p[f]).trim() !== '') return p[f];
  return '';
};

/* Numerical order, whatever order the submission arrived in. Coaches send
   rosters the way their own sheet happens to be — by position, by year, by
   nothing at all — and a number column that does not climb is hard to read
   down. Ball603's own roster tables have always sorted this way; this brings
   the Tigers card in line with them.

   Anything that is not a number sorts to the end rather than to the front, and
   a shared number (or a blank one) falls back to the name so the order is the
   same every time the page is drawn. "88/50" reads as 88, the number that
   player mostly wears. */
function jerseyNumber(p) {
  const n = parseInt(val(p, ['number', 'jersey', 'no']), 10);
  return Number.isNaN(n) ? 999 : n;
}

function byNumber(a, b) {
  return jerseyNumber(a) - jerseyNumber(b) ||
    String(val(a, ['name', 'player', 'full_name']))
      .localeCompare(String(val(b, ['name', 'player', 'full_name'])));
}

function players(r) {
  try {
    const p = typeof r.players_json === 'string' ? JSON.parse(r.players_json) : (r.players_json || []);
    return Array.isArray(p) ? p : [];
  } catch (err) {
    console.error('Roster JSON would not parse for submission ' + r.id, err);
    return [];
  }
}

/* One submission as a card. Returns the HTML rather than writing it into the
   page, so a team page can put it wherever it likes. */
function card(r, href, heading) {
  if (!r) return '<div class="ft-card"><div class="ft-empty">Nothing to show.</div></div>';

  const roster = players(r).slice().sort(byNumber);
  /* Class before Pos: a parent scanning a roster is looking for the year first,
     and on a phone the leftmost columns are the ones that survive. */
  const cols = [
    { h: '#',      fields: ['number', 'jersey', 'no'], cls: 'num' },
    { h: 'Player', fields: ['name', 'player', 'full_name'], cls: 'grow' },
    { h: 'Class',  fields: ['class', 'grade', 'year'], cls: 'ctr tight' },
    { h: 'Pos',    fields: ['position', 'pos'], cls: 'ctr tight' },
    // Co-op squads are drawn from two schools and it matters to the families
    // which one a player is at. Only appears on a roster that says.
    { h: 'School', fields: ['school', 'from'], cls: 'ctr tight' },
    // Height is the one thing nobody came for, so it is the one that goes when
    // the screen runs out of room.
    { h: 'Ht',     fields: ['height', 'ht'], cls: 'ctr ft-hide-sm' }
  ].filter(c => c.h === 'Player' || roster.some(p => val(p, c.fields) !== ''));

  /* "Girls Varsity Volleyball", "Girls JV Volleyball": gender, level, sport.
     Gender is dropped where it distinguishes nothing, the same as everywhere
     else: "Varsity Baseball", not "Boys Varsity Baseball". */
  const meta = sportMeta(r.sport);
  const shown = FT.genderPrefix(r.gender, meta.id);
  const title = `${shown ? shown + ' ' : ''}${levelOf(r)} ${meta.name}`;
  const dot = '<i class="ft-bardot">&bull;</i>';
  const facts = [
    roster.length ? `${roster.length} <em>Players</em>` : '',
    r.division ? `<em>Div</em> ${FT.esc(r.division)}` : '',
    r.season ? `<em>Season</em> ${FT.esc(r.season)}` : ''
  ].filter(Boolean);

  const coaches = [
    r.head_coach ? `Head coach: ${FT.esc(r.head_coach)}` : '',
    r.assistant_coaches ? `Assistants: ${FT.esc(r.assistant_coaches)}` : '',
    r.managers && String(r.managers).trim() ? `Manager${/[,&]| and /.test(r.managers) ? 's' : ''}: ${FT.esc(r.managers)}` : ''
  ].filter(Boolean).join(' &nbsp;&middot;&nbsp; ');

  return `
    <div class="ft-card">
      <div class="ft-cardbar">
        <h2>${href ? `<a class="ft-teampagelink" href="${FT.esc(href)}">${FT.esc(heading || title)}</a>`
                   : FT.esc(heading || title)}</h2>
        ${facts.length ? `<span class="ft-barstats">${facts.join(dot)}</span>` : ''}
      </div>
      ${roster.length ? `
        <div class="ft-tablewrap ft-rosterwrap">
          <table class="ft-table ft-rostertable">
            <thead><tr>${cols.map(c => `<th class="${c.cls}">${c.h}</th>`).join('')}</tr></thead>
            <tbody>${roster.map(p => `<tr>${cols.map(c =>
              `<td class="${c.cls}">${FT.esc(val(p, c.fields))}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>`
      : '<div class="ft-empty">Roster on file, player list not available.</div>'}
      ${coaches ? `<div class="ft-coaches">${coaches}</div>` : ''}
    </div>`;
}

root.FTRoster = {
  sportMeta: sportMeta, levelOf: levelOf, players: players, card: card,
  byNumber: byNumber, jerseyNumber: jerseyNumber,
  LEVEL_ORDER: LEVEL_ORDER
};
})(typeof window !== 'undefined' ? window : globalThis);
