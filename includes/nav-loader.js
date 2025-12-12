/**
 * Ball603 Navigation Loader
 * Loads header and mobile menu from include files for consistency across all pages
 */

(function() {
  'use strict';

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
      initHeaderSearch();
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
      initMobileMenu();
    })
    .catch(err => console.error('Failed to load mobile menu:', err));

  /**
   * Initialize mobile menu functionality
   */
  function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileClose = document.getElementById('mobileClose');

    if (!mobileToggle || !mobileDrawer) return;

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

    // Expandable submenus
    document.querySelectorAll('.mobile-nav-item[data-expandable]').forEach(item => {
      const link = item.querySelector('.mobile-nav-link');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          item.classList.toggle('expanded');
        });
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

})();
