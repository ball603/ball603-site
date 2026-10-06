/* NEC Front Row — shared site code: the events list, live scores, header, Today's Events strip and cards. */
window.FR = (() => {
  const BASE = '/frontrow/';
  const FEED = '/.netlify/functions/frontrow-stats';
  const POLL_MS = 10000;
  let teams = {}, events = [], subs = [], loaded = null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const logo = k => '/.netlify/functions/frontrow-logo?t=' + encodeURIComponent(k);
  const logoImg = (k, size, cls = '') => `<img class="${cls}" src="${logo(k)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  const time = ms => new Date(ms).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });

  // ---- Data ----
  function load(){
    if (loaded) return loaded;
    loaded = fetch(BASE + 'data/events.json', { cache:'no-cache' })
      .then(r => r.json())
      .then(d => {
        teams = d.teams;
        events = d.events.map(e => ({ ...e, a: { key:e.away, ...teams[e.away] }, h: { key:e.home, ...teams[e.home] },
          status:'pre', period:0, clock:'', poss:null, kickoff: e.kickoff ? Date.parse(e.kickoff) : null, score:{ away:0, home:0 } }));
        return poll().then(() => { setInterval(poll, POLL_MS); return events; });
      });
    return loaded;
  }

  async function poll(){
    const changed = new Set();
    try {
      const r = await fetch(FEED, { cache:'no-cache' });
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
        };
        if (next.score.away !== ev.score.away || next.score.home !== ev.score.home) changed.add(ev.id);
        Object.assign(ev, next);
      });
    } catch (e) { /* keep the last scores we had */ }
    subs.forEach(fn => { try { fn(events, changed); } catch (e) { console.error(e); } });
  }
  const on = fn => { subs.push(fn); if (events.length) fn(events, new Set()); };
  const byId = id => events.find(e => e.id === id);

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
  const lead = (ev, side) => ev.status !== 'pre' && ev.score[side] < ev.score[side === 'away' ? 'home' : 'away'] ? 'lose' : '';
  const matchup = ev => `${ev.a.name} at ${ev.h.name}`;
  const watchUrl = ev => `${BASE}watch.html?e=${encodeURIComponent(ev.id)}`;

  // ---- Header ----
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    live: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></svg>',
    multi: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1.2"/><rect x="13" y="4" width="8" height="7" rx="1.2"/><rect x="3" y="13" width="8" height="7" rx="1.2"/><rect x="13" y="13" width="8" height="7" rx="1.2"/></svg>',
    schools: '<svg viewBox="0 0 24 24"><path d="M12 3l9 4-9 4-9-4zM6 9v5c0 2 3 4 6 4s6-2 6-4V9"/></svg>',
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
        ${link('live', BASE + '#live', 'Live')}
        ${link('multi', BASE + 'multiview.html', 'Multiview')}
        ${link('schools', BASE + '#schools', 'Schools', '<span class="soon">Soon</span>')}
      </nav>
      <a class="livecount" id="liveCount" href="${BASE}#live" hidden><span class="dot"></span><span></span></a>`;
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
      strip.innerHTML = sorted(list).map(ev => {
        const row = side => {
          const t = side === 'away' ? ev.a : ev.h;
          return `<div class="tm ${lead(ev, side)}">${logoImg(t.key, 20)}<span class="ab">${esc(t.abbr)}${ev.poss === side ? '<i class="poss" title="Has the ball"></i>' : ''}</span><span class="sc">${ev.status === 'pre' ? '' : ev.score[side]}</span></div>`;
        };
        return `<a class="sb" href="${watchUrl(ev)}" aria-label="${esc(matchup(ev))}, ${esc(label(ev))}${ev.status !== 'pre' ? `, ${ev.score.away} to ${ev.score.home}` : ''}">
          <div class="st ${isLive(ev) ? 'live' : ''}">${isLive(ev) ? '<span class="dot"></span>' : ''}${esc(label(ev))}</div>${row('away')}${row('home')}</a>`;
      }).join('');
      strip.scrollLeft = x; arrows();
    });
  }

  // ---- Card art and cards ----
  function art(ev, withScore = true){
    const scr = withScore && ev.status !== 'pre'
      ? `<div class="scr"><span>${ev.score.away}</span><small>${esc(label(ev))}</small><span>${ev.score.home}</span></div>`
      : (ev.status === 'pre' ? `<div class="scr"><small>${esc(soon(ev))}</small></div>` : '');
    return `<div class="art" style="--ca:${esc(ev.a.color)};--ch:${esc(ev.h.color)}">${pill(ev)}
      <span class="lg a">${logoImg(ev.a.key, 120)}</span><span class="lg h">${logoImg(ev.h.key, 120)}</span>${scr}</div>`;
  }
  function card(ev){
    return `<a class="card" href="${watchUrl(ev)}">${art(ev)}
      <div><div class="t">${esc(ev.a.name)} at ${esc(ev.h.name)}</div><div class="s">${esc(ev.sport)} · ${esc(ev.venue)}</div></div></a>`;
  }

  // ---- Pull down to refresh, only in the home screen app (Safari's own version isn't there) ----
  function pullToRefresh(skip = () => false){
    const installed = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    if (!installed) return;
    const ptr = document.createElement('div'); ptr.className = 'ptr'; ptr.setAttribute('aria-hidden', 'true');
    ptr.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>';
    document.body.appendChild(ptr);
    const PULL = 80; let y0 = null, dist = 0;
    document.addEventListener('touchstart', e => {
      if (window.scrollY > 0 || skip(e)) return;
      if (e.target.closest('.strip, .rail, .tile.is-pip, .rh')) return;
      y0 = e.touches[0].clientY; dist = 0;
    }, { passive:true });
    document.addEventListener('touchmove', e => {
      if (y0 === null) return;
      dist = Math.max(0, e.touches[0].clientY - y0);
      const d = Math.min(dist, PULL * 1.5);
      ptr.style.transform = `translateY(${d * .9}px) rotate(${d * 3}deg)`;
      ptr.classList.toggle('ready', dist > PULL);
    }, { passive:true });
    document.addEventListener('touchend', () => {
      if (y0 === null) return; y0 = null;
      if (dist > PULL) { ptr.classList.add('spin'); setTimeout(() => location.reload(), 250); }
      else { ptr.style.transition = 'transform .2s'; ptr.style.transform = ''; setTimeout(() => ptr.style.transition = '', 220); }
    });
  }

  return { BASE, esc, logo, logoImg, time, load, on, byId, label, soon, pill, isLive, watchable, sorted, lead, matchup, watchUrl,
           header, board, art, card, pullToRefresh, get events(){ return events; }, get teams(){ return teams; } };
})();
