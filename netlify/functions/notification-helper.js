/**
 * Ball603 Notification Helper
 * Add this to your scraper function to detect new finals and send notifications
 * 
 * Usage in your scraper:
 * 1. Import: const { checkForNewFinals, sendFinalScoreNotification } = require('./notification-helper');
 * 2. After updating games in Supabase, call checkForNewFinals with the games that were updated
 */

// Internal API key for authenticating with the notification function
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const NOTIFICATION_FUNCTION_URL = process.env.URL 
    ? `${process.env.URL}/.netlify/functions/send-notification`
    : 'http://localhost:8888/.netlify/functions/send-notification';

/**
 * Check for games that just became final and send notifications
 * @param {Object} supabase - Supabase client
 * @param {Array} updatedGames - Games that were just updated by the scraper
 * @param {Array} previousStates - Previous states of those games (before update)
 */
async function checkForNewFinals(supabase, updatedGames, previousStates) {
    const newFinals = [];

    for (const game of updatedGames) {
        // Find the previous state for this game
        const previousState = previousStates.find(p => p.id === game.id);
        
        // Check if game just became final
        // Conditions: 
        // 1. Game now has a score (both home_score and away_score are not null)
        // 2. Game is marked as final (status === 'final' or is_final === true)
        // 3. Previously didn't have a final score
        const isNowFinal = game.status === 'final' || game.is_final === true;
        const hasScore = game.home_score !== null && game.away_score !== null;
        const wasNotFinal = !previousState || 
            previousState.status !== 'final' || 
            previousState.home_score === null || 
            previousState.away_score === null;

        if (isNowFinal && hasScore && wasNotFinal) {
            newFinals.push(game);
        }
    }

    // Send notifications for each new final
    for (const game of newFinals) {
        try {
            await sendFinalScoreNotification(game);
            console.log(`Notification sent for game ${game.id}: ${game.away_team} @ ${game.home_team}`);
        } catch (err) {
            console.error(`Failed to send notification for game ${game.id}:`, err);
        }
    }

    return newFinals;
}

/**
 * Send a final score notification
 * @param {Object} game - Game object with all required fields
 */
async function sendFinalScoreNotification(game) {
    const payload = {
        type: 'final_score',
        data: {
            homeTeam: game.home_team_name || game.home_team,
            homeTeamSlug: game.home_team_slug || slugify(game.home_team_name || game.home_team),
            homeScore: game.home_score,
            awayTeam: game.away_team_name || game.away_team,
            awayTeamSlug: game.away_team_slug || slugify(game.away_team_name || game.away_team),
            awayScore: game.away_score,
            gameId: game.id,
            gender: game.gender || 'boys',
            level: game.level || 'varsity'
        }
    };

    const response = await fetch(NOTIFICATION_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': INTERNAL_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Notification failed: ${response.status} - ${error}`);
    }

    return response.json();
}

/**
 * Send an article notification
 * @param {Object} article - Article object
 * @param {string} article.title - Article title
 * @param {string} article.slug - Article URL slug
 * @param {string} article.excerpt - Short description
 * @param {string} article.featured_image - Featured image URL
 * @param {string[]} article.team_slugs - Array of team slugs to notify
 */
async function sendArticleNotification(article) {
    const payload = {
        type: 'article',
        data: {
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            imageUrl: article.featured_image,
            teamSlugs: article.team_slugs || []
        }
    };

    const response = await fetch(NOTIFICATION_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': INTERNAL_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Notification failed: ${response.status} - ${error}`);
    }

    return response.json();
}

/**
 * Simple slugify helper
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

module.exports = {
    checkForNewFinals,
    sendFinalScoreNotification,
    sendArticleNotification
};


/* =============================================================================
 * EXAMPLE: Integration with your existing scraper
 * =============================================================================
 * 
 * Here's how you'd modify your existing scraper function to send notifications:
 * 
 * // In your scraper function (e.g., netlify/functions/scrape-scores.js)
 * 
 * const { createClient } = require('@supabase/supabase-js');
 * const { checkForNewFinals } = require('./notification-helper');
 * 
 * exports.handler = async (event, context) => {
 *     const supabase = createClient(
 *         process.env.SUPABASE_URL,
 *         process.env.SUPABASE_SERVICE_KEY
 *     );
 * 
 *     // 1. Fetch games that might have new scores
 *     const today = new Date().toISOString().split('T')[0];
 *     const { data: existingGames } = await supabase
 *         .from('games')
 *         .select('*')
 *         .eq('date', today);
 * 
 *     // 2. Store previous states before updating
 *     const previousStates = existingGames.map(g => ({
 *         id: g.id,
 *         status: g.status,
 *         home_score: g.home_score,
 *         away_score: g.away_score
 *     }));
 * 
 *     // 3. Scrape new data from NHIAA/ESPN/etc
 *     const scrapedGames = await scrapeGames(); // Your existing scrape logic
 * 
 *     // 4. Update games in Supabase
 *     const { data: updatedGames } = await supabase
 *         .from('games')
 *         .upsert(scrapedGames)
 *         .select();
 * 
 *     // 5. Check for new finals and send notifications
 *     const newFinals = await checkForNewFinals(supabase, updatedGames, previousStates);
 *     
 *     return {
 *         statusCode: 200,
 *         body: JSON.stringify({
 *             updated: updatedGames.length,
 *             notificationsSent: newFinals.length
 *         })
 *     };
 * };
 * 
 * =============================================================================
 */
