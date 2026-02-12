/**
 * Ball603 Team Utilities
 * Centralizes team name normalization, slug generation, and logo/URL lookups.
 * 
 * Usage:
 *   1. Load teams from API: const teams = await fetch('/.netlify/functions/teams').then(r => r.json())
 *   2. Initialize: TeamUtils.init(teams.teams)
 *   3. Use: TeamUtils.getSlug('St. Thomas Aquinas') // 'stthomasaquinas'
 *           TeamUtils.getLogoUrl('Saint Thomas')    // '/images/logos/100PX/StThomasAquinas.png'
 *           TeamUtils.getTeamUrl('STA', 'basketball') // '/stthomasaquinas?sport=basketball'
 */

const TeamUtils = (function() {
  'use strict';
  
  let teamsData = [];
  let teamsBySlug = {};      // slug -> team object
  let slugLookup = {};       // normalized input -> canonical slug
  let initialized = false;
  
  // ============================================================
  // DANGEROUS PAIRS - Explicit mappings for ambiguous names
  // These take precedence over auto-generated mappings
  // ============================================================
  const DANGEROUS_PAIRS = {
    // Concord vs Concord Christian
    'concord': 'concord',
    'concordchristian': 'concordchristian',
    'cca': 'concordchristian',
    
    // Merrimack vs Merrimack Valley
    'merrimack': 'merrimack',
    'merrimackvalley': 'merrimackvalley',
    
    // Portsmouth vs Portsmouth Christian  
    'portsmouth': 'portsmouth',
    'portsmouthchristian': 'portsmouthchristian',
    'pca': 'portsmouthchristian',
    
    // Nashua North vs Nashua South (neither matches just "Nashua")
    'nashuanorth': 'nashuanorth',
    'nashuasouth': 'nashuasouth',
    'nn': 'nashuanorth',
    'ns': 'nashuasouth',
    
    // Manchester schools (none matches just "Manchester")
    'manchestercentral': 'manchestercentral',
    'manchestermemorial': 'manchestermemorial',
    'manchesterwest': 'manchesterwest',
    'mc': 'manchestercentral',
    'mm': 'manchestermemorial',
    'mw': 'manchesterwest',
    'centralwest': 'centralwest',
    'manchestercentralwest': 'centralwest',
    'cw': 'centralwest',
    
    // Mascoma = Mascoma Valley (same school)
    'mascoma': 'mascoma',
    'mascomavalley': 'mascoma',
    
    // St. Thomas Aquinas variations
    'stthomas': 'stthomasaquinas',
    'saintthomas': 'stthomasaquinas',
    'sta': 'stthomasaquinas',
    'stthomasaquinas': 'stthomasaquinas',
    'saintthomasaquinas': 'stthomasaquinas'
  };
  
  // ============================================================
  // NORMALIZATION - Convert any input to a lookup key
  // ============================================================
  function normalizeForLookup(input) {
    if (!input) return '';
    return input
      .toLowerCase()
      .replace(/\bsaint\b/gi, 'st')     // saint -> st
      .replace(/\bst\.\s*/gi, 'st')     // st. -> st (with optional space)
      .replace(/[^a-z0-9]/g, '');       // remove all non-alphanumeric
  }
  
  // ============================================================
  // SLUG DERIVATION - Get canonical slug from team data
  // ============================================================
  function deriveSlugFromTeam(team) {
    // Priority: explicit slug > logo_filename > shortname
    if (team.slug) {
      return team.slug.toLowerCase();
    }
    if (team.logo_filename) {
      return team.logo_filename.replace(/\.png$/i, '').toLowerCase();
    }
    if (team.shortname) {
      return normalizeForLookup(team.shortname);
    }
    return null;
  }
  
  // ============================================================
  // INITIALIZATION - Build lookup tables from teams data
  // ============================================================
  function init(teams) {
    if (!teams || !Array.isArray(teams)) {
      console.warn('TeamUtils.init() called with invalid teams data');
      return;
    }
    
    teamsData = teams;
    teamsBySlug = {};
    slugLookup = {};
    
    // First pass: build teamsBySlug and basic lookups
    for (const team of teams) {
      const slug = deriveSlugFromTeam(team);
      if (!slug) continue;
      
      // Store team by slug (first one wins if duplicates - Boys/Girls same school)
      if (!teamsBySlug[slug]) {
        teamsBySlug[slug] = team;
      }
      
      // Map the slug itself
      slugLookup[slug] = slug;
      
      // Map shortname variations
      if (team.shortname) {
        const normalizedShort = normalizeForLookup(team.shortname);
        if (!DANGEROUS_PAIRS[normalizedShort]) {
          slugLookup[normalizedShort] = slug;
        }
      }
      
      // Map full_name variations
      if (team.full_name) {
        const normalizedFull = normalizeForLookup(team.full_name);
        if (!DANGEROUS_PAIRS[normalizedFull]) {
          slugLookup[normalizedFull] = slug;
        }
      }
      
      // Map abbreviation
      if (team.abbrev) {
        const normalizedAbbrev = normalizeForLookup(team.abbrev);
        if (!DANGEROUS_PAIRS[normalizedAbbrev]) {
          slugLookup[normalizedAbbrev] = slug;
        }
      }
      
      // Map ticker_abbrev if different
      if (team.ticker_abbrev && team.ticker_abbrev !== team.abbrev) {
        const normalizedTicker = normalizeForLookup(team.ticker_abbrev);
        if (!DANGEROUS_PAIRS[normalizedTicker]) {
          slugLookup[normalizedTicker] = slug;
        }
      }
    }
    
    // Second pass: apply dangerous pairs (these override any auto-generated)
    for (const [key, value] of Object.entries(DANGEROUS_PAIRS)) {
      slugLookup[key] = value;
    }
    
    initialized = true;
    console.log(`TeamUtils initialized with ${teams.length} teams, ${Object.keys(teamsBySlug).length} unique slugs`);
  }
  
  // ============================================================
  // PUBLIC API
  // ============================================================
  
  /**
   * Get the canonical slug for any team name input
   * @param {string} input - Team name in any format
   * @returns {string|null} - Canonical slug or null if not found
   */
  function getSlug(input) {
    if (!input || input === 'TBD') return null;
    
    const normalized = normalizeForLookup(input);
    
    // Direct lookup
    if (slugLookup[normalized]) {
      return slugLookup[normalized];
    }
    
    // Try partial matching for common patterns
    // e.g., "Bishop Brady" should match even if stored as "bishopbrady"
    for (const [key, slug] of Object.entries(slugLookup)) {
      if (key === normalized || normalized === key) {
        return slug;
      }
    }
    
    return null;
  }
  
  /**
   * Get the full team object for any team name input
   * @param {string} input - Team name in any format
   * @returns {object|null} - Team object from database or null
   */
  function getTeam(input) {
    const slug = getSlug(input);
    return slug ? teamsBySlug[slug] : null;
  }
  
  /**
   * Get the display name (shortname) for any team input
   * @param {string} input - Team name in any format
   * @returns {string} - Display name or original input if not found
   */
  function getDisplayName(input) {
    const team = getTeam(input);
    return team ? team.shortname : input;
  }
  
  /**
   * Get the logo filename for any team input
   * @param {string} input - Team name in any format
   * @returns {string} - Logo filename (e.g., "StThomasAquinas.png")
   */
  function getLogoFilename(input) {
    const team = getTeam(input);
    
    if (team && team.logo_filename) {
      return team.logo_filename;
    }
    
    // Fallback: derive from slug with PascalCase conversion
    const slug = getSlug(input);
    if (slug) {
      // Best effort: capitalize first letter
      // This won't be perfect for multi-word names but it's a fallback
      return slug.charAt(0).toUpperCase() + slug.slice(1) + '.png';
    }
    
    // Ultimate fallback
    return 'Ball603-white.png';
  }
  
  /**
   * Get the full logo URL for any team input
   * @param {string} input - Team name in any format
   * @param {string} size - Logo size folder ('100px', '200px', '400px')
   * @returns {string} - Full logo URL
   */
  function getLogoUrl(input, size = '100px') {
    const filename = getLogoFilename(input);
    return `/logos/${size}/${filename}`;
  }
  
  /**
   * Get the team page URL for any team input
   * @param {string} input - Team name in any format
   * @param {string} sport - Optional sport parameter
   * @returns {string|null} - Team page URL or null if not found
   */
  function getTeamUrl(input, sport = null) {
    const slug = getSlug(input);
    if (!slug) return null;
    
    const sportParam = sport && sport !== 'all' ? `?sport=${sport}` : '';
    return `/${slug}${sportParam}`;
  }
  
  /**
   * Check if a team name is recognized
   * @param {string} input - Team name to check
   * @returns {boolean}
   */
  function isKnownTeam(input) {
    return getSlug(input) !== null;
  }
  
  /**
   * Get team colors
   * @param {string} input - Team name in any format
   * @returns {object} - { primary: '#hex', secondary: '#hex' } or defaults
   */
  function getTeamColors(input) {
    const team = getTeam(input);
    if (team) {
      return {
        primary: team.primary_hex || '#1a1a1a',
        secondary: team.secondary_hex || '#ffffff'
      };
    }
    return { primary: '#1a1a1a', secondary: '#ffffff' };
  }
  
  /**
   * Get team mascot
   * @param {string} input - Team name in any format
   * @returns {string} - Mascot name or empty string
   */
  function getMascot(input) {
    const team = getTeam(input);
    return team ? (team.mascot || '') : '';
  }
  
  /**
   * Get all teams (for dropdowns, etc.)
   * @param {object} filters - Optional filters { level, division, gender, active }
   * @returns {array} - Filtered teams array
   */
  function getAllTeams(filters = {}) {
    let result = [...teamsData];
    
    if (filters.level) {
      result = result.filter(t => t.level === filters.level);
    }
    if (filters.division) {
      result = result.filter(t => t.division === filters.division);
    }
    if (filters.gender) {
      result = result.filter(t => t.gender === filters.gender);
    }
    if (filters.active !== undefined) {
      result = result.filter(t => t.active === filters.active);
    }
    
    return result;
  }
  
  /**
   * Debug: show what a name resolves to
   * @param {string} input - Team name to debug
   */
  function debug(input) {
    const normalized = normalizeForLookup(input);
    const slug = getSlug(input);
    const team = getTeam(input);
    
    console.log('TeamUtils Debug:');
    console.log('  Input:', input);
    console.log('  Normalized:', normalized);
    console.log('  Resolved slug:', slug);
    console.log('  Team found:', team ? team.shortname : 'NO');
    console.log('  Logo:', getLogoFilename(input));
    console.log('  URL:', getTeamUrl(input));
  }
  
  // ============================================================
  // EXPORT
  // ============================================================
  return {
    init,
    getSlug,
    getTeam,
    getDisplayName,
    getLogoFilename,
    getLogoUrl,
    getTeamUrl,
    isKnownTeam,
    getTeamColors,
    getMascot,
    getAllTeams,
    debug,
    // Expose for advanced use
    normalizeForLookup,
    isInitialized: () => initialized
  };
  
})();

// Export for Node.js / Netlify Functions (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeamUtils;
}
