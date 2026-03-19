// Ball603 Season Archive Configuration
// ─────────────────────────────────────────────────────────────────────────────
// When a season ends, add it to the front of the relevant sport's array.
// Keep newest first. The first entry is always treated as the "current" season
// for that sport when displaying archived data.
//
// The season dropdown on standings, RPI, playoffs, and rosters pages will
// appear automatically once 2+ seasons exist for a sport.
//
// Format:
//   basketball  → "YYYY-YY"  (e.g. "2025-26")
//   baseball    → "YYYY"     (e.g. "2026")
//   volleyball  → "YYYY"     (e.g. "2026")
// ─────────────────────────────────────────────────────────────────────────────

const BALL603_SEASONS = {
  basketball: ['2025-26'],  // ← prepend next season here when it ends: '2026-27'
  baseball:   ['2026'],     // ← prepend next season here when it ends: '2027'
  volleyball: []            // ← add seasons when volleyball launches
};

// Returns the most recent (current) season for a sport
function getLatestSeason(sport) {
  const seasons = BALL603_SEASONS[sport];
  if (seasons && seasons.length > 0) return seasons[0];
  // Fallback: compute dynamically if not in config yet
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  if (sport === 'basketball') {
    return month === 12 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  }
  return String(year);
}

// Populates a <select> element with seasons for the given sport.
// Hides the select if only 1 season exists (nothing to switch to).
// selectId   - the id of the <select> element
// sport      - 'basketball' | 'baseball' | 'volleyball'
// current    - the currently active season string
// onChange   - callback(season) when selection changes
function populateSeasonSelect(selectId, sport, current, onChange) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const seasons = BALL603_SEASONS[sport] || [];

  if (seasons.length < 2) {
    select.style.display = 'none';
    return;
  }

  select.innerHTML = seasons.map(s =>
    `<option value="${s}"${s === current ? ' selected' : ''}>${s}</option>`
  ).join('');

  select.onchange = () => onChange(select.value);
  select.style.display = '';
}
