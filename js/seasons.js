/* Ball603 seasons for contributor profiles.
 *
 * A new season starts every July 1: on July 1, 2027 the current season becomes
 * 2027-28 by itself. Nothing to update by hand and no scheduled job — every
 * page works it out from today's date.
 *
 * Used by admin.html and contributor-portal.html (the "First Season" dropdowns)
 * and by our-team.html and index.html ("3rd Season" on contributor profiles).
 */
(function (root) {
  'use strict';

  var FIRST = 2021;                 // Ball603's first season: 2021-22

  function label(startYear) {
    return startYear + '-' + String((startYear + 1) % 100).padStart(2, '0');
  }

  // Start year of the season in progress. July (month 6) onward is the new one.
  function currentStartYear(today) {
    var d = today || new Date();
    return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  }

  function current(today) { return label(currentStartYear(today)); }

  // Every season from 2021-22 through the current one, oldest first.
  function list(today) {
    var out = [];
    for (var y = FIRST; y <= currentStartYear(today); y++) out.push(label(y));
    return out;
  }

  // 1 for someone whose first season is the current one, 2 for last season...
  // null for anything that isn't a season label.
  function seasonNumber(firstSeason, today) {
    var m = /^(\d{4})-\d{2}$/.exec(String(firstSeason || ''));
    if (!m) return null;
    var n = currentStartYear(today) - Number(m[1]) + 1;
    return n >= 1 ? n : null;
  }

  function ordinal(n) {
    var v = n % 100;
    if (v >= 11 && v <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  }

  // "3rd Season", or '' when it can't be worked out.
  function seasonLabel(firstSeason, today) {
    var n = seasonNumber(firstSeason, today);
    return n ? ordinal(n) + ' Season' : '';
  }

  /* Fill a <select> with every season, oldest first, keeping its first
     "Select..." option and whatever value was chosen. withCount adds
     "(1st season)" etc. to each option. */
  function fillSelect(select, withCount, today) {
    if (!select) return;
    var keep = select.value;
    var placeholder = select.options[0] && select.options[0].value === '' ? select.options[0] : null;
    select.innerHTML = '';
    if (placeholder) select.appendChild(placeholder);
    list(today).forEach(function (s) {
      var o = document.createElement('option');
      o.value = s;
      o.textContent = withCount ? s + ' (' + ordinal(seasonNumber(s, today)) + ' season)' : s;
      select.appendChild(o);
    });
    select.value = keep;
  }

  // Any <select data-seasons> fills itself when the page loads;
  // data-seasons="count" adds "(1st season)" to each option.
  if (typeof document !== 'undefined') {
    var auto = function () {
      document.querySelectorAll('select[data-seasons]').forEach(function (el) {
        fillSelect(el, el.getAttribute('data-seasons') === 'count');
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }

  var api = { current: current, list: list, seasonNumber: seasonNumber, ordinal: ordinal,
              seasonLabel: seasonLabel, fillSelect: fillSelect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Ball603Seasons = api;
})(typeof window !== 'undefined' ? window : globalThis);
