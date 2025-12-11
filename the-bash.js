/**
 * The Bash - Tournament JavaScript
 * Handles tabs, filtering, snow effect, and data rendering
 */

// ===== CONFIGURATION =====
const LOGO_PATH = '/logos/100px/';
const DEFAULT_LOGO = '/logos/100px/Ball603-white.png';

// ===== STATE =====
const bashState = {
  activeTab: 'schedule',
  activeHistoryTab: 'champions',
  filters: {
    schedule: { gender: 'all', day: 'all', search: '' },
    champions: { gender: 'all', team: 'all' },
    awards: { year: 'all', gender: 'all', type: 'all' }
  }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initSnowEffect();
  initTabs();
  initHistoryTabs();
  initFilters();
  renderSchedule();
  renderBoysBracket();
  renderGirlsBracket();
  renderChampions();
  renderAwards();
  populateYearFilter();
  populateTeamFilter();
});

// ===== SNOW EFFECT =====
function initSnowEffect() {
  const container = document.getElementById('snowContainer');
  if (!container) return;
  
  const snowflakes = ['❄', '❅', '❆', '✻', '✼', '❉'];
  const numberOfSnowflakes = 50;
  
  for (let i = 0; i < numberOfSnowflakes; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.innerHTML = snowflakes[Math.floor(Math.random() * snowflakes.length)];
    snowflake.style.left = Math.random() * 100 + '%';
    snowflake.style.fontSize = (Math.random() * 10 + 10) + 'px';
    snowflake.style.opacity = Math.random() * 0.6 + 0.4;
    snowflake.style.animationDuration = (Math.random() * 2 + 2) + 's';
    snowflake.style.animationDelay = (Math.random() * 2) + 's';
    container.appendChild(snowflake);
  }
  
  // Stop snow after 3 seconds
  setTimeout(() => {
    container.style.opacity = '0';
    container.style.transition = 'opacity 1s ease';
    setTimeout(() => {
      container.remove();
    }, 1000);
  }, 3000);
}

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
  
  // Toggle filter visibility
  document.getElementById('championsFilters').style.display = subtab === 'champions' ? 'flex' : 'none';
  document.getElementById('awardsFilters').style.display = subtab === 'awards' ? 'flex' : 'none';
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
  
  // Champions filters
  document.getElementById('championsGenderFilter')?.addEventListener('change', (e) => {
    bashState.filters.champions.gender = e.target.value;
    renderChampions();
  });
  
  document.getElementById('championsTeamFilter')?.addEventListener('change', (e) => {
    bashState.filters.champions.team = e.target.value;
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

function populateTeamFilter() {
  const teamFilter = document.getElementById('championsTeamFilter');
  if (!teamFilter) return;
  
  // Get all teams from champions and runner-ups
  const teams = new Set();
  BASH_DATA.champions.forEach(c => {
    teams.add(c.champion);
    teams.add(c.runnerUp);
  });
  
  // Sort alphabetically
  const sortedTeams = [...teams].sort();
  
  sortedTeams.forEach(team => {
    const option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    teamFilter.appendChild(option);
  });
}

// ===== HELPER FUNCTIONS =====
function getTeamLogo(teamName) {
  if (!teamName || isPlaceholder(teamName)) return DEFAULT_LOGO;
  
  // Clean up team name for filename
  const filename = teamName
    .replace(/\s*\(.*\)\s*/g, '') // Remove parenthetical like (ME), (TN)
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .toLowerCase();
  
  return `${LOGO_PATH}${filename}.png`;
}

function handleLogoError(img) {
  img.onerror = null;
  img.src = DEFAULT_LOGO;
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
            <td style="text-align: right;">${game.time}</td>
            <td colspan="7" style="text-align: center;">${game.away}</td>
          </tr>
        `;
      } else {
        const hasScore = game.awayScore !== null && game.homeScore !== null;
        const awayWon = hasScore && game.awayScore > game.homeScore;
        const homeWon = hasScore && game.homeScore > game.awayScore;
        
        html += `
          <tr>
            <td class="col-time game-time">${game.time}</td>
            <td class="col-game">${game.game ? `<span class="game-number">${game.game}</span>` : ''}</td>
            <td class="col-division">${game.division ? `<span class="division-badge ${game.division.toLowerCase()}">${game.division.charAt(0)}</span>` : ''}</td>
            <td class="col-away">
              <div class="team-cell away">
                <span class="team-name-text ${awayWon ? 'winner' : ''} ${isPlaceholder(game.away) ? 'placeholder' : ''}">${game.away}</span>
                <img src="${getTeamLogo(game.away)}" alt="" class="team-logo-small" onerror="handleLogoError(this)">
              </div>
            </td>
            <td class="col-score">
              ${renderScore(game, hasScore, awayWon, homeWon)}
            </td>
            <td class="col-home">
              <div class="team-cell">
                <img src="${getTeamLogo(game.home)}" alt="" class="team-logo-small" onerror="handleLogoError(this)">
                <span class="team-name-text ${homeWon ? 'winner' : ''} ${isPlaceholder(game.home) ? 'placeholder' : ''}">${game.home}</span>
              </div>
            </td>
            <td class="col-site">${game.site}</td>
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

function renderScore(game, hasScore, awayWon, homeWon) {
  if (!hasScore) {
    return '<span class="score-vs">vs</span>';
  }
  
  return `
    <div class="score-cell">
      <span class="score-box ${awayWon ? 'winner' : ''}">${game.awayScore}</span>
      <span>-</span>
      <span class="score-box ${homeWon ? 'winner' : ''}">${game.homeScore}</span>
      ${game.overtime ? '<span class="score-ot">OT</span>' : ''}
    </div>
  `;
}

// ===== BRACKET RENDERING =====
function renderBoysBracket() {
  const container = document.getElementById('boysBracketDisplay');
  if (!container) return;
  renderBracket(container, 'Boys');
}

function renderGirlsBracket() {
  const container = document.getElementById('girlsBracketDisplay');
  if (!container) return;
  renderBracket(container, 'Girls');
}

function renderBracket(container, gender) {
  // Get games for this gender from schedule
  const bracketGames = BASH_DATA.schedule.filter(g => 
    g.division === gender && g.game !== null
  ).sort((a, b) => a.game - b.game);
  
  // Define rounds based on gender
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
  
  rounds.forEach((round, roundIndex) => {
    if (round.games.length === 0) return;
    
    html += `<div class="bracket-round">`;
    html += `<div class="bracket-round-title">${round.title}</div>`;
    
    round.games.forEach(game => {
      const hasScore = game.awayScore !== null && game.homeScore !== null;
      const awayWon = hasScore && game.awayScore > game.homeScore;
      const homeWon = hasScore && game.homeScore > game.awayScore;
      
      html += `<div class="bracket-game-wrapper">`;
      
      // Game header with number and site
      html += `<div class="bracket-game-header">Game ${game.game} • ${game.site}</div>`;
      
      html += `<div class="bracket-game">`;
      
      // Away team
      html += `
        <div class="bracket-team">
          <div class="bracket-team-info">
            <img src="${getTeamLogo(game.away)}" alt="" class="bracket-team-logo" onerror="handleLogoError(this)">
            <span class="bracket-team-name ${awayWon ? 'winner' : ''} ${isPlaceholder(game.away) ? 'pending' : ''}">${game.away}</span>
          </div>
          <span class="bracket-team-score ${awayWon ? 'winner' : ''}">${game.awayScore ?? ''}</span>
        </div>
      `;
      
      // Home team
      html += `
        <div class="bracket-team">
          <div class="bracket-team-info">
            <img src="${getTeamLogo(game.home)}" alt="" class="bracket-team-logo" onerror="handleLogoError(this)">
            <span class="bracket-team-name ${homeWon ? 'winner' : ''} ${isPlaceholder(game.home) ? 'pending' : ''}">${game.home}</span>
          </div>
          <span class="bracket-team-score ${homeWon ? 'winner' : ''}">${game.homeScore ?? ''}</span>
        </div>
      `;
      
      html += `</div>`; // bracket-game
      html += `</div>`; // bracket-game-wrapper
    });
    
    html += `</div>`; // bracket-round
  });
  
  container.innerHTML = html;
}

// ===== CHAMPIONS RENDERING =====
function renderChampions() {
  const tbody = document.getElementById('championsBody');
  const countsContainer = document.getElementById('championshipCounts');
  if (!tbody) return;
  
  const { gender, team } = bashState.filters.champions;
  
  // Filter champions
  let champions = BASH_DATA.champions.filter(c => {
    if (gender !== 'all' && c.gender !== gender) return false;
    if (team !== 'all' && c.champion !== team && c.runnerUp !== team) return false;
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
        <td>
          <div class="team-with-logo">
            <img src="${getTeamLogo(c.champion)}" alt="" class="team-logo-history" onerror="handleLogoError(this)">
            <span>${c.champion}</span>
          </div>
        </td>
        <td class="score-final">
          ${c.championScore}-${c.runnerUpScore}
          ${c.overtime ? '<span class="ot">OT</span>' : ''}
        </td>
        <td>
          <div class="team-with-logo">
            <img src="${getTeamLogo(c.runnerUp)}" alt="" class="team-logo-history" onerror="handleLogoError(this)">
            <span>${c.runnerUp}</span>
          </div>
        </td>
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
            <div class="championship-school">
              <img src="${getTeamLogo(school)}" alt="" class="championship-school-logo" onerror="handleLogoError(this)">
              <span>${school}</span>
            </div>
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
  const tbody = document.getElementById('awardsBody');
  if (!tbody) return;
  
  const { year, gender, type } = bashState.filters.awards;
  
  // Filter awards
  let awards = BASH_DATA.awards.filter(a => {
    if (year !== 'all' && a.year !== parseInt(year)) return false;
    if (gender !== 'all' && a.gender !== gender) return false;
    if (type !== 'all' && a.award !== type) return false;
    return true;
  });
  
  // Sort by year descending, then gender, then award type
  const awardOrder = ['MVP', 'All-Tournament', 'Sportsmanship', 'Team Sportsmanship', '3-Point Contest Champ', 'Skills Challenge Champ', 'Slam Dunk Contest Champ'];
  
  awards.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
    return awardOrder.indexOf(a.award) - awardOrder.indexOf(b.award);
  });
  
  // Build table
  let html = '';
  awards.forEach(a => {
    const isMVP = a.award === 'MVP';
    const displayName = a.name || (a.award === 'Team Sportsmanship' ? '(Team Award)' : '—');
    
    html += `
      <tr>
        <td><strong>${a.year}</strong></td>
        <td><span class="division-badge ${a.gender.toLowerCase()}">${a.gender}</span></td>
        <td><span class="award-type ${isMVP ? 'mvp' : ''}">${a.award}</span></td>
        <td>${displayName}</td>
        <td>
          <div class="team-with-logo">
            <img src="${getTeamLogo(a.school)}" alt="" class="team-logo-history" onerror="handleLogoError(this)">
            <span>${a.school}</span>
          </div>
        </td>
      </tr>
    `;
  });
  
  if (!html) {
    html = `
      <tr>
        <td colspan="5">
          <div class="bash-empty">
            <div class="bash-empty-icon">🏆</div>
            <div class="bash-empty-text">No awards found matching your filters</div>
          </div>
        </td>
      </tr>
    `;
  }
  
  tbody.innerHTML = html;
}
