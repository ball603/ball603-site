/**
 * The Bash - Tournament JavaScript
 * Handles tabs, filtering, and data rendering
 */

// ===== STATE =====
const bashState = {
  activeTab: 'schedule',
  activeHistoryTab: 'champions',
  activeBracketGender: 'Boys',
  filters: {
    schedule: { gender: 'all', day: 'all', search: '' },
    champions: { gender: 'all' },
    awards: { year: 'all', gender: 'all', type: 'all' }
  }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initHistoryTabs();
  initBracketToggle();
  initFilters();
  renderSchedule();
  renderChampions();
  renderAwards();
  renderBracket();
  populateYearFilter();
});

// ===== TAB NAVIGATION =====
function initTabs() {
  const tabs = document.querySelectorAll('.bash-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      setActiveTab(tabId);
    });
  });
}

function setActiveTab(tabId) {
  bashState.activeTab = tabId;
  
  // Update tab buttons
  document.querySelectorAll('.bash-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  // Update panels
  document.querySelectorAll('.bash-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });
}

// ===== HISTORY SUB-TABS =====
function initHistoryTabs() {
  const tabs = document.querySelectorAll('.bash-history-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const subtab = tab.dataset.subtab;
      setActiveHistoryTab(subtab);
    });
  });
}

function setActiveHistoryTab(subtab) {
  bashState.activeHistoryTab = subtab;
  
  // Update tab buttons
  document.querySelectorAll('.bash-history-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.subtab === subtab);
  });
  
  // Update panels
  document.querySelectorAll('.bash-history-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `history-${subtab}`);
  });
}

// ===== BRACKET TOGGLE =====
function initBracketToggle() {
  const buttons = document.querySelectorAll('.bash-bracket-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const gender = btn.dataset.gender;
      bashState.activeBracketGender = gender;
      
      buttons.forEach(b => b.classList.toggle('active', b.dataset.gender === gender));
      renderBracket();
    });
  });
}

// ===== FILTERS =====
function initFilters() {
  // Schedule filters
  document.getElementById('scheduleGenderFilter')?.addEventListener('change', (e) => {
    bashState.filters.schedule.gender = e.target.value;
    renderSchedule();
  });
  
  document.getElementById('scheduleDayFilter')?.addEventListener('change', (e) => {
    bashState.filters.schedule.day = e.target.value;
    renderSchedule();
  });
  
  document.getElementById('scheduleSearch')?.addEventListener('input', (e) => {
    bashState.filters.schedule.search = e.target.value.toLowerCase();
    renderSchedule();
  });
  
  // Champions filter
  document.getElementById('championsGenderFilter')?.addEventListener('change', (e) => {
    bashState.filters.champions.gender = e.target.value;
    renderChampions();
  });
  
  // Awards filters
  document.getElementById('awardsYearFilter')?.addEventListener('change', (e) => {
    bashState.filters.awards.year = e.target.value;
    renderAwards();
  });
  
  document.getElementById('awardsGenderFilter')?.addEventListener('change', (e) => {
    bashState.filters.awards.gender = e.target.value;
    renderAwards();
  });
  
  document.getElementById('awardsTypeFilter')?.addEventListener('change', (e) => {
    bashState.filters.awards.type = e.target.value;
    renderAwards();
  });
}

function populateYearFilter() {
  const yearFilter = document.getElementById('awardsYearFilter');
  if (!yearFilter) return;
  
  const years = [...new Set(BASH_DATA.awards.map(a => a.year))].sort((a, b) => b - a);
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
}

// ===== SCHEDULE RENDERING =====
function renderSchedule() {
  const tbody = document.getElementById('scheduleBody');
  if (!tbody) return;
  
  const { gender, day, search } = bashState.filters.schedule;
  
  // Filter games
  let games = BASH_DATA.schedule.filter(game => {
    if (gender !== 'all' && game.division !== gender) return false;
    if (day !== 'all' && game.date !== day) return false;
    if (search) {
      const searchStr = `${game.away} ${game.home}`.toLowerCase();
      if (!searchStr.includes(search)) return false;
    }
    return true;
  });
  
  // Group by date
  const groupedByDate = {};
  games.forEach(game => {
    if (!groupedByDate[game.date]) {
      groupedByDate[game.date] = [];
    }
    groupedByDate[game.date].push(game);
  });
  
  // Build HTML
  let html = '';
  
  Object.entries(groupedByDate).forEach(([date, dateGames]) => {
    // Date header
    html += `<tr class="date-row"><td colspan="8">📅 ${formatDate(date)}</td></tr>`;
    
    // Games for this date
    dateGames.forEach(game => {
      if (game.special) {
        // Special event row
        html += `
          <tr class="special-row">
            <td>${game.time}</td>
            <td colspan="7">${game.away}</td>
          </tr>
        `;
      } else {
        const hasScore = game.awayScore !== null && game.homeScore !== null;
        const awayWon = hasScore && game.awayScore > game.homeScore;
        const homeWon = hasScore && game.homeScore > game.awayScore;
        
        html += `
          <tr>
            <td class="game-time">${game.time}</td>
            <td class="col-game">${game.game ? `<span class="game-number">${game.game}</span>` : ''}</td>
            <td class="col-division">${game.division ? `<span class="division-badge ${game.division.toLowerCase()}">${game.division.charAt(0)}</span>` : ''}</td>
            <td class="col-away">
              <div class="team-cell away">
                <span class="team-name-text ${awayWon ? 'winner' : ''} ${isPlaceholder(game.away) ? 'placeholder' : ''}">${game.away}</span>
              </div>
            </td>
            <td class="col-score">
              ${renderScore(game)}
            </td>
            <td class="col-home">
              <div class="team-cell">
                <span class="team-name-text ${homeWon ? 'winner' : ''} ${isPlaceholder(game.home) ? 'placeholder' : ''}">${game.home}</span>
              </div>
            </td>
            <td>${game.site}</td>
            <td class="col-coverage">
              <div class="coverage-icons">
                ${game.recap ? '<a href="' + game.recap + '" title="Recap">📝</a>' : ''}
                ${game.photos ? '<a href="' + game.photos + '" title="Photos">📷</a>' : ''}
                ${game.video ? '<a href="' + game.video + '" title="Video">🎥</a>' : ''}
                ${game.highlights ? '<a href="' + game.highlights + '" title="Highlights">▶️</a>' : ''}
              </div>
            </td>
          </tr>
        `;
      }
    });
  });
  
  if (!html) {
    html = `
      <tr>
        <td colspan="8">
          <div class="bash-empty">
            <div class="bash-empty-icon">🏀</div>
            <div class="bash-empty-text">No games found matching your filters</div>
          </div>
        </td>
      </tr>
    `;
  }
  
  tbody.innerHTML = html;
}

function renderScore(game) {
  if (game.awayScore === null || game.homeScore === null) {
    return '<span class="score-pending">vs</span>';
  }
  
  const awayWon = game.awayScore > game.homeScore;
  const homeWon = game.homeScore > game.awayScore;
  
  return `
    <div class="score-cell">
      <span class="score-box ${awayWon ? 'winner' : ''}">${game.awayScore}</span>
      <span>-</span>
      <span class="score-box ${homeWon ? 'winner' : ''}">${game.homeScore}</span>
      ${game.overtime ? '<span class="score-ot">OT</span>' : ''}
    </div>
  `;
}

function isPlaceholder(team) {
  if (!team) return true;
  return team.includes('Winner') || team.includes('Loser') || team.includes('TBA');
}

function formatDate(dateStr) {
  const dateMap = {
    'Dec 26': 'Friday, December 26',
    'Dec 27': 'Saturday, December 27',
    'Dec 28': 'Sunday, December 28',
    'Dec 29': 'Monday, December 29',
    'Dec 30': 'Tuesday, December 30'
  };
  return dateMap[dateStr] || dateStr;
}

// ===== CHAMPIONS RENDERING =====
function renderChampions() {
  const tbody = document.getElementById('championsBody');
  const countsContainer = document.getElementById('championshipCounts');
  if (!tbody) return;
  
  const { gender } = bashState.filters.champions;
  
  // Filter champions
  let champions = BASH_DATA.champions.filter(c => {
    if (gender !== 'all' && c.gender !== gender) return false;
    return true;
  });
  
  // Sort by year descending, then gender
  champions.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.gender.localeCompare(b.gender);
  });
  
  // Build table
  let html = '';
  champions.forEach(c => {
    html += `
      <tr>
        <td><strong>${c.year}</strong></td>
        <td><span class="division-badge ${c.gender.toLowerCase()}">${c.gender}</span></td>
        <td class="champion-cell">${c.champion}</td>
        <td class="score-final">
          ${c.championScore}-${c.runnerUpScore}
          ${c.overtime ? '<span class="ot">OT</span>' : ''}
        </td>
        <td>${c.runnerUp}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  
  // Calculate championship counts
  if (countsContainer) {
    const counts = {};
    BASH_DATA.champions.forEach(c => {
      if (gender !== 'all' && c.gender !== gender) return;
      
      if (!counts[c.champion]) {
        counts[c.champion] = { total: 0, boys: 0, girls: 0 };
      }
      counts[c.champion].total++;
      if (c.gender === 'Boys') counts[c.champion].boys++;
      if (c.gender === 'Girls') counts[c.champion].girls++;
    });
    
    // Sort by total
    const sortedCounts = Object.entries(counts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12);
    
    let countsHtml = '';
    sortedCounts.forEach(([school, data]) => {
      const breakdown = [];
      if (data.boys > 0) breakdown.push(`${data.boys} Boys`);
      if (data.girls > 0) breakdown.push(`${data.girls} Girls`);
      
      countsHtml += `
        <div class="championship-count-card">
          <div class="championship-count-header">
            <span class="championship-school">${school}</span>
            <span class="championship-total">${data.total}</span>
          </div>
          <div class="championship-breakdown">${breakdown.join(' • ')}</div>
        </div>
      `;
    });
    
    countsContainer.innerHTML = countsHtml;
  }
}

// ===== AWARDS RENDERING =====
function renderAwards() {
  const container = document.getElementById('awardsContainer');
  if (!container) return;
  
  const { year, gender, type } = bashState.filters.awards;
  
  // Filter awards
  let awards = BASH_DATA.awards.filter(a => {
    if (year !== 'all' && a.year !== parseInt(year)) return false;
    if (gender !== 'all' && a.gender !== gender) return false;
    if (type !== 'all' && a.award !== type) return false;
    return true;
  });
  
  // Group by year
  const groupedByYear = {};
  awards.forEach(a => {
    if (!groupedByYear[a.year]) {
      groupedByYear[a.year] = { Boys: {}, Girls: {} };
    }
    if (!groupedByYear[a.year][a.gender][a.award]) {
      groupedByYear[a.year][a.gender][a.award] = [];
    }
    groupedByYear[a.year][a.gender][a.award].push(a);
  });
  
  // Sort years descending
  const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);
  
  let html = '';
  
  sortedYears.forEach(yr => {
    const yearData = groupedByYear[yr];
    
    html += `<div class="awards-year-group">`;
    html += `<div class="awards-year-header">${yr} Awards</div>`;
    
    ['Boys', 'Girls'].forEach(g => {
      if (gender !== 'all' && g !== gender) return;
      
      const genderAwards = yearData[g];
      if (Object.keys(genderAwards).length === 0) return;
      
      html += `<div class="awards-gender-section">`;
      html += `<div class="awards-gender-title">${g}</div>`;
      
      // MVP first
      if (genderAwards['MVP']) {
        html += `<div class="awards-category">`;
        html += `<div class="awards-category-title">🏆 Most Valuable Player</div>`;
        html += `<div class="awards-list">`;
        genderAwards['MVP'].forEach(a => {
          html += `<span class="award-item mvp"><span class="award-name">${a.name}</span><span class="award-school">${a.school}</span></span>`;
        });
        html += `</div></div>`;
      }
      
      // All-Tournament
      if (genderAwards['All-Tournament']) {
        html += `<div class="awards-category">`;
        html += `<div class="awards-category-title">⭐ All-Tournament Team</div>`;
        html += `<div class="awards-list">`;
        genderAwards['All-Tournament'].forEach(a => {
          html += `<span class="award-item"><span class="award-name">${a.name}</span><span class="award-school">${a.school}</span></span>`;
        });
        html += `</div></div>`;
      }
      
      // Sportsmanship
      const sportsmanship = [
        ...(genderAwards['Sportsmanship'] || []),
        ...(genderAwards['Team Sportsmanship'] || [])
      ];
      if (sportsmanship.length > 0) {
        html += `<div class="awards-category">`;
        html += `<div class="awards-category-title">🤝 Sportsmanship</div>`;
        html += `<div class="awards-list">`;
        sportsmanship.forEach(a => {
          const displayName = a.name || `${a.school} (Team)`;
          html += `<span class="award-item"><span class="award-name">${displayName}</span>${a.name ? `<span class="award-school">${a.school}</span>` : ''}</span>`;
        });
        html += `</div></div>`;
      }
      
      // Contest winners
      const contests = [];
      if (genderAwards['3-Point Contest Champ']) {
        genderAwards['3-Point Contest Champ'].forEach(a => {
          if (a.name) contests.push({ type: '3-Point', icon: '🎯', ...a });
        });
      }
      if (genderAwards['Skills Challenge Champ']) {
        genderAwards['Skills Challenge Champ'].forEach(a => {
          if (a.name) contests.push({ type: 'Skills', icon: '🏃', ...a });
        });
      }
      if (genderAwards['Slam Dunk Contest Champ']) {
        genderAwards['Slam Dunk Contest Champ'].forEach(a => {
          if (a.name) contests.push({ type: 'Dunk', icon: '💥', ...a });
        });
      }
      
      if (contests.length > 0) {
        html += `<div class="contest-winners">`;
        contests.forEach(c => {
          html += `
            <div class="contest-winner-card">
              <div class="contest-icon">${c.icon}</div>
              <div class="contest-type">${c.type} Contest</div>
              <div class="contest-winner-name">${c.name}</div>
              <div class="contest-winner-school">${c.school}</div>
            </div>
          `;
        });
        html += `</div>`;
      }
      
      html += `</div>`; // awards-gender-section
    });
    
    html += `</div>`; // awards-year-group
  });
  
  if (!html) {
    html = `
      <div class="bash-empty">
        <div class="bash-empty-icon">🏆</div>
        <div class="bash-empty-text">No awards found matching your filters</div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// ===== BRACKET RENDERING =====
function renderBracket() {
  const container = document.getElementById('bracketDisplay');
  if (!container) return;
  
  const gender = bashState.activeBracketGender;
  
  // Get games for this gender from schedule
  const bracketGames = BASH_DATA.schedule.filter(g => 
    g.division === gender && g.game !== null
  ).sort((a, b) => a.game - b.game);
  
  // Group into rounds based on game numbers
  // Boys: Games 1-8 (QF), 9-12 (SF), 13-14 (SF2), 15 (Final)
  // Girls: Games 1-4 (QF), 5-8 (SF), 9-10 (SF2), 11 (Final)
  
  let rounds;
  if (gender === 'Boys') {
    rounds = [
      { title: 'First Round', games: bracketGames.filter(g => g.game >= 1 && g.game <= 8) },
      { title: 'Quarterfinals', games: bracketGames.filter(g => g.game >= 9 && g.game <= 12) },
      { title: 'Semifinals', games: bracketGames.filter(g => g.game >= 13 && g.game <= 14) },
      { title: 'Championship', games: bracketGames.filter(g => g.game === 15) }
    ];
  } else {
    rounds = [
      { title: 'First Round', games: bracketGames.filter(g => g.game >= 1 && g.game <= 4) },
      { title: 'Quarterfinals', games: bracketGames.filter(g => g.game >= 5 && g.game <= 8) },
      { title: 'Semifinals', games: bracketGames.filter(g => g.game >= 9 && g.game <= 10) },
      { title: 'Championship', games: bracketGames.filter(g => g.game === 11) }
    ];
  }
  
  let html = '';
  
  rounds.forEach(round => {
    if (round.games.length === 0) return;
    
    html += `<div class="bracket-round">`;
    html += `<div class="bracket-round-title">${round.title}</div>`;
    
    round.games.forEach(game => {
      const hasScore = game.awayScore !== null && game.homeScore !== null;
      const awayWon = hasScore && game.awayScore > game.homeScore;
      const homeWon = hasScore && game.homeScore > game.awayScore;
      const isChampionship = round.title === 'Championship';
      
      html += `<div class="bracket-game ${isChampionship ? 'championship' : ''}">`;
      
      // Away team
      html += `
        <div class="bracket-team">
          <span class="bracket-team-name ${awayWon ? 'winner' : ''} ${isPlaceholder(game.away) ? 'pending' : ''}">${game.away}</span>
          <span class="bracket-team-score ${awayWon ? 'winner' : ''}">${game.awayScore ?? ''}</span>
        </div>
      `;
      
      // Home team
      html += `
        <div class="bracket-team">
          <span class="bracket-team-name ${homeWon ? 'winner' : ''} ${isPlaceholder(game.home) ? 'pending' : ''}">${game.home}</span>
          <span class="bracket-team-score ${homeWon ? 'winner' : ''}">${game.homeScore ?? ''}</span>
        </div>
      `;
      
      // Game info
      html += `<div class="bracket-game-info">Game ${game.game} • ${game.date} ${game.time}</div>`;
      
      html += `</div>`; // bracket-game
    });
    
    html += `</div>`; // bracket-round
  });
  
  container.innerHTML = html;
}
