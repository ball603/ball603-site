/* NEC Front Row — shared site code: the events list, live scores, header, Today's Events strip and cards. */
window.FR = (() => {
  const BASE = '/frontrow/';
  const FEED = '/.netlify/functions/frontrow-stats';
  const POLL_MS = 10000;
  let teams = {}, events = [], subs = [], loaded = null, schools = [], sports = [];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const logo = k => '/.netlify/functions/frontrow-logo?t=' + encodeURIComponent(k);
  const logoImg = (k, size, cls = '') => String(k).startsWith('x-') && !(rteams[k] && rteams[k].logo)
    ? (t => `<svg class="${cls} tbadge" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="${esc(t.color)}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="${t.abbr.length > 3 ? 30 : 36}" fill="#fff">${esc(t.abbr)}</text></svg>`)(rteams[k] || { color:'#3a4a63', abbr:'?' })
    : `<img class="${cls}" src="${logo(k)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  const time = ms => new Date(ms).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });

  // ---- Data ----
  // Fetch with a couple of quick retries, so a hiccup on the first try doesn't leave a page empty
  async function getJSON(url, tries = 3){
    for (let i = 0; ; i++) {
      try { const r = await fetch(url, { cache:'no-cache' }); if (!r.ok) throw new Error(r.status); return await r.json(); }
      catch (e) { if (i >= tries - 1) throw e; await new Promise(ok => setTimeout(ok, 600 * (i + 1))); }
    }
  }
  function load(){
    if (loaded) return loaded;
    loaded = getJSON(BASE + 'data/events.json')
      .then(d => {
        teams = d.teams; schools = d.schools || []; sports = d.sports || [];
        events = d.events.map(e => ({ ...e, a: { key:e.away, ...teams[e.away] }, h: { key:e.home, ...teams[e.home] },
          status:'pre', period:0, clock:'', poss:null, kickoff: e.kickoff ? Date.parse(e.kickoff) : null, score:{ away:0, home:0 } }));
        return poll().then(() => { setInterval(poll, POLL_MS); return events; });
      })
      .catch(e => { loaded = null; throw e; });
    return loaded;
  }

  // Pieces of the stats feed: quarter-by-quarter scores, team totals, and stat leaders
  const attrs = n => n ? Object.fromEntries([...n.attributes].map(a => [a.name, isNaN(a.value) || a.value === '' ? a.value : +a.value])) : null;
  const lines = t => [...t.querySelectorAll('linescore lineprd')].map(l => +l.getAttribute('score') || 0);
  const leaders = t => { const L = t.querySelector('leaders'); return L ? { pass: attrs(L.querySelector('pass')), rush: attrs(L.querySelector('rush')), rec: attrs(L.querySelector('rec')) } : null; };

  async function poll(){
    const changed = new Set();
    try {
      let r = await fetch(FEED, { cache:'no-cache' }).catch(() => null);
      if (!r || !r.ok) { await new Promise(ok => setTimeout(ok, 700)); r = await fetch(FEED, { cache:'no-cache' }); }
      if (!r.ok) throw new Error(r.status);
      const doc = new DOMParser().parseFromString(await r.text(), 'application/xml');
      doc.querySelectorAll('game').forEach(n => {
        const ev = events.find(e => e.id === n.getAttribute('id')); if (!ev) return;
        const v = n.querySelector('team[vh="V"]'), h = n.querySelector('team[vh="H"]');
        const next = {
          status: n.getAttribute('status'), period: +n.getAttribute('period') || 0, clock: n.getAttribute('clock') || '',
          poss: n.getAttribute('poss') === 'V' ? 'away' : n.getAttribute('poss') === 'H' ? 'home' : null,
          kickoff: Date.parse(n.getAttribute('kickoff')) || ev.kickoff,
          score: { away: +v.getAttribute('score') || 0, home: +h.getAttribute('score') || 0 },
          lines: { away: lines(v), home: lines(h) },
          stats: { away: attrs(v.querySelector('totals')), home: attrs(h.querySelector('totals')) },
          leaders: { away: leaders(v), home: leaders(h) },
        };
        if (next.score.away !== ev.score.away || next.score.home !== ev.score.home) changed.add(ev.id);
        Object.assign(ev, next);
      });
    } catch (e) { /* keep the last scores we had */ }
    subs.forEach(fn => { try { fn(events, changed); } catch (e) { console.error(e); } });
  }
  const on = fn => { subs.push(fn); if (events.length) fn(events, new Set()); };
  const byId = id => events.find(e => e.id === id) || rmap[id];

  // ---- My Teams (saved on this device) ----
  const FAV_KEY = 'fr-favs-v1';
  let favs = { schools: [], sports: [] };
  try { favs = Object.assign(favs, JSON.parse(localStorage.getItem(FAV_KEY) || '{}')); } catch (e) {}
  const hasFavs = () => favs.schools.length > 0 || favs.sports.length > 0;
  function isFav(ev){
    if (!hasFavs()) return false;
    const school = !favs.schools.length || favs.schools.includes(ev.away || (ev.a && ev.a.key)) || favs.schools.includes(ev.home || (ev.h && ev.h.key));
    const sport = !favs.sports.length || favs.sports.includes(ev.sportKey);
    return school && sport;
  }
  function saveFavs(next){
    favs = { schools:[...new Set(next.schools)], sports:[...new Set(next.sports)] };
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
    subs.forEach(fn => { try { fn(events, new Set()); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent('fr:favs'));
  }

  // ---- Spoiler-free mode: hide every score until the viewer asks to see a game's ----
  let noScores = false; try { noScores = localStorage.getItem('fr-noscores') === '1'; } catch (e) {}
  const shown = new Set(); try { JSON.parse(sessionStorage.getItem('fr-shown') || '[]').forEach(id => shown.add(id)); } catch (e) {}
  const hidden = ev => noScores && !shown.has(ev.id);
  const HID = '<span class="hid" title="Score hidden">–</span>';
  const pts = (ev, side) => ev.status === 'pre' ? '' : hidden(ev) ? HID : String(ev.score[side]);
  const refresh = () => { subs.forEach(fn => { try { fn(events, new Set()); } catch (e) { console.error(e); } }); document.dispatchEvent(new CustomEvent('fr:spoil')); };
  function setNoScores(v){ noScores = v; try { localStorage.setItem('fr-noscores', v ? '1' : '0'); } catch (e) {} document.documentElement.classList.toggle('no-spoil', v); refresh(); }
  function showScore(id){ shown.add(id); try { sessionStorage.setItem('fr-shown', JSON.stringify([...shown])); } catch (e) {} refresh(); }
  document.documentElement.classList.toggle('no-spoil', noScores);

  // ---- Labels ----
  const ord = p => ['', '1st', '2nd', '3rd', '4th'][p] || 'OT';
  function label(ev){
    if (ev.status === 'live') return `${ord(ev.period)} · ${ev.clock}`;
    if (ev.status === 'half') return 'Halftime';
    if (ev.status === 'final') return 'Final';
    return ev.kickoff ? time(ev.kickoff) : 'Today';
  }
  function soon(ev){
    if (ev.status !== 'pre' || !ev.kickoff) return '';
    const m = Math.round((ev.kickoff - Date.now()) / 60000);
    return m <= 0 ? 'Starting now' : m < 60 ? `Kickoff in ${m} min` : `Kickoff ${time(ev.kickoff)}`;
  }
  const isLive = ev => ev.status === 'live' || ev.status === 'half';
  const watchable = ev => ev.status !== 'pre';
  function pill(ev){
    if (ev.status === 'live') return `<span class="pill live"><span class="sr">Live, </span>Live</span>`;
    if (ev.status === 'half') return `<span class="pill half">Halftime</span>`;
    if (ev.status === 'final') return `<span class="pill final">Replay</span>`;
    return `<span class="pill pre">${esc(time(ev.kickoff))}</span>`;
  }
  const rank = ev => isLive(ev) ? 0 : ev.status === 'pre' ? 1 : 2;
  const sorted = list => [...list].sort((x, y) => rank(x) - rank(y) || (x.kickoff || 0) - (y.kickoff || 0));
  const favFirst = list => { const s = sorted(list); return [...s.filter(isFav), ...s.filter(e => !isFav(e))]; };
  const STAR = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
  const lead = (ev, side) => ev.status !== 'pre' && !hidden(ev) && ev.score[side] < ev.score[side === 'away' ? 'home' : 'away'] ? 'lose' : '';
  const matchup = ev => `${ev.a.name} at ${ev.h.name}`;
  const watchUrl = ev => `${BASE}watch.html?e=${encodeURIComponent(ev.id)}`;

  // ---- Header ----
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    live: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>',
    multi: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1.2"/><rect x="13" y="4" width="8" height="7" rx="1.2"/><rect x="3" y="13" width="8" height="7" rx="1.2"/><rect x="13" y="13" width="8" height="7" rx="1.2"/></svg>',
    schools: '<svg viewBox="0 0 24 24"><path d="M12 3l9 4-9 4-9-4zM6 9v5c0 2 3 4 6 4s6-2 6-4V9"/></svg>',
    ondemand: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none"/></svg>',
    sports: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.5 9.5c4 1 13 1 17 0M3.5 14.5c4-1 13-1 17 0M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18"/></svg>',
  };
  function header(active){
    const el = document.getElementById('hdr'); if (!el) return;
    const link = (key, href, text, extra = '') =>
      `<a href="${href}" class="${active === key ? 'on' : ''}" ${active === key ? 'aria-current="page"' : ''}>${ICON[key]}<span>${text}</span>${extra}</a>`;
    el.className = 'hdr';
    el.innerHTML = `
      <a class="brand" href="${BASE}" aria-label="NEC Front Row home">
        <img src="${logo('nec')}" alt="" width="60" height="30" decoding="async">
        <span class="wm">Front <b>Row</b></span>
      </a>
      <nav class="nav" aria-label="Main">
        ${link('home', BASE, 'Home')}
        <div class="dd">${link('sports', BASE + 'sports.html', 'Sports', '<svg class="caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>')}
          <div class="dd-menu" id="sportsMenu" hidden></div></div>
        ${link('ondemand', BASE + 'ondemand.html', 'On Demand')}
        ${link('multi', BASE + 'multiview.html', 'Multiview')}
        ${link('schools', BASE + 'school.html', 'Schools')}
      </nav>
      <a class="livecount" id="liveCount" href="${BASE}#live" hidden><span class="dot"></span><span></span></a>
      <button class="spoil" id="spoilBtn"></button>
      <button class="myteams" id="myTeamsBtn" aria-haspopup="dialog">${STAR}<span>My Teams</span></button>`;
    const sl = el.querySelector('.dd > a'), menu = document.getElementById('sportsMenu');
    sl.setAttribute('aria-haspopup', 'true'); sl.setAttribute('aria-expanded', 'false');
    const closeMenu = () => { menu.hidden = true; sl.setAttribute('aria-expanded', 'false'); };
    sl.addEventListener('click', e => {
      if (!matchMedia('(min-width: 761px)').matches) return;
      e.preventDefault();
      const open = menu.hidden;
      if (open) {
        const counts = {}; events.forEach(ev => counts[ev.sportKey] = (counts[ev.sportKey] || 0) + 1);
        const list = [...sports].sort((x, y) => (counts[y.key] ? 1 : 0) - (counts[x.key] ? 1 : 0));
        menu.innerHTML = list.map(sp => `<a href="${BASE}sports.html?s=${encodeURIComponent(sp.key)}"><span>${esc(sp.name)}</span>${counts[sp.key] ? `<em>${counts[sp.key]} today</em>` : ''}</a>`).join('') +
          `<a class="all" href="${BASE}sports.html">All sports →</a>`;
      }
      menu.hidden = !open; sl.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => { if (!e.target.closest('.dd')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    const sp = document.getElementById('spoilBtn');
    const spMark = () => { sp.innerHTML = (noScores ? '<svg class="eye" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.6 7.9 3.1 9.8 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"/></svg><span>Scores hidden</span>' : '<svg class="eye" viewBox="0 0 24 24"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span>Hide scores</span>');
      sp.setAttribute('aria-pressed', noScores); sp.title = noScores ? 'Scores are hidden. Tap to show them.' : 'Hide all scores (spoiler-free)'; };
    sp.onclick = () => { setNoScores(!noScores); spMark(); }; spMark();
    const mt = document.getElementById('myTeamsBtn');
    const mark = () => { mt.classList.toggle('set', hasFavs()); mt.setAttribute('aria-label', hasFavs() ? 'My Teams (set)' : 'Pick my teams'); };
    mt.onclick = () => openPicker(); mark();
    document.addEventListener('fr:favs', mark);
    on(list => {
      const n = list.filter(isLive).length, lc = document.getElementById('liveCount');
      lc.hidden = !n; lc.lastElementChild.textContent = `${n} live`;
    });
  }

  // ---- Today's Events strip ----
  function board(el){
    if (!el) return;
    el.className = 'board';
    el.setAttribute('aria-label', "Today's events");
    el.innerHTML = `<div class="board-in"><div class="board-lbl"><span>Today's</span><b>Events</b></div>
      <div class="strip" id="strip" tabindex="0"></div></div>
      <button class="strip-btn l" aria-label="Scroll back" hidden><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button class="strip-btn r" aria-label="Scroll ahead"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`;
    const strip = el.querySelector('.strip'), bl = el.querySelector('.l'), br = el.querySelector('.r');
    const arrows = () => { bl.hidden = strip.scrollLeft < 8; br.hidden = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 8; };
    strip.addEventListener('scroll', arrows, { passive:true });
    bl.onclick = () => strip.scrollBy({ left: -strip.clientWidth * .8, behavior:'smooth' });
    br.onclick = () => strip.scrollBy({ left: strip.clientWidth * .8, behavior:'smooth' });
    on(list => {
      const x = strip.scrollLeft;
      strip.innerHTML = favFirst(list).map(ev => {
        const row = side => {
          const t = side === 'away' ? ev.a : ev.h;
          return `<div class="tm ${lead(ev, side)}">${logoImg(t.key, 20)}<span class="ab">${esc(t.abbr)}${ev.poss === side ? '<i class="poss" title="Has the ball"></i>' : ''}</span><span class="sc">${pts(ev, side)}</span></div>`;
        };
        return `<a class="sb${isFav(ev) ? ' fav' : ''}" href="${watchUrl(ev)}" aria-label="${esc(matchup(ev))}, ${esc(label(ev))}${ev.status !== 'pre' && !hidden(ev) ? `, ${ev.score.away} to ${ev.score.home}` : ''}">
          <div class="st ${isLive(ev) ? 'live' : ''}">${isLive(ev) ? '<span class="dot"></span>' : ''}${esc(label(ev))}${isFav(ev) ? STAR : ''}</div>${row('away')}${row('home')}</a>`;
      }).join('');
      strip.scrollLeft = x; arrows();
    });
  }

  // ---- Card art and cards ----
  function art(ev, withScore = true){
    const scr = withScore && ev.status !== 'pre'
      ? `<div class="scr"><span>${pts(ev, 'away')}</span><small>${esc(label(ev))}</small><span>${pts(ev, 'home')}</span></div>`
      : (ev.status === 'pre' ? `<div class="scr"><small>${esc(soon(ev))}</small></div>` : '');
    return `<div class="art" style="--ca:${esc(ev.a.color)};--ch:${esc(ev.h.color)}">${pill(ev)}
      <span class="lg a">${logoImg(ev.a.key, 120)}</span><span class="lg h">${logoImg(ev.h.key, 120)}</span>${scr}</div>`;
  }
  function card(ev){
    return `<a class="card${isFav(ev) ? ' fav' : ''}" href="${watchUrl(ev)}">${art(ev)}
      <div><div class="t">${isFav(ev) ? STAR : ''}${esc(ev.a.name)} at ${esc(ev.h.name)}</div><div class="s">${esc(ev.sport)} · ${esc(ev.venue)}</div></div></a>`;
  }

  // ---- Replay library (past games from Hudl). Loads only on pages that need it. ----
  let rteams = {}, ritems = null, rmap = {}, rloaded = null;
  const SPORTNAMES = () => Object.fromEntries(sports.map(s => [s.key, s.name]));
  const hudl = h => typeof h === 'number' ? `https://vcloud.hudl.com/file/hls/${h}.m3u8` : h;
  const teamOf = k => k === 'nec' ? { key:'nec', name:'NEC', abbr:'NEC', color:'#1f8fd6' } : ({ key:k, ...(teams[k] || rteams[k] || { name:k, abbr:k.toUpperCase().slice(0, 4), color:'#3a4a63' }) });
  function replays(){
    if (rloaded) return rloaded;
    rloaded = load().then(() => getJSON(BASE + 'data/replays.json')).then(d => {
      rteams = d.teams || {};
      Object.entries(d.sports || {}).forEach(([key, name]) => { if (!sports.some(s => s.key === key)) sports.push({ key, name }); });
      const names = SPORTNAMES();
      ritems = d.items.map(([id, date, sport, kind, a, h, sep, title, lab, dur, hls]) => {
        const it = { id, archive:true, status:'final', date:Date.parse(date), kickoff:Date.parse(date), sportKey:sport, sport:names[sport] || '', kind,
          sep, title, label:lab, dur, stream:hudl(hls), a:a ? teamOf(a) : null, h:h ? teamOf(h) : null, score:{ away:0, home:0 } };
        if (!it.a) it.a = it.h;   // events and shows are filed under the host school
        rmap[id] = it; return it;
      });
      return ritems;
    }).catch(e => { rloaded = null; throw e; });
    return rloaded;
  }
  const rtitle = it => it.kind === 'game' ? `${it.a.name} ${it.sep === 'vs' ? 'vs.' : 'at'} ${it.h.name}` : it.title;
  const day = ms => new Date(ms).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
  const len = s => s ? (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round(s % 3600 / 60)}m` : `${Math.round(s / 60)} min`) : '';
  const KIND = { show:'Show', event:'Event', classic:'Classic' };
  function rart(it){
    const tag = `<span class="pill final">${KIND[it.kind] || 'Replay'}</span>`;
    if (it.kind === 'game') return `<div class="art" style="--ca:${esc(it.a.color)};--ch:${esc(it.h.color)}">${tag}
      <span class="lg a">${logoImg(it.a.key, 120)}</span><span class="lg h">${logoImg(it.h.key, 120)}</span>${it.dur ? `<span class="len">${esc(len(it.dur))}</span>` : ''}</div>`;
    return `<div class="art solo" style="--ca:${esc(it.h.color)};--ch:${esc(it.h.color)}">${tag}<span class="lg c">${logoImg(it.h.key, 120)}</span>${it.dur ? `<span class="len">${esc(len(it.dur))}</span>` : ''}</div>`;
  }
  function rcard(it){
    const fav = isFav(it);
    return `<a class="card${fav ? ' fav' : ''}" href="${BASE}watch.html?e=${encodeURIComponent(it.id)}">${rart(it)}
      <div><div class="t">${fav ? STAR : ''}${esc(rtitle(it))}</div><div class="s">${esc([it.sport, day(it.date), it.label].filter(Boolean).join(' · '))}</div></div></a>`;
  }

  // School tile: tap to open the school's page, star to follow
  function schoolCard(s){
    const on = favs.schools.includes(s.key);
    return `<div class="school${on ? ' on' : ''}"><a class="sl" href="${BASE}school.html?t=${encodeURIComponent(s.key)}">${logoImg(s.key, 64)}<b>${esc(s.name)}</b><span>${esc(s.mascot || '')}</span></a>
      <button class="follow" data-k="${esc(s.key)}" aria-pressed="${on}" aria-label="${on ? 'Unfollow' : 'Follow'} ${esc(s.name)}">${STAR}${on ? 'Following' : 'Follow'}</button></div>`;
  }

  // ---- My Teams picker ----
  function openPicker(){
    let dlg = document.getElementById('mtDlg');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'mtDlg'; dlg.className = 'sheet'; dlg.setAttribute('aria-labelledby', 'mtTitle');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => {
        if (e.target === dlg) { dlg.close(); return; }
        const b = e.target.closest('[data-pick]'); if (!b) return;
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
        count();
      });
    }
    const sportName = k => (sports.find(s => s.key === k) || {}).name || k;
    const tile = s => `<button class="pk" data-pick="school" data-key="${esc(s.key)}" aria-pressed="${favs.schools.includes(s.key)}">
        ${logoImg(s.key, 44)}<b>${esc(s.name)}</b>${s.sports ? `<small>${s.sports.map(sportName).map(esc).join(' · ')}</small>` : ''}<i class="tick" aria-hidden="true"></i></button>`;
    dlg.innerHTML = `
      <div class="sh-h"><h2 id="mtTitle">My Teams</h2><button class="sh-x" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg></button></div>
      <div class="sh-b">
        <p class="sh-note">Pick your schools and sports. Their games show first everywhere on Front Row. Saved on this device.</p>
        <h3>Full members</h3><div class="pk-grid">${schools.filter(s => s.member === 'full').map(tile).join('')}</div>
        <h3>Associate members <span>(NEC sports listed)</span></h3><div class="pk-grid">${schools.filter(s => s.member !== 'full').map(tile).join('')}</div>
        <h3>Sports</h3><div class="chips">${sports.map(s => `<button class="chip" data-pick="sport" data-key="${esc(s.key)}" aria-pressed="${favs.sports.includes(s.key)}">${esc(s.name)}</button>`).join('')}</div>
      </div>
      <div class="sh-f"><button class="btn" data-clear>Clear all</button><button class="btn primary" data-done>Save</button></div>`;
    const count = () => {
      const n = dlg.querySelectorAll('[data-pick][aria-pressed="true"]').length;
      dlg.querySelector('[data-done]').textContent = n ? `Save (${n})` : 'Save';
    };
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.querySelector('[data-clear]').onclick = () => { dlg.querySelectorAll('[data-pick]').forEach(b => b.setAttribute('aria-pressed', 'false')); count(); };
    dlg.querySelector('[data-done]').onclick = () => {
      const pick = t => [...dlg.querySelectorAll(`[data-pick="${t}"][aria-pressed="true"]`)].map(b => b.dataset.key);
      saveFavs({ schools: pick('school'), sports: pick('sport') });
      try { localStorage.setItem('fr-favs-asked', '1'); } catch (e) {}
      dlg.close();
    };
    count();
    dlg.showModal();
  }

  // ---- Home screen app: register the offline helper, and show how to install ----
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register(BASE + 'sw.js', { scope: BASE }).catch(() => {}));
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; document.dispatchEvent(new CustomEvent('fr:installable')); });
  const installed = () => navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  function installTip(el){
    const touch = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
    if (!el || installed() || !touch) return;
    let closed = false; try { closed = localStorage.getItem('fr-install-tip') === 'closed'; } catch (e) {}
    if (closed) return;
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const close = () => { el.hidden = true; try { localStorage.setItem('fr-install-tip', 'closed'); } catch (e) {} };
    const show = html => { el.className = 'tip'; el.innerHTML = html + '<button class="tip-x" aria-label="Close tip">×</button>'; el.hidden = false; el.querySelector('.tip-x').onclick = close; };
    const icon = '<img src="' + BASE + 'icon-180.png" alt="" width="40" height="40">';
    if (iOS) show(`${icon}<p><b>Get the Front Row app.</b> Tap <b>Share</b>, then <b>Add to Home Screen</b>. It opens full screen with no browser bars.</p>`);
    document.addEventListener('fr:installable', () => {
      show(`${icon}<p><b>Get the Front Row app</b> on your home screen. It opens full screen.</p><button class="btn primary tip-go">Install</button>`);
      el.querySelector('.tip-go').onclick = async () => { installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === 'accepted') close(); };
    });
  }

  // ---- Pull down to refresh, only in the home screen app (Safari's own version isn't there) ----
  function pullToRefresh(skip = () => false){
    const installed = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    if (!installed) return;
    const ptr = document.createElement('div'); ptr.className = 'ptr'; ptr.setAttribute('aria-hidden', 'true');
    ptr.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>';
    document.body.appendChild(ptr);
    const PULL = 80; let y0 = null, x0 = 0, dist = 0, dir = null;
    document.addEventListener('touchstart', e => {
      if (window.scrollY > 0 || skip(e)) return;
      if (e.target.closest('.tile, .rh, dialog')) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dist = 0; dir = null;
    }, { passive:true });
    document.addEventListener('touchmove', e => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
      if (!dir && Math.hypot(dx, dy) > 8) dir = Math.abs(dx) > Math.abs(dy) ? 'side' : 'down';
      if (dir === 'side' || window.scrollY > 0) { y0 = null; ptr.style.transform = ''; ptr.classList.remove('pulling'); return; }
      dist = Math.max(0, dy);
      const d = Math.min(dist, PULL * 1.5);
      ptr.style.transform = `translateY(${d * .9}px) rotate(${d * 3}deg)`; ptr.classList.add('pulling');
      ptr.classList.toggle('ready', dist > PULL);
    }, { passive:true });
    document.addEventListener('touchend', () => {
      if (y0 === null) return; y0 = null;
      if (dist > PULL) { ptr.classList.add('spin'); setTimeout(() => location.reload(), 250); }
      else { ptr.style.transition = 'transform .2s'; ptr.style.transform = ''; ptr.classList.remove('pulling'); setTimeout(() => ptr.style.transition = '', 220); }
    });
  }

  return { favs: () => favs, setFavs: saveFavs, hasFavs, isFav, favFirst, openPicker, installTip, STAR, BASE, esc, logo, logoImg, time, load, on, byId, label, soon, pill, isLive, watchable, sorted, lead, matchup, watchUrl,
           header, board, art, card, pullToRefresh, pts, hidden, showScore, noScores: () => noScores, replays, rcard, rart, schoolCard, rtitle, teamOf, day, len, get replayItems(){ return ritems || []; }, get events(){ return events; }, get teams(){ return teams; }, get schools(){ return schools; }, get sports(){ return sports; } };
})();
