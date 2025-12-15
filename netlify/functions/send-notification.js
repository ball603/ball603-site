/**
 * Ball603 Send Notification Function
 * Netlify serverless function to send push notifications via OneSignal
 * 
 * Add to: netlify/functions/send-notification.js
 * 
 * Environment variables required in Netlify:
 * - ONESIGNAL_APP_ID: Your OneSignal App ID
 * - ONESIGNAL_REST_API_KEY: Your OneSignal REST API Key
 */

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Verify request is from our scraper (optional: add a secret key)
    const authHeader = event.headers['x-api-key'];
    if (authHeader !== process.env.INTERNAL_API_KEY) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const payload = JSON.parse(event.body);
        const { type, data } = payload;

        let notification;

        switch (type) {
            case 'final_score':
                notification = buildFinalScoreNotification(data);
                break;
            case 'article':
                notification = buildArticleNotification(data);
                break;
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid notification type' })
                };
        }

        // Send to OneSignal
        const response = await fetch(ONESIGNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify(notification)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('OneSignal error:', result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to send notification', details: result })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                notificationId: result.id,
                recipients: result.recipients 
            })
        };

    } catch (error) {
        console.error('Error sending notification:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

/**
 * Build notification for a final score
 * @param {Object} data - Game data
 * @param {string} data.homeTeam - Home team name
 * @param {string} data.homeTeamSlug - Home team slug for targeting
 * @param {number} data.homeScore - Home team score
 * @param {string} data.awayTeam - Away team name
 * @param {string} data.awayTeamSlug - Away team slug for targeting
 * @param {number} data.awayScore - Away team score
 * @param {string} data.gameId - Game ID for the URL
 * @param {string} data.gender - 'boys' or 'girls'
 * @param {string} data.level - 'varsity', 'jv', etc.
 */
function buildFinalScoreNotification(data) {
    const {
        homeTeam,
        homeTeamSlug,
        homeScore,
        awayTeam,
        awayTeamSlug,
        awayScore,
        gameId,
        gender,
        level
    } = data;

    // Determine winner for the heading
    const isHomeWinner = homeScore > awayScore;
    const winner = isHomeWinner ? homeTeam : awayTeam;
    const winnerScore = isHomeWinner ? homeScore : awayScore;
    const loser = isHomeWinner ? awayTeam : homeTeam;
    const loserScore = isHomeWinner ? awayScore : homeScore;

    // Build notification content
    const heading = 'Final Score';
    const content = `${winner} ${winnerScore}, ${loser} ${loserScore}`;

    // Target users subscribed to EITHER team
    // Uses OneSignal filters with OR logic
    const filters = [
        { field: 'tag', key: `team_${homeTeamSlug}`, value: 'true' },
        { operator: 'OR' },
        { field: 'tag', key: `team_${awayTeamSlug}`, value: 'true' }
    ];

    return {
        app_id: process.env.ONESIGNAL_APP_ID,
        filters: filters,
        headings: { en: heading },
        contents: { en: content },
        url: `https://ball603.com/game/${gameId}`,
        // Chrome-specific options
        chrome_web_badge: 'https://ball603.com/images/badge-icon.png',
        // Collapse similar notifications
        collapse_id: `game_${gameId}`,
        // TTL - notification expires after 2 hours
        ttl: 7200,
        // Priority
        priority: 10,
        // Additional data for the client
        data: {
            type: 'final_score',
            gameId,
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            gender,
            level
        }
    };
}

/**
 * Build notification for a new article
 * @param {Object} data - Article data
 * @param {string} data.title - Article title
 * @param {string} data.slug - Article slug for URL
 * @param {string} data.excerpt - Short excerpt
 * @param {string} data.imageUrl - Featured image URL
 * @param {string[]} data.teamSlugs - Array of team slugs to target
 */
function buildArticleNotification(data) {
    const { title, slug, excerpt, imageUrl, teamSlugs } = data;

    // Build filters for all tagged teams
    const filters = [];
    teamSlugs.forEach((teamSlug, index) => {
        if (index > 0) {
            filters.push({ operator: 'OR' });
        }
        filters.push({ field: 'tag', key: `team_${teamSlug}`, value: 'true' });
    });

    return {
        app_id: process.env.ONESIGNAL_APP_ID,
        filters: filters.length > 0 ? filters : undefined,
        // If no teams tagged, send to all subscribers
        included_segments: filters.length === 0 ? ['Subscribed Users'] : undefined,
        headings: { en: 'Ball603' },
        contents: { en: title },
        url: `https://ball603.com/news/${slug}`,
        // Big picture for Chrome
        chrome_web_image: imageUrl,
        chrome_web_badge: 'https://ball603.com/images/badge-icon.png',
        // TTL - article notifications expire after 24 hours
        ttl: 86400,
        data: {
            type: 'article',
            slug,
            title
        }
    };
}
