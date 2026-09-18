// Stand-in for the live tables after the display migration. Team ids, level ids
// and the merge cases are the real ones read back from Supabase.

export const TEAMS = [
  // Varsity
  t(4575537,  'Girls Varsity Volleyball',                'Varsity Volleyball',              'Varsity', 1, 1, 63, 2, 1),
  t(11770124, 'Boys Varsity Soccer - Farmington-Nute',   'Farmington-Nute Varsity Soccer',  'Varsity', 1, 2, 50, 1, 1),
  t(11769193, 'Boys Varsity Football - Farmington-Nute', 'Farmington-Nute Varsity Football','Varsity', 1, 3, 25, 1, 1),
  t(11770786, 'Coed Varsity Golf',                       'Varsity Golf',                    'Varsity', 1, 4, 29, 3, 1),
  t(5240726,  'Boys Varsity Basketball',                 'Varsity Boys Basketball',         'Varsity', 1, 5, 4, 1, 1),
  t(5240728,  'Girls Varsity Basketball',                'Varsity Girls Basketball',        'Varsity', 1, 6, 4, 2, 1),
  t(5240725,  'Boys Junior Varsity Basketball',          'JV Boys Basketball',              'JV', 2, 3, 4, 1, 2),
  // JV
  t(4575551,  'Girls Junior Varsity Volleyball',         'JV Volleyball',                   'JV', 2, 1, 63, 2, 2),
  t(5029439,  'Boys Junior Varsity Soccer',              'Farmington-Nute JV Soccer',       'JV', 2, 2, 50, 1, 2),
  // Jr. High
  t(11745629, 'Girls 7/8th Volleyball - MS Varsity',     'Jr. High Volleyball',             'Jr. High', 3, 1, 63, 2, 27),
  t(11769400, 'Girls 7/8th Volleyball - MS JV',          'Jr. High - JV Volleyball',        'Jr. High - JV', 3, 2, 63, 2, 27),
  t(5029447,  'Boys 7/8th Soccer',                       'Jr. High Soccer',                 'Jr. High', 3, 4, 50, 1, 27),
  t(11743006, 'Coed Middle School Cross Country',        'Jr. High Cross Country',          'Jr. High', 3, 3, 11, 3, 35),
  // Merged away
  m(11836856, 'Girls JV2 Volleyball',        11769400, 63, 2, 37),
  m(11647281, 'Coed Middle School Soccer',   5029447,  50, 3, 35),
  m(11717821, 'Coed Junior Varsity Soccer',  5029447,  50, 3, 2),
  // Hidden
  h(11732672, 'Boys Middle School Football', 25, 1, 35),
  h(11852690, 'Boys Varsity Cross Country',  11, 1, 1)
];

function t(uteam, description, display_name, level_label, level_rank, sort_order, sport_id, gender_id, level_id) {
  return { uteam, description, display_name, level_label, level_rank, sort_order,
           sport_id, gender_id, level_id, is_active: true, hidden: false, merge_into: null };
}
function m(uteam, description, merge_into, sport_id, gender_id, level_id) {
  return { uteam, description, display_name: null, level_label: null, level_rank: null,
           sort_order: null, sport_id, gender_id, level_id, is_active: true, hidden: true, merge_into };
}
function h(uteam, description, sport_id, gender_id, level_id) {
  return { uteam, description, display_name: null, level_label: null, level_rank: null,
           sort_order: null, sport_id, gender_id, level_id, is_active: true, hidden: true, merge_into: null };
}

const G = (o) => ({
  unique_game_id: 0, uteam: 4575537, team_description: 'Girls Varsity Volleyball',
  sport_id: 63, gender_id: 2, level_id: 1, starts_at: null, ends_at: null, game_date: null,
  game_status: 'Normal', game_title: null, tournament_name: '',
  site_name: 'Farmington HS', sub_site_name: 'Gym', unique_site_id: 741475, is_home: true,
  opponent_name: null, opponent_entity_id: null, opponent_ball603: null, opponent_source: 'teams',
  team_count: 2, is_meet: false, arbiter_my_score: null, arbiter_opp_score: null, arbiter_result: null,
  manual_my_score: null, manual_opp_score: null, manual_updated_at: null, ...o
});

export const GAMES = [
  // Varsity volleyball. Today in the tests is Thu 17 Sep 2026.
  G({ unique_game_id: 1, starts_at: '2026-09-02T18:15:00', game_date: '2026-09-02',
      opponent_name: 'Hillsboro-Deering High School', opponent_ball603: 'Hillsboro-Deering',
      opponent_entity_id: 10125, arbiter_my_score: 3, arbiter_opp_score: 0, arbiter_result: 'W' }),
  G({ unique_game_id: 2, starts_at: '2026-09-09T18:15:00', game_date: '2026-09-09',
      opponent_name: 'Trinity High School', opponent_ball603: 'Trinity',
      arbiter_my_score: 1, arbiter_opp_score: 3, arbiter_result: 'L' }),
  // Arbiter says 3-0; somebody typed 3-1.
  G({ unique_game_id: 3, starts_at: '2026-09-15T17:45:00', game_date: '2026-09-15',
      opponent_name: 'Franklin High School', opponent_ball603: 'Franklin',
      site_name: 'Franklin High School', is_home: false,
      arbiter_my_score: 3, arbiter_opp_score: 0, arbiter_result: 'W',
      manual_my_score: 3, manual_opp_score: 1, manual_updated_at: '2026-09-15T21:00:00+00:00' }),
  // This week (Sun 13 – Sat 19).
  G({ unique_game_id: 4, starts_at: '2026-09-18T18:15:00', game_date: '2026-09-18',
      opponent_name: 'Epping Middle and High Schools', opponent_ball603: 'Epping' }),
  G({ unique_game_id: 5, starts_at: '2026-09-22T17:00:00', game_date: '2026-09-22',
      opponent_name: 'Newmarket Middle-High School', opponent_ball603: 'Newmarket',
      site_name: 'Newmarket HS', sub_site_name: 'Cross Gym', is_home: false }),

  // JV volleyball, this week too.
  G({ unique_game_id: 10, uteam: 4575551, team_description: 'Girls Junior Varsity Volleyball',
      level_id: 2, starts_at: '2026-09-18T17:00:00', game_date: '2026-09-18',
      opponent_name: 'Epping Middle and High Schools', opponent_ball603: 'Epping' }),

  // Football co-op.
  G({ unique_game_id: 20, uteam: 11769193, team_description: 'Boys Varsity Football - Farmington-Nute',
      sport_id: 25, gender_id: 1, starts_at: '2026-09-12T12:00:00', game_date: '2026-09-12',
      sub_site_name: 'Farmington HS', opponent_name: 'Hillsboro-Deering High School',
      opponent_ball603: 'Hillsboro-Deering', opponent_entity_id: 10125,
      arbiter_my_score: 8, arbiter_opp_score: 20, arbiter_result: 'L' }),

  // Golf — no Ball603 coverage, so no link.
  G({ unique_game_id: 30, uteam: 11770786, team_description: 'Coed Varsity Golf',
      sport_id: 29, gender_id: 3, starts_at: '2026-09-16T00:00:00', game_date: '2026-09-16',
      site_name: 'Farmington CC', sub_site_name: 'Farmington CC',
      opponent_name: 'Inter-lakes Middle High School', opponent_ball603: 'Inter-Lakes',
      arbiter_my_score: 50, arbiter_opp_score: 41, arbiter_result: 'W' }),

  // Soccer: Boys JV plays high schools.
  G({ unique_game_id: 40, uteam: 5029439, team_description: 'Boys Junior Varsity Soccer',
      sport_id: 50, gender_id: 1, level_id: 2, starts_at: '2026-09-19T16:00:00', game_date: '2026-09-19',
      game_status: 'Postponed', site_name: 'Farmington HS', sub_site_name: 'Soccer Field',
      opponent_name: 'Gilford High School', opponent_ball603: 'Gilford' }),
  // Varsity soccer co-op.
  G({ unique_game_id: 41, uteam: 11770124, team_description: 'Boys Varsity Soccer - Farmington-Nute',
      sport_id: 50, gender_id: 1, starts_at: '2026-09-17T16:00:00', game_date: '2026-09-17',
      site_name: 'Farmington HS', sub_site_name: 'Soccer Field',
      opponent_name: 'Newport-Mtn. Royal', opponent_ball603: 'Newport' }),

  // Jr. High soccer arrives under three uteams; all three fold into one team.
  G({ unique_game_id: 50, uteam: 5029447, sport_id: 50, gender_id: 1, level_id: 27,
      team_description: 'Boys 7/8th Soccer', starts_at: '2026-09-22T16:00:00', game_date: '2026-09-22',
      opponent_name: 'Chichester Central School', site_name: 'Chichester Central School' }),
  G({ unique_game_id: 51, uteam: 11647281, sport_id: 50, gender_id: 3, level_id: 35,
      team_description: 'Coed Middle School Soccer', starts_at: '2026-09-08T16:00:00', game_date: '2026-09-08',
      opponent_name: 'Pittsfield Middle High School', opponent_ball603: 'Pittsfield' }),
  G({ unique_game_id: 52, uteam: 11717821, sport_id: 50, gender_id: 3, level_id: 2,
      team_description: 'Coed Junior Varsity Soccer', starts_at: '2026-10-05T16:00:00', game_date: '2026-10-05',
      opponent_name: 'Paul Elementary School' }),

  // Jr. High volleyball JV, plus the JV2 duplicate of two of its games.
  G({ unique_game_id: 60, uteam: 11769400, sport_id: 63, gender_id: 2, level_id: 27,
      team_description: 'Girls 7/8th Volleyball - MS JV', starts_at: '2026-09-22T17:00:00',
      game_date: '2026-09-22', opponent_name: 'Nottingham', opponent_source: 'title',
      team_count: 1, site_name: 'Nottingham Elementary School', is_home: false }),
  G({ unique_game_id: 61, uteam: 11836856, sport_id: 63, gender_id: 2, level_id: 37,
      team_description: 'Girls JV2 Volleyball', starts_at: '2026-09-22T16:00:00',
      game_date: '2026-09-22', opponent_name: 'Nottingham', opponent_source: 'title',
      team_count: 1, site_name: 'Nottingham Elementary School', is_home: false }),
  G({ unique_game_id: 62, uteam: 11836856, sport_id: 63, gender_id: 2, level_id: 37,
      team_description: 'Girls JV2 Volleyball', starts_at: '2026-10-01T16:00:00',
      game_date: '2026-10-01', opponent_name: 'Strafford', opponent_source: 'title',
      team_count: 1, site_name: 'Strafford School', is_home: false }),

  // Jr. High cross country: the very next event, but its sport has no varsity
  // side, so the page should not open on it.
  G({ unique_game_id: 65, uteam: 11743006, sport_id: 11, gender_id: 3, level_id: 35,
      team_description: 'Coed Middle School Cross Country', starts_at: '2026-09-17T09:00:00',
      game_date: '2026-09-17', is_meet: true, team_count: 6, opponent_source: 'meet',
      opponent_name: null, site_name: 'Newmarket high school', sub_site_name: 'Landroche Field A' }),

  // Winter basketball: Boys and Girls, varsity and JV, so the schedule has a
  // sport that genuinely needs a gender row.
  G({ unique_game_id: 80, uteam: 5240726, team_description: 'Boys Varsity Basketball',
      sport_id: 4, gender_id: 1, starts_at: '2026-12-09T18:30:00', game_date: '2026-12-09',
      opponent_name: 'Nute Middle/High School', opponent_ball603: 'Nute',
      arbiter_my_score: 58, arbiter_opp_score: 44, arbiter_result: 'W' }),
  G({ unique_game_id: 81, uteam: 5240728, team_description: 'Girls Varsity Basketball',
      sport_id: 4, gender_id: 2, starts_at: '2026-12-10T18:30:00', game_date: '2026-12-10',
      opponent_name: 'Pittsfield Middle High School', opponent_ball603: 'Pittsfield',
      is_home: false, site_name: 'Pittsfield Middle High School' }),
  G({ unique_game_id: 82, uteam: 5240725, team_description: 'Boys Junior Varsity Basketball',
      sport_id: 4, gender_id: 1, level_id: 2, starts_at: '2026-12-09T17:00:00', game_date: '2026-12-09',
      opponent_name: 'Nute Middle/High School', opponent_ball603: 'Nute' }),

  // A team that is hidden entirely must never appear.
  G({ unique_game_id: 70, uteam: 11732672, sport_id: 25, gender_id: 1, level_id: 35,
      team_description: 'Boys Middle School Football', starts_at: '2026-09-18T16:00:00',
      game_date: '2026-09-18', opponent_name: 'Somersworth Middle School' })
];

const S = (o) => ({
  rankings_group_id: 0, unique_team_id: 0, group_name: '', division_name: '',
  sport_id: 63, gender_id: 2, level_id: 31, season: '2026',
  rank: 1, team_name: '', school_logo_url: null, is_farmington: false, ball603_shortname: null,
  games_played: 0, wins: 0, losses: 0, ties: null, points: null, rating: null, record: null,
  extra: {}, ...o
});

/* The real 24 August golf scrimmage: Arbiter titles it and leaves it scoreless.
   It must not reach the schedule, the home page or any record. */
GAMES.push({
  unique_game_id: 103318507, uteam: 11770786, team_description: 'Coed Varsity Golf',
  sport_id: 29, gender_id: 3, level_id: 1,
  starts_at: '2026-08-24T15:30:00', ends_at: null, game_date: '2026-08-24',
  game_status: 'Normal', game_title: 'Scrimmage', tournament_name: '',
  site_name: 'Farmington CC', sub_site_name: 'Farmington CC', unique_site_id: 1320484,
  is_home: true, opponent_name: 'Newmarket High School', opponent_entity_id: null,
  opponent_ball603: 'Newmarket', opponent_source: 'teams', team_count: 2, is_meet: false,
  arbiter_my_score: null, arbiter_opp_score: null, arbiter_result: null,
  manual_my_score: null, manual_opp_score: null, manual_updated_at: null,
  is_scrimmage: true
});

export const STANDINGS = [
  // Volleyball D-I and D-II: divisions Farmington is not in, but stored so the
  // division pills have somewhere to go.
  S({ rankings_group_id: 333, division_name: 'Division I', unique_team_id: 900, rank: 1,
      team_name: 'Salem High School', ball603_shortname: 'Salem', games_played: 6, wins: 6, losses: 0, points: 24 }),
  S({ rankings_group_id: 333, division_name: 'Division I', unique_team_id: 901, rank: 2,
      team_name: 'Bedford High School', ball603_shortname: 'Bedford', games_played: 5, wins: 5, losses: 0, points: 20 }),
  S({ rankings_group_id: 334, division_name: 'Division II', unique_team_id: 902, rank: 1,
      team_name: 'Hollis-Brookline High School', ball603_shortname: 'Hollis-Brookline',
      games_played: 5, wins: 5, losses: 0, points: 20 }),

  // Volleyball D-III — Ball603 covers it, so the full column set applies.
  S({ rankings_group_id: 335, division_name: 'Division III', unique_team_id: 1, rank: 1,
      team_name: 'Nute Middle/High School', ball603_shortname: 'Nute', games_played: 6, wins: 6, losses: 0,
      rating: 1, school_logo_url: 'https://assets.arbitersports.com/logos/organization/1' }),
  S({ rankings_group_id: 335, division_name: 'Division III', unique_team_id: 4575537, rank: 2,
      team_name: 'Farmington High School-NH', ball603_shortname: 'Farmington', is_farmington: true,
      games_played: 6, wins: 5, losses: 1, rating: 0.833 }),
  S({ rankings_group_id: 335, division_name: 'Division III', unique_team_id: 3, rank: 3,
      team_name: 'Epping Middle and High Schools', ball603_shortname: 'Epping',
      games_played: 6, wins: 3, losses: 3, rating: 0.5 }),

  // Football DIV — no Ball603 coverage, so reduced columns and no team links.
  S({ rankings_group_id: 321, division_name: 'DIV', sport_id: 25, gender_id: 1,
      unique_team_id: 11769193, rank: 5, team_name: 'Farmington-Nute', is_farmington: true,
      games_played: 1, wins: 0, losses: 1, ties: 0, points: 0, rating: 0 }),
  S({ rankings_group_id: 321, division_name: 'DIV', sport_id: 25, gender_id: 1,
      unique_team_id: 99, rank: 1, team_name: 'Hillsboro-Deering High School',
      ball603_shortname: 'Hillsboro-Deering', games_played: 1, wins: 1, losses: 0, ties: 0,
      points: 12, rating: 12 }),

  // NHIAA added a second football group over the same eight teams. Both are in
  // the table; the page must show the bracket once.
  S({ rankings_group_id: 341, division_name: 'DIV', sport_id: 25, gender_id: 1,
      unique_team_id: 11769193, rank: 5, team_name: 'Farmington-Nute', is_farmington: true,
      games_played: 1, wins: 0, losses: 1, ties: 0, points: 0, rating: 0 }),
  S({ rankings_group_id: 341, division_name: 'DIV', sport_id: 25, gender_id: 1,
      unique_team_id: 99, rank: 1, team_name: 'Hillsboro-Deering High School',
      ball603_shortname: 'Hillsboro-Deering', games_played: 1, wins: 1, losses: 0, ties: 0,
      points: 12, rating: 12 }),

  // Golf D-IV.
  S({ rankings_group_id: 64, division_name: 'Division IV', sport_id: 29, gender_id: 3,
      unique_team_id: 11770786, rank: 7, team_name: 'Farmington High School-NH', is_farmington: true,
      ball603_shortname: 'Farmington', games_played: 21, wins: 10, losses: 11, ties: 0,
      rating: 0.47619, record: '10-11-0' })
];

export const ROSTERS = [
  { id: 101, school: 'Farmington', gender: 'Girls', division: 'D-III', season: '2026',
    sport: 'gvolleyball', status: 'approved', head_coach: 'Tarsha Doyle',
    assistant_coaches: 'Jen Roberge', pdf_url: null,
    players_json: [
      { name: 'Ava Thibodeau', class: 'Sr', number: '4',  position: 'OH' },
      { name: 'Mia Caron',     class: 'Jr', number: '7',  position: 'S'  },
      { name: 'Ella Nadeau',   class: 'So', number: '11', position: 'MB' }
    ] },
  { id: 102, school: 'Farmington', gender: 'Boys', division: 'D-IV', season: '2026',
    sport: 'baseball', status: 'approved', head_coach: 'Micale Vachon',
    assistant_coaches: null, pdf_url: 'https://example.com/roster.pdf',
    players_json: JSON.stringify([{ name: 'Jack Fernald', class: 'Sr', number: '1', position: 'P' }]) },
  { id: 103, school: 'Farmington', gender: 'Girls', division: 'D-IV', season: '2025-26',
    sport: 'basketball', status: 'approved', head_coach: 'John Simmers',
    assistant_coaches: null, pdf_url: null,
    players_json: [{ name: 'Riley Perkins', class: 'Sr', number: '3', position: 'G' },
                   { name: 'Casey Hall',    class: 'Jr', number: '12', position: 'F' }] },
  { id: 104, school: 'Farmington', gender: 'Boys', division: 'D-IV', season: '2025-26',
    sport: 'basketball', status: 'approved', head_coach: 'Adam Thurston',
    assistant_coaches: null, pdf_url: null,
    players_json: [{ name: 'Owen Blake', class: 'Sr', number: '5', position: 'G' }] },
  // A second volleyball season, so the season row has somewhere to go.
  { id: 105, school: 'Farmington', gender: 'Girls', division: 'D-III', season: '2025',
    sport: 'gvolleyball', status: 'approved', head_coach: 'Tarsha Doyle',
    assistant_coaches: null, pdf_url: null,
    players_json: [{ name: 'Past Player', class: 'Sr', number: '1', position: 'OH' }] }
];

// Ball603's own games, which is where overall / home / away / streak / postseason
// come from for the three sports Ball603 covers.
export const B6_GAMES = [
  { home: 'Farmington', away: 'Hillsboro-Deering', home_score: 3, away_score: 0, gender: 'Girls', season: '2026', is_playoff: false },
  { home: 'Farmington', away: 'Trinity',           home_score: 1, away_score: 3, gender: 'Girls', season: '2026', is_playoff: false },
  { home: 'Franklin',   away: 'Farmington',        home_score: 1, away_score: 3, gender: 'Girls', season: '2026', is_playoff: false },
  { home: 'Nute',       away: 'Epping',            home_score: 3, away_score: 0, gender: 'Girls', season: '2026', is_playoff: false },
  { home: 'Farmington', away: 'Nute',              home_score: 0, away_score: 3, gender: 'Girls', season: '2026', is_playoff: true  }
];

export const VIDEOS = [
  { youtube_id: 'aaa11111111', title: 'Tigers volleyball sweeps Hillsboro-Deering',
    description: 'Full match from the Farmington gym.', thumbnail_url: null,
    published_at: '2026-09-02T22:10:00Z', duration: 'PT1H5M30S',
    view_count: 1240, like_count: 18, tags: ['volleyball','varsity'], pinned: true, hidden: false },
  { youtube_id: 'bbb22222222', title: 'Farmington-Nute football vs Hillsboro-Deering',
    description: 'Highlights.', thumbnail_url: 'https://img.youtube.com/vi/bbb22222222/maxresdefault.jpg',
    published_at: '2026-09-12T23:00:00Z', duration: 'PT8M12S',
    view_count: 980, like_count: 9, tags: ['football'], pinned: false, hidden: false },
  { youtube_id: 'ccc33333333', title: 'Senior night ceremony',
    description: 'Introductions before the Nute match.', thumbnail_url: null,
    published_at: '2026-09-11T20:00:00Z', duration: 'PT45S',
    view_count: 300, like_count: 4, tags: [], pinned: false, hidden: false },
  // A Short: vertical, and flagged by the sync rather than guessed from length.
  { youtube_id: 'ddd44444444', title: 'Katie Martineau: The Shot',
    description: 'Buzzer beater.', thumbnail_url: 'https://img.youtube.com/vi/ddd44444444/hqdefault.jpg',
    published_at: '2026-09-14T18:00:00Z', duration: 'PT20S',
    view_count: 4200, like_count: 61, tags: ['basketball'], pinned: false, hidden: false, is_short: true }
];

/* Photo galleries, in the shape farmington_albums holds them. Two sources, one
   with the sport in the album name and one with it in the folder — plus one
   album nobody could work a sport out of, and one hidden row the page query
   filters out before it ever reaches the browser. */
export const ALBUMS = [
  { album_key: 'k1', source: 'kjcardinal', name: 'FHS Girls Volleyball at Nute - Johnson 500 Kills - Sept 12 2026',
    url: 'https://kjcardinal.smugmug.com/Sports/FHS/FHS-Girls-Volleyball-at-Nute-Johnson-500-Kills-Sept-12-2026',
    image_count: 212, album_date: '2026-09-12T23:00:00Z', sport: 'Volleyball',
    thumbnail_url: '/logos/100px/Farmington.png', hidden: false, sort_order: null },
  { album_key: 'k2', source: 'kjcardinal', name: 'Farmington-Nute football vs Hillsboro-Deering Sept 12 2026',
    url: 'https://kjcardinal.smugmug.com/Sports/FHS/Farmington-Nute-football-vs-Hillsboro-Deering-Sept-12-2026',
    image_count: 340, album_date: '2026-09-12T21:00:00Z', sport: 'Football',
    thumbnail_url: null, hidden: false, sort_order: null },
  { album_key: 'b1', source: 'ball603', name: 'Trinity at Farmington (09.09.26) - KJ CARDINAL',
    url: 'https://ball603.smugmug.com/Volleyball/2026/Trinity-at-Farmington-Sept-9-2026-KJ-CARDINAL',
    image_count: 81, album_date: '2026-09-10T07:48:52Z', sport: 'Volleyball',
    thumbnail_url: '/logos/100px/Farmington.png', hidden: false, sort_order: null },
  { album_key: 'b2', source: 'ball603', name: 'Groveton Girls vs. Farmington (03.04.26) - Shawna Hurlbert',
    url: 'https://ball603.smugmug.com/Basketball/2025-26/Groveton-Girls-at-Farmington-030426-Shawna-Hurlbert',
    image_count: 68, album_date: '2026-03-06T01:03:13Z', sport: 'Basketball',
    thumbnail_url: '/logos/100px/Farmington.png', hidden: false, sort_order: null },
  { album_key: 'k3', source: 'kjcardinal', name: 'FHS Orange & Black Friday Alumni Game Nov 28 2025',
    url: 'https://kjcardinal.smugmug.com/Sports/FHS/FHS-Orange-Black-Friday-Alumni-Game-Nov-28-2025',
    image_count: 55, album_date: '2025-11-29T02:00:00Z', sport: null,
    thumbnail_url: null, hidden: false, sort_order: null }
];

/* The three fan stories. Slot 2 is a draft, which the read policy keeps out of
   the anon result — the fixture includes it anyway so the page is tested
   against a row it should refuse to draw even if one slipped through. */
export const STORIES = [
  { slot: 1, headline: 'Tigers sweep Hillsboro-Deering on senior night',
    body: '<p>The gym was <strong>full</strong> and the Tigers did not waste it.</p><p>Second paragraph.</p>',
    image_url: '/logos/100px/Farmington.png', published: true },
  { slot: 2, headline: 'Half-written thought', body: '<p>Not ready.</p>',
    image_url: null, published: false },
  { slot: 3, headline: 'What the student section meant this year',
    body: '<p>A word from the bleachers.</p><ul><li>Loud</li><li>Orange</li></ul>',
    image_url: null, published: true }
];

/* A genuine 4:5 portrait — the "8x10" KJ wants shown whole rather than cropped
   to a shape it was never taken in. Inline so the test does not depend on the
   little server's stand-in 1x1. */
export const PORTRAIT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAyCAIAAACh0Q7HAAAAM0lEQVR4nO3NMQ0AAAgDsElBK6K5kcFBk/7NdJ2IWCwWi8VisVgsFovFYrFYLBaLxZ/jBQrSdDV3AznIAAAAAElFTkSuQmCC';

/* A story laid out the way the CMS writes one: three images at different sizes
   and positions, one of them linked so it opens full size in a new tab. The
   portrait 2:5 ratio is the "8x10" case — it must come out uncropped. */
export const STORY_WITH_IMAGES = [{
  slot: 1, headline: 'Laid out properly', published: true, image_url: null,
  body:
    '<p>Opening paragraph that should run round the picture beside it, and carry on ' +
    'for long enough that there is something to wrap. More words. And more again.</p>' +
    '<div class="article-image align-left size-small"><img src="' + PORTRAIT + '" alt="">' +
    '<div class="caption">Small, left</div></div>' +
    '<p>Second paragraph, also long enough to wrap around whatever is floated next ' +
    'to it so the test has something real to measure.</p>' +
    '<div class="article-image align-right size-medium"><a href="/logos/100px/Farmington.png" target="_blank" rel="noopener">' +
    '<img src="/logos/100px/Farmington.png" alt=""></a></div>' +
    '<p>Third paragraph.</p>' +
    '<div class="article-image align-center size-large"><img src="/logos/100px/Farmington.png" alt=""></div>' +
    '<p>Closing paragraph.</p>'
}];

/* The real Farmington-Nute soccer roster: a sport Ball603 does not cover, a
   co-op drawn from two schools, two players sharing 20 and two with no number.
   Every one of those is a case the page has to handle. */
export const SOCCER_ROSTER = {
  id: 106, school: 'Farmington', sport: 'soccer', gender: 'Boys', division: 'D-III',
  season: '2026', status: 'approved', head_coach: 'Erik Carney',
  assistant_coaches: 'Jocelyn Schoonmaker',
  players_json: [{"number": "3", "name": "Checotah Boisvert", "class": "SR", "school": "Farmington"}, {"number": "4", "name": "Andrew Zarrella", "class": "JR", "school": "Farmington"}, {"number": "5", "name": "Adrian Collado Vidal", "class": "SR", "school": "Farmington"}, {"number": "6", "name": "Jameson Blair", "class": "SO", "school": "Nute"}, {"number": "7", "name": "Andrew Miller", "class": "SR", "school": "Nute"}, {"number": "8", "name": "Daniel Estes", "class": "SO", "school": "Farmington"}, {"number": "10", "name": "Brandon Bilodeau", "class": "SR", "school": "Nute"}, {"number": "11", "name": "Ethan Levasseur", "class": "SR", "school": "Nute"}, {"number": "12", "name": "Grant Forcier", "class": "FR", "school": "Nute"}, {"number": "13", "name": "Brayden Zappala", "class": "SR", "school": "Farmington"}, {"number": "17", "name": "Henry Richards", "class": "FR", "school": "Nute"}, {"number": "18", "name": "Joshua Johnson", "class": "SO", "school": "Nute"}, {"number": "20", "name": "Brady Corey", "class": "SO", "school": "Farmington"}, {"number": "20", "name": "Brayden Johnson", "class": "SR", "school": "Farmington"}, {"number": "21", "name": "Jeambo Chanthaboune", "class": "SR", "school": "Nute"}, {"number": "24", "name": "Keltin Moulton", "class": "SR", "school": "Farmington"}, {"number": "33", "name": "Brian Olivier", "class": "SR", "school": "Farmington"}, {"number": "", "name": "Ezekiel Gillen", "class": "JR", "school": "Farmington"}, {"number": "", "name": "Jake Kilrain", "class": "SR", "school": "Farmington"}]
};
