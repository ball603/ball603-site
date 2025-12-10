/**
 * Ball603 Contributor Schedule Module
 * Shared schedule functionality for contributor-portal.html and contributors.html
 * 
 * Usage:
 *   const schedule = new ContributorSchedule({
 *     container: '#scheduleContainer',
 *     contributorName: 'KJ Cardinal',  // or null for dropdown mode
 *     showContributorDropdown: false,
 *     onContributorChange: (name) => {},  // callback when contributor changes
 *     supabaseClient: supabase,  // Required for scorebook uploads
 *     apiEndpoints: {
 *       getGames: '/.netlify/functions/get-games',
 *       updateAssignment: '/.netlify/functions/update-assignment'
 *     }
 *   });
 *   schedule.init();
 */

class ContributorSchedule {
  constructor(config) {
    this.config = {
      container: '#scheduleContainer',
      contributorName: null,
      showContributorDropdown: false,
      showAlerts: false,
      showHeader: false,
      adminUser: 'KJ Cardinal',
      onContributorChange: null,
      hidePastGames: false,
      supabaseClient: null, // Pass supabase client for scorebook uploads
      apiEndpoints: {
        getGames: '/.netlify/functions/get-games',
        updateAssignment: '/.netlify/functions/update-assignment'
      },
      ...config
    };
    
    this.allGames = [];
    this.allTeams = [];
    this.currentTab = 'all';
    this.openDropdown = null;
    this.scorebookModal = null;
    this.currentScorebookGameId = null;
    
    this.CONTRIBUTORS = [
      "Andy Romike", "Arinn Roy", "Betsy Hansen", "Cam Place", "Chris Laclair", "Chris Prangley",
      "Christine Gilbert", "Chuck Swierad", "Cindy Lavigne", "Connor Chrusciel", "Danielle Cook",
      "Dave Beliveau", "Frank V Fichera", "Greg Alnwick", "Hannah Smith", "Haven Deschenes",
      "Heather Savage-Erickson", "Heidi Green", "Jeff Criss", "Jessica Bonnette", "Jessica Tate",
      "Jill Stevens", "Jocelyn Sprague", "John Scott Sherburne", "KJ Cardinal", "Leo Cardinal", "LJ Hydock",
      "Logan Paronto", "Marc Hoak", "Maverick Thivierge", "Michael Griffin", "Mike Whaley",
      "Mindy Marcouillier", "Nate Ford", "Nichole Marrero", "Rick Wilson", "Sara Roberts",
      "Shawna Hurlbert", "Shirley Nickles", "Simon Scott", "Stefan Duncan", "Tim Lee",
      "Todd Grzywacz", "Tyson Thomas"
    ].sort();
    
    this.MONTH_NAMES_SHORT = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    
    this.TEAM_NORMALIZATIONS = {
      'Alvirne High School': 'Alvirne',
      'Bedford High School': 'Bedford',
      'Belmont High School': 'Belmont',
      'Berlin Middle High School': 'Berlin',
      'Bishop Brady High School': 'Bishop Brady',
      'Bishop Guertin High School': 'Bishop Guertin',
      'Bow High School': 'Bow',
      'Brewster Academy': 'Brewster',
      'Campbell High School': 'Campbell',
      'Canaan Schools': 'Canaan',
      'Coe-Brown Northwood': 'Coe-Brown',
      'Coe-Brown Northwood Academy': 'Coe-Brown',
      'Colby-Sawyer College': 'Colby-Sawyer',
      'Colebrook Academy': 'Colebrook',
      'ConVal Regional High School': 'ConVal',
      'Conant Middle High School': 'Conant',
      'Concord Christian Academy': 'Concord Christian',
      'Concord High School': 'Concord',
      'Dartmouth College': 'Dartmouth',
      'Derryfield School': 'Derryfield',
      'Dover High School': 'Dover',
      'Epping Middle High School': 'Epping',
      'Exeter High School': 'Exeter',
      'Fall Mountain Regional High School': 'Fall Mountain',
      'Farmington High School': 'Farmington',
      'Franklin High School': 'Franklin',
      'Franklin Pierce University': 'Franklin Pierce',
      'Gilford High School': 'Gilford',
      'Goffstown High School': 'Goffstown',
      'Gorham High School': 'Gorham',
      'Great Bay Community College': 'Great Bay',
      'Groveton High School': 'Groveton',
      'Hanover High School': 'Hanover',
      'Hillsboro-Deering High School': 'Hillsboro-Deering',
      'Hinsdale High School': 'Hinsdale',
      'Holderness School': 'Holderness',
      'Hollis-Brookline High School': 'Hollis-Brookline',
      'Holy Family Academy': 'Holy Family',
      'Hopkinton Middle High School': 'Hopkinton',
      'Inter-Lakes Middle High School': 'Inter-Lakes',
      'John Stark Regional High School': 'John Stark',
      'Kearsarge Regional High School': 'Kearsarge',
      'Keene High School': 'Keene',
      'Keene State College': 'Keene State',
      'Kennett High School': 'Kennett',
      'Kimball Union Academy': 'Kimball Union',
      'Kingswood Regional High School': 'Kingswood',
      'Laconia High School': 'Laconia',
      'Lakes Region Community College': 'Lakes Region',
      'Lebanon High School': 'Lebanon',
      'Lin-Wood Public School': 'Lin-Wood',
      'Lisbon Regional School': 'Lisbon',
      'Littleton High School': 'Littleton',
      'Londonderry High School': 'Londonderry',
      'Man. Central-Man. West': 'Central-West',
      'Manchester Central High School': 'Manchester Central',
      'Manchester Community College': 'Manchester CC',
      'Manchester Memorial High School': 'Manchester Memorial',
      'Manchester West High School': 'Manchester West',
      'Mascenic Regional High School': 'Mascenic',
      'Mascoma': 'Mascoma Valley',
      'Mascoma Valley Regional High School': 'Mascoma Valley',
      'Merrimack High School': 'Merrimack',
      'Merrimack Valley High School': 'Merrimack Valley',
      'Milford High School': 'Milford',
      'Monadnock Regional High School': 'Monadnock',
      'Moultonborough Academy': 'Moultonborough',
      'Mount Royal Academy': 'Mount Royal',
      'Nashua Community College': 'Nashua CC',
      'Nashua High School North': 'Nashua North',
      'Nashua High School South': 'Nashua South',
      'New England College': 'NEC',
      'New Hampton School': 'New Hampton',
      'Newfound Regional High School': 'Newfound',
      'Newmarket Jr/Sr': 'Newmarket',
      'Newmarket Senior High School': 'Newmarket',
      'Newport High School': 'Newport',
      'Nute High School': 'Nute',
      'Oyster River High School': 'Oyster River',
      'Pelham High School': 'Pelham',
      'Pembroke Academy': 'Pembroke',
      'Pinkerton Academy': 'Pinkerton',
      'Pittsburg High School': 'Pittsburg',
      'Pittsburg-Canaan': 'Pittsburg-Canaan',
      'Plymouth Regional High School': 'Plymouth',
      'Plymouth State University': 'Plymouth State',
      'Portsmouth Christian Academy': 'Portsmouth Christian',
      'Portsmouth High School': 'Portsmouth',
      'Proctor Academy': 'Proctor',
      'Profile School': 'Profile',
      'Prospect Mountain High School': 'Prospect Mountain',
      'Raymond High School': 'Raymond',
      'Rivier University': 'Rivier',
      'River Valley Community College': 'River Valley',
      'Saint Anselm College': 'Saint Anselm',
      'Saint Thomas Aquinas High School': 'St. Thomas Aquinas',
      'Salem High School': 'Salem',
      'Sanborn Regional High School': 'Sanborn',
      'Somersworth High School': 'Somersworth',
      'Souhegan High School': 'Souhegan',
      'Southern New Hampshire University': 'SNHU',
      'Spaulding High School': 'Spaulding',
      'Stevens High School': 'Stevens',
      'Sunapee High School': 'Sunapee',
      'Tilton School': 'Tilton',
      'Timberlane Regional High School': 'Timberlane',
      'Trinity High School': 'Trinity',
      'University of New Hampshire': 'UNH',
      'White Mountains Community College': 'White Mountains CC',
      'White Mountains Regional High School': 'White Mountains',
      'Wilton-Lyndeborough High School': 'Wilton-Lyndeborough',
      'Windham High School': 'Windham',
      'Winnacunnet High School': 'Winnacunnet',
      'Winnisquam Regional High School': 'Winnisquam',
      'Woodsville High School': 'Woodsville',
    };
  }
  
  // Initialize the schedule
  async init() {
    this.container = document.querySelector(this.config.container);
    if (!this.container) {
      console.error('ContributorSchedule: Container not found:', this.config.container);
      return;
    }
    
    this.render();
    this.createScorebookModal();
    this.bindEvents();
    await this.loadGames();
  }
  
  // Set contributor name programmatically
  setContributor(name) {
    this.config.contributorName = name;
    if (this.config.showContributorDropdown) {
      const select = this.container.querySelector('.cs-contributor-select');
      if (select) select.value = name || '';
    }
    this.renderAlerts();
    this.renderGames();
  }
  
  // Get current contributor name
  getContributor() {
    if (this.config.showContributorDropdown) {
      const select = this.container.querySelector('.cs-contributor-select');
      return select ? select.value : this.config.contributorName;
    }
    return this.config.contributorName;
  }
  
  // Check if current user is admin
  isAdmin() {
    return this.getContributor() === this.config.adminUser;
  }
  
  // Create scorebook upload modal
  createScorebookModal() {
    // Remove existing modal if any
    const existing = document.getElementById('cs-scorebook-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'cs-scorebook-modal';
    modal.className = 'cs-modal';
    modal.innerHTML = `
      <div class="cs-modal-overlay"></div>
      <div class="cs-modal-content">
        <div class="cs-modal-header">
          <h3>📋 Upload Scorebook</h3>
          <button class="cs-modal-close">&times;</button>
        </div>
        <div class="cs-modal-body">
          <div class="cs-scorebook-game-info"></div>
          <div class="cs-upload-area" id="cs-upload-area">
            <div class="cs-upload-icon">📤</div>
            <p>Click to select or drag & drop</p>
            <p class="cs-upload-hint">Supports JPG, PNG, HEIC (max 10MB)</p>
            <input type="file" id="cs-scorebook-input" accept="image/*,.heic,.heif" style="display:none">
          </div>
          <div class="cs-upload-preview" id="cs-upload-preview" style="display:none">
            <img id="cs-preview-image" src="" alt="Preview">
            <button class="cs-preview-remove" id="cs-preview-remove">✕ Remove</button>
          </div>
          <div class="cs-upload-status" id="cs-upload-status"></div>
        </div>
        <div class="cs-modal-footer">
          <button class="cs-btn cs-btn-secondary" id="cs-scorebook-cancel">Cancel</button>
          <button class="cs-btn cs-btn-primary" id="cs-scorebook-upload" disabled>Upload</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.scorebookModal = modal;
    
    // Bind modal events
    modal.querySelector('.cs-modal-overlay').addEventListener('click', () => this.closeScorebookModal());
    modal.querySelector('.cs-modal-close').addEventListener('click', () => this.closeScorebookModal());
    modal.querySelector('#cs-scorebook-cancel').addEventListener('click', () => this.closeScorebookModal());
    modal.querySelector('#cs-scorebook-upload').addEventListener('click', () => this.uploadScorebook());
    
    const uploadArea = modal.querySelector('#cs-upload-area');
    const fileInput = modal.querySelector('#cs-scorebook-input');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleScorebookFile(file);
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleScorebookFile(file);
    });
    
    modal.querySelector('#cs-preview-remove').addEventListener('click', () => this.clearScorebookPreview());
  }
  
  // Create image viewer modal
  createImageViewerModal() {
    const existing = document.getElementById('cs-image-viewer-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'cs-image-viewer-modal';
    modal.className = 'cs-modal cs-image-viewer';
    modal.innerHTML = `
      <div class="cs-modal-overlay"></div>
      <div class="cs-modal-content cs-viewer-content">
        <button class="cs-viewer-close">&times;</button>
        <img id="cs-viewer-image" src="" alt="Scorebook">
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.cs-modal-overlay').addEventListener('click', () => this.closeImageViewer());
    modal.querySelector('.cs-viewer-close').addEventListener('click', () => this.closeImageViewer());
    
    return modal;
  }
  
  // Open scorebook upload modal
  openScorebookModal(gameId) {
    const game = this.allGames.find(g => g.game_id === gameId);
    if (!game) return;
    
    this.currentScorebookGameId = gameId;
    this.currentScorebookFile = null;
    
    // Update game info in modal
    const gameInfo = this.scorebookModal.querySelector('.cs-scorebook-game-info');
    gameInfo.innerHTML = `<strong>${game.away} @ ${game.home}</strong><br><span>${this.formatDate(game.date)} • ${game.gender || ''} ${game.level || ''}</span>`;
    
    // Reset modal state
    this.clearScorebookPreview();
    this.scorebookModal.querySelector('#cs-upload-status').textContent = '';
    this.scorebookModal.querySelector('#cs-scorebook-upload').disabled = true;
    this.scorebookModal.querySelector('#cs-scorebook-input').value = '';
    
    this.scorebookModal.classList.add('open');
  }
  
  // Close scorebook modal
  closeScorebookModal() {
    this.scorebookModal.classList.remove('open');
    this.currentScorebookGameId = null;
    this.currentScorebookFile = null;
  }
  
  // Handle scorebook file selection
  handleScorebookFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (!validTypes.includes(file.type) && !isHeic) {
      this.scorebookModal.querySelector('#cs-upload-status').textContent = 'Please select an image file (JPG, PNG, HEIC)';
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      this.scorebookModal.querySelector('#cs-upload-status').textContent = 'File too large. Maximum size is 10MB.';
      return;
    }
    
    this.currentScorebookFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.scorebookModal.querySelector('#cs-upload-area').style.display = 'none';
      this.scorebookModal.querySelector('#cs-upload-preview').style.display = 'block';
      this.scorebookModal.querySelector('#cs-preview-image').src = e.target.result;
      this.scorebookModal.querySelector('#cs-scorebook-upload').disabled = false;
      this.scorebookModal.querySelector('#cs-upload-status').textContent = '';
    };
    reader.readAsDataURL(file);
  }
  
  // Clear scorebook preview
  clearScorebookPreview() {
    this.currentScorebookFile = null;
    this.scorebookModal.querySelector('#cs-upload-area').style.display = 'block';
    this.scorebookModal.querySelector('#cs-upload-preview').style.display = 'none';
    this.scorebookModal.querySelector('#cs-preview-image').src = '';
    this.scorebookModal.querySelector('#cs-scorebook-upload').disabled = true;
    this.scorebookModal.querySelector('#cs-scorebook-input').value = '';
  }
  
  // Upload scorebook to Supabase
  async uploadScorebook() {
    if (!this.currentScorebookFile || !this.currentScorebookGameId) return;
    
    const supabase = this.config.supabaseClient || window.supabase;
    if (!supabase) {
      this.showToast('Supabase not configured', 'error');
      return;
    }
    
    const uploadBtn = this.scorebookModal.querySelector('#cs-scorebook-upload');
    const statusEl = this.scorebookModal.querySelector('#cs-upload-status');
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    statusEl.textContent = 'Uploading image...';
    
    try {
      const game = this.allGames.find(g => g.game_id === this.currentScorebookGameId);
      const timestamp = Date.now();
      const ext = this.currentScorebookFile.name.split('.').pop().toLowerCase();
      const filename = `${game.date}_${this.currentScorebookGameId}_${timestamp}.${ext}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('scorebook_photos')
        .upload(filename, this.currentScorebookFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('scorebook_photos')
        .getPublicUrl(filename);
      
      const publicUrl = urlData.publicUrl;
      
      // Update game record with scorebook URL
      statusEl.textContent = 'Saving...';
      
      const response = await fetch(this.config.apiEndpoints.updateAssignment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: this.currentScorebookGameId, 
          field: 'scorebook_url', 
          value: publicUrl 
        })
      });
      
      if (!response.ok) throw new Error('Failed to save scorebook URL');
      
      // Update local game data
      if (game) game.scorebook_url = publicUrl;
      
      this.closeScorebookModal();
      this.renderGames();
      this.showToast('Scorebook uploaded!', 'success');
      
    } catch (err) {
      console.error('Scorebook upload error:', err);
      statusEl.textContent = 'Upload failed. Please try again.';
      this.showToast('Upload failed', 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload';
    }
  }
  
  // View scorebook image
  viewScorebook(gameId) {
    const game = this.allGames.find(g => g.game_id === gameId);
    if (!game || !game.scorebook_url) return;
    
    let viewerModal = document.getElementById('cs-image-viewer-modal');
    if (!viewerModal) {
      viewerModal = this.createImageViewerModal();
    }
    
    viewerModal.querySelector('#cs-viewer-image').src = game.scorebook_url;
    viewerModal.classList.add('open');
  }
  
  // Close image viewer
  closeImageViewer() {
    const viewerModal = document.getElementById('cs-image-viewer-modal');
    if (viewerModal) {
      viewerModal.classList.remove('open');
    }
  }
  
  // Render the schedule HTML structure
  render() {
    const contributorDropdownHTML = this.config.showContributorDropdown ? `
      <div class="cs-contributor-wrapper">
        <select class="cs-contributor-select">
          <option value="">-- Select Your Name --</option>
          ${this.CONTRIBUTORS.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
      </div>
    ` : '';
    
    this.container.innerHTML = `
      ${this.config.showAlerts ? '<div class="cs-alert-banner" style="display: none;"><h3>⚠️ Schedule Changes</h3><div class="cs-alert-list"></div></div>' : ''}
      
      ${contributorDropdownHTML}
      
      <div class="cs-controls">
        <div class="cs-tabs">
          <button class="cs-tab active" data-tab="all">All</button>
          <button class="cs-tab" data-tab="NHIAA">NHIAA</button>
          <button class="cs-tab" data-tab="College">College</button>
        </div>
        <div class="cs-filters">
          <button class="cs-today-btn" title="Jump to Today">📅 Today</button>
          <select class="cs-gender-filter">
            <option value="">Gender (All)</option>
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
          </select>
          <select class="cs-division-filter">
            <option value="">Division (All)</option>
          </select>
          <select class="cs-assignment-filter">
            <option value="">Coverage</option>
            <option value="mine">My Games</option>
            <option value="unclaimed">Unclaimed</option>
            <option value="claimed">Claimed</option>
          </select>
          <div class="cs-search-wrapper">
            <input type="text" class="cs-search-input" placeholder="Search teams...">
            <div class="cs-autocomplete-list"></div>
          </div>
        </div>
      </div>
      
      <div class="cs-table-container">
        <div class="cs-loading">Loading games...</div>
      </div>
    `;
    
    // Restore saved contributor if dropdown mode
    if (this.config.showContributorDropdown) {
      const saved = localStorage.getItem('ball603_contributor');
      if (saved) {
        const select = this.container.querySelector('.cs-contributor-select');
        if (select) select.value = saved;
      }
    }
  }
  
  // Bind event listeners
  bindEvents() {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.openDropdown && !e.target.closest('.cs-claim-wrapper')) {
        this.openDropdown.classList.remove('show');
        this.openDropdown = null;
      }
    });
    
    // Tab clicks
    this.container.querySelectorAll('.cs-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setTab(tab.dataset.tab));
    });
    
    // Filter changes
    this.container.querySelector('.cs-gender-filter').addEventListener('change', () => {
      this.updateDivisionOptions();
      this.renderGames();
    });
    this.container.querySelector('.cs-division-filter').addEventListener('change', () => this.renderGames());
    this.container.querySelector('.cs-assignment-filter').addEventListener('change', () => this.renderGames());
    
    // Today button click
    this.container.querySelector('.cs-today-btn').addEventListener('click', () => this.scrollToToday());
    
    // Search input
    const searchInput = this.container.querySelector('.cs-search-input');
    searchInput.addEventListener('input', () => {
      this.renderGames();
      this.updateAutocomplete();
    });
    searchInput.addEventListener('focus', () => this.showAutocomplete());
    searchInput.addEventListener('blur', () => setTimeout(() => this.hideAutocomplete(), 200));
    
    // Contributor dropdown
    if (this.config.showContributorDropdown) {
      const select = this.container.querySelector('.cs-contributor-select');
      if (select) {
        select.addEventListener('change', () => {
          localStorage.setItem('ball603_contributor', select.value);
          if (this.config.onContributorChange) {
            this.config.onContributorChange(select.value);
          }
          this.renderAlerts();
          this.renderGames();
        });
      }
    }
  }
  
  // Load games from API
  async loadGames() {
    const tableContainer = this.container.querySelector('.cs-table-container');
    tableContainer.innerHTML = '<div class="cs-loading">Loading games...</div>';
    
    try {
      const response = await fetch(this.config.apiEndpoints.getGames);
      const data = await response.json();
      let games = data.games || [];
      
      // Normalize team names
      games = games.map(g => ({
        ...g,
        home: this.normalizeTeamName(g.home),
        away: this.normalizeTeamName(g.away)
      }));
      
      // Deduplicate inter-division games
      this.allGames = this.deduplicateGames(games);
      
      // Build unique team list for autocomplete
      const teamSet = new Set();
      this.allGames.forEach(g => {
        if (g.home) teamSet.add(g.home);
        if (g.away) teamSet.add(g.away);
      });
      this.allTeams = [...teamSet].sort();
      
      this.populateDivisionFilter();
      this.renderAlerts();
      this.renderGames();
      
      // Auto-scroll to today after initial load
      setTimeout(() => this.scrollToToday(), 100);
    } catch (err) {
      console.error('Error loading games:', err);
      tableContainer.innerHTML = '<div class="cs-loading">Error loading games. Please refresh.</div>';
    }
  }
  
  // Normalize team name
  normalizeTeamName(name) {
    if (!name) return name;
    return this.TEAM_NORMALIZATIONS[name] || name;
  }
  
  // Deduplicate games (merge inter-division matchups)
  deduplicateGames(games) {
    const gameMap = new Map();
    
    games.forEach(game => {
      const teams = [game.away, game.home].sort();
      const key = `${game.date}|${game.time || ''}|${teams[0]}|${teams[1]}|${game.gender || ''}`;
      
      if (gameMap.has(key)) {
        const existing = gameMap.get(key);
        
        if (existing.division !== game.division && game.division) {
          const divs = [existing.division, game.division].filter(Boolean);
          const uniqueDivs = [...new Set(divs)];
          if (uniqueDivs.length > 1) {
            uniqueDivs.sort((a, b) => {
              const order = {'D-I': 1, 'D-II': 2, 'D-III': 3, 'D-IV': 4};
              return (order[a] || 99) - (order[b] || 99);
            });
            existing.division = uniqueDivs.join(' / ');
          }
        }
        
        existing.photog1 = existing.photog1 || game.photog1;
        existing.photog2 = existing.photog2 || game.photog2;
        existing.videog = existing.videog || game.videog;
        existing.writer = existing.writer || game.writer;
        existing.notes = existing.notes || game.notes;
        existing.scorebook_url = existing.scorebook_url || game.scorebook_url;
        existing.schedule_changed = existing.schedule_changed || game.schedule_changed;
        existing.original_date = existing.original_date || game.original_date;
      } else {
        gameMap.set(key, { ...game });
      }
    });
    
    return Array.from(gameMap.values());
  }
  
  // Populate division filter dropdown based on current tab and gender
  populateDivisionFilter() {
    this.updateGenderOptions();
    this.updateDivisionOptions();
  }
  
  // Update gender options based on current tab
  updateGenderOptions() {
    const select = this.container.querySelector('.cs-gender-filter');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Gender (All)</option>';
    
    if (this.currentTab === 'NHIAA') {
      select.innerHTML += '<option value="Boys">Boys</option><option value="Girls">Girls</option>';
    } else if (this.currentTab === 'College') {
      select.innerHTML += '<option value="Men">Men</option><option value="Women">Women</option>';
    } else {
      select.innerHTML += '<option value="Boys">Boys</option><option value="Girls">Girls</option>';
      select.innerHTML += '<option value="Men">Men</option><option value="Women">Women</option>';
    }
    
    const validOptions = Array.from(select.options).map(o => o.value);
    if (validOptions.includes(currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
    }
  }
  
  // Update division options based on current tab and gender
  updateDivisionOptions() {
    const select = this.container.querySelector('.cs-division-filter');
    const gender = this.container.querySelector('.cs-gender-filter').value;
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Division (All)</option>';
    
    if (this.currentTab === 'NHIAA') {
      const nhiaaGroup = document.createElement('optgroup');
      nhiaaGroup.label = 'NHIAA';
      ['D-I', 'D-II', 'D-III', 'D-IV'].forEach(div => {
        const opt = document.createElement('option');
        opt.value = div;
        opt.textContent = div;
        nhiaaGroup.appendChild(opt);
      });
      select.appendChild(nhiaaGroup);
    } else if (this.currentTab === 'College') {
      const collegeGroup = document.createElement('optgroup');
      collegeGroup.label = 'College';
      ['D1', 'D2', 'D3', 'Other'].forEach(div => {
        const opt = document.createElement('option');
        opt.value = div === 'Other' ? 'college-other' : div;
        opt.textContent = div;
        collegeGroup.appendChild(opt);
      });
      select.appendChild(collegeGroup);
    } else if (gender === 'Boys' || gender === 'Girls') {
      const nhiaaGroup = document.createElement('optgroup');
      nhiaaGroup.label = 'NHIAA';
      ['D-I', 'D-II', 'D-III', 'D-IV'].forEach(div => {
        const opt = document.createElement('option');
        opt.value = div;
        opt.textContent = div;
        nhiaaGroup.appendChild(opt);
      });
      select.appendChild(nhiaaGroup);
    } else if (gender === 'Men' || gender === 'Women') {
      const collegeGroup = document.createElement('optgroup');
      collegeGroup.label = 'College';
      ['D1', 'D2', 'D3', 'Other'].forEach(div => {
        const opt = document.createElement('option');
        opt.value = div === 'Other' ? 'college-other' : div;
        opt.textContent = div;
        collegeGroup.appendChild(opt);
      });
      select.appendChild(collegeGroup);
    } else {
      const nhiaaGroup = document.createElement('optgroup');
      nhiaaGroup.label = 'NHIAA';
      ['D-I', 'D-II', 'D-III', 'D-IV'].forEach(div => {
        const opt = document.createElement('option');
        opt.value = div;
        opt.textContent = div;
        nhiaaGroup.appendChild(opt);
      });
      select.appendChild(nhiaaGroup);
      
      const collegeGroup = document.createElement('optgroup');
      collegeGroup.label = 'College';
      ['D1', 'D2', 'D3', 'Other'].forEach(div => {
        const opt = document.createElement('option');
        opt.value = div === 'Other' ? 'college-other' : div;
        opt.textContent = div;
        collegeGroup.appendChild(opt);
      });
      select.appendChild(collegeGroup);
    }
    
    const validOptions = Array.from(select.options).map(o => o.value);
    if (validOptions.includes(currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
    }
  }
  
  // Set current tab
  setTab(tab) {
    this.currentTab = tab;
    this.container.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
    this.container.querySelector(`.cs-tab[data-tab="${tab}"]`).classList.add('active');
    
    this.container.querySelector('.cs-gender-filter').value = '';
    this.container.querySelector('.cs-division-filter').value = '';
    
    this.updateGenderOptions();
    this.updateDivisionOptions();
    
    this.renderGames();
    
    setTimeout(() => this.scrollToToday(), 50);
  }
  
  // Render alerts for schedule changes
  renderAlerts() {
    if (!this.config.showAlerts) return;
    
    const banner = this.container.querySelector('.cs-alert-banner');
    const list = this.container.querySelector('.cs-alert-list');
    const me = this.getContributor();
    
    if (!me) {
      banner.style.display = 'none';
      return;
    }
    
    let changedGames;
    if (this.isAdmin()) {
      changedGames = this.allGames.filter(g => g.schedule_changed);
    } else {
      changedGames = this.allGames.filter(g => {
        const isMine = g.photog1 === me || g.photog2 === me || g.videog === me || g.writer === me;
        return isMine && g.schedule_changed;
      });
    }
    
    if (changedGames.length === 0) {
      banner.style.display = 'none';
      return;
    }
    
    banner.style.display = 'block';
    
    list.innerHTML = changedGames.map(game => {
      const contributors = [game.photog1, game.photog2, game.videog, game.writer].filter(Boolean);
      const changeDesc = this.getChangeDescription(game);
      return `
        <div class="cs-alert-item">
          <div class="cs-alert-buttons">
            <button class="cs-alert-btn accept" data-game-id="${game.game_id}" data-action="accept">✓ Accept</button>
            <button class="cs-alert-btn deny" data-game-id="${game.game_id}" data-action="deny">✗ Decline</button>
          </div>
          <div class="cs-alert-info">
            <div class="cs-alert-game">${game.away} @ ${game.home}</div>
            <div class="cs-alert-change">
              ${changeDesc}
              ${this.isAdmin() ? `<span class="cs-alert-contributor">(${contributors.join(', ')})</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    list.querySelectorAll('.cs-alert-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gameId = btn.dataset.gameId;
        const action = btn.dataset.action;
        if (action === 'accept') {
          await this.acceptChange(gameId);
        } else {
          await this.denyChange(gameId);
        }
      });
    });
  }
  
  getChangeDescription(game) {
    if (!game.original_date) return 'Schedule changed';
    const dateChanged = game.original_date !== game.date;
    if (!dateChanged) {
      return `Location changed (${this.formatDate(game.date)})`;
    }
    return `Date changed: ${this.formatDate(game.original_date)} → ${this.formatDate(game.date)}`;
  }
  
  async acceptChange(gameId) {
    try {
      await fetch(this.config.apiEndpoints.updateAssignment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, field: 'schedule_changed', value: '' })
      });
      const game = this.allGames.find(g => g.game_id === gameId);
      if (game) game.schedule_changed = false;
      this.renderAlerts();
      this.renderGames();
    } catch (err) {
      alert('Error updating. Please try again.');
    }
  }
  
  async denyChange(gameId) {
    const me = this.getContributor();
    const game = this.allGames.find(g => g.game_id === gameId);
    if (!game) return;
    
    const fieldsToRemove = [];
    if (game.photog1 === me) fieldsToRemove.push('photog1');
    if (game.photog2 === me) fieldsToRemove.push('photog2');
    if (game.videog === me) fieldsToRemove.push('videog');
    if (game.writer === me) fieldsToRemove.push('writer');
    
    if (this.isAdmin() && fieldsToRemove.length === 0) {
      await this.acceptChange(gameId);
      return;
    }
    
    try {
      for (const field of fieldsToRemove) {
        await fetch(this.config.apiEndpoints.updateAssignment, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, field, value: '' })
        });
        game[field] = '';
      }
      
      const stillHasAssignments = game.photog1 || game.photog2 || game.videog || game.writer;
      if (!stillHasAssignments) {
        await fetch(this.config.apiEndpoints.updateAssignment, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, field: 'schedule_changed', value: '' })
        });
        game.schedule_changed = false;
      }
      
      this.renderAlerts();
      this.renderGames();
    } catch (err) {
      alert('Error updating. Please try again.');
    }
  }
  
  // Scroll to today's date in the table
  scrollToToday() {
    const tableContainer = this.container.querySelector('.cs-table-container');
    const today = new Date().toISOString().split('T')[0];
    
    const todayRow = tableContainer.querySelector(`tr[data-date="${today}"]`);
    
    if (todayRow) {
      const headerHeight = tableContainer.querySelector('thead')?.offsetHeight || 0;
      tableContainer.scrollTop = todayRow.offsetTop - headerHeight - 10;
    } else {
      const allRows = tableContainer.querySelectorAll('tr[data-date]');
      for (const row of allRows) {
        if (row.dataset.date >= today) {
          const headerHeight = tableContainer.querySelector('thead')?.offsetHeight || 0;
          tableContainer.scrollTop = row.offsetTop - headerHeight - 10;
          break;
        }
      }
    }
  }
  
  // Render games table
  renderGames() {
    const search = this.container.querySelector('.cs-search-input').value.toLowerCase();
    const gender = this.container.querySelector('.cs-gender-filter').value;
    const division = this.container.querySelector('.cs-division-filter').value;
    const assignment = this.container.querySelector('.cs-assignment-filter').value;
    const me = this.getContributor();
    const today = new Date().toISOString().split('T')[0];
    
    let games = this.allGames.filter(g => {
      if (this.currentTab !== 'all' && g.level !== this.currentTab) return false;
      if (search && !g.home?.toLowerCase().includes(search) && !g.away?.toLowerCase().includes(search)) return false;
      if (gender && g.gender !== gender) return false;
      
      if (division) {
        if (division === 'college-other') {
          if (g.level !== 'College' || (g.division && g.division.trim() !== '')) return false;
        } else if (!g.division || !g.division.includes(division)) {
          return false;
        }
      }
      
      if (this.config.hidePastGames && g.date < today) return false;
      
      const hasClaim = g.photog1 || g.photog2 || g.videog || g.writer;
      const isMine = g.photog1 === me || g.photog2 === me || g.videog === me || g.writer === me;
      if (assignment === 'unclaimed' && hasClaim) return false;
      if (assignment === 'mine' && !isMine) return false;
      if (assignment === 'claimed' && !hasClaim) return false;
      
      return true;
    });
    
    games.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });
    
    const tableContainer = this.container.querySelector('.cs-table-container');
    
    if (games.length === 0) {
      tableContainer.innerHTML = '<div class="cs-loading">No games found</div>';
      return;
    }
    
    let html = `
      <table class="cs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Away</th>
            <th>Home</th>
            <th>Gender</th>
            <th>Level</th>
            <th></th>
            <th>Coverage</th>
            <th>Scorebook</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    games.forEach(game => {
      const isPast = game.date < today;
      const isToday = game.date === today;
      let rowClass = game.schedule_changed ? 'cs-game-changed' : '';
      if (isPast) rowClass += ' cs-game-past';
      if (isToday) rowClass += ' cs-game-today';
      
      html += `
        <tr data-id="${game.game_id}" data-date="${game.date}" class="${rowClass.trim()}">
          <td>${this.renderDateCell(game, isToday)}</td>
          <td>${this.formatTime(game.time)}</td>
          <td>${game.away || ''}</td>
          <td>${game.home || ''}</td>
          <td>${game.gender || ''}</td>
          <td>${game.level || ''}</td>
          <td>${isPast ? '' : this.renderClaimCell(game)}</td>
          <td class="cs-coverage-cell">${this.renderCoverageCell(game)}</td>
          <td class="cs-scorebook-cell">${this.renderScorebookCell(game)}</td>
          <td>${isPast ? (game.notes || '') : `<input class="cs-notes-input" value="${game.notes || ''}" data-game-id="${game.game_id}" placeholder="Notes...">`}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
    
    // Bind notes blur events
    tableContainer.querySelectorAll('.cs-notes-input').forEach(input => {
      input.addEventListener('blur', () => this.updateNotes(input.dataset.gameId, input.value));
    });
    
    // Bind scorebook upload buttons
    tableContainer.querySelectorAll('.cs-scorebook-upload').forEach(btn => {
      btn.addEventListener('click', () => this.openScorebookModal(btn.dataset.gameId));
    });
    
    // Bind scorebook view buttons
    tableContainer.querySelectorAll('.cs-scorebook-view').forEach(btn => {
      btn.addEventListener('click', () => this.viewScorebook(btn.dataset.gameId));
    });
  }
  
  // Render scorebook cell
  renderScorebookCell(game) {
    if (game.scorebook_url) {
      return `<button class="cs-scorebook-view" data-game-id="${game.game_id}">VIEW</button>`;
    }
    return `<button class="cs-scorebook-upload" data-game-id="${game.game_id}" title="Upload Scorebook">📤</button>`;
  }
  
  renderDateCell(game, isToday = false) {
    let content = '';
    
    if (game.schedule_changed && game.original_date && game.original_date !== game.date) {
      content = `
        <div class="cs-date-change">
          <span class="cs-old-date">${this.formatDate(game.original_date)}</span>
          <span class="cs-new-date">${this.formatDate(game.date)}</span>
        </div>
      `;
    } else {
      content = this.formatDate(game.date);
    }
    
    if (isToday) {
      content = `<strong>${content}</strong>`;
    }
    
    return content;
  }
  
  formatDate(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    const monthName = this.MONTH_NAMES_SHORT[parseInt(month, 10) - 1];
    const dayNum = parseInt(day, 10);
    return `${monthName} ${dayNum}`;
  }
  
  formatTime(time) {
    if (!time) return '';
    return time.replace(/^0/, '');
  }
  
  renderClaimCell(game) {
    const me = this.getContributor();
    if (!me) return '';
    
    const canClaimPhotog = !game.photog1 || (!game.photog2 && game.photog1 !== me);
    const canClaimVideo = !game.videog || game.videog !== me;
    const canClaimWriter = !game.writer || game.writer !== me;
    
    if (!canClaimPhotog && !canClaimVideo && !canClaimWriter) return '';
    
    return `
      <div class="cs-claim-wrapper">
        <button class="cs-claim-btn" data-game-id="${game.game_id}">➕</button>
        <div class="cs-claim-dropdown" id="cs-dropdown-${game.game_id}">
          ${!game.photog1 ? `<div class="cs-claim-option" data-game-id="${game.game_id}" data-field="photog1">📸 Photographer</div>` : ''}
          ${game.photog1 && !game.photog2 && game.photog1 !== me ? `<div class="cs-claim-option" data-game-id="${game.game_id}" data-field="photog2">📸 Photographer 2</div>` : ''}
          ${!game.videog ? `<div class="cs-claim-option" data-game-id="${game.game_id}" data-field="videog">🎥 Videographer</div>` : ''}
          ${!game.writer ? `<div class="cs-claim-option" data-game-id="${game.game_id}" data-field="writer">📝 Writer</div>` : ''}
        </div>
      </div>
    `;
  }
  
  renderCoverageCell(game) {
    const me = this.getContributor();
    const items = [
      { field: 'photog1', emoji: '📸', name: game.photog1 },
      { field: 'photog2', emoji: '📸', name: game.photog2 },
      { field: 'videog', emoji: '🎥', name: game.videog },
      { field: 'writer', emoji: '📝', name: game.writer }
    ].filter(item => item.name);
    
    if (items.length === 0) return '<span style="color:#999">-</span>';
    
    const today = new Date().toISOString().split('T')[0];
    const isPast = game.date < today;
    
    return items.map(item => `
      <div class="cs-coverage-entry">
        <span>${item.emoji}</span>
        <span>${item.name}</span>
        ${!isPast && item.name === me ? `<button class="cs-coverage-remove" data-game-id="${game.game_id}" data-field="${item.field}">✕</button>` : ''}
      </div>
    `).join('');
  }
  
  // Toggle claim dropdown
  toggleClaimDropdown(gameId) {
    const dropdown = this.container.querySelector(`#cs-dropdown-${gameId}`);
    if (!dropdown) return;
    
    if (this.openDropdown && this.openDropdown !== dropdown) {
      this.openDropdown.classList.remove('show');
    }
    
    dropdown.classList.toggle('show');
    this.openDropdown = dropdown.classList.contains('show') ? dropdown : null;
  }
  
  // Claim a game
  async claim(gameId, field) {
    const me = this.getContributor();
    if (!me) {
      alert('Please select your name first');
      return;
    }
    
    if (this.openDropdown) {
      this.openDropdown.classList.remove('show');
      this.openDropdown = null;
    }
    
    try {
      const response = await fetch(this.config.apiEndpoints.updateAssignment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, field, value: me })
      });
      
      if (response.ok) {
        const game = this.allGames.find(g => g.game_id === gameId);
        if (game) game[field] = me;
        this.renderGames();
        this.showToast('Coverage claimed!', 'success');
      } else {
        this.showToast('Error saving. Please try again.', 'error');
      }
    } catch (err) {
      this.showToast('Error saving. Please try again.', 'error');
    }
  }
  
  // Remove a claim
  async removeClaim(gameId, field) {
    try {
      const response = await fetch(this.config.apiEndpoints.updateAssignment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, field, value: '' })
      });
      
      if (response.ok) {
        const game = this.allGames.find(g => g.game_id === gameId);
        if (game) game[field] = '';
        this.renderGames();
        this.showToast('Coverage removed', 'success');
      }
    } catch (err) {
      this.showToast('Error removing. Please try again.', 'error');
    }
  }
  
  // Update notes
  async updateNotes(gameId, value) {
    try {
      await fetch(this.config.apiEndpoints.updateAssignment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, field: 'notes', value })
      });
      const game = this.allGames.find(g => g.game_id === gameId);
      if (game) game.notes = value;
    } catch (err) {
      // Silent fail for notes
    }
  }
  
  // Autocomplete functions
  updateAutocomplete() {
    const search = this.container.querySelector('.cs-search-input').value.toLowerCase();
    const list = this.container.querySelector('.cs-autocomplete-list');
    
    if (search.length < 1) {
      list.classList.remove('show');
      return;
    }
    
    const matches = this.allTeams.filter(t => t.toLowerCase().includes(search)).slice(0, 10);
    
    if (matches.length === 0) {
      list.classList.remove('show');
      return;
    }
    
    list.innerHTML = matches.map(t => 
      `<div class="cs-autocomplete-item" data-team="${t}">${t}</div>`
    ).join('');
    list.classList.add('show');
    
    list.querySelectorAll('.cs-autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', () => {
        this.container.querySelector('.cs-search-input').value = item.dataset.team;
        list.classList.remove('show');
        this.renderGames();
      });
    });
  }
  
  showAutocomplete() {
    this.updateAutocomplete();
  }
  
  hideAutocomplete() {
    this.container.querySelector('.cs-autocomplete-list').classList.remove('show');
  }
  
  // Toast notification
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `cs-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Event delegation for dynamic elements
document.addEventListener('click', (e) => {
  // Claim button click
  if (e.target.classList.contains('cs-claim-btn')) {
    e.stopPropagation();
    const gameId = e.target.dataset.gameId;
    const container = e.target.closest('[data-schedule-instance]');
    if (container && container._scheduleInstance) {
      container._scheduleInstance.toggleClaimDropdown(gameId);
    }
  }
  
  // Claim option click
  if (e.target.classList.contains('cs-claim-option')) {
    const gameId = e.target.dataset.gameId;
    const field = e.target.dataset.field;
    const container = e.target.closest('[data-schedule-instance]');
    if (container && container._scheduleInstance) {
      container._scheduleInstance.claim(gameId, field);
    }
  }
  
  // Coverage remove click
  if (e.target.classList.contains('cs-coverage-remove')) {
    const gameId = e.target.dataset.gameId;
    const field = e.target.dataset.field;
    const container = e.target.closest('[data-schedule-instance]');
    if (container && container._scheduleInstance) {
      container._scheduleInstance.removeClaim(gameId, field);
    }
  }
});

// Factory function for easy initialization
function initContributorSchedule(config) {
  const schedule = new ContributorSchedule(config);
  
  const container = document.querySelector(config.container);
  if (container) {
    container.setAttribute('data-schedule-instance', 'true');
    container._scheduleInstance = schedule;
  }
  
  schedule.init();
  return schedule;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContributorSchedule, initContributorSchedule };
}
