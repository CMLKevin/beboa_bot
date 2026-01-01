import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', 'data');
const dbPath = join(dataDir, 'beboa.db');

// Ensure data directory exists
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('[DATABASE] Created data directory');
}

// Initialize database connection
const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Better performance for concurrent reads

console.log('[DATABASE] Connected to', dbPath);

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discord_id TEXT PRIMARY KEY,
        bebits INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        last_checkin TEXT,
        total_checkins INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS redemptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        reward_name TEXT NOT NULL,
        cost INTEGER NOT NULL,
        redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discord_id) REFERENCES users(discord_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_bebits ON users(bebits DESC);
    CREATE INDEX IF NOT EXISTS idx_users_streak ON users(current_streak DESC);
    CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(discord_id);
`);

// Add beboa_notes column if it doesn't exist (for existing databases)
try {
    db.exec(`ALTER TABLE users ADD COLUMN beboa_notes TEXT DEFAULT NULL`);
    console.log('[DATABASE] Added beboa_notes column');
} catch (e) {
    // Column already exists, ignore error
}

console.log('[DATABASE] Schema initialized');

// Prepared statements for better performance
const statements = {
    getUser: db.prepare(`
        SELECT * FROM users WHERE discord_id = ?
    `),

    createUser: db.prepare(`
        INSERT INTO users (discord_id, bebits, current_streak, last_checkin, total_checkins)
        VALUES (?, 0, 0, NULL, 0)
    `),

    updateUser: db.prepare(`
        UPDATE users
        SET bebits = ?, current_streak = ?, last_checkin = ?, total_checkins = ?
        WHERE discord_id = ?
    `),

    updateBebits: db.prepare(`
        UPDATE users SET bebits = ? WHERE discord_id = ?
    `),

    updateStreak: db.prepare(`
        UPDATE users SET current_streak = ?, last_checkin = ? WHERE discord_id = ?
    `),

    getTopUsers: db.prepare(`
        SELECT discord_id, bebits, current_streak
        FROM users
        ORDER BY bebits DESC
        LIMIT ?
    `),

    getUserRank: db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE bebits > (SELECT bebits FROM users WHERE discord_id = ?)
    `),

    getTotalUsers: db.prepare(`
        SELECT COUNT(*) as count FROM users
    `),

    getTotalBebits: db.prepare(`
        SELECT COALESCE(SUM(bebits), 0) as total FROM users
    `),

    getTopEarner: db.prepare(`
        SELECT discord_id, bebits FROM users ORDER BY bebits DESC LIMIT 1
    `),

    getLongestStreak: db.prepare(`
        SELECT discord_id, current_streak FROM users ORDER BY current_streak DESC LIMIT 1
    `),

    addRedemption: db.prepare(`
        INSERT INTO redemptions (discord_id, reward_id, reward_name, cost)
        VALUES (?, ?, ?, ?)
    `),

    getTotalRedemptions: db.prepare(`
        SELECT COUNT(*) as count FROM redemptions
    `),

    getRedemptionBreakdown: db.prepare(`
        SELECT reward_id, reward_name, COUNT(*) as count
        FROM redemptions
        GROUP BY reward_id
        ORDER BY count DESC
    `),

    getUserNotes: db.prepare(`
        SELECT beboa_notes FROM users WHERE discord_id = ?
    `),

    setUserNotes: db.prepare(`
        UPDATE users SET beboa_notes = ? WHERE discord_id = ?
    `),

    getUsersByIds: db.prepare(`
        SELECT discord_id, bebits, current_streak, beboa_notes FROM users WHERE discord_id IN (SELECT value FROM json_each(?))
    `)
};

/**
 * Get user by Discord ID, creating if not exists
 * @param {string} discordId - Discord user ID
 * @returns {Object} User object with bebits, streak, etc.
 */
export function getUser(discordId) {
    let user = statements.getUser.get(discordId);

    if (!user) {
        statements.createUser.run(discordId);
        user = statements.getUser.get(discordId);
        console.log(`[DATABASE] Created new user: ${discordId}`);
    }

    return user;
}

/**
 * Update user's check-in data
 * @param {string} discordId - Discord user ID
 * @param {Object} data - Data to update
 * @param {number} data.bebits - New bebits balance
 * @param {number} data.current_streak - New streak count
 * @param {string} data.last_checkin - ISO8601 timestamp
 * @param {number} data.total_checkins - Total check-in count
 */
export function updateUser(discordId, { bebits, current_streak, last_checkin, total_checkins }) {
    statements.updateUser.run(bebits, current_streak, last_checkin, total_checkins, discordId);
    console.log(`[DATABASE] Updated user ${discordId}: bebits=${bebits}, streak=${current_streak}`);
}

/**
 * Update only user's bebits balance
 * @param {string} discordId - Discord user ID
 * @param {number} bebits - New bebits balance
 */
export function updateBebits(discordId, bebits) {
    statements.updateBebits.run(bebits, discordId);
    console.log(`[DATABASE] Updated bebits for ${discordId}: ${bebits}`);
}

/**
 * Reset user's streak
 * @param {string} discordId - Discord user ID
 */
export function resetStreak(discordId) {
    statements.updateStreak.run(0, null, discordId);
    console.log(`[DATABASE] Reset streak for ${discordId}`);
}

/**
 * Get top users by bebits
 * @param {number} limit - Number of users to return (default 10)
 * @returns {Array} Array of user objects
 */
export function getTopUsers(limit = 10) {
    return statements.getTopUsers.all(limit);
}

/**
 * Get user's rank position (1-indexed)
 * @param {string} discordId - Discord user ID
 * @returns {number} User's rank
 */
export function getUserRank(discordId) {
    const result = statements.getUserRank.get(discordId);
    return result ? result.rank : 0;
}

/**
 * Process a reward redemption atomically
 * @param {string} discordId - Discord user ID
 * @param {string} rewardId - Reward identifier
 * @param {string} rewardName - Reward display name
 * @param {number} cost - Bebit cost
 * @returns {Object} Result with success status and new balance
 */
export const processRedemption = db.transaction((discordId, rewardId, rewardName, cost) => {
    const user = statements.getUser.get(discordId);

    if (!user || user.bebits < cost) {
        return { success: false, reason: 'insufficient_bebits', balance: user?.bebits || 0 };
    }

    const newBalance = user.bebits - cost;
    statements.updateBebits.run(newBalance, discordId);
    statements.addRedemption.run(discordId, rewardId, rewardName, cost);

    console.log(`[DATABASE] Redemption: ${discordId} redeemed ${rewardName} for ${cost} bebits. New balance: ${newBalance}`);

    return { success: true, newBalance };
});

/**
 * Get aggregate server statistics
 * @returns {Object} Statistics object
 */
export function getStats() {
    const totalUsers = statements.getTotalUsers.get().count;
    const totalBebits = statements.getTotalBebits.get().total;
    const totalRedemptions = statements.getTotalRedemptions.get().count;
    const topEarner = statements.getTopEarner.get();
    const longestStreak = statements.getLongestStreak.get();
    const redemptionBreakdown = statements.getRedemptionBreakdown.all();

    return {
        totalUsers,
        totalBebits,
        totalRedemptions,
        topEarner,
        longestStreak,
        redemptionBreakdown
    };
}

/**
 * Get Beboa's notes about a user
 * @param {string} discordId - Discord user ID
 * @returns {string|null} Notes about the user, or null if none
 */
export function getUserNotes(discordId) {
    const result = statements.getUserNotes.get(discordId);
    return result?.beboa_notes || null;
}

/**
 * Set Beboa's notes about a user
 * @param {string} discordId - Discord user ID
 * @param {string|null} notes - Notes to set (null to clear)
 */
export function setUserNotes(discordId, notes) {
    // Ensure user exists first
    getUser(discordId);
    statements.setUserNotes.run(notes, discordId);
    console.log(`[DATABASE] Updated notes for ${discordId}: ${notes ? notes.substring(0, 50) + '...' : 'cleared'}`);
}

/**
 * Append to Beboa's notes about a user
 * @param {string} discordId - Discord user ID
 * @param {string} newNote - Note to append
 * @param {number} maxLength - Maximum total notes length (default 1000)
 */
export function appendUserNotes(discordId, newNote, maxLength = 1000) {
    const currentNotes = getUserNotes(discordId) || '';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const noteWithTimestamp = `[${timestamp}] ${newNote}`;

    let updatedNotes = currentNotes
        ? `${currentNotes}\n${noteWithTimestamp}`
        : noteWithTimestamp;

    // Trim to max length, keeping most recent notes
    if (updatedNotes.length > maxLength) {
        const lines = updatedNotes.split('\n');
        while (updatedNotes.length > maxLength && lines.length > 1) {
            lines.shift(); // Remove oldest note
            updatedNotes = lines.join('\n');
        }
    }

    setUserNotes(discordId, updatedNotes);
}

/**
 * Get data for multiple users by their IDs (for mentioned users context)
 * @param {string[]} discordIds - Array of Discord user IDs
 * @returns {Array} Array of user objects with notes
 */
export function getMentionedUsersData(discordIds) {
    if (!discordIds || discordIds.length === 0) return [];

    try {
        return statements.getUsersByIds.all(JSON.stringify(discordIds));
    } catch (e) {
        // Fallback for older SQLite versions without json_each
        return discordIds.map(id => {
            const user = statements.getUser.get(id);
            if (user) {
                return {
                    discord_id: user.discord_id,
                    bebits: user.bebits,
                    current_streak: user.current_streak,
                    beboa_notes: user.beboa_notes
                };
            }
            return null;
        }).filter(Boolean);
    }
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase() {
    db.close();
    console.log('[DATABASE] Connection closed');
}

export default db;
