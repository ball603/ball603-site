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
 * First checks teams database for logo_filename, then falls back to name conversion
 */
function getLogoFilename(teamName) {
  if (!teamName) return 'Ball603-white.png';
  
  // First, try to find the team in state.teams and use their logo_filename
  if (state.teams && state.teams.length > 0) {
    const team = state.teams.find(t => 
      t.shortname === teamName || 
      t.full_name === teamName || 
      t.abbrev === teamName ||
      (t.shortname && teamName.toLowerCase() === t.shortname.toLowerCase()) ||
      (t.full_name && teamName.toLowerCase() === t.full_name.toLowerCase())
    );
    
    if (team && team.logo_filename) {
      return team.logo_filename;
    }
  }
  
  // Fallback: Handle special cases for teams not in database (e.g., colleges)
  const specialCases = {
    'UNH': 'UNH.png',
    'University of New Hampshire': 'UNH.png',
    'SNHU': 'SouthernNewHampshire.png',
    'Southern New Hampshire': 'SouthernNewHampshire.png',
    'Southern New Hampshire University': 'SouthernNewHampshire.png',
    'Dartmouth': 'Dartmouth.png',
    'Dartmouth College': 'Dartmouth.png',
    'St. Anselm': 'SaintAnselm.png',
    'Saint Anselm': 'SaintAnselm.png',
    'St. Anselm College': 'SaintAnselm.png',
    'Saint Anselm College': 'SaintAnselm.png',
    'Franklin Pierce': 'FranklinPierce.png',
    'Franklin Pierce University': 'FranklinPierce.png',
    'Keene State': 'KeeneState.png',
    'Keene State College': 'KeeneState.png',
    'Plymouth State': 'PlymouthState.png',
    'Plymouth State University': 'PlymouthState.png',
    'Rivier': 'Rivier.png',
    'Rivier University': 'Rivier.png',
    'NEC': 'NewEnglandCollege.png',
    'New England College': 'NewEnglandCollege.png',
    'Colby-Sawyer': 'ColbySawyer.png',
    'Colby-Sawyer College': 'ColbySawyer.png'
  };
  
  if (specialCases[teamName]) {
    return specialCases[teamName];
  }
  
  // Final fallback: Convert team name to PascalCase filename
  // e.g., "Bishop Brady" -> "BishopBrady.png"
  const filename = teamName
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '') + '.png';
  
  return filename;
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
 * Load favorites from localStorage
 */
function loadFavorites() {
  try {
    const saved = localStorage.getItem('ball603Favorites');
    return saved ? JSON.parse(saved) : { teams: [], divisions: [] };
  } catch {
    return { teams: [], divisions: [] };
  }
}

/**
 * Check if a game involves a favorite team or division
 * Returns priority: 0 = favorite team, 1 = favorite division, 2 = neither
 */
function getGamePriority(game) {
  const favorites = loadFavorites();
  
  // Check if either team is a favorite
  if (favorites.teams?.length > 0) {
    const homeLower = (game.home || '').toLowerCase();
    const awayLower = (game.away || '').toLowerCase();
    
    const homeMatch = favorites.teams.some(t => {
      const favLower = t.toLowerCase();
      // Check exact match, or if one contains the other
      return homeLower === favLower || 
             homeLower.includes(favLower) || 
             favLower.includes(homeLower);
    });
    
    const awayMatch = favorites.teams.some(t => {
      const favLower = t.toLowerCase();
      return awayLower === favLower || 
             awayLower.includes(favLower) || 
             favLower.includes(awayLower);
    });
    
    if (homeMatch || awayMatch) return 0;
  }
  
  // Check if game is in a favorite division
  // Handle both formats: D1/D2/D3/D4 (teams) and D-I/D-II/D-III/D-IV (games)
  if (favorites.divisions?.length > 0 && game.division) {
    const divisionMap = {
      'D1': ['D1', 'D-I'],
      'D2': ['D2', 'D-II'],
      'D3': ['D3', 'D-III'],
      'D4': ['D4', 'D-IV']
    };
    
    for (const favDiv of favorites.divisions) {
      const matches = divisionMap[favDiv] || [favDiv];
      if (matches.includes(game.division)) return 1;
    }
  }
  
  return 2;
}

/**
 * Sort games with favorites first
 */
function sortByFavorites(games) {
  return games.sort((a, b) => {
    const priorityA = getGamePriority(a);
    const priorityB = getGamePriority(b);
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // Same priority - sort by date (newest first) then time
    return b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '');
  });
}

/**
 * Get today's games
 */
function getTodaysGames() {
  const today = getTodayString();
  return sortByFavorites(state.games.filter(g => g.date === today));
}

/**
 * Get games with final scores (for ticker)
 */
function getCompletedGames(daysBack = 3) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startStr = startDate.toISOString().split('T')[0];
  
  const completed = state.games.filter(g => {
    const hasScore = g.homeScore !== null && g.awayScore !== null && 
                     g.homeScore !== '' && g.awayScore !== '';
    return hasScore && g.date >= startStr;
  });
  
  return sortByFavorites(completed);
}

/**
 * Get upcoming games
 */
function getUpcomingGames(days = 7) {
  const today = getTodayString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endStr = endDate.toISOString().split('T')[0];
  
  const upcoming = state.games.filter(g => g.date >= today && g.date <= endStr);
  
  // Sort by date first, then by favorites priority within each date
  return upcoming.sort((a, b) => {
    // First by date (ascending - soonest first)
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    
    // Then by favorites priority
    const priorityA = getGamePriority(a);
    const priorityB = getGamePriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // Finally by time
    return (a.time || '').localeCompare(b.time || '');
  });
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
 * Open gallery overlay with IG-style carousel
 */
function openGallery(photos, startIndex = 0, title = '') {
  state.currentGallery = photos;
  state.currentPhotoIndex = startIndex;
  
  const overlay = document.getElementById('galleryOverlay');
  if (!overlay) return;
  
  // Update title
  const titleEl = overlay.querySelector('.gallery-title');
  if (titleEl) titleEl.textContent = title;
  
  // Build carousel HTML
  const galleryMain = overlay.querySelector('.gallery-main');
  if (galleryMain) {
    const slidesHtml = photos.map((photo, i) => `
      <div class="gallery-slide" data-index="${i}">
        <img src="${photo.src || photo.url}" alt="${photo.caption || ''}" loading="${i <= startIndex + 2 ? 'eager' : 'lazy'}">
      </div>
    `).join('');
    
    galleryMain.innerHTML = `<div class="gallery-carousel" id="galleryCarousel">${slidesHtml}</div>`;
  }
  
  // Render dots
  renderGalleryDots();
  
  // Position carousel at start index
  updateCarouselPosition(false);
  
  // Update count
  const count = document.getElementById('galleryCount');
  if (count) count.textContent = `${startIndex + 1} / ${photos.length}`;
  
  // Show overlay
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Preload adjacent images
  preloadAdjacentImages();
}

/**
 * Close gallery overlay
 */
function closeGallery() {
  const overlay = document.getElementById('galleryOverlay');
  if (!overlay) return;
  
  // Reset zoom if available
  if (window.Ball603?._resetZoom) {
    window.Ball603._resetZoom();
  }
  
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
  updateCarouselPosition(true);
  preloadAdjacentImages();
}

/**
 * Navigate to previous photo
 */
function prevPhoto() {
  if (!state.currentGallery) return;
  state.currentPhotoIndex = (state.currentPhotoIndex - 1 + state.currentGallery.length) % state.currentGallery.length;
  updateCarouselPosition(true);
  preloadAdjacentImages();
}

/**
 * Go to specific photo
 */
function goToPhoto(index) {
  if (!state.currentGallery) return;
  state.currentPhotoIndex = index;
  updateCarouselPosition(true);
  preloadAdjacentImages();
}

/**
 * Update carousel position (IG-style)
 */
function updateCarouselPosition(animate = true) {
  if (!state.currentGallery) return;
  
  const carousel = document.getElementById('galleryCarousel');
  if (carousel) {
    const offset = -state.currentPhotoIndex * 100;
    carousel.style.transition = animate ? 'transform 0.3s ease-out' : 'none';
    carousel.style.transform = `translateX(${offset}%)`;
  }
  
  // Update caption
  const photo = state.currentGallery[state.currentPhotoIndex];
  const caption = document.getElementById('galleryCaption');
  if (caption) caption.textContent = photo?.caption || '';
  
  // Update count
  const count = document.getElementById('galleryCount');
  if (count) count.textContent = `${state.currentPhotoIndex + 1} / ${state.currentGallery.length}`;
  
  // Update dots
  document.querySelectorAll('.gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.currentPhotoIndex);
  });
}

/**
 * Update gallery display (legacy compatibility)
 */
function updateGalleryPhoto() {
  updateCarouselPosition(true);
}

/**
 * Preload next/prev images for faster navigation
 */
function preloadAdjacentImages() {
  if (!state.currentGallery || state.currentGallery.length <= 1) return;
  
  const total = state.currentGallery.length;
  const current = state.currentPhotoIndex;
  
  // Preload next and previous
  [1, -1, 2].forEach(offset => {
    const index = (current + offset + total) % total;
    const photo = state.currentGallery[index];
    if (photo && photo.src) {
      const preload = new Image();
      preload.src = photo.src;
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
  let isDragging = false;
  let dragDirection = null;
  
  // Pinch zoom state
  let initialPinchDistance = 0;
  let currentScale = 1;
  let startScale = 1;
  let isPinching = false;
  let translateX = 0;
  let translateY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  let lastTapTime = 0;
  
  function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function getCurrentImage() {
    const currentSlide = document.querySelector(`.gallery-slide[data-index="${state.currentPhotoIndex}"]`);
    return currentSlide?.querySelector('img');
  }
  
  function applyTransform(img) {
    if (!img) return;
    img.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
  }
  
  function resetZoom() {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    const img = getCurrentImage();
    if (img) {
      img.style.transition = 'transform 0.2s ease-out';
      applyTransform(img);
      setTimeout(() => { img.style.transition = ''; }, 200);
    }
  }
  
  overlay.addEventListener('touchstart', (e) => {
    const img = getCurrentImage();
    
    // Double-tap detection
    const now = Date.now();
    if (e.touches.length === 1 && now - lastTapTime < 300) {
      // Double tap - toggle zoom
      e.preventDefault();
      if (currentScale > 1) {
        resetZoom();
      } else {
        currentScale = 2.5;
        translateX = 0;
        translateY = 0;
        if (img) {
          img.style.transition = 'transform 0.2s ease-out';
          applyTransform(img);
          setTimeout(() => { img.style.transition = ''; }, 200);
        }
      }
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;
    
    // Pinch start
    if (e.touches.length === 2) {
      isPinching = true;
      isDragging = false;
      initialPinchDistance = getDistance(e.touches);
      startScale = currentScale;
      startTranslateX = translateX;
      startTranslateY = translateY;
      return;
    }
    
    // Single touch start
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = true;
    dragDirection = null;
    startTranslateX = translateX;
    startTranslateY = translateY;
    
    // Disable carousel transition during drag
    const carousel = document.getElementById('galleryCarousel');
    if (carousel && currentScale === 1) {
      carousel.classList.add('dragging');
    }
  }, { passive: false });
  
  overlay.addEventListener('touchmove', (e) => {
    if (!overlay.classList.contains('active')) return;
    
    const img = getCurrentImage();
    
    // Pinch zoom
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      const scale = (newDistance / initialPinchDistance) * startScale;
      currentScale = Math.max(1, Math.min(5, scale));
      applyTransform(img);
      return;
    }
    
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;
    
    // If zoomed in, pan the image
    if (currentScale > 1) {
      e.preventDefault();
      translateX = startTranslateX + diffX / currentScale;
      translateY = startTranslateY + diffY / currentScale;
      applyTransform(img);
      return;
    }
    
    // Normal swipe behavior when not zoomed
    if (!dragDirection && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      dragDirection = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
    }
    
    if (dragDirection === 'horizontal') {
      e.preventDefault();
      const carousel = document.getElementById('galleryCarousel');
      if (carousel && state.currentGallery) {
        const percentOffset = (diffX / window.innerWidth) * 100;
        const currentOffset = -state.currentPhotoIndex * 100;
        carousel.style.transform = `translateX(${currentOffset + percentOffset}%)`;
      }
    } else if (dragDirection === 'vertical') {
      e.preventDefault();
    }
  }, { passive: false });
  
  overlay.addEventListener('touchend', (e) => {
    const img = getCurrentImage();
    
    // End pinch
    if (isPinching) {
      isPinching = false;
      // Snap to 1 if close
      if (currentScale < 1.1) {
        resetZoom();
      }
      return;
    }
    
    if (!isDragging) return;
    isDragging = false;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    const carousel = document.getElementById('galleryCarousel');
    if (carousel) {
      carousel.classList.remove('dragging');
    }
    
    // If zoomed, don't do swipe navigation
    if (currentScale > 1) {
      return;
    }
    
    // Horizontal swipe threshold
    const swipeThreshold = window.innerWidth * 0.2;
    
    if (dragDirection === 'horizontal' && Math.abs(diffX) > swipeThreshold) {
      // Reset zoom when changing photos
      resetZoom();
      if (diffX > 0) {
        prevPhoto();
      } else {
        nextPhoto();
      }
    } else if (dragDirection === 'horizontal') {
      updateCarouselPosition(true);
    }
    // Vertical swipe to close
    else if (dragDirection === 'vertical' && Math.abs(diffY) > 80) {
      resetZoom();
      closeGallery();
    }
    
    dragDirection = null;
  }, { passive: true });
  
  // Reset zoom when photo changes
  const originalNextPhoto = nextPhoto;
  const originalPrevPhoto = prevPhoto;
  const originalGoToPhoto = goToPhoto;
  
  window.Ball603._resetZoom = resetZoom;
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
  
  // Fetch initial data (teams first so logo lookups work)
  await fetchTeams();
  await Promise.all([
    fetchGames(),
    fetchArticles()
  ]);
  
  // Render ticker with completed games
  renderTicker(getCompletedGames());
  
  // Listen for favorites updates to re-render ticker
  document.addEventListener('favorites:updated', () => {
    renderTicker(getCompletedGames());
  });
  
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
  supabase: null, // Will be set after init
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
  showToast,
  loadFavorites,
  getGamePriority
};
