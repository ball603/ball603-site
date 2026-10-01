// Create a game gallery on SmugMug and hand back a guest-upload link.
//
// The photographer never logs into SmugMug. They click UPLOAD in their
// schedule; this creates (or re-finds) their gallery, switches guest
// uploading on, and returns a link that drops them straight into a
// drag-and-drop page.
//
// Credentials are the SMUGMUG_PORTAL_* set, NOT the older SMUGMUG_* ones.
// The old pair is read-only and feeds sync-smugmug / sync-farmington-photos;
// keeping them apart means a problem here cannot disturb the photo syncs.
//
// Gallery names follow KJ's convention exactly:
//   Plymouth at Oyster River (09.02.26) - Michael Griffin
//   Bishop Guertin vs. Pinkerton (03.14.26) - Michael Griffin   <- neutral site
// and live in  <Sport> / <Season>  e.g. Volleyball/2026, Basketball/2025-26.

import crypto from 'crypto';
import { verifySupabaseUser, authHeaders, isOptions } from './lib/auth.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const API_KEY      = process.env.SMUGMUG_PORTAL_KEY;
const API_SECRET   = process.env.SMUGMUG_PORTAL_SECRET;
const ACCESS_TOKEN = process.env.SMUGMUG_PORTAL_TOKEN;
const ACCESS_SECRET= process.env.SMUGMUG_PORTAL_TOKEN_SECRET;

const API_ORIGIN = 'https://api.smugmug.com';

// Galleries only exist for games from this date on. Anything older was
// uploaded by hand under a different name, and re-creating those would
// leave KJ with a pile of empty duplicates.
const FIRST_GAME_DATE = '2026-10-01';

// Sports whose season straddles New Year's get a "2025-26" folder.
// Everything else gets the plain calendar year.
const WINTER_SPORTS = new Set([
  'basketball', 'ice hockey', 'hockey', 'wrestling', 'indoor track',
  'alpine skiing', 'nordic skiing', 'skiing', 'gymnastics', 'spirit',
  'competitive cheer', 'swimming', 'swimming and diving', 'bowling', 'unified basketball'
]);

/* ------------------------------------------------------------------ *
 * Supabase
 * ------------------------------------------------------------------ */

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return data;
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });

const gid = (v) => encodeURIComponent(String(v));

/* ------------------------------------------------------------------ *
 * SmugMug request signing
 *
 * The signature covers the method, the URL and the query string only.
 * A JSON body is deliberately NOT part of it, which is why POST and
 * PATCH sign exactly like GET here.
 * ------------------------------------------------------------------ */

function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21').replace(/\*/g, '%2A')
    .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function signature(method, url, params, consumerSecret, tokenSecret = '') {
  const canonical = Object.keys(params).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const base = [method.toUpperCase(), percentEncode(url), percentEncode(canonical)].join('&');
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function authorizationHeader(method, url, queryParams = {}) {
  const oauth = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0'
  };
  oauth.oauth_signature = signature(
    method, url, { ...oauth, ...queryParams }, API_SECRET, ACCESS_SECRET
  );
  return 'OAuth ' + Object.keys(oauth).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauth[k])}"`).join(', ');
}

async function smug(method, endpoint, body = null) {
  const [path, queryString] = endpoint.split('?');
  const url = `${API_ORIGIN}${path}`;

  const queryParams = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [k, v] = pair.split('=');
      if (k && v !== undefined) queryParams[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  const res = await fetch(`${API_ORIGIN}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authorizationHeader(method, url, queryParams)
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const detail = data?.Message || data?.Response?.Message || text?.slice(0, 200);
    const err = new Error(`SmugMug ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ------------------------------------------------------------------ *
 * Naming
 * ------------------------------------------------------------------ */

// Mirrors the playoff display rule in contributor-schedule.js. Both copies
// have to agree or the gallery name will not match what the photographer
// saw on their schedule. Semis and finals are at neutral sites; in the
// earlier rounds the higher seed (lower number) hosts.
export function displayTeams(game) {
  let away = game.away;
  let home = game.home;
  let neutral = false;

  if (game.is_playoff) {
    const round = String(game.round || '').trim();
    if (round === 'Semis' || round === 'Final') {
      neutral = true;
    } else if ((round === 'Prelims' || round === 'Quarters') && game.home_seed && game.away_seed) {
      const h = parseInt(game.home_seed, 10);
      const a = parseInt(game.away_seed, 10);
      if (Number.isFinite(h) && Number.isFinite(a) && a < h) {
        away = game.home;
        home = game.away;
      }
    }
  }
  return { away, home, neutral };
}

// 2026-09-02 -> 09.02.26
export function shortDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  if (!m) return '';
  return `${m[2]}.${m[3]}.${m[1].slice(2)}`;
}

// Volleyball in Sept 2026 -> "2026".  Basketball in Jan 2026 -> "2025-26".
// The games table already carries a season ("2026", "2025-26") and it is what
// KJ's existing SmugMug folders are named after, so it wins. The computed
// version below is only for a row where that column is empty.
export function seasonFolder(sport, isoDate, storedSeason) {
  const stored = String(storedSeason || '').trim();
  if (/^\d{4}(-\d{2})?$/.test(stored)) return stored;
  return computedSeason(sport, isoDate);
}

export function computedSeason(sport, isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  if (!m) return '';
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);

  if (!WINTER_SPORTS.has(String(sport || '').trim().toLowerCase())) {
    return String(year);
  }
  // A winter season starting in, say, Nov 2025 runs into Mar 2026. Games
  // from August on belong to the season that starts that year; games before
  // August belong to the season that started the year before.
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

// The sport column is not a plain sport name. Volleyball is stored as
// "gvolleyball" (g for girls) while basketball keeps the gender in its own
// column - so there is no rule to derive, only a list. Boys and girls share
// one folder, the way Basketball already does on SmugMug.
//
// ADD NEW SPORTS HERE. An unlisted sport still works, but it gets a folder
// named after the raw value, which is how "Gvolleyball" came to exist.
const SPORT_FOLDERS = {
  baseball:     'Baseball',
  softball:     'Softball',
  basketball:   'Basketball',
  gbasketball:  'Basketball',
  bbasketball:  'Basketball',
  volleyball:   'Volleyball',
  gvolleyball:  'Volleyball',
  bvolleyball:  'Volleyball',
  soccer:       'Soccer',
  gsoccer:      'Soccer',
  bsoccer:      'Soccer',
  football:     'Football',
  hockey:       'Hockey',
  ghockey:      'Hockey',
  bhockey:      'Hockey',
  'ice hockey': 'Hockey',
  lacrosse:     'Lacrosse',
  glacrosse:    'Lacrosse',
  blacrosse:    'Lacrosse',
  fieldhockey:  'Field Hockey',
  'field hockey': 'Field Hockey'
};

export function sportFolder(sport) {
  const raw = String(sport || '').trim().toLowerCase();
  if (SPORT_FOLDERS[raw]) return SPORT_FOLDERS[raw];

  // Unknown sport. Title-case it rather than failing, and leave a breadcrumb
  // in the logs so the map can be filled in before it happens twice.
  if (raw) console.warn(`smugmug-gallery: sport "${raw}" is not in SPORT_FOLDERS`);
  return String(sport || '').trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function galleryName(game, contributorName) {
  const { away, home, neutral } = displayTeams(game);
  const joiner = neutral ? 'vs.' : 'at';
  return `${away} ${joiner} ${home} (${shortDate(game.date)}) - ${String(contributorName || '').trim()}`;
}

// SmugMug wants a URL segment starting with a capital letter and made of
// letters, digits and dashes.
export function urlName(name) {
  let s = String(name || '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  if (!s) s = 'Gallery';
  if (!/^[A-Za-z]/.test(s)) s = 'G' + s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------------------------------------ *
 * SmugMug node walking
 * ------------------------------------------------------------------ */

async function rootNodeUri() {
  const me = await smug('GET', '/api/v2!authuser');
  const uri = me?.Response?.User?.Uris?.Node?.Uri;
  if (!uri) throw new Error('SmugMug did not return a root folder for this account');
  return uri;
}

// Find a child folder by name, or make one. Matching is case-insensitive so
// an existing "Volleyball" is reused rather than joined by a "volleyball".
async function folderNamed(parentUri, name) {
  const listed = await smug('GET', `${parentUri}!children?count=500&Type=Folder`);
  const wanted = name.trim().toLowerCase();
  const hit = (listed?.Response?.Node || []).find(
    n => String(n.Name || '').trim().toLowerCase() === wanted
  );
  if (hit) return hit.Uri;

  // Let SmugMug derive the URL segment. A season folder is named "2026" or
  // "2025-26", and SmugMug's own rule is that a URL segment starts with a
  // letter - so anything we generate ourselves comes out as "G2026". Letting
  // them do it matches what the website produces. If they refuse, fall back.
  let made;
  try {
    made = await smug('POST', `${parentUri}!children`, {
      Type: 'Folder',
      Name: name,
      Privacy: 'Public'
    });
  } catch (err) {
    if (err.status !== 400 && err.status !== 409) throw err;
    made = await smug('POST', `${parentUri}!children`, {
      Type: 'Folder',
      Name: name,
      UrlName: urlName(name),
      Privacy: 'Public'
    });
  }
  const uri = made?.Response?.Node?.Uri;
  if (!uri) throw new Error(`Could not create the ${name} folder`);
  return uri;
}

async function createAlbum(parentUri, name) {
  // A name collision inside one folder is possible if KJ made a gallery by
  // hand with the same title. Fall back to a suffixed URL rather than failing.
  let last = null;
  for (const suffix of ['', '-2', '-3']) {
    try {
      const made = await smug('POST', `${parentUri}!children`, {
        Type: 'Album',
        Name: name,
        UrlName: urlName(name) + suffix,
        Privacy: 'Public'
      });
      const node = made?.Response?.Node;
      if (node?.Uri) return node;
    } catch (err) {
      if (err.status !== 409 && err.status !== 400) throw err;
      last = err;  // keep SmugMug's own wording rather than inventing a reason
    }
  }
  throw new Error(last ? last.message : 'Could not create the gallery');
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

export default async (request) => {
  const headers = authHeaders();
  if (isOptions(request)) return new Response('', { status: 204, headers });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) {
    return json({ error: 'SmugMug is not connected yet. Add the SMUGMUG_PORTAL_* variables in Netlify.' }, 503, headers);
  }

  // Identity comes from the signed-in session, never from the request body,
  // so nobody can open a gallery under someone else's name.
  const v = await verifySupabaseUser(request);
  if (!v.ok || !v.user?.email) {
    return json({ error: 'Please sign in again' }, 401, headers);
  }
  const esc = String(v.user.email).replace(/[%_,()]/g, '');
  const me = (await sb(`contributors?email=ilike.${encodeURIComponent(esc)}&select=id,name&limit=1`))?.[0];
  if (!me) return json({ error: 'Could not identify your account' }, 403, headers);

  /* Dry run. Works out exactly what the real path would do for one game and
     reports every intermediate value, without creating anything. */
  if (body.action === 'dryrun') {
    try {
      const row = (await sb(
        `games?game_id=eq.${gid(body.gameId)}&select=game_id,date,sport,season,away_team,home_team,is_playoff,round,home_seed,away_seed&limit=1`
      ))?.[0];
      if (!row) return json({ error: 'Game not found' }, 404, headers);
      const g = { ...row, away: row.away_team, home: row.home_team };

      const wantSport = sportFolder(g.sport);
      const wantSeason = seasonFolder(g.sport, g.date, g.season);

      const me2 = await smug('GET', '/api/v2!authuser');
      const root = me2?.Response?.User?.Uris?.Node?.Uri;
      const kids = await smug('GET', `${root}!children?count=200&Type=Folder`);
      const nodes = kids?.Response?.Node || [];

      return json({ success: true, dryrun: {
        rawSport: g.sport,
        rawSeason: g.season,
        wantSport,
        wantSportLower: JSON.stringify(wantSport.trim().toLowerCase()),
        wantSeason,
        galleryName: galleryName(g, me.name),
        candidates: nodes.map(n => ({
          name: n.Name,
          nameLower: JSON.stringify(String(n.Name || '').trim().toLowerCase()),
          urlName: n.UrlName,
          matches: String(n.Name || '').trim().toLowerCase() === wantSport.trim().toLowerCase()
        })),
        matchFound: nodes.some(n => String(n.Name || '').trim().toLowerCase() === wantSport.trim().toLowerCase())
      } }, 200, headers);
    } catch (err) {
      return json({ error: err.message, status: err.status || null }, 500, headers);
    }
  }

  /* Diagnostic. Reports what SmugMug actually returns when we ask for the
     top-level folders, which is the only way to see why a name match missed. */
  if (body.action === 'inspect') {
    try {
      const me2 = await smug('GET', '/api/v2!authuser');
      const root = me2?.Response?.User?.Uris?.Node?.Uri;
      const out = { rootUri: root, nickName: me2?.Response?.User?.NickName };

      const filtered = await smug('GET', `${root}!children?count=500&Type=Folder`);
      out.withTypeFilter = {
        shape: Array.isArray(filtered?.Response?.Node) ? 'array' : typeof filtered?.Response?.Node,
        count: (filtered?.Response?.Node || []).length,
        names: (filtered?.Response?.Node || []).map(n => n.Name),
        pages: filtered?.Response?.Pages || null
      };

      const plain = await smug('GET', `${root}!children?count=500`);
      out.withoutFilter = {
        count: (plain?.Response?.Node || []).length,
        names: (plain?.Response?.Node || []).map(n => `${n.Name} [${n.Type}]`),
        pages: plain?.Response?.Pages || null
      };

      return json({ success: true, inspect: out }, 200, headers);
    } catch (err) {
      return json({ error: err.message, status: err.status || null }, 500, headers);
    }
  }

  const gameId = body.gameId;
  if (!gameId) return json({ error: 'gameId is required' }, 400, headers);

  try {
    // Already made? Hand back the same link.
    const existing = (await sb(
      `game_galleries?game_id=eq.${gid(gameId)}&contributor_id=eq.${me.id}&select=*&limit=1`
    ))?.[0];
    if (existing) {
      return json({ success: true, created: false, uploadUrl: existing.upload_url,
                    galleryName: existing.gallery_name, webUri: existing.web_uri }, 200, headers);
    }

    const row = (await sb(
      `games?game_id=eq.${gid(gameId)}&select=game_id,date,sport,season,gender,away_team,home_team,is_playoff,round,home_seed,away_seed&limit=1`
    ))?.[0];
    if (!row) return json({ error: 'Game not found' }, 404, headers);

    // The games table stores away_team / home_team; everything downstream -
    // and the schedule the photographer is looking at - calls them away / home.
    const game = { ...row, away: row.away_team, home: row.home_team };

    if (String(game.date) < FIRST_GAME_DATE) {
      return json({ error: 'Galleries are only created for games from October 2026 on' }, 403, headers);
    }

    // Must actually be the assigned photographer for this game.
    const mine = (await sb(
      `game_coverage_requests?game_id=eq.${gid(gameId)}&contributor_id=eq.${me.id}&select=role,status&limit=1`
    ))?.[0];
    if (!mine || mine.role !== 'photog' || mine.status !== 'selected') {
      return json({ error: 'You are not assigned to shoot this game' }, 403, headers);
    }

    const name = galleryName(game, me.name);
    const sportName = sportFolder(game.sport);
    const season = seasonFolder(game.sport, game.date, game.season);
    if (!sportName || !season) {
      return json({ error: 'This game is missing its sport or date, so I cannot name the gallery' }, 422, headers);
    }

    const root = await rootNodeUri();
    const sportUri = await folderNamed(root, sportName);
    const seasonUri = await folderNamed(sportUri, season);
    const node = await createAlbum(seasonUri, name);

    // The album behind the node is what carries the upload key.
    const nodeDetail = await smug('GET', node.Uri);
    const albumUri = nodeDetail?.Response?.Node?.Uris?.Album?.Uri;
    if (!albumUri) throw new Error('Gallery was created but SmugMug did not return it');

    // Random, so the upload links cannot be guessed from the outside.
    const uploadKey = crypto.randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const patched = await smug('PATCH', albumUri, { UploadKey: uploadKey });

    const album = patched?.Response?.Album || {};
    const albumKey = album.AlbumKey || albumUri.split('/').pop();
    const webUri = album.WebUri || node.WebUri || '';
    const uploadUrl = `https://ball603.smugmug.com/upload/${albumKey}/${uploadKey}`;

    await sb('game_galleries', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        game_id: String(gameId),
        contributor_id: me.id,
        contributor_name: me.name,
        gallery_name: name,
        album_uri: albumUri,
        album_key: albumKey,
        upload_key: uploadKey,
        upload_url: uploadUrl,
        web_uri: webUri
      })
    });

    return json({ success: true, created: true, uploadUrl, galleryName: name, webUri }, 200, headers);

  } catch (err) {
    console.error('smugmug-gallery:', err);
    return json({ error: err.message || 'Could not create the gallery' }, 500, headers);
  }
};
