// Pull NHIAA standings for every varsity sport Farmington is currently playing.
//
// NHIAA publishes its standings through an ArbiterSports rankings widget — the
// same one Ball603's volleyball scraper reads. That widget carries every sport
// in season, including soccer, football and golf, which Ball603 does not cover.
// It is also how we know which sports ARE in season: the group list only
// contains sports currently being played.
//
// Farmington's varsity teams are matched to their standings row by
// uniqueTeamId, which is the same number as our uteam. No name matching, and it
// survives the co-op entries that call themselves "Farmington-Nute".
//
// Not a function of its own — no handler, the way scrape-gvolleyball-core and
// notification-helper are modules that live here. sync-farmington calls it, so
// games and standings always refresh together on the one schedule, and there is
// no unauthenticated URL that writes standings.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// The rankings widget NHIAA embeds on its standings page.
const RANKINGS_ID = 'd59ccb58-2ab4-4dc2-931c-6970e261f94d';
const RANKINGS = `https://widgetapi.arbitersports.com/api/v2/widget/rankings/${RANKINGS_ID}`;

const VARSITY_LEVEL_ID = 31;   // Arbiter's rankings-side id for Varsity

async function arbiter(path) {
  const res = await fetch(RANKINGS + path, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Ball603Bot/1.0 (+https://ball603.com)' }
  });
  if (!res.ok) throw new Error(`Arbiter rankings ${res.status} on ${path}`);
  const json = await res.json();
  return json.data;
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

const toInt = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const toNum = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };

// Arbiter spells schools the state-directory way; Ball603 uses shortnames. This
// is the same reduction sync-farmington applies to opponents, kept in step with
// it deliberately — both feed the same "does this school have a Ball603 page"
// question on the Tigers site.
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES = {
  mascomavalley: 'Mascoma', newportmtnroyal: 'Newport',
  farmingtonnute: 'Farmington', henrywilsonmemorial: 'Farmington', hwms: 'Farmington'
};
const TAIL_WORDS = new Set(['school', 'schools', 'high', 'middle', 'middle/high', 'middle-high',
  'hs/ms', 'hs', 'ms', 'regional', 'reg', 'coop', 'co-op', 'academy', 'and', 'the']);

function toBall603(raw, names) {
  if (!raw) return null;
  let work = String(raw).replace(/\s+/g, ' ').trim().split(' - ')[0].replace(/[\s-]+NH$/i, '').trim();
  if (work === work.toUpperCase() && /[A-Z]{4}/.test(work)) {
    work = work.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  }
  if (/middle school|elementary|junior high|central school/i.test(work)) return null;
  let parts = work.split(' ');
  while (parts.length > 1 && TAIL_WORDS.has(parts[parts.length - 1].toLowerCase().replace(/[.,]$/, ''))) parts.pop();
  while (parts.length > 1 && TAIL_WORDS.has(parts[0].toLowerCase())) parts.shift();
  const core = parts.join(' ').trim();
  return ALIASES[nameKey(core)] || names.find(n => nameKey(n) === nameKey(core)) || null;
}

// A division can be published by more than one group: volleyball has both a
// combined "Volleyball Standings" group and a group per division, and football
// now has "Football Standings" and a "Division IV" group over the same eight
// teams. Same rows either way, so only one is stored — and the groups are
// walked in id order so the winner is the same on every run rather than
// depending on the order Arbiter happens to list them in.
const divisionKey = (g, divName) => `${g.sportId}|${g.genderId}|${divName}`;

export async function runStandingsSync({ dryRun = false } = {}) {
  if (!SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, body: { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' } };
  }
  const started = Date.now();

  try {
    // Which teams are ours, and what Ball603 calls the rest of the state.
    const [teams, b6] = await Promise.all([
      supabase('farmington_teams?select=uteam,display_name,hidden'),
      supabase('teams?select=shortname')
    ]);
    const ourTeams = new Map((teams || []).map(t => [t.uteam, t]));
    const ball603Names = [...new Set((b6 || []).map(t => t.shortname).filter(Boolean))];

    const groups = await arbiter('/groups');
    // Only varsity. The widget also carries Unified, which is not a Farmington team.
    const varsity = (groups || []).filter(g => g.levelId === VARSITY_LEVEL_ID);
    console.log(`Rankings: ${groups.length} groups, ${varsity.length} varsity`);

    const rows = [];
    const seenDivisions = new Set();
    const found = [];
    const season = String(new Date().getFullYear());

    // Fetch every varsity group once, then decide what to keep. Two passes are
    // needed because a sport can be split across groups: volleyball and golf put
    // all their divisions in one group, but soccer has a separate group per
    // division, so "does Farmington play this sport" cannot be answered from a
    // single group. Judging group by group is what left soccer with only the one
    // division Farmington is in and nothing for the division pills to switch to.
    const fetched = [];
    for (const g of [...varsity].sort((a, b) => a.rankingsGroupId - b.rankingsGroupId)) {
      try {
        fetched.push({ g, data: await arbiter('/' + g.rankingsGroupId) });
      } catch (err) {
        console.error(`Group ${g.rankingsGroupId} (${g.sportName}) failed:`, err.message);
      }
    }

    const ourSports = new Set();
    for (const { g, data } of fetched) {
      const has = (data.divisions || []).some(div =>
        (div.teams || div.rows || []).some(t => {
          const mine = ourTeams.get(t.uniqueTeamId);
          return mine && !mine.hidden;
        }));
      if (has) ourSports.add(`${g.sportId}|${g.genderId}`);
    }

    for (const { g, data } of fetched) {
      if (!ourSports.has(`${g.sportId}|${g.genderId}`)) continue;

      for (const div of (data.divisions || [])) {
        const divName = div.divisionName || div.name || data.groupName || '';
        const teamRows = div.teams || div.rows || [];
        if (!teamRows.length) continue;

        const ours = teamRows.filter(t => {
          const mine = ourTeams.get(t.uniqueTeamId);
          return mine && !mine.hidden;
        });

        const key = divisionKey(g, divName);
        if (seenDivisions.has(key)) continue;
        seenDivisions.add(key);

        found.push(`${g.sportName} ${g.genderName} ${divName} (${teamRows.length} schools)` +
          (ours.length ? ' — ' + ours.map(t =>
            (ourTeams.get(t.uniqueTeamId).display_name) || t.teamName).join(', ') : ''));

        for (const t of teamRows) {
          const v = t.values || {};
          rows.push({
            rankings_group_id: g.rankingsGroupId,
            unique_team_id: t.uniqueTeamId,
            group_name: data.groupName || g.name || null,
            division_name: divName || null,
            sport_id: g.sportId ?? data.eventSubCategoryId ?? null,
            gender_id: g.genderId ?? data.teamGenderId ?? null,
            level_id: g.levelId ?? data.teamLevelId ?? null,
            season,

            rank: toInt(v.rank),
            team_name: t.teamName || t.schoolName || null,
            school_logo_url: t.schoolLogoUrl || null,
            is_farmington: ourTeams.has(t.uniqueTeamId),
            ball603_shortname: toBall603(t.teamName || t.schoolName, ball603Names),

            games_played: toInt(v.gp),
            wins: toInt(v.w),
            losses: toInt(v.l),
            ties: toInt(v.t),
            points: toInt(v.pts),
            rating: toNum(v.rating),
            record: v.record || null,

            // Whatever columns this sport has that the ones above do not cover.
            extra: Object.fromEntries(Object.entries(v).filter(([k]) =>
              !['rank', 'team', 'gp', 'w', 'l', 't', 'pts', 'rating', 'record'].includes(k))),

            synced_at: new Date().toISOString()
          });
        }
      }
    }

    const report = {
      success: true,
      dryRun,
      varsityGroups: varsity.length,
      divisions: seenDivisions.size,
      rows: rows.length,
      // The sports Farmington is playing right now, which is also what the home
      // page standings box will offer.
      inSeason: found,
      removed: 0,
      elapsedMs: 0
    };

    if (!rows.length) {
      // Between seasons the widget legitimately has nothing for us. That is not
      // a failure, and it must not wipe the standings we already hold.
      report.note = 'No sport Farmington plays is currently ranked — nothing written';
      report.elapsedMs = Date.now() - started;
      console.log('Farmington standings:', JSON.stringify(report));
      return { statusCode: 200, body: report };
    }

    if (!dryRun) {
      for (let i = 0; i < rows.length; i += 100) {
        await supabase('farmington_standings?on_conflict=rankings_group_id,unique_team_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows.slice(i, i + 100))
        });
      }

      const writtenGroups = [...new Set(rows.map(r => r.rankings_group_id))];

      // A school that drops out of a division would otherwise sit in the table
      // forever. Prune per group, and only groups we just refreshed.
      for (const groupId of writtenGroups) {
        const keep = rows.filter(r => r.rankings_group_id === groupId).map(r => r.unique_team_id).join(',');
        const gone = await supabase(
          `farmington_standings?rankings_group_id=eq.${groupId}&unique_team_id=not.in.(${keep})`,
          { method: 'DELETE', headers: { Prefer: 'return=representation' } });
        report.removed += (gone || []).length;
      }

      // And a whole group that stops being written has to go too. NHIAA
      // reorganises these mid-season: football gained a "Division IV" group
      // alongside the "Football Standings" one covering the same eight teams,
      // and volleyball has both a combined group and a group per division. The
      // de-duplication above keeps one of each pair, but the loser's rows were
      // already in the table from an earlier run and nothing removed them — so
      // the site showed the same bracket twice.
      //
      // Guarded by having written something: an Arbiter outage produces no rows
      // and must not empty the table.
      const stale = await supabase(
        `farmington_standings?rankings_group_id=not.in.(${writtenGroups.join(',')})`,
        { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      report.removedGroups = (stale || []).length;
      report.removed += report.removedGroups;
    }

    report.elapsedMs = Date.now() - started;
    console.log('Farmington standings:', JSON.stringify(report));
    return { statusCode: 200, body: report };

  } catch (error) {
    console.error('Farmington standings sync failed:', error);
    return { statusCode: 500, body: { error: 'Standings sync failed', details: error.message } };
  }
}
