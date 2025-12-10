/**
 * Ball603 Application JavaScript
 * Version: 1.0.0
 * 
 * Shared functionality for the Ball603 website
 */

// ===== CONFIGURATION =====
const CONFIG = {
  SUPABASE_URL: 'https://suncdkxfqkwwnmhosxcf.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1bmNka3hmcWt3d25taG9zeGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNTk4MzIsImV4cCI6MjA4MDYzNTgzMn0.aT6V8Zx_YozqOh1ZnC6x-czI9vo-QhHKmP69PgY-8xw',
  GAMES_API: '/.netlify/functions/get-games',
  LOGO_PATH: '/logos/100px/',
  DEFAULT_LOGO: '/logos/100px/Ball603-white.png'
};

// ===== STATE =====
const state = {
  games: [],
  articles: [],
  teams: [],
  followedTeams: [],
  tickerCollapsed: false,
  currentGallery: null,
  currentPhotoIndex: 0
};

// ===== SUPABASE CLIENT =====
let supabase = null;

function initSupabase() {
  if (window.supabase && !supabase) {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabase;
}

// ===== DATA FETCHING =====

/**
 * Fetch all games from the API
 */
async function fetchGames() {
  try {
    const response = await fetch(CONFIG.GAMES_API);
    const data = await response.json();
    state.games = (data.games || []).map(normalizeGame);
    return state.games;
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
}

/**
 * Fetch published articles from Supabase
 */
async function fetchArticles(limit = 20) {
  try {
    const client = initSupabase();
    if (!client) return [];
    
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    state.articles = data || [];
    return state.articles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

/**
 * Fetch teams from Supabase
 */
async function fetchTeams() {
  try {
    const client = initSupabase();
    if (!client) return [];
    
    const { data, error } = await client
      .from('teams')
      .select('*')
      .eq('active', true)
      .order('full_name');
    
    if (error) throw error;
    state.teams = data || [];
    return state.teams;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

// ===== DATA NORMALIZATION =====

/**
 * Normalize game data from API
 */
function normalizeGame(game) {
  return {
    ...game,
    home: normalizeTeamName(game.home || game.home_team),
    away: normalizeTeamName(game.away || game.away_team),
    homeScore: game.home_score,
    awayScore: game.away_score,
    hasCoverage: !!(game.photos_url || game.recap_url || game.highlights_url),
    hasPhotos: !!game.photos_url,
    hasRecap: !!game.recap_url,
    hasHighlights: !!game.highlights_url,
    hasLiveStream: !!game.live_stream_url
  };
}

/**
 * Normalize team names for consistency
 */
function normalizeTeamName(name) {
  if (!name) return '';
  
  const mappings = {
    'Inter-Lakes': 'Inter-Lakes',
    'Inter Lakes': 'Inter-Lakes',
    'Interlakes': 'Inter-Lakes',
    'Lin-Wood': 'Lin-Wood',
    'Lin Wood': 'Lin-Wood',
    'Linwood': 'Lin-Wood',
    'Wilton-Lyndeborough': 'Wilton-Lyndeborough',
    'Wilton Lyndeborough': 'Wilton-Lyndeborough'
  };
  
  return mappings[name] || name;
}

// ===== DATE/TIME HELPERS =====

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr, format = 'long') {
  const d = new Date(dateStr + 'T00:00:00');
  
  switch (format) {
    case 'short':
      return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    case 'medium':
      return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
    case 'long':
    default:
      return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

/**
 * Format time for display
 */
function formatTime(time) {
  if (!time) return 'TBD';
  if (time.toUpperCase() === 'FINAL') return 'Final';
  if (time.toUpperCase() === 'TBD' || time.toUpperCase() === 'TBA') return 'TBD';
  // Remove leading zero
  return time.replace(/^0/, '');
}

/**
 * Check if a date is today
 */
function isToday(dateStr) {
  return dateStr === getTodayString();
}

// ===== TEAM HELPERS =====

/**
 * Get logo filename for a team
 */
function getLogoFilename(teamName) {
  if (!teamName) return 'Ball603-white.png';
  
  // Handle special cases
  const specialCases = {
    'UNH': 'new-hampshire.png',
    'University of New Hampshire': 'new-hampshire.png',
    'SNHU': 'southern-new-hampshire.png',
    'Southern New Hampshire University': 'southern-new-hampshire.png',
    'Dartmouth': 'dartmouth.png',
    'Dartmouth College': 'dartmouth.png',
    'St. Anselm': 'saint-anselm.png',
    "Saint Anselm": 'saint-anselm.png',
    "St. Anselm College": 'saint-anselm.png',
    'Franklin Pierce': 'franklin-pierce.png',
    'Keene State': 'keene-state.png',
    'Plymouth State': 'plymouth-state.png',
    'Rivier': 'rivier.png',
    'NEC': 'new-england-college.png',
    'New England College': 'new-england-college.png',
    'Colby-Sawyer': 'colby-sawyer.png'
  };
  
  if (specialCases[teamName]) {
    return specialCases[teamName];
  }
  
  // Convert to filename format
  return teamName
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') + '.png';
}

/**
 * Get full logo URL for a team
 */
function getLogoUrl(teamName) {
  return `${CONFIG.LOGO_PATH}${getLogoFilename(teamName)}`;
}

/**
 * Get short name for a team
 */
function getShortName(teamName) {
  if (!teamName) return '';
  
  const shortNames = {
    'Bishop Brady': 'Brady',
    'Bishop Guertin': 'BG',
    'Manchester Central': 'Central',
    'Manchester Memorial': 'Memorial',
    'Manchester West': 'West',
    'Coe-Brown Northwood Academy': 'Coe-Brown',
    'Fall Mountain': 'Fall Mtn',
    'Inter-Lakes': 'I-Lakes',
    'Mascenic Regional': 'Mascenic',
    'Monadnock Regional': 'Monadnock',
    'White Mountains Regional': 'White Mtns',
    'Wilton-Lyndeborough': 'Wilton-Lynd',
    'Southern New Hampshire University': 'SNHU',
    'University of New Hampshire': 'UNH',
    'New England College': 'NEC',
    'Saint Anselm College': 'St. Anselm',
    'Colby-Sawyer College': 'Colby-Sawyer',
    'Franklin Pierce University': 'Franklin Pierce',
    'Keene State College': 'Keene State',
    'Plymouth State University': 'Plymouth St',
    'Rivier University': 'Rivier'
  };
  
  return shortNames[teamName] || teamName;
}

// ===== GAME HELPERS =====

/**
 * Get today's games
 */
function getTodaysGames() {
  const today = getTodayString();
  return state.games.filter(g => g.date === today);
}

/**
 * Get games with final scores (for ticker)
 */
function getCompletedGames(daysBack = 3) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startStr = startDate.toISOString().split('T')[0];
  
  return state.games.filter(g => {
    const hasScore = g.homeScore !== null && g.awayScore !== null && 
                     g.homeScore !== '' && g.awayScore !== '';
    return hasScore && g.date >= startStr;
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
}

/**
 * Get upcoming games
 */
function getUpcomingGames(days = 7) {
  const today = getTodayString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endStr = endDate.toISOString().split('T')[0];
  
  return state.games.filter(g => g.date >= today && g.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
}

/**
 * Format division for display
 */
function formatDivision(game) {
  const parts = [];
  if (game.gender) parts.push(game.gender);
  if (game.division) parts.push(game.division);
  return parts.join(' ');
}

// ===== TICKER =====

/**
 * Initialize the scores ticker
 */
function initTicker() {
  const tickerWrapper = document.getElementById('ticker');
  if (!tickerWrapper) return;
  
  // Load collapsed state from localStorage
  state.tickerCollapsed = localStorage.getItem('tickerCollapsed') === 'true';
  if (state.tickerCollapsed) {
    tickerWrapper.classList.add('collapsed');
  }
}

/**
 * Toggle ticker visibility
 */
function toggleTicker() {
  const tickerWrapper = document.getElementById('ticker');
  if (!tickerWrapper) return;
  
  state.tickerCollapsed = !state.tickerCollapsed;
  tickerWrapper.classList.toggle('collapsed', state.tickerCollapsed);
  localStorage.setItem('tickerCollapsed', state.tickerCollapsed);
}

/**
 * Render the scores ticker
 */
function renderTicker(games) {
  const tickerScroll = document.getElementById('tickerScroll');
  if (!tickerScroll) return;
  
  if (!games || games.length === 0) {
    tickerScroll.innerHTML = '<div class="empty-state">No recent scores</div>';
    return;
  }
  
  tickerScroll.innerHTML = games.map(game => {
    const awayWins = parseInt(game.awayScore) > parseInt(game.homeScore);
    const homeWins = parseInt(game.homeScore) > parseInt(game.awayScore);
    
    let coverageIcons = '';
    if (game.hasPhotos) coverageIcons += '<span class="ticker-coverage-icon">📸</span>';
    if (game.hasRecap) coverageIcons += '<span class="ticker-coverage-icon">✍️</span>';
    if (game.hasHighlights) coverageIcons += '<span class="ticker-coverage-icon">🎥</span>';
    
    return `
      <div class="ticker-game" onclick="goToGame('${game.game_id}')" data-game-id="${game.game_id}">
        <div class="ticker-status final">Final</div>
        <div class="ticker-team">
          <div class="ticker-team-info">
            <img class="ticker-team-logo" src="${getLogoUrl(game.away)}" alt="" onerror="this.src='${CONFIG.DEFAULT_LOGO}'">
            <span class="ticker-team-name ${awayWins ? 'winner' : ''}">${getShortName(game.away)}</span>
          </div>
          <span class="ticker-team-score ${awayWins ? 'winner' : ''}">${game.awayScore}</span>
        </div>
        <div class="ticker-team">
          <div class="ticker-team-info">
            <img class="ticker-team-logo" src="${getLogoUrl(game.home)}" alt="" onerror="this.src='${CONFIG.DEFAULT_LOGO}'">
            <span class="ticker-team-name ${homeWins ? 'winner' : ''}">${getShortName(game.home)}</span>
          </div>
          <span class="ticker-team-score ${homeWins ? 'winner' : ''}">${game.homeScore}</span>
        </div>
        <div class="ticker-meta">
          <span class="ticker-division">${formatDivision(game)}</span>
          ${coverageIcons ? `<div class="ticker-coverage">${coverageIcons}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== NAVIGATION =====

/**
 * Navigate to a game/article page
 */
function goToGame(gameId) {
  // For now, find if there's an article for this game
  const article = state.articles.find(a => a.game_id === gameId);
  if (article) {
    window.location.href = `/articles/${article.slug}`;
  } else {
    // Could show a modal with game details or go to schedule
    console.log('Game:', gameId);
  }
}

/**
 * Navigate to article
 */
function goToArticle(slug) {
  window.location.href = `/articles/${slug}`;
}

// ===== GALLERY =====

/**
 * Open gallery overlay
 */
function openGallery(photos, startIndex = 0, title = '') {
  state.currentGallery = photos;
  state.currentPhotoIndex = startIndex;
  
  const overlay = document.getElementById('galleryOverlay');
  if (!overlay) return;
  
  // Update title
  const titleEl = overlay.querySelector('.gallery-title');
  if (titleEl) titleEl.textContent = title;
  
  // Render dots
  renderGalleryDots();
  
  // Update photo
  updateGalleryPhoto();
  
  // Show overlay
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close gallery overlay
 */
function closeGallery() {
  const overlay = document.getElementById('galleryOverlay');
  if (!overlay) return;
  
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  state.currentGallery = null;
}

/**
 * Navigate to next photo
 */
function nextPhoto() {
  if (!state.currentGallery) return;
  state.currentPhotoIndex = (state.currentPhotoIndex + 1) % state.currentGallery.length;
  updateGalleryPhoto();
}

/**
 * Navigate to previous photo
 */
function prevPhoto() {
  if (!state.currentGallery) return;
  state.currentPhotoIndex = (state.currentPhotoIndex - 1 + state.currentGallery.length) % state.currentGallery.length;
  updateGalleryPhoto();
}

/**
 * Go to specific photo
 */
function goToPhoto(index) {
  if (!state.currentGallery) return;
  state.currentPhotoIndex = index;
  updateGalleryPhoto();
}

/**
 * Update gallery display
 */
function updateGalleryPhoto() {
  if (!state.currentGallery) return;
  
  const photo = state.currentGallery[state.currentPhotoIndex];
  
  // Update image
  const img = document.getElementById('galleryImage');
  if (img) img.src = photo.src || photo.url;
  
  // Update caption
  const caption = document.getElementById('galleryCaption');
  if (caption) caption.textContent = photo.caption || '';
  
  // Update count
  const count = document.getElementById('galleryCount');
  if (count) count.textContent = `${state.currentPhotoIndex + 1} / ${state.currentGallery.length}`;
  
  // Update dots
  document.querySelectorAll('.gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.currentPhotoIndex);
  });
  
  // Preload adjacent images for faster navigation
  preloadAdjacentImages();
}

/**
 * Preload next and previous images
 */
function preloadAdjacentImages() {
  if (!state.currentGallery || state.currentGallery.length < 2) return;
  
  const preloadIndexes = [
    (state.currentPhotoIndex + 1) % state.currentGallery.length,
    (state.currentPhotoIndex - 1 + state.currentGallery.length) % state.currentGallery.length,
    (state.currentPhotoIndex + 2) % state.currentGallery.length
  ];
  
  preloadIndexes.forEach(idx => {
    const photo = state.currentGallery[idx];
    if (photo && (photo.src || photo.url)) {
      const img = new Image();
      img.src = photo.src || photo.url;
    }
  });
}

/**
 * Render gallery dots
 */
function renderGalleryDots() {
  const container = document.getElementById('galleryDots');
  if (!container || !state.currentGallery) return;
  
  container.innerHTML = state.currentGallery.map((_, i) => 
    `<span class="gallery-dot ${i === state.currentPhotoIndex ? 'active' : ''}" onclick="goToPhoto(${i})"></span>`
  ).join('');
}

// ===== KEYBOARD & TOUCH HANDLERS =====

/**
 * Initialize keyboard handlers
 */
function initKeyboardHandlers() {
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('galleryOverlay');
    if (!overlay?.classList.contains('active')) return;
    
    switch (e.key) {
      case 'Escape':
        closeGallery();
        break;
      case 'ArrowRight':
        nextPhoto();
        break;
      case 'ArrowLeft':
        prevPhoto();
        break;
    }
  });
}

/**
 * Initialize touch handlers for gallery
 */
function initTouchHandlers() {
  const overlay = document.getElementById('galleryOverlay');
  if (!overlay) return;
  
  let touchStartX = 0;
  let touchStartY = 0;
  
  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  overlay.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Horizontal swipe (left/right through photos)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) prevPhoto();
      else nextPhoto();
    }
    // Vertical swipe down to close
    else if (diffY > 100) {
      closeGallery();
    }
  }, { passive: true });
}

// ===== FOLLOWED TEAMS =====

/**
 * Load followed teams from localStorage
 */
function loadFollowedTeams() {
  try {
    const saved = localStorage.getItem('followedTeams');
    state.followedTeams = saved ? JSON.parse(saved) : [];
  } catch {
    state.followedTeams = [];
  }
  return state.followedTeams;
}

/**
 * Save followed teams to localStorage
 */
function saveFollowedTeams() {
  localStorage.setItem('followedTeams', JSON.stringify(state.followedTeams));
}

/**
 * Toggle following a team
 */
function toggleFollowTeam(teamName) {
  const index = state.followedTeams.indexOf(teamName);
  if (index > -1) {
    state.followedTeams.splice(index, 1);
  } else {
    state.followedTeams.push(teamName);
  }
  saveFollowedTeams();
  return state.followedTeams.includes(teamName);
}

/**
 * Check if a team is followed
 */
function isTeamFollowed(teamName) {
  return state.followedTeams.includes(teamName);
}

// ===== TOAST NOTIFICATIONS =====

/**
 * Show a toast notification
 */
function showToast(message, type = 'default', duration = 3000) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Show toast
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  // Hide and remove
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== INITIALIZATION =====

/**
 * Initialize the application
 */
async function initApp() {
  // Initialize Supabase
  initSupabase();
  
  // Load followed teams
  loadFollowedTeams();
  
  // Initialize ticker
  initTicker();
  
  // Initialize handlers
  initKeyboardHandlers();
  initTouchHandlers();
  
  // Fetch initial data
  await Promise.all([
    fetchGames(),
    fetchArticles()
  ]);
  
  // Render ticker with completed games
  renderTicker(getCompletedGames());
  
  // Dispatch event for page-specific initialization
  document.dispatchEvent(new CustomEvent('ball603:ready', { detail: state }));
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ===== EXPORTS (for modules) =====
window.Ball603 = {
  state,
  fetchGames,
  fetchArticles,
  fetchTeams,
  getTodaysGames,
  getCompletedGames,
  getUpcomingGames,
  getLogoUrl,
  getShortName,
  formatDate,
  formatTime,
  formatDivision,
  toggleTicker,
  renderTicker,
  openGallery,
  closeGallery,
  nextPhoto,
  prevPhoto,
  goToPhoto,
  goToGame,
  goToArticle,
  toggleFollowTeam,
  isTeamFollowed,
  showToast
};
