// ═══════════════════════════════════════════════════════════════════
// Girls Volleyball Tournament Brackets — Historical Data
// Source: NHIAA archive pages (nhiaa.org/tournament-info/...)
//
// Data structure mirrors TOURNAMENT_BRACKETS in features-data.js:
//   GVOLLEYBALL_BRACKETS[year].girls[division] = { champion, ..., games: {...} }
//
// Scores represent SETS won (best-of-5, first to 3).
//
// STATUS: 30 of 30 brackets populated. COMPLETE.
//
// bracketSize convention (matches the originally-seeded 8 brackets):
//   D-I and D-II  -> 16 (nominal bracket size; byes fill unused top slots)
//   D-III         -> actual field size (e.g. 2025 D-III = 12)
//   2020 (COVID)  -> 4  (abbreviated playoff: semiFinals + final only)
// ═══════════════════════════════════════════════════════════════════

const GVOLLEYBALL_BRACKETS = {

  // ============================================================
  // 2025
  // ============================================================
  2025: {
    girls: {
      'D-I': {
        champion: 'Pinkerton', championSeed: 1,
        runnerUp: 'Dover', runnerUpSeed: 6,
        finalScore: '3-0', bracketSize: 16,
        notes: '6-seed Dover reaches the final after upsetting Bishop Guertin (QF) and Londonderry (semi, 3-2).',
        games: {
          firstRound: [
            { winner: 'Pinkerton',        winnerSeed: 1,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Windham',          winnerSeed: 8,  loser: 'Bedford',      loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Salem',            winnerSeed: 4,  loser: 'Winnacunnet',  loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Nashua North',     winnerSeed: 5,  loser: 'Alvirne',      loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Londonderry',      winnerSeed: 2,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Portsmouth',       winnerSeed: 7,  loser: 'Exeter',       loserSeed: 10,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Bishop Guertin',   winnerSeed: 3,  loser: 'Goffstown',    loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Dover',            winnerSeed: 6,  loser: 'Timberlane',   loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Pinkerton',      winnerSeed: 1, loser: 'Windham',        loserSeed: 8, winnerScore: 3, loserScore: 2 },
            { winner: 'Nashua North',   winnerSeed: 5, loser: 'Salem',          loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Londonderry',    winnerSeed: 2, loser: 'Portsmouth',     loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Dover',          winnerSeed: 6, loser: 'Bishop Guertin', loserSeed: 3, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Pinkerton', winnerSeed: 1, loser: 'Nashua North', loserSeed: 5, winnerScore: 3, loserScore: 1 },
            { winner: 'Dover',     winnerSeed: 6, loser: 'Londonderry',  loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Pinkerton', winnerSeed: 1, loser: 'Dover', loserSeed: 6, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-II': {
        champion: 'Oyster River', championSeed: 1,
        runnerUp: 'Somersworth', runnerUpSeed: 3,
        finalScore: '3-1', bracketSize: 16,
        notes: '7-seed Kingswood upsets 2-seed Coe-Brown Northwood in the QF (3-2) before falling to Somersworth in the semi.',
        games: {
          firstRound: [
            { winner: 'Oyster River',         winnerSeed: 1,  loser: 'Pelham',              loserSeed: 16, winnerScore: 3, loserScore: 0 },
            { winner: 'Souhegan',             winnerSeed: 8,  loser: 'Gilford',             loserSeed: 9,  winnerScore: 3, loserScore: 0 },
            { winner: 'Milford',              winnerSeed: 4,  loser: 'Campbell',            loserSeed: 13, winnerScore: 3, loserScore: 1 },
            { winner: 'Hanover',              winnerSeed: 5,  loser: 'Saint Thomas Aquinas',loserSeed: 12, winnerScore: 3, loserScore: 0 },
            { winner: 'Coe-Brown Northwood',  winnerSeed: 2,  loser: 'Manchester Memorial', loserSeed: 15, winnerScore: 3, loserScore: 0 },
            { winner: 'Kingswood',            winnerSeed: 7,  loser: 'Laconia',             loserSeed: 10, winnerScore: 3, loserScore: 1 },
            { winner: 'Somersworth',          winnerSeed: 3,  loser: 'Fall Mountain',       loserSeed: 14, winnerScore: 3, loserScore: 0 },
            { winner: 'ConVal',               winnerSeed: 6,  loser: 'Winnisquam',          loserSeed: 11, winnerScore: 3, loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Oyster River', winnerSeed: 1, loser: 'Souhegan',             loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Milford',      winnerSeed: 4, loser: 'Hanover',              loserSeed: 5, winnerScore: 3, loserScore: 1 },
            { winner: 'Kingswood',    winnerSeed: 7, loser: 'Coe-Brown Northwood',  loserSeed: 2, winnerScore: 3, loserScore: 2 },
            { winner: 'Somersworth',  winnerSeed: 3, loser: 'ConVal',               loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Oyster River', winnerSeed: 1, loser: 'Milford',    loserSeed: 4, winnerScore: 3, loserScore: 1 },
            { winner: 'Somersworth',  winnerSeed: 3, loser: 'Kingswood',  loserSeed: 7, winnerScore: 3, loserScore: 1 }
          ],
          final: [ { winner: 'Oyster River', winnerSeed: 1, loser: 'Somersworth', loserSeed: 3, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-III': {
        champion: 'Inter-Lakes', championSeed: 1,
        runnerUp: 'Farmington', runnerUpSeed: 2,
        finalScore: '3-0', bracketSize: 12,
        notes: '10-seed Portsmouth Christian upsets 7-seed Moultonborough in the first round.',
        games: {
          firstRound: [
            { winner: 'Inter-Lakes',          winnerSeed: 1,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Concord Christian',    winnerSeed: 8,  loser: 'Newfound',        loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Belmont',              winnerSeed: 4,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Mascenic',             winnerSeed: 5,  loser: 'Mascoma Valley',  loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Farmington',           winnerSeed: 2,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Portsmouth Christian', winnerSeed: 10, loser: 'Moultonborough',  loserSeed: 7,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Trinity',              winnerSeed: 3,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Raymond',              winnerSeed: 6,  loser: 'Epping',          loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Concord Christian',    loserSeed: 8,  winnerScore: 3, loserScore: 0 },
            { winner: 'Belmont',     winnerSeed: 4, loser: 'Mascenic',             loserSeed: 5,  winnerScore: 3, loserScore: 1 },
            { winner: 'Farmington',  winnerSeed: 2, loser: 'Portsmouth Christian', loserSeed: 10, winnerScore: 3, loserScore: 2 },
            { winner: 'Trinity',     winnerSeed: 3, loser: 'Raymond',              loserSeed: 6,  winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Belmont', loserSeed: 4, winnerScore: 3, loserScore: 1 },
            { winner: 'Farmington',  winnerSeed: 2, loser: 'Trinity', loserSeed: 3, winnerScore: 3, loserScore: 1 }
          ],
          final: [ { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Farmington', loserSeed: 2, winnerScore: 3, loserScore: 0 } ]
        }
      }
    }
  },

  // ============================================================
  // 2024
  // ============================================================
  2024: {
    girls: {
      'D-I': {
        champion: 'Bedford', championSeed: 1,
        runnerUp: 'Pinkerton', runnerUpSeed: 3,
        finalScore: '3-0', bracketSize: 16,
        notes: 'Bedford sweeps Pinkerton in the final for the title.',
        games: {
          firstRound: [
            { winner: 'Bedford',          winnerSeed: 1,  loser: 'Bye',           loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Merrimack',        winnerSeed: 9,  loser: 'Windham',       loserSeed: 8,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Bishop Guertin',   winnerSeed: 4,  loser: 'Portsmouth',    loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Concord',          winnerSeed: 12, loser: 'Nashua South',  loserSeed: 5,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Goffstown',        winnerSeed: 2,  loser: 'Bye',           loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Hollis-Brookline', winnerSeed: 7,  loser: 'Nashua North',  loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Pinkerton',        winnerSeed: 3,  loser: 'Spaulding',     loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Salem',            winnerSeed: 6,  loser: 'Londonderry',   loserSeed: 11,   winnerScore: 3,    loserScore: 1 }
          ],
          quarterFinals: [
            { winner: 'Bedford',        winnerSeed: 1, loser: 'Merrimack',        loserSeed: 9,  winnerScore: 3, loserScore: 0 },
            { winner: 'Bishop Guertin', winnerSeed: 4, loser: 'Concord',          loserSeed: 12, winnerScore: 3, loserScore: 1 },
            { winner: 'Goffstown',      winnerSeed: 2, loser: 'Hollis-Brookline', loserSeed: 7,  winnerScore: 3, loserScore: 1 },
            { winner: 'Pinkerton',      winnerSeed: 3, loser: 'Salem',            loserSeed: 6,  winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Bedford',   winnerSeed: 1, loser: 'Bishop Guertin', loserSeed: 4, winnerScore: 3, loserScore: 2 },
            { winner: 'Pinkerton', winnerSeed: 3, loser: 'Goffstown',      loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Bedford', winnerSeed: 1, loser: 'Pinkerton', loserSeed: 3, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-II': {
        champion: 'Somersworth', championSeed: 1,
        runnerUp: 'Milford', runnerUpSeed: 3,
        finalScore: '3-1', bracketSize: 16,
        notes: '11-seed Laconia upsets 6-seed Hanover in the first round; Somersworth caps a title run.',
        games: {
          firstRound: [
            { winner: 'Somersworth',         winnerSeed: 1,  loser: 'Winnisquam',           loserSeed: 16, winnerScore: 3, loserScore: 0 },
            { winner: 'Kingswood',           winnerSeed: 8,  loser: 'ConVal',               loserSeed: 9,  winnerScore: 3, loserScore: 1 },
            { winner: 'Oyster River',        winnerSeed: 4,  loser: 'Fall Mountain',        loserSeed: 13, winnerScore: 3, loserScore: 1 },
            { winner: 'Souhegan',            winnerSeed: 5,  loser: 'Plymouth',             loserSeed: 12, winnerScore: 3, loserScore: 1 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2,  loser: 'John Stark',           loserSeed: 15, winnerScore: 3, loserScore: 0 },
            { winner: 'Campbell',            winnerSeed: 7,  loser: 'Gilford',              loserSeed: 10, winnerScore: 3, loserScore: 1 },
            { winner: 'Milford',             winnerSeed: 3,  loser: 'Saint Thomas Aquinas', loserSeed: 14, winnerScore: 3, loserScore: 0 },
            { winner: 'Laconia',             winnerSeed: 11, loser: 'Hanover',              loserSeed: 6,  winnerScore: 3, loserScore: 1 }
          ],
          quarterFinals: [
            { winner: 'Somersworth',         winnerSeed: 1, loser: 'Kingswood',    loserSeed: 8,  winnerScore: 3, loserScore: 0 },
            { winner: 'Oyster River',        winnerSeed: 4, loser: 'Souhegan',     loserSeed: 5,  winnerScore: 3, loserScore: 0 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Campbell',     loserSeed: 7,  winnerScore: 3, loserScore: 1 },
            { winner: 'Milford',             winnerSeed: 3, loser: 'Laconia',      loserSeed: 11, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Somersworth', winnerSeed: 1, loser: 'Oyster River',        loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Milford',     winnerSeed: 3, loser: 'Coe-Brown Northwood', loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Somersworth', winnerSeed: 1, loser: 'Milford', loserSeed: 3, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-III': {
        champion: 'Inter-Lakes', championSeed: 1,
        runnerUp: 'Concord Christian', runnerUpSeed: 2,
        finalScore: '3-1', bracketSize: 12,
        notes: 'Chalk final: 1-seed Inter-Lakes defeats 2-seed Concord Christian 3-1. 9-seed Moultonborough upsets 8-seed Mascenic in the first round (3-2).',
        games: {
          firstRound: [
            { winner: 'Inter-Lakes',          winnerSeed: 1,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Moultonborough',       winnerSeed: 9,  loser: 'Mascenic',        loserSeed: 8,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Portsmouth Christian', winnerSeed: 4,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Newfound',             winnerSeed: 5,  loser: 'Mascoma Valley',  loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Concord Christian',    winnerSeed: 2,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Farmington',           winnerSeed: 7,  loser: 'Raymond',         loserSeed: 10,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Trinity',              winnerSeed: 3,  loser: 'Bye',             loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Belmont',              winnerSeed: 6,  loser: 'Epping',          loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Inter-Lakes',       winnerSeed: 1, loser: 'Moultonborough', loserSeed: 9, winnerScore: 3, loserScore: 0 },
            { winner: 'Portsmouth Christian', winnerSeed: 4, loser: 'Newfound',    loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Farmington',     loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Trinity',           winnerSeed: 3, loser: 'Belmont',        loserSeed: 6, winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Inter-Lakes',       winnerSeed: 1, loser: 'Portsmouth Christian', loserSeed: 4, winnerScore: 3, loserScore: 2 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Trinity',              loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Concord Christian', loserSeed: 2, winnerScore: 3, loserScore: 1 } ]
        }
      }
    }
  },

  // ============================================================
  // 2023
  // ============================================================
  2023: {
    girls: {
      'D-I': {
        champion: 'Bedford', championSeed: 1,
        runnerUp: 'Hollis-Brookline', runnerUpSeed: 2,
        finalScore: '3-0', bracketSize: 16,
        notes: 'Bedford defends its title with a sweep of Hollis-Brookline.',
        games: {
          firstRound: [
            { winner: 'Bedford',          winnerSeed: 1,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Pinkerton',        winnerSeed: 9,  loser: 'Concord',        loserSeed: 8,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Dover',            winnerSeed: 4,  loser: 'Nashua South',   loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Londonderry',      winnerSeed: 5,  loser: 'Bishop Guertin', loserSeed: 12,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Hollis-Brookline', winnerSeed: 2,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Salem',            winnerSeed: 10, loser: 'Goffstown',      loserSeed: 7,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Windham',          winnerSeed: 3,  loser: 'Exeter',         loserSeed: 14,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Portsmouth',       winnerSeed: 6,  loser: 'Nashua North',   loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Bedford',          winnerSeed: 1, loser: 'Pinkerton',   loserSeed: 9,  winnerScore: 3, loserScore: 0 },
            { winner: 'Dover',            winnerSeed: 4, loser: 'Londonderry', loserSeed: 5,  winnerScore: 3, loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2, loser: 'Salem',       loserSeed: 10, winnerScore: 3, loserScore: 0 },
            { winner: 'Portsmouth',       winnerSeed: 6, loser: 'Windham',     loserSeed: 3,  winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Bedford',          winnerSeed: 1, loser: 'Dover',      loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2, loser: 'Portsmouth', loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Bedford', winnerSeed: 1, loser: 'Hollis-Brookline', loserSeed: 2, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-II': {
        champion: 'Oyster River', championSeed: 1,
        runnerUp: 'Coe-Brown Northwood', runnerUpSeed: 2,
        finalScore: '3-2', bracketSize: 16,
        notes: 'Oyster River outlasts Coe-Brown Northwood in a five-set final; 5-seed Campbell reaches semis after upsetting 4-seed ConVal.',
        games: {
          firstRound: [
            { winner: 'Oyster River',         winnerSeed: 1,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 8,  loser: 'Milford',            loserSeed: 9,    winnerScore: 3,    loserScore: 1 },
            { winner: 'ConVal',               winnerSeed: 4,  loser: 'Laconia',            loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Campbell',             winnerSeed: 5,  loser: 'Pelham',             loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Coe-Brown Northwood',  winnerSeed: 2,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Kingswood',            winnerSeed: 7,  loser: 'Winnisquam',         loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Souhegan',             winnerSeed: 3,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Gilford',              winnerSeed: 6,  loser: 'John Stark',         loserSeed: 11,   winnerScore: 3,    loserScore: 1 }
          ],
          quarterFinals: [
            { winner: 'Oyster River',        winnerSeed: 1, loser: 'Saint Thomas Aquinas', loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Campbell',            winnerSeed: 5, loser: 'ConVal',                loserSeed: 4, winnerScore: 3, loserScore: 2 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Kingswood',             loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Souhegan',            winnerSeed: 3, loser: 'Gilford',               loserSeed: 6, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Oyster River',        winnerSeed: 1, loser: 'Campbell', loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Souhegan', loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Oyster River', winnerSeed: 1, loser: 'Coe-Brown Northwood', loserSeed: 2, winnerScore: 3, loserScore: 2 } ]
        }
      },
      'D-III': {
        champion: 'Inter-Lakes', championSeed: 2,
        runnerUp: 'Somersworth', runnerUpSeed: 1,
        finalScore: '3-0', bracketSize: 13,
        notes: '2-seed Inter-Lakes sweeps top-seeded Somersworth in the final; 4-seed Portsmouth Christian pushes Somersworth to five sets in the semi.',
        games: {
          firstRound: [
            { winner: 'Somersworth',          winnerSeed: 1,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Moultonborough',       winnerSeed: 8,  loser: 'Prospect Mountain', loserSeed: 9,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Portsmouth Christian', winnerSeed: 4,  loser: 'Farmington',       loserSeed: 13,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Belmont',              winnerSeed: 5,  loser: 'Newfound',         loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Inter-Lakes',          winnerSeed: 2,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Epping',               winnerSeed: 7,  loser: 'Sunapee',          loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Mascenic',             winnerSeed: 3,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Concord Christian',    winnerSeed: 6,  loser: 'Trinity',          loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Somersworth',          winnerSeed: 1, loser: 'Moultonborough', loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Portsmouth Christian', winnerSeed: 4, loser: 'Belmont',        loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Inter-Lakes',          winnerSeed: 2, loser: 'Epping',          loserSeed: 7, winnerScore: 3, loserScore: 1 },
            { winner: 'Concord Christian',    winnerSeed: 6, loser: 'Mascenic',       loserSeed: 3, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Somersworth', winnerSeed: 1, loser: 'Portsmouth Christian', loserSeed: 4, winnerScore: 3, loserScore: 2 },
            { winner: 'Inter-Lakes', winnerSeed: 2, loser: 'Concord Christian',    loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Inter-Lakes', winnerSeed: 2, loser: 'Somersworth', loserSeed: 1, winnerScore: 3, loserScore: 0 } ]
        }
      }
    }
  },

  // ============================================================
  // 2022
  // ============================================================
  2022: {
    girls: {
      'D-I': {
        champion: 'Bedford', championSeed: 1,
        runnerUp: 'Hollis-Brookline', runnerUpSeed: 2,
        finalScore: '3-2', bracketSize: 16,
        notes: 'Bedford edges Hollis-Brookline in a five-set final.',
        games: {
          firstRound: [
            { winner: 'Bedford',          winnerSeed: 1,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Bishop Guertin',   winnerSeed: 8,  loser: 'Spaulding',      loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Exeter',           winnerSeed: 4,  loser: 'Concord',        loserSeed: 13,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Nashua North',     winnerSeed: 5,  loser: 'Windham',        loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Portsmouth',       winnerSeed: 7,  loser: 'Goffstown',      loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Londonderry',      winnerSeed: 3,  loser: 'Nashua South',   loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Dover',            winnerSeed: 6,  loser: 'Pinkerton',      loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Bedford',          winnerSeed: 1, loser: 'Bishop Guertin', loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Exeter',           winnerSeed: 4, loser: 'Nashua North',   loserSeed: 5, winnerScore: 3, loserScore: 2 },
            { winner: 'Hollis-Brookline', winnerSeed: 2, loser: 'Portsmouth',     loserSeed: 7, winnerScore: 3, loserScore: 2 },
            { winner: 'Londonderry',      winnerSeed: 3, loser: 'Dover',          loserSeed: 6, winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Bedford',          winnerSeed: 1, loser: 'Exeter',      loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2, loser: 'Londonderry', loserSeed: 3, winnerScore: 3, loserScore: 1 }
          ],
          final: [ { winner: 'Bedford', winnerSeed: 1, loser: 'Hollis-Brookline', loserSeed: 2, winnerScore: 3, loserScore: 2 } ]
        }
      },
      'D-II': {
        champion: 'Oyster River', championSeed: 1,
        runnerUp: 'Coe-Brown Northwood', runnerUpSeed: 2,
        finalScore: '3-2', bracketSize: 16,
        notes: 'Oyster River outlasts Coe-Brown Northwood in a five-set final; 9-seed Milford upsets 8-seed Kingswood in the first round.',
        games: {
          firstRound: [
            { winner: 'Oyster River',         winnerSeed: 1,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Milford',              winnerSeed: 9,  loser: 'Kingswood',        loserSeed: 8,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Campbell',             winnerSeed: 4,  loser: 'Laconia',          loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 5,  loser: 'Manchester West',  loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Coe-Brown Northwood',  winnerSeed: 2,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Pelham',               winnerSeed: 7,  loser: 'Winnisquam',       loserSeed: 10,   winnerScore: 3,    loserScore: 2 },
            { winner: 'John Stark',           winnerSeed: 3,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'ConVal',               winnerSeed: 6,  loser: 'Hanover',          loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Oyster River',        winnerSeed: 1, loser: 'Milford',              loserSeed: 9, winnerScore: 3, loserScore: 0 },
            { winner: 'Campbell',            winnerSeed: 4, loser: 'Saint Thomas Aquinas', loserSeed: 5, winnerScore: 3, loserScore: 2 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Pelham',               loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'John Stark',          winnerSeed: 3, loser: 'ConVal',               loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Oyster River',        winnerSeed: 1, loser: 'Campbell',   loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'John Stark', loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Oyster River', winnerSeed: 1, loser: 'Coe-Brown Northwood', loserSeed: 2, winnerScore: 3, loserScore: 2 } ]
        }
      },
      'D-III': {
        champion: 'Somersworth', championSeed: 2,
        runnerUp: 'Inter-Lakes', runnerUpSeed: 4,
        finalScore: '3-1', bracketSize: 13,
        notes: '4-seed Inter-Lakes upsets 1-seed Mascenic in the semi (3-1) to reach the final; 9-seed Moultonborough upsets 8-seed Trinity in the first round. Somersworth takes the title.',
        games: {
          firstRound: [
            { winner: 'Mascenic',             winnerSeed: 1,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Moultonborough',       winnerSeed: 9,  loser: 'Trinity',            loserSeed: 8,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Inter-Lakes',          winnerSeed: 4,  loser: 'Concord Christian',  loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Portsmouth Christian', winnerSeed: 5,  loser: 'Hillsboro-Deering',  loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Somersworth',          winnerSeed: 2,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Prospect Mountain',    winnerSeed: 7,  loser: 'Sunapee',            loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Newfound',             winnerSeed: 3,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Epping',               winnerSeed: 6,  loser: 'Farmington',         loserSeed: 11,   winnerScore: 3,    loserScore: 1 }
          ],
          quarterFinals: [
            { winner: 'Mascenic',    winnerSeed: 1, loser: 'Moultonborough',       loserSeed: 9, winnerScore: 3, loserScore: 1 },
            { winner: 'Inter-Lakes', winnerSeed: 4, loser: 'Portsmouth Christian', loserSeed: 5, winnerScore: 3, loserScore: 1 },
            { winner: 'Somersworth', winnerSeed: 2, loser: 'Prospect Mountain',    loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Newfound',    winnerSeed: 3, loser: 'Epping',               loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 4, loser: 'Mascenic',  loserSeed: 1, winnerScore: 3, loserScore: 1 },
            { winner: 'Somersworth', winnerSeed: 2, loser: 'Newfound',  loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Somersworth', winnerSeed: 2, loser: 'Inter-Lakes', loserSeed: 4, winnerScore: 3, loserScore: 1 } ]
        }
      }
    }
  },

  // ============================================================
  // 2021
  // ============================================================
  2021: {
    girls: {
      'D-I': {
        champion: 'Bedford', championSeed: 1,
        runnerUp: 'Hollis-Brookline', runnerUpSeed: 2,
        finalScore: '3-0', bracketSize: 16,
        notes: 'Chalk at the top — top two seeds meet in the final. 9-seed Keene upsets 8-seed Bishop Guertin in the first round; 10-seed Concord upsets 7-seed Portsmouth.',
        games: {
          firstRound: [
            { winner: 'Bedford',          winnerSeed: 1,  loser: 'Bye',           loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Keene',            winnerSeed: 9,  loser: 'Bishop Guertin', loserSeed: 8,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Pinkerton',        winnerSeed: 4,  loser: 'Nashua South',  loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Dover',            winnerSeed: 5,  loser: 'Goffstown',     loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2,  loser: 'Exeter',        loserSeed: 15,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Concord',          winnerSeed: 10, loser: 'Portsmouth',    loserSeed: 7,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Windham',          winnerSeed: 3,  loser: 'Spaulding',     loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Londonderry',      winnerSeed: 6,  loser: 'Nashua North',  loserSeed: 11,   winnerScore: 3,    loserScore: 2 }
          ],
          quarterFinals: [
            { winner: 'Bedford',          winnerSeed: 1, loser: 'Keene',       loserSeed: 9,  winnerScore: 3, loserScore: 0 },
            { winner: 'Pinkerton',        winnerSeed: 4, loser: 'Dover',       loserSeed: 5,  winnerScore: 3, loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2, loser: 'Concord',     loserSeed: 10, winnerScore: 3, loserScore: 0 },
            { winner: 'Windham',          winnerSeed: 3, loser: 'Londonderry', loserSeed: 6,  winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Bedford',          winnerSeed: 1, loser: 'Pinkerton', loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2, loser: 'Windham',   loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Bedford', winnerSeed: 1, loser: 'Hollis-Brookline', loserSeed: 2, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-II': {
        champion: 'Coe-Brown Northwood', championSeed: 2,
        runnerUp: 'Milford', runnerUpSeed: 4,
        finalScore: '3-0', bracketSize: 16,
        notes: '4-seed Milford upsets 1-seed Gilford in the semi (3-2) to reach the final; Coe-Brown Northwood takes the title.',
        games: {
          firstRound: [
            { winner: 'Gilford',              winnerSeed: 1,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'John Stark',           winnerSeed: 8,  loser: 'Kingswood',        loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Milford',              winnerSeed: 4,  loser: 'Manchester West',  loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Laconia',              winnerSeed: 5,  loser: 'Plymouth',         loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Coe-Brown Northwood',  winnerSeed: 2,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 7,  loser: 'Hanover',          loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Oyster River',         winnerSeed: 3,  loser: 'Bye',              loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Campbell',             winnerSeed: 6,  loser: 'Prospect Mountain', loserSeed: 11,  winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Gilford',             winnerSeed: 1, loser: 'John Stark',            loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Milford',             winnerSeed: 4, loser: 'Laconia',              loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Saint Thomas Aquinas', loserSeed: 7, winnerScore: 3, loserScore: 2 },
            { winner: 'Oyster River',        winnerSeed: 3, loser: 'Campbell',             loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Milford',             winnerSeed: 4, loser: 'Gilford',      loserSeed: 1, winnerScore: 3, loserScore: 2 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Oyster River', loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Coe-Brown Northwood', winnerSeed: 2, loser: 'Milford', loserSeed: 4, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-III': {
        champion: 'Newfound', championSeed: 1,
        runnerUp: 'Mascenic', runnerUpSeed: 2,
        finalScore: '3-0', bracketSize: 11,
        notes: '11-team field (byes to the top 5). 6-seed Inter-Lakes upsets 3-seed Epping in the QF (3-2); 10-seed Farmington upsets 7-seed Moultonborough in the first round. Top two seeds meet in the final.',
        games: {
          firstRound: [
            { winner: 'Newfound',             winnerSeed: 1,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Sunapee',              winnerSeed: 8,  loser: 'Nute',           loserSeed: 9,    winnerScore: 1,    loserScore: 0 },
            { winner: 'Portsmouth Christian', winnerSeed: 4,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Trinity',              winnerSeed: 5,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Mascenic',             winnerSeed: 2,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Farmington',           winnerSeed: 10, loser: 'Moultonborough', loserSeed: 7,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Epping',               winnerSeed: 3,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Inter-Lakes',          winnerSeed: 6,  loser: 'Mascoma Valley', loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Newfound',             winnerSeed: 1, loser: 'Sunapee',    loserSeed: 8,  winnerScore: 3, loserScore: 0 },
            { winner: 'Portsmouth Christian', winnerSeed: 4, loser: 'Trinity',    loserSeed: 5,  winnerScore: 3, loserScore: 0 },
            { winner: 'Mascenic',             winnerSeed: 2, loser: 'Farmington', loserSeed: 10, winnerScore: 3, loserScore: 1 },
            { winner: 'Inter-Lakes',          winnerSeed: 6, loser: 'Epping',     loserSeed: 3,  winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Newfound', winnerSeed: 1, loser: 'Portsmouth Christian', loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Mascenic', winnerSeed: 2, loser: 'Inter-Lakes',          loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Newfound', winnerSeed: 1, loser: 'Mascenic', loserSeed: 2, winnerScore: 3, loserScore: 0 } ]
        }
      }
    }
  },

  // ============================================================
  // 2020 (COVID — abbreviated 4-team playoff: semiFinals + final only)
  // ============================================================
  2020: {
    girls: {
      'D-I': {
        champion: 'Bedford', championSeed: 2,
        runnerUp: 'Hollis-Brookline', runnerUpSeed: 1,
        finalScore: '3-0', bracketSize: 4,
        notes: 'COVID-abbreviated 4-team playoff. 2-seed Bedford sweeps top-seeded Hollis-Brookline in the final.',
        games: {
          firstRound: [],
          quarterFinals: [],
          semiFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Londonderry', loserSeed: 4, winnerScore: 3, loserScore: 1 },
            { winner: 'Bedford',          winnerSeed: 2, loser: 'Spaulding',   loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Bedford', winnerSeed: 2, loser: 'Hollis-Brookline', loserSeed: 1, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-II': {
        champion: 'Gilford', championSeed: 2,
        runnerUp: 'John Stark', runnerUpSeed: 4,
        finalScore: '3-0', bracketSize: 4,
        notes: 'COVID-abbreviated 4-team playoff. 4-seed John Stark upsets top-seeded Saint Thomas Aquinas in the semi (3-0); Gilford wins the final.',
        games: {
          firstRound: [],
          quarterFinals: [],
          semiFinals: [
            { winner: 'John Stark', winnerSeed: 4, loser: 'Saint Thomas Aquinas', loserSeed: 1, winnerScore: 3, loserScore: 0 },
            { winner: 'Gilford',    winnerSeed: 2, loser: 'Campbell',             loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Gilford', winnerSeed: 2, loser: 'John Stark', loserSeed: 4, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-III': {
        champion: 'Newfound', championSeed: 3,
        runnerUp: 'Trinity', runnerUpSeed: 4,
        finalScore: '3-0', bracketSize: 4,
        notes: 'COVID-abbreviated 4-team playoff. Both semis were 3-2 upsets of the higher seed (4-Trinity over 1-Sunapee, 3-Newfound over 2-Farmington); Newfound wins the all-underdog final.',
        games: {
          firstRound: [],
          quarterFinals: [],
          semiFinals: [
            { winner: 'Trinity',  winnerSeed: 4, loser: 'Sunapee',    loserSeed: 1, winnerScore: 3, loserScore: 2 },
            { winner: 'Newfound', winnerSeed: 3, loser: 'Farmington', loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Newfound', winnerSeed: 3, loser: 'Trinity', loserSeed: 4, winnerScore: 3, loserScore: 0 } ]
        }
      }
    }
  },

  // ============================================================
  // 2019
  // ============================================================
  2019: {
    girls: {
      'D-I': {
        champion: 'Nashua South', championSeed: 1,
        runnerUp: 'Dover', runnerUpSeed: 6,
        finalScore: '3-0', bracketSize: 16,
        notes: '6-seed Dover reaches the final, beating 3-Pinkerton (QF 3-2) and 7-Portsmouth (semi 3-2). 7-seed Portsmouth upsets 2-seed Hollis-Brookline in the QF; 9-seed Bedford upsets 8-Salem in the first round.',
        games: {
          firstRound: [
            { winner: 'Nashua South',     winnerSeed: 1,  loser: 'Bye',           loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Bedford',          winnerSeed: 9,  loser: 'Salem',         loserSeed: 8,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Winnacunnet',      winnerSeed: 4,  loser: 'Bishop Guertin', loserSeed: 13,  winnerScore: 3,    loserScore: 0 },
            { winner: 'Spaulding',        winnerSeed: 5,  loser: 'Exeter',        loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 2,  loser: 'Windham',       loserSeed: 15,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Portsmouth',       winnerSeed: 7,  loser: 'Timberlane',    loserSeed: 10,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Pinkerton',        winnerSeed: 3,  loser: 'Alvirne',       loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Dover',            winnerSeed: 6,  loser: 'Nashua North',  loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Nashua South', winnerSeed: 1, loser: 'Bedford',          loserSeed: 9, winnerScore: 3, loserScore: 2 },
            { winner: 'Winnacunnet',  winnerSeed: 4, loser: 'Spaulding',        loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Portsmouth',   winnerSeed: 7, loser: 'Hollis-Brookline', loserSeed: 2, winnerScore: 3, loserScore: 2 },
            { winner: 'Dover',        winnerSeed: 6, loser: 'Pinkerton',        loserSeed: 3, winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Nashua South', winnerSeed: 1, loser: 'Winnacunnet', loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Dover',        winnerSeed: 6, loser: 'Portsmouth',  loserSeed: 7, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Nashua South', winnerSeed: 1, loser: 'Dover', loserSeed: 6, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-II': {
        champion: 'Gilford', championSeed: 1,
        runnerUp: 'Coe-Brown Northwood', runnerUpSeed: 6,
        finalScore: '3-1', bracketSize: 16,
        notes: '10-team field (byes to the top 6). 6-seed Coe-Brown Northwood reaches the final, upsetting 3-John Stark (QF 3-2) and 2-Milford (semi 3-1); Gilford wins the title.',
        games: {
          firstRound: [
            { winner: 'Gilford',              winnerSeed: 1,  loser: 'Bye',       loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Laconia',              winnerSeed: 8,  loser: 'Souhegan',  loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Oyster River',         winnerSeed: 4,  loser: 'Bye',       loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Plymouth',             winnerSeed: 5,  loser: 'Bye',       loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Milford',              winnerSeed: 2,  loser: 'Bye',       loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 7,  loser: 'Kingswood', loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'John Stark',           winnerSeed: 3,  loser: 'Bye',       loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Coe-Brown Northwood',  winnerSeed: 6,  loser: 'Bye',       loserSeed: null, winnerScore: null, loserScore: null }
          ],
          quarterFinals: [
            { winner: 'Gilford',             winnerSeed: 1, loser: 'Laconia',              loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Plymouth',            winnerSeed: 5, loser: 'Oyster River',         loserSeed: 4, winnerScore: 3, loserScore: 2 },
            { winner: 'Milford',             winnerSeed: 2, loser: 'Saint Thomas Aquinas', loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 6, loser: 'John Stark',           loserSeed: 3, winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Gilford',             winnerSeed: 1, loser: 'Plymouth', loserSeed: 5, winnerScore: 3, loserScore: 1 },
            { winner: 'Coe-Brown Northwood', winnerSeed: 6, loser: 'Milford',  loserSeed: 2, winnerScore: 3, loserScore: 1 }
          ],
          final: [ { winner: 'Gilford', winnerSeed: 1, loser: 'Coe-Brown Northwood', loserSeed: 6, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-III': {
        champion: 'Inter-Lakes', championSeed: 1,
        runnerUp: 'Mascenic', runnerUpSeed: 6,
        finalScore: '3-1', bracketSize: 14,
        notes: '6-seed Mascenic runs to the final, upsetting 3-Epping (QF 3-1) and 7-Campbell (semi 3-0). 7-seed Campbell upsets 2-seed Winnisquam in the QF (3-1).',
        games: {
          firstRound: [
            { winner: 'Inter-Lakes',       winnerSeed: 1,  loser: 'Bye',                 loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Farmington',        winnerSeed: 8,  loser: 'Mascoma Valley',      loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Newfound',          winnerSeed: 4,  loser: 'Portsmouth Christian', loserSeed: 13,  winnerScore: 3,    loserScore: 0 },
            { winner: 'Prospect Mountain', winnerSeed: 5,  loser: 'Franklin',            loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Winnisquam',        winnerSeed: 2,  loser: 'Bye',                 loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Campbell',          winnerSeed: 7,  loser: 'Sunapee',             loserSeed: 10,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Epping',            winnerSeed: 3,  loser: 'Belmont',             loserSeed: 14,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Mascenic',          winnerSeed: 6,  loser: 'Moultonborough',      loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Farmington',        loserSeed: 8, winnerScore: 3, loserScore: 2 },
            { winner: 'Newfound',    winnerSeed: 4, loser: 'Prospect Mountain', loserSeed: 5, winnerScore: 3, loserScore: 2 },
            { winner: 'Campbell',    winnerSeed: 7, loser: 'Winnisquam',        loserSeed: 2, winnerScore: 3, loserScore: 1 },
            { winner: 'Mascenic',    winnerSeed: 6, loser: 'Epping',            loserSeed: 3, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Newfound', loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Mascenic',    winnerSeed: 6, loser: 'Campbell', loserSeed: 7, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Mascenic', loserSeed: 6, winnerScore: 3, loserScore: 1 } ]
        }
      }
    }
  },

  // ============================================================
  // 2018
  // ============================================================
  2018: {
    girls: {
      'D-I': {
        champion: 'Hollis-Brookline', championSeed: 1,
        runnerUp: 'Bedford', runnerUpSeed: 6,
        finalScore: '3-1', bracketSize: 16,
        notes: '6-seed Bedford runs to the final, beating 3-Bishop Guertin (QF 3-1) and 2-Nashua South (semi 3-0). 5-seed Spaulding upsets 4-Exeter in the QF; 9-seed Pinkerton upsets 8-Portsmouth in the first round.',
        games: {
          firstRound: [
            { winner: 'Hollis-Brookline', winnerSeed: 1,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Pinkerton',        winnerSeed: 9,  loser: 'Portsmouth',   loserSeed: 8,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Exeter',           winnerSeed: 4,  loser: 'Nashua North', loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Spaulding',        winnerSeed: 5,  loser: 'Timberlane',   loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Nashua South',     winnerSeed: 2,  loser: 'Londonderry',  loserSeed: 15,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Dover',            winnerSeed: 7,  loser: 'Salem',        loserSeed: 10,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Bishop Guertin',   winnerSeed: 3,  loser: 'Windham',      loserSeed: 14,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Bedford',          winnerSeed: 6,  loser: 'Concord',      loserSeed: 11,   winnerScore: 3,    loserScore: 1 }
          ],
          quarterFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Pinkerton',      loserSeed: 9, winnerScore: 3, loserScore: 0 },
            { winner: 'Spaulding',        winnerSeed: 5, loser: 'Exeter',         loserSeed: 4, winnerScore: 3, loserScore: 1 },
            { winner: 'Nashua South',     winnerSeed: 2, loser: 'Dover',          loserSeed: 7, winnerScore: 3, loserScore: 2 },
            { winner: 'Bedford',          winnerSeed: 6, loser: 'Bishop Guertin', loserSeed: 3, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Spaulding',    loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Bedford',          winnerSeed: 6, loser: 'Nashua South', loserSeed: 2, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Bedford', loserSeed: 6, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-II': {
        champion: 'Gilford', championSeed: 1,
        runnerUp: 'Milford', runnerUpSeed: 3,
        finalScore: '3-0', bracketSize: 16,
        notes: '10-team field (byes to the top 6). 5-seed Laconia upsets 4-Saint Thomas Aquinas in the QF (3-1) to reach the semis; 10-seed Souhegan upsets 7-Kingswood in the first round.',
        games: {
          firstRound: [
            { winner: 'Gilford',              winnerSeed: 1,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'John Stark',           winnerSeed: 8,  loser: 'Coe-Brown Northwood', loserSeed: 9,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 4,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Laconia',              winnerSeed: 5,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Oyster River',         winnerSeed: 2,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Souhegan',             winnerSeed: 10, loser: 'Kingswood',          loserSeed: 7,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Milford',              winnerSeed: 3,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Plymouth',             winnerSeed: 6,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null }
          ],
          quarterFinals: [
            { winner: 'Gilford',      winnerSeed: 1, loser: 'John Stark',            loserSeed: 8,  winnerScore: 3, loserScore: 0 },
            { winner: 'Laconia',      winnerSeed: 5, loser: 'Saint Thomas Aquinas', loserSeed: 4,  winnerScore: 3, loserScore: 1 },
            { winner: 'Oyster River', winnerSeed: 2, loser: 'Souhegan',             loserSeed: 10, winnerScore: 3, loserScore: 1 },
            { winner: 'Milford',      winnerSeed: 3, loser: 'Plymouth',             loserSeed: 6,  winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'Laconia',      loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Milford', winnerSeed: 3, loser: 'Oyster River', loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Gilford', winnerSeed: 1, loser: 'Milford', loserSeed: 3, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-III': {
        champion: 'Winnisquam', championSeed: 1,
        runnerUp: 'Inter-Lakes', runnerUpSeed: 3,
        finalScore: '3-0', bracketSize: 14,
        notes: '3-seed Inter-Lakes upsets 2-seed Farmington in the semi (3-2) to reach the final; 9-seed Moultonborough wins a first-round upset over 8-Campbell.',
        games: {
          firstRound: [
            { winner: 'Winnisquam',        winnerSeed: 1,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Moultonborough',    winnerSeed: 9,  loser: 'Campbell',       loserSeed: 8,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Epping',            winnerSeed: 4,  loser: 'Mascoma Valley', loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Prospect Mountain', winnerSeed: 5,  loser: 'Belmont',        loserSeed: 12,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Farmington',        winnerSeed: 2,  loser: 'Bye',            loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Mascenic',          winnerSeed: 7,  loser: 'Fall Mountain',  loserSeed: 10,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Inter-Lakes',       winnerSeed: 3,  loser: 'Sunapee',        loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Newfound',          winnerSeed: 6,  loser: 'Nute',           loserSeed: 11,   winnerScore: 3,    loserScore: 1 }
          ],
          quarterFinals: [
            { winner: 'Winnisquam',  winnerSeed: 1, loser: 'Moultonborough',    loserSeed: 9, winnerScore: 3, loserScore: 1 },
            { winner: 'Epping',      winnerSeed: 4, loser: 'Prospect Mountain', loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Farmington',  winnerSeed: 2, loser: 'Mascenic',          loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Inter-Lakes', winnerSeed: 3, loser: 'Newfound',          loserSeed: 6, winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Winnisquam',  winnerSeed: 1, loser: 'Epping',     loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Inter-Lakes', winnerSeed: 3, loser: 'Farmington', loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Winnisquam', winnerSeed: 1, loser: 'Inter-Lakes', loserSeed: 3, winnerScore: 3, loserScore: 0 } ]
        }
      }
    }
  },

  // ============================================================
  // 2017
  // ============================================================
  2017: {
    girls: {
      'D-I': {
        champion: 'Hollis-Brookline', championSeed: 1,
        runnerUp: 'Bishop Guertin', runnerUpSeed: 3,
        finalScore: '3-1', bracketSize: 16,
        notes: '7-seed Nashua South upsets 2-seed Pinkerton in the QF (3-0) to reach the semis; Bishop Guertin knocks out Nashua South (3-0) to make the final.',
        games: {
          firstRound: [
            { winner: 'Hollis-Brookline', winnerSeed: 1,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Spaulding',        winnerSeed: 8,  loser: 'Bedford',      loserSeed: 9,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Dover',            winnerSeed: 4,  loser: 'Londonderry',  loserSeed: 13,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Salem',            winnerSeed: 5,  loser: 'Nashua North', loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Pinkerton',        winnerSeed: 2,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Nashua South',     winnerSeed: 7,  loser: 'Exeter',       loserSeed: 10,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Bishop Guertin',   winnerSeed: 3,  loser: 'Goffstown',    loserSeed: 14,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Concord',          winnerSeed: 6,  loser: 'Timberlane',   loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Spaulding', loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Dover',            winnerSeed: 4, loser: 'Salem',      loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Nashua South',     winnerSeed: 7, loser: 'Pinkerton',  loserSeed: 2, winnerScore: 3, loserScore: 0 },
            { winner: 'Bishop Guertin',   winnerSeed: 3, loser: 'Concord',    loserSeed: 6, winnerScore: 3, loserScore: 2 }
          ],
          semiFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Dover',        loserSeed: 4, winnerScore: 3, loserScore: 1 },
            { winner: 'Bishop Guertin',   winnerSeed: 3, loser: 'Nashua South', loserSeed: 7, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Bishop Guertin', loserSeed: 3, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-II': {
        champion: 'Windham', championSeed: 3,
        runnerUp: 'Portsmouth', runnerUpSeed: 5,
        finalScore: '3-1', bracketSize: 16,
        notes: 'Cinderella run: 5-seed Portsmouth reaches the final, beating 4-Saint Thomas Aquinas (QF 3-1) and toppling 1-seed Gilford in the semi (3-1). 9-seed Oyster River upsets 8-Laconia in the first round.',
        games: {
          firstRound: [
            { winner: 'Gilford',              winnerSeed: 1,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Oyster River',         winnerSeed: 9,  loser: 'Laconia',            loserSeed: 8,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 4,  loser: 'ConVal',             loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Portsmouth',           winnerSeed: 5,  loser: 'Hanover',            loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Milford',              winnerSeed: 2,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Plymouth',             winnerSeed: 7,  loser: 'Coe-Brown Northwood', loserSeed: 10,  winnerScore: 3,    loserScore: 1 },
            { winner: 'Windham',              winnerSeed: 3,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'John Stark',           winnerSeed: 6,  loser: 'Souhegan',           loserSeed: 11,   winnerScore: 3,    loserScore: 2 }
          ],
          quarterFinals: [
            { winner: 'Gilford',    winnerSeed: 1, loser: 'Oyster River',         loserSeed: 9, winnerScore: 3, loserScore: 2 },
            { winner: 'Portsmouth', winnerSeed: 5, loser: 'Saint Thomas Aquinas', loserSeed: 4, winnerScore: 3, loserScore: 1 },
            { winner: 'Milford',    winnerSeed: 2, loser: 'Plymouth',             loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Windham',    winnerSeed: 3, loser: 'John Stark',           loserSeed: 6, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Portsmouth', winnerSeed: 5, loser: 'Gilford', loserSeed: 1, winnerScore: 3, loserScore: 1 },
            { winner: 'Windham',    winnerSeed: 3, loser: 'Milford', loserSeed: 2, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Windham', winnerSeed: 3, loser: 'Portsmouth', loserSeed: 5, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-III': {
        champion: 'Winnisquam', championSeed: 2,
        runnerUp: 'Inter-Lakes', runnerUpSeed: 1,
        finalScore: '3-0', bracketSize: 14,
        notes: '2-seed Winnisquam sweeps top-seeded Inter-Lakes in the final. 5-seed Newfound upsets 4-Farmington in the QF (3-1); 10-seed Prospect Mountain and 11-seed Belmont each win first-round upsets.',
        games: {
          firstRound: [
            { winner: 'Inter-Lakes',       winnerSeed: 1,  loser: 'Bye',                 loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Moultonborough',    winnerSeed: 8,  loser: 'Pittsfield',          loserSeed: 9,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Farmington',        winnerSeed: 4,  loser: 'Nute',                loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Newfound',          winnerSeed: 5,  loser: 'Sunapee',             loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Winnisquam',        winnerSeed: 2,  loser: 'Bye',                 loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Prospect Mountain', winnerSeed: 10, loser: 'Epping',              loserSeed: 7,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Campbell',          winnerSeed: 3,  loser: 'Portsmouth Christian', loserSeed: 14,  winnerScore: 3,    loserScore: 0 },
            { winner: 'Belmont',           winnerSeed: 11, loser: 'Mascenic',            loserSeed: 6,    winnerScore: 3,    loserScore: 2 }
          ],
          quarterFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 1,  loser: 'Moultonborough',    loserSeed: 8,  winnerScore: 3, loserScore: 0 },
            { winner: 'Newfound',    winnerSeed: 5,  loser: 'Farmington',        loserSeed: 4,  winnerScore: 3, loserScore: 1 },
            { winner: 'Winnisquam',  winnerSeed: 2,  loser: 'Prospect Mountain', loserSeed: 10, winnerScore: 3, loserScore: 0 },
            { winner: 'Campbell',    winnerSeed: 3,  loser: 'Belmont',           loserSeed: 11, winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Inter-Lakes', winnerSeed: 1, loser: 'Newfound', loserSeed: 5, winnerScore: 3, loserScore: 1 },
            { winner: 'Winnisquam',  winnerSeed: 2, loser: 'Campbell', loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Winnisquam', winnerSeed: 2, loser: 'Inter-Lakes', loserSeed: 1, winnerScore: 3, loserScore: 0 } ]
        }
      }
    }
  },

  // ============================================================
  // 2016
  // ============================================================
  2016: {
    girls: {
      'D-I': {
        champion: 'Hollis-Brookline', championSeed: 4,
        runnerUp: 'Concord', runnerUpSeed: 2,
        finalScore: '3-1', bracketSize: 16,
        notes: '4-seed Hollis-Brookline wins the title. 8-seed Exeter upsets 1-seed Spaulding in the QF (3-2) before losing the semi.',
        games: {
          firstRound: [
            { winner: 'Spaulding',        winnerSeed: 1,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Exeter',           winnerSeed: 8,  loser: 'Alvirne',      loserSeed: 9,    winnerScore: 3,    loserScore: 0 },
            { winner: 'Hollis-Brookline', winnerSeed: 4,  loser: 'Pinkerton',    loserSeed: 13,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Bishop Guertin',   winnerSeed: 5,  loser: 'Bedford',      loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Concord',          winnerSeed: 2,  loser: 'Bye',          loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Salem',            winnerSeed: 7,  loser: 'Goffstown',    loserSeed: 10,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Dover',            winnerSeed: 3,  loser: 'Nashua North', loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Merrimack',        winnerSeed: 6,  loser: 'Nashua South', loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Exeter',           winnerSeed: 8, loser: 'Spaulding',      loserSeed: 1, winnerScore: 3, loserScore: 2 },
            { winner: 'Hollis-Brookline', winnerSeed: 4, loser: 'Bishop Guertin', loserSeed: 5, winnerScore: 3, loserScore: 1 },
            { winner: 'Concord',          winnerSeed: 2, loser: 'Salem',          loserSeed: 7, winnerScore: 3, loserScore: 2 },
            { winner: 'Dover',            winnerSeed: 3, loser: 'Merrimack',      loserSeed: 6, winnerScore: 3, loserScore: 0 }
          ],
          semiFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 4, loser: 'Exeter', loserSeed: 8, winnerScore: 3, loserScore: 0 },
            { winner: 'Concord',          winnerSeed: 2, loser: 'Dover',  loserSeed: 3, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Hollis-Brookline', winnerSeed: 4, loser: 'Concord', loserSeed: 2, winnerScore: 3, loserScore: 1 } ]
        }
      },
      'D-II': {
        champion: 'Windham', championSeed: 1,
        runnerUp: 'Somersworth', runnerUpSeed: 3,
        finalScore: '3-0', bracketSize: 16,
        notes: 'Chalk run for top-seeded Windham. 9-seed Oyster River upsets 8-Coe-Brown Northwood in the first round to reach the QF.',
        games: {
          firstRound: [
            { winner: 'Windham',              winnerSeed: 1,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Oyster River',         winnerSeed: 9,  loser: 'Coe-Brown Northwood', loserSeed: 8,   winnerScore: 3,    loserScore: 2 },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 4,  loser: 'Pelham',             loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'John Stark',           winnerSeed: 5,  loser: 'ConVal',             loserSeed: 12,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Gilford',              winnerSeed: 2,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Milford',              winnerSeed: 7,  loser: 'Laconia',            loserSeed: 10,   winnerScore: 3,    loserScore: 1 },
            { winner: 'Somersworth',          winnerSeed: 3,  loser: 'Bye',                loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Kingswood',            winnerSeed: 6,  loser: 'Plymouth',           loserSeed: 11,   winnerScore: 3,    loserScore: 0 }
          ],
          quarterFinals: [
            { winner: 'Windham',              winnerSeed: 1, loser: 'Oyster River', loserSeed: 9, winnerScore: 3, loserScore: 0 },
            { winner: 'Saint Thomas Aquinas', winnerSeed: 4, loser: 'John Stark',   loserSeed: 5, winnerScore: 3, loserScore: 0 },
            { winner: 'Gilford',              winnerSeed: 2, loser: 'Milford',      loserSeed: 7, winnerScore: 3, loserScore: 0 },
            { winner: 'Somersworth',          winnerSeed: 3, loser: 'Kingswood',    loserSeed: 6, winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Windham',     winnerSeed: 1, loser: 'Saint Thomas Aquinas', loserSeed: 4, winnerScore: 3, loserScore: 0 },
            { winner: 'Somersworth', winnerSeed: 3, loser: 'Gilford',              loserSeed: 2, winnerScore: 3, loserScore: 0 }
          ],
          final: [ { winner: 'Windham', winnerSeed: 1, loser: 'Somersworth', loserSeed: 3, winnerScore: 3, loserScore: 0 } ]
        }
      },
      'D-III': {
        champion: 'Moultonborough', championSeed: 5,
        runnerUp: 'Farmington', runnerUpSeed: 3,
        finalScore: '3-2', bracketSize: 14,
        notes: 'Cinderella title: 5-seed Moultonborough wins the championship, and 9-seed Campbell runs to the semis (over 8-Sunapee and 1-Nute). 10-seed Portsmouth Christian upsets 7-Belmont in the first round.',
        games: {
          firstRound: [
            { winner: 'Nute',                 winnerSeed: 1,  loser: 'Bye',               loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Campbell',             winnerSeed: 9,  loser: 'Sunapee',           loserSeed: 8,    winnerScore: 3,    loserScore: 2 },
            { winner: 'Inter-Lakes',          winnerSeed: 4,  loser: 'Prospect Mountain', loserSeed: 13,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Moultonborough',       winnerSeed: 5,  loser: 'Newfound',          loserSeed: 12,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Winnisquam',           winnerSeed: 2,  loser: 'Bye',               loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Portsmouth Christian', winnerSeed: 10, loser: 'Belmont',           loserSeed: 7,    winnerScore: 3,    loserScore: 1 },
            { winner: 'Farmington',           winnerSeed: 3,  loser: 'Raymond',           loserSeed: 14,   winnerScore: 3,    loserScore: 0 },
            { winner: 'Mascenic',             winnerSeed: 6,  loser: 'Epping',            loserSeed: 11,   winnerScore: 3,    loserScore: 2 }
          ],
          quarterFinals: [
            { winner: 'Campbell',       winnerSeed: 9, loser: 'Nute',                 loserSeed: 1,  winnerScore: 3, loserScore: 2 },
            { winner: 'Moultonborough', winnerSeed: 5, loser: 'Inter-Lakes',          loserSeed: 4,  winnerScore: 3, loserScore: 1 },
            { winner: 'Winnisquam',     winnerSeed: 2, loser: 'Portsmouth Christian', loserSeed: 10, winnerScore: 3, loserScore: 0 },
            { winner: 'Farmington',     winnerSeed: 3, loser: 'Mascenic',             loserSeed: 6,  winnerScore: 3, loserScore: 1 }
          ],
          semiFinals: [
            { winner: 'Moultonborough', winnerSeed: 5, loser: 'Campbell',   loserSeed: 9, winnerScore: 3, loserScore: 0 },
            { winner: 'Farmington',     winnerSeed: 3, loser: 'Winnisquam', loserSeed: 2, winnerScore: 3, loserScore: 2 }
          ],
          final: [ { winner: 'Moultonborough', winnerSeed: 5, loser: 'Farmington', loserSeed: 3, winnerScore: 3, loserScore: 2 } ]
        }
      }
    }
  }

};
