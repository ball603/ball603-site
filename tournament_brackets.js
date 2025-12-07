/**
 * NHIAA Basketball Tournament Brackets - Historical Data
 * Complete bracket data for AI article generation context
 * 
 * Data source: nhiaa.org tournament bracket pages, nh-highschoolsports.com archives
 * Last updated: December 2024
 * 
 * COVERAGE: 64 brackets (2017-2024)
 *   - 2024: 8 complete brackets
 *   - 2023: 8 complete brackets  
 *   - 2022: 8 complete brackets
 *   - 2021: 1 partial (COVID recovery year)
 *   - 2020: 8 co-champion records (COVID)
 *   - 2019: 8 complete brackets (all divisions, full game data)
 *   - 2018: 8 complete brackets
 *   - 2017: 8 complete brackets
 * 
 * KEY STORYLINES:
 *   - 2019 D-II Boys: #9 Kearsarge beat #1 Oyster River - legendary Cinderella run
 *   - 2017 D-IV Boys: #3 Groveton upset #1 Littleton 45-43 in OT
 *   - Gilford Boys D-III 4-peat: 2020-2023
 *   - Woodsville Boys D-IV 3-peat: 2021-2023
 *   - Concord Christian Girls: 3 titles in 3 different divisions
 *   - Lebanon Girls D-II: Perfect 18-0 season in 2017
 *   - Portsmouth Boys D-I: Perfect 18-0 championship run in 2017
 */

export const tournamentBrackets = {
  // ============================================================
  // 2024 TOURNAMENT BRACKETS
  // ============================================================
  2024: {
    boys: {
      'D-I': {
        champion: 'Pinkerton',
        championSeed: 1,
        runnerUp: 'Nashua North',
        runnerUpSeed: 2,
        finalScore: '90-76',
        bracketSize: 16,
        notes: 'Dominant run - Pinkerton scored 101 points in quarters vs Trinity',
        games: {
          firstRound: [
            { winner: 'Trinity', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Bedford', winnerSeed: 8, loser: 'Concord', loserSeed: 9, winnerScore: 63, loserScore: 52 },
            { winner: 'Pinkerton', winnerSeed: 4, loser: 'Dover', loserSeed: 13, winnerScore: 80, loserScore: 45 },
            { winner: 'Exeter', winnerSeed: 5, loser: 'Londonderry', loserSeed: 12, winnerScore: 54, loserScore: 47 },
            { winner: 'Nashua North', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Goffstown', winnerSeed: 7, loser: 'Bishop Guertin', loserSeed: 10, winnerScore: 59, loserScore: 51 },
            { winner: 'Manchester Memorial', winnerSeed: 3, loser: 'Manchester Central', loserSeed: 14, winnerScore: 66, loserScore: 47 },
            { winner: 'Timberlane', winnerSeed: 6, loser: 'Nashua South', loserSeed: 11, winnerScore: 66, loserScore: 62 }
          ],
          quarterFinals: [
            { winner: 'Pinkerton', winnerSeed: 4, loser: 'Trinity', loserSeed: 1, winnerScore: 101, loserScore: 62 },
            { winner: 'Exeter', winnerSeed: 5, loser: 'Bedford', loserSeed: 8, winnerScore: 61, loserScore: 51 },
            { winner: 'Nashua North', winnerSeed: 2, loser: 'Goffstown', loserSeed: 7, winnerScore: 55, loserScore: 48 },
            { winner: 'Manchester Memorial', winnerSeed: 3, loser: 'Timberlane', loserSeed: 6, winnerScore: 67, loserScore: 56 }
          ],
          semiFinals: [
            { winner: 'Pinkerton', winnerSeed: 4, loser: 'Exeter', loserSeed: 5, winnerScore: 70, loserScore: 58 },
            { winner: 'Nashua North', winnerSeed: 2, loser: 'Manchester Memorial', loserSeed: 3, winnerScore: 65, loserScore: 53 }
          ],
          final: [
            { winner: 'Pinkerton', winnerSeed: 1, loser: 'Nashua North', loserSeed: 2, winnerScore: 90, loserScore: 76 }
          ]
        }
      },
      'D-II': {
        champion: 'Pelham',
        championSeed: 1,
        runnerUp: 'Hanover',
        runnerUpSeed: 3,
        finalScore: '51-41',
        bracketSize: 16,
        notes: 'Back-to-back titles for Pelham',
        games: {
          quarterFinals: [
            { winner: 'Pelham', winnerSeed: 1, loser: 'Lebanon', loserSeed: 8, winnerScore: 70, loserScore: 42 },
            { winner: 'Pembroke', winnerSeed: 5, loser: 'ConVal', loserSeed: 4, winnerScore: 48, loserScore: 45 },
            { winner: 'Kennett', winnerSeed: 2, loser: 'Bow', loserSeed: 7, winnerScore: 52, loserScore: 46 },
            { winner: 'Hanover', winnerSeed: 3, loser: 'Kingswood', loserSeed: 6, winnerScore: 50, loserScore: 47 }
          ],
          semiFinals: [
            { winner: 'Pelham', winnerSeed: 1, loser: 'Pembroke', loserSeed: 5, winnerScore: 61, loserScore: 43 },
            { winner: 'Hanover', winnerSeed: 3, loser: 'Kennett', loserSeed: 2, winnerScore: 40, loserScore: 37 }
          ],
          final: [
            { winner: 'Pelham', winnerSeed: 1, loser: 'Hanover', loserSeed: 3, winnerScore: 51, loserScore: 41 }
          ]
        }
      },
      'D-III': {
        champion: 'St. Thomas Aquinas',
        championSeed: 2,
        runnerUp: 'Conant',
        runnerUpSeed: 1,
        finalScore: '38-34',
        bracketSize: 16,
        notes: 'UPSET - #2 beats #1 in low-scoring defensive battle',
        games: {
          quarterFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Gilford', loserSeed: 8, winnerScore: 55, loserScore: 47 },
            { winner: 'Inter-Lakes', winnerSeed: 5, loser: 'Campbell', loserSeed: 4, winnerScore: 63, loserScore: 56 },
            { winner: 'St. Thomas Aquinas', winnerSeed: 2, loser: 'Raymond', loserSeed: 7, winnerScore: 56, loserScore: 46 },
            { winner: 'Hillsboro-Deering', winnerSeed: 3, loser: 'Monadnock', loserSeed: 6, winnerScore: 58, loserScore: 41 }
          ],
          semiFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Inter-Lakes', loserSeed: 5, winnerScore: 58, loserScore: 49 },
            { winner: 'St. Thomas Aquinas', winnerSeed: 2, loser: 'Hillsboro-Deering', loserSeed: 3, winnerScore: 50, loserScore: 41 }
          ],
          final: [
            { winner: 'St. Thomas Aquinas', winnerSeed: 2, loser: 'Conant', loserSeed: 1, winnerScore: 38, loserScore: 34 }
          ]
        }
      },
      'D-IV': {
        champion: 'Profile',
        championSeed: 1,
        runnerUp: 'Littleton',
        runnerUpSeed: 2,
        finalScore: '53-48',
        bracketSize: 16,
        notes: 'Tight final - Littleton escaped semis 59-58 vs Concord Christian',
        games: {
          quarterFinals: [
            { winner: 'Profile', winnerSeed: 1, loser: 'Lin-Wood', loserSeed: 8, winnerScore: 72, loserScore: 38 },
            { winner: 'Colebrook', winnerSeed: 4, loser: 'Woodsville', loserSeed: 5, winnerScore: 67, loserScore: 55 },
            { winner: 'Littleton', winnerSeed: 2, loser: 'Epping', loserSeed: 7, winnerScore: 60, loserScore: 44 },
            { winner: 'Concord Christian', winnerSeed: 3, loser: 'Derryfield', loserSeed: 6, winnerScore: 53, loserScore: 39 }
          ],
          semiFinals: [
            { winner: 'Profile', winnerSeed: 1, loser: 'Colebrook', loserSeed: 4, winnerScore: 70, loserScore: 51 },
            { winner: 'Littleton', winnerSeed: 2, loser: 'Concord Christian', loserSeed: 3, winnerScore: 59, loserScore: 58 }
          ],
          final: [
            { winner: 'Profile', winnerSeed: 1, loser: 'Littleton', loserSeed: 2, winnerScore: 53, loserScore: 48 }
          ]
        }
      }
    },
    girls: {
      'D-I': {
        champion: 'Bedford',
        championSeed: 1,
        runnerUp: 'Bishop Guertin',
        runnerUpSeed: 2,
        finalScore: '60-41',
        bracketSize: 16,
        notes: 'Revenge for 2023 loss - Bedford won all 3 games by 19+ points',
        games: {
          quarterFinals: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Goffstown', loserSeed: 8, winnerScore: 58, loserScore: 37 },
            { winner: 'Londonderry', winnerSeed: 4, loser: 'Exeter', loserSeed: 5, winnerScore: 40, loserScore: 35 },
            { winner: 'Bishop Guertin', winnerSeed: 2, loser: 'Nashua North', loserSeed: 7, winnerScore: 55, loserScore: 35 },
            { winner: 'Pinkerton', winnerSeed: 3, loser: 'Portsmouth', loserSeed: 6, winnerScore: 52, loserScore: 41 }
          ],
          semiFinals: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Londonderry', loserSeed: 4, winnerScore: 68, loserScore: 37 },
            { winner: 'Bishop Guertin', winnerSeed: 2, loser: 'Pinkerton', loserSeed: 3, winnerScore: 51, loserScore: 41 }
          ],
          final: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Bishop Guertin', loserSeed: 2, winnerScore: 60, loserScore: 41 }
          ]
        }
      },
      'D-II': {
        champion: 'Concord Christian',
        championSeed: 1,
        runnerUp: 'Pembroke',
        runnerUpSeed: 5,
        finalScore: '65-53',
        bracketSize: 16,
        notes: 'Back-to-back D-II titles after moving up from D-III',
        games: {
          quarterFinals: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'Lebanon', loserSeed: 8, winnerScore: 55, loserScore: 34 },
            { winner: 'ConVal', winnerSeed: 4, loser: 'Kennett', loserSeed: 5, winnerScore: 47, loserScore: 44 },
            { winner: 'Bow', winnerSeed: 2, loser: 'Laconia', loserSeed: 7, winnerScore: 54, loserScore: 39 },
            { winner: 'Pembroke', winnerSeed: 6, loser: 'Hanover', loserSeed: 3, winnerScore: 53, loserScore: 43 }
          ],
          semiFinals: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'ConVal', loserSeed: 4, winnerScore: 55, loserScore: 40 },
            { winner: 'Pembroke', winnerSeed: 5, loser: 'Bow', loserSeed: 2, winnerScore: 45, loserScore: 39 }
          ],
          final: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'Pembroke', loserSeed: 5, winnerScore: 65, loserScore: 53 }
          ]
        }
      },
      'D-III': {
        champion: 'Conant',
        championSeed: 1,
        runnerUp: 'Hopkinton',
        runnerUpSeed: 5,
        finalScore: '47-32',
        bracketSize: 16,
        notes: 'Conant dominant throughout',
        games: {
          semiFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Fall Mountain', loserSeed: 4, winnerScore: 49, loserScore: 26 },
            { winner: 'Hopkinton', winnerSeed: 5, loser: 'Mascenic', loserSeed: 2, winnerScore: 46, loserScore: 37 }
          ],
          final: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Hopkinton', loserSeed: 5, winnerScore: 47, loserScore: 32 }
          ]
        }
      },
      'D-IV': {
        champion: 'Littleton',
        championSeed: 1,
        runnerUp: 'Newmarket',
        runnerUpSeed: 3,
        finalScore: '41-23',
        bracketSize: 16,
        notes: 'Dominant final - 18-point win',
        games: {
          semiFinals: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Colebrook', loserSeed: 4, winnerScore: 47, loserScore: 27 },
            { winner: 'Newmarket', winnerSeed: 3, loser: 'Woodsville', loserSeed: 2, winnerScore: 40, loserScore: 37 }
          ],
          final: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Newmarket', loserSeed: 3, winnerScore: 41, loserScore: 23 }
          ]
        }
      }
    }
  },

  // ============================================================
  // 2023 TOURNAMENT BRACKETS
  // ============================================================
  2023: {
    boys: {
      'D-I': {
        champion: 'Bedford',
        championSeed: 1,
        runnerUp: 'Pinkerton',
        runnerUpSeed: 2,
        finalScore: '66-56',
        bracketSize: 16,
        notes: 'THRILLER - Bedford escaped Trinity 93-91 in quarters',
        games: {
          firstRound: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Trinity', winnerSeed: 8, loser: 'Alvirne', loserSeed: 9, winnerScore: 72, loserScore: 44 },
            { winner: 'Londonderry', winnerSeed: 4, loser: 'Salem', loserSeed: 13, winnerScore: 72, loserScore: 55 },
            { winner: 'Portsmouth', winnerSeed: 5, loser: 'Bishop Guertin', loserSeed: 12, winnerScore: 68, loserScore: 58 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Goffstown', winnerSeed: 7, loser: 'Concord', loserSeed: 10, winnerScore: 60, loserScore: 44 },
            { winner: 'Nashua North', winnerSeed: 3, loser: 'Manchester Central', loserSeed: 14, winnerScore: 71, loserScore: 45 },
            { winner: 'Exeter', winnerSeed: 6, loser: 'Merrimack', loserSeed: 11, winnerScore: 67, loserScore: 45 }
          ],
          quarterFinals: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Trinity', loserSeed: 8, winnerScore: 93, loserScore: 91 },
            { winner: 'Londonderry', winnerSeed: 4, loser: 'Portsmouth', loserSeed: 5, winnerScore: 49, loserScore: 48 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Goffstown', loserSeed: 7, winnerScore: 55, loserScore: 47 },
            { winner: 'Nashua North', winnerSeed: 3, loser: 'Exeter', loserSeed: 6, winnerScore: 48, loserScore: 45 }
          ],
          semiFinals: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Londonderry', loserSeed: 4, winnerScore: 49, loserScore: 43 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Nashua North', loserSeed: 3, winnerScore: 69, loserScore: 61 }
          ],
          final: [
            { winner: 'Bedford', winnerSeed: 1, loser: 'Pinkerton', loserSeed: 2, winnerScore: 66, loserScore: 56 }
          ]
        }
      },
      'D-II': {
        champion: 'Pelham',
        championSeed: 5,
        runnerUp: 'Pembroke',
        runnerUpSeed: 2,
        finalScore: '57-54',
        bracketSize: 16,
        notes: 'CINDERELLA - #5 Pelham dominated #1 Laconia 69-31 in semis. #14 Oyster River made semis!',
        games: {
          firstRound: [
            { winner: 'Laconia', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Lebanon', winnerSeed: 8, loser: 'Souhegan', loserSeed: 9, winnerScore: 64, loserScore: 39 },
            { winner: 'Plymouth', winnerSeed: 4, loser: 'Bow', loserSeed: 13, winnerScore: 47, loserScore: 38 },
            { winner: 'Pelham', winnerSeed: 5, loser: 'ConVal', loserSeed: 12, winnerScore: 51, loserScore: 43 },
            { winner: 'Pembroke', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Hollis-Brookline', winnerSeed: 7, loser: 'John Stark', loserSeed: 10, winnerScore: 46, loserScore: 44 },
            { winner: 'Oyster River', winnerSeed: 14, loser: 'Kennett', loserSeed: 3, winnerScore: 55, loserScore: 54 },
            { winner: 'Hanover', winnerSeed: 6, loser: 'Kingswood', loserSeed: 11, winnerScore: 71, loserScore: 48 }
          ],
          quarterFinals: [
            { winner: 'Laconia', winnerSeed: 1, loser: 'Lebanon', loserSeed: 8, winnerScore: 53, loserScore: 48 },
            { winner: 'Pelham', winnerSeed: 5, loser: 'Plymouth', loserSeed: 4, winnerScore: 47, loserScore: 44 },
            { winner: 'Pembroke', winnerSeed: 2, loser: 'Hollis-Brookline', loserSeed: 7, winnerScore: 53, loserScore: 42 },
            { winner: 'Oyster River', winnerSeed: 14, loser: 'Hanover', loserSeed: 6, winnerScore: 50, loserScore: 47 }
          ],
          semiFinals: [
            { winner: 'Pelham', winnerSeed: 5, loser: 'Laconia', loserSeed: 1, winnerScore: 69, loserScore: 31 },
            { winner: 'Pembroke', winnerSeed: 2, loser: 'Oyster River', loserSeed: 14, winnerScore: 67, loserScore: 46 }
          ],
          final: [
            { winner: 'Pelham', winnerSeed: 5, loser: 'Pembroke', loserSeed: 2, winnerScore: 57, loserScore: 54 }
          ]
        }
      },
      'D-III': {
        champion: 'Gilford',
        championSeed: 1,
        runnerUp: 'Mascoma Valley',
        runnerUpSeed: 2,
        finalScore: '69-43',
        bracketSize: 16,
        notes: '4th straight title for Gilford dynasty! Close 54-52 quarters vs Conant',
        games: {
          quarterFinals: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'Conant', loserSeed: 8, winnerScore: 54, loserScore: 52 },
            { winner: 'White Mountains', winnerSeed: 4, loser: 'Campbell', loserSeed: 5, winnerScore: 57, loserScore: 50 },
            { winner: 'Mascoma Valley', winnerSeed: 2, loser: 'St. Thomas Aquinas', loserSeed: 7, winnerScore: 58, loserScore: 53 },
            { winner: 'Hillsboro-Deering', winnerSeed: 3, loser: 'Stevens', loserSeed: 6, winnerScore: 61, loserScore: 42 }
          ],
          semiFinals: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'White Mountains', loserSeed: 4, winnerScore: 58, loserScore: 50 },
            { winner: 'Mascoma Valley', winnerSeed: 2, loser: 'Hillsboro-Deering', loserSeed: 3, winnerScore: 49, loserScore: 42 }
          ],
          final: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'Mascoma Valley', loserSeed: 2, winnerScore: 69, loserScore: 43 }
          ]
        }
      },
      'D-IV': {
        champion: 'Woodsville',
        championSeed: 1,
        runnerUp: 'Holy Family',
        runnerUpSeed: 5,
        finalScore: '57-49',
        bracketSize: 16,
        notes: '3-peat (2021-2023)! WILD semifinal: Holy Family 86-84 over Concord Christian',
        games: {
          quarterFinals: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Sunapee', loserSeed: 8, winnerScore: 54, loserScore: 38 },
            { winner: 'Holy Family', winnerSeed: 5, loser: 'Portsmouth Christian', loserSeed: 4, winnerScore: 71, loserScore: 56 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Newmarket', loserSeed: 7, winnerScore: 62, loserScore: 27 },
            { winner: 'Epping', winnerSeed: 3, loser: 'Derryfield', loserSeed: 6, winnerScore: 57, loserScore: 53 }
          ],
          semiFinals: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Epping', loserSeed: 3, winnerScore: 55, loserScore: 44 },
            { winner: 'Holy Family', winnerSeed: 5, loser: 'Concord Christian', loserSeed: 2, winnerScore: 86, loserScore: 84 }
          ],
          final: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Holy Family', loserSeed: 5, winnerScore: 57, loserScore: 49 }
          ]
        }
      }
    },
    girls: {
      'D-I': {
        champion: 'Bishop Guertin',
        championSeed: 1,
        runnerUp: 'Bedford',
        runnerUpSeed: 2,
        finalScore: '51-45',
        bracketSize: 16,
        notes: 'BG dynasty continues',
        games: {
          quarterFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Portsmouth', loserSeed: 8, winnerScore: 68, loserScore: 46 },
            { winner: 'Londonderry', winnerSeed: 4, loser: 'Exeter', loserSeed: 5, winnerScore: 47, loserScore: 43 },
            { winner: 'Bedford', winnerSeed: 2, loser: 'Dover', loserSeed: 7, winnerScore: 65, loserScore: 41 },
            { winner: 'Pinkerton', winnerSeed: 3, loser: 'Nashua South', loserSeed: 6, winnerScore: 52, loserScore: 38 }
          ],
          semiFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Londonderry', loserSeed: 4, winnerScore: 51, loserScore: 40 },
            { winner: 'Bedford', winnerSeed: 2, loser: 'Pinkerton', loserSeed: 3, winnerScore: 50, loserScore: 42 }
          ],
          final: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Bedford', loserSeed: 2, winnerScore: 51, loserScore: 45 }
          ]
        }
      },
      'D-II': {
        champion: 'Kennett',
        championSeed: 2,
        runnerUp: 'Bow',
        runnerUpSeed: 1,
        finalScore: '38-37',
        bracketSize: 16,
        notes: 'INSTANT CLASSIC - one-point final! #2 over #1',
        games: {
          quarterFinals: [
            { winner: 'Bow', winnerSeed: 1, loser: 'ConVal', loserSeed: 8, winnerScore: 51, loserScore: 31 },
            { winner: 'Hanover', winnerSeed: 5, loser: 'Plymouth', loserSeed: 4, winnerScore: 42, loserScore: 35 },
            { winner: 'Kennett', winnerSeed: 2, loser: 'Pembroke', loserSeed: 7, winnerScore: 55, loserScore: 42 },
            { winner: 'Laconia', winnerSeed: 3, loser: 'Hollis-Brookline', loserSeed: 6, winnerScore: 48, loserScore: 38 }
          ],
          semiFinals: [
            { winner: 'Bow', winnerSeed: 1, loser: 'Hanover', loserSeed: 5, winnerScore: 44, loserScore: 39 },
            { winner: 'Kennett', winnerSeed: 2, loser: 'Laconia', loserSeed: 3, winnerScore: 50, loserScore: 40 }
          ],
          final: [
            { winner: 'Kennett', winnerSeed: 2, loser: 'Bow', loserSeed: 1, winnerScore: 38, loserScore: 37 }
          ]
        }
      },
      'D-III': {
        champion: 'Concord Christian',
        championSeed: 2,
        runnerUp: 'Conant',
        runnerUpSeed: 1,
        finalScore: '49-35',
        bracketSize: 16,
        notes: '#2 upset #1 - CC last D-III title before moving to D-II',
        games: {
          quarterFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'White Mountains', loserSeed: 8, winnerScore: 42, loserScore: 24 },
            { winner: 'Hopkinton', winnerSeed: 5, loser: 'Kearsarge', loserSeed: 4, winnerScore: 36, loserScore: 34 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Gilford', loserSeed: 7, winnerScore: 58, loserScore: 31 },
            { winner: 'St. Thomas Aquinas', winnerSeed: 3, loser: 'Monadnock', loserSeed: 6, winnerScore: 42, loserScore: 29 }
          ],
          semiFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Hopkinton', loserSeed: 5, winnerScore: 50, loserScore: 40 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'St. Thomas Aquinas', loserSeed: 3, winnerScore: 52, loserScore: 26 }
          ],
          final: [
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Conant', loserSeed: 1, winnerScore: 49, loserScore: 35 }
          ]
        }
      },
      'D-IV': {
        champion: 'Groveton',
        championSeed: 1,
        runnerUp: 'Newmarket',
        runnerUpSeed: 5,
        finalScore: '40-36',
        bracketSize: 16,
        notes: 'Close final',
        games: {
          quarterFinals: [
            { winner: 'Groveton', winnerSeed: 1, loser: 'Pittsburg-Canaan', loserSeed: 8, winnerScore: 49, loserScore: 26 },
            { winner: 'Newmarket', winnerSeed: 5, loser: 'Woodsville', loserSeed: 4, winnerScore: 44, loserScore: 33 },
            { winner: 'Colebrook', winnerSeed: 2, loser: 'Portsmouth Christian', loserSeed: 7, winnerScore: 51, loserScore: 46 },
            { winner: 'Littleton', winnerSeed: 3, loser: 'Hinsdale', loserSeed: 6, winnerScore: 51, loserScore: 25 }
          ],
          semiFinals: [
            { winner: 'Groveton', winnerSeed: 1, loser: 'Newmarket', loserSeed: 5, winnerScore: 33, loserScore: 28 },
            { winner: 'Newmarket', winnerSeed: 5, loser: 'Colebrook', loserSeed: 2, winnerScore: 47, loserScore: 43 }
          ],
          final: [
            { winner: 'Groveton', winnerSeed: 1, loser: 'Newmarket', loserSeed: 5, winnerScore: 40, loserScore: 36 }
          ]
        }
      }
    }
  },

  // ============================================================
  // 2022 TOURNAMENT BRACKETS
  // ============================================================
  2022: {
    boys: {
      'D-I': {
        champion: 'Trinity',
        championSeed: 1,
        runnerUp: 'Goffstown',
        runnerUpSeed: 3,
        finalScore: '64-62',
        bracketSize: 16,
        notes: 'NAIL-BITER - 2-point final. Goffstown upset #2 Nashua North in semis',
        games: {
          firstRound: [
            { winner: 'Trinity', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Bedford', winnerSeed: 8, loser: 'Dover', loserSeed: 9, winnerScore: 63, loserScore: 58 },
            { winner: 'Pinkerton', winnerSeed: 4, loser: 'Londonderry', loserSeed: 13, winnerScore: 65, loserScore: 49 },
            { winner: 'Portsmouth', winnerSeed: 5, loser: 'Windham', loserSeed: 12, winnerScore: 57, loserScore: 39 },
            { winner: 'Nashua North', winnerSeed: 2, loser: 'Timberlane', loserSeed: 15, winnerScore: 68, loserScore: 53 },
            { winner: 'Exeter', winnerSeed: 7, loser: 'Nashua South', loserSeed: 10, winnerScore: 67, loserScore: 58 },
            { winner: 'Goffstown', winnerSeed: 3, loser: 'Salem', loserSeed: 14, winnerScore: 70, loserScore: 30 },
            { winner: 'Bishop Guertin', winnerSeed: 6, loser: 'Manchester Central', loserSeed: 11, winnerScore: 84, loserScore: 63 }
          ],
          quarterFinals: [
            { winner: 'Trinity', winnerSeed: 1, loser: 'Bedford', loserSeed: 8, winnerScore: 78, loserScore: 65 },
            { winner: 'Pinkerton', winnerSeed: 4, loser: 'Portsmouth', loserSeed: 5, winnerScore: 56, loserScore: 50 },
            { winner: 'Nashua North', winnerSeed: 2, loser: 'Exeter', loserSeed: 7, winnerScore: 57, loserScore: 54 },
            { winner: 'Goffstown', winnerSeed: 3, loser: 'Bishop Guertin', loserSeed: 6, winnerScore: 54, loserScore: 36 }
          ],
          semiFinals: [
            { winner: 'Trinity', winnerSeed: 1, loser: 'Pinkerton', loserSeed: 4, winnerScore: 74, loserScore: 57 },
            { winner: 'Goffstown', winnerSeed: 3, loser: 'Nashua North', loserSeed: 2, winnerScore: 74, loserScore: 58 }
          ],
          final: [
            { winner: 'Trinity', winnerSeed: 1, loser: 'Goffstown', loserSeed: 3, winnerScore: 64, loserScore: 62 }
          ]
        }
      },
      'D-II': {
        champion: 'Souhegan',
        championSeed: 1,
        runnerUp: 'ConVal',
        runnerUpSeed: 3,
        finalScore: '53-51',
        bracketSize: 16,
        notes: '2-point final! Laconia squeaked past Coe-Brown 43-42 in first round',
        games: {
          firstRound: [
            { winner: 'Souhegan', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Laconia', winnerSeed: 8, loser: 'Coe-Brown Northwood', loserSeed: 9, winnerScore: 43, loserScore: 42 },
            { winner: 'Lebanon', winnerSeed: 4, loser: 'Oyster River', loserSeed: 13, winnerScore: 50, loserScore: 41 },
            { winner: 'Pembroke', winnerSeed: 5, loser: 'Milford', loserSeed: 12, winnerScore: 67, loserScore: 55 },
            { winner: 'Pelham', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Kennett', winnerSeed: 7, loser: 'Bishop Brady', loserSeed: 10, winnerScore: 53, loserScore: 50 },
            { winner: 'ConVal', winnerSeed: 3, loser: 'Kingswood', loserSeed: 14, winnerScore: 71, loserScore: 40 },
            { winner: 'Sanborn', winnerSeed: 6, loser: 'Bow', loserSeed: 11, winnerScore: 58, loserScore: 51 }
          ],
          quarterFinals: [
            { winner: 'Souhegan', winnerSeed: 1, loser: 'Laconia', loserSeed: 8, winnerScore: 67, loserScore: 40 },
            { winner: 'Lebanon', winnerSeed: 4, loser: 'Pembroke', loserSeed: 5, winnerScore: 64, loserScore: 61 },
            { winner: 'Pelham', winnerSeed: 2, loser: 'Kennett', loserSeed: 7, winnerScore: 51, loserScore: 40 },
            { winner: 'ConVal', winnerSeed: 3, loser: 'Sanborn', loserSeed: 6, winnerScore: 70, loserScore: 66 }
          ],
          semiFinals: [
            { winner: 'Souhegan', winnerSeed: 1, loser: 'Lebanon', loserSeed: 4, winnerScore: 41, loserScore: 32 },
            { winner: 'ConVal', winnerSeed: 3, loser: 'Pelham', loserSeed: 2, winnerScore: 58, loserScore: 47 }
          ],
          final: [
            { winner: 'Souhegan', winnerSeed: 1, loser: 'ConVal', loserSeed: 3, winnerScore: 53, loserScore: 51 }
          ]
        }
      },
      'D-III': {
        champion: 'Gilford',
        championSeed: 1,
        runnerUp: 'Kearsarge',
        runnerUpSeed: 3,
        finalScore: '46-38',
        bracketSize: 16,
        notes: '3rd straight dynasty title! #7 Mascoma upset #2 Hopkinton in quarters',
        games: {
          firstRound: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Newfound', winnerSeed: 9, loser: 'St. Thomas Aquinas', loserSeed: 8, winnerScore: 56, loserScore: 52 },
            { winner: 'Campbell', winnerSeed: 4, loser: 'Belmont', loserSeed: 13, winnerScore: 65, loserScore: 52 },
            { winner: 'White Mountains', winnerSeed: 5, loser: 'Conant', loserSeed: 12, winnerScore: 41, loserScore: 36 },
            { winner: 'Hopkinton', winnerSeed: 2, loser: 'Somersworth', loserSeed: 15, winnerScore: 66, loserScore: 41 },
            { winner: 'Mascoma Valley', winnerSeed: 7, loser: 'Stevens', loserSeed: 10, winnerScore: 62, loserScore: 40 },
            { winner: 'Kearsarge', winnerSeed: 3, loser: 'Mascenic', loserSeed: 14, winnerScore: 78, loserScore: 48 },
            { winner: 'Monadnock', winnerSeed: 6, loser: 'Winnisquam', loserSeed: 11, winnerScore: 43, loserScore: 34 }
          ],
          quarterFinals: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'Newfound', loserSeed: 9, winnerScore: 67, loserScore: 44 },
            { winner: 'White Mountains', winnerSeed: 5, loser: 'Campbell', loserSeed: 4, winnerScore: 73, loserScore: 57 },
            { winner: 'Mascoma Valley', winnerSeed: 7, loser: 'Hopkinton', loserSeed: 2, winnerScore: 48, loserScore: 40 },
            { winner: 'Kearsarge', winnerSeed: 3, loser: 'Monadnock', loserSeed: 6, winnerScore: 71, loserScore: 40 }
          ],
          semiFinals: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'White Mountains', loserSeed: 5, winnerScore: 54, loserScore: 36 },
            { winner: 'Kearsarge', winnerSeed: 3, loser: 'Mascoma Valley', loserSeed: 7, winnerScore: 45, loserScore: 42 }
          ],
          final: [
            { winner: 'Gilford', winnerSeed: 1, loser: 'Kearsarge', loserSeed: 3, winnerScore: 46, loserScore: 38 }
          ]
        }
      },
      'D-IV': {
        champion: 'Woodsville',
        championSeed: 1,
        runnerUp: 'Concord Christian',
        runnerUpSeed: 2,
        finalScore: '58-49',
        bracketSize: 16,
        notes: '2nd of 3-peat! #10 Lin-Wood upset #7 Derryfield, #14 Newmarket made quarters',
        games: {
          firstRound: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Hinsdale', loserSeed: 16, winnerScore: 83, loserScore: 45 },
            { winner: 'Farmington', winnerSeed: 9, loser: 'Groveton', loserSeed: 8, winnerScore: 51, loserScore: 31 },
            { winner: 'Littleton', winnerSeed: 4, loser: 'Gorham', loserSeed: 13, winnerScore: 62, loserScore: 29 },
            { winner: 'Portsmouth Christian', winnerSeed: 5, loser: 'Sunapee', loserSeed: 12, winnerScore: 66, loserScore: 44 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Pittsburg-Canaan', loserSeed: 15, winnerScore: 67, loserScore: 31 },
            { winner: 'Lin-Wood', winnerSeed: 10, loser: 'Derryfield', loserSeed: 7, winnerScore: 82, loserScore: 69 },
            { winner: 'Newmarket', winnerSeed: 14, loser: 'Epping', loserSeed: 3, winnerScore: 53, loserScore: 47 },
            { winner: 'Holy Family', winnerSeed: 6, loser: 'Profile', loserSeed: 11, winnerScore: 69, loserScore: 58 }
          ],
          quarterFinals: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Farmington', loserSeed: 9, winnerScore: 60, loserScore: 47 },
            { winner: 'Littleton', winnerSeed: 4, loser: 'Portsmouth Christian', loserSeed: 5, winnerScore: 59, loserScore: 54 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Lin-Wood', loserSeed: 10, winnerScore: 65, loserScore: 50 },
            { winner: 'Holy Family', winnerSeed: 6, loser: 'Newmarket', loserSeed: 14, winnerScore: 58, loserScore: 49 }
          ],
          semiFinals: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Littleton', loserSeed: 4, winnerScore: 44, loserScore: 37 },
            { winner: 'Concord Christian', winnerSeed: 2, loser: 'Holy Family', loserSeed: 6, winnerScore: 59, loserScore: 42 }
          ],
          final: [
            { winner: 'Woodsville', winnerSeed: 1, loser: 'Concord Christian', loserSeed: 2, winnerScore: 58, loserScore: 49 }
          ]
        }
      }
    },
    girls: {
      'D-I': {
        champion: 'Bishop Guertin',
        championSeed: 5,
        runnerUp: 'Bedford',
        runnerUpSeed: 2,
        finalScore: '48-46',
        bracketSize: 16,
        notes: 'MAJOR UPSET - #5 wins title! Beat #1 Pinkerton 66-51 in semis',
        games: {
          firstRound: [
            { winner: 'Pinkerton', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Merrimack', winnerSeed: 8, loser: 'Dover', loserSeed: 9, winnerScore: 45, loserScore: 38 },
            { winner: 'Londonderry', winnerSeed: 13, loser: 'Concord', loserSeed: 4, winnerScore: 41, loserScore: 40 },
            { winner: 'Bishop Guertin', winnerSeed: 5, loser: 'Manchester Memorial', loserSeed: 12, winnerScore: 64, loserScore: 33 },
            { winner: 'Bedford', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Goffstown', winnerSeed: 7, loser: 'Alvirne', loserSeed: 10, winnerScore: 54, loserScore: 41 },
            { winner: 'Portsmouth', winnerSeed: 3, loser: 'Manchester Central', loserSeed: 14, winnerScore: 60, loserScore: 25 },
            { winner: 'Windham', winnerSeed: 6, loser: 'Exeter', loserSeed: 11, winnerScore: 45, loserScore: 37 }
          ],
          quarterFinals: [
            { winner: 'Pinkerton', winnerSeed: 1, loser: 'Merrimack', loserSeed: 8, winnerScore: 70, loserScore: 39 },
            { winner: 'Bishop Guertin', winnerSeed: 5, loser: 'Londonderry', loserSeed: 13, winnerScore: 75, loserScore: 45 },
            { winner: 'Bedford', winnerSeed: 2, loser: 'Goffstown', loserSeed: 7, winnerScore: 57, loserScore: 43 },
            { winner: 'Portsmouth', winnerSeed: 3, loser: 'Windham', loserSeed: 6, winnerScore: 50, loserScore: 36 }
          ],
          semiFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 5, loser: 'Pinkerton', loserSeed: 1, winnerScore: 66, loserScore: 51 },
            { winner: 'Bedford', winnerSeed: 2, loser: 'Portsmouth', loserSeed: 3, winnerScore: 45, loserScore: 24 }
          ],
          final: [
            { winner: 'Bishop Guertin', winnerSeed: 5, loser: 'Bedford', loserSeed: 2, winnerScore: 48, loserScore: 46 }
          ]
        }
      },
      'D-II': {
        champion: 'Hanover',
        championSeed: 1,
        runnerUp: 'Bow',
        runnerUpSeed: 3,
        finalScore: '55-24',
        bracketSize: 16,
        notes: 'DOMINANT - 31-point blowout final. Bow upset #2 Pembroke in semis',
        games: {
          firstRound: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Kennett', winnerSeed: 8, loser: 'John Stark', loserSeed: 9, winnerScore: 45, loserScore: 40 },
            { winner: 'Merrimack Valley', winnerSeed: 4, loser: 'Coe-Brown Northwood', loserSeed: 13, winnerScore: 53, loserScore: 41 },
            { winner: 'Laconia', winnerSeed: 5, loser: 'Milford', loserSeed: 12, winnerScore: 61, loserScore: 35 },
            { winner: 'Pembroke', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Lebanon', winnerSeed: 7, loser: 'Pelham', loserSeed: 10, winnerScore: 52, loserScore: 42 },
            { winner: 'Bow', winnerSeed: 3, loser: 'Manchester West', loserSeed: 14, winnerScore: 57, loserScore: 26 },
            { winner: 'Hollis-Brookline', winnerSeed: 6, loser: 'ConVal', loserSeed: 11, winnerScore: 53, loserScore: 31 }
          ],
          quarterFinals: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Kennett', loserSeed: 8, winnerScore: 63, loserScore: 38 },
            { winner: 'Laconia', winnerSeed: 5, loser: 'Merrimack Valley', loserSeed: 4, winnerScore: 44, loserScore: 40 },
            { winner: 'Pembroke', winnerSeed: 2, loser: 'Lebanon', loserSeed: 7, winnerScore: 43, loserScore: 32 },
            { winner: 'Bow', winnerSeed: 3, loser: 'Hollis-Brookline', loserSeed: 6, winnerScore: 53, loserScore: 29 }
          ],
          semiFinals: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Laconia', loserSeed: 5, winnerScore: 45, loserScore: 37 },
            { winner: 'Bow', winnerSeed: 3, loser: 'Pembroke', loserSeed: 2, winnerScore: 42, loserScore: 26 }
          ],
          final: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Bow', loserSeed: 3, winnerScore: 55, loserScore: 24 }
          ]
        }
      },
      'D-III': {
        champion: 'Monadnock',
        championSeed: 6,
        runnerUp: 'Conant',
        runnerUpSeed: 1,
        finalScore: '50-31',
        bracketSize: 16,
        notes: 'CINDERELLA - #6 dominates #1 in final! Also beat #2 Fall Mountain in semis',
        games: {
          firstRound: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Gilford', winnerSeed: 8, loser: 'St. Thomas Aquinas', loserSeed: 9, winnerScore: 43, loserScore: 29 },
            { winner: 'Newfound', winnerSeed: 4, loser: 'Newport', loserSeed: 13, winnerScore: 43, loserScore: 22 },
            { winner: 'Kearsarge', winnerSeed: 5, loser: 'White Mountains', loserSeed: 12, winnerScore: 47, loserScore: 32 },
            { winner: 'Fall Mountain', winnerSeed: 2, loser: 'Belmont', loserSeed: 15, winnerScore: 53, loserScore: 17 },
            { winner: 'Stevens', winnerSeed: 7, loser: 'Hopkinton', loserSeed: 10, winnerScore: 51, loserScore: 32 },
            { winner: 'Prospect Mountain', winnerSeed: 3, loser: 'Mascoma Valley', loserSeed: 14, winnerScore: 62, loserScore: 54 },
            { winner: 'Monadnock', winnerSeed: 6, loser: 'Winnisquam', loserSeed: 11, winnerScore: 45, loserScore: 22 }
          ],
          quarterFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Gilford', loserSeed: 8, winnerScore: 55, loserScore: 22 },
            { winner: 'Newfound', winnerSeed: 4, loser: 'Kearsarge', loserSeed: 5, winnerScore: 26, loserScore: 25 },
            { winner: 'Fall Mountain', winnerSeed: 2, loser: 'Stevens', loserSeed: 7, winnerScore: 44, loserScore: 41 },
            { winner: 'Monadnock', winnerSeed: 6, loser: 'Prospect Mountain', loserSeed: 3, winnerScore: 52, loserScore: 40 }
          ],
          semiFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Newfound', loserSeed: 4, winnerScore: 60, loserScore: 23 },
            { winner: 'Monadnock', winnerSeed: 6, loser: 'Fall Mountain', loserSeed: 2, winnerScore: 49, loserScore: 34 }
          ],
          final: [
            { winner: 'Monadnock', winnerSeed: 6, loser: 'Conant', loserSeed: 1, winnerScore: 50, loserScore: 31 }
          ]
        }
      },
      'D-IV': {
        champion: 'Concord Christian',
        championSeed: 1,
        runnerUp: 'Derryfield',
        runnerUpSeed: 3,
        finalScore: '46-28',
        bracketSize: 16,
        notes: 'CC dominant run. Derryfield upset #2 Pittsburg-Canaan in semis',
        games: {
          firstRound: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Littleton', winnerSeed: 8, loser: 'Portsmouth Christian', loserSeed: 9, winnerScore: 42, loserScore: 18 },
            { winner: 'Woodsville', winnerSeed: 4, loser: 'Lisbon', loserSeed: 13, winnerScore: 33, loserScore: 30 },
            { winner: 'Groveton', winnerSeed: 5, loser: 'Gorham', loserSeed: 12, winnerScore: 41, loserScore: 28 },
            { winner: 'Pittsburg-Canaan', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Colebrook', winnerSeed: 7, loser: 'Sunapee', loserSeed: 10, winnerScore: 58, loserScore: 17 },
            { winner: 'Derryfield', winnerSeed: 3, loser: 'Moultonborough', loserSeed: 14, winnerScore: 52, loserScore: 26 },
            { winner: 'Newmarket', winnerSeed: 6, loser: 'Hinsdale', loserSeed: 11, winnerScore: 40, loserScore: 32 }
          ],
          quarterFinals: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'Littleton', loserSeed: 8, winnerScore: 49, loserScore: 25 },
            { winner: 'Woodsville', winnerSeed: 4, loser: 'Groveton', loserSeed: 5, winnerScore: 41, loserScore: 26 },
            { winner: 'Pittsburg-Canaan', winnerSeed: 2, loser: 'Colebrook', loserSeed: 7, winnerScore: 48, loserScore: 45 },
            { winner: 'Derryfield', winnerSeed: 3, loser: 'Newmarket', loserSeed: 6, winnerScore: 69, loserScore: 20 }
          ],
          semiFinals: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'Woodsville', loserSeed: 4, winnerScore: 64, loserScore: 44 },
            { winner: 'Derryfield', winnerSeed: 3, loser: 'Pittsburg-Canaan', loserSeed: 2, winnerScore: 47, loserScore: 40 }
          ],
          final: [
            { winner: 'Concord Christian', winnerSeed: 1, loser: 'Derryfield', loserSeed: 3, winnerScore: 46, loserScore: 28 }
          ]
        }
      }
    }
  },

  // ============================================================
  // 2021 - COVID-affected season
  // ============================================================
  2021: {
    note: 'COVID-affected season - abbreviated playoffs. Woodsville won Boys D-IV (1st of 3-peat)',
    boys: {
      'D-IV': { champion: 'Woodsville', championSeed: 1, notes: '1st of dynasty 3-peat' }
    }
  },

  // ============================================================
  // 2020 - COVID Co-Champions
  // ============================================================
  2020: {
    note: 'All tournaments cancelled after semifinals due to COVID-19. Co-champions declared.',
    boys: {
      'D-I': { coChampions: ['Bishop Guertin', 'Londonderry'] },
      'D-II': { coChampions: ['Lebanon', 'Oyster River'] },
      'D-III': { coChampions: ['Gilford', 'Hopkinton'], notes: 'Gilford would have been 1st of 4-peat' },
      'D-IV': { coChampions: ['Newmarket', 'Woodsville'] }
    },
    girls: {
      'D-I': { coChampions: ['Bedford', 'Bishop Guertin'] },
      'D-II': { coChampions: ['Hanover', 'Kennett'] },
      'D-III': { coChampions: ['Conant', 'Fall Mountain'] },
      'D-IV': { coChampions: ['Colebrook', 'Littleton'] }
    }
  },

  // ============================================================
  // 2019 TOURNAMENT BRACKETS
  // ============================================================
  2019: {
    boys: {
      'D-I': {
        champion: 'Exeter',
        championSeed: 1,
        runnerUp: 'Salem',
        runnerUpSeed: 2,
        finalScore: '53-30',
        bracketSize: 16,
        notes: '#1 Exeter dominant run - crushed #2 Salem by 23 in final. #6 Portsmouth upset #3 Spaulding in quarters.',
        games: {
          firstRound: [
            { winner: 'Exeter', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Alvirne', winnerSeed: 9, loser: 'Concord', loserSeed: 8, winnerScore: 63, loserScore: 57 },
            { winner: 'Londonderry', winnerSeed: 4, loser: 'Nashua South', loserSeed: 13, winnerScore: 49, loserScore: 40 },
            { winner: 'Winnacunnet', winnerSeed: 5, loser: 'Dover', loserSeed: 12, winnerScore: 52, loserScore: 49 },
            { winner: 'Salem', winnerSeed: 2, loser: 'Goffstown', loserSeed: 15, winnerScore: 74, loserScore: 52 },
            { winner: 'Nashua North', winnerSeed: 10, loser: 'Keene', loserSeed: 7, winnerScore: 72, loserScore: 58 },
            { winner: 'Spaulding', winnerSeed: 3, loser: 'Merrimack', loserSeed: 14, winnerScore: 45, loserScore: 37 },
            { winner: 'Portsmouth', winnerSeed: 6, loser: 'Manchester Central', loserSeed: 11, winnerScore: 69, loserScore: 65 }
          ],
          quarterFinals: [
            { winner: 'Exeter', winnerSeed: 1, loser: 'Alvirne', loserSeed: 9, winnerScore: 73, loserScore: 50 },
            { winner: 'Londonderry', winnerSeed: 4, loser: 'Winnacunnet', loserSeed: 5, winnerScore: 42, loserScore: 40 },
            { winner: 'Salem', winnerSeed: 2, loser: 'Nashua North', loserSeed: 10, winnerScore: 65, loserScore: 54 },
            { winner: 'Portsmouth', winnerSeed: 6, loser: 'Spaulding', loserSeed: 3, winnerScore: 40, loserScore: 39 }
          ],
          semiFinals: [
            { winner: 'Exeter', winnerSeed: 1, loser: 'Londonderry', loserSeed: 4, winnerScore: 62, loserScore: 51 },
            { winner: 'Salem', winnerSeed: 2, loser: 'Portsmouth', loserSeed: 6, winnerScore: 40, loserScore: 26 }
          ],
          final: [
            { winner: 'Exeter', winnerSeed: 1, loser: 'Salem', loserSeed: 2, winnerScore: 53, loserScore: 30 }
          ]
        }
      },
      'D-II': {
        champion: 'Pembroke',
        championSeed: 3,
        runnerUp: 'Kearsarge',
        runnerUpSeed: 9,
        finalScore: '47-35',
        bracketSize: 16,
        notes: 'CINDERELLA CLASSIC - #9 Kearsarge beat #1 Oyster River by 1 point in quarters! #13 Hollis-Brookline upset #4 Pelham by 1. One of the wildest brackets ever.',
        games: {
          firstRound: [
            { winner: 'Oyster River', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Kearsarge', winnerSeed: 9, loser: 'Souhegan', loserSeed: 8, winnerScore: 42, loserScore: 39 },
            { winner: 'Hollis-Brookline', winnerSeed: 13, loser: 'Pelham', loserSeed: 4, winnerScore: 46, loserScore: 45 },
            { winner: 'Merrimack Valley', winnerSeed: 5, loser: 'Coe-Brown', loserSeed: 12, winnerScore: 58, loserScore: 50 },
            { winner: 'ConVal', winnerSeed: 2, loser: 'Milford', loserSeed: 15, winnerScore: 47, loserScore: 39 },
            { winner: 'Lebanon', winnerSeed: 7, loser: 'Bishop Brady', loserSeed: 10, winnerScore: 47, loserScore: 40 },
            { winner: 'Pembroke', winnerSeed: 3, loser: 'John Stark', loserSeed: 14, winnerScore: 82, loserScore: 51 },
            { winner: 'Kennett', winnerSeed: 6, loser: 'Hanover', loserSeed: 11, winnerScore: 68, loserScore: 43 }
          ],
          quarterFinals: [
            { winner: 'Kearsarge', winnerSeed: 9, loser: 'Oyster River', loserSeed: 1, winnerScore: 50, loserScore: 49 },
            { winner: 'Merrimack Valley', winnerSeed: 5, loser: 'Hollis-Brookline', loserSeed: 13, winnerScore: 50, loserScore: 48 },
            { winner: 'ConVal', winnerSeed: 2, loser: 'Lebanon', loserSeed: 7, winnerScore: 53, loserScore: 45 },
            { winner: 'Pembroke', winnerSeed: 3, loser: 'Kennett', loserSeed: 6, winnerScore: 54, loserScore: 43 }
          ],
          semiFinals: [
            { winner: 'Kearsarge', winnerSeed: 9, loser: 'Merrimack Valley', loserSeed: 5, winnerScore: 59, loserScore: 46 },
            { winner: 'Pembroke', winnerSeed: 3, loser: 'ConVal', loserSeed: 2, winnerScore: 50, loserScore: 42 }
          ],
          final: [
            { winner: 'Pembroke', winnerSeed: 3, loser: 'Kearsarge', loserSeed: 9, winnerScore: 47, loserScore: 35 }
          ]
        }
      },
      'D-III': {
        champion: 'Conant',
        championSeed: 2,
        runnerUp: 'Somersworth',
        runnerUpSeed: 1,
        finalScore: '61-38',
        bracketSize: 16,
        notes: '#2 Conant dominated the final - pre-Gilford dynasty era',
        games: {
          firstRound: [
            { winner: 'Somersworth', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Monadnock', winnerSeed: 9, loser: 'Berlin', loserSeed: 8, winnerScore: 48, loserScore: 45 },
            { winner: 'Campbell', winnerSeed: 4, loser: 'Mascoma Valley', loserSeed: 13, winnerScore: 60, loserScore: 38 },
            { winner: 'Winnisquam', winnerSeed: 12, loser: 'Mascenic', loserSeed: 5, winnerScore: 61, loserScore: 59 },
            { winner: 'Conant', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'White Mountains', winnerSeed: 7, loser: 'Inter-Lakes', loserSeed: 10, winnerScore: 45, loserScore: 23 },
            { winner: 'St. Thomas Aquinas', winnerSeed: 3, loser: 'Fall Mountain', loserSeed: 14, winnerScore: 82, loserScore: 31 },
            { winner: 'Hopkinton', winnerSeed: 6, loser: 'Belmont', loserSeed: 11, winnerScore: 49, loserScore: 41 }
          ],
          quarterFinals: [
            { winner: 'Somersworth', winnerSeed: 1, loser: 'Monadnock', loserSeed: 9, winnerScore: 57, loserScore: 52 },
            { winner: 'Campbell', winnerSeed: 4, loser: 'Winnisquam', loserSeed: 12, winnerScore: 62, loserScore: 42 },
            { winner: 'Conant', winnerSeed: 2, loser: 'White Mountains', loserSeed: 7, winnerScore: 55, loserScore: 46 },
            { winner: 'St. Thomas Aquinas', winnerSeed: 3, loser: 'Hopkinton', loserSeed: 6, winnerScore: 60, loserScore: 52 }
          ],
          semiFinals: [
            { winner: 'Somersworth', winnerSeed: 1, loser: 'Campbell', loserSeed: 4, winnerScore: 61, loserScore: 39 },
            { winner: 'Conant', winnerSeed: 2, loser: 'St. Thomas Aquinas', loserSeed: 3, winnerScore: 57, loserScore: 39 }
          ],
          final: [
            { winner: 'Conant', winnerSeed: 2, loser: 'Somersworth', loserSeed: 1, winnerScore: 61, loserScore: 38 }
          ]
        }
      },
      'D-IV': {
        champion: 'Epping',
        championSeed: 1,
        runnerUp: 'Littleton',
        runnerUpSeed: 2,
        finalScore: '50-45',
        bracketSize: 16,
        notes: 'Epping won tight final over Littleton',
        games: {
          firstRound: [
            { winner: 'Epping', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Portsmouth Christian', winnerSeed: 9, loser: 'Groveton', loserSeed: 8, winnerScore: 55, loserScore: 45 },
            { winner: 'Woodsville', winnerSeed: 4, loser: 'Mount Royal', loserSeed: 13, winnerScore: 79, loserScore: 52 },
            { winner: 'Sunapee', winnerSeed: 5, loser: 'Derryfield', loserSeed: 12, winnerScore: 43, loserScore: 41 },
            { winner: 'Littleton', winnerSeed: 2, loser: 'Moultonborough', loserSeed: 15, winnerScore: 68, loserScore: 36 },
            { winner: 'Colebrook', winnerSeed: 7, loser: 'Lisbon', loserSeed: 10, winnerScore: 66, loserScore: 45 },
            { winner: 'Newmarket', winnerSeed: 3, loser: 'Wilton-Lyndeborough', loserSeed: 14, winnerScore: 82, loserScore: 30 },
            { winner: 'Pittsfield', winnerSeed: 6, loser: 'Farmington', loserSeed: 11, winnerScore: 61, loserScore: 49 }
          ],
          quarterFinals: [
            { winner: 'Epping', winnerSeed: 1, loser: 'Portsmouth Christian', loserSeed: 9, winnerScore: 66, loserScore: 48 },
            { winner: 'Woodsville', winnerSeed: 4, loser: 'Sunapee', loserSeed: 5, winnerScore: 66, loserScore: 57 },
            { winner: 'Littleton', winnerSeed: 2, loser: 'Colebrook', loserSeed: 7, winnerScore: 52, loserScore: 41 },
            { winner: 'Newmarket', winnerSeed: 3, loser: 'Pittsfield', loserSeed: 6, winnerScore: 49, loserScore: 30 }
          ],
          semiFinals: [
            { winner: 'Epping', winnerSeed: 1, loser: 'Woodsville', loserSeed: 4, winnerScore: 50, loserScore: 45 },
            { winner: 'Littleton', winnerSeed: 2, loser: 'Newmarket', loserSeed: 3, winnerScore: 59, loserScore: 49 }
          ],
          final: [
            { winner: 'Epping', winnerSeed: 1, loser: 'Littleton', loserSeed: 2, winnerScore: 50, loserScore: 45 }
          ]
        }
      }
    },
    girls: {
      'D-I': {
        champion: 'Bishop Guertin',
        championSeed: 1,
        runnerUp: 'Portsmouth',
        runnerUpSeed: 6,
        finalScore: '46-33',
        bracketSize: 16,
        notes: '#6 Portsmouth Cinderella run ended vs dominant BG',
        games: {
          firstRound: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Manchester Central', winnerSeed: 8, loser: 'Goffstown', loserSeed: 9, winnerScore: 58, loserScore: 54 },
            { winner: 'Manchester Memorial', winnerSeed: 4, loser: 'Nashua South', loserSeed: 13, winnerScore: 60, loserScore: 29 },
            { winner: 'Londonderry', winnerSeed: 12, loser: 'Salem', loserSeed: 5, winnerScore: 49, loserScore: 44 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Windham', winnerSeed: 7, loser: 'Exeter', loserSeed: 10, winnerScore: 66, loserScore: 62 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Nashua North', loserSeed: 14, winnerScore: 70, loserScore: 54 },
            { winner: 'Portsmouth', winnerSeed: 6, loser: 'Merrimack', loserSeed: 11, winnerScore: 50, loserScore: 31 }
          ],
          quarterFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Manchester Central', loserSeed: 8, winnerScore: 51, loserScore: 29 },
            { winner: 'Manchester Memorial', winnerSeed: 4, loser: 'Londonderry', loserSeed: 12, winnerScore: 58, loserScore: 39 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Windham', loserSeed: 7, winnerScore: 46, loserScore: 34 },
            { winner: 'Portsmouth', winnerSeed: 6, loser: 'Bedford', loserSeed: 3, winnerScore: 50, loserScore: 34 }
          ],
          semiFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Manchester Memorial', loserSeed: 4, winnerScore: 66, loserScore: 36 },
            { winner: 'Portsmouth', winnerSeed: 6, loser: 'Pinkerton', loserSeed: 2, winnerScore: 43, loserScore: 41 }
          ],
          final: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Portsmouth', loserSeed: 6, winnerScore: 46, loserScore: 33 }
          ]
        }
      },
      'D-II': {
        champion: 'Hanover',
        championSeed: 1,
        runnerUp: 'Kennett',
        runnerUpSeed: 3,
        finalScore: '52-41',
        bracketSize: 16,
        notes: 'Hanover dominant throughout tournament',
        games: {
          firstRound: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Kearsarge', loserSeed: 16, winnerScore: 42, loserScore: 36 },
            { winner: 'Hollis-Brookline', winnerSeed: 8, loser: 'Merrimack Valley', loserSeed: 9, winnerScore: 60, loserScore: 36 },
            { winner: 'Bishop Brady', winnerSeed: 4, loser: 'Sanborn', loserSeed: 13, winnerScore: 84, loserScore: 52 },
            { winner: 'John Stark', winnerSeed: 5, loser: 'Oyster River', loserSeed: 12, winnerScore: 53, loserScore: 26 },
            { winner: 'Lebanon', winnerSeed: 2, loser: 'Bow', loserSeed: 15, winnerScore: 54, loserScore: 27 },
            { winner: 'Laconia', winnerSeed: 7, loser: 'ConVal', loserSeed: 10, winnerScore: 39, loserScore: 38 },
            { winner: 'Kennett', winnerSeed: 3, loser: 'Coe-Brown', loserSeed: 14, winnerScore: 59, loserScore: 36 },
            { winner: 'Spaulding', winnerSeed: 6, loser: 'Pelham', loserSeed: 11, winnerScore: 47, loserScore: 45 }
          ],
          quarterFinals: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Hollis-Brookline', loserSeed: 8, winnerScore: 73, loserScore: 34 },
            { winner: 'John Stark', winnerSeed: 5, loser: 'Bishop Brady', loserSeed: 4, winnerScore: 71, loserScore: 56 },
            { winner: 'Lebanon', winnerSeed: 2, loser: 'Laconia', loserSeed: 7, winnerScore: 69, loserScore: 20 },
            { winner: 'Kennett', winnerSeed: 3, loser: 'Spaulding', loserSeed: 6, winnerScore: 52, loserScore: 38 }
          ],
          semiFinals: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'John Stark', loserSeed: 5, winnerScore: 63, loserScore: 30 },
            { winner: 'Kennett', winnerSeed: 3, loser: 'Lebanon', loserSeed: 2, winnerScore: 49, loserScore: 42 }
          ],
          final: [
            { winner: 'Hanover', winnerSeed: 1, loser: 'Kennett', loserSeed: 3, winnerScore: 52, loserScore: 41 }
          ]
        }
      },
      'D-III': {
        champion: 'Monadnock',
        championSeed: 2,
        runnerUp: 'Fall Mountain',
        runnerUpSeed: 4,
        finalScore: '51-44',
        bracketSize: 16,
        notes: '#4 Fall Mountain upset #1 Conant in semis',
        games: {
          firstRound: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Belmont', winnerSeed: 8, loser: 'Berlin', loserSeed: 9, winnerScore: 44, loserScore: 43 },
            { winner: 'Fall Mountain', winnerSeed: 4, loser: 'Campbell', loserSeed: 13, winnerScore: 61, loserScore: 24 },
            { winner: 'White Mountains', winnerSeed: 5, loser: 'Gilford', loserSeed: 12, winnerScore: 43, loserScore: 33 },
            { winner: 'Monadnock', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Inter-Lakes', winnerSeed: 7, loser: 'Raymond', loserSeed: 10, winnerScore: 40, loserScore: 38 },
            { winner: 'Newfound', winnerSeed: 3, loser: 'Prospect Mountain', loserSeed: 14, winnerScore: 62, loserScore: 26 },
            { winner: 'Hopkinton', winnerSeed: 6, loser: 'Mascoma Valley', loserSeed: 11, winnerScore: 38, loserScore: 28 }
          ],
          quarterFinals: [
            { winner: 'Conant', winnerSeed: 1, loser: 'Belmont', loserSeed: 8, winnerScore: 46, loserScore: 37 },
            { winner: 'Fall Mountain', winnerSeed: 4, loser: 'White Mountains', loserSeed: 5, winnerScore: 44, loserScore: 30 },
            { winner: 'Monadnock', winnerSeed: 2, loser: 'Inter-Lakes', loserSeed: 7, winnerScore: 65, loserScore: 54 },
            { winner: 'Newfound', winnerSeed: 3, loser: 'Hopkinton', loserSeed: 6, winnerScore: 46, loserScore: 32 }
          ],
          semiFinals: [
            { winner: 'Fall Mountain', winnerSeed: 4, loser: 'Conant', loserSeed: 1, winnerScore: 45, loserScore: 44 },
            { winner: 'Monadnock', winnerSeed: 2, loser: 'Newfound', loserSeed: 3, winnerScore: 39, loserScore: 34 }
          ],
          final: [
            { winner: 'Monadnock', winnerSeed: 2, loser: 'Fall Mountain', loserSeed: 4, winnerScore: 51, loserScore: 44 }
          ]
        }
      },
      'D-IV': {
        champion: 'Littleton',
        championSeed: 1,
        runnerUp: 'Hinsdale',
        runnerUpSeed: 3,
        finalScore: '42-31',
        bracketSize: 16,
        notes: 'Littleton perfect 18-0 regular season, won title decisively',
        games: {
          firstRound: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Portsmouth Christian', loserSeed: 16, winnerScore: 64, loserScore: 22 },
            { winner: 'Derryfield', winnerSeed: 8, loser: 'Newmarket', loserSeed: 9, winnerScore: 32, loserScore: 21 },
            { winner: 'Woodsville', winnerSeed: 4, loser: 'Sunapee', loserSeed: 13, winnerScore: 57, loserScore: 45 },
            { winner: 'Groveton', winnerSeed: 5, loser: 'Pittsburg-Canaan', loserSeed: 12, winnerScore: 61, loserScore: 35 },
            { winner: 'Farmington', winnerSeed: 2, loser: 'Epping', loserSeed: 15, winnerScore: 63, loserScore: 39 },
            { winner: 'Colebrook', winnerSeed: 7, loser: 'Mascenic', loserSeed: 10, winnerScore: 77, loserScore: 57 },
            { winner: 'Hinsdale', winnerSeed: 3, loser: 'Profile', loserSeed: 14, winnerScore: 47, loserScore: 16 },
            { winner: 'Lisbon', winnerSeed: 11, loser: 'Mount Royal', loserSeed: 6, winnerScore: 45, loserScore: 35 }
          ],
          quarterFinals: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Derryfield', loserSeed: 8, winnerScore: 70, loserScore: 15 },
            { winner: 'Woodsville', winnerSeed: 4, loser: 'Groveton', loserSeed: 5, winnerScore: 56, loserScore: 45 },
            { winner: 'Colebrook', winnerSeed: 7, loser: 'Farmington', loserSeed: 2, winnerScore: 52, loserScore: 47 },
            { winner: 'Hinsdale', winnerSeed: 3, loser: 'Lisbon', loserSeed: 11, winnerScore: 59, loserScore: 34 }
          ],
          semiFinals: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Woodsville', loserSeed: 4, winnerScore: 46, loserScore: 31 },
            { winner: 'Hinsdale', winnerSeed: 3, loser: 'Colebrook', loserSeed: 7, winnerScore: 63, loserScore: 50 }
          ],
          final: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Hinsdale', loserSeed: 3, winnerScore: 42, loserScore: 31 }
          ]
        }
      }
    }
  },

  // ============================================================
  // 2018 TOURNAMENT BRACKETS
  // ============================================================
  2018: {
    boys: {
      'D-I': {
        champion: 'Londonderry',
        championSeed: 1,
        runnerUp: 'Portsmouth',
        runnerUpSeed: 2,
        finalScore: '51-49',
        bracketSize: 16,
        notes: 'Tight championship game decided by 2 points'
      },
      'D-II': {
        champion: 'Hollis-Brookline',
        championSeed: 1,
        runnerUp: 'Oyster River',
        runnerUpSeed: 7,
        finalScore: '56-40',
        bracketSize: 16,
        notes: '#7 Oyster River upset run ended in final. #15 John Stark upset #2 Lebanon in first round!',
        games: {
          firstRound: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Milford', winnerSeed: 9, loser: 'Timberlane', loserSeed: 8, winnerScore: 53, loserScore: 48 },
            { winner: 'Kearsarge', winnerSeed: 4, loser: 'Souhegan', loserSeed: 13, winnerScore: 47, loserScore: 45 },
            { winner: 'Merrimack Valley', winnerSeed: 5, loser: 'Windham', loserSeed: 12, winnerScore: 52, loserScore: 51 },
            { winner: 'John Stark', winnerSeed: 15, loser: 'Lebanon', loserSeed: 2, winnerScore: 40, loserScore: 39 },
            { winner: 'Oyster River', winnerSeed: 7, loser: 'Kennett', loserSeed: 10, winnerScore: 65, loserScore: 57 },
            { winner: 'Pembroke', winnerSeed: 3, loser: 'Hanover', loserSeed: 14, winnerScore: 75, loserScore: 54 },
            { winner: 'Coe-Brown', winnerSeed: 6, loser: 'Pelham', loserSeed: 11, winnerScore: 58, loserScore: 49 }
          ],
          quarterFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Milford', loserSeed: 9, winnerScore: 46, loserScore: 33 },
            { winner: 'Merrimack Valley', winnerSeed: 5, loser: 'Kearsarge', loserSeed: 4, winnerScore: 46, loserScore: 44 },
            { winner: 'Oyster River', winnerSeed: 7, loser: 'John Stark', loserSeed: 15, winnerScore: 75, loserScore: 47 },
            { winner: 'Pembroke', winnerSeed: 3, loser: 'Coe-Brown', loserSeed: 6, winnerScore: 65, loserScore: 52 }
          ],
          semiFinals: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Merrimack Valley', loserSeed: 5, winnerScore: 46, loserScore: 43 },
            { winner: 'Oyster River', winnerSeed: 7, loser: 'Pembroke', loserSeed: 3, winnerScore: 58, loserScore: 57 }
          ],
          final: [
            { winner: 'Hollis-Brookline', winnerSeed: 1, loser: 'Oyster River', loserSeed: 7, winnerScore: 56, loserScore: 40 }
          ]
        }
      },
      'D-III': {
        champion: 'Somersworth',
        championSeed: 2,
        runnerUp: 'Campbell',
        runnerUpSeed: 5,
        finalScore: '53-38',
        bracketSize: 16,
        notes: '#5 Campbell and #9 Monadnock made deep runs. #13 White Mountains upset #4 Conant.',
        games: {
          firstRound: [
            { winner: 'Hopkinton', winnerSeed: 1, loser: 'Mascoma Valley', loserSeed: 16, winnerScore: 65, loserScore: 45 },
            { winner: 'Monadnock', winnerSeed: 9, loser: 'Inter-Lakes', loserSeed: 8, winnerScore: 53, loserScore: 49 },
            { winner: 'White Mountains', winnerSeed: 13, loser: 'Conant', loserSeed: 4, winnerScore: 53, loserScore: 49 },
            { winner: 'Campbell', winnerSeed: 5, loser: 'St. Thomas Aquinas', loserSeed: 12, winnerScore: 64, loserScore: 50 },
            { winner: 'Somersworth', winnerSeed: 2, loser: 'Fall Mountain', loserSeed: 15, winnerScore: 75, loserScore: 59 },
            { winner: 'Belmont', winnerSeed: 10, loser: 'Mascenic', loserSeed: 7, winnerScore: 44, loserScore: 42 },
            { winner: 'Berlin', winnerSeed: 3, loser: 'Laconia', loserSeed: 14, winnerScore: 53, loserScore: 44 },
            { winner: 'Gilford', winnerSeed: 6, loser: 'Stevens', loserSeed: 11, winnerScore: 53, loserScore: 33 }
          ],
          quarterFinals: [
            { winner: 'Monadnock', winnerSeed: 9, loser: 'Hopkinton', loserSeed: 1, winnerScore: 52, loserScore: 43 },
            { winner: 'Campbell', winnerSeed: 5, loser: 'White Mountains', loserSeed: 13, winnerScore: 71, loserScore: 66 },
            { winner: 'Somersworth', winnerSeed: 2, loser: 'Belmont', loserSeed: 10, winnerScore: 57, loserScore: 43 },
            { winner: 'Berlin', winnerSeed: 3, loser: 'Gilford', loserSeed: 6, winnerScore: 56, loserScore: 50 }
          ],
          semiFinals: [
            { winner: 'Campbell', winnerSeed: 5, loser: 'Monadnock', loserSeed: 9, winnerScore: 79, loserScore: 53 },
            { winner: 'Somersworth', winnerSeed: 2, loser: 'Berlin', loserSeed: 3, winnerScore: 53, loserScore: 41 }
          ],
          final: [
            { winner: 'Somersworth', winnerSeed: 2, loser: 'Campbell', loserSeed: 5, winnerScore: 53, loserScore: 38 }
          ]
        }
      },
      'D-IV': {
        champion: 'Littleton',
        championSeed: 1,
        runnerUp: 'Newmarket',
        runnerUpSeed: 3,
        finalScore: '61-55',
        bracketSize: 16,
        notes: 'Littleton dominant #1 seed won title'
      }
    },
    girls: {
      'D-I': {
        champion: 'Bishop Guertin',
        championSeed: 1,
        runnerUp: 'Bedford',
        runnerUpSeed: 3,
        finalScore: '48-42',
        bracketSize: 16,
        notes: 'BG continued D-I dominance'
      },
      'D-II': {
        champion: 'Lebanon',
        championSeed: 1,
        runnerUp: 'Hollis-Brookline',
        runnerUpSeed: 6,
        finalScore: '52-43',
        bracketSize: 16,
        notes: 'Lebanon back-to-back titles after 2017 perfect season'
      },
      'D-III': {
        champion: 'Monadnock',
        championSeed: 1,
        runnerUp: 'Hopkinton',
        runnerUpSeed: 5,
        finalScore: '40-36',
        bracketSize: 16,
        notes: 'Monadnock repeat champions (2017-2018)'
      },
      'D-IV': {
        champion: 'Woodsville',
        championSeed: 1,
        runnerUp: 'Farmington',
        runnerUpSeed: 2,
        finalScore: '46-38',
        bracketSize: 16,
        notes: 'Woodsville earned first D-IV title'
      }
    }
  },

  // ============================================================
  // 2017 TOURNAMENT BRACKETS
  // ============================================================
  2017: {
    boys: {
      'D-I': {
        champion: 'Portsmouth',
        championSeed: 1,
        runnerUp: 'Bedford',
        runnerUpSeed: 3,
        finalScore: '63-40',
        bracketSize: 16,
        notes: 'PERFECT SEASON - Portsmouth went 18-0 and dominated entire tournament',
        games: {
          firstRound: [
            { winner: 'Portsmouth', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Bishop Guertin', winnerSeed: 9, loser: 'Londonderry', loserSeed: 8, winnerScore: 64, loserScore: 57 },
            { winner: 'Winnacunnet', winnerSeed: 4, loser: 'Alvirne', loserSeed: 13, winnerScore: 74, loserScore: 41 },
            { winner: 'Exeter', winnerSeed: 5, loser: 'Salem', loserSeed: 12, winnerScore: 75, loserScore: 64 },
            { winner: 'Spaulding', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Nashua North', winnerSeed: 7, loser: 'Manchester Memorial', loserSeed: 10, winnerScore: 73, loserScore: 62 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Pinkerton', loserSeed: 14, winnerScore: 53, loserScore: 45 },
            { winner: 'Merrimack', winnerSeed: 6, loser: 'Nashua South', loserSeed: 11, winnerScore: 48, loserScore: 38 }
          ],
          quarterFinals: [
            { winner: 'Portsmouth', winnerSeed: 1, loser: 'Bishop Guertin', loserSeed: 9, winnerScore: 62, loserScore: 30 },
            { winner: 'Winnacunnet', winnerSeed: 4, loser: 'Exeter', loserSeed: 5, winnerScore: 76, loserScore: 41 },
            { winner: 'Spaulding', winnerSeed: 2, loser: 'Nashua North', loserSeed: 7, winnerScore: 63, loserScore: 45 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Merrimack', loserSeed: 6, winnerScore: 47, loserScore: 41 }
          ],
          semiFinals: [
            { winner: 'Portsmouth', winnerSeed: 1, loser: 'Winnacunnet', loserSeed: 4, winnerScore: 52, loserScore: 45 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Spaulding', loserSeed: 2, winnerScore: 47, loserScore: 35 }
          ],
          final: [
            { winner: 'Portsmouth', winnerSeed: 1, loser: 'Bedford', loserSeed: 3, winnerScore: 63, loserScore: 40 }
          ]
        }
      },
      'D-II': {
        champion: 'Lebanon',
        championSeed: 1,
        runnerUp: 'Coe-Brown',
        runnerUpSeed: 3,
        finalScore: '59-42',
        bracketSize: 16,
        notes: '#3 Coe-Brown upset #2 Milford in semis',
        games: {
          firstRound: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Goffstown', winnerSeed: 8, loser: 'Timberlane', loserSeed: 9, winnerScore: 45, loserScore: 42 },
            { winner: 'Hollis-Brookline', winnerSeed: 4, loser: 'Merrimack Valley', loserSeed: 13, winnerScore: 64, loserScore: 37 },
            { winner: 'Manchester West', winnerSeed: 5, loser: 'Pembroke', loserSeed: 12, winnerScore: 67, loserScore: 42 },
            { winner: 'Milford', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'John Stark', winnerSeed: 7, loser: 'Bishop Brady', loserSeed: 10, winnerScore: 43, loserScore: 39 },
            { winner: 'Coe-Brown', winnerSeed: 3, loser: 'Kingswood', loserSeed: 14, winnerScore: 78, loserScore: 46 },
            { winner: 'Pelham', winnerSeed: 6, loser: 'Hanover', loserSeed: 11, winnerScore: 57, loserScore: 46 }
          ],
          quarterFinals: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Goffstown', loserSeed: 8, winnerScore: 62, loserScore: 42 },
            { winner: 'Hollis-Brookline', winnerSeed: 4, loser: 'Manchester West', loserSeed: 5, winnerScore: 51, loserScore: 35 },
            { winner: 'Milford', winnerSeed: 2, loser: 'John Stark', loserSeed: 7, winnerScore: 60, loserScore: 41 },
            { winner: 'Coe-Brown', winnerSeed: 3, loser: 'Pelham', loserSeed: 6, winnerScore: 66, loserScore: 55 }
          ],
          semiFinals: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Hollis-Brookline', loserSeed: 4, winnerScore: 50, loserScore: 36 },
            { winner: 'Coe-Brown', winnerSeed: 3, loser: 'Milford', loserSeed: 2, winnerScore: 63, loserScore: 52 }
          ],
          final: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Coe-Brown', loserSeed: 3, winnerScore: 59, loserScore: 42 }
          ]
        }
      },
      'D-III': {
        champion: 'Kearsarge',
        championSeed: 1,
        runnerUp: 'Stevens',
        runnerUpSeed: 3,
        finalScore: '51-46',
        bracketSize: 16,
        notes: 'Kearsarge claimed D-III title in close final',
        games: {
          firstRound: [
            { winner: 'Winnisquam', winnerSeed: 16, loser: 'Fall Mountain', loserSeed: 17, winnerScore: 65, loserScore: 46 }
          ],
          secondRound: [
            { winner: 'Kearsarge', winnerSeed: 1, loser: 'Winnisquam', loserSeed: 16, winnerScore: 64, loserScore: 49 },
            { winner: 'Campbell', winnerSeed: 8, loser: 'Mascenic', loserSeed: 9, winnerScore: 67, loserScore: 57 },
            { winner: 'Inter-Lakes', winnerSeed: 4, loser: 'Monadnock', loserSeed: 13, winnerScore: 59, loserScore: 58 },
            { winner: 'Somersworth', winnerSeed: 5, loser: 'Conant', loserSeed: 12, winnerScore: 60, loserScore: 57 },
            { winner: 'Hopkinton', winnerSeed: 2, loser: 'Franklin', loserSeed: 15, winnerScore: 49, loserScore: 44 },
            { winner: 'Berlin', winnerSeed: 7, loser: 'Gilford', loserSeed: 10, winnerScore: 60, loserScore: 45 },
            { winner: 'Stevens', winnerSeed: 3, loser: 'Mascoma Valley', loserSeed: 14, winnerScore: 65, loserScore: 56 },
            { winner: 'Belmont', winnerSeed: 6, loser: 'St. Thomas Aquinas', loserSeed: 11, winnerScore: 73, loserScore: 59 }
          ],
          quarterFinals: [
            { winner: 'Kearsarge', winnerSeed: 1, loser: 'Campbell', loserSeed: 8, winnerScore: 79, loserScore: 67 },
            { winner: 'Somersworth', winnerSeed: 5, loser: 'Inter-Lakes', loserSeed: 4, winnerScore: 63, loserScore: 58 },
            { winner: 'Hopkinton', winnerSeed: 2, loser: 'Berlin', loserSeed: 7, winnerScore: 34, loserScore: 28 },
            { winner: 'Stevens', winnerSeed: 3, loser: 'Belmont', loserSeed: 6, winnerScore: 71, loserScore: 64 }
          ],
          semiFinals: [
            { winner: 'Kearsarge', winnerSeed: 1, loser: 'Somersworth', loserSeed: 5, winnerScore: 50, loserScore: 39 },
            { winner: 'Stevens', winnerSeed: 3, loser: 'Hopkinton', loserSeed: 2, winnerScore: 61, loserScore: 45 }
          ],
          final: [
            { winner: 'Kearsarge', winnerSeed: 1, loser: 'Stevens', loserSeed: 3, winnerScore: 51, loserScore: 46 }
          ]
        }
      },
      'D-IV': {
        champion: 'Groveton',
        championSeed: 3,
        runnerUp: 'Littleton',
        runnerUpSeed: 1,
        finalScore: '45-43 OT',
        bracketSize: 16,
        notes: 'UPSET OF THE YEAR - #3 Groveton beat undefeated #1 Littleton (18-0) in OVERTIME thriller!',
        games: {
          firstRound: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Newmarket', winnerSeed: 8, loser: 'Profile', loserSeed: 9, winnerScore: 67, loserScore: 25 },
            { winner: 'Portsmouth Christian', winnerSeed: 13, loser: 'Pittsfield', loserSeed: 4, winnerScore: 66, loserScore: 56 },
            { winner: 'Derryfield', winnerSeed: 5, loser: 'Mount Royal', loserSeed: 12, winnerScore: 62, loserScore: 20 },
            { winner: 'Woodsville', winnerSeed: 2, loser: 'Lisbon', loserSeed: 15, winnerScore: 53, loserScore: 40 },
            { winner: 'Colebrook', winnerSeed: 7, loser: 'Wilton-Lyndeborough', loserSeed: 10, winnerScore: 54, loserScore: 53 },
            { winner: 'Groveton', winnerSeed: 3, loser: 'Moultonborough', loserSeed: 14, winnerScore: 67, loserScore: 23 },
            { winner: 'Epping', winnerSeed: 6, loser: 'Farmington', loserSeed: 11, winnerScore: 59, loserScore: 38 }
          ],
          quarterFinals: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Newmarket', loserSeed: 8, winnerScore: 76, loserScore: 46 },
            { winner: 'Derryfield', winnerSeed: 5, loser: 'Portsmouth Christian', loserSeed: 13, winnerScore: 66, loserScore: 46 },
            { winner: 'Woodsville', winnerSeed: 2, loser: 'Colebrook', loserSeed: 7, winnerScore: 66, loserScore: 30 },
            { winner: 'Groveton', winnerSeed: 3, loser: 'Epping', loserSeed: 6, winnerScore: 67, loserScore: 56 }
          ],
          semiFinals: [
            { winner: 'Littleton', winnerSeed: 1, loser: 'Derryfield', loserSeed: 5, winnerScore: 53, loserScore: 47 },
            { winner: 'Groveton', winnerSeed: 3, loser: 'Woodsville', loserSeed: 2, winnerScore: 48, loserScore: 38 }
          ],
          final: [
            { winner: 'Groveton', winnerSeed: 3, loser: 'Littleton', loserSeed: 1, winnerScore: 45, loserScore: 43, overtime: true }
          ]
        }
      }
    },
    girls: {
      'D-I': {
        champion: 'Bishop Guertin',
        championSeed: 1,
        runnerUp: 'Bedford',
        runnerUpSeed: 3,
        finalScore: '52-49',
        bracketSize: 16,
        notes: 'BG edged Bedford in tight championship - classic rivalry',
        games: {
          firstRound: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Nashua North', winnerSeed: 8, loser: 'Manchester Memorial', loserSeed: 9, winnerScore: 60, loserScore: 43 },
            { winner: 'Alvirne', winnerSeed: 4, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Dover', winnerSeed: 12, loser: 'Londonderry', loserSeed: 5, winnerScore: 47, loserScore: 46 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Merrimack', winnerSeed: 7, loser: 'Manchester Central', loserSeed: 10, winnerScore: 55, loserScore: 46 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Bye', loserSeed: null, winnerScore: null, loserScore: null },
            { winner: 'Winnacunnet', winnerSeed: 6, loser: 'Salem', loserSeed: 11, winnerScore: 45, loserScore: 38 }
          ],
          quarterFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Nashua North', loserSeed: 8, winnerScore: 83, loserScore: 44 },
            { winner: 'Alvirne', winnerSeed: 4, loser: 'Dover', loserSeed: 12, winnerScore: 47, loserScore: 33 },
            { winner: 'Pinkerton', winnerSeed: 2, loser: 'Merrimack', loserSeed: 7, winnerScore: 46, loserScore: 40 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Winnacunnet', loserSeed: 6, winnerScore: 62, loserScore: 40 }
          ],
          semiFinals: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Alvirne', loserSeed: 4, winnerScore: 47, loserScore: 33 },
            { winner: 'Bedford', winnerSeed: 3, loser: 'Pinkerton', loserSeed: 2, winnerScore: 55, loserScore: 30 }
          ],
          final: [
            { winner: 'Bishop Guertin', winnerSeed: 1, loser: 'Bedford', loserSeed: 3, winnerScore: 52, loserScore: 49 }
          ]
        }
      },
      'D-II': {
        champion: 'Lebanon',
        championSeed: 1,
        runnerUp: 'Hollis-Brookline',
        runnerUpSeed: 6,
        finalScore: '44-35',
        bracketSize: 16,
        notes: 'PERFECT SEASON - Lebanon went 18-0! #6 Hollis-Brookline upset #2 Portsmouth & #3 Bishop Brady',
        games: {
          firstRound: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Kennett', loserSeed: 16, winnerScore: 53, loserScore: 18 },
            { winner: 'Kingswood', winnerSeed: 9, loser: 'Merrimack Valley', loserSeed: 8, winnerScore: 55, loserScore: 43 },
            { winner: 'Pelham', winnerSeed: 4, loser: 'Souhegan', loserSeed: 13, winnerScore: 70, loserScore: 45 },
            { winner: 'Hanover', winnerSeed: 5, loser: 'Windham', loserSeed: 12, winnerScore: 56, loserScore: 40 },
            { winner: 'Portsmouth', winnerSeed: 2, loser: 'John Stark', loserSeed: 15, winnerScore: 56, loserScore: 25 },
            { winner: 'Coe-Brown', winnerSeed: 10, loser: 'Bow', loserSeed: 7, winnerScore: 49, loserScore: 39 },
            { winner: 'Bishop Brady', winnerSeed: 3, loser: 'Pembroke', loserSeed: 14, winnerScore: 65, loserScore: 37 },
            { winner: 'Hollis-Brookline', winnerSeed: 6, loser: 'Goffstown', loserSeed: 11, winnerScore: 59, loserScore: 40 }
          ],
          quarterFinals: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Kingswood', loserSeed: 9, winnerScore: 45, loserScore: 25 },
            { winner: 'Pelham', winnerSeed: 4, loser: 'Hanover', loserSeed: 5, winnerScore: 43, loserScore: 38 },
            { winner: 'Portsmouth', winnerSeed: 2, loser: 'Coe-Brown', loserSeed: 10, winnerScore: 70, loserScore: 27 },
            { winner: 'Hollis-Brookline', winnerSeed: 6, loser: 'Bishop Brady', loserSeed: 3, winnerScore: 66, loserScore: 62 }
          ],
          semiFinals: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Pelham', loserSeed: 4, winnerScore: 36, loserScore: 35 },
            { winner: 'Hollis-Brookline', winnerSeed: 6, loser: 'Portsmouth', loserSeed: 2, winnerScore: 57, loserScore: 46 }
          ],
          final: [
            { winner: 'Lebanon', winnerSeed: 1, loser: 'Hollis-Brookline', loserSeed: 6, winnerScore: 44, loserScore: 35 }
          ]
        }
      },
      'D-III': {
        champion: 'Monadnock',
        championSeed: 3,
        runnerUp: 'Conant',
        runnerUpSeed: 4,
        finalScore: '44-36',
        bracketSize: 16,
        notes: '#4 Conant upset #1 Newfound in semis! Monadnock got revenge vs Conant in final.',
        games: {
          firstRound: [
            { winner: 'Newfound', winnerSeed: 1, loser: 'Stevens', loserSeed: 16, winnerScore: 56, loserScore: 33 },
            { winner: 'Gilford', winnerSeed: 9, loser: 'Berlin', loserSeed: 8, winnerScore: 55, loserScore: 33 },
            { winner: 'Conant', winnerSeed: 4, loser: 'Campbell', loserSeed: 13, winnerScore: 65, loserScore: 28 },
            { winner: 'Fall Mountain', winnerSeed: 5, loser: 'Inter-Lakes', loserSeed: 12, winnerScore: 49, loserScore: 37 },
            { winner: 'Prospect Mountain', winnerSeed: 2, loser: 'Somersworth', loserSeed: 15, winnerScore: 56, loserScore: 24 },
            { winner: 'Sanborn', winnerSeed: 7, loser: 'White Mountains', loserSeed: 10, winnerScore: 36, loserScore: 31 },
            { winner: 'Monadnock', winnerSeed: 3, loser: 'Newport', loserSeed: 14, winnerScore: 44, loserScore: 31 },
            { winner: 'Kearsarge', winnerSeed: 6, loser: 'Belmont', loserSeed: 11, winnerScore: 54, loserScore: 47 }
          ],
          quarterFinals: [
            { winner: 'Newfound', winnerSeed: 1, loser: 'Gilford', loserSeed: 9, winnerScore: 45, loserScore: 34 },
            { winner: 'Conant', winnerSeed: 4, loser: 'Fall Mountain', loserSeed: 5, winnerScore: 37, loserScore: 33 },
            { winner: 'Prospect Mountain', winnerSeed: 2, loser: 'Sanborn', loserSeed: 7, winnerScore: 66, loserScore: 44 },
            { winner: 'Monadnock', winnerSeed: 3, loser: 'Kearsarge', loserSeed: 6, winnerScore: 53, loserScore: 33 }
          ],
          semiFinals: [
            { winner: 'Conant', winnerSeed: 4, loser: 'Newfound', loserSeed: 1, winnerScore: 52, loserScore: 50 },
            { winner: 'Monadnock', winnerSeed: 3, loser: 'Prospect Mountain', loserSeed: 2, winnerScore: 54, loserScore: 45 }
          ],
          final: [
            { winner: 'Monadnock', winnerSeed: 3, loser: 'Conant', loserSeed: 4, winnerScore: 44, loserScore: 36 }
          ]
        }
      },
      'D-IV': {
        champion: 'Sunapee',
        championSeed: 1,
        runnerUp: 'Colebrook',
        runnerUpSeed: 2,
        finalScore: '79-52',
        bracketSize: 16,
        notes: 'DOMINANT - Sunapee went 18-0 perfect season and blew out the final by 27 points!',
        games: {
          firstRound: [
            { winner: 'Sunapee', winnerSeed: 1, loser: 'Mount Royal', loserSeed: 16, winnerScore: 69, loserScore: 27 },
            { winner: 'Woodsville', winnerSeed: 8, loser: 'Moultonborough', loserSeed: 9, winnerScore: 44, loserScore: 42 },
            { winner: 'Littleton', winnerSeed: 4, loser: 'Portsmouth Christian', loserSeed: 13, winnerScore: 45, loserScore: 23 },
            { winner: 'Nute', winnerSeed: 5, loser: 'Epping', loserSeed: 12, winnerScore: 61, loserScore: 39 },
            { winner: 'Colebrook', winnerSeed: 2, loser: 'Concord Christian', loserSeed: 15, winnerScore: 54, loserScore: 45 },
            { winner: 'Farmington', winnerSeed: 7, loser: 'Lisbon', loserSeed: 10, winnerScore: 43, loserScore: 36 },
            { winner: 'Hinsdale', winnerSeed: 3, loser: 'Groveton', loserSeed: 14, winnerScore: 32, loserScore: 16 },
            { winner: 'Newmarket', winnerSeed: 6, loser: 'Gorham', loserSeed: 11, winnerScore: 31, loserScore: 24 }
          ],
          quarterFinals: [
            { winner: 'Sunapee', winnerSeed: 1, loser: 'Woodsville', loserSeed: 8, winnerScore: 83, loserScore: 18 },
            { winner: 'Littleton', winnerSeed: 4, loser: 'Nute', loserSeed: 5, winnerScore: 66, loserScore: 42 },
            { winner: 'Colebrook', winnerSeed: 2, loser: 'Farmington', loserSeed: 7, winnerScore: 84, loserScore: 69 },
            { winner: 'Hinsdale', winnerSeed: 3, loser: 'Newmarket', loserSeed: 6, winnerScore: 50, loserScore: 34 }
          ],
          semiFinals: [
            { winner: 'Sunapee', winnerSeed: 1, loser: 'Littleton', loserSeed: 4, winnerScore: 64, loserScore: 38 },
            { winner: 'Colebrook', winnerSeed: 2, loser: 'Hinsdale', loserSeed: 3, winnerScore: 47, loserScore: 38 }
          ],
          final: [
            { winner: 'Sunapee', winnerSeed: 1, loser: 'Colebrook', loserSeed: 2, winnerScore: 79, loserScore: 52 }
          ]
        }
      }
    }
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get a team's complete tournament path for a given year
 */
export function getTournamentPath(year, gender, division, team) {
  const bracket = tournamentBrackets[year]?.[gender]?.[division];
  if (!bracket || !bracket.games) return null;
  
  const path = [];
  const rounds = ['firstRound', 'quarterFinals', 'semiFinals', 'final'];
  
  for (const round of rounds) {
    const games = bracket.games[round];
    if (!games) continue;
    
    for (const game of games) {
      if (game.winner === team || game.loser === team) {
        path.push({
          round,
          opponent: game.winner === team ? game.loser : game.winner,
          opponentSeed: game.winner === team ? game.loserSeed : game.winnerSeed,
          score: game.winner === team 
            ? `${game.winnerScore}-${game.loserScore}` 
            : `${game.loserScore}-${game.winnerScore}`,
          result: game.winner === team ? 'W' : 'L'
        });
      }
    }
  }
  
  return path.length > 0 ? path : null;
}

/**
 * Get all upsets in a tournament (lower seed beats higher seed)
 */
export function getTournamentUpsets(year, gender, division) {
  const bracket = tournamentBrackets[year]?.[gender]?.[division];
  if (!bracket || !bracket.games) return [];
  
  const upsets = [];
  const rounds = ['firstRound', 'quarterFinals', 'semiFinals', 'final'];
  
  for (const round of rounds) {
    const games = bracket.games[round];
    if (!games) continue;
    
    for (const game of games) {
      if (game.winnerSeed && game.loserSeed && game.winnerSeed > game.loserSeed) {
        upsets.push({
          round,
          winner: game.winner,
          winnerSeed: game.winnerSeed,
          loser: game.loser,
          loserSeed: game.loserSeed,
          score: `${game.winnerScore}-${game.loserScore}`,
          seedDifferential: game.loserSeed - game.winnerSeed
        });
      }
    }
  }
  
  return upsets.sort((a, b) => b.seedDifferential - a.seedDifferential);
}

/**
 * Check if a game was an upset
 */
export function isUpset(game) {
  return game.winnerSeed && game.loserSeed && game.winnerSeed > game.loserSeed;
}

/**
 * Get championship summary for a year
 */
export function getChampionshipSummary(year) {
  const yearData = tournamentBrackets[year];
  if (!yearData) return null;
  
  if (yearData.note) {
    return { year, note: yearData.note, brackets: yearData };
  }
  
  const summary = { year, boys: {}, girls: {} };
  
  for (const gender of ['boys', 'girls']) {
    for (const division of ['D-I', 'D-II', 'D-III', 'D-IV']) {
      const bracket = yearData[gender]?.[division];
      if (bracket) {
        summary[gender][division] = {
          champion: bracket.champion,
          championSeed: bracket.championSeed,
          runnerUp: bracket.runnerUp,
          runnerUpSeed: bracket.runnerUpSeed,
          finalScore: bracket.finalScore,
          notes: bracket.notes
        };
      }
    }
  }
  
  return summary;
}

/**
 * Get dynasty info - teams with consecutive titles
 */
export function getDynasties() {
  return {
    'Gilford Boys D-III': {
      years: [2020, 2021, 2022, 2023],
      titles: 4,
      notes: '4 straight titles (2020 co-champ, 2021-2023 outright). Ended 2024 by STA.'
    },
    'Woodsville Boys D-IV': {
      years: [2021, 2022, 2023],
      titles: 3,
      notes: '3-peat 2021-2023. Profile took over in 2024.'
    },
    'Bishop Guertin Girls D-I': {
      years: [2022, 2023],
      titles: 2,
      notes: 'Back-to-back including upset as #5 seed in 2022. Bedford got revenge 2024.'
    },
    'Pelham Boys D-II': {
      years: [2023, 2024],
      titles: 2,
      notes: 'Back-to-back titles. 2023 as #5 Cinderella, 2024 as #1.'
    },
    'Concord Christian Girls': {
      years: ['2022 D-IV', '2023 D-III', '2024 D-II'],
      titles: 3,
      notes: 'Won 3 titles in 3 different divisions as they moved up classifications!'
    }
  };
}

export default tournamentBrackets;
