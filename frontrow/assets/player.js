/* NEC Front Row — video player helpers shared by the Game page and Multiview. Needs hls.js loaded first. */
window.FRPlayer = (() => {
  // Hudl blocks the first playlist file for outside websites, so those go through our site's helper.
  function streamUrl(url){
    const m = String(url).match(/^https?:\/\/vcloud\.hudl\.com\/file\/hls\/(\d+)\.m3u8/i);
    return m ? '/.netlify/functions/hudl-playlist?id=' + m[1] : url;
  }

  // Attach a stream to a <video>. "main" plays at full quality; others drop to the lowest to save data.
  function attach(video, url, { main = true, onError, liveSince = null } = {}){
    const src = streamUrl(url);
    const h = { video, hls:null, main, liveSince, src: new URL(src, location.href).href };
    // Sample games are recordings. For a game marked live, start where the game is "now" so it acts like live.
    video.addEventListener('loadedmetadata', () => { if (h.liveSince && !realLive(h)) { const e = liveEdge(h); if (isFinite(e) && e > 5) video.currentTime = e; } }, { once:true });
    video.playsInline = true; video.muted = true; video.autoplay = true; video.volume = 0.5;
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Android/.test(navigator.userAgent));
    // On iPhones, iPads and Safari, Apple's built-in player plays these streams and is the only one
    // that supports pop-out (picture-in-picture) there. Everywhere else, hls.js plays them.
    const native = (apple || !(window.Hls && Hls.isSupported())) && video.canPlayType('application/vnd.apple.mpegurl');
    let tries = 0;
    // Load (or reload) the stream. A fresh address on a retry makes the browser fetch it again
    // instead of reusing a bad first attempt.
    const go = () => {
      const u = tries ? src + (src.includes('?') ? '&' : '?') + 'try=' + tries : src;
      if (native) { video.src = u; video.load(); video.play().catch(() => {}); return; }
      if (h.hls) h.hls.destroy();
      const hls = new Hls({ capLevelToPlayerSize:false, abrEwmaDefaultEstimate:6000000, backBufferLength:900, maxBufferLength:30,
        manifestLoadingMaxRetry:4, levelLoadingMaxRetry:4, fragLoadingMaxRetry:6 });
      hls.loadSource(u); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setMain(h, h.main); video.play().catch(()=>{}); });
      let healed = false;
      hls.on(Hls.Events.ERROR, (e, d) => {
        if (!d.fatal) return;
        if (!healed && d.type === Hls.ErrorTypes.MEDIA_ERROR) { healed = true; hls.recoverMediaError(); return; }
        retry();
      });
      h.hls = hls;
    };
    // Self-check: if no picture shows up within a few seconds, quietly try again (like pressing refresh), up to 3 times
    const retry = () => {
      if (h.dead) return;
      if (tries >= 3) { onError && onError(); return; }
      tries++; go(); watch();
    };
    let wt;
    const watch = () => { clearTimeout(wt); wt = setTimeout(() => { if (h.dead) return; if (!video.offsetParent) return watch();   /* hidden window: check again later */ if (video.readyState < 2 && !video.error) retry(); }, 7000); };
    if (native) video.addEventListener('error', () => retry());
    if (!native && !(window.Hls && Hls.isSupported())) { onError && onError(); return h; }
    go(); watch();
    h.stopWatch = () => clearTimeout(wt);
    return h;
  }
  // The game you're focused on gets full quality. Others stay at a clear 540p to save data, not the blurry 270p.
  function setMain(h, main){
    h.main = main; if (!h.hls) return;
    if (main) { h.hls.autoLevelCapping = -1; return; }
    const lv = h.hls.levels || [];
    let cap = 0; lv.forEach((l, i) => { if ((l.height || 0) <= 540) cap = Math.max(cap, i); });
    h.hls.autoLevelCapping = cap;
  }
  function destroy(h){ if (!h) return; h.dead = true; h.stopWatch && h.stopWatch(); if (h.hls) h.hls.destroy(); h.video.removeAttribute('src'); h.video.load(); }

  const realLive = h => !!((h.hls && h.hls.latestLevelDetails && h.hls.latestLevelDetails.live) || h.video.duration === Infinity);
  function range(h){
    const s = h.video.seekable;
    const start = s.length ? s.start(0) : 0, end = s.length ? s.end(s.length - 1) : (h.video.duration || 0);
    return { start, end: isFinite(end) ? end : start };
  }
  function liveEdge(h){
    if (realLive(h)) return (h.hls && h.hls.liveSyncPosition) || range(h).end;
    const { end } = range(h);
    if (h.liveSince) return Math.max(0, Math.min(end - 2, (Date.now() - h.liveSince) / 1000));
    return end;
  }
  const back10 = h => { h.video.currentTime = Math.max(0, h.video.currentTime - 10); };
  const goLive = h => { const e = liveEdge(h); if (isFinite(e)) h.video.currentTime = Math.max(0, e - (realLive(h) ? 3 : 0)); h.video.play().catch(()=>{}); };
  const fwd10 = h => { h.video.currentTime = Math.min(liveEdge(h), h.video.currentTime + 10); };
  const toStart = h => { h.video.currentTime = 0; h.video.play().catch(()=>{}); };

  // Controls fade in when you move the mouse or tap, then hide after 3 seconds.
  function autoHide(stage, vc){
    let t;
    const show = () => {
      stage.classList.add('show-ui'); clearTimeout(t);
      t = setTimeout(() => { if (!vc.matches(':hover') && !vc.contains(document.activeElement)) stage.classList.remove('show-ui'); }, 3000);
    };
    ['pointermove','pointerdown','touchstart'].forEach(ev => stage.addEventListener(ev, show, { passive:true }));
    stage.addEventListener('pointerleave', () => { clearTimeout(t); t = setTimeout(() => stage.classList.remove('show-ui'), 800); });
    vc.addEventListener('focusin', show);
    show();
    return show;
  }

  // Full screen that keeps the whole layout. iPhones can't do that for page sections,
  // so they get a version that fills the screen. Turning a phone sideways does it automatically.
  function fullscreen(stage, btn, onChange = () => {}){
    const canFS = !!(stage.requestFullscreen || stage.webkitRequestFullscreen);
    const realFS = () => document.fullscreenElement || document.webkitFullscreenElement;
    const update = () => {
      const fs = realFS() === stage || stage.classList.contains('fake-fs');
      stage.classList.toggle('fs', fs);
      const tx = btn.querySelector('.tx'); if (tx) tx.textContent = fs ? 'Exit full screen' : 'Full screen';
      btn.setAttribute('aria-label', fs ? 'Exit full screen' : 'Full screen');
      onChange(fs);
    };
    const setFake = on => { stage.classList.toggle('fake-fs', on); document.body.classList.toggle('no-scroll', on); update(); };
    btn.addEventListener('click', () => {
      if (realFS()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (stage.classList.contains('fake-fs')) { setFake(false); return; }
      if (canFS) { const r = (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); if (r && r.catch) r.catch(() => setFake(true)); }
      else setFake(true);
    });
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    const sideways = matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)');
    let auto = false;
    const tilt = () => {
      if (sideways.matches && !realFS() && !stage.classList.contains('fake-fs')) { auto = true; setFake(true); window.scrollTo(0, 0); }
      else if (!sideways.matches && matchMedia('(pointer: coarse)').matches) {
        // phone turned back upright: leave full screen and go back to the page, video still playing
        auto = false;
        if (stage.classList.contains('fake-fs')) setFake(false);
        if (realFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        const v = stage.querySelector('video'); if (v && v.paused) v.play().catch(() => {});
      }
    };
    sideways.addEventListener ? sideways.addEventListener('change', tilt) : sideways.addListener(tilt);
    tilt();
    return { isFull: () => stage.classList.contains('fs') };
  }

  // Swap the play/pause icon to match the video
  const PLAY = 'M7 4.5v15l12.5-7.5z', PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z';
  function playIcon(btn, video){
    const label = video.paused ? 'Play' : 'Pause';
    if (btn.getAttribute('aria-label') === label) return;
    btn.setAttribute('aria-label', label); btn.title = label;
    btn.querySelector('path').setAttribute('d', video.paused ? PLAY : PAUSE);
  }

  const ICONS = {
    back: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.6.4L15.2 11l1.6 1.6-1.6 1.6 1.4 1.4 1.6-1.6 1.6 1.6 1.4-1.4-1.6-1.6 1.6-1.6-1.4-1.4-1.6 1.6z"/></svg>',
    pop: '<svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3 1.4-1.4L22 8l-5.6 5.4L15 12l3-3H7zm10 10H6l3 3-1.4 1.4L2 16l5.6-5.4L9 12l-3 3h11z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  };

  // ---------- Player bar: timeline on top, ESPN-style buttons below ----------
  const B10 = '<svg viewBox="0 0 24 24"><path d="M12 4V1.5L7.5 5 12 8.5V6a7 7 0 1 1-7 7H3a9 9 0 1 0 9-9z"/><text x="12" y="16.4" text-anchor="middle" font-size="7.2" font-weight="700" font-family="Arial,sans-serif">10</text></svg>';
  const F10 = '<svg viewBox="0 0 24 24"><path d="M12 4V1.5L16.5 5 12 8.5V6a7 7 0 1 0 7 7h2a9 9 0 1 1-9-9z"/><text x="12" y="16.4" text-anchor="middle" font-size="7.2" font-weight="700" font-family="Arial,sans-serif">10</text></svg>';
  const SHARE = '<svg viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.8-3.6a3 3 0 0 0 0-1.2l6.8-3.6A3 3 0 1 0 15 7l-6.8 3.6a3 3 0 1 0 0 4.8L15 19a3 3 0 1 0 3-3z"/></svg>';
  const clock = t => { t = Math.max(0, Math.floor(t)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };

  function bar({ vc, getH, isLiveGame, onSound, soundOn, share, extra = '', popout = true }){
    vc.innerHTML = `
      <div class="tl"><input class="seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Video timeline"><span class="tl-t num"></span></div>
      <div class="bar">
        <div class="grp">
          <button class="pb b-play" aria-label="Pause" title="Pause (space)">${ICONS.pause}</button>
          <button class="pb b-snd" aria-label="Turn sound on" title="Sound (M)">${ICONS.mute}</button>
          <button class="pb b-back" aria-label="Back 10 seconds" title="Back 10 seconds">${B10}</button>
          <button class="pb b-fwd" aria-label="Forward 10 seconds" title="Forward 10 seconds">${F10}</button>
          <button class="livebtn b-live" aria-label="Jump to live" title="Jump to live"><span class="ld"></span>LIVE</button>
          <span class="b-time num"></span>
        </div>
        <div class="grp r">${extra}
          <button class="pb b-cast" aria-label="Watch on TV" title="Watch on TV" hidden>${CAST}</button>
          <button class="pb b-share" aria-label="Share" title="Share">${SHARE}</button>
          ${popout ? `<button class="pb b-pop" aria-label="Pop out" title="Pop out over other apps">${ICONS.pop}</button>` : ''}
          <button class="pb b-full" aria-label="Full screen" title="Full screen (F)">${ICONS.full}</button>
        </div>
      </div>`;
    const q = c => vc.querySelector(c), seek = q('.seek');
    let dragging = false;
    q('.b-play').onclick = () => { const h = getH(); if (!h) return; h.video.paused ? h.video.play().catch(()=>{}) : h.video.pause(); };
    q('.b-snd').onclick = () => onSound();
    q('.b-back').onclick = () => { const h = getH(); if (h) back10(h); };
    q('.b-fwd').onclick = () => { const h = getH(); if (h) fwd10(h); };
    q('.b-live').onclick = () => { const h = getH(); if (h) goLive(h); };
    // Pop out only on computers; phones and tablets don't reliably allow it from a website
    if (popout && (!canPop() || matchMedia('(pointer: coarse)').matches)) q('.b-pop').remove(), popout = false;
    if (popout) q('.b-pop').onclick = () => { const h = getH(); if (h) popOut(h.video); };
    castSetup(q('.b-cast'), getH, isLiveGame, vc);
    q('.b-share').onclick = async () => {
      const url = share ? share() : location.href;
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: document.title, url }); } catch (e) {} return; }
      try { await navigator.clipboard.writeText(url); toast(vc.closest('.stage'), 'Link copied'); }
      catch (e) { toast(vc.closest('.stage'), url); }
    };
    // timeline: drag to preview, let go to jump
    const bounds = h => { const r = range(h); return { start: r.start, end: isLiveGame() ? liveEdge(h) : r.end }; };
    seek.addEventListener('input', () => {
      dragging = true; const h = getH(); if (!h) return;
      const b = bounds(h), t = b.start + (b.end - b.start) * seek.value / 1000;
      seek.style.setProperty('--p', seek.value / 10 + '%');
      q('.tl-t').textContent = isLiveGame() ? (b.end - t > 15 ? '-' + clock(b.end - t) : 'LIVE') : clock(t);
    });
    seek.addEventListener('change', () => {
      const h = getH(); dragging = false; if (!h) return;
      const b = bounds(h); h.video.currentTime = b.start + (b.end - b.start) * seek.value / 1000;
    });
    function update(){
      const h = getH(), live = isLiveGame();
      q('.b-live').hidden = !live;
      const snd = soundOn();
      const sb = q('.b-snd');
      if (sb.dataset.on !== String(snd)) { sb.dataset.on = snd; sb.innerHTML = snd ? ICONS.sound : ICONS.mute; sb.setAttribute('aria-label', snd ? 'Turn sound off' : 'Turn sound on'); }
      if (!h) { q('.tl').classList.add('off'); q('.b-time').textContent = ''; return; }
      playIcon(q('.b-play'), h.video);
      const b = bounds(h), cur = h.video.currentTime, span = b.end - b.start;
      const behind = b.end - cur;
      q('.tl').classList.toggle('off', !(span > 1));
      q('.b-live').classList.toggle('at', live && behind <= 15);
      q('.b-fwd').disabled = live ? behind <= 12 : (b.end - cur) < 10;
      if (!dragging && span > 1) {
        const v = Math.max(0, Math.min(1000, (cur - b.start) / span * 1000));
        seek.value = v; seek.style.setProperty('--p', v / 10 + '%');
        q('.tl-t').textContent = live ? (behind > 15 ? '-' + clock(behind) : '') : clock(cur) + ' / ' + clock(b.end);
      }
      q('.b-time').textContent = live ? (behind > 15 ? clock(behind) + ' behind' : '') : (span > 1 ? clock(cur) + ' / ' + clock(b.end) : '');
    }
    setInterval(update, 250); update();
    return { full: q('.b-full'), update };
  }


  // ---------- Watch on TV: AirPlay (Apple) and Chromecast (Chrome) ----------
  const CAST = '<svg viewBox="0 0 24 24"><path d="M2 17.5V20h2.5A2.5 2.5 0 0 0 2 17.5zm0-3.5v2a4 4 0 0 1 4 4h2a6 6 0 0 0-6-6zm0-4v2a8 8 0 0 1 8 8h2A10 10 0 0 0 2 10zm19-7H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>';
  let castCtx = null, castReady = null;
  function loadCast(){
    if (castReady) return castReady;
    castReady = new Promise(ok => {
      // Chromecast only works from Chrome (computers and Android); skip it on iPhones and Safari
      if (!/Chrome|CriOS/.test(navigator.userAgent) || /iPhone|iPad|iPod|CriOS|Edg/.test(navigator.userAgent)) return ok(null);
      window.__onGCastApiAvailable = yes => {
        if (!yes) return ok(null);
        castCtx = cast.framework.CastContext.getInstance();
        castCtx.setOptions({ receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
        ok(castCtx);
      };
      const s = document.createElement('script');
      s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      s.onerror = () => ok(null);
      document.head.appendChild(s);
    });
    return castReady;
  }
  function castSetup(btn, getH, isLiveGame, vc){
    const stage = vc.closest('.stage');
    let airplay = false, chromecast = false, watched = new WeakSet();
    const show = () => { btn.hidden = !(airplay || chromecast); };
    // AirPlay: Safari tells each video when an Apple TV or AirPlay speaker is nearby
    const watchVideo = () => {
      const h = getH(); if (!h || watched.has(h.video) || !window.WebKitPlaybackTargetAvailabilityEvent) return;
      watched.add(h.video);
      h.video.addEventListener('webkitplaybacktargetavailabilitychanged', e => { airplay = e.availability === 'available'; show(); });
      h.video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
        toast(stage, h.video.webkitCurrentPlaybackTargetIsWireless ? 'Playing on your TV' : 'Back on this screen');
      });
    };
    setInterval(watchVideo, 1000); watchVideo();
    // Chromecast
    loadCast().then(ctx => {
      if (!ctx) return;
      const upd = () => { chromecast = ctx.getCastState() !== cast.framework.CastState.NO_DEVICES_AVAILABLE; show(); };
      ctx.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, upd); upd();
      ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, e => {
        if (e.sessionState === cast.framework.SessionState.SESSION_ENDED) { stage.classList.remove('casting'); const h = getH(); if (h) h.video.play().catch(() => {}); }
      });
    });
    btn.onclick = async () => {
      const h = getH(); if (!h) return;
      if (h.video.webkitShowPlaybackTargetPicker && (airplay || !chromecast)) { h.video.webkitShowPlaybackTargetPicker(); return; }
      if (!castCtx) return;
      try {
        await castCtx.requestSession();
        const sess = castCtx.getCurrentSession(); if (!sess) return;
        const info = new chrome.cast.media.MediaInfo(h.src, 'application/x-mpegurl');
        info.hlsSegmentFormat = chrome.cast.media.HlsSegmentFormat.TS;
        if (chrome.cast.media.HlsVideoSegmentFormat) info.hlsVideoSegmentFormat = chrome.cast.media.HlsVideoSegmentFormat.MPEG2_TS;
        const real = realLive(h);
        info.streamType = real ? chrome.cast.media.StreamType.LIVE : chrome.cast.media.StreamType.BUFFERED;
        info.metadata = new chrome.cast.media.GenericMediaMetadata();
        info.metadata.title = document.title.replace(/ · NEC Front Row$/, '');
        info.metadata.subtitle = 'NEC Front Row';
        const req = new chrome.cast.media.LoadRequest(info);
        if (!real) req.currentTime = h.video.currentTime;   // pick up right where you are
        await sess.loadMedia(req);
        h.video.pause(); stage.classList.add('casting');
        toast(stage, 'Playing on ' + (sess.getCastDevice().friendlyName || 'your TV'));
      } catch (e) { if (e !== 'cancel' && !(e && e.code === 'cancel')) toast(stage, "Couldn't reach the TV. Try again."); }
    };
  }

  function toast(stage, text){
    if (!stage) return;
    let t = stage.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); stage.appendChild(t); }
    t.textContent = text; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
  }

  // Start with sound at half volume. Browsers sometimes block sound until the viewer taps
  // something; if so, keep playing silently and report back so the page can show "Tap for sound".
  function trySound(video){
    video.volume = 0.5; video.muted = false;
    return video.play().then(() => true).catch(() => { video.muted = true; video.play().catch(() => {}); return false; });
  }
  // After a block, the viewer's first tap anywhere (other than a control) turns sound on
  function onFirstTap(fn){
    const go = e => { if (e.target.closest('.vc button, .tbar, dialog, .tapsound')) return; document.removeEventListener('pointerdown', go, true); fn(); };
    document.addEventListener('pointerdown', go, true);
  }

  const canPop = () => !!(document.pictureInPictureEnabled || (window.HTMLVideoElement && 'webkitSetPresentationMode' in HTMLVideoElement.prototype));
  async function popOut(video){
    const stage = video.closest('.stage');
    try {
      // leave the page's own full screen first, or the phone won't hand the video over
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return; }
      if (video.webkitSetPresentationMode && video.webkitSupportsPresentationMode && video.webkitSupportsPresentationMode('picture-in-picture')) {
        video.webkitSetPresentationMode(video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture'); return;
      }
      if (video.requestPictureInPicture) { await video.requestPictureInPicture(); return; }
      toast(stage, "Pop out isn't available on this device");
    } catch (e) { toast(stage, "Pop out isn't available here"); }
  }

  // ---------- Score ticker along the bottom, for full screen ----------
  // ticker({ stage, vc, current: () => [ids on screen], onPick: id => {...} })
  const TICK = '<svg viewBox="0 0 24 24"><path d="M2 14h20v6H2zm2 2v2h4v-2zm6 0v2h4v-2zm6 0v2h4v-2zM4 5h16v7H4z" fill-rule="evenodd"/></svg>';
  function ticker({ stage, vc, current = () => [], onPick = () => {} }){
    const KEY = 'fr-ticker-v2';   // on unless the viewer turned it off
    let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
    const btn = document.createElement('button');
    btn.className = 'pb b-tick'; btn.title = 'Score ticker (T)';
    btn.innerHTML = TICK;
    vc.querySelector('.grp.r').prepend(btn);
    const el = document.createElement('div');
    el.className = 'ftk'; el.setAttribute('aria-label', 'NEC scores');
    el.innerHTML = '<div class="lbl">NEC <small>Scores</small></div><div class="view"><div class="belt"></div></div>';
    stage.appendChild(el);
    const belt = el.querySelector('.belt');
    const set = v => {
      on = v; stage.classList.toggle('tick-on', on);
      btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'Hide score ticker' : 'Show score ticker');
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
      dispatchEvent(new Event('resize'));
    };
    btn.onclick = () => set(!on);
    set(on);
    document.addEventListener('keydown', e => {
      if (e.key === 't' && stage.classList.contains('fs') && !e.target.closest('input,textarea')) set(!on);
    });
    const ord = p => ['', '1st', '2nd', '3rd', '4th'][p] || 'OT';
    const st = ev => ev.status === 'live' ? `${ord(ev.period)} ${ev.clock}` : ev.status === 'half' ? 'Half' : ev.status === 'final' ? 'Final'
      : new Date(ev.kickoff).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
    function render(events, changed = new Set()){
      const { esc, sorted, isLive } = FR, here = current();
      const one = (hidden) => sorted(events).map(ev => {
        const pre = ev.status === 'pre', a = ev.score.away, h = ev.score.home;
        const cls = (x, y) => pre || FR.hidden(ev) || x >= y ? 'lead' : 'trail';
        return `<button class="tk${changed.has(ev.id) && !FR.hidden(ev) ? ' flash' : ''}${here.includes(ev.id) ? ' now' : ''}" data-id="${esc(ev.id)}" ${hidden ? 'tabindex="-1"' : ''} title="Watch ${esc(ev.a.name)} at ${esc(ev.h.name)}">
          <span class="sp">${esc(ev.sportKey || '')}</span>
          <span class="tm ${cls(a, h)}"><i style="background:${esc(ev.a.color)}"></i>${esc(ev.a.abbr)}${pre ? '' : ' ' + FR.pts(ev, 'away')}</span>
          <span class="tm ${cls(h, a)}"><i style="background:${esc(ev.h.color)}"></i>${esc(ev.h.abbr)}${pre ? '' : ' ' + FR.pts(ev, 'home')}</span>
          <span class="st${isLive(ev) ? ' live' : ''}">${esc(st(ev))}</span></button>`;
      }).join('');
      // two copies side by side so the belt loops with no gap
      belt.innerHTML = `<div class="set">${one(false)}</div><div class="set" aria-hidden="true">${one(true)}</div>`;
      belt.style.animationDuration = Math.max(20, events.length * 6) + 's';
    }
    belt.addEventListener('click', e => { const b = e.target.closest('.tk'); if (b) onPick(b.dataset.id); });
    let last = [];
    FR.on((events, changed) => { const first = !last.length; last = events; setTimeout(() => render(events, first ? new Set() : changed)); });   // after the page has picked its game(s)
    return { refresh: () => render(last), set };
  }

  return { ticker, trySound, onFirstTap, attach, setMain, destroy, liveEdge, back10, fwd10, goLive, toStart, autoHide, fullscreen, playIcon, popOut, bar, toast, clock, ICONS };
})();
