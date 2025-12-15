/**
 * Ball603 OneSignal Initialization
 * Add this script to the <head> of all pages
 */

// OneSignal SDK loader
const oneSignalScript = document.createElement('script');
oneSignalScript.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
oneSignalScript.defer = true;
document.head.appendChild(oneSignalScript);

// OneSignal initialization
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "4a0f408c-5c71-4fb3-9f92-6f6927759c2f",
        // Disable default prompts - we'll handle subscription via settings page
        promptOptions: {
            slidedown: {
                prompts: [
                    {
                        type: "push",
                        autoPrompt: true,
                        text: {
                            actionMessage: "Get score alerts for your favorite NH basketball teams!",
                            acceptButton: "Allow",
                            cancelButton: "Later"
                        },
                        delay: {
                            pageViews: 2,
                            timeDelay: 10
                        }
                    }
                ]
            }
        },
        welcomeNotification: {
            title: "Ball603",
            message: "You're subscribed! Visit Notification Settings to pick your teams."
        }
    });

    // After subscription, prompt user to select teams
    OneSignal.Notifications.addEventListener('permissionChange', async (permission) => {
        if (permission) {
            // User just subscribed - show toast or redirect to settings
            showTeamSelectionPrompt();
        }
    });
});

/**
 * Show a prompt to select teams after initial subscription
 */
function showTeamSelectionPrompt() {
    // Check if we're already on the notifications page
    if (window.location.pathname.includes('notifications')) return;
    
    // Create a toast notification
    const toast = document.createElement('div');
    toast.id = 'team-select-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <span>🏀 Set up your team alerts!</span>
            <a href="/notifications.html" class="toast-btn">Pick Teams</a>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a56ff;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: inherit;
        animation: slideIn 0.3s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        #team-select-toast .toast-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        #team-select-toast .toast-btn {
            background: white;
            color: #1a56ff;
            padding: 6px 12px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 600;
        }
        #team-select-toast .toast-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0 4px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 10000);
}

/**
 * Utility functions for use across the site
 */
window.Ball603Notifications = {
    // Check if user is subscribed
    async isSubscribed() {
        return await OneSignal.Notifications.permission;
    },
    
    // Get user's subscribed teams
    async getSubscribedTeams() {
        const tags = await OneSignal.User.getTags();
        const teams = [];
        for (const [key, value] of Object.entries(tags)) {
            if (key.startsWith('team_') && value === 'true') {
                teams.push(key.replace('team_', ''));
            }
        }
        return teams;
    },
    
    // Subscribe to a team
    async subscribeToTeam(teamSlug) {
        await OneSignal.User.addTag(`team_${teamSlug}`, 'true');
    },
    
    // Unsubscribe from a team
    async unsubscribeFromTeam(teamSlug) {
        await OneSignal.User.removeTag(`team_${teamSlug}`);
    },
    
    // Subscribe to multiple teams at once
    async setTeamSubscriptions(teamSlugs) {
        // First, get all current tags and remove team tags
        const currentTags = await OneSignal.User.getTags();
        const tagsToRemove = Object.keys(currentTags).filter(k => k.startsWith('team_'));
        
        if (tagsToRemove.length > 0) {
            await OneSignal.User.removeTags(tagsToRemove);
        }
        
        // Add new team tags
        if (teamSlugs.length > 0) {
            const newTags = {};
            teamSlugs.forEach(slug => {
                newTags[`team_${slug}`] = 'true';
            });
            await OneSignal.User.addTags(newTags);
        }
    }
};
