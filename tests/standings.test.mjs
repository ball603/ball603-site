/* The volleyball standings scrape, driven against the payload shapes NHIAA is
   actually serving in September 2026 — captured from the live widget, including
   the Division I rows that made the bug visible on the site. */
import {
  parseStandings, volleyballGroups, toRating, isStaleDivision
} from '/root/ball603/ball603-site-main/netlify/functions/scrape-gvolleyball-standings.mjs';

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  console.log(`   ${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
  cond ? pass++ : fail++;
};

/* The groups list as the widget returns it today: one volleyball group per
   division, where there used to be a single combined one. Trimmed to the
   volleyball entries plus enough of the others to prove they are not picked up. */
const GROUPS = [
  { rankingsGroupId: 318, name: 'Division I',   sportId: 22, genderId: 2, levelId: 31 },
  { rankingsGroupId: 64,  name: 'Golf Standings', sportId: 29, genderId: 3, levelId: 31 },
  { rankingsGroupId: 327, name: 'Division I',   sportId: 50, genderId: 2, levelId: 31 },
  { rankingsGroupId: 333, name: 'Division I',   sportId: 63, genderId: 2, levelId: 31 },
  { rankingsGroupId: 334, name: 'Division II',  sportId: 63, genderId: 2, levelId: 31 },
  { rankingsGroupId: 335, name: 'Division III', sportId: 63, genderId: 2, levelId: 31 }
];

// Division I as published on 18 September 2026. This is the table that was
// coming out wrong.
const D1 = {
  success: true,
  data: {
    groupName: 'Division I',
    columns: [
      { key: 'rank', label: 'Rank' }, { key: 'team', label: 'Team' },
      { key: 'gp', label: 'GP' }, { key: 'w', label: 'W' }, { key: 'l', label: 'L' },
      { key: 'record', label: 'W-L-T' }, { key: 'pts', label: 'PTS' },
      { key: 'rating', label: 'Rating' }
    ],
    divisions: [{
      name: 'Division I',
      teams: [
        { teamName: 'Bedford High School -NH',  values: { rank: '1',  gp: '5', w: '5', l: '0', record: '5-0-0', pts: '20', rating: '4' } },
        { teamName: 'Salem High School',        values: { rank: '2',  gp: '6', w: '6', l: '0', record: '6-0-0', pts: '24', rating: '4' } },
        { teamName: 'Bishop Guertin High School', values: { rank: '3', gp: '5', w: '4', l: '1', record: '4-1-0', pts: '16', rating: '3.2' } },
        { teamName: 'Nashua High School North', values: { rank: '8',  gp: '5', w: '3', l: '2', record: '3-2-0', pts: '12', rating: '2.4' } },
        { teamName: 'Dover High School',        values: { rank: '11', gp: '6', w: '3', l: '3', record: '3-3-0', pts: '12', rating: '2' } },
        { teamName: 'Goffstown High School',    values: { rank: '12', gp: '4', w: '2', l: '2', record: '2-2-0', pts: '8',  rating: '2' } },
        { teamName: 'Nashua High School South', values: { rank: '13', gp: '7', w: '3', l: '4', record: '3-4-0', pts: '12', rating: '1.71429' } },
        { teamName: 'Alvirne High School',      values: { rank: '17', gp: '4', w: '0', l: '4', record: '0-4-0', pts: '0',  rating: '0' } }
      ]
    }]
  }
};

const D3 = {
  success: true,
  data: {
    groupName: 'Division III',
    divisions: [{
      name: 'Division III',
      teams: [
        { teamName: 'Mascenic Regional High School', values: { gp: '4', w: '4', l: '0', record: '4-0-0', pts: '16', rating: '4' } },
        { teamName: 'Farmington High School',        values: { gp: '6', w: '5', l: '1', record: '5-1-0', pts: '20', rating: '3.33333' } }
      ]
    }]
  }
};

// ── 1 ───────────────────────────────────────────────────────────────────────
console.log('\n1. Finding the volleyball groups');
{
  const found = volleyballGroups(GROUPS);
  check('all three divisions are found, not just the first',
    found.length === 3, found.map(g => g.id).join('/'));
  check('and they are the volleyball ones',
    found.map(g => g.id).join('/') === '333/334/335', found.map(g => g.id).join('/'));
  check('soccer\'s girls Division I is not mistaken for volleyball\'s',
    !found.some(g => g.id === 327));
  check('nor is basketball\'s', !found.some(g => g.id === 318));
  check('nor golf, which carries a different gender id', !found.some(g => g.id === 64));
  check('the group names come through for the log',
    found.map(g => g.name).join('/') === 'Division I/Division II/Division III',
    found.map(g => g.name).join('/'));

  // The wrappers the payload can arrive in.
  check('a payload wrapped in data works the same',
    volleyballGroups({ data: GROUPS }).length === 3);
  check('and one wrapped in data.groups',
    volleyballGroups({ data: { groups: GROUPS } }).length === 3);
  check('nothing at all yields nothing, rather than throwing',
    volleyballGroups(null).length === 0);
  check('a group with no id is skipped',
    volleyballGroups([{ name: 'x', sportId: 63, genderId: 2, levelId: 31 }]).length === 0);

  // The old single combined group would still be picked up on its own.
  check('a single combined group still resolves',
    volleyballGroups([{ rankingsGroupId: 6, name: 'Volleyball Standings', sportId: 63, genderId: 2, levelId: 31 }])
      .length === 1);
}

// ── 2 ───────────────────────────────────────────────────────────────────────
console.log('\n2. The rating is NHIAA\'s, not the points total');
{
  const { rows } = parseStandings(D1);
  const by = (name) => rows.find(r => r.school === name);

  check('every team parsed', rows.length === 8, String(rows.length));
  check('Bedford\'s rating is 4, not its 20 points',
    by('Bedford').rating === 4, String(by('Bedford').rating));
  check('and its points are still 20',
    by('Bedford').points === 20, String(by('Bedford').points));
  check('the two are now different numbers',
    by('Bedford').rating !== by('Bedford').points);
  check('a fractional rating survives at full precision',
    by('Nashua South').rating === 1.71429, String(by('Nashua South').rating));
  check('records still come through', by('Nashua South').wins === 3 && by('Nashua South').losses === 4,
    `${by('Nashua South').wins}-${by('Nashua South').losses}`);
  check('as do games played', by('Nashua South').games_played === 7,
    String(by('Nashua South').games_played));
}

// ── 3 ───────────────────────────────────────────────────────────────────────
console.log('\n3. The order the page will now produce');
{
  const { rows } = parseStandings(D1);
  // Exactly what standings.html does with what it is given.
  const ordered = [...rows].sort((a, b) =>
    (b.rating - a.rating) || (b.wins - a.wins) || (a.losses - b.losses) ||
    a.school.localeCompare(b.school));
  const names = ordered.map(r => r.school);

  const oldOrder = [...rows].sort((a, b) =>
    (b.points - a.points) || (b.wins - a.wins) || (a.losses - b.losses) ||
    a.school.localeCompare(b.school)).map(r => r.school);

  /* The whole point of the fix. Nashua South had played seven matches to
     everyone else's four or five, so their points total floated them up the
     table while their rating — the thing NHIAA ranks on — was the lowest of the
     group. They were eighth on Ball603 and thirteenth at NHIAA. */
  check('Nashua South no longer outranks Dover on volume of games played',
    names.indexOf('Nashua South') > names.indexOf('Dover'), names.join(' > '));
  check('nor Goffstown, who have played three fewer',
    names.indexOf('Nashua South') > names.indexOf('Goffstown'), names.join(' > '));
  check('and sorting on points is what used to put them above both',
    oldOrder.indexOf('Nashua South') < oldOrder.indexOf('Goffstown'), oldOrder.join(' > '));

  check('Dover and Goffstown are level on rating, as NHIAA has them',
    rows.find(r => r.school === 'Dover').rating === rows.find(r => r.school === 'Goffstown').rating);
  check('Bedford and Salem are level at the top for the same reason',
    rows.find(r => r.school === 'Bedford').rating === rows.find(r => r.school === 'Salem').rating);
  check('a winless team is last', names[names.length - 1] === 'Alvirne', names.join(' > '));

  // Against NHIAA's own published rank, which is in the payload.
  const published = [...rows]
    .filter(r => r.school !== 'Salem')   // level with Bedford; NHIAA breaks it elsewhere
    .sort((a, b) => b.rating - a.rating || a.school.localeCompare(b.school))
    .map(r => r.school);
  check('the order matches NHIAA\'s published ranks',
    published.join('/') === 'Bedford/Bishop Guertin/Nashua North/Dover/Goffstown/Nashua South/Alvirne',
    published.join('/'));
}

// ── 4 ───────────────────────────────────────────────────────────────────────
console.log('\n4. A rating that is missing or malformed');
{
  check('a published rating is used as given', toRating('3.2', 16, 5) === 3.2);
  check('zero is a rating, not a missing value', toRating('0', 0, 4) === 0);
  // The old code fell back to the points total here, which silently reordered
  // the division. It recomputes instead.
  check('a missing one is worked out from points and games', toRating(null, 16, 5) === 3.2);
  check('not fallen back to the points total', toRating(null, 16, 5) !== 16);
  check('an empty string counts as missing', toRating('', 12, 6) === 2);
  check('so does nonsense', toRating('n/a', 12, 4) === 3);
  check('a team with no games has a rating of zero, not an infinity',
    toRating(null, 0, 0) === 0);
  check('and never NaN', Number.isFinite(toRating(undefined, 5, 0)));
}

// ── 5 ───────────────────────────────────────────────────────────────────────
console.log('\n5. Merging the three feeds');
{
  const one = parseStandings(D1);
  const three = parseStandings(D3);
  const merged = [...one.rows, ...three.rows];

  check('a division per feed', Object.keys(one.perDivision).join() === 'D-I');
  check('and the third feed is D-III', Object.keys(three.perDivision).join() === 'D-III');
  check('merging keeps both', new Set(merged.map(r => r.division)).size === 2);
  check('Farmington lands in D-III with its real rating',
    merged.find(r => r.school === 'Farmington').rating === 3.33333,
    String(merged.find(r => r.school === 'Farmington').rating));

  // The stale guard still has to work per division on the merged set.
  const start = new Date('2026-09-02T00:00:00Z');
  const twoDaysIn = new Date(start.getTime() + 2 * 86400000);
  check('a division claiming more games than days elapsed is refused',
    isStaleDivision(merged.filter(r => r.division === 'D-I'), 'D-I', twoDaysIn));
  check('but a current one is not',
    !isStaleDivision(merged.filter(r => r.division === 'D-I'), 'D-I', new Date('2026-09-18T00:00:00Z')));
  check('an empty division is not stale, just empty',
    !isStaleDivision([], 'D-IV', twoDaysIn));
}

// ── 6 ───────────────────────────────────────────────────────────────────────
console.log('\n6. The payload that broke it');
{
  // The old combined group now answers with this, which is what would be
  // fetched if the groups list were unreachable and the fallback kicked in.
  const empty = { success: true, data: { groupName: '', columns: [], divisions: [] } };
  const { rows } = parseStandings(empty);
  check('an empty group parses to no rows rather than throwing', rows.length === 0);

  let threw = false;
  try { parseStandings({ success: true, data: {} }); } catch { threw = true; }
  check('a payload with no divisions array is a loud failure, not a silent one', threw);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
