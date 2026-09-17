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
const KJ_FOLDER = '/Sports/FHS';

// The FHS folder's node id, read off the page's own markup — SmugMug stamps it
// into the body class ("sm-page-node-T8JSWF"). Pinned for the same reason the
// video sync pins its channel id: resolving it by path is the fragile step, and
// !urlpathlookup came back empty on the first live run. If KJ ever rebuilds the
// folder the id changes, so the path lookup is kept as one of the fallbacks
// rather than thrown away.
const KJ_NODE = 'T8JSWF';

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

// Is this album inside the FHS folder? Albums carry their own path, so the
// folder is a filter rather than somewhere we have to navigate to.
const FOLDER_RE = /\/Sports\/FHS(\/|$)/i;
const underFolder = (a) => FOLDER_RE.test(a.UrlPath || '') || FOLDER_RE.test(a.WebUri || '');

// Turn lean !albumlist entries into real albums, one request each. Only needed
// if the account-wide listing cannot be used, and capped so a fallback cannot
// run the function out of time.
async function hydrate(lean, limit = 80) {
  const out = [];
  for (const item of lean.slice(0, limit)) {
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
    await new Promise(r => setTimeout(r, 40));
  }
  return out;
}

/* Several ways into the same folder, tried in turn, with what each one did
   reported — because guessing at this has now cost two runs.

   The account's own !albums listing leads, and the folder is applied as a path
   filter on top. It is the same call the Ball603 side makes, which returned all
   116 albums complete with dates and covers, so it is the shape the rest of this
   file is written against.

   !albumlist is kept below it but no longer trusted on its own: it does reach
   the folder, and it returned all 127 galleries, but as a nav tree — Name, Uri
   and UrlPath, with no date to sort on, no address to link to, no image count
   and no cover. Useful as a list of what exists, which is why the fallback
   hydrates each entry into a real album rather than writing what it was handed.

   An empty result counts as a failure on purpose: a route that answers with
   nothing is indistinguishable from one that does not work. */
async function kjAlbums(report) {
  const routes = [
    [`user!albums under ${KJ_FOLDER}`, async () => {
      const all = await pagedAlbums(`/api/v2/user/${KJ_NICK}!albums`);
      report.scanned = all.length;
      return all.filter(underFolder);
    }],
    ['folder!albumlist then hydrate', async () => {
      const lean = await pagedAlbums(`/api/v2/folder/user/${KJ_NICK}${KJ_FOLDER}!albumlist`);
      report.listed = lean.length;
      return hydrate(lean);
    }],
    ['node!children walk', () => childAlbums(KJ_NODE)],
    ['urlpathlookup then !albumlist', async () => {
      const look = await smugmug(`/api/v2/user/${KJ_NICK}!urlpathlookup?urlpath=${KJ_FOLDER}`);
      const id = look?.Response?.Node?.NodeID;
      if (!id) throw new Error('lookup returned no node');
      return hydrate(await pagedAlbums(`/api/v2/node/${id}!albumlist`));
    }]
  ];

  const tried = [];
  for (const [label, run] of routes) {
    try {
      const albums = await run();
      // Not "did it return albums" but "did it return albums worth showing".
      // The nav-tree route passed the first question and failed the second in
      // silence: 127 galleries with no date and no address is 127 cards that
      // cannot be sorted or clicked.
      const good = albums.filter(a => a.WebUri && (a.Date || a.DateAdded || a.DateModified)).length;
      tried.push({ route: label, albums: albums.length, usable: good });

      if (albums.length && good >= albums.length / 2) {
        report.route = label;
        report.tried = tried;
        // What the first album actually looks like. Endpoints differ in which
        // fields they bother to send, and guessing at that is what cost a run.
        report.sampleFields = Object.keys(albums[0]).sort();
        report.sampleKey = albums[0].AlbumKey || albums[0].Uri || null;
        return albums;
      }
    } catch (err) {
      tried.push({ route: label, error: String(err.message).slice(0, 160) });
    }
  }
  report.tried = tried;
  throw new Error('No route to ' + KJ_FOLDER + ' returned usable albums');
}

// Where HighlightImage came back empty. One call each, so it is capped: the
// albums that miss out get their cover on the next run rather than pushing this
// one past its time limit.
async function fillThumbnails(rows, limit) {
  let filled = 0;
  for (const row of rows) {
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

const toRow = (a, source, sport) => ({
  album_key: albumKeyOf(a),
  source,
  name: a.Name || a.Title || null,
  url: a.WebUri || null,
  image_count: a.ImageCount || 0,
  album_date: a.Date || a.DateAdded || a.DateModified || null,
  sport,
  thumbnail_url: a._thumb || null,
  synced_at: new Date().toISOString()
  // hidden and sort_order are left alone — see the table comment.
});

/* ── The sync ────────────────────────────────────────────────────────────── */

export async function runPhotoSync({ dryRun = false } = {}) {
  if (!API_KEY) {
    return { statusCode: 200, body: { success: false, skipped: true, error: 'SMUGMUG_API_KEY not configured' } };
  }
  if (!SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, body: { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' } };
  }

  const started = Date.now();
  const report = { success: true, dryRun, sources: {}, rows: 0, written: 0, thumbnails: 0, elapsedMs: 0 };
  const rows = [];

  // Each source is tried on its own. A failure on one is reported and the other
  // still writes — losing KJ's galleries should not also lose Ball603's.
  const kjReport = {};
  report.sources.kjcardinal = kjReport;
  try {
    const kj = await kjAlbums(kjReport);
    for (const a of kj) rows.push(toRow(a, 'kjcardinal', sportFromName(a.Name) || sportFromName(a.WebUri)));
    kjReport.albums = kj.length;
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
      withSport: mine.filter(r => r.sport).length
    };
  }

  report.thumbnails = await fillThumbnails(unique, dryRun ? 3 : 60);
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

    // An album KJ deletes or makes private on SmugMug has to leave the table
    // too, or the page keeps a card pointing at a 404. Guarded by having
    // written something, so an outage cannot empty the gallery.
    const keys = unique.map(r => `"${r.album_key}"`).join(',');
    const gone = await supabase(`farmington_albums?album_key=not.in.(${keys})`,
      { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    report.removed = (gone || []).length;
  }

  report.elapsedMs = Date.now() - started;
  console.log('Farmington photos:', JSON.stringify(report));
  return { statusCode: 200, body: report };
}
