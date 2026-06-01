// Ball603 Reconcile Audit
// Returns all orphaned articles (articles.game_id not in games.game_id)
// with parsed metadata and ranked candidate games for re-linking.
//
// READ-ONLY. No DB mutations. Safe to call repeatedly.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const HEADERS = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
};

// Parse a game_id of the form: nhiaa_TEAM1_GENDER_YYYYMMDD_TEAM2[_g2|_g3...]
// Returns { type, dateIso, gender, team1Slug, team2Slug, suffix } or { type: 'manual' } or null.
function parseGameId(gameId) {
  if (!gameId) return null;

  if (gameId.startsWith('manual_')) {
    return { type: 'manual', raw: gameId };
  }

  // nhiaa_TEAM1_b|g_YYYYMMDD_TEAM2 (optional _gN doubleheader suffix)
  const m = gameId.match(/^nhiaa_([a-z0-9-]+)_([bg])_(\d{8})_([a-z0-9-]+?)(_g\d+)?$/i);
  if (!m) return { type: 'unknown', raw: gameId };

  const [, t1, g, dStr, t2, suffix] = m;
  return {
    type: 'nhiaa',
    raw: gameId,
    team1Slug: t1.toLowerCase(),
    team2Slug: t2.toLowerCase(),
    gender: g.toLowerCase() === 'b' ? 'Boys' : 'Girls',
    genderChar: g.toLowerCase(),
    dateIso: `${dStr.substr(0, 4)}-${dStr.substr(4, 2)}-${dStr.substr(6, 2)}`,
    suffix: suffix || '',
  };
}

// Score a candidate game against an orphaned game_id string.
// Higher score = better match. 0 = no team-name match (just same date/gender).
function scoreCandidate(orphanRawId, candidateGame) {
  const orphanLower = orphanRawId.toLowerCase();
  const slugify = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  let score = 0;

  for (const teamName of [candidateGame.home_team, candidateGame.away_team]) {
    if (!teamName) continue;
    const fullSlug = slugify(teamName);
    // Full slug match (strong signal)
    if (fullSlug.length >= 4 && orphanLower.includes(fullSlug)) {
      score += 50;
      continue;
    }
    // Per-word fallback (handles e.g. "mancentralmanwest" matching "Central-West")
    const words = teamName.toLowerCase().split(/[\s-]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length >= 3);
    for (const word of words) {
      if (orphanLower.includes(word)) score += 20;
    }
  }

  // Exact-suffix bonus: if orphan has a _g2 suffix and candidate's game_id also ends with one
  if (orphanRawId.includes('_g') && candidateGame.game_id && candidateGame.game_id.match(/_g\d+$/)) {
    score += 10;
  }

  return score;
}

async function fetchOrphanedArticles() {
  // Get all articles with a non-null game_id.
  // SELECT only columns we're confident exist on the articles table.
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?game_id=not.is.null&select=id,title,slug,game_id,status,created_at&order=created_at.desc`,
    { headers: { ...HEADERS, 'Range': '0-9999' } }
  );
  if (!resp.ok) throw new Error(`articles fetch failed: ${resp.status} ${await resp.text()}`);
  const articles = await resp.json();

  if (articles.length === 0) return [];

  // Get the set of currently-existing game_ids (to find which articles are orphaned)
  const gameIds = [...new Set(articles.map(a => a.game_id).filter(Boolean))];
  const existing = new Set();
  const BATCH = 30;
  for (let i = 0; i < gameIds.length; i += BATCH) {
    const chunk = gameIds.slice(i, i + BATCH);
    const inFilter = `in.(${chunk.map(id => `"${id}"`).join(',')})`;
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/games?game_id=${inFilter}&select=game_id`,
      { headers: { ...HEADERS, 'Range': '0-9999' } }
    );
    if (r.ok) {
      const rows = await r.json();
      rows.forEach(row => existing.add(row.game_id));
    }
  }

  return articles.filter(a => a.game_id && !existing.has(a.game_id));
}

async function fetchCandidatesForDate(dateIso, gender) {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/games?date=eq.${dateIso}&gender=eq.${gender}&select=game_id,date,home_team,away_team,gender,division,sport,home_score,away_score`,
    { headers: { ...HEADERS, 'Range': '0-9999' } }
  );
  if (!resp.ok) return [];
  return await resp.json();
}

async function fetchCandidatesNearDate(dateIso, gender, daysWindow) {
  // For manual_* IDs or fuzzy matches: pull a date range
  const d = new Date(dateIso + 'T12:00:00');
  const start = new Date(d.getTime() - daysWindow * 86400000).toISOString().slice(0, 10);
  const end = new Date(d.getTime() + daysWindow * 86400000).toISOString().slice(0, 10);
  let url = `${SUPABASE_URL}/rest/v1/games?date=gte.${start}&date=lte.${end}&select=game_id,date,home_team,away_team,gender,division,sport,home_score,away_score`;
  if (gender) url += `&gender=eq.${gender}`;
  const resp = await fetch(url, { headers: { ...HEADERS, 'Range': '0-9999' } });
  if (!resp.ok) return [];
  return await resp.json();
}

export default async (request) => {
  try {
    const orphans = await fetchOrphanedArticles();

    const results = [];

    for (const article of orphans) {
      const parsed = parseGameId(article.game_id);
      let candidates = [];

      if (parsed && parsed.type === 'nhiaa') {
        // Best: same date + gender
        const exactDateCandidates = await fetchCandidatesForDate(parsed.dateIso, parsed.gender);
        candidates = exactDateCandidates.map(c => ({
          ...c,
          score: scoreCandidate(article.game_id, c),
          dateOffset: 0,
        }));

        // If no strong match (no candidate score >= 70), broaden to ±7 days
        const hasStrong = candidates.some(c => c.score >= 70);
        if (!hasStrong) {
          const nearby = await fetchCandidatesNearDate(parsed.dateIso, parsed.gender, 7);
          const existingIds = new Set(candidates.map(c => c.game_id));
          for (const c of nearby) {
            if (existingIds.has(c.game_id)) continue;
            const d1 = new Date(parsed.dateIso + 'T12:00:00').getTime();
            const d2 = new Date(c.date + 'T12:00:00').getTime();
            const dateOffset = Math.round((d2 - d1) / 86400000);
            candidates.push({
              ...c,
              score: scoreCandidate(article.game_id, c) - Math.abs(dateOffset) * 2, // small penalty per day off
              dateOffset,
            });
          }
        }
      } else if (parsed && parsed.type === 'manual') {
        // Manual IDs: use article's created_at as anchor (most reliable cross-schema column),
        // pull games within ±14 days, score by article title containing team names.
        const anchorDate = article.created_at?.slice(0, 10);
        if (anchorDate) {
          const nearby = await fetchCandidatesNearDate(anchorDate, null, 14);
          candidates = nearby.map(c => {
            const d1 = new Date(anchorDate + 'T12:00:00').getTime();
            const d2 = new Date(c.date + 'T12:00:00').getTime();
            const dateOffset = Math.round((d2 - d1) / 86400000);
            return {
              ...c,
              // Score by article title containing team names (rough proxy)
              score: scoreCandidateAgainstTitle(article.title || '', c) - Math.abs(dateOffset),
              dateOffset,
            };
          });
        }
      }

      // Sort by score desc, keep top 8
      candidates.sort((a, b) => b.score - a.score);
      candidates = candidates.slice(0, 8);

      results.push({
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
          created_at: article.created_at,
        },
        currentGameId: article.game_id,
        parsed,
        candidates,
        bestScore: candidates[0]?.score || 0,
      });
    }

    // Sort: highest-confidence matches first, then unparseable/manual at the end
    results.sort((a, b) => {
      // manual / unknown to end
      const aIsParseable = a.parsed?.type === 'nhiaa';
      const bIsParseable = b.parsed?.type === 'nhiaa';
      if (aIsParseable !== bIsParseable) return aIsParseable ? -1 : 1;
      return b.bestScore - a.bestScore;
    });

    return new Response(JSON.stringify({
      success: true,
      orphanCount: results.length,
      orphans: results,
      timestamp: new Date().toISOString(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Audit error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function scoreCandidateAgainstTitle(title, candidateGame) {
  if (!title) return 0;
  const t = title.toLowerCase();
  let score = 0;
  for (const teamName of [candidateGame.home_team, candidateGame.away_team]) {
    if (!teamName) continue;
    const lower = teamName.toLowerCase();
    // Check if full team name appears in title
    if (t.includes(lower)) {
      score += 40;
      continue;
    }
    // Per-word match
    const words = lower.split(/[\s-]+/).filter(w => w.length >= 4);
    for (const w of words) {
      if (t.includes(w)) score += 15;
    }
  }
  return score;
}

export const config = {
  path: '/.netlify/functions/reconcile-audit'
};
