// Pull the Tigers' photo galleries out of SmugMug into Supabase.
//
// Two accounts, one table:
//
//   * kjcardinal — everything under /Sports/FHS. The folder IS the filter, so
//     no name matching is needed and nothing gets missed because an album was
//     titled unusually.
//   * ball603 — only albums that name Farmington. Ball603 shoots the whole
//     state, so this is the one place a name match is unavoidable.
//
// The sport is worked out differently for each, which is the whole reason this
// is not one loop: KJ titles his albums with the sport in them, Ball603 titles
// its albums "Trinity at Farmington (09.09.26)" and keeps the sport in the
// folder path instead.
//
// Credentials: the existing SMUGMUG_* variables, which are Ball603's. A
// SmugMug API key identifies the application, not the library, so the same
// credentials read any public gallery — including KJ's. If his FHS folder is
// not public the kjcardinal half fails on its own and says so in the report
// while the Ball603 half still writes; it is not an all-or-nothing sync.
//
// Not a function of its own — sync-farmington calls it, so galleries refresh on
// the same five-a-day schedule as games, standings and videos, with no extra
// cron and no unauthenticated URL that writes.

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const API_KEY = process.env.SMUGMUG_API_KEY;
const API_SECRET = process.env.SMUGMUG_API_SECRET;
const ACCESS_TOKEN = process.env.SMUGMUG_ACCESS_TOKEN;
const ACCESS_SECRET = process.env.SMUGMUG_ACCESS_SECRET;

const BASE = 'https://api.smugmug.com';
const KJ_NICK = 'kjcardinal';

/* KJ shoots the high school and the middle school into two sibling folders, so
   the Tigers site has to read both or the Jr. High teams have pages with no
   pictures on them — which is what happened when Jr. High football went up.
   HWMS is Henry Wilson Memorial School; its albums are titled the same way FHS
   albums are ("2025 HWMS Baseball Photos"), so sportFromName reads them with
   no change.

   The node ids are read off each folder's own page markup — SmugMug stamps one
   into the body class ("sm-page-node-T8JSWF"). Pinned for the same reason the
   video sync pins its channel id: resolving a folder by path is the fragile
   step, and !urlpathlookup came back empty on the first live run. If KJ ever
   rebuilds a folder its id changes, so the path lookup is kept as a fallback
   rather than thrown away.

   Both write source 'kjcardinal'. That matters: pruning deletes rows for a
   source whose album_key was not in this run's listing, so the two folders
   have to be scanned together or each would prune the other's galleries away
   on every run. */
const KJ_FOLDERS = [
  { path: '/Sports/FHS',  node: 'T8JSWF' },   // Farmington High School
  { path: '/Sports/HWMS', node: 'jCFdbb' }    // Henry Wilson Memorial (Jr. High)
];

// Kept for the fallbacks below, which still speak in a single folder.
const KJ_FOLDER = KJ_FOLDERS[0].path;
const KJ_NODE = KJ_FOLDERS[0].node;

/* ── OAuth 1.0a ──────────────────────────────────────────────────────────── */
/* Same signing sync-smugmug.mjs uses. Copied rather than shared because those
   functions work and are not worth destabilising for a de-duplication. */

const percentEncode = (str) => encodeURIComponent(str)
  .replace(/!/g, '%21').replace(/\*/g, '%2A').replace(/'/g, '%27')
  .replace(/\(/g, '%28').replace(/\)/g, '%29');

function sign(method, url, params, consumerSecret, tokenSecret = '') {
  const sorted = Object.keys(params).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const base = [method.toUpperCase(), percentEncode(url), percentEncode(sorted)].join('&');
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function authHeader(method, url, queryParams) {
  const oauth = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  oauth.oauth_signature = sign(method, url, { ...oauth, ...queryParams }, API_SECRET, ACCESS_SECRET);
  return 'OAuth ' + Object.keys(oauth).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauth[k])}"`).join(', ');
}

async function smugmug(endpoint) {
  const [path, qs] = endpoint.split('?');
  const queryParams = {};
  if (qs) for (const pair of qs.split('&')) {
    const i = pair.indexOf('=');
    if (i > 0) queryParams[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
  }

  const url = BASE + path;
  const headers = { Accept: 'application/json' };
  let full = BASE + endpoint;

  if (ACCESS_TOKEN && ACCESS_SECRET) {
    headers.Authorization = authHeader('GET', url, queryParams);
  } else {
    full += (full.includes('?') ? '&' : '?') + 'APIKey=' + encodeURIComponent(API_KEY);
  }

  const res = await fetch(full, { headers });
  if (!res.ok) throw new Error(`SmugMug ${res.status} on ${path}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Range: '0-4999',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ── Which sport is this ─────────────────────────────────────────────────── */

// Ball603 files an album under the sport's folder, so the first path segment
// answers it outright.
const FOLDER_SPORT = {
  volleyball: 'Volleyball', basketball: 'Basketball', baseball: 'Baseball',
  softball: 'Softball', football: 'Football', soccer: 'Soccer', golf: 'Golf',
  'cross-country': 'Cross Country', crosscountry: 'Cross Country'
};

// KJ puts it in the title instead. Order matters: "basketball" and "baseball"
// both contain "ball", and softball has to be tested before football or a
// "Softball" album would never match at all.
const NAME_SPORT = [
  [/volleyball/i, 'Volleyball'],
  [/basketball/i, 'Basketball'],
  [/softball/i, 'Softball'],
  [/baseball/i, 'Baseball'],
  [/football/i, 'Football'],
  [/soccer/i, 'Soccer'],
  [/golf/i, 'Golf'],
  [/cross[\s-]?country|\bxc\b/i, 'Cross Country']
];

// Exported so the tests can hold them to the real album names both accounts
// actually use, without standing up a fake SmugMug.
export const sportFromName = (text) => {
  for (const [re, name] of NAME_SPORT) if (re.test(text || '')) return name;
  return null;
};

export function sportFromUrl(url) {
  const path = String(url || '').replace(/^https?:\/\/[^/]+\//, '');
  const first = decodeURIComponent(path.split('/')[0] || '').toLowerCase();
  return FOLDER_SPORT[first] || null;
}

/* ── Fetching ────────────────────────────────────────────────────────────── */

// SmugMug pages albums 100 at a time. _expand=HighlightImage brings each
// album's cover back in the same response, which is the difference between one
// call per page and one call per album — around 220 requests on a first run.
async function albumsForUser(nickname) {
  const out = [];
  let start = 1;
  for (;;) {
    const page = await smugmug(
      `/api/v2/user/${encodeURIComponent(nickname)}!albums` +
      `?count=100&start=${start}&SortDirection=Descending&SortMethod=LastUpdated` +
      `&_expand=HighlightImage`);
    const albums = page?.Response?.Album || [];
    const expansions = page?.Expansions || {};
    for (const a of albums) {
      const uri = a.Uris?.HighlightImage?.Uri || a.Uris?.HighlightImage;
      const hi = uri && expansions[uri];
      a._thumb = hi?.HighlightImage?.ThumbnailUrl || hi?.Image?.ThumbnailUrl || null;
      out.push(a);
    }
    if (albums.length < 100) break;
    start += albums.length;
    if (start > 3000) break;               // a runaway guard, not a real limit
    await new Promise(r => setTimeout(r, 80));
  }
  return out;
}

// One page of whatever an endpoint calls its albums. SmugMug returns them
// under AlbumList for !albumlist and Album for !albums, and the caller does not
// care which.
async function pagedAlbums(endpoint) {
  const out = [];
  let start = 1;
  for (;;) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const page = await smugmug(
      `${endpoint}${sep}count=100&start=${start}&_expand=HighlightImage`);
    const albums = page?.Response?.AlbumList || page?.Response?.Album || [];
    const expansions = page?.Expansions || {};
    for (const a of albums) {
      const uri = a.Uris?.HighlightImage?.Uri || a.Uris?.HighlightImage;
      const hi = uri && expansions[uri];
      a._thumb = hi?.HighlightImage?.ThumbnailUrl || hi?.Image?.ThumbnailUrl || null;
      out.push(a);
    }
    if (albums.length < 100) break;
    start += albums.length;
    if (start > 3000) break;              // a runaway guard, not a real limit
    await new Promise(r => setTimeout(r, 80));
  }
  return out;
}

// The long way round: walk the folder's children, descend into sub-folders and
// collect the albums. Only used if none of the album endpoints answer.
async function childAlbums(nodeId, depth = 0) {
  if (depth > 3) return [];
  const out = [];
  let start = 1;
  for (;;) {
    const page = await smugmug(
      `/api/v2/node/${encodeURIComponent(nodeId)}!children` +
      `?count=100&start=${start}&_expand=Album,HighlightImage`);
    const nodes = page?.Response?.Node || [];
    const expansions = page?.Expansions || {};
    for (const n of nodes) {
      if (n.Type === 'Folder') {
        out.push(...await childAlbums(n.NodeID, depth + 1));
        continue;
      }
      if (n.Type !== 'Album') continue;
      const albumUri = n.Uris?.Album?.Uri || n.Uris?.Album;
      const album = (albumUri && expansions[albumUri]?.Album) || null;
      if (!album) continue;
      const hiUri = album.Uris?.HighlightImage?.Uri || album.Uris?.HighlightImage;
      const hi = hiUri && expansions[hiUri];
      album._thumb = hi?.HighlightImage?.ThumbnailUrl || hi?.Image?.ThumbnailUrl || null;
      out.push(album);
    }
    if (nodes.length < 100) break;
    start += nodes.length;
    if (start > 3000) break;
    await new Promise(r => setTimeout(r, 80));
  }
  return out;
}

// Is this album inside one of KJ's Farmington folders? Albums carry their own
// path, so the folder is a filter rather than somewhere we have to navigate to.
const FOLDER_RE = /\/Sports\/(FHS|HWMS)(\/|$)/i;
const underFolder = (a) => FOLDER_RE.test(a.UrlPath || '') || FOLDER_RE.test(a.WebUri || '');

// Turn lean !albumlist entries into real albums, one request each. Bounded by
// the clock rather than a count: how long a SmugMug request takes is not ours
// to decide, and this runs inside the games sync's time budget, not its own.
// Whatever does not fit is left for the next run, which is why the caller only
// ever passes it galleries it does not already hold.
async function hydrate(lean, deadline) {
  const out = [];
  let ranOut = false;
  for (const item of lean) {
    if (Date.now() > deadline) { ranOut = true; break; }
    try {
      const r = await smugmug(`${item.Uri}?_expand=HighlightImage`);
      const album = r?.Response?.Album;
      if (!album) continue;
      const hiUri = album.Uris?.HighlightImage?.Uri || album.Uris?.HighlightImage;
      const hi = hiUri && r?.Expansions?.[hiUri];
      album._thumb = hi?.HighlightImage?.ThumbnailUrl || hi?.Image?.ThumbnailUrl || item._thumb || null;
      out.push(album);
    } catch (err) {
      console.warn(`Hydrating ${item.Uri} failed:`, err.message);
    }
  }
  out._ranOut = ranOut;
  return out;
}

/* KJ's side of the sync, in two steps and deliberately not one.

   !albumlist is the only endpoint that reaches the FHS folder, and it is cheap:
   two requests for all 127 galleries. But it answers with a nav tree — Name,
   Uri and UrlPath, no date to sort on, no address to link to, no cover — so
   each entry still has to be fetched to become an album.

   Fetching all 127 every run is what broke it: scanning the whole account was
   worse still, and the job stopped returning at all. So the listing is read
   fresh every time, and only galleries we do not already hold are fetched —
   steady state is two requests, and the first few runs work through the backlog
   a bounded chunk at a time.

   `have` is the rows already in Supabase. Reusing them is not a cache in the
   dangerous sense: SmugMug album keys are stable, so a row we hold is the same
   gallery, and the folder listing is still what decides which galleries exist
   at all — one that disappears is still pruned. */
async function kjAlbums(report, have, deadline) {
  /* Both folders, listed in one pass. Each is tried on its own so a folder
     that is renamed, emptied or made private costs only its own galleries —
     the other still syncs, and the report names which one failed. That is the
     same reasoning as the two accounts above: partial is better than nothing.

     Only a run where EVERY folder failed throws. It has to: returning an empty
     list would look to the pruner like KJ deleted his entire library, and it
     would obediently wipe every kjcardinal row. */
  const lean = [];
  const seen = new Set();
  report.folders = {};
  let ok = 0;

  for (const folder of KJ_FOLDERS) {
    try {
      const part = await pagedAlbums(
        `/api/v2/folder/user/${KJ_NICK}${folder.path}!albumlist`);
      // A gallery filed under both folders would otherwise be hydrated twice.
      let added = 0;
      for (const item of part) {
        const key = albumKeyOf(item) || item.Uri;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        lean.push(item);
        added++;
      }
      report.folders[folder.path] = added;
      ok++;
    } catch (err) {
      report.folders[folder.path] = { error: err.message };
      console.warn(`Listing ${folder.path} failed:`, err.message);
    }
  }

  report.listed = lean.length;
  if (!ok) throw new Error(`Could not list any of ${KJ_FOLDERS.map(f => f.path).join(', ')}`);
  if (!lean.length) throw new Error(`No galleries listed under ${KJ_FOLDERS.map(f => f.path).join(', ')}`);

  const known = [], missing = [];
  for (const item of lean) {
    const key = albumKeyOf(item);
    const row = key && have.get(key);
    // A row we hold but that never got a date or a link is not done yet.
    if (row && row.url && row.album_date) known.push(row); else missing.push(item);
  }

  const fetched = await hydrate(missing, deadline);
  report.reused = known.length;
  report.fetched = fetched.length;
  report.pending = missing.length - fetched.length;
  if (fetched._ranOut) report.note = 'Ran out of time; the rest arrive on the next run';
  if (fetched.length) {
    report.sampleFields = Object.keys(fetched[0]).sort();
  }

  return { known, fetched };
}

// Where HighlightImage came back empty. One call each, so it runs on the clock
// as well as a count: the albums that miss out get their cover on the next run
// rather than pushing this one past its time limit.
async function fillThumbnails(rows, limit, deadline) {
  let filled = 0;
  for (const row of rows) {
    if (Date.now() > deadline) break;
    if (row.thumbnail_url || filled >= limit) continue;
    try {
      const r = await smugmug(`/api/v2/album/${encodeURIComponent(row.album_key)}!images?count=1&_expand=ImageSizes`);
      const img = (r?.Response?.AlbumImage || [])[0];
      const sizes = img?.Uris?.ImageSizes?.ImageSizes || {};
      row.thumbnail_url = sizes.SmallImageUrl || sizes.MediumImageUrl || sizes.ThumbImageUrl ||
                          img?.ThumbnailUrl || null;
      filled++;
    } catch (err) {
      console.warn(`Thumbnail for ${row.album_key} failed:`, err.message);
    }
  }
  return filled;
}

/* !albums hands back an AlbumKey on every album. !albumlist — which is the
   endpoint that actually reaches KJ's folder — does not, and an album with no
   key took every other keyless album's place in the map below: 127 galleries
   arrived and 1 row came out. The key is recoverable from the Uri either way,
   and a gallery with no usable key at all is skipped rather than merged. */
export function albumKeyOf(a) {
  if (a.AlbumKey) return a.AlbumKey;
  const uri = a.Uri || a.Uris?.Album?.Uri || a.Uris?.Album || '';
  const m = String(uri).match(/\/api\/v2\/album\/([A-Za-z0-9-]+)/);
  if (m) return m[1];
  // The gallery's own address is unique too. Not ideal — renaming a gallery
  // changes it, so the old row is pruned and a new one written — but it keeps
  // a gallery on the page rather than dropping it.
  const web = String(a.WebUri || '').trim();
  return web ? 'web:' + web.replace(/^https?:\/\//, '') : null;
}

/* When a gallery happened.

   KJ ends every album name with the date of the game — "FHS Golf at
   Androscoggin Valley CC Sept 8 2026" — and that is the date a reader means by
   "most recent". SmugMug's own timestamps are about the file, not the fixture:
   re-processing a 2025 gallery today would jump it to the top of a page whose
   entire premise is newest-first.

   So the name is read first, and SmugMug's timestamps are the fallback. Note
   which fields those are: a fetched album carries LastUpdated and
   ImagesLastUpdated and no Date at all, which is why all 127 of KJ's galleries
   came back dateless the first time this ran. */
const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8,
                 sept:8, oct:9, nov:10, dec:11 };

export function dateFromName(name) {
  if (!name) return null;
  // "Sept 8 2026", "Sept-8-2026", "Feb 24, 2026" — month, day, four-digit year.
  const m = String(name).match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*[\s.\-]+(\d{1,2})(?:st|nd|rd|th)?[\s,\-]+(\d{4})\b/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month == null || !(day >= 1 && day <= 31) || !(year >= 2000 && year <= 2100)) return null;
  // Midday UTC, so the calendar date survives any timezone the page renders in.
  return new Date(Date.UTC(year, month, day, 12)).toISOString();
}

/* SmugMug's HighlightImage gives back the "Th" size: 150px square. The cards
   are 300px wide and 3:2, so Th is both too small and the wrong shape — M is
   600px on the long edge and keeps the photo's proportions. The size appears
   twice in a SmugMug URL, once as a path segment and once as the filename
   suffix, and both have to change:

     .../i-mbm3BtL/0/<hash>/Th/DSC02247-Th.jpg
     .../i-mbm3BtL/0/<hash>/M/DSC02247-M.jpg   */
const THUMB_SIZE = 'M';
export function upgradeThumb(url) {
  if (!url) return null;
  return String(url)
    .replace(/\/Th\//, `/${THUMB_SIZE}/`)
    .replace(/-Th\.(jpg|jpeg|png)(\?.*)?$/i, `-${THUMB_SIZE}.$1$2`);
}

/* Every object in one bulk insert must carry exactly the same keys, or
   PostgREST refuses the lot with PGRST102 and does not say which one is the odd
   one out. Galleries we already hold come back from Supabase with `hidden` and
   `sort_order` on them; freshly fetched ones do not — so the first run wrote
   fine and the second failed. Both paths go through here now.

   `hidden` and `sort_order` are deliberately absent: they are curation, and an
   upsert only touches the columns it is given, so leaving them out is what
   keeps them safe. */
function shape(o) {
  return {
    album_key: o.album_key ?? null,
    source: o.source ?? null,
    name: o.name ?? null,
    url: o.url ?? null,
    image_count: o.image_count ?? 0,
    album_date: o.album_date ?? null,
    sport: o.sport ?? null,
    thumbnail_url: upgradeThumb(o.thumbnail_url),
    synced_at: new Date().toISOString()
  };
}
export const reuse = (row) => shape(row);

const toRow = (a, source, sport) => shape({
  album_key: albumKeyOf(a),
  source,
  name: a.Name || a.Title || null,
  url: a.WebUri || null,
  image_count: a.ImageCount || 0,
  album_date: dateFromName(a.Name) ||
              a.Date || a.DateAdded || a.DateModified ||
              a.ImagesLastUpdated || a.LastUpdated || null,
  sport,
  thumbnail_url: a._thumb || null,
  synced_at: new Date().toISOString()
  // hidden and sort_order are left alone — see the table comment.
});

/* ── The sync ────────────────────────────────────────────────────────────── */

/* budgetMs is a promise about how long this will take, not a guess. It runs
   inside the games sync, which already spends twenty seconds of its own, and
   the whole job has to come back before Netlify gives up on it — which it did
   not, the once, when this went and read an entire SmugMug account. */
export async function runPhotoSync({ dryRun = false, budgetMs = 14000 } = {}) {
  if (!API_KEY) {
    return { statusCode: 200, body: { success: false, skipped: true, error: 'SMUGMUG_API_KEY not configured' } };
  }
  if (!SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, body: { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' } };
  }

  const started = Date.now();
  const deadline = started + budgetMs;
  const report = { success: true, dryRun, budgetMs, sources: {}, rows: 0, written: 0, thumbnails: 0, elapsedMs: 0 };
  const rows = [];

  // What we already hold. Galleries in here cost nothing to keep — the folder
  // listing still decides which ones exist, so this only saves the fetching.
  let have = new Map();
  try {
    const existing = await supabase('farmington_albums?select=*');
    have = new Map((existing || []).map(r => [r.album_key, r]));
    report.alreadyHeld = have.size;
  } catch (err) {
    console.warn('Could not read existing galleries:', err.message);
  }

  // Each source is tried on its own. A failure on one is reported and the other
  // still writes — losing KJ's galleries should not also lose Ball603's.
  const kjReport = {};
  report.sources.kjcardinal = kjReport;
  try {
    // Two thirds of the budget to KJ's side, because it is the one that fetches
    // per gallery. Ball603's is a flat scan whose cost we do not control.
    const { known, fetched } = await kjAlbums(kjReport, have, started + budgetMs * 0.66);
    for (const r of known) rows.push(reuse(r));
    for (const a of fetched) {
      rows.push(toRow(a, 'kjcardinal', sportFromName(a.Name) || sportFromName(a.WebUri)));
    }
    kjReport.albums = known.length + fetched.length;
  } catch (err) {
    console.error('kjcardinal galleries failed:', err.message);
    kjReport.error = err.message;
  }

  try {
    const all = await albumsForUser('ball603');
    const mine = all.filter(a => /farmington/i.test(`${a.Name || ''} ${a.WebUri || ''}`));
    for (const a of mine) {
      rows.push(toRow(a, 'ball603', sportFromUrl(a.WebUri) || sportFromName(a.Name)));
    }
    report.sources.ball603 = { scanned: all.length, farmington: mine.length };
  } catch (err) {
    console.error('ball603 galleries failed:', err.message);
    report.sources.ball603 = { error: err.message };
  }

  // Both sources down is an outage, not an empty season. Writing nothing is
  // right, but so is not reporting success.
  if (!rows.length) {
    report.success = false;
    report.note = 'No galleries came back from either account — nothing written';
    report.elapsedMs = Date.now() - started;
    console.log('Farmington photos:', JSON.stringify(report));
    return { statusCode: 200, body: report };
  }

  // A gallery we cannot key is dropped, not merged. Silently collapsing them
  // is exactly the bug this guards against.
  const keyless = rows.filter(r => !r.album_key);
  if (keyless.length) {
    report.skippedNoKey = keyless.length;
    report.skippedSample = keyless.slice(0, 3).map(r => r.name || r.url);
  }

  // The same album can only be in the table once, and KJ's copy wins: it is his
  // gallery of his school, and Ball603's is the syndicated one.
  const byKey = new Map();
  for (const r of rows) {
    if (!r.album_key) continue;
    const had = byKey.get(r.album_key);
    if (!had || (had.source === 'ball603' && r.source === 'kjcardinal')) byKey.set(r.album_key, r);
  }
  const unique = [...byKey.values()];
  report.rows = unique.length;
  report.withoutSport = unique.filter(r => !r.sport).length;

  // Per source, so a route that returns albums but no covers — or no keys — is
  // visible rather than averaged away against the other account's 116 good ones.
  report.bySource = {};
  for (const src of ['kjcardinal', 'ball603']) {
    const mine = unique.filter(r => r.source === src);
    report.bySource[src] = {
      rows: mine.length,
      withLink: mine.filter(r => r.url).length,
      withDate: mine.filter(r => r.album_date).length,
      withCover: mine.filter(r => r.thumbnail_url).length,
      withSport: mine.filter(r => r.sport).length,
      datedFromName: mine.filter(r => r.name && dateFromName(r.name)).length
    };
  }

  // Covers, for anything the bulk fetch did not supply, with whatever is left
  // of the budget. Ball603's side gets them all for free, so this is KJ's.
  report.thumbnails = await fillThumbnails(unique, dryRun ? 3 : 200, deadline);
  report.stillNoThumbnail = unique.filter(r => !r.thumbnail_url).length;

  if (!dryRun) {
    for (let i = 0; i < unique.length; i += 50) {
      await supabase('farmington_albums?on_conflict=album_key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(unique.slice(i, i + 50))
      });
    }
    report.written = unique.length;

    /* A gallery deleted or made private on SmugMug has to leave the table, or
       the page keeps a card pointing at a 404. Three conditions before anything
       is deleted, because this is the one irreversible thing the sync does:

         * one account at a time, so a SmugMug outage on KJ's side cannot take
           Ball603's 116 galleries with it;
         * never for an account that errored, for the same reason;
         * and never for an account that did not finish. KJ's side works through
           a backlog over several runs, and the galleries it has not reached yet
           are absent from this run's rows without being gone from SmugMug. */
    report.removed = 0;
    for (const src of ['kjcardinal', 'ball603']) {
      const mine = unique.filter(r => r.source === src);
      const src_ = report.sources[src] || {};
      if (src_.error || !mine.length) { report.prune ??= {}; report.prune[src] = 'skipped'; continue; }
      if (src === 'kjcardinal' && kjReport.pending) { report.prune ??= {}; report.prune[src] = 'incomplete'; continue; }

      const keys = mine.map(r => `"${r.album_key}"`).join(',');
      const gone = await supabase(
        `farmington_albums?source=eq.${src}&album_key=not.in.(${keys})`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      report.removed += (gone || []).length;
    }
  }

  report.elapsedMs = Date.now() - started;
  console.log('Farmington photos:', JSON.stringify(report));
  return { statusCode: 200, body: report };
}
