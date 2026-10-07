/* Shared CMS plumbing: the database connection, the sign-in guard, the header,
   and the handful of formatting helpers every screen needs. */
window.CMS_LIB = (() => {
  const C = window.CMS || {};
  if (!C.supabaseUrl || C.supabaseUrl.startsWith('PASTE')) {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.innerHTML = '<main><p class="note bad"><b>Not configured yet.</b> '
        + 'Open <code>admin/config.js</code> and paste your Supabase project URL and '
        + 'publishable key. Both are in Supabase under Project Settings → API.</p></main>';
    });
    throw new Error('CMS config missing');
  }

  const db = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  // ---- formatting ----
  // Stored UTC, shown in the league's zone. Doing this with Intl rather than by
  // hand is what keeps November right after the clocks change.
  const fmt = (iso, opts) => iso
    ? new Intl.DateTimeFormat('en-US', { timeZone: C.timeZone, ...opts }).format(new Date(iso))
    : '';
  const when     = iso => fmt(iso, { month:'short', day:'numeric', year:'2-digit' });
  const clock    = iso => fmt(iso, { hour:'numeric', minute:'2-digit' });
  const whenLong = iso => fmt(iso, { weekday:'short', month:'short', day:'numeric',
                                     year:'numeric', hour:'numeric', minute:'2-digit' });
  // <input type="datetime-local"> has no concept of a zone: it shows whatever
  // string you give it and hands the same back. So convert in both directions
  // explicitly rather than letting the browser's own zone sneak in.
  const toLocalInput = iso => {
    if (!iso) return '';
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: C.timeZone, year:'numeric', month:'2-digit',
      day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
      .formatToParts(new Date(iso)).forEach(x => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
  };
  const fromLocalInput = v => {
    if (!v) return null;
    // Find the UTC instant whose rendering in the league's zone equals what was typed.
    const guess = new Date(v + 'Z');
    const shown = toLocalInput(guess.toISOString());
    const driftMin = (new Date(v + 'Z') - new Date(shown + 'Z')) / 60000;
    return new Date(guess.getTime() + driftMin * 60000).toISOString();
  };
  const secs = s => {
    if (s == null) return '';
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return h ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // ---- who's signed in ----
  let me = null;
  async function session(){
    const { data } = await db.auth.getSession();
    if (!data.session) return null;
    const { data: p } = await db.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
    // Signed in but with no profile row means nobody has given this account a
    // role yet. Treat that as not-signed-in rather than guessing one.
    me = p ? { ...p, authEmail: data.session.user.email } : null;
    return me;
  }
  // Every screen but the login page calls this first.
  async function guard(){
    const who = await session();
    if (!who) { location.replace('index.html?next=' + encodeURIComponent(location.pathname.split('/').pop())); return null; }
    return who;
  }
  const isStaff = () => !!me && (me.role === 'admin' || me.role === 'league');

  function header(active){
    const el = document.getElementById('top'); if (!el) return;
    const link = (href, label, key) =>
      `<a href="${href}" class="${active === key ? 'on' : ''}">${label}</a>`;
    el.className = 'top';
    el.innerHTML = `
      <span class="brand">${esc(C.siteName)} <small>CMS</small></span>
      <nav>
        ${link('content.html', 'Games &amp; video', 'content')}
        ${isStaff() ? link('schools.html', 'Schools', 'schools') : ''}
        ${link('sections.html', 'Sections', 'sections')}
        ${isStaff() ? link('import.html', 'Import', 'import') : ''}
      </nav>
      <span class="who">${esc(me.authEmail || '')} · ${esc(me.role)}${me.school ? ' · ' + esc(me.school) : ''}</span>
      <button class="btn ghost" id="out">Sign out</button>`;
    document.getElementById('out').onclick = async () => {
      await db.auth.signOut(); location.replace('index.html');
    };
  }

  // Reference lists get read once per page rather than per row.
  const cache = {};
  async function lookups(){
    if (cache.ready) return cache;
    const [sp, sc] = await Promise.all([
      db.from('sports').select('key,name').order('sort'),
      db.from('schools').select('key,name,abbr,member').order('name')
    ]);
    cache.sports  = sp.data || [];
    cache.schools = sc.data || [];
    cache.school  = Object.fromEntries(cache.schools.map(s => [s.key, s]));
    cache.sport   = Object.fromEntries(cache.sports.map(s => [s.key, s]));
    cache.ready = true;
    return cache;
  }

  const statusPill = s => {
    const k = { live:'live', scheduled:'sched', archived:'arch', cancelled:'canc' }[s] || 'arch';
    return `<span class="pill ${k}">${esc(s)}</span>`;
  };

  return { db, C, me: () => me, session, guard, isStaff, header, lookups,
           when, clock, whenLong, toLocalInput, fromLocalInput, secs, esc, statusPill };
})();
