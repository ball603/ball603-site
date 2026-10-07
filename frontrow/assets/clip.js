/* NEC Front Row — make a 10–30 second clip from a game, right on the viewer's phone or computer.
   How it works: the game video is stored as small chunks (a few seconds each). We fetch the chunks
   around the moment, then a video tool running inside the browser trims them into one regular .mp4
   (no quality loss, no re-encoding), which can be saved or shared. Nothing is uploaded anywhere. */
window.FRClip = (() => {
  const VENDOR = location.origin + '/frontrow/vendor/ffmpeg/';
  const WASM = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';
  let ffReady = null;

  function loadScript(src){
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('load ' + src)); document.head.appendChild(s); });
  }
  // The video tool is large (about 30 MB), so it only loads when someone opens the clip panel. Browsers keep it afterwards.
  function prepare(){
    if (!ffReady) ffReady = (async () => {
      if (!window.FFmpegWASM) await loadScript(VENDOR + 'ffmpeg.js');
      const ff = new FFmpegWASM.FFmpeg();
      // the big 30 MB piece comes from a public code library (GitHub's upload page won't take files over 25 MB)
      await ff.load({ coreURL: VENDOR + 'ffmpeg-core.js', wasmURL: WASM });
      return ff;
    })().catch(e => { ffReady = null; throw e; });
    return ffReady;
  }

  const helper = url => { const m = String(url).match(/^https?:\/\/vcloud\.hudl\.com\/file\/hls\/(\d+)\.m3u8/i); return m ? '/.netlify/functions/hudl-playlist?id=' + m[1] : url; };
  const abs = (u, base) => new URL(u, new URL(base, location.href)).href;
  // Always ask for a fresh copy. On iPhones, Apple's player has already saved these pieces without
  // the permission the clip tool needs, and Safari would reuse that copy and refuse it ("Load failed").
  async function fresh(url, what){
    const same = new URL(url, location.href).origin === location.origin;
    const u = same ? url : url + (url.includes('?') ? '&' : '?') + 'fr=' + Date.now().toString(36);
    let r;
    // (a unique address does the trick; Hudl's server rejects the browser's 'no-store' setting)
    try { r = await fetch(u, { mode: 'cors', credentials: 'omit' }); }
    catch (e) { throw new Error(`Couldn't download the ${what}. Check your connection and try again.`); }
    if (!r.ok) throw new Error(`Couldn't download the ${what} (${r.status}).`);
    return r;
  }

  // Pick the 720p version (clear, and a 30-second clip stays around 10 MB)
  async function mediaPlaylist(stream){
    const src = helper(stream);
    const text = await (await fresh(src, 'game video list')).text();
    if (!/#EXT-X-STREAM-INF/.test(text)) return { url: abs(src, location.href), text };
    const lines = text.split(/\r?\n/), variants = [];
    lines.forEach((l, i) => {
      if (!l.startsWith('#EXT-X-STREAM-INF')) return;
      const h = +((l.match(/RESOLUTION=\d+x(\d+)/) || [])[1] || 0);
      const next = lines.slice(i + 1).find(x => x && !x.startsWith('#'));
      if (next) variants.push({ h, url: abs(next, src) });
    });
    variants.sort((a, b) => a.h - b.h);
    const pick = [...variants].reverse().find(v => v.h && v.h <= 720) || variants[0];
    return { url: pick.url, text: await (await fresh(pick.url, 'game video list')).text() };
  }

  function parse(url, text){
    const segs = []; let t = 0, dur = 0, pdt = null;
    for (const l of text.split(/\r?\n/)) {
      if (l.startsWith('#EXTINF:')) dur = parseFloat(l.slice(8));
      else if (l.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) pdt = Date.parse(l.slice(25));
      else if (l && !l.startsWith('#')) { segs.push({ url: abs(l, url), start: t, dur, pdt }); t += dur; pdt = null; }
    }
    return { segs, total: t, live: !/#EXT-X-ENDLIST/.test(text) };
  }

  // Where in the recording the viewer was when they pressed Clip
  function position(h, list){
    const v = h.video;
    if (!list.live) return v.currentTime;
    // live streams: match by clock time when the stream provides it
    const playing = (h.hls && h.hls.playingDate) ? +h.hls.playingDate : (v.getStartDate && !isNaN(+v.getStartDate()) ? +v.getStartDate() + v.currentTime * 1000 : null);
    const first = list.segs.find(s => s.pdt);
    if (playing && first) return first.start + (playing - first.pdt) / 1000;
    // otherwise: how far behind live we are
    const edge = window.FRPlayer ? FRPlayer.liveEdge(h) : v.currentTime;
    return list.total - Math.max(0, edge - v.currentTime);
  }

  /* make({ stream, h, at, length, back, onStep })
     at: playback position captured when Clip was pressed; back: seconds earlier to end the clip */
  async function make({ stream, h, at, length, back = 0, onStep = () => {} }){
    onStep('Getting the video…', 0.02);
    const ffP = prepare();
    const { url, text } = await mediaPlaylist(stream);
    const list = parse(url, text);
    const pos = at != null && !list.live ? at : position(h, list);
    const end = Math.max(length, Math.min(list.total, pos - back));
    const start = Math.max(0, end - length);
    const need = list.segs.filter(s => s.start + s.dur > start && s.start < end);
    if (!need.length) throw new Error('That part of the game is not available.');

    const parts = []; let got = 0;
    for (const s of need) {
      const r = await fresh(s.url, 'video');
      parts.push(new Uint8Array(await r.arrayBuffer())); got++;
      onStep('Getting the video…', 0.05 + 0.55 * got / need.length);
    }
    const size = parts.reduce((n, p) => n + p.length, 0), joined = new Uint8Array(size);
    let o = 0; for (const p of parts) { joined.set(p, o); o += p.length; }

    onStep('Making your clip…', 0.65);
    let ff;
    try { ff = await ffP; } catch (e) { throw new Error("The clip tool didn't load. Check your connection and try again."); }
    const isTs = !/\.(m4s|mp4)(\?|$)/i.test(need[0].url);
    const inName = isTs ? 'in.ts' : 'in.mp4';
    await ff.writeFile(inName, joined);
    const offset = Math.max(0, start - need[0].start);
    // Start on the nearest full picture (keyframe) at or before the moment, so picture and sound start together
    const kfs = [];
    const onLog = ({ message }) => { const m = /pts_time:([\d.]+)/.exec(message || ''); if (m) kfs.push(+m[1]); };
    ff.on('log', onLog);
    await ff.exec(['-skip_frame', 'nokey', '-i', inName, '-map', '0:v:0', '-vf', 'showinfo', '-f', 'null', '-']);
    ff.off('log', onLog);
    const seekTo = kfs.filter(k => k <= offset + 0.25).pop() ?? 0;
    onStep('Making your clip…', 0.8);
    await ff.exec(['-ss', (Math.floor(seekTo * 10) / 10).toFixed(1), '-i', inName, '-t', String(length), '-c', 'copy',
      '-avoid_negative_ts', 'make_zero', '-movflags', '+faststart', 'out.mp4']);
    const out = await ff.readFile('out.mp4');
    ff.deleteFile(inName).catch(() => {}); ff.deleteFile('out.mp4').catch(() => {});
    onStep('Done', 1);
    if (!out || !out.length) throw new Error('The clip came out empty.');
    return new Blob([out], { type: 'video/mp4' });
  }

  // Save or share: phones get the share menu (Save Video, Instagram, TikTok, Messages…); computers download the file.
  async function deliver(blob, name){
    const file = new File([blob], name, { type: 'video/mp4' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file], title: name.replace(/\.mp4$/, '') }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return 'downloaded';
  }

  // ---------- The Clip panel (shared by the Game page and Multiview) ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  let dlg = null;
  function panel(){
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'sheet clipdlg'; dlg.setAttribute('aria-labelledby', 'clipTitle');
    dlg.innerHTML = `<div class="sh-h"><h2 id="clipTitle">Make a clip</h2><button class="sh-x" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg></button></div>
      <div class="sh-b" id="clipBody"></div><div class="sh-f" id="clipFoot"></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    return dlg;
  }
  // button: the Clip button; getH: the playing video; getEv: its game
  function button(btn, { stage, getH, getEv }){
    if (!btn) return;
    const clip = { len: 20, back: 0, at: 0, url: null, h: null, ev: null };
    const C = id => document.getElementById(id);
    btn.onclick = () => {
      const h = getH(), ev = getEv();
      if (!h || !ev) { window.FRPlayer && FRPlayer.toast(stage, 'Clips are ready once the game is playing'); return; }
      Object.assign(clip, { at: h.video.currentTime, back: 0, h, ev });
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      prepare().catch(() => {});      // start loading the clip tool while they choose
      const d = panel();
      d.onclose = () => { if (clip.url) { URL.revokeObjectURL(clip.url); clip.url = null; } };
      choose(); d.showModal();
    };
    function choose(){
      const end = Math.max(clip.len, clip.at - clip.back), start = Math.max(0, end - clip.len);
      C('clipBody').innerHTML = `
        <p class="sh-note">Your clip ends at the moment you tapped Clip. Make it longer, or slide it earlier to catch the whole play.</p>
        <h3>Length</h3>
        <div class="chips" role="group" aria-label="Clip length">${[10, 20, 30].map(n => `<button class="chip" data-len="${n}" aria-pressed="${clip.len === n}">${n} seconds</button>`).join('')}</div>
        <h3>When</h3>
        <div class="nudge">
          <button class="btn" data-nudge="5" ${clip.back >= 120 ? 'disabled' : ''}>‹ 5 sec earlier</button>
          <output class="num">${clip.back ? `Ends ${clip.back} sec before you tapped` : 'Ends when you tapped'}<small>${FRPlayer.clock(start)} – ${FRPlayer.clock(end)} of the video</small></output>
          <button class="btn" data-nudge="-5" ${clip.back <= 0 ? 'disabled' : ''}>5 sec later ›</button>
        </div>`;
      C('clipFoot').innerHTML = `<button class="btn" data-x>Cancel</button><button class="btn primary" data-make>Make clip</button>`;
      C('clipBody').onclick = e => {
        const l = e.target.closest('[data-len]'), n = e.target.closest('[data-nudge]');
        if (l) { clip.len = +l.dataset.len; choose(); }
        if (n) { clip.back = Math.max(0, Math.min(120, clip.back + +n.dataset.nudge)); choose(); }
      };
      C('clipFoot').querySelector('[data-x]').onclick = () => dlg.close();
      C('clipFoot').querySelector('[data-make]').onclick = run;
    }
    async function run(){
      const ev = clip.ev;
      C('clipFoot').innerHTML = '';
      C('clipBody').innerHTML = `<div class="cprog" role="status"><b id="cpMsg">Getting the video…</b><div class="bar-o"><i id="cpBar"></i></div><small>The first clip takes a little longer while the clip tool loads.</small></div>`;
      try {
        const blob = await make({ stream: ev.stream, h: clip.h, at: clip.at, length: clip.len, back: clip.back,
          onStep: (msg, p) => { C('cpMsg').textContent = msg; C('cpBar').style.width = Math.round(p * 100) + '%'; } });
        clip.url = URL.createObjectURL(blob);
        const who = ev.a && ev.h && ev.a.key !== ev.h.key ? `${ev.a.abbr}-at-${ev.h.abbr}` : (ev.h ? ev.h.abbr : 'NEC');
        const name = `NEC-FrontRow-${who}-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.mp4`.replace(/[^\w.-]+/g, '-');
        const phone = matchMedia('(pointer: coarse)').matches;
        C('clipBody').innerHTML = `<video class="clipv" src="${clip.url}" controls playsinline autoplay muted></video>
          <p class="sh-note">${clip.len}-second clip · ${(blob.size / 1048576).toFixed(1)} MB</p>`;
        C('clipFoot').innerHTML = `<button class="btn" data-again>Make another</button><button class="btn primary" data-save>${phone ? 'Save or share' : 'Download clip'}</button>`;
        C('clipFoot').querySelector('[data-again]').onclick = () => { URL.revokeObjectURL(clip.url); clip.url = null; choose(); };
        C('clipFoot').querySelector('[data-save]').onclick = async () => {
          const r = await deliver(blob, name);
          if (r === 'downloaded') FRPlayer.toast(dlg, 'Clip downloaded');
        };
      } catch (e) {
        C('clipBody').innerHTML = `<p class="sh-note">Sorry, that clip didn't work. ${esc(e && e.message || '')}</p>`;
        C('clipFoot').innerHTML = `<button class="btn" data-x>Close</button><button class="btn primary" data-retry>Try again</button>`;
        C('clipFoot').querySelector('[data-x]').onclick = () => dlg.close();
        C('clipFoot').querySelector('[data-retry]').onclick = choose;
      }
    }
  }

  return { prepare, make, deliver, button };
})();
