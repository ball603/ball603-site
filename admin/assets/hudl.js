/* Reading a vCloud CSV export and working out what each row means.
   Kept apart from the page so it can be tested on its own - which matters,
   because this is the part most likely to be subtly wrong. */
window.HUDL = (() => {

  /* A real CSV parser, not a split on commas. The Embed Code column contains
     quoted HTML with commas in it, so the naive version mangles every row. */
  function parseCSV(text){
    const rows = []; let row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');                     // Excel's byte-order mark
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i+1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const head = rows.shift().map(h => h.trim());
    return rows.filter(r => r.some(c => c.trim() !== ''))
               .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
  }

  /* "09/30/25 6:00 pm -0400" -> a real instant.
     The offset is in the string, so no guessing about daylight saving. */
  function parseWhen(s){
    const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})\s*(am|pm)\s*([+-]\d{4})?$/i);
    if (!m) return null;
    let [, mo, d, y, h, mi, ap, off] = m;
    y = y.length === 2 ? '20' + y : y;
    h = parseInt(h, 10) % 12 + (/pm/i.test(ap) ? 12 : 0);
    const base = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${String(h).padStart(2,'0')}:${mi}:00`;
    const iso = off ? base + off.slice(0,3) + ':' + off.slice(3) : base + 'Z';
    const dt = new Date(iso);
    return isNaN(dt) ? null : dt.toISOString();
  }

  /* Names arrive spelled several ways. Strip it down to something comparable
     before matching, but never use the stripped form as a key - two different
     schools can normalise to similar text. */
  function norm(n){
    return String(n || '')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')                       // "Central Connecticut (11/1)"
      .replace(/\b\d{1,2}\/\d{1,2}\b/g, ' ')          // "Central Connecticut 10/18"
      // Only a trailing bare "U", which is how Hudl writes "Saint Francis U"
      // where the conference writes "Saint Francis". 62 rows in one season.
      .replace(/\s+u$/, ' ')
      // "College" and "University" are NOT noise, however tempting. Stripping
      // them turned Boston College and Boston University into the same school
      // and silently pointed three games at the wrong one. Failing to match a
      // spelling is visible and a person fixes it; matching the wrong school
      // is invisible and wrong. So only genuine filler comes out here.
      .replace(/\b(the|of|at)\b/g, ' ')
      .replace(/\bst\.?\b/g, 'saint')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  /* Only the shapes that really mean "team A played team B". Deliberately
     narrow: a title we don't recognise becomes a show for a human to judge,
     which is far better than inventing a matchup. */
  const VS = /^(.{2,}?)\s+(?:at|vs\.?|v\.?)\s+(.{2,})$/i;
  // Things that are plainly not a game even though they contain " vs ".
  const NOT_A_GAME = /press conference|coaches? show|tailgate|hall of fame|test stream|^test\b|highlights|preview show|postgame show|pregame show/i;

  function readTitle(title){
    const t = String(title || '').trim();
    if (!t) return { kind:'other', away:null, home:null };
    if (NOT_A_GAME.test(t)) return { kind:'show', away:null, home:null };
    const m = t.match(VS);
    if (!m) return { kind:'show', away:null, home:null };
    const away = m[1].trim(), home = m[2].trim();
    // A side that's mostly digits or a stray fragment isn't a team name.
    if (!norm(away) || !norm(home)) return { kind:'show', away:null, home:null };
    return { kind:'game', away, home };
  }

  /* schools: [{key,name,aliases,member}] from the database.
     Returns the key if we're confident, or null to leave it for a person. */
  function matcher(schools){
    const byNorm = new Map();
    for (const s of schools) {
      for (const n of [s.name, ...(s.aliases || [])]) {
        const k = norm(n);
        if (k && !byNorm.has(k)) byNorm.set(k, s.key);
      }
    }
    return name => {
      const k = norm(name);
      if (!k) return null;
      return byNorm.get(k) ?? null;
    };
  }

  /* One CSV row -> what we'd store, plus why. Nothing is written here; the
     caller shows this to a person first. */
  function readRow(r, { match, sportByName, customer, schoolName }){
    const title = (r['Title'] || '').trim();
    const t = readTitle(title);
    // Hudl files anything that isn't a sport event under "General", which is a
    // better signal than the title - trust it over the title parse.
    const general = /^general$/i.test((r['Section'] || '').trim());
    const starts = parseWhen(r['Scheduled Date']);
    const dur = parseInt(r['Duration'], 10);
    const out = {
      hudl_id: (r['Broadcast ID'] || '').trim(),
      title, kind: general ? 'show' : t.kind,
      starts_at: starts,
      sport: sportByName(r['Section'] || ''),
      away: general || !t.away ? null : match(t.away),
      home: general || !t.home ? null : match(t.home),
      awayName: general ? null : t.away, homeName: general ? null : t.home,
      stream_url: (r['M3U8 URL'] || '').trim() || null,
      embed_code: (r['Embed Code'] || '').trim() || null,
      duration_seconds: Number.isFinite(dur) ? dur : null,
      status: /archiv/i.test(r['Status'] || '') ? 'archived'
            : /upcoming|scheduled/i.test(r['Status'] || '') ? 'scheduled' : 'archived',
      customer: (r['Customer'] || '').trim(),
      problems: []
    };
    if (customer && out.customer && out.customer !== customer)
      out.problems.push('belongs to ' + out.customer);
    if (!out.hudl_id)     out.problems.push('no broadcast ID');
    if (!out.starts_at)   out.problems.push('date not understood');
    if (!out.stream_url)  out.problems.push('no video address');
    // A "General" row has no sport by definition, so don't report that as a fault.
    if (!out.sport && !general) out.problems.push('sport "' + (r['Section']||'') + '" not recognised');
    if (out.kind === 'game' && (!out.away || !out.home))
      out.problems.push('team not recognised: ' + [!out.away && t.away, !out.home && t.home].filter(Boolean).join(', '));
    // Even with the normalising fixed, flag a match where one side says College
    // and the other says University. Two schools in the same town often differ
    // by exactly that word, and getting it wrong is silent.
    if (schoolName) {
      [[out.away, t.away], [out.home, t.home]].forEach(([key, given]) => {
        if (!key || !given) return;
        const have = schoolName(key) || '';
        const mix = (a, b) => /\bcollege\b/i.test(a) && /\buniversity\b/i.test(b);
        if (mix(given, have) || mix(have, given))
          out.problems.push('check this is the right school: file says "' + given + '", matched "' + have + '"');
      });
    }
    return out;
  }

  return { parseCSV, parseWhen, norm, readTitle, matcher, readRow, NOT_A_GAME };
})();
