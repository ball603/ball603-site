// Ball603 Season Archive Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Seasons are now managed via the Season Manager in the CMS (admin.html).
// This file fetches the list dynamically from get-site-settings.
//
// FALLBACK: If the API is unavailable, BALL603_SEASONS_FALLBACK is used.
// Keep it up to date as a safety net.
// ─────────────────────────────────────────────────────────────────────────────

const BALL603_SEASONS_FALLBACK = {
  basketball: ['2025-26'],
  baseball:   ['2026'],
  volleyball: []
};

// Cached seasons loaded from the DB
let _seasonsCache = null;
let _seasonsFetchPromise = null;

// Fetch seasons from the API once and cache for the page lifetime
async function fetchSeasons() {
  if (_seasonsCache) return _seasonsCache;
  if (_seasonsFetchPromise) return _seasonsFetchPromise;

  _seasonsFetchPromise = fetch('/.netlify/functions/get-site-settings')
    .then(r => r.json())
    .then(data => {
      if (data.seasons && typeof data.seasons === 'object') {
        _seasonsCache = data.seasons;
      } else {
        _seasonsCache = BALL603_SEASONS_FALLBACK;
      }
      return _seasonsCache;
    })
    .catch(() => {
      _seasonsCache = BALL603_SEASONS_FALLBACK;
      return _seasonsCache;
    });

  return _seasonsFetchPromise;
}

// Returns the most recent season for a sport — sync, uses cache or fallback
function getLatestSeason(sport) {
  const seasons = (_seasonsCache || BALL603_SEASONS_FALLBACK)[sport];
  if (seasons && seasons.length > 0) return seasons[0];
  // Compute dynamically if not in config yet
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  if (sport === 'basketball') {
    return month === 12
      ? `${year}-${String(year + 1).slice(-2)}`
      : `${year - 1}-${String(year).slice(-2)}`;
  }
  return String(year);
}

// Populates a <select> with seasons for the given sport.
// Hidden automatically when only 1 season exists.
// Async — waits for DB fetch before populating.
async function populateSeasonSelect(selectId, sport, current, onChange) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const seasons = await fetchSeasons();
  const sportSeasons = seasons[sport] || [];

  if (sportSeasons.length < 2) {
    select.style.display = 'none';
    return;
  }

  select.innerHTML = sportSeasons.map(s =>
    `<option value="${s}"${s === current ? ' selected' : ''}>${s}</option>`
  ).join('');

  select.onchange = () => onChange(select.value);
  select.style.display = '';
}
