// The NCAA-style volleyball RPI adjustments (js/rpi-ncaa.js). Small divisions
// with round numbers, so every expected value can be checked by hand.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { applyNcaaAdjustments } = require('/root/ball603/ball603-site-main/js/rpi-ncaa.js');

let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const g = (home, away, hs, as) => ({ home_team: home, away_team: away, home_score: hs, away_score: as });

// Seven teams, RPI .700 down to .400 in .050 steps. Mean neighbour gap .050, so
// "two positions" = .100.
const D = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((t, i) => ({ team: t, division: 'D-I', rpi: 0.70 - 0.05 * i, games: 3 }));

console.log('\n1. Who earns what');
{
  const games = [
    g('C', 'A', 3, 1),   // C beats #1 A          → C +1 bonus
    g('B', 'D', 3, 0),   // B beats #4 D          → nothing
    g('E', 'B', 0, 3),   // B beats... no: B beats E at E — B is the winner, E not top → nothing
    g('D', 'F', 1, 3),   // D loses to #6 F       → D −1 penalty (F is bottom two)
    g('G', 'C', 3, 2),   // C loses to #7 G       → C −1 penalty
    g('E', 'B', 3, 1)    // E beats #2 B          → E +1 bonus
  ];
  const r = applyNcaaAdjustments(D, games);
  check('the step is two positions of RPI', near(r.get('A').step, 0.10), String(r.get('A').step));
  check('a win over #1 is a bonus', r.get('C').bonusWins.join() === 'A', r.get('C').bonusWins.join());
  check('a win over #2 is a bonus', r.get('E').bonusWins.join() === 'B', r.get('E').bonusWins.join());
  check('a win over #4 is not', r.get('B').bonusWins.length === 0, r.get('B').bonusWins.join());
  check('a loss to #6 is a penalty', r.get('D').penaltyLosses.join() === 'F', r.get('D').penaltyLosses.join());
  check('a loss to #7 is a penalty', r.get('C').penaltyLosses.join() === 'G', r.get('C').penaltyLosses.join());
  check('a bonus and a penalty cancel', near(r.get('C').adjusted, 0.60), String(r.get('C').adjusted));
  check('one bonus adds the step', near(r.get('E').adjusted, 0.50 + 0.10), String(r.get('E').adjusted));
  check('one penalty takes it away', near(r.get('D').adjusted, 0.55 - 0.10), String(r.get('D').adjusted));
  check('the beaten top team itself is untouched', near(r.get('A').adjusted, 0.70));
  check('original RPI is kept alongside', near(r.get('E').original, 0.50));
}

console.log('\n2. Only the division is the field');
{
  const other = [{ team: 'X', division: 'D-II', rpi: 0.90, games: 3 }, { team: 'Y', division: 'D-II', rpi: 0.10, games: 3 }];
  const r = applyNcaaAdjustments([...D, ...other], [g('G', 'X', 3, 0), g('Y', 'A', 3, 0)]);
  check('beating the other division\'s best earns nothing', r.get('G').bonusWins.length === 0);
  check('losing to the other division\'s worst costs nothing', r.get('A').penaltyLosses.length === 0);
  check('each division measures its own step', near(r.get('X').step, 0.80 * 2), String(r.get('X').step));
}

console.log('\n3. Ties on the line, and teams yet to play');
{
  const tied = D.map(t => t.team === 'C' ? { ...t, rpi: 0.65 } : t);   // C ties B for 2nd
  const r = applyNcaaAdjustments(tied, [g('F', 'C', 3, 0)]);
  check('a team tied for 2nd counts as top two', r.get('F').bonusWins.join() === 'C', r.get('F').bonusWins.join());

  const idle = [...D, { team: 'Z', division: 'D-I', rpi: 0, games: 0 }];
  const r2 = applyNcaaAdjustments(idle, [g('Z', 'A', 0, 3)]);
  check('a team with no games is not in the bottom two', r2.get('Z').divisionRank === null);
  check('so its first loss costs its opponent nothing', r2.get('A').penaltyLosses.length === 0 && r2.get('A').bonusWins.length === 0);
  check('and does not stretch the step', near(r2.get('A').step, 0.10), String(r2.get('A').step));
}

console.log('\n4. Nothing to rank yet');
{
  const tiny = D.slice(0, 3);
  const r = applyNcaaAdjustments(tiny, [g('C', 'A', 3, 0)]);
  check('a division too small for a top two and bottom two gives no adjustments',
    r.get('C').bonusWins.length === 0 && near(r.get('C').adjusted, r.get('C').original));
  check('an empty list is an empty result', applyNcaaAdjustments([], []).size === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
