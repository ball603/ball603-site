/* The Seed Decoder. Driven against the Division I volleyball tie group that
   exposed the bug: five teams level on 3.200, where criterion 2 separates one
   of them and leaves the other four exactly where they were. */
import {
  outcomeOf, walkTiebreakers, findTieGroups, buildTournamentTeamsSet
} from '/root/ball603/ball603-site-main/netlify/functions/tiebreakers.mjs';

let pass = 0, fail = 0;
const check = (l, c, x = '') => {
  console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`);
  c ? pass++ : fail++;
};

// ── 1 ───────────────────────────────────────────────────────────────────────
console.log('\n1. What a criterion actually settles');
{
  const vals = {};
  const score = (pairs) => pairs.map(([team, s]) => ({ team, score: s }));

  const all = outcomeOf(score([['A', 1], ['B', 0.8], ['C', 0.5]]), 'x', vals);
  check('every score distinct is a full resolution', all.status === 'resolved', all.status);
  check('and the order runs best first', all.order.join('') === 'ABC', all.order.join(''));

  // The case that was being reported as a full resolution.
  const lead = outcomeOf(score([['A', 0.75], ['B', 0.667], ['C', 0.667], ['D', 0.667]]), 'x', vals);
  check('separating only the leader is partial, not resolved',
    lead.status === 'partial', lead.status);
  check('it does not claim to have resolved anything', !lead.resolved);
  check('it names the one team it settled', lead.topTeam === 'A', lead.topTeam);
  check('and does not invent an order for the rest',
    !lead.order || lead.order.length === 1, JSON.stringify(lead.order));
  check('the detail says so in words', /still level/.test(lead.detail), lead.detail);

  const none = outcomeOf(score([['A', 0.667], ['B', 0.667], ['C', 0.5]]), 'x', vals);
  check('a leader level with someone settles nothing', none.status === 'tied', none.status);

  // A gap inside the list, with the leader clear.
  const middle = outcomeOf(score([['A', 1], ['B', 0.5], ['C', 0.5]]), 'x', vals);
  check('a clear leader over a tied pair is partial', middle.status === 'partial', middle.status);
  check('and it settles the leader only', middle.topTeam === 'A', middle.topTeam);

  check('one team alone settles nothing',
    outcomeOf(score([['A', 1]]), 'x', vals).status === 'tied');
  check('an empty group settles nothing',
    outcomeOf([], 'x', vals).status === 'tied');

  // Tolerance: percentages a thousandth apart are the same number here.
  check('scores inside the tolerance count as level',
    outcomeOf(score([['A', 0.6670], ['B', 0.66705]]), 'x', vals).status === 'tied');
  check('scores outside it do not',
    outcomeOf(score([['A', 0.75], ['B', 0.667]]), 'x', vals).status === 'resolved');
  // Whole-number criteria pass their own tolerance.
  check('whole-number criteria separate on one',
    outcomeOf(score([['A', 4], ['B', 3]]), 'x', vals, 0.5).status === 'resolved');
  check('and not on nothing',
    outcomeOf(score([['A', 4], ['B', 4]]), 'x', vals, 0.5).status === 'tied');
}

/* The real Division I group, with the games that produce it. Five teams on
   4-1, all rated 3.200. Pinkerton is 3-1 against tournament teams; the other
   four are 2-1. Only Pinkerton is separated. */
const TIED = ['Bishop Guertin', 'Exeter', 'Londonderry', 'Pinkerton', 'Winnacunnet'];
const g = (home, away, hs, as) => ({ home, away, homeScore: hs, awayScore: as, division: 'D-I' });
const GAMES = [
  // Pinkerton: four games against tournament teams, three won.
  g('Pinkerton', 'Bishop Guertin', 3, 1),
  g('Pinkerton', 'Exeter', 3, 2),
  g('Pinkerton', 'Salem', 1, 3),
  g('Pinkerton', 'Bedford', 3, 0),
  // The other four: three each, two won.
  g('Bishop Guertin', 'Salem', 3, 1), g('Bishop Guertin', 'Bedford', 3, 2),
  g('Exeter', 'Salem', 3, 0), g('Exeter', 'Bedford', 3, 1),
  g('Londonderry', 'Salem', 3, 1), g('Londonderry', 'Bedford', 3, 2), g('Londonderry', 'Windham', 1, 3),
  g('Winnacunnet', 'Salem', 3, 1), g('Winnacunnet', 'Bedford', 3, 2), g('Winnacunnet', 'Windham', 1, 3)
];
const TOURNEY = new Set(['Bishop Guertin', 'Exeter', 'Londonderry', 'Pinkerton', 'Winnacunnet',
  'Salem', 'Bedford', 'Windham']);
const DIV_TEAMS = new Set([...TOURNEY]);
const RATINGS = Object.fromEntries(TIED.map(t => [t, 3.2]));

// ── 2 ───────────────────────────────────────────────────────────────────────
console.log('\n2. The Division I group that exposed it');
{
  const res = walkTiebreakers(TIED, GAMES, GAMES, TOURNEY, DIV_TEAMS, RATINGS, []);

  check('every team is still in the list', res.order.length === 5, res.order.join('/'));
  check('nobody is listed twice', new Set(res.order).size === 5, res.order.join('/'));
  check('Pinkerton is placed first, which the criteria do settle',
    res.order[0] === 'Pinkerton', res.order.join('/'));

  /* The part that was wrong. The other four are level on every criterion the
     fixture gives them, and they must be REPORTED as unsettled rather than
     printed in arrival order under a tick. */
  check('the four still level are named as unresolved',
    res.unresolved.length === 4, JSON.stringify(res.unresolved));
  check('and Pinkerton is not among them',
    !res.unresolved.includes('Pinkerton'), JSON.stringify(res.unresolved));

  const step2 = res.steps.find(s => s.criterion === 2);
  check('criterion 2 is recorded as partial, not resolved',
    step2.status === 'partial', step2.status);
  check('no step claims a full resolution',
    !res.steps.some(s => s.status === 'resolved'),
    res.steps.map(s => `${s.criterion}:${s.status}`).join(' '));
  check('the panel still gets the numbers to show',
    step2.teamValues['Pinkerton'].includes('0.750'), step2.teamValues['Pinkerton']);
}

// ── 3 ───────────────────────────────────────────────────────────────────────
console.log('\n3. A group the criteria genuinely do resolve');
{
  // Three teams, each clearly apart on win % against tournament teams.
  const teams = ['Alpha', 'Beta', 'Gamma'];
  const games = [
    g('Alpha', 'Salem', 3, 0), g('Alpha', 'Bedford', 3, 1), g('Alpha', 'Windham', 3, 0),
    g('Beta', 'Salem', 3, 0), g('Beta', 'Bedford', 0, 3), g('Beta', 'Windham', 3, 1),
    g('Gamma', 'Salem', 0, 3), g('Gamma', 'Bedford', 0, 3), g('Gamma', 'Windham', 3, 1)
  ];
  const tourney = new Set(['Salem', 'Bedford', 'Windham', ...teams]);
  const ratings = Object.fromEntries(teams.map(t => [t, 2.4]));
  const res = walkTiebreakers(teams, games, games, tourney, tourney, ratings, []);

  check('it comes out in order', res.order.join('/') === 'Alpha/Beta/Gamma', res.order.join('/'));
  check('nothing is left unresolved', res.unresolved.length === 0,
    JSON.stringify(res.unresolved));
  check('and a step says it resolved',
    res.steps.some(s => s.status === 'resolved'),
    res.steps.map(s => `${s.criterion}:${s.status}`).join(' '));
}

// ── 4 ───────────────────────────────────────────────────────────────────────
console.log('\n4. Head-to-head still decides first');
{
  const teams = ['Home', 'Away'];
  const games = [g('Home', 'Away', 3, 0), g('Home', 'Salem', 0, 3), g('Away', 'Salem', 3, 0)];
  const tourney = new Set(['Salem', ...teams]);
  const res = walkTiebreakers(teams, games, games, tourney, tourney,
    { Home: 2, Away: 2 }, []);
  check('the team that won the meeting is first',
    res.order[0] === 'Home', res.order.join('/'));
  check('and it is head-to-head that says so',
    res.steps.find(s => s.status === 'resolved' || s.status === 'partial').criterion === 1,
    res.steps.map(s => `${s.criterion}:${s.status}`).join(' '));
  check('with nothing left over', res.unresolved.length === 0);
}

// ── 5 ───────────────────────────────────────────────────────────────────────
console.log('\n5. Finding the groups in the first place');
{
  // Ratings are now fractions, not point totals. Tie detection has to hold.
  const standings = [
    { school: 'Bedford', rating: 4, wins: 5, losses: 0 },
    { school: 'Salem', rating: 4, wins: 6, losses: 0 },
    { school: 'Dover', rating: 2, wins: 3, losses: 3 },
    { school: 'Goffstown', rating: 2, wins: 2, losses: 2 },
    { school: 'Portsmouth', rating: 0.66667, wins: 1, losses: 5 },
    { school: 'Spaulding', rating: 0.66667, wins: 1, losses: 5 }
  ];
  const groups = findTieGroups(standings, 14);
  const named = groups.map(gr => gr.teams.join('+'));

  check('level rating and level wins is a tie',
    named.includes('Portsmouth+Spaulding'), named.join(' / '));
  // The rule the code already carried, now exercised against real ratings.
  check('level rating with different wins is NOT a tie',
    !named.some(n => n.includes('Dover')), named.join(' / '));
  check('Bedford and Salem are not tied either, for the same reason',
    !named.some(n => n.includes('Bedford')), named.join(' / '));
  check('a fractional rating does not fall foul of the tolerance',
    groups.find(gr => gr.teams.includes('Portsmouth')).teams.length === 2);
}

// ── 6 ───────────────────────────────────────────────────────────────────────
console.log('\n6. Who counts as a tournament team');
{
  const standings = Array.from({ length: 20 }, (_, i) => ({
    school: `T${i + 1}`, rating: 4 - i * 0.2, wins: 20 - i, losses: i
  }));
  // Make the 14th and 15th level, so the cut line is itself a tie.
  standings[13].rating = 1.4;
  standings[14].rating = 1.4;
  const set = buildTournamentTeamsSet(standings, 14);
  check('the field is the top 14 plus anyone level with the last of them',
    set.size === 15, String(set.size));
  check('including the team that will miss out', set.has('T15'));
  check('and not the one below them', !set.has('T16'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
