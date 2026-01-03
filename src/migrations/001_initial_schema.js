/**
 * Migration 001: Initial Schema
 * Creates the base tables for users, redemptions
 */

export const name = '001_initial_schema';

export function up(db) {
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
}

export default { name, up };
