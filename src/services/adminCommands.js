/**
 * Admin Command Execution Service
 * Jarvis-style command execution for bebe and authorized admins
 * Allows natural language commands like "Beboa, give user X 100 bebits"
 */

import { config } from '../config.js';
import db, { getUser, updateBebits, resetStreak, appendUserNotes, getStats } from '../database.js';

// Prepared statements for admin permissions
const statements = {
    getPermission: db.prepare(`
        SELECT * FROM admin_permissions WHERE user_id = ?
    `),

    setPermission: db.prepare(`
        INSERT OR REPLACE INTO admin_permissions (user_id, permission_level, can_execute_admin, granted_by, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `)
};

/**
 * Check if user has admin command execution permission
 * @param {string} userId - Discord user ID
 * @returns {boolean}
 */
export function canExecuteAdminCommands(userId) {
    // Bebe always has permission
    if (config.BEBE_USER_ID && userId === config.BEBE_USER_ID) {
        return true;
    }

    try {
        const permission = statements.getPermission.get(userId);
        return permission?.can_execute_admin === 1;
    } catch (e) {
        return false;
    }
}

/**
 * Grant admin command permission to a user
 * @param {string} userId - User to grant permission
 * @param {string} grantedBy - User granting permission
 * @param {number} level - Permission level (0-10)
 */
export function grantAdminPermission(userId, grantedBy, level = 1) {
    statements.setPermission.run(userId, level, 1, grantedBy);
    console.log(`[ADMIN] Granted admin permission to ${userId} by ${grantedBy}`);
}

/**
 * Revoke admin command permission
 * @param {string} userId - User to revoke permission from
 */
export function revokeAdminPermission(userId) {
    statements.setPermission.run(userId, 0, 0, null);
    console.log(`[ADMIN] Revoked admin permission from ${userId}`);
}

/**
 * Admin command definitions
 * Each command has patterns to match and an execute function
 */
const adminCommands = [
    {
        name: 'give_bebits',
        patterns: [
            /give\s+(?:<@!?)?(\d+)(?:>)?\s+(\d+)\s*bebits?/i,
            /add\s+(\d+)\s*bebits?\s+to\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:<@!?)?(\d+)(?:>)?\s+gets?\s+(\d+)\s*bebits?/i
        ],
        execute: async (match, context) => {
            const userId = match[1];
            const amount = parseInt(match[2]);

            const user = getUser(userId);
            const newBalance = user.bebits + amount;
            updateBebits(userId, newBalance);

            return {
                success: true,
                message: `Done~ Gave <@${userId}> **${amount} bebits**. New balance: **${newBalance}**`
            };
        }
    },
    {
        name: 'remove_bebits',
        patterns: [
            /remove\s+(\d+)\s*bebits?\s+from\s+(?:<@!?)?(\d+)(?:>)?/i,
            /take\s+(\d+)\s*bebits?\s+from\s+(?:<@!?)?(\d+)(?:>)?/i,
            /deduct\s+(\d+)\s*bebits?\s+from\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, context) => {
            const amount = parseInt(match[1]);
            const userId = match[2];

            const user = getUser(userId);
            const newBalance = Math.max(0, user.bebits - amount);
            updateBebits(userId, newBalance);

            return {
                success: true,
                message: `Done~ Removed **${amount} bebits** from <@${userId}>. New balance: **${newBalance}**`
            };
        }
    },
    {
        name: 'set_bebits',
        patterns: [
            /set\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*bebits?\s+to\s+(\d+)/i,
            /(?:<@!?)?(\d+)(?:>)?\s*bebits?\s*=\s*(\d+)/i
        ],
        execute: async (match, context) => {
            const userId = match[1];
            const amount = parseInt(match[2]);

            getUser(userId); // Ensure user exists
            updateBebits(userId, amount);

            return {
                success: true,
                message: `Done~ Set <@${userId}>'s bebits to **${amount}**`
            };
        }
    },
    {
        name: 'reset_streak',
        patterns: [
            /reset\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*streak/i,
            /clear\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*streak/i
        ],
        execute: async (match, context) => {
            const userId = match[1];

            getUser(userId); // Ensure user exists
            resetStreak(userId);

            return {
                success: true,
                message: `Done~ Reset <@${userId}>'s streak to 0`
            };
        }
    },
    {
        name: 'add_note',
        patterns: [
            /(?:add\s+)?note\s+(?:about\s+)?(?:<@!?)?(\d+)(?:>)?[:\s]+(.+)/i,
            /remember\s+(?:that\s+)?(?:<@!?)?(\d+)(?:>)?[:\s]+(.+)/i
        ],
        execute: async (match, context) => {
            const userId = match[1];
            const note = match[2].trim();

            appendUserNotes(userId, note);

            return {
                success: true,
                message: `Got it~ I'll remember that about <@${userId}>`
            };
        }
    },
    {
        name: 'server_stats',
        patterns: [
            /(?:show|get|what are the)\s*server\s*stats?/i,
            /how\s*(?:is|are)\s*(?:the\s*)?(?:server|community)\s*doing/i
        ],
        execute: async (match, context) => {
            const stats = getStats();

            return {
                success: true,
                message: `**Server Stats:**\n` +
                    `- Total users: ${stats.totalUsers}\n` +
                    `- Total bebits: ${stats.totalBebits}\n` +
                    `- Total redemptions: ${stats.totalRedemptions}\n` +
                    `- Top earner: <@${stats.topEarner?.discord_id}> (${stats.topEarner?.bebits} bebits)\n` +
                    `- Longest streak: <@${stats.longestStreak?.discord_id}> (${stats.longestStreak?.current_streak} days)`
            };
        }
    },
    {
        name: 'announce',
        patterns: [
            /announce[:\s]+(.+)/i,
            /broadcast[:\s]+(.+)/i
        ],
        execute: async (match, context) => {
            const message = match[1].trim();

            // This will be handled by the message handler to send to announcement channel
            return {
                success: true,
                action: 'announce',
                content: message,
                message: `I'll announce that~`
            };
        }
    }
];

/**
 * Parse and execute admin command from natural language
 * @param {string} message - User message
 * @param {Object} context - Execution context
 * @returns {Promise<{matched: boolean, result?: Object}>}
 */
export async function parseAndExecuteAdminCommand(message, context) {
    // Check permission
    if (!canExecuteAdminCommands(context.userId)) {
        return { matched: false };
    }

    // Try each command pattern
    for (const cmd of adminCommands) {
        for (const pattern of cmd.patterns) {
            const match = message.match(pattern);
            if (match) {
                console.log(`[ADMIN] Matched command: ${cmd.name}`);
                try {
                    const result = await cmd.execute(match, context);
                    return { matched: true, command: cmd.name, result };
                } catch (error) {
                    console.error(`[ADMIN] Command execution failed:`, error);
                    return {
                        matched: true,
                        command: cmd.name,
                        result: { success: false, message: `Oops, that didn't work: ${error.message}` }
                    };
                }
            }
        }
    }

    return { matched: false };
}

/**
 * Get list of available admin commands
 * @returns {Array<{name: string, description: string}>}
 */
export function getAvailableAdminCommands() {
    return [
        { name: 'give_bebits', description: 'Give bebits to a user (e.g., "give @user 100 bebits")' },
        { name: 'remove_bebits', description: 'Remove bebits from a user (e.g., "remove 50 bebits from @user")' },
        { name: 'set_bebits', description: 'Set a user\'s bebits (e.g., "set @user bebits to 500")' },
        { name: 'reset_streak', description: 'Reset a user\'s streak (e.g., "reset @user streak")' },
        { name: 'add_note', description: 'Add a note about a user (e.g., "note about @user: loves cats")' },
        { name: 'server_stats', description: 'Show server statistics' },
        { name: 'announce', description: 'Make an announcement' }
    ];
}

export default {
    canExecuteAdminCommands,
    grantAdminPermission,
    revokeAdminPermission,
    parseAndExecuteAdminCommand,
    getAvailableAdminCommands
};
