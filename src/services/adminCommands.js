/**
 * Admin Command Execution Service (Jarvis Mode 2.0)
 *
 * Advanced natural language command execution for bebe.blu and authorized admins
 * Features:
 * - Smart intent parsing with synonyms and fuzzy matching
 * - AI fallback for ambiguous commands
 * - Confirmation system for sensitive operations
 * - Useful admin tools + creative/playful commands
 */

import { config } from '../config.js';
import db, { getUser, updateBebits, resetStreak, appendUserNotes, getStats, getTopUsers, getUserRank } from '../database.js';
import { storeMemory, searchMemories, MemoryTypes } from './memory.js';
import { getPersonalityState, setMood, getRelationship, updateRelationship, Moods } from './personality.js';
import { chatCompletion } from './openrouter.js';
import { parseJarvisIntent, isAvailable as isLLMEvaluatorAvailable } from './llmEvaluator.js';

// Prepared statements for admin permissions
const statements = {
    getPermission: db.prepare(`
        SELECT * FROM admin_permissions WHERE user_id = ?
    `),

    setPermission: db.prepare(`
        INSERT OR REPLACE INTO admin_permissions (user_id, permission_level, can_execute_admin, granted_by, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `),

    getAllPermissions: db.prepare(`
        SELECT * FROM admin_permissions WHERE can_execute_admin = 1
    `),

    // Additional queries for new commands
    getAllUsers: db.prepare(`
        SELECT discord_id, bebits, current_streak, total_checkins, last_checkin
        FROM users ORDER BY bebits DESC
    `),

    getUserCount: db.prepare(`
        SELECT COUNT(*) as count FROM users
    `),

    getTotalBebits: db.prepare(`
        SELECT COALESCE(SUM(bebits), 0) as total FROM users
    `),

    getActiveUsers: db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE last_checkin > datetime('now', '-7 days')
    `),

    getStreakLeaders: db.prepare(`
        SELECT discord_id, current_streak FROM users
        ORDER BY current_streak DESC LIMIT ?
    `),

    getRecentRedemptions: db.prepare(`
        SELECT * FROM redemptions
        ORDER BY created_at DESC LIMIT ?
    `),

    getUserRedemptions: db.prepare(`
        SELECT * FROM redemptions
        WHERE discord_id = ?
        ORDER BY created_at DESC LIMIT ?
    `)
};

// Pending confirmations (userId -> {command, data, expires})
const pendingConfirmations = new Map();
const CONFIRMATION_TIMEOUT = 60000; // 60 seconds

// ============================================
// PERMISSION MANAGEMENT
// ============================================

/**
 * Check if user has admin command execution permission
 */
export function canExecuteAdminCommands(userId) {
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
 * Grant admin command permission
 */
export function grantAdminPermission(userId, grantedBy, level = 1) {
    statements.setPermission.run(userId, level, 1, grantedBy);
    console.log(`[JARVIS] Granted admin permission to ${userId} by ${grantedBy}`);
}

/**
 * Revoke admin command permission
 */
export function revokeAdminPermission(userId) {
    statements.setPermission.run(userId, 0, 0, null);
    console.log(`[JARVIS] Revoked admin permission from ${userId}`);
}

// ============================================
// CONVERSATION CONTEXT (for multi-turn understanding)
// ============================================

// Track recent admin conversations for context
const conversationContext = new Map();
const CONTEXT_TTL = 5 * 60 * 1000; // 5 minutes

function getConversationContext(userId) {
    const ctx = conversationContext.get(userId);
    if (ctx && Date.now() - ctx.timestamp < CONTEXT_TTL) {
        return ctx;
    }
    return null;
}

function updateConversationContext(userId, data) {
    conversationContext.set(userId, {
        ...data,
        timestamp: Date.now()
    });
}

function clearConversationContext(userId) {
    conversationContext.delete(userId);
}

// ============================================
// INTENT PARSING HELPERS
// ============================================

/**
 * Synonym mappings for flexible command parsing
 */
const synonyms = {
    give: ['give', 'award', 'grant', 'add', 'send', 'gift', 'bless', 'gimme', 'hand', 'toss', 'throw'],
    remove: ['remove', 'take', 'deduct', 'subtract', 'yoink', 'steal', 'yeet', 'confiscate', 'strip', 'minus'],
    set: ['set', 'make', 'change', 'update', 'adjust', 'fix', 'put'],
    reset: ['reset', 'clear', 'wipe', 'zero', 'nuke', 'destroy'],
    show: ['show', 'display', 'get', 'what', 'tell', 'gimme', 'check', 'see', 'view', 'look', 'find', 'who', 'how'],
    user: ['user', 'member', 'person', 'them', 'they', 'that', 'this'],
    bebits: ['bebits', 'bebit', 'points', 'coins', 'currency', 'money', 'cash', 'bucks'],
    streak: ['streak', 'streaks', 'chain', 'combo'],
    stats: ['stats', 'statistics', 'status', 'info', 'data', 'numbers', 'analytics'],
    everyone: ['everyone', 'all', 'everybody', 'all users', 'the server', 'whole server', 'entire'],
    timeout: ['timeout', 'mute', 'silence', 'jail', 'bonk', 'punish'],
    shame: ['shame', 'expose', 'embarrass', 'call out', 'blast', 'cancel', 'ratio'],
    praise: ['praise', 'compliment', 'appreciate', 'hype', 'gas up', 'celebrate', 'honor'],
    roast: ['roast', 'burn', 'drag', 'destroy', 'murder', 'annihilate', 'obliterate', 'end'],
    transfer: ['transfer', 'move', 'send', 'give to', 'pass', 'shift'],
    compare: ['compare', 'versus', 'vs', 'against', 'battle', 'fight', 'matchup'],
    remember: ['remember', 'note', 'save', 'record', 'log', 'write', 'store', 'keep'],
    forget: ['forget', 'delete', 'remove memory', 'erase', 'wipe'],
    mood: ['mood', 'feeling', 'vibe', 'emotion', 'state', 'attitude'],
    fun: ['bonk', 'shame', 'roast', 'crown', 'fortune', 'wheel', 'simp', 'ship', 'compatibility']
};

/**
 * Intent keywords - maps intents to likely commands
 */
const intentKeywords = {
    give_bebits: ['give', 'award', 'grant', 'add', 'bless', 'bebits', 'points'],
    remove_bebits: ['remove', 'take', 'deduct', 'yoink', 'steal', 'minus'],
    set_bebits: ['set', 'balance', '=', 'exactly'],
    transfer_bebits: ['transfer', 'move', 'from', 'to'],
    mass_give_bebits: ['everyone', 'all', 'each', 'mass'],
    reset_streak: ['reset', 'streak', 'clear', 'wipe'],
    user_info: ['info', 'check', 'who', 'about', 'details', 'lookup'],
    compare_users: ['compare', 'vs', 'versus', 'against', 'battle'],
    server_stats: ['server', 'stats', 'status', 'how', 'doing'],
    add_note: ['remember', 'note', 'save', 'record'],
    search_memories: ['recall', 'remember', 'know about', 'memories'],
    set_mood: ['mood', 'feeling', 'be', 'feel'],
    personality_status: ['personality', 'status', 'how are you'],
    bonk: ['bonk', 'horny', 'jail'],
    shame: ['shame', 'expose', 'embarrass', 'blast'],
    praise: ['praise', 'hype', 'gas up', 'compliment'],
    roast: ['roast', 'burn', 'drag', 'destroy'],
    simp_check: ['simp', 'check', 'level'],
    crown: ['crown', 'royalty', 'king', 'queen'],
    dethrone: ['dethrone', 'remove crown', 'peasant'],
    fortune: ['fortune', 'predict', 'future', 'fate'],
    compatibility: ['compatibility', 'ship', 'x'],
    spin_wheel: ['wheel', 'spin', 'fate', 'fortune'],
    jarvis_help: ['help', 'commands', 'what can']
};

/**
 * Check if word matches any synonym
 */
function matchesSynonym(word, category) {
    const syns = synonyms[category] || [];
    const lower = word.toLowerCase();
    return syns.some(s => lower.includes(s));
}

/**
 * Fuzzy match for typos (simple Levenshtein-like)
 */
function fuzzyMatch(str1, str2, maxDistance = 2) {
    if (str1 === str2) return true;
    if (Math.abs(str1.length - str2.length) > maxDistance) return false;

    let distance = 0;
    const len = Math.max(str1.length, str2.length);
    for (let i = 0; i < len; i++) {
        if (str1[i] !== str2[i]) {
            distance++;
            if (distance > maxDistance) return false;
        }
    }
    return true;
}

/**
 * Extract user ID from mention or raw ID
 */
function extractUserId(text) {
    const mentionMatch = text.match(/<@!?(\d+)>/);
    if (mentionMatch) return mentionMatch[1];

    const idMatch = text.match(/\b(\d{17,20})\b/);
    if (idMatch) return idMatch[1];

    return null;
}

/**
 * Extract multiple user IDs
 */
function extractMultipleUserIds(text) {
    const ids = [];
    const mentionPattern = /<@!?(\d+)>/g;
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
        ids.push(match[1]);
    }
    return ids;
}

/**
 * Extract number from text (handles various formats)
 */
function extractNumber(text) {
    // Handle word numbers
    const wordNumbers = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'twenty': 20, 'fifty': 50, 'hundred': 100
    };

    for (const [word, num] of Object.entries(wordNumbers)) {
        if (text.toLowerCase().includes(word)) return num;
    }

    // Handle numeric
    const match = text.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : null;
}

/**
 * Analyze message intent using keyword scoring
 */
function analyzeIntent(message) {
    const lower = message.toLowerCase();
    const scores = {};

    for (const [command, keywords] of Object.entries(intentKeywords)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                score += keyword.length; // Longer matches = higher score
            }
        }
        if (score > 0) {
            scores[command] = score;
        }
    }

    // Sort by score
    const sorted = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);

    return sorted.length > 0 ? {
        topIntent: sorted[0][0],
        confidence: Math.min(sorted[0][1] / 20, 1), // Normalize
        allIntents: sorted
    } : null;
}

/**
 * Extract entities from message
 */
function extractEntities(message) {
    return {
        userIds: extractMultipleUserIds(message),
        userId: extractUserId(message),
        amount: extractNumber(message),
        hasEveryone: synonyms.everyone.some(s => message.toLowerCase().includes(s)),
        text: message.replace(/<@!?\d+>/g, '').replace(/\d+/g, '').trim()
    };
}

// ============================================
// COMMAND DEFINITIONS
// ============================================

const adminCommands = [
    // ==========================================
    // BEBITS MANAGEMENT
    // ==========================================
    {
        name: 'give_bebits',
        category: 'bebits',
        description: 'Give bebits to a user',
        examples: ['give @user 100 bebits', 'award @user 50 points', 'bless them with 200 bebits'],
        patterns: [
            /(?:give|award|grant|add|send|gift|bless)\s+(?:<@!?)?(\d+)(?:>)?\s+(?:with\s+)?(\d+)\s*(?:bebits?|points?)?/i,
            /(?:give|award|grant|add|send|gift|bless)\s+(\d+)\s*(?:bebits?|points?)?\s+to\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:<@!?)?(\d+)(?:>)?\s+(?:gets?|receives?|earned?)\s+(\d+)\s*(?:bebits?|points?)?/i
        ],
        execute: async (match, _context) => {
            let userId, amount;
            // Handle different pattern capture groups
            if (match[0].toLowerCase().includes(' to ')) {
                amount = parseInt(match[1]);
                userId = match[2];
            } else {
                userId = match[1];
                amount = parseInt(match[2]);
            }

            const user = getUser(userId);
            const newBalance = user.bebits + amount;
            updateBebits(userId, newBalance);

            const responses = [
                `Done~ Gave <@${userId}> **${amount} bebits**. New balance: **${newBalance}** ✨`,
                `Hmph, fine. <@${userId}> gets **${amount} bebits**. They're at **${newBalance}** now.`,
                `*waves crystal dramatically* <@${userId}> has been blessed with **${amount} bebits**! Total: **${newBalance}**`
            ];
            return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
    },

    {
        name: 'remove_bebits',
        category: 'bebits',
        description: 'Remove bebits from a user',
        examples: ['remove 50 bebits from @user', 'take 100 points from @user', 'yoink 25 bebits from @user'],
        patterns: [
            /(?:remove|take|deduct|subtract|yoink)\s+(\d+)\s*(?:bebits?|points?)?\s+from\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:yeet|steal)\s+(\d+)\s*(?:bebits?|points?)?\s+from\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const amount = parseInt(match[1]);
            const userId = match[2];

            const user = getUser(userId);
            const newBalance = Math.max(0, user.bebits - amount);
            updateBebits(userId, newBalance);

            const responses = [
                `Done~ Yoinked **${amount} bebits** from <@${userId}>. They're down to **${newBalance}** now.`,
                `*hisses gleefully* Took **${amount} bebits** from <@${userId}>! Balance: **${newBalance}**`,
                `Confiscated~ <@${userId}> lost **${amount} bebits**. Current: **${newBalance}**`
            ];
            return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
    },

    {
        name: 'set_bebits',
        category: 'bebits',
        description: 'Set a user\'s bebits to specific amount',
        examples: ['set @user bebits to 500', '@user bebits = 100'],
        patterns: [
            /set\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*(?:bebits?|balance)\s*(?:to|=)\s*(\d+)/i,
            /(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*(?:bebits?|balance)\s*=\s*(\d+)/i,
            /make\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*(?:bebits?|balance)\s+(\d+)/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const amount = parseInt(match[2]);

            getUser(userId);
            updateBebits(userId, amount);

            return {
                success: true,
                message: `Done~ Set <@${userId}>'s bebits to **${amount}** ✨`
            };
        }
    },

    {
        name: 'transfer_bebits',
        category: 'bebits',
        description: 'Transfer bebits between users',
        examples: ['transfer 100 bebits from @user1 to @user2', 'move 50 points from @a to @b'],
        patterns: [
            /transfer\s+(\d+)\s*(?:bebits?|points?)?\s+from\s+(?:<@!?)?(\d+)(?:>)?\s+to\s+(?:<@!?)?(\d+)(?:>)?/i,
            /move\s+(\d+)\s*(?:bebits?|points?)?\s+from\s+(?:<@!?)?(\d+)(?:>)?\s+to\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const amount = parseInt(match[1]);
            const fromUserId = match[2];
            const toUserId = match[3];

            const fromUser = getUser(fromUserId);
            const toUser = getUser(toUserId);

            if (fromUser.bebits < amount) {
                return {
                    success: false,
                    message: `<@${fromUserId}> only has **${fromUser.bebits} bebits**. Can't transfer **${amount}**.`
                };
            }

            updateBebits(fromUserId, fromUser.bebits - amount);
            updateBebits(toUserId, toUser.bebits + amount);

            return {
                success: true,
                message: `Transferred **${amount} bebits** from <@${fromUserId}> to <@${toUserId}>~\n` +
                    `<@${fromUserId}>: ${fromUser.bebits} → ${fromUser.bebits - amount}\n` +
                    `<@${toUserId}>: ${toUser.bebits} → ${toUser.bebits + amount}`
            };
        }
    },

    {
        name: 'mass_give_bebits',
        category: 'bebits',
        description: 'Give bebits to multiple users at once',
        examples: ['give @user1 @user2 @user3 50 bebits each', 'award everyone 10 bebits'],
        patterns: [
            /give\s+(.+?)\s+(\d+)\s*(?:bebits?|points?)?\s*each/i,
            /award\s+everyone\s+(\d+)\s*(?:bebits?|points?)?/i
        ],
        execute: async (match, context) => {
            if (match[0].toLowerCase().includes('everyone')) {
                const amount = parseInt(match[1]);
                const allUsers = statements.getAllUsers.all();
                let count = 0;

                for (const user of allUsers) {
                    updateBebits(user.discord_id, user.bebits + amount);
                    count++;
                }

                return {
                    success: true,
                    message: `*Crystal glows intensely* Blessed **${count} users** with **${amount} bebits** each! ✨`
                };
            }

            const userIds = extractMultipleUserIds(match[1]);
            const amount = parseInt(match[2]);

            if (userIds.length === 0) {
                return { success: false, message: "Couldn't find any users in that message~" };
            }

            for (const userId of userIds) {
                const user = getUser(userId);
                updateBebits(userId, user.bebits + amount);
            }

            return {
                success: true,
                message: `Done~ Gave **${amount} bebits** to ${userIds.length} users! ✨`
            };
        }
    },

    // ==========================================
    // STREAK MANAGEMENT
    // ==========================================
    {
        name: 'reset_streak',
        category: 'streak',
        description: 'Reset a user\'s streak to 0',
        examples: ['reset @user streak', 'clear @user\'s streak'],
        patterns: [
            /reset\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*streak/i,
            /clear\s+(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*streak/i,
            /(?:<@!?)?(\d+)(?:>)?\s*(?:'s)?\s*streak\s*(?:=|to)\s*0/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);
            const oldStreak = user.current_streak;

            resetStreak(userId);

            return {
                success: true,
                message: `Reset <@${userId}>'s streak from **${oldStreak}** to **0** 💔`
            };
        }
    },

    // ==========================================
    // USER INFO & LOOKUP
    // ==========================================
    {
        name: 'user_info',
        category: 'info',
        description: 'Get detailed info about a user',
        examples: ['info @user', 'check @user', 'tell me about @user'],
        patterns: [
            /(?:info|check|lookup|details?|tell me about|who is)\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:<@!?)?(\d+)(?:>)?\s+(?:info|status|stats)/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);
            const rank = getUserRank(userId);
            const relationship = getRelationship(userId);
            const redemptions = statements.getUserRedemptions.all(userId, 5);

            let response = `**User Info: <@${userId}>**\n`;
            response += `💰 Bebits: **${user.bebits}** (Rank #${rank})\n`;
            response += `🔥 Streak: **${user.current_streak} days**\n`;
            response += `📊 Total Check-ins: **${user.total_checkins}**\n`;
            response += `💕 Relationship: **${relationship.stage.label}** (${(relationship.familiarity * 100).toFixed(0)}% familiarity)\n`;

            if (user.last_checkin) {
                const lastCheckin = new Date(user.last_checkin);
                const hoursAgo = Math.floor((Date.now() - lastCheckin.getTime()) / (1000 * 60 * 60));
                response += `⏰ Last Check-in: **${hoursAgo}h ago**\n`;
            }

            if (redemptions.length > 0) {
                response += `\n**Recent Redemptions:**\n`;
                for (const r of redemptions.slice(0, 3)) {
                    response += `- ${r.reward_name} (${r.cost} bebits)\n`;
                }
            }

            if (user.beboa_notes) {
                response += `\n**My Notes:** ${user.beboa_notes.substring(0, 200)}${user.beboa_notes.length > 200 ? '...' : ''}`;
            }

            return { success: true, message: response };
        }
    },

    {
        name: 'compare_users',
        category: 'info',
        description: 'Compare two users',
        examples: ['compare @user1 vs @user2', '@user1 versus @user2'],
        patterns: [
            /compare\s+(?:<@!?)?(\d+)(?:>)?\s+(?:vs|versus|and|against|with)\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:<@!?)?(\d+)(?:>)?\s+(?:vs|versus)\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const user1Id = match[1];
            const user2Id = match[2];

            const user1 = getUser(user1Id);
            const user2 = getUser(user2Id);
            const rank1 = getUserRank(user1Id);
            const rank2 = getUserRank(user2Id);

            let response = `**⚔️ BATTLE OF THE SIMPS ⚔️**\n\n`;
            response += `**<@${user1Id}>** vs **<@${user2Id}>**\n\n`;

            response += `💰 Bebits: **${user1.bebits}** vs **${user2.bebits}** `;
            response += user1.bebits > user2.bebits ? `(<@${user1Id}> wins!)` : user1.bebits < user2.bebits ? `(<@${user2Id}> wins!)` : `(TIE!)`;
            response += `\n`;

            response += `🔥 Streak: **${user1.current_streak}** vs **${user2.current_streak}** `;
            response += user1.current_streak > user2.current_streak ? `(<@${user1Id}> wins!)` : user1.current_streak < user2.current_streak ? `(<@${user2Id}> wins!)` : `(TIE!)`;
            response += `\n`;

            response += `📊 Check-ins: **${user1.total_checkins}** vs **${user2.total_checkins}** `;
            response += user1.total_checkins > user2.total_checkins ? `(<@${user1Id}> wins!)` : user1.total_checkins < user2.total_checkins ? `(<@${user2Id}> wins!)` : `(TIE!)`;
            response += `\n`;

            response += `🏆 Rank: **#${rank1}** vs **#${rank2}** `;
            response += rank1 < rank2 ? `(<@${user1Id}> wins!)` : rank1 > rank2 ? `(<@${user2Id}> wins!)` : `(TIE!)`;

            // Determine overall winner
            let score1 = 0, score2 = 0;
            if (user1.bebits > user2.bebits) score1++; else if (user1.bebits < user2.bebits) score2++;
            if (user1.current_streak > user2.current_streak) score1++; else if (user1.current_streak < user2.current_streak) score2++;
            if (user1.total_checkins > user2.total_checkins) score1++; else if (user1.total_checkins < user2.total_checkins) score2++;
            if (rank1 < rank2) score1++; else if (rank1 > rank2) score2++;

            response += `\n\n**WINNER:** `;
            if (score1 > score2) {
                response += `<@${user1Id}> (${score1}-${score2}) 👑`;
            } else if (score2 > score1) {
                response += `<@${user2Id}> (${score2}-${score1}) 👑`;
            } else {
                response += `It's a tie! Both are equally devoted~ 💕`;
            }

            return { success: true, message: response };
        }
    },

    // ==========================================
    // SERVER STATS
    // ==========================================
    {
        name: 'server_stats',
        category: 'info',
        description: 'Show server statistics',
        examples: ['server stats', 'how is the server doing', 'show stats'],
        patterns: [
            /(?:show|get|what are the|give me)\s*(?:server|community)?\s*stats?/i,
            /how\s*(?:is|are)\s*(?:the\s*)?(?:server|community)\s*doing/i,
            /server\s*(?:status|statistics|info)/i
        ],
        execute: async (_match, _context) => {
            const stats = getStats();
            const activeUsers = statements.getActiveUsers.get().count;
            const personality = getPersonalityState();

            let response = `**📊 Server Stats**\n\n`;
            response += `👥 Total Users: **${stats.totalUsers}**\n`;
            response += `🟢 Active (7 days): **${activeUsers}**\n`;
            response += `💰 Total Bebits: **${stats.totalBebits}**\n`;
            response += `🎁 Total Redemptions: **${stats.totalRedemptions}**\n\n`;

            response += `**🏆 Leaderboard**\n`;
            response += `Top Earner: <@${stats.topEarner?.discord_id}> (${stats.topEarner?.bebits} bebits)\n`;
            response += `Longest Streak: <@${stats.longestStreak?.discord_id}> (${stats.longestStreak?.current_streak} days)\n\n`;

            response += `**🐍 My Current Vibe**\n`;
            response += `Mood: ${personality.moodData.emoji} ${personality.moodData.name}\n`;

            return { success: true, message: response };
        }
    },

    // ==========================================
    // MEMORY MANAGEMENT
    // ==========================================
    {
        name: 'add_note',
        category: 'memory',
        description: 'Add a note about a user',
        examples: ['note about @user: loves cats', 'remember that @user is allergic to peanuts'],
        patterns: [
            /(?:add\s+)?note\s+(?:about\s+)?(?:<@!?)?(\d+)(?:>)?[:\s]+(.+)/i,
            /remember\s+(?:that\s+)?(?:<@!?)?(\d+)(?:>)?[:\s]+(.+)/i,
            /(?:<@!?)?(\d+)(?:>)?\s+(?:is|has|likes?|loves?|hates?)\s+(.+)/i
        ],
        execute: async (match, context) => {
            const userId = match[1];
            const note = match[2].trim();

            // Store in notes
            appendUserNotes(userId, note);

            // Also store as semantic memory
            await storeMemory({
                userId,
                memoryType: MemoryTypes.FACT,
                content: note,
                importance: 0.7,
                sourceType: 'jarvis_command',
                sourceId: context.messageId,
                metadata: { addedBy: context.userId }
            });

            return {
                success: true,
                message: `Got it~ I'll remember that about <@${userId}> 📝`
            };
        }
    },

    {
        name: 'search_memories',
        category: 'memory',
        description: 'Search Beboa\'s memories',
        examples: ['what do you remember about cats', 'search memories for birthday'],
        patterns: [
            /what\s+do\s+(?:you\s+)?(?:remember|know)\s+about\s+(.+)/i,
            /search\s+(?:memories?|notes?)\s+(?:for|about)\s+(.+)/i,
            /recall\s+(.+)/i
        ],
        execute: async (match, _context) => {
            const query = match[1].trim();
            const memories = await searchMemories(query, { limit: 5 });

            if (memories.length === 0) {
                return { success: true, message: `Hmm, I don't have any memories about "${query}"~` };
            }

            let response = `**🧠 Memories about "${query}":**\n\n`;
            for (const mem of memories) {
                const similarity = mem.similarity ? ` (${(mem.similarity * 100).toFixed(0)}% match)` : '';
                response += `- ${mem.content}${similarity}\n`;
            }

            return { success: true, message: response };
        }
    },

    // ==========================================
    // PERSONALITY/MOOD CONTROL
    // ==========================================
    {
        name: 'set_mood',
        category: 'personality',
        description: 'Set Beboa\'s current mood',
        examples: ['set mood to happy', 'make beboa mischievous', 'beboa mood: annoyed'],
        patterns: [
            /(?:set|change|make)\s+(?:your\s+|beboa(?:'s)?\s+)?mood\s+(?:to\s+)?(\w+)/i,
            /beboa\s+(?:be|mood)[:\s]+(\w+)/i,
            /mood[:\s]+(\w+)/i
        ],
        execute: async (match, context) => {
            const moodName = match[1].toLowerCase();

            if (!Moods[moodName]) {
                const available = Object.keys(Moods).join(', ');
                return {
                    success: false,
                    message: `That's not a valid mood! Available: ${available}`
                };
            }

            setMood(moodName, `jarvis_command_by_${context.userId}`);
            const mood = Moods[moodName];

            return {
                success: true,
                message: `${mood.emoji} Mood set to **${mood.name}**! ${mood.description}~`
            };
        }
    },

    {
        name: 'personality_status',
        category: 'personality',
        description: 'Show current personality state',
        examples: ['how are you feeling', 'personality status', 'beboa status'],
        patterns: [
            /(?:how\s+are\s+you|what(?:'s| is)\s+your\s+mood|personality\s+status|beboa\s+status)/i,
            /show\s+(?:personality|mood)\s*(?:status)?/i
        ],
        execute: async (_match, _context) => {
            const state = getPersonalityState();
            const { effectiveTraits, currentMood, moodData } = state;

            let response = `**🐍 Current Beboa Status**\n\n`;
            response += `**Mood:** ${moodData.emoji} ${moodData.name} - ${moodData.description}\n\n`;

            response += `**Notable Traits:**\n`;
            const notable = Object.entries(effectiveTraits)
                .filter(([_, v]) => v > 0.7 || v < 0.3)
                .sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5))
                .slice(0, 6);

            for (const [trait, value] of notable) {
                const bar = '█'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
                const traitName = trait.replace(/([A-Z])/g, ' $1').trim();
                response += `${traitName}: [${bar}] ${(value * 100).toFixed(0)}%\n`;
            }

            return { success: true, message: response };
        }
    },

    // ==========================================
    // CREATIVE/PLAYFUL COMMANDS
    // ==========================================
    {
        name: 'bonk',
        category: 'fun',
        description: 'Send someone to horny jail (playful timeout mention)',
        examples: ['bonk @user', 'horny jail @user', 'send @user to horny jail'],
        patterns: [
            /bonk\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:send|put)\s+(?:<@!?)?(\d+)(?:>)?\s+(?:to|in)\s+(?:horny\s+)?jail/i,
            /horny\s+jail\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const bonkMessages = [
                `*bonk* 🔨 <@${userId}> has been sent to horny jail! 🚔`,
                `GO TO HORNY JAIL <@${userId}>! 🔨🚔 *bonk*`,
                `*slithers menacingly* <@${userId}>, you have been BONKED. To jail with you! 🐍🔨`,
                `CEASE <@${userId}>! *bonk bonk* Horny jail. NOW. 🚨`,
                `The horny police have been notified about <@${userId}>. 🚔 *bonk*`
            ];

            // Optionally store this as a fun memory
            await storeMemory({
                userId,
                memoryType: MemoryTypes.JOKE,
                content: `${userId} was sent to horny jail`,
                importance: 0.3,
                sourceType: 'jarvis_fun'
            });

            return {
                success: true,
                message: bonkMessages[Math.floor(Math.random() * bonkMessages.length)]
            };
        }
    },

    {
        name: 'shame',
        category: 'fun',
        description: 'Publicly shame someone (playfully)',
        examples: ['shame @user', 'expose @user', 'call out @user'],
        patterns: [
            /(?:shame|expose|embarrass|blast|call out)\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);
            const rank = getUserRank(userId);
            const relationship = getRelationship(userId);

            const shamePoints = [];

            if (user.bebits < 10) shamePoints.push(`Only has **${user.bebits} bebits**... broke behavior 💀`);
            if (user.current_streak === 0) shamePoints.push(`**0 day streak**... where's the commitment? 😤`);
            if (user.current_streak > 30) shamePoints.push(`${user.current_streak} day streak? Touch grass sometime 🌿`);
            if (rank > 50) shamePoints.push(`Rank #${rank}... literally who? 👀`);
            if (relationship.interaction_count < 5) shamePoints.push(`Has barely talked to me... rude 😒`);
            if (relationship.interaction_count > 100) shamePoints.push(`Has talked to me ${relationship.interaction_count} times... get a life maybe? 💀`);
            if (user.bebits > 300) shamePoints.push(`Hoarding ${user.bebits} bebits... share the wealth! 💰`);

            // Always have at least one
            if (shamePoints.length === 0) {
                shamePoints.push(`Actually can't find anything to shame them for... suspicious 🤔`);
            }

            let response = `**🔔 SHAME BELL FOR <@${userId}> 🔔**\n\n`;
            response += `*ding ding ding*\n\n`;
            for (const point of shamePoints.slice(0, 3)) {
                response += `- ${point}\n`;
            }
            response += `\n*This has been a public service announcement~* 🐍`;

            return { success: true, message: response };
        }
    },

    {
        name: 'praise',
        category: 'fun',
        description: 'Praise someone publicly',
        examples: ['praise @user', 'hype @user', 'gas up @user'],
        patterns: [
            /(?:praise|hype|gas up|appreciate|compliment)\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);
            const rank = getUserRank(userId);
            const relationship = getRelationship(userId);

            const praisePoints = [];

            if (user.bebits >= 100) praisePoints.push(`**${user.bebits} bebits**! A true collector ✨`);
            if (user.current_streak >= 7) praisePoints.push(`**${user.current_streak} day streak**! Now that's dedication 🔥`);
            if (rank <= 10) praisePoints.push(`**Rank #${rank}**! Elite status 👑`);
            if (relationship.familiarity >= 0.5) praisePoints.push(`One of my favorites... not that I'd admit it normally 💕`);
            if (user.total_checkins >= 50) praisePoints.push(`**${user.total_checkins} total check-ins**! True loyalty~`);

            if (praisePoints.length === 0) {
                praisePoints.push(`They exist! That's... something? 😅`);
                praisePoints.push(`Room for improvement! (I'm being nice here) ✨`);
            }

            let response = `**✨ PRAISING <@${userId}> ✨**\n\n`;
            response += `*clears throat dramatically*\n\n`;
            for (const point of praisePoints.slice(0, 3)) {
                response += `- ${point}\n`;
            }
            response += `\n...D-Don't let this go to your head! I was ordered to say this! 😤`;

            return { success: true, message: response };
        }
    },

    {
        name: 'roast',
        category: 'fun',
        description: 'Roast someone (playfully)',
        examples: ['roast @user', 'destroy @user', 'drag @user'],
        patterns: [
            /(?:roast|burn|drag|destroy|murder|annihilate)\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);
            const rank = getUserRank(userId);

            const roasts = [
                `<@${userId}>'s bebits balance is like their personality - barely there 💀`,
                `I've seen better commitment from a goldfish. At least the fish shows up daily 🐟`,
                `<@${userId}> really out here with ${user.bebits} bebits thinking they're somebody 💀`,
                `Your rank is #${rank}? I've seen higher numbers on expired coupons 📉`,
                `<@${userId}> has the dedication of a New Year's resolution - gone by February 🗓️`,
                `If commitment was a test, <@${userId}> would fail. Spectacularly. With style. 📝❌`,
                `I'm a snake and even I'm less cold than <@${userId}>'s daily check-in habits 🥶`,
                `<@${userId}> probably thinks they're winning at life. They're not even winning here 💀`,
                `The audacity of <@${userId}> existing in this server without a proper streak... iconic 🎭`,
                `<@${userId}> brings the same energy as lukewarm water. Technically there, but why? 🚿`
            ];

            let response = `**🔥 ROASTING <@${userId}> 🔥**\n\n`;
            response += roasts[Math.floor(Math.random() * roasts.length)];
            response += `\n\n*This roast was served with love (and venom)~* 🐍✨`;

            return { success: true, message: response };
        }
    },

    {
        name: 'simp_check',
        category: 'fun',
        description: 'Analyze someone\'s simp level',
        examples: ['simp check @user', 'is @user a simp', 'simp level @user'],
        patterns: [
            /simp\s+(?:check|level|status)\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:is|check if)\s+(?:<@!?)?(\d+)(?:>)?\s+a?\s*simp/i,
            /how\s+(?:big\s+)?(?:of\s+)?a?\s*simp\s+is\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);
            const relationship = getRelationship(userId);

            // Calculate simp score based on various factors
            let simpScore = 0;
            simpScore += Math.min(user.bebits / 10, 30); // Max 30 from bebits
            simpScore += user.current_streak * 2; // 2 per streak day
            simpScore += relationship.interaction_count * 0.5; // 0.5 per interaction
            simpScore += relationship.affection * 20; // Max 20 from affection
            simpScore = Math.min(100, Math.round(simpScore));

            let rating, emoji, description;
            if (simpScore >= 90) {
                rating = 'CERTIFIED SIMP LORD';
                emoji = '👑💕';
                description = 'Down astronomical. Touch grass immediately.';
            } else if (simpScore >= 70) {
                rating = 'Professional Simp';
                emoji = '💕';
                description = 'Dedication level: concerning but impressive.';
            } else if (simpScore >= 50) {
                rating = 'Casual Simp';
                emoji = '💗';
                description = 'Shows up when convenient. Mid commitment.';
            } else if (simpScore >= 30) {
                rating = 'Simp Curious';
                emoji = '🤔';
                description = 'Testing the waters. Has potential.';
            } else {
                rating = 'Not Yet a Simp';
                emoji = '❄️';
                description = 'Cold. Distant. Are they even trying?';
            }

            const bar = '💗'.repeat(Math.round(simpScore / 10)) + '🖤'.repeat(10 - Math.round(simpScore / 10));

            let response = `**🔍 SIMP CHECK: <@${userId}>**\n\n`;
            response += `**Simp Level:** ${simpScore}/100 ${emoji}\n`;
            response += `[${bar}]\n\n`;
            response += `**Rating:** ${rating}\n`;
            response += `**Assessment:** ${description}\n\n`;
            response += `*Contributing factors: ${user.bebits} bebits, ${user.current_streak} day streak, ${relationship.interaction_count} interactions*`;

            return { success: true, message: response };
        }
    },

    {
        name: 'crown',
        category: 'fun',
        description: 'Crown someone temporarily',
        examples: ['crown @user', 'make @user royalty'],
        patterns: [
            /crown\s+(?:<@!?)?(\d+)(?:>)?/i,
            /make\s+(?:<@!?)?(\d+)(?:>)?\s+(?:royalty|king|queen|ruler)/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];

            // Add a fun memory
            await storeMemory({
                userId,
                memoryType: MemoryTypes.EVENT,
                content: `Was crowned by bebe`,
                importance: 0.5,
                sourceType: 'jarvis_fun'
            });

            // Boost their relationship a bit
            updateRelationship(userId, { affection: 0.05, familiarity: 0.02 });

            const messages = [
                `👑 *places crown on <@${userId}>* You are now royalty! ...For like, the next 5 minutes. Don't let it go to your head~`,
                `By the power vested in me by the HeartB Crystal... 👑 I crown <@${userId}>! *hisses regally*`,
                `ALL HAIL <@${userId}>! 👑✨ ...Okay that's enough hailing. Back to work everyone.`,
                `*slithers ceremoniously* <@${userId}>, you have been CROWNED! 👑 Use this power wisely~ (or don't, I'm not your mom)`
            ];

            return { success: true, message: messages[Math.floor(Math.random() * messages.length)] };
        }
    },

    {
        name: 'dethrone',
        category: 'fun',
        description: 'Dethrone someone dramatically',
        examples: ['dethrone @user', 'remove @user crown'],
        patterns: [
            /dethrone\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:remove|take)\s+(?:<@!?)?(\d+)(?:>)?(?:'s)?\s*crown/i,
            /(?:<@!?)?(\d+)(?:>)?\s+is\s+(?:no longer|not)\s+(?:royalty|king|queen)/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];

            const messages = [
                `👑💔 <@${userId}> has been DETHRONED! *yeets crown into the void* Back to peasant status~`,
                `The reign of <@${userId}> has ended! 💀👑 Long live... someone else!`,
                `*snatches crown* <@${userId}>, your time is UP! 👑❌ The crown has been repossessed~`,
                `By royal decree (mine), <@${userId}> is hereby DETHRONED! 👑🔨 Don't cry, it was fun while it lasted~`
            ];

            return { success: true, message: messages[Math.floor(Math.random() * messages.length)] };
        }
    },

    {
        name: 'fortune',
        category: 'fun',
        description: 'Tell someone\'s fortune',
        examples: ['fortune @user', 'tell @user fortune', 'predict @user future'],
        patterns: [
            /(?:tell\s+)?(?:<@!?)?(\d+)(?:>)?(?:'s)?\s*fortune/i,
            /fortune\s+(?:for\s+)?(?:<@!?)?(\d+)(?:>)?/i,
            /predict\s+(?:<@!?)?(\d+)(?:>)?(?:'s)?\s*(?:future|fate)/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];
            const user = getUser(userId);

            const fortunes = [
                `🔮 The crystal shows... <@${userId}> will find ${Math.floor(Math.random() * 100) + 1} bebits under their pillow tonight~ (Disclaimer: Probably not. Don't sue me.)`,
                `🔮 I see... a streak break in <@${userId}>'s future! 💀 ...Or not. The mist is unclear. Maybe check in just to be safe~`,
                `🔮 The spirits say <@${userId}> will achieve great things! ...Or embarrass themselves spectacularly. It's 50/50 really.`,
                `🔮 <@${userId}>'s future holds... unexpected affection from a certain snake goddess? 👀 ...WAIT I DIDN'T SAY THAT`,
                `🔮 I predict <@${userId}> will become incredibly rich! ...In bebits. Which aren't real currency. So actually you'll be regular poor. Sorry~`,
                `🔮 The HeartB Crystal reveals: <@${userId}> was a simp in a past life too. Some things never change~ 💕`,
                `🔮 Your fortune, <@${userId}>: "Touch grass, then touch your check-in button." The crystal has spoken! 🌿`,
                `🔮 I sense... <@${userId}> thinking about me right now! ...What? Everyone thinks about me. I'm iconic. 💅`
            ];

            let response = `**🔮 FORTUNE TELLING FOR <@${userId}> 🔮**\n\n`;
            response += `*gazes into the HeartB Crystal dramatically*\n\n`;
            response += fortunes[Math.floor(Math.random() * fortunes.length)];
            response += `\n\n*Results may vary. Beboa accepts no responsibility for unfulfilled prophecies~*`;

            return { success: true, message: response };
        }
    },

    {
        name: 'compatibility',
        category: 'fun',
        description: 'Check compatibility between two users',
        examples: ['compatibility @user1 @user2', 'ship @user1 and @user2'],
        patterns: [
            /compatibility\s+(?:<@!?)?(\d+)(?:>)?\s+(?:and|with|x)\s+(?:<@!?)?(\d+)(?:>)?/i,
            /ship\s+(?:<@!?)?(\d+)(?:>)?\s+(?:and|with|x)\s+(?:<@!?)?(\d+)(?:>)?/i,
            /(?:<@!?)?(\d+)(?:>)?\s+x\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const user1Id = match[1];
            const user2Id = match[2];

            // Generate a "consistent" compatibility score based on user IDs
            const combinedId = [user1Id, user2Id].sort().join('');
            let hash = 0;
            for (let i = 0; i < combinedId.length; i++) {
                hash = ((hash << 5) - hash) + combinedId.charCodeAt(i);
                hash = hash & hash;
            }
            const compatibility = Math.abs(hash % 101);

            let rating, emoji, description;
            if (compatibility >= 90) {
                rating = 'SOULMATES';
                emoji = '💕💕💕';
                description = 'Disgustingly perfect for each other. Get a room.';
            } else if (compatibility >= 70) {
                rating = 'Power Couple';
                emoji = '💕💗';
                description = 'Strong connection. The server ships it.';
            } else if (compatibility >= 50) {
                rating = 'Could Work';
                emoji = '💗';
                description = 'There\'s potential here. Maybe.';
            } else if (compatibility >= 30) {
                rating = 'Awkward';
                emoji = '😬';
                description = 'This would be... interesting. Not good. Interesting.';
            } else {
                rating = 'Enemies Arc';
                emoji = '⚔️';
                description = 'Keep these two apart. For everyone\'s safety.';
            }

            const bar = '💗'.repeat(Math.round(compatibility / 10)) + '💔'.repeat(10 - Math.round(compatibility / 10));

            let response = `**💕 COMPATIBILITY CHECK 💕**\n\n`;
            response += `<@${user1Id}> x <@${user2Id}>\n\n`;
            response += `**Compatibility:** ${compatibility}% ${emoji}\n`;
            response += `[${bar}]\n\n`;
            response += `**Rating:** ${rating}\n`;
            response += `**The Crystal Says:** ${description}\n\n`;
            response += `*Ship responsibly. Beboa is not a licensed relationship counselor~*`;

            return { success: true, message: response };
        }
    },

    {
        name: 'spin_wheel',
        category: 'fun',
        description: 'Spin a wheel for random consequences',
        examples: ['spin wheel for @user', 'wheel of fate @user'],
        patterns: [
            /spin\s+(?:the\s+)?wheel\s+(?:for\s+)?(?:<@!?)?(\d+)(?:>)?/i,
            /wheel\s+of\s+(?:fate|fortune|doom)\s+(?:<@!?)?(\d+)(?:>)?/i
        ],
        execute: async (match, _context) => {
            const userId = match[1];

            const outcomes = [
                { text: `<@${userId}> receives **5 bebits**!`, effect: 'give_5' },
                { text: `<@${userId}> loses **3 bebits**!`, effect: 'take_3' },
                { text: `<@${userId}> gets a compliment from Beboa! ...You have nice... existence? There.`, effect: 'none' },
                { text: `<@${userId}> must touch grass within 24 hours or face the consequences! ⚠️`, effect: 'none' },
                { text: `<@${userId}> is declared "Most Likely to Simp" for today! 👑`, effect: 'none' },
                { text: `<@${userId}> receives Beboa's blessing! +10% luck (not redeemable for anything)`, effect: 'none' },
                { text: `<@${userId}> gets BONKED! 🔨 (preventative bonk)`, effect: 'none' },
                { text: `<@${userId}> wins... nothing! But the experience was priceless~ 💫`, effect: 'none' },
                { text: `<@${userId}> receives **10 bebits**! Lucky~`, effect: 'give_10' },
                { text: `<@${userId}> loses **5 bebits**! The wheel is cruel today... 💀`, effect: 'take_5' },
                { text: `<@${userId}> is cursed to speak only in snake puns for 1 hour! 🐍`, effect: 'none' },
                { text: `<@${userId}> receives a free virtual hug from Beboa! ...W-Whatever, take it! 💕`, effect: 'none' }
            ];

            const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

            // Apply effects
            const user = getUser(userId);
            if (outcome.effect === 'give_5') updateBebits(userId, user.bebits + 5);
            if (outcome.effect === 'give_10') updateBebits(userId, user.bebits + 10);
            if (outcome.effect === 'take_3') updateBebits(userId, Math.max(0, user.bebits - 3));
            if (outcome.effect === 'take_5') updateBebits(userId, Math.max(0, user.bebits - 5));

            let response = `**🎡 WHEEL OF FATE 🎡**\n\n`;
            response += `*The wheel spins for <@${userId}>...*\n\n`;
            response += `🎯 **RESULT:** ${outcome.text}\n\n`;
            response += `*The wheel has spoken! No refunds, no exchanges~*`;

            return { success: true, message: response };
        }
    },

    // ==========================================
    // ANNOUNCEMENTS
    // ==========================================
    {
        name: 'announce',
        category: 'admin',
        description: 'Make an announcement',
        examples: ['announce: Server event tonight!', 'broadcast: New rewards added!'],
        patterns: [
            /(?:announce|broadcast)[:\s]+(.+)/i
        ],
        execute: async (match, _context) => {
            const message = match[1].trim();

            return {
                success: true,
                action: 'announce',
                content: message,
                message: `I'll announce that~ 📢`
            };
        }
    },

    // ==========================================
    // HELP
    // ==========================================
    {
        name: 'jarvis_help',
        category: 'info',
        description: 'Show available Jarvis commands',
        examples: ['help', 'what can you do', 'jarvis commands'],
        patterns: [
            /(?:jarvis\s+)?(?:help|commands?|what can you do)/i,
            /show\s+(?:jarvis\s+)?commands/i
        ],
        execute: async (_match, _context) => {
            const categories = {};
            for (const cmd of adminCommands) {
                if (!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push(cmd);
            }

            let response = `**🐍 Jarvis Mode Commands**\n\n`;

            for (const [cat, cmds] of Object.entries(categories)) {
                response += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}:**\n`;
                for (const cmd of cmds.slice(0, 4)) {
                    response += `- \`${cmd.examples[0]}\`\n`;
                }
                if (cmds.length > 4) response += `  *(and ${cmds.length - 4} more...)*\n`;
                response += '\n';
            }

            response += `*Talk naturally - I'll figure out what you mean~* 🐍`;

            return { success: true, message: response };
        }
    }
];

// ============================================
// SMART INTENT DETECTION SYSTEM
// ============================================

/**
 * Detect if message is likely a command vs casual chat
 */
function isLikelyCommand(message) {
    const lower = message.toLowerCase();

    // Strong command indicators
    const commandIndicators = [
        /<@!?\d+>/, // Has user mention
        /\d+\s*(bebits?|points?)/i, // Has amount + currency
        /^(give|take|remove|set|reset|check|show|compare|bonk|shame|roast|praise)/i, // Starts with action verb
        /(bebits?|streak|stats?|mood|crown|fortune|wheel|simp)/i // Has bot-specific keywords
    ];

    for (const pattern of commandIndicators) {
        if (pattern.test(lower)) return true;
    }

    // Check for question words that might be info requests
    if (/^(who|what|how|tell me)/i.test(lower)) {
        // Only if about bot-related topics
        if (/(bebits?|streak|server|stats?|about|info|remember)/i.test(lower)) {
            return true;
        }
    }

    return false;
}

/**
 * Use AI to interpret ambiguous commands with chain-of-thought
 */
async function parseWithAI(message, context) {
    try {
        // Get conversation context for better understanding
        const prevContext = getConversationContext(context.userId);
        const contextHint = prevContext
            ? `\nPrevious command was "${prevContext.lastCommand}" about "${prevContext.subject}".`
            : '';

        const commandList = adminCommands.map(c =>
            `${c.name}: ${c.description}\n  Examples: ${c.examples.join(', ')}`
        ).join('\n\n');

        const systemPrompt = `You are Jarvis, an intent parser for Beboa the Discord bot. Your job is to understand what bebe.blu wants to do and extract the command.

AVAILABLE COMMANDS:
${commandList}

PARSING RULES:
1. Be flexible with phrasing - "yeet 50 from @user" means remove_bebits
2. "them" or "that person" refers to the most recently mentioned user
3. Numbers can be words ("give them fifty" = 50)
4. Casual phrasing is fine: "yo give @user like 100 points" = give_bebits
5. Fun commands can be implicit: "lol @user" near topics might mean shame/roast
6. If unclear, suggest clarification
${contextHint}

OUTPUT FORMAT (JSON only):
{
  "command": "command_name or null",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of interpretation",
  "params": {
    "userId": "extracted user ID or null",
    "userId2": "second user ID if applicable",
    "amount": number or null,
    "text": "any text content"
  },
  "clarification": "question to ask if confidence < 0.5"
}`;

        const result = await chatCompletion([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse this message from bebe: "${message}"` }
        ], { max_tokens: 300, temperature: 0.1 });

        if (result.success) {
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log(`[JARVIS] AI parsed: ${parsed.command} (${parsed.confidence}) - ${parsed.reasoning}`);
                    return parsed;
                }
            } catch (e) {
                console.error('[JARVIS] AI parse JSON error:', e);
            }
        }
    } catch (e) {
        console.error('[JARVIS] AI parse error:', e);
    }

    return { command: null, confidence: 0 };
}

/**
 * Try to execute command with intent-based matching
 */
async function executeByIntent(intentAnalysis, entities, message, context) {
    const { topIntent } = intentAnalysis;
    const cmd = adminCommands.find(c => c.name === topIntent);

    if (!cmd) return null;

    // Build synthetic match from entities
    const syntheticMatch = [message];

    // Command-specific entity mapping
    switch (topIntent) {
        case 'give_bebits':
        case 'remove_bebits':
        case 'bonk':
        case 'shame':
        case 'praise':
        case 'roast':
        case 'simp_check':
        case 'crown':
        case 'dethrone':
        case 'fortune':
        case 'user_info':
        case 'spin_wheel':
            if (entities.userId) {
                syntheticMatch.push(entities.userId);
                if (entities.amount) syntheticMatch.push(String(entities.amount));
            }
            break;

        case 'transfer_bebits':
        case 'compare_users':
        case 'compatibility':
            if (entities.userIds.length >= 2) {
                syntheticMatch.push(entities.userIds[0]);
                syntheticMatch.push(entities.userIds[1]);
                if (entities.amount) syntheticMatch.splice(1, 0, String(entities.amount));
            }
            break;

        case 'set_bebits':
            if (entities.userId && entities.amount !== null) {
                syntheticMatch.push(entities.userId);
                syntheticMatch.push(String(entities.amount));
            }
            break;

        case 'add_note':
            if (entities.userId && entities.text) {
                syntheticMatch.push(entities.userId);
                syntheticMatch.push(entities.text);
            }
            break;

        case 'search_memories':
            if (entities.text) {
                syntheticMatch.push(entities.text);
            }
            break;

        case 'mass_give_bebits':
            if (entities.hasEveryone && entities.amount !== null) {
                syntheticMatch.push(String(entities.amount));
            } else if (entities.userIds.length > 0 && entities.amount !== null) {
                syntheticMatch.push(message); // Keep original for user parsing
                syntheticMatch.push(String(entities.amount));
            }
            break;
    }

    // Validate we have minimum required params
    if (syntheticMatch.length < 2 && ['give_bebits', 'remove_bebits', 'bonk', 'shame'].includes(topIntent)) {
        return null; // Missing required user
    }

    try {
        console.log(`[JARVIS] Intent-matched: ${cmd.name} with entities:`, entities);
        const result = await cmd.execute(syntheticMatch, context);

        // Update conversation context
        updateConversationContext(context.userId, {
            lastCommand: cmd.name,
            subject: entities.userId,
            lastMessage: message
        });

        return { matched: true, command: cmd.name, result, method: 'intent' };
    } catch (error) {
        console.error(`[JARVIS] Intent execution failed:`, error);
        return null;
    }
}

// ============================================
// MAIN PARSING FUNCTION
// ============================================

/**
 * Parse and execute admin command from natural language
 * Uses an LLM-first approach with fallbacks:
 * 1. Check for pending confirmations
 * 2. Try LLM-powered intent parsing (primary)
 * 3. Try exact pattern matching (fallback)
 * 4. Try intent-based keyword matching (fallback)
 * 5. Check conversation context for follow-ups
 */
export async function parseAndExecuteAdminCommand(message, context) {
    if (!canExecuteAdminCommands(context.userId)) {
        return { matched: false };
    }

    message = message.trim();

    // Skip very short messages unless they're confirmations
    if (message.length < 3) {
        return { matched: false };
    }

    // ========================================
    // STAGE 1: Check for pending confirmations
    // ========================================
    if (pendingConfirmations.has(context.userId)) {
        const pending = pendingConfirmations.get(context.userId);
        if (Date.now() < pending.expires) {
            const lower = message.toLowerCase();
            if (['yes', 'y', 'yeah', 'yep', 'confirm', 'do it', 'proceed'].some(w => lower.includes(w))) {
                pendingConfirmations.delete(context.userId);
                return await pending.execute();
            } else if (['no', 'n', 'nah', 'cancel', 'stop', 'nevermind'].some(w => lower.includes(w))) {
                pendingConfirmations.delete(context.userId);
                return { matched: true, result: { success: true, message: 'Cancelled~' } };
            }
        } else {
            pendingConfirmations.delete(context.userId);
        }
    }

    // ========================================
    // STAGE 2: LLM-powered intent parsing (PRIMARY)
    // ========================================
    if (isLLMEvaluatorAvailable()) {
        const prevContext = getConversationContext(context.userId);
        const recentCommands = prevContext ? [prevContext.lastCommand] : [];

        const llmIntent = await parseJarvisIntent(message, {
            recentCommands,
            userId: context.userId
        });

        if (llmIntent && llmIntent.isCommand && llmIntent.confidence >= 0.6) {
            console.log(`[JARVIS] LLM parsed: ${llmIntent.command} (confidence: ${llmIntent.confidence})`);

            // Handle clarification needed
            if (llmIntent.clarificationNeeded) {
                return {
                    matched: true,
                    result: {
                        success: true,
                        message: llmIntent.clarificationNeeded
                    },
                    needsClarification: true
                };
            }

            // Handle confirmation for dangerous operations
            if (llmIntent.requiresConfirmation) {
                pendingConfirmations.set(context.userId, {
                    command: llmIntent.command,
                    params: llmIntent.params,
                    expires: Date.now() + CONFIRMATION_TIMEOUT,
                    execute: async () => {
                        return await executeFromLLMIntent(llmIntent, message, context);
                    }
                });
                return {
                    matched: true,
                    result: {
                        success: true,
                        message: `⚠️ This is a ${llmIntent.command.includes('remove') ? 'destructive' : 'sensitive'} operation. Are you sure? (Reply "yes" to confirm)`
                    }
                };
            }

            // Execute the command
            const result = await executeFromLLMIntent(llmIntent, message, context);
            if (result) {
                return result;
            }
        } else if (llmIntent && llmIntent.clarificationNeeded) {
            // Low confidence but has a question to ask
            return {
                matched: true,
                result: {
                    success: true,
                    message: llmIntent.clarificationNeeded
                },
                needsClarification: true
            };
        }
    }

    // ========================================
    // STAGE 3: Pattern matching (FALLBACK)
    // ========================================
    console.log('[JARVIS] LLM not available or low confidence, trying pattern matching');
    for (const cmd of adminCommands) {
        for (const pattern of cmd.patterns) {
            const match = message.match(pattern);
            if (match) {
                console.log(`[JARVIS] Pattern matched: ${cmd.name}`);
                try {
                    const result = await cmd.execute(match, context);

                    // Update context for follow-up commands
                    const userId = extractUserId(message);
                    updateConversationContext(context.userId, {
                        lastCommand: cmd.name,
                        subject: userId,
                        lastMessage: message
                    });

                    return { matched: true, command: cmd.name, result, method: 'pattern' };
                } catch (error) {
                    console.error(`[JARVIS] Command execution failed:`, error);
                    return {
                        matched: true,
                        command: cmd.name,
                        result: { success: false, message: `Oops, that didn't work: ${error.message}` }
                    };
                }
            }
        }
    }

    // ========================================
    // STAGE 4: Intent-based keyword matching (FALLBACK)
    // ========================================
    const entities = extractEntities(message);
    const intentAnalysis = analyzeIntent(message);

    if (intentAnalysis && intentAnalysis.confidence >= 0.3) {
        const intentResult = await executeByIntent(intentAnalysis, entities, message, context);
        if (intentResult) {
            return intentResult;
        }
    }

    // ========================================
    // STAGE 5: Check conversation context for follow-ups
    // ========================================
    const prevContext = getConversationContext(context.userId);
    if (prevContext && prevContext.subject) {
        // Check if this is a follow-up like "give them 50 more" or "now roast them"
        const lower = message.toLowerCase();

        if ((lower.includes('them') || lower.includes('that')) && !extractUserId(message)) {
            // Substitute previous subject
            const enhancedMessage = message.replace(/(them|that person|that one)/gi, `<@${prevContext.subject}>`);
            console.log(`[JARVIS] Context substitution: "${message}" -> "${enhancedMessage}"`);

            // Recurse with enhanced message
            return parseAndExecuteAdminCommand(enhancedMessage, context);
        }
    }

    return { matched: false };
}

/**
 * Execute a command from LLM-parsed intent
 */
async function executeFromLLMIntent(llmIntent, originalMessage, context) {
    const cmd = adminCommands.find(c => c.name === llmIntent.command);
    if (!cmd) {
        console.error(`[JARVIS] Unknown command from LLM: ${llmIntent.command}`);
        return null;
    }

    // Build synthetic match from LLM-extracted params
    const syntheticMatch = [originalMessage];
    const params = llmIntent.params || {};

    // Map params based on command type
    switch (llmIntent.command) {
        case 'give_bebits':
        case 'remove_bebits':
            if (params.targetUserId) syntheticMatch.push(params.targetUserId);
            if (params.amount !== null) syntheticMatch.push(String(params.amount));
            break;

        case 'set_bebits':
            if (params.targetUserId) syntheticMatch.push(params.targetUserId);
            if (params.amount !== null) syntheticMatch.push(String(params.amount));
            break;

        case 'transfer_bebits':
            if (params.amount !== null) syntheticMatch.push(String(params.amount));
            if (params.fromUserId) syntheticMatch.push(params.fromUserId);
            if (params.toUserId) syntheticMatch.push(params.toUserId);
            break;

        case 'compare_users':
        case 'compatibility':
            if (params.userId1) syntheticMatch.push(params.userId1);
            if (params.userId2) syntheticMatch.push(params.userId2);
            break;

        case 'user_info':
        case 'reset_streak':
        case 'bonk':
        case 'shame':
        case 'praise':
        case 'roast':
        case 'simp_check':
        case 'crown':
        case 'dethrone':
        case 'fortune':
        case 'spin_wheel':
            if (params.targetUserId) syntheticMatch.push(params.targetUserId);
            break;

        case 'set_mood':
            if (params.moodName) syntheticMatch.push(params.moodName);
            break;

        case 'add_note':
            if (params.targetUserId) syntheticMatch.push(params.targetUserId);
            if (params.text) syntheticMatch.push(params.text);
            break;

        case 'search_memories':
            if (params.text) syntheticMatch.push(params.text);
            break;

        case 'announce':
            if (params.text) syntheticMatch.push(params.text);
            break;

        case 'mass_give_bebits':
            if (params.amount !== null) syntheticMatch.push(String(params.amount));
            break;

        default:
            // For commands without specific params, just use original message
            break;
    }

    try {
        const result = await cmd.execute(syntheticMatch, context);

        // Update conversation context
        updateConversationContext(context.userId, {
            lastCommand: cmd.name,
            subject: params.targetUserId || params.userId1,
            lastMessage: originalMessage
        });

        return {
            matched: true,
            command: cmd.name,
            result,
            method: 'llm',
            reasoning: llmIntent.reasoning
        };
    } catch (error) {
        console.error(`[JARVIS] LLM-assisted execution failed:`, error);
        return {
            matched: true,
            command: cmd.name,
            result: { success: false, message: `Oops, that didn't work: ${error.message}` }
        };
    }
}

/**
 * Get list of available admin commands organized by category
 */
export function getAvailableAdminCommands() {
    const byCategory = {};
    for (const cmd of adminCommands) {
        if (!byCategory[cmd.category]) byCategory[cmd.category] = [];
        byCategory[cmd.category].push({
            name: cmd.name,
            description: cmd.description,
            examples: cmd.examples
        });
    }
    return byCategory;
}

/**
 * Get flat list of command names and descriptions
 */
export function getAdminCommandList() {
    return adminCommands.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        example: cmd.examples[0]
    }));
}

export default {
    canExecuteAdminCommands,
    grantAdminPermission,
    revokeAdminPermission,
    parseAndExecuteAdminCommand,
    getAvailableAdminCommands,
    getAdminCommandList
};
