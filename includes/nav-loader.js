/**
 * Ball603 Navigation Loader
 * Loads header and mobile menu from include files for consistency across all pages
 */

(function() {
  'use strict';

  // ===== REGISTER SERVICE WORKER FOR PWA =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] Service Worker registration failed:', error);
        });
    });
  }

  // ===== PWA INSTALL BANNER =====
  let deferredPrompt = null;
  
  // Capture the install prompt event (Android/Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt captured');
    showInstallBanner();
  });

  // Detect platform
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
  
  function isAndroid() {
    return /Android/.test(navigator.userAgent);
  }
  
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }

  // Check if banner was dismissed
  function wasDismissed() {
    const dismissed = localStorage.getItem('ball603_install_dismissed');
    if (!dismissed) return false;
    // Allow showing again after 7 days
    const dismissedTime = parseInt(dismissed, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - dismissedTime) < sevenDays;
  }

  // Create and show the install banner
  function showInstallBanner() {
    // Don't show if already installed, dismissed, or not on mobile
    if (isStandalone() || wasDismissed()) return;
    
    // Only show on mobile or if we have the deferred prompt
    if (!isIOS() && !deferredPrompt) return;

    // Inject banner CSS
    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        color: #fff;
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        z-index: 9999;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
        transform: translateY(100%);
        animation: slideUp 0.4s ease forwards;
        animation-delay: 1s;
      }
      
      @keyframes slideUp {
        to { transform: translateY(0); }
      }
      
      .pwa-install-banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      
      .pwa-install-banner-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        flex-shrink: 0;
      }
      
      .pwa-install-banner-text h4 {
        margin: 0 0 2px;
        font-size: 14px;
        font-weight: 600;
      }
      
      .pwa-install-banner-text p {
        margin: 0;
        font-size: 12px;
        color: #aaa;
      }
      
      .pwa-install-banner-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
      }
      
      .pwa-install-btn {
        background: #f57c00;
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .pwa-install-btn:hover {
        background: #ff9800;
      }
      
      .pwa-dismiss-btn {
        background: transparent;
        color: #888;
        border: none;
        padding: 10px;
        font-size: 12px;
        cursor: pointer;
      }
      
      .pwa-dismiss-btn:hover {
        color: #fff;
      }
      
      /* iOS Instructions Modal */
      .pwa-ios-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        z-index: 10000;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .pwa-ios-modal.active {
        display: flex;
      }
      
      .pwa-ios-content {
        background: #1a1a1a;
        border-radius: 16px;
        padding: 30px;
        max-width: 340px;
        text-align: center;
      }
      
      .pwa-ios-content h3 {
        margin: 0 0 20px;
        font-size: 18px;
        color: #fff;
      }
      
      .pwa-ios-steps {
        text-align: left;
        margin: 20px 0;
      }
      
      .pwa-ios-step {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #333;
        color: #ccc;
        font-size: 14px;
      }
      
      .pwa-ios-step:last-child {
        border-bottom: none;
      }
      
      .pwa-ios-step-num {
        width: 28px;
        height: 28px;
        background: #f57c00;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 13px;
        color: #fff;
        flex-shrink: 0;
      }
      
      .pwa-ios-step svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      
      .pwa-ios-close {
        background: #333;
        color: #fff;
        border: none;
        padding: 12px 30px;
        border-radius: 20px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 10px;
      }
      
      @media (max-width: 480px) {
        .pwa-install-banner {
          flex-direction: column;
          text-align: center;
          padding: 20px;
        }
        
        .pwa-install-banner-content {
          flex-direction: column;
        }
        
        .pwa-install-banner-actions {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);

    // Create banner HTML
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.id = 'pwaInstallBanner';
    banner.innerHTML = `
      <div class="pwa-install-banner-content">
        <img src="/icons/icon-192x192.png" alt="Ball603" class="pwa-install-banner-icon" onerror="this.src='/logo.png'">
        <div class="pwa-install-banner-text">
          <h4>Get the Ball603 App</h4>
          <p>Fast access to scores, schedules & news</p>
        </div>
      </div>
      <div class="pwa-install-banner-actions">
        <button class="pwa-install-btn" id="pwaInstallBtn">Install</button>
        <button class="pwa-dismiss-btn" id="pwaDismissBtn">Not now</button>
      </div>
    `;
    
    // Create iOS instructions modal
    const iosModal = document.createElement('div');
    iosModal.className = 'pwa-ios-modal';
    iosModal.id = 'pwaIosModal';
    iosModal.innerHTML = `
      <div class="pwa-ios-content">
        <img src="/icons/icon-192x192.png" alt="Ball603" style="width: 60px; height: 60px; border-radius: 12px; margin-bottom: 15px;" onerror="this.src='/logo.png'">
        <h3>Add Ball603 to Home Screen</h3>
        <div class="pwa-ios-steps">
          <div class="pwa-ios-step">
            <span class="pwa-ios-step-num">1</span>
            <span>Tap the Share button</span>
            <svg fill="none" stroke="#f57c00" stroke-width="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
          </div>
          <div class="pwa-ios-step">
            <span class="pwa-ios-step-num">2</span>
            <span>Scroll and tap "Add to Home Screen"</span>
          </div>
          <div class="pwa-ios-step">
            <span class="pwa-ios-step-num">3</span>
            <span>Tap "Add" to confirm</span>
          </div>
        </div>
        <button class="pwa-ios-close" id="pwaIosClose">Got it</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(banner);
    document.body.appendChild(iosModal);

    // Event listeners
    document.getElementById('pwaInstallBtn').addEventListener('click', handleInstall);
    document.getElementById('pwaDismissBtn').addEventListener('click', dismissBanner);
    document.getElementById('pwaIosClose').addEventListener('click', () => {
      document.getElementById('pwaIosModal').classList.remove('active');
    });
    iosModal.addEventListener('click', (e) => {
      if (e.target === iosModal) {
        iosModal.classList.remove('active');
      }
    });
  }

  function handleInstall() {
    if (isIOS()) {
      // Show iOS instructions
      document.getElementById('pwaIosModal').classList.add('active');
    } else if (deferredPrompt) {
      // Trigger Android install prompt
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted install');
          hideBanner();
        }
        deferredPrompt = null;
      });
    }
  }

  function dismissBanner() {
    localStorage.setItem('ball603_install_dismissed', Date.now().toString());
    hideBanner();
  }

  function hideBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Show iOS banner after a short delay (no beforeinstallprompt event on iOS)
  if (isIOS() && !isStandalone() && !wasDismissed()) {
    setTimeout(showInstallBanner, 2000);
  }

  let headerLoaded = false;
  let mobileMenuLoaded = false;
  let favoritesModalLoaded = false;

  // Check if all components are loaded, then initialize
  function checkAndInit() {
    if (headerLoaded && mobileMenuLoaded) {
      initMobileMenu();
      initHeaderSearch();
    }
    if (headerLoaded && mobileMenuLoaded && favoritesModalLoaded) {
      initFavoritesModal();
    }
  }

  // Load header
  fetch('/includes/header.html')
    .then(response => response.text())
    .then(html => {
      const headerPlaceholder = document.getElementById('site-header');
      if (headerPlaceholder) {
        headerPlaceholder.innerHTML = html;
      } else {
        // Insert at beginning of body if no placeholder
        document.body.insertAdjacentHTML('afterbegin', html);
      }
      headerLoaded = true;
      checkAndInit();
    })
    .catch(err => console.error('Failed to load header:', err));

  // Load mobile menu
  fetch('/includes/mobile-menu.html')
    .then(response => response.text())
    .then(html => {
      const mobilePlaceholder = document.getElementById('mobile-menu');
      if (mobilePlaceholder) {
        mobilePlaceholder.innerHTML = html;
      } else {
        // Insert after header
        const header = document.querySelector('.site-header');
        if (header) {
          header.insertAdjacentHTML('afterend', html);
        }
      }
      mobileMenuLoaded = true;
      checkAndInit();
    })
    .catch(err => console.error('Failed to load mobile menu:', err));

  // Load favorites modal
  fetch('/includes/favorites-modal.html')
    .then(response => response.text())
    .then(html => {
      document.body.insertAdjacentHTML('beforeend', html);
      favoritesModalLoaded = true;
      checkAndInit();
    })
    .catch(err => console.error('Failed to load favorites modal:', err));

  /**
   * Initialize mobile menu functionality
   */
  function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileClose = document.getElementById('mobileClose');

    if (!mobileToggle || !mobileDrawer) {
      console.error('Mobile menu elements not found');
      return;
    }

    // Open drawer
    mobileToggle.addEventListener('click', () => {
      mobileDrawer.classList.add('active');
      if (mobileOverlay) mobileOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    // Close drawer
    const closeDrawer = () => {
      mobileDrawer.classList.remove('active');
      if (mobileOverlay) mobileOverlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (mobileClose) mobileClose.addEventListener('click', closeDrawer);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeDrawer);

    // Expandable submenus - simplified for better mobile compatibility
    mobileDrawer.addEventListener('click', (e) => {
      // If click was on a subnav link, let it navigate normally
      if (e.target.closest('.mobile-subnav a')) {
        return;
      }
      
      // Check if click was on the main link of an expandable item
      const clickedLink = e.target.closest('.mobile-nav-item[data-expandable] > .mobile-nav-link');
      const clickedItem = e.target.closest('.mobile-nav-item[data-expandable]');
      
      // Only toggle if we clicked directly on the expandable item's main link area
      if (clickedLink || (clickedItem && !e.target.closest('.mobile-subnav'))) {
        e.preventDefault();
        e.stopPropagation();
        if (clickedItem) {
          clickedItem.classList.toggle('expanded');
          console.log('[Nav] Mobile menu expanded:', clickedItem.classList.contains('expanded'));
        }
      }
    });

    // Mobile search
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    
    function doMobileSearch() {
      if (mobileSearchInput && mobileSearchInput.value.trim()) {
        window.location.href = '/search?q=' + encodeURIComponent(mobileSearchInput.value.trim());
      }
    }
    
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doMobileSearch();
        }
      });
      
      // Handle mobile keyboard "search" action
      mobileSearchInput.addEventListener('search', (e) => {
        doMobileSearch();
      });
    }
    
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', doMobileSearch);
    }
  }

  /**
   * Initialize header search functionality
   */
  function initHeaderSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchInput = document.getElementById('searchInput');

    console.log('[Nav] initHeaderSearch called');
    console.log('[Nav] searchToggle:', searchToggle);
    console.log('[Nav] searchDropdown:', searchDropdown);

    if (!searchToggle || !searchDropdown) {
      console.error('[Nav] Search elements not found - searchToggle:', !!searchToggle, 'searchDropdown:', !!searchDropdown);
      return;
    }

    console.log('[Nav] Attaching search toggle click listener');

    // Toggle search dropdown
    searchToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Nav] Search toggle clicked');
      searchDropdown.classList.toggle('active');
      console.log('[Nav] Search dropdown active:', searchDropdown.classList.contains('active'));
      if (searchDropdown.classList.contains('active') && searchInput) {
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!searchDropdown.contains(e.target) && !searchToggle.contains(e.target)) {
        searchDropdown.classList.remove('active');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchDropdown.classList.contains('active')) {
        searchDropdown.classList.remove('active');
      }
    });

    // Search on Enter
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
          window.location.href = '/search?q=' + encodeURIComponent(searchInput.value.trim());
        }
      });
    }

    console.log('[Nav] Header search initialized successfully');
  }

  /**
   * Initialize favorites modal functionality
   */
  function initFavoritesModal() {
    const modal = document.getElementById('favoritesModal');
    const overlay = document.getElementById('favoritesOverlay');
    const closeBtn = document.getElementById('favoritesClose');
    const saveBtn = document.getElementById('favoritesSave');
    const clearBtn = document.getElementById('favoritesClearAll');
    const teamSearch = document.getElementById('favoritesTeamSearch');
    const clearSearch = document.getElementById('favoritesClearSearch');
    const headerToggle = document.getElementById('favoritesToggle');
    const mobileToggle = document.getElementById('mobileFavoritesToggle');

    if (!modal || !overlay) return;

    // Open modal from header
    if (headerToggle) {
      headerToggle.addEventListener('click', openFavoritesModal);
    }

    // Open modal from mobile menu
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        // Close mobile drawer first
        const mobileDrawer = document.getElementById('mobileDrawer');
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileDrawer) mobileDrawer.classList.remove('active');
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Then open favorites modal
        setTimeout(openFavoritesModal, 200);
      });
    }

    // Close modal
    if (closeBtn) closeBtn.addEventListener('click', closeFavoritesModal);
    overlay.addEventListener('click', closeFavoritesModal);

    // Save favorites
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveFavoritesFromModal();
        closeFavoritesModal();
        // Dispatch event so pages can re-render
        document.dispatchEvent(new CustomEvent('favorites:updated'));
      });
    }

    // Clear all
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        // Uncheck all divisions
        document.querySelectorAll('.favorites-divisions input').forEach(cb => cb.checked = false);
        // Clear all team selections
        window._tempSelectedTeams = [];
        renderSelectedTags();
        renderTeamsList();
      });
    }

    // Team search
    if (teamSearch) {
      console.log('Attaching search listener to:', teamSearch);
      teamSearch.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        console.log('Search query:', query);
        clearSearch.style.display = query ? 'block' : 'none';
        filterTeamsList(query);
      });
      // Also handle keyup for better compatibility
      teamSearch.addEventListener('keyup', (e) => {
        const query = e.target.value.trim().toLowerCase();
        clearSearch.style.display = query ? 'block' : 'none';
        filterTeamsList(query);
      });
    } else {
      console.error('Could not find favoritesTeamSearch element');
    }

    // Clear search
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        teamSearch.value = '';
        clearSearch.style.display = 'none';
        filterTeamsList('');
      });
    }

    // Update header button state
    updateFavoritesButtonState();
  }

  function openFavoritesModal() {
    const modal = document.getElementById('favoritesModal');
    const overlay = document.getElementById('favoritesOverlay');
    
    // Load current favorites
    const favorites = loadFavorites();
    window._tempSelectedTeams = [...(favorites.teams || [])];
    
    // Set division checkboxes
    document.getElementById('favDiv1').checked = favorites.divisions?.includes('D1') || false;
    document.getElementById('favDiv2').checked = favorites.divisions?.includes('D2') || false;
    document.getElementById('favDiv3').checked = favorites.divisions?.includes('D3') || false;
    document.getElementById('favDiv4').checked = favorites.divisions?.includes('D4') || false;
    
    // Load teams list
    loadTeamsForModal();
    
    // Show modal
    modal.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeFavoritesModal() {
    const modal = document.getElementById('favoritesModal');
    const overlay = document.getElementById('favoritesOverlay');
    
    modal.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function loadTeamsForModal() {
    const listContainer = document.getElementById('favoritesTeamsList');
    
    // Try to get teams from Ball603 state first
    let teams = window.Ball603?.state?.teams || [];
    
    if (teams.length === 0) {
      // Fetch teams if not loaded
      try {
        const response = await fetch('/.netlify/functions/teams?active=true');
        const data = await response.json();
        teams = data.teams || [];
      } catch (err) {
        console.error('Failed to load teams:', err);
        listContainer.innerHTML = '<div class="favorites-no-results">Failed to load teams</div>';
        return;
      }
    }
    
    console.log('All teams loaded:', teams.length);
    
    // Filter to high school teams only
    const hsTeams = teams.filter(t => t.level === 'High School');
    console.log('High school teams:', hsTeams.length);
    
    // Get college teams too
    const collegeTeams = teams.filter(t => t.level === 'College');
    console.log('College teams:', collegeTeams.length);
    
    // Deduplicate by shortname (teams have separate Boys/Girls records)
    const uniqueTeams = [];
    const seen = new Set();
    
    // Add HS teams first
    for (const team of hsTeams) {
      if (!seen.has(team.shortname)) {
        seen.add(team.shortname);
        uniqueTeams.push({ ...team, teamType: 'HS' });
      }
    }
    
    // Add college teams
    for (const team of collegeTeams) {
      if (!seen.has(team.shortname)) {
        seen.add(team.shortname);
        uniqueTeams.push({ ...team, teamType: 'College' });
      }
    }
    
    // Sort alphabetically
    uniqueTeams.sort((a, b) => a.shortname.localeCompare(b.shortname));
    console.log('Unique teams:', uniqueTeams.length);
    
    // Store flat list for filtering
    window._teamsForModal = uniqueTeams;
    
    renderTeamsList();
    renderSelectedTags();
  }

  function renderTeamsList(filter = '') {
    const listContainer = document.getElementById('favoritesTeamsList');
    const allTeams = window._teamsForModal || [];
    const selectedTeams = window._tempSelectedTeams || [];
    
    const filteredTeams = filter 
      ? allTeams.filter(t => t.shortname.toLowerCase().includes(filter) || t.full_name?.toLowerCase().includes(filter))
      : allTeams;
    
    if (filteredTeams.length === 0) {
      listContainer.innerHTML = '<div class="favorites-no-results">No teams found</div>';
      return;
    }
    
    let html = '';
    for (const team of filteredTeams) {
      const isSelected = selectedTeams.includes(team.shortname);
      const logoFilename = team.logo_filename || (team.shortname.replace(/[^a-zA-Z0-9]/g, '') + '.png');
      const typeLabel = team.teamType === 'College' ? '<span class="favorites-team-type">College</span>' : '';
      
      html += `
        <div class="favorites-team-item ${isSelected ? 'selected' : ''}" data-team="${team.shortname}">
          <img class="favorites-team-logo" src="/logos/100px/${logoFilename}" alt="" onerror="this.style.display='none'">
          <span class="favorites-team-name">${team.shortname}${typeLabel}</span>
          <span class="favorites-team-check"></span>
        </div>
      `;
    }
    
    listContainer.innerHTML = html;
    
    // Add click handlers
    listContainer.querySelectorAll('.favorites-team-item').forEach(item => {
      item.addEventListener('click', () => {
        const teamName = item.dataset.team;
        toggleTeamSelection(teamName);
      });
    });
  }

  function toggleTeamSelection(teamName) {
    const selectedTeams = window._tempSelectedTeams || [];
    const index = selectedTeams.indexOf(teamName);
    
    if (index > -1) {
      selectedTeams.splice(index, 1);
    } else {
      selectedTeams.push(teamName);
    }
    
    window._tempSelectedTeams = selectedTeams;
    renderTeamsList(document.getElementById('favoritesTeamSearch')?.value?.toLowerCase() || '');
    renderSelectedTags();
  }

  function renderSelectedTags() {
    const container = document.getElementById('favoritesSelected');
    const selectedTeams = window._tempSelectedTeams || [];
    
    if (selectedTeams.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    container.innerHTML = selectedTeams.map(team => `
      <span class="favorites-tag">
        ${team}
        <button class="favorites-tag-remove" data-team="${team}">&times;</button>
      </span>
    `).join('');
    
    // Add remove handlers
    container.querySelectorAll('.favorites-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTeamSelection(btn.dataset.team);
      });
    });
  }

  function filterTeamsList(query) {
    renderTeamsList(query);
  }

  function saveFavoritesFromModal() {
    const divisions = [];
    if (document.getElementById('favDiv1').checked) divisions.push('D1');
    if (document.getElementById('favDiv2').checked) divisions.push('D2');
    if (document.getElementById('favDiv3').checked) divisions.push('D3');
    if (document.getElementById('favDiv4').checked) divisions.push('D4');
    
    const teams = window._tempSelectedTeams || [];
    
    const favorites = { teams, divisions };
    localStorage.setItem('ball603Favorites', JSON.stringify(favorites));
    
    // Update button state
    updateFavoritesButtonState();
    
    // Show toast if Ball603 is available
    if (window.Ball603?.showToast) {
      const count = teams.length + divisions.length;
      window.Ball603.showToast(
        count > 0 ? `Saved ${teams.length} team${teams.length !== 1 ? 's' : ''} and ${divisions.length} division${divisions.length !== 1 ? 's' : ''}` : 'Favorites cleared',
        'success'
      );
    }
  }

  function loadFavorites() {
    try {
      const saved = localStorage.getItem('ball603Favorites');
      return saved ? JSON.parse(saved) : { teams: [], divisions: [] };
    } catch {
      return { teams: [], divisions: [] };
    }
  }

  function updateFavoritesButtonState() {
    const favorites = loadFavorites();
    const hasAny = (favorites.teams?.length > 0) || (favorites.divisions?.length > 0);
    
    const headerToggle = document.getElementById('favoritesToggle');
    const mobileCount = document.getElementById('favoritesCount');
    
    if (headerToggle) {
      headerToggle.classList.toggle('has-favorites', hasAny);
    }
    
    if (mobileCount) {
      const count = (favorites.teams?.length || 0) + (favorites.divisions?.length || 0);
      mobileCount.textContent = count;
      mobileCount.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  // Expose for external use
  window.Ball603Favorites = {
    load: loadFavorites,
    open: openFavoritesModal
  };

})();
