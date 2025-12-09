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
          <select class="cs-gender-filter">
            <option value="">Gender</option>
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
          </select>
          <select class="cs-division-filter">
            <option value="">Division</option>
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
    this.container.querySelector('.cs-gender-filter').addEventListener('change', () => this.renderGames());
    this.container.querySelector('.cs-division-filter').addEventListener('change', () => this.renderGames());
    this.container.querySelector('.cs-assignment-filter').addEventListener('change', () => this.renderGames());
    
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
        existing.schedule_changed = existing.schedule_changed || game.schedule_changed;
        existing.original_date = existing.original_date || game.original_date;
      } else {
        gameMap.set(key, { ...game });
      }
    });
    
    return Array.from(gameMap.values());
  }
  
  // Populate division filter dropdown
  populateDivisionFilter() {
    const select = this.container.querySelector('.cs-division-filter');
    select.innerHTML = '<option value="">Division</option>';
    
    // NHIAA divisions
    const nhiaaGroup = document.createElement('optgroup');
    nhiaaGroup.label = 'NHIAA';
    ['D-I', 'D-II', 'D-III', 'D-IV'].forEach(div => {
      const opt = document.createElement('option');
      opt.value = div;
      opt.textContent = div;
      nhiaaGroup.appendChild(opt);
    });
    select.appendChild(nhiaaGroup);
    
    // College divisions
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
  
  // Set current tab
  setTab(tab) {
    this.currentTab = tab;
    this.container.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
    this.container.querySelector(`.cs-tab[data-tab="${tab}"]`).classList.add('active');
    this.renderGames();
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
    
    // Bind alert button events
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
      
      if (g.date < today) return false;
      
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
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    games.forEach(game => {
      const rowClass = game.schedule_changed ? 'cs-game-changed' : '';
      html += `
        <tr data-id="${game.game_id}" class="${rowClass}">
          <td>${this.renderDateCell(game)}</td>
          <td>${this.formatTime(game.time)}</td>
          <td>${game.away || ''}</td>
          <td>${game.home || ''}</td>
          <td>${game.gender || ''}</td>
          <td>${game.level || ''}</td>
          <td>${this.renderClaimCell(game)}</td>
          <td class="cs-coverage-cell">${this.renderCoverageCell(game)}</td>
          <td><input class="cs-notes-input" value="${game.notes || ''}" data-game-id="${game.game_id}" placeholder="Notes..."></td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
    
    // Bind notes blur events
    tableContainer.querySelectorAll('.cs-notes-input').forEach(input => {
      input.addEventListener('blur', () => this.updateNotes(input.dataset.gameId, input.value));
    });
  }
  
  renderDateCell(game) {
    if (game.schedule_changed && game.original_date && game.original_date !== game.date) {
      return `
        <div class="cs-date-change">
          <span class="cs-old-date">${this.formatDate(game.original_date)}</span>
          <span class="cs-new-date">${this.formatDate(game.date)}</span>
        </div>
      `;
    }
    return this.formatDate(game.date);
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
    
    return items.map(item => `
      <div class="cs-coverage-entry">
        <span>${item.emoji}</span>
        <span>${item.name}</span>
        ${item.name === me ? `<button class="cs-coverage-remove" data-game-id="${game.game_id}" data-field="${item.field}">✕</button>` : ''}
      </div>
    `).join('');
  }
  
  // Toggle claim dropdown (called from event delegation)
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
    
    // Bind click events
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
  
  // Store instance reference for event delegation
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
