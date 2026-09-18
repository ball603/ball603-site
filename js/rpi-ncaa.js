/* NCAA-style bonuses and penalties for the Ball603 RPI.
 *
 * Mirrors Factor IV of the NCAA Division I women's volleyball RPI: after the
 * ordinary RPI is worked out (the "original RPI"), a team gets a bonus worth
 * about two ranking positions for every win over a team near the top of the
 * field, and a penalty worth about two positions for every loss to a team near
 * the bottom.
 *
 * The NCAA's field is all of Division I (~347 teams; top 25 and 313-and-below).
 * Ball603's RPI is calculated within each NHIAA division — opponents' win % and
 * opponents' opponents' win % only count same-division games — so the division
 * is the field here, and the cutoffs are scaled to it: top 2 and bottom 2 of a
 * ~21-team division is the same share the NCAA uses.
 *
 * "About two positions" is not published as a number, so it is measured each
 * time: the average RPI gap between teams two places apart in that division's
 * original ranking. Qualifying teams are fixed from the ORIGINAL ranking, so an
 * adjustment can never feed back into who earns one.
 *
 * Used by admin.html for both the preview table and Publish, so what is
 * previewed is exactly what is published. Pure: no DOM, no network.
 */
(function (root) {
  'use strict';

  const DEFAULTS = { top: 2, bottom: 2, positions: 2 };

  /**
   * @param {Array<{team:string, division:string, rpi:number, games:number}>} teams
   *        original RPI per team; `games` = completed same-division games played
   * @param {Array<{home_team:string, away_team:string, home_score:number, away_score:number}>} games
   *        completed games (any division; only same-division ones count)
   * @param {object} [opts] { top, bottom, positions }
   * @returns {Map<string, {original:number, adjusted:number, step:number,
   *           divisionRank:number, bonusWins:string[], penaltyLosses:string[]}>}
   */
  function applyNcaaAdjustments(teams, games, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const out = new Map();
    const byDiv = new Map();
    for (const t of teams) {
      if (!byDiv.has(t.division)) byDiv.set(t.division, []);
      byDiv.get(t.division).push(t);
    }

    for (const [div, list] of byDiv) {
      // Only teams that have played rank in the field; a team with no games has
      // an RPI of 0 by default, which says nothing about how good it is.
      const field = list.filter(t => t.games > 0).sort((a, b) => b.rpi - a.rpi);
      const n = field.length;

      // Two positions' worth of RPI: the mean gap between neighbours, doubled.
      const step = n > 1 ? ((field[0].rpi - field[n - 1].rpi) / (n - 1)) * o.positions : 0;

      // Cutoffs by value, so a tie on the line includes everyone tied — the
      // same way a tournament field is drawn.
      const enough = n >= o.top + o.bottom + 1;
      const topLine = enough ? field[o.top - 1].rpi : Infinity;
      const bottomLine = enough ? field[n - o.bottom].rpi : -Infinity;
      const isTop = (t) => t && t.games > 0 && t.rpi >= topLine;
      const isBottom = (t) => t && t.games > 0 && t.rpi <= bottomLine;

      const rankOf = new Map(field.map((t, i) => [t.team, i + 1]));
      const inDiv = new Map(list.map(t => [t.team, t]));

      for (const t of list) {
        out.set(t.team, { original: t.rpi, adjusted: t.rpi, step, divisionRank: rankOf.get(t.team) || null,
                          bonusWins: [], penaltyLosses: [] });
      }

      for (const g of games) {
        const home = inDiv.get(g.home_team), away = inDiv.get(g.away_team);
        if (!home || !away) continue;                    // same-division games only
        if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) continue;
        const [winner, loser] = g.home_score > g.away_score ? [home, away] : [away, home];
        if (isTop(loser)) out.get(winner.team).bonusWins.push(loser.team);
        if (isBottom(winner)) out.get(loser.team).penaltyLosses.push(winner.team);
      }

      for (const t of list) {
        const r = out.get(t.team);
        r.adjusted = t.rpi + step * r.bonusWins.length - step * r.penaltyLosses.length;
      }
    }
    return out;
  }

  const api = { applyNcaaAdjustments, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Ball603Rpi = api;
})(typeof window !== 'undefined' ? window : globalThis);
