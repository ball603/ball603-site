/* Ball603 photo viewer (app.js): a three-slide carousel, so the strip that moves is never wider than three screens and only three photos are ever loaded. The old one-slide-per-photo strip crashed the Facebook in-app browser on iPhone partway through big galleries. */
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT='/root/ball603/ball603-site-main'; const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]);
  const m=u.match(/^\/img\/(\d+)\.svg$/); if(m){ s.writeHead(200,{'Content-Type':'image/svg+xml'}); return s.end(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="683"><rect width="100%" height="100%" fill="hsl(${m[1]*37%360},50%,45%)"/><text x="50%" y="55%" font-size="160" text-anchor="middle" fill="#fff">${m[1]}</text></svg>`); }
  if(u.startsWith('/article/')) u='/article.html';
  const f=path.join(ROOT,u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){ s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); return fs.createReadStream(f).pipe(s); }
  s.writeHead(404); s.end(); }).listen(8981);
const STUB=`(function(){const q={select(){return q},eq(){return q},neq(){return q},order(){return q},limit(){return q},in(){return q},gte(){return q},lte(){return q},or(){return q},is(){return q},single(){return Promise.resolve({data:null,error:null})},maybeSingle(){return Promise.resolve({data:null,error:null})},then(r){return Promise.resolve({data:[],error:null}).then(r)}};window.supabase={createClient:()=>({from:()=>q,auth:{getSession:async()=>({data:{}}),onAuthStateChange(){}},channel(){return{on(){return this},subscribe(){return this}}}})};})();`;
let pass=0,fail=0; const check=(l,c,x='')=>{console.log(`   ${c?'PASS':'FAIL'}  ${l}${x?'  — '+x:''}`);c?pass++:fail++;};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('**/cdn.jsdelivr.net/**supabase**', r=>r.fulfill({contentType:'text/javascript', body:STUB}));
await p.route('**/supabase.co/**', r=>r.fulfill({json:[]}));
await p.goto('http://localhost:8981/article/x'); await p.waitForTimeout(1200);
const open=async(n,start=0)=>{ await p.evaluate(([n,s])=>Ball603.openGallery(Array.from({length:n},(_,i)=>({src:`/img/${i}.svg`,caption:'Photo '+i})),s,'T'),[n,start]); await p.waitForTimeout(400); };
const st=()=>p.evaluate(()=>{ const c=document.getElementById('galleryCarousel'); const sl=[...c.querySelectorAll('.gallery-slide')];
  const r=sl.map(s=>s.getBoundingClientRect()); const onscreen=sl.find(s=>{const b=s.getBoundingClientRect();return Math.abs(b.left)<2});
  return { slides:sl.length, imgs:c.querySelectorAll('img[src]').length, span:Math.round((Math.max(...r.map(x=>x.right))-Math.min(...r.map(x=>x.left)))/innerWidth*100)/100,
    shown: onscreen && +onscreen.dataset.index, count:document.getElementById('galleryCount').textContent, caption:document.getElementById('galleryCaption')?.textContent,
    pos: Object.fromEntries(sl.map(s=>[s.dataset.pos, +s.dataset.index])) }; });
const swipe=async(dx,wait=450)=>{ await p.evaluate((dx)=>{ const o=document.getElementById('galleryOverlay'); const a=dx<0?330:60, z=a+dx; const t=(x)=>new Touch({identifier:1,target:o,clientX:x,clientY:400});
  o.dispatchEvent(new TouchEvent('touchstart',{touches:[t(a)],changedTouches:[t(a)],bubbles:true,cancelable:true}));
  o.dispatchEvent(new TouchEvent('touchmove',{touches:[t(a+dx/2)],changedTouches:[t(a+dx/2)],bubbles:true,cancelable:true}));
  o.dispatchEvent(new TouchEvent('touchmove',{touches:[t(z)],changedTouches:[t(z)],bubbles:true,cancelable:true}));
  o.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[t(z)],bubbles:true,cancelable:true})); },dx); await p.waitForTimeout(wait); };

console.log('\n179-photo gallery');
await open(179);
let s=await st(); check('opens on photo 1, with 179 on the left and 2 on the right', s.shown===0 && s.pos['-1']===178 && s.pos['1']===1 && s.count==='1 / 179', JSON.stringify(s));
check('three slides, three images, strip three screens wide', s.slides===3 && s.imgs===3 && s.span===3, JSON.stringify(s));
for(let i=0;i<25;i++) await swipe(-280);
s=await st(); check('25 swipes forward → photo 26, on screen and counted', s.shown===25 && s.count==='26 / 179' && s.caption==='Photo 25', JSON.stringify(s));
check('still three slides / three images / three screens', s.slides===3 && s.imgs===3 && s.span===3, JSON.stringify(s));

await swipe(280); s=await st(); check('swipe back → photo 25', s.shown===24 && s.count==='25 / 179', JSON.stringify(s));
await swipe(-40); s=await st(); check('a short drag snaps back and stays on 25', s.shown===24 && s.count==='25 / 179', JSON.stringify(s));
for(let i=0;i<4;i++) await swipe(-280, 60);  // fast swipes, before each animation finishes
await p.waitForTimeout(500); s=await st(); check('four quick swipes in a row → photo 29, nothing skipped or stuck', s.shown===28 && s.count==='29 / 179' && s.imgs===3, JSON.stringify(s));
await p.evaluate(()=>Ball603.goToPhoto ? Ball603.goToPhoto(150) : goToPhoto(150)); await p.waitForTimeout(500);
s=await st(); check('jumping to photo 151 (dots)', s.shown===150 && s.pos['-1']===149 && s.pos['1']===151, JSON.stringify(s));
await p.evaluate(()=>Ball603.goToPhoto ? Ball603.goToPhoto(178) : goToPhoto(178)); await p.waitForTimeout(400);
await swipe(-280); s=await st(); check('past the last photo wraps to photo 1', s.shown===0 && s.count==='1 / 179', JSON.stringify(s));
await swipe(280); s=await st(); check('and back again to 179', s.shown===178 && s.count==='179 / 179', JSON.stringify(s));
await p.evaluate(()=>Ball603.nextPhoto()); await p.waitForTimeout(450); s=await st(); check('the → button (nextPhoto) works too', s.shown===0, JSON.stringify(s));
// zoom target is the photo on screen
await p.evaluate(()=>{ const o=document.getElementById('galleryOverlay'); const t=(x)=>new Touch({identifier:1,target:o,clientX:x,clientY:400});
  for (let k=0;k<2;k++) { o.dispatchEvent(new TouchEvent('touchstart',{touches:[t(200)],changedTouches:[t(200)],bubbles:true,cancelable:true}));
    if (k===0) o.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[t(200)],bubbles:true,cancelable:true})); } });
await p.waitForTimeout(300);
const z=await p.evaluate(()=>{ const m=document.querySelector('#galleryCarousel .gallery-slide[data-pos="0"] img'); return m.style.transform; });
check('double-tap zooms the photo on screen', /scale\(2\.5\)/.test(z), z);
await p.evaluate(()=>Ball603._resetZoom && Ball603._resetZoom());
await p.evaluate(()=>Ball603.closeGallery()); s=await p.evaluate(()=>document.querySelectorAll('.gallery-slide').length);
check('closing clears the slides', s===0);

console.log('\nSmall galleries');
await open(2,0); await swipe(-280); s=await st(); check('2 photos: swipe → photo 2', s.shown===1 && s.count==='2 / 2', JSON.stringify(s));
await swipe(-280); s=await st(); check('2 photos: swipe again → photo 1', s.shown===0 && s.count==='1 / 2', JSON.stringify(s));
await p.evaluate(()=>Ball603.closeGallery());
await open(1,0); await swipe(-280); s=await st(); check('1 photo: swiping stays on it', s.count==='1 / 1' && s.shown===0, JSON.stringify(s));
await p.evaluate(()=>Ball603.closeGallery());
await open(179,60); s=await st(); check('opening from a thumbnail mid-gallery (61)', s.shown===60 && s.count==='61 / 179', JSON.stringify(s));

console.log('\nStory page: photo size, Safari button');
{
  // The story's own opener: phones get the 800px "large" photo.
  const pick = await p.evaluate(() => { window.galleryImages = Array.from({length:3},(_,i)=>({large:`/img/${i}.svg?L`, x2large:`/img/${i}.svg?X2`, thumbnail:`/img/${i}.svg?Th`}));
    openGalleryLightbox(0); return document.querySelector('#galleryCarousel .gallery-slide[data-pos="0"] img').getAttribute('src'); });
  check('on a phone the viewer loads the 800px Large photo', /\?L$/.test(pick), pick);
  const btn = await p.evaluate(() => { const b = document.getElementById('gallerySafariBtn'); return { hidden: b.hidden, shown: getComputedStyle(b).display !== 'none' }; });
  check('Safari button hidden in a normal browser', btn.hidden && !btn.shown, JSON.stringify(btn));
  await p.evaluate(()=>Ball603.closeGallery());
}
{
  const fb = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, serviceWorkers:'block',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/FBIOS;FBAV/520.0.0.40.108;FBBV/123;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]' });
  const q = await fb.newPage(); const qerr=[]; q.on('pageerror', e=>qerr.push(e.message));
  await q.route('**/cdn.jsdelivr.net/**supabase**', r=>r.fulfill({contentType:'text/javascript', body:STUB}));
  await q.route('**/supabase.co/**', r=>r.fulfill({json:[]}));
  await q.route('**/.netlify/functions/smugmug*', r=>r.fulfill({json:{ success:true, images: Array.from({length:179},(_,i)=>({large:`/img/${i}.svg`, thumbnail:`/img/${i}.svg`})) }}));
  await q.goto('http://localhost:8981/article/x?photo=42'); await q.waitForTimeout(1200);
  await q.evaluate(() => { if (!document.getElementById('gallerySection')) document.body.insertAdjacentHTML('beforeend','<div id="gallerySection"><a id="smugmugLink"></a><div id="smugmugEmbed"></div></div>'); });
  await q.evaluate(() => loadGalleryPhotos({ smugmug_gallery_url: 'https://ball603.smugmug.com/Volleyball/2026/Test' })); await q.waitForTimeout(800);
  const r = await q.evaluate(() => ({ open: document.getElementById('galleryOverlay').classList.contains('active'), count: document.getElementById('galleryCount').textContent,
    btn: getComputedStyle(document.getElementById('gallerySafariBtn')).display !== 'none' }));
  check('arriving with ?photo=42 reopens the gallery at photo 42', r.open && r.count === '42 / 179', JSON.stringify(r));
  check('inside the Facebook app on iPhone the Safari button shows', r.btn);
  let went = null;
  await q.evaluate(() => { for (let i=0;i<3;i++) Ball603.nextPhoto(); });
  await q.waitForTimeout(400);
  q.on('request', req => { if (!went) went = req.url(); });
  const href = await q.evaluate(() => gallerySafariUrl());
  check('the Safari link keeps the photo the reader is on (45)', /^x-safari-http:\/\/localhost:8981\/article\/x\?photo=45$/.test(href), href);
  check('no errors in the Facebook-app page', qerr.length === 0, qerr.join('; '));
  await fb.close();
}
check('no page errors', errs.length===0, errs.join('; '));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
