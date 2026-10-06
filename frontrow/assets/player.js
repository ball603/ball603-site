/* NEC Front Row — video player helpers shared by the Game page and Multiview. Needs hls.js loaded first. */
window.FRPlayer = (() => {
  // Hudl blocks the first playlist file for outside websites, so those go through our site's helper.
  function streamUrl(url){
    const m = String(url).match(/^https?:\/\/vcloud\.hudl\.com\/file\/hls\/(\d+)\.m3u8/i);
    return m ? '/.netlify/functions/hudl-playlist?id=' + m[1] : url;
  }

  // Attach a stream to a <video>. "main" plays at full quality; others drop to the lowest to save data.
  function attach(video, url, { main = true, onError } = {}){
    const src = streamUrl(url);
    const h = { video, hls:null, main };
    video.playsInline = true; video.muted = true; video.autoplay = true;
    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize:true, backBufferLength:900, maxBufferLength:30 });
      hls.loadSource(src); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setMain(h, h.main); video.play().catch(()=>{}); });
      hls.on(Hls.Events.ERROR, (e, d) => { if (d.fatal) onError && onError(d); });
      h.hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src; video.addEventListener('error', () => onError && onError(), { once:true });
      video.play().catch(()=>{});
    } else onError && onError();
    return h;
  }
  function setMain(h, main){ h.main = main; if (h.hls) h.hls.autoLevelCapping = main ? -1 : 0; }
  function destroy(h){ if (!h) return; if (h.hls) h.hls.destroy(); h.video.removeAttribute('src'); h.video.load(); }

  function liveEdge(h){
    if (h.hls && h.hls.liveSyncPosition) return h.hls.liveSyncPosition;
    const s = h.video.seekable; return s.length ? s.end(s.length - 1) : h.video.duration;
  }
  const back10 = h => { h.video.currentTime = Math.max(0, h.video.currentTime - 10); };
  const goLive = h => { const e = liveEdge(h); if (isFinite(e)) h.video.currentTime = Math.max(0, e - 3); h.video.play().catch(()=>{}); };
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
      else if (!sideways.matches && auto) { auto = false; setFake(false); }
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

  async function popOut(video){
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else if (video.webkitSetPresentationMode) video.webkitSetPresentationMode('picture-in-picture');
    } catch (e) {}
  }

  return { attach, setMain, destroy, liveEdge, back10, goLive, toStart, autoHide, fullscreen, playIcon, popOut, ICONS };
})();
