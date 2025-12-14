/**
 * Ball603 Navigation Loader
 * Loads header and mobile menu from include files for consistency across all pages
 */

(function() {
  'use strict';

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

    // Expandable submenus - use event delegation on the drawer
    mobileDrawer.addEventListener('click', (e) => {
      // Find if click was on or inside an expandable item's link
      const link = e.target.closest('.mobile-nav-item[data-expandable] > a, .mobile-nav-item[data-expandable] > .mobile-nav-link');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        const item = link.closest('.mobile-nav-item[data-expandable]');
        if (item) {
          item.classList.toggle('expanded');
        }
      }
    });

    // Mobile search
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && mobileSearchInput.value.trim()) {
          window.location.href = '/search?q=' + encodeURIComponent(mobileSearchInput.value.trim());
        }
      });
    }
  }

  /**
   * Initialize header search functionality
   */
  function initHeaderSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchInput = document.getElementById('searchInput');

    if (!searchToggle || !searchDropdown) return;

    // Toggle search dropdown
    searchToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      searchDropdown.classList.toggle('active');
      if (searchDropdown.classList.contains('active') && searchInput) {
        searchInput.focus();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!searchDropdown.contains(e.target) && !searchToggle.contains(e.target)) {
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
