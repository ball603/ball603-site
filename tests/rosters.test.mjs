// get-rosters: Ball603's team pages and admin read rosters through this, and
// they must only ever see the varsity one now that JV / Jr. High rosters share
// the table.
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'svc-test';
const { handler } = await import('/root/ball603/ball603-site-main/netlify/functions/get-rosters.mjs');

let pass = 0, fail = 0;
const check = (l, c, x = '') => { console.log(`   ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); c ? pass++ : fail++; };

let seen = [];
globalThis.fetch = async (u) => { seen.push(String(u)); return { ok: true, status: 200, json: async () => [], text: async () => '[]' }; };
const call = async (qs) => { seen = []; await handler({ httpMethod: 'GET', queryStringParameters: qs }); return new URL(seen[0]); };

console.log('\n1. Varsity only, whatever is asked');
{
  const u = await call({ school: 'Farmington', sport: 'gvolleyball' });
  check('a sport request carries the level filter', u.searchParams.get('or') === '(level.is.null,level.eq.Varsity)', u.search);
  check('and still the sport', u.searchParams.get('sport') === 'eq.gvolleyball', u.search);
  check('with only one `or`, which is all PostgREST honours', u.searchParams.getAll('or').length === 1, u.search);

  const b = await call({ school: 'Farmington', gender: 'Boys' });
  check('the basketball default keeps its legacy-null sport rule', /sport\.is\.null,sport\.eq\.basketball/.test(b.searchParams.get('and') || ''), b.search);
  check('and adds the level rule inside the same `and`', /or\(level\.is\.null,level\.eq\.Varsity\)/.test(b.searchParams.get('and') || ''), b.search);
  check('no stray `or` parameter beside it', b.searchParams.getAll('or').length === 0, b.search);
  check('blank level counts as varsity (every existing roster)', /level\.is\.null/.test(u.search) && /level\.is\.null/.test(b.search));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
