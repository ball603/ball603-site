# Where the data comes from

Kept here deliberately. `/netlify/*` is blocked in `_redirects`, so this file
is not publicly served — unlike the client-side files, which are.

**Read this first before working on the Tigers code.** The comments in
`farmington.js` and friends now say "the schedule feed" instead of naming the
provider, so the quirks below are the part that matters.

## The Tigers feed

ArbiterSports widget API — `widgetapi.arbitersports.com/api/v2/widget`.
Two endpoints, both in `sync-farmington.mjs`:

- `roster/{ROSTER_ID}/teams`
- `schedule/{SCHEDULE_ID}/team/{uTeam}?eventtype=all`

Runs hourly at :30 (`netlify.toml`). Manual door: `run-farmington-sync`.

### Quirks that will bite you

- **Golf files one row per opponent.** A single afternoon against three
  schools is three rows on one date. This is NOT duplication. `is_meet` is the
  wrong filter for spotting it — the sync only sets `isMeet` when the feed
  sends a single multi-school row, so one-row-per-opponent golf has
  `is_meet = false`.
- **Cross country behaves the same way.**
- **The feed rewrites `game_date`, `starts_at`, `ends_at` and `game_status`
  every run.** A plain UPDATE to reschedule a game is undone within the hour.
  The durable pattern is: set `hidden = TRUE` on the feed's row and INSERT a
  copy with a negative `unique_game_id` and `is_manual = TRUE`. Neither
  `hidden` nor `is_manual` is ever written by the sync, and `pruneRemoved()`
  spares manual rows.
- **JV2 volleyball** arrives as a separate team whose games duplicate the JV
  ones.
- **One squad can arrive under two gender ids** (Boys on one row, Coed on the
  other).
- **Jr High soccer** has been filed under uteam `5029447` against two
  different opponents, which is why `merge_into` cannot fix it — a team can
  only merge into one other.

### Columns

`feed_my_score`, `feed_opp_score`, `feed_result` were `arbiter_*` until they
were renamed — the client reads `farmington_games` with `select=*`, so column
names travel to the browser. Don't reintroduce a provider name in a column.

`school_logo_url` on standings rows holds an absolute URL on the provider's
asset host. It is rendered through `school-logo.mjs`, which proxies it from
our own domain. Adding a new crest path? Route it through that function, and
add the host to `ALLOWED_HOSTS` — it refuses anything not on the list, so it
cannot be used as an open proxy.

## The main site

NHIAA. The scrapers are the `scrape-*.mjs` functions here. NHIAA is named
openly in editorial copy — it is the governing body whose sports the site
covers, and that is not a secret. What was tidied was the mechanics:
`scraped_at` is now `refreshed_at`, and the CMS comments say "importer".

Still carrying the old name: the `scraper_active` column and the
`activate_scraper` / `deactivate_scraper` actions, referenced in `admin.html`
and five functions. Renaming those needs a DB migration alongside the code.
