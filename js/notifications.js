/**
 * Ball603 Notification Settings Page
 * Handles team subscription UI and OneSignal integration
 */

// Configuration
const ONESIGNAL_APP_ID = '4a0f408c-5c71-4fb3-9f92-6f6927759c2f';

// State
let allTeams = [];
let selectedTeams = new Set();
let originalSelections = new Set();
let isSubscribed = false;

// DOM Elements
const statusCard = document.getElementById('subscription-status').querySelector('.status-card');
const statusValue = statusCard.querySelector('.status-value');
const btnSubscribe = document.getElementById('btn-subscribe');
const teamsGrid = document.getElementById('teams-grid');
const teamSearch = document.getElementById('team-search');
const selectedCount = document.getElementById('selected-count');
const btnSave = document.getElementById('btn-save');
const btnSelectAll = document.getElementById('btn-select-all');
const btnClearAll = document.getElementById('btn-clear-all');
const teamSelection = document.getElementById('team-selection');
const filterBtns = document.querySelectorAll('.filter-btn');

// Initialize OneSignal
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true // For testing
    });

    // Check subscription status
    await checkSubscriptionStatus(OneSignal);

    // Listen for permission changes
    OneSignal.Notifications.addEventListener('permissionChange', async (permission) => {
        await checkSubscriptionStatus(OneSignal);
    });
});

/**
 * Check if user is subscribed and update UI
 */
async function checkSubscriptionStatus(OneSignal) {
    const permission = await OneSignal.Notifications.permission;
    const isPushSupported = OneSignal.Notifications.isPushSupported();

    statusCard.classList.remove('loading', 'subscribed', 'not-subscribed', 'blocked');

    if (!isPushSupported) {
        statusCard.classList.add('blocked');
        statusValue.textContent = 'Not supported in this browser';
        btnSubscribe.style.display = 'none';
        teamSelection.classList.add('disabled');
        isSubscribed = false;
    } else if (permission) {
        statusCard.classList.add('subscribed');
        statusValue.textContent = 'Enabled - You\'ll receive score alerts';
        btnSubscribe.style.display = 'none';
        teamSelection.classList.remove('disabled');
        isSubscribed = true;
        
        // Load user's current team subscriptions
        await loadUserSubscriptions(OneSignal);
    } else {
        statusCard.classList.add('not-subscribed');
        statusValue.textContent = 'Not enabled - Enable to get score alerts';
        btnSubscribe.style.display = 'block';
        teamSelection.classList.add('disabled');
        isSubscribed = false;
    }
}

/**
 * Load user's current team subscriptions from OneSignal tags
 */
async function loadUserSubscriptions(OneSignal) {
    try {
        const tags = await OneSignal.User.getTags();
        
        for (const [key, value] of Object.entries(tags)) {
            if (key.startsWith('team_') && value === 'true') {
                const teamSlug = key.replace('team_', '');
                selectedTeams.add(teamSlug);
                originalSelections.add(teamSlug);
            }
        }
        
        updateTeamSelectionUI();
        updateSelectedCount();
    } catch (err) {
        console.error('Error loading subscriptions:', err);
    }
}

/**
 * Subscribe button click handler
 */
btnSubscribe.addEventListener('click', async () => {
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.Slidedown.promptPush();
    });
});

/**
 * Load teams from Netlify function
 */
async function loadTeams() {
    try {
        const response = await fetch('/.netlify/functions/teams?active=true');
        const data = await response.json();
        
        if (!response.ok) throw new Error('Failed to fetch teams');
        
        allTeams = data.teams || [];
        renderTeams(allTeams);
    } catch (err) {
        console.error('Error loading teams:', err);
        teamsGrid.innerHTML = `
            <div class="loading-spinner">
                <span style="color: #ef4444;">Error loading teams. Please refresh.</span>
            </div>
        `;
    }
}

/**
 * Render teams grouped by region
 */
function renderTeams(teams, filter = 'all') {
    // Filter by level if specified
    let filteredTeams = teams;
    if (filter === 'high-school') {
        filteredTeams = teams.filter(t => t.level === 'High School' || !t.level);
    } else if (filter === 'college') {
        filteredTeams = teams.filter(t => t.level === 'College');
    }

    // Group by region/division
    const regions = {};
    filteredTeams.forEach(team => {
        // Use division for high school, or 'College' for college teams
        const region = team.division || team.region || (team.level === 'College' ? 'College' : 'Other');
        if (!regions[region]) regions[region] = [];
        
        // Avoid duplicates (teams appear for both Boys and Girls)
        const existingTeam = regions[region].find(t => t.shortname === team.shortname);
        if (!existingTeam) {
            regions[region].push(team);
        }
    });

    // Sort regions
    const sortedRegions = Object.keys(regions).sort((a, b) => {
        if (a === 'College') return 1;
        if (b === 'College') return -1;
        return a.localeCompare(b);
    });

    // Build HTML
    let html = '';
    
    sortedRegions.forEach(region => {
        const regionTeams = regions[region];
        const selectedInRegion = regionTeams.filter(t => selectedTeams.has(t.shortname || t.slug || t.id)).length;
        const isCollege = region === 'College' || regionTeams[0]?.level === 'College';
        
        html += `
            <div class="region-group ${isCollege ? 'college-section' : ''}">
                <div class="region-header" onclick="toggleRegion(this)">
                    <span class="region-name">
                        <span class="toggle-icon">▼</span>
                        ${region}
                    </span>
                    <span class="region-count">${selectedInRegion}/${regionTeams.length} selected</span>
                </div>
                <div class="region-teams">
                    ${regionTeams.map(team => {
                        const teamId = team.shortname || team.slug || team.id;
                        const logoFilename = team.logo_filename || (team.shortname?.replace(/[^a-zA-Z0-9]/g, '') + '.png');
                        return `
                            <div class="team-item ${selectedTeams.has(teamId) ? 'selected' : ''}" 
                                 data-team-slug="${teamId}"
                                 data-team-name="${team.shortname || team.name}"
                                 onclick="toggleTeam(this)">
                                <div class="team-checkbox"></div>
                                <img src="/logos/100px/${logoFilename}" alt="" class="team-logo" onerror="this.style.display='none'">
                                <span class="team-name">${team.shortname || team.name}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    teamsGrid.innerHTML = html || '<p style="text-align: center; color: #808080; padding: 40px;">No teams found</p>';
}

/**
 * Toggle region expand/collapse
 */
function toggleRegion(header) {
    const group = header.closest('.region-group');
    group.classList.toggle('collapsed');
}

/**
 * Toggle team selection
 */
function toggleTeam(element) {
    if (!isSubscribed) {
        showToast('Enable push notifications first', 'info');
        return;
    }

    const slug = element.dataset.teamSlug;
    
    if (selectedTeams.has(slug)) {
        selectedTeams.delete(slug);
        element.classList.remove('selected');
    } else {
        selectedTeams.add(slug);
        element.classList.add('selected');
    }

    updateSelectedCount();
    updateRegionCounts();
}

/**
 * Update the selected count display
 */
function updateSelectedCount() {
    selectedCount.textContent = selectedTeams.size;
    
    // Check if there are changes
    const hasChanges = !setsEqual(selectedTeams, originalSelections);
    btnSave.disabled = !hasChanges;
}

/**
 * Update region selection counts
 */
function updateRegionCounts() {
    document.querySelectorAll('.region-group').forEach(group => {
        const teamItems = group.querySelectorAll('.team-item');
        const selected = group.querySelectorAll('.team-item.selected').length;
        const countEl = group.querySelector('.region-count');
        countEl.textContent = `${selected}/${teamItems.length} selected`;
    });
}

/**
 * Update UI to reflect selected teams
 */
function updateTeamSelectionUI() {
    document.querySelectorAll('.team-item').forEach(item => {
        const slug = item.dataset.teamSlug;
        if (selectedTeams.has(slug)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    updateRegionCounts();
}

/**
 * Check if two sets are equal
 */
function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

/**
 * Save preferences to OneSignal
 */
btnSave.addEventListener('click', async () => {
    if (!isSubscribed) return;

    btnSave.classList.add('saving');
    btnSave.textContent = 'Saving...';

    try {
        await OneSignalDeferred.push(async function(OneSignal) {
            // Get current tags
            const currentTags = await OneSignal.User.getTags();
            
            // Find team tags to remove
            const tagsToRemove = Object.keys(currentTags).filter(k => k.startsWith('team_'));
            
            // Remove old team tags
            if (tagsToRemove.length > 0) {
                await OneSignal.User.removeTags(tagsToRemove);
            }
            
            // Add new team tags
            if (selectedTeams.size > 0) {
                const newTags = {};
                selectedTeams.forEach(slug => {
                    newTags[`team_${slug}`] = 'true';
                });
                await OneSignal.User.addTags(newTags);
            }
        });

        // Update original selections
        originalSelections = new Set(selectedTeams);
        updateSelectedCount();

        showToast('Preferences saved!', 'success');
    } catch (err) {
        console.error('Error saving preferences:', err);
        showToast('Error saving preferences', 'error');
    } finally {
        btnSave.classList.remove('saving');
        btnSave.textContent = 'Save Preferences';
    }
});

/**
 * Select All button
 */
btnSelectAll.addEventListener('click', () => {
    if (!isSubscribed) {
        showToast('Enable push notifications first', 'info');
        return;
    }

    document.querySelectorAll('.team-item:not(.hidden)').forEach(item => {
        const slug = item.dataset.teamSlug;
        selectedTeams.add(slug);
        item.classList.add('selected');
    });
    
    updateSelectedCount();
    updateRegionCounts();
});

/**
 * Clear All button
 */
btnClearAll.addEventListener('click', () => {
    selectedTeams.clear();
    document.querySelectorAll('.team-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    updateSelectedCount();
    updateRegionCounts();
});

/**
 * Search filter
 */
teamSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    document.querySelectorAll('.team-item').forEach(item => {
        const name = item.dataset.teamName.toLowerCase();
        if (query === '' || name.includes(query)) {
            item.classList.remove('hidden');
            item.style.display = '';
        } else {
            item.classList.add('hidden');
            item.style.display = 'none';
        }
    });

    // Show/hide empty regions
    document.querySelectorAll('.region-group').forEach(group => {
        const visibleTeams = group.querySelectorAll('.team-item:not(.hidden)');
        group.style.display = visibleTeams.length === 0 ? 'none' : '';
    });
});

/**
 * Level filter buttons
 */
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const level = btn.dataset.level;
        renderTeams(allTeams, level);
        updateTeamSelectionUI();
    });
});

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', loadTeams);
