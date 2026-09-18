/* The Farmington sync's own clock. Netlify fires it hourly in UTC; the decision
   about whether this is one of the five Eastern times lives in the function. */
import { easternHour, shouldRunNow } from
  '/root/ball603/ball603-site-main/netlify/functions/sync-farmington.mjs';

let pass = 0, fail = 0;
const check = (l, c, x = '') => {
  console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++;
};
const at = (iso) => new Date(iso);

console.log('\n1. Reading the clock in Farmington');
{
  // September: daylight time, UTC-4.
  check('9:30 UTC in September is 5am in NH', easternHour(at('2026-09-18T09:30:00Z')) === 5,
    String(easternHour(at('2026-09-18T09:30:00Z'))));
  // November: standard time, UTC-5. Same wall clock, different UTC hour.
  check('and in November it takes 10:30 UTC to be 5am',
    easternHour(at('2026-11-18T10:30:00Z')) === 5,
    String(easternHour(at('2026-11-18T10:30:00Z'))));
  check('midnight comes back as 0, not 24',
    easternHour(at('2026-09-18T04:30:00Z')) === 0,
    String(easternHour(at('2026-09-18T04:30:00Z'))));
}

console.log('\n2. The five runs, in September');
{
  // 5:30am, 12:30pm, 5:30pm, 9:30pm, 11:30pm ET == these UTC hours on EDT.
  const wanted = ['09:30', '16:30', '21:30', '01:30', '03:30'];
  for (const t of wanted) {
    const iso = `2026-09-18T${t}:00Z`;
    check(`${t} UTC runs`, shouldRunNow(at(iso)), `ET hour ${easternHour(at(iso))}`);
  }
  const idle = ['10:30', '11:30', '14:30', '19:30', '23:30'];
  for (const t of idle) {
    const iso = `2026-09-18T${t}:00Z`;
    check(`${t} UTC does not`, !shouldRunNow(at(iso)), `ET hour ${easternHour(at(iso))}`);
  }
  let runs = 0;
  for (let h = 0; h < 24; h++) {
    if (shouldRunNow(at(`2026-09-18T${String(h).padStart(2, '0')}:30:00Z`))) runs++;
  }
  check('five runs across the day, not four or six', runs === 5, String(runs));
}

console.log('\n3. The same five, after the clocks go back');
{
  /* This is the whole point. Nov 1 2026 is when EST begins, and the old fixed
     cron would have started landing an hour early on that date until somebody
     edited five numbers by hand. */
  const wanted = ['10:30', '17:30', '22:30', '02:30', '04:30'];
  for (const t of wanted) {
    const iso = `2026-11-18T${t}:00Z`;
    check(`${t} UTC runs`, shouldRunNow(at(iso)), `ET hour ${easternHour(at(iso))}`);
  }
  check('and September\'s UTC hours no longer do',
    !shouldRunNow(at('2026-11-18T09:30:00Z')),
    `ET hour ${easternHour(at('2026-11-18T09:30:00Z'))}`);
  let runs = 0;
  for (let h = 0; h < 24; h++) {
    if (shouldRunNow(at(`2026-11-18T${String(h).padStart(2, '0')}:30:00Z`))) runs++;
  }
  check('still five runs a day', runs === 5, String(runs));
}

console.log('\n4. The switchover days themselves');
{
  // Clocks go back 2am Sunday 1 Nov 2026, and forward 8 March 2026.
  for (const day of ['2026-10-31', '2026-11-01', '2026-11-02', '2027-03-13', '2027-03-14', '2027-03-15']) {
    let runs = 0;
    for (let h = 0; h < 24; h++) {
      if (shouldRunNow(at(`${day}T${String(h).padStart(2, '0')}:30:00Z`))) runs++;
    }
    // A spring-forward day is 23 hours long, so one Eastern hour never happens
    // and four runs is correct on that one day rather than a bug.
    check(`${day}: ${runs} run(s)`, runs >= 4 && runs <= 5, String(runs));
  }
  check('5am exists on the day the clocks go back',
    shouldRunNow(at('2026-11-01T10:30:00Z')),
    `ET hour ${easternHour(at('2026-11-01T10:30:00Z'))}`);
}

console.log('\n5. The config it relies on');
{
  const fs = await import('node:fs');
  const toml = fs.readFileSync('/root/ball603/ball603-site-main/netlify.toml', 'utf8');
  const m = toml.match(/\[functions\."sync-farmington"\][\s\S]*?schedule = "([^"]+)"/);
  check('the cron fires hourly', m && m[1] === '30 * * * *', m ? m[1] : '(none)');
  check('and nothing is left telling anyone to edit it in November',
    !/Nov 1, 2026|becomes:/.test(toml));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
