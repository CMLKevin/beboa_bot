/**
 * Migration: Add Personality Evolution System Tables
 *
 * Creates tables for:
 * - personality_state: Current personality trait values and mood
 * - user_relationships: Per-user relationship data
 * - mood_history: Log of mood changes over time
 */

export const name = '005_add_personality_system';

export function up(db) {
    // Current personality state (single row)
    db.exec(`
        CREATE TABLE IF NOT EXISTS personality_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            traits TEXT NOT NULL DEFAULT '{}',
            current_mood TEXT NOT NULL DEFAULT 'neutral',
            mood_started_at TEXT DEFAULT (datetime('now')),
            mood_triggers TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Insert initial row
        INSERT OR IGNORE INTO personality_state (id, traits, current_mood, mood_triggers)
        VALUES (1, '{}', 'neutral', '[]');
    `);

    // User relationships - tracks Beboa's relationship with each user
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_relationships (
            user_id TEXT PRIMARY KEY,
            affection REAL DEFAULT 0.3,
            trust REAL DEFAULT 0.3,
            familiarity REAL DEFAULT 0.1,
            rivalry REAL DEFAULT 0,
            inside_jokes TEXT DEFAULT '[]',
            nickname TEXT,
            last_interaction TEXT DEFAULT (datetime('now')),
            interaction_count INTEGER DEFAULT 0,
            relationship_stage TEXT DEFAULT 'stranger',
            notes TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_relationships_affection ON user_relationships(affection DESC);
        CREATE INDEX IF NOT EXISTS idx_relationships_familiarity ON user_relationships(familiarity DESC);
    `);

    // Mood history - tracks mood changes over time
    db.exec(`
        CREATE TABLE IF NOT EXISTS mood_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mood_name TEXT NOT NULL,
            trigger_reason TEXT,
            duration_minutes INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_mood_history_time ON mood_history(created_at DESC);
    `);

    console.log('[MIGRATION] Created personality system tables');
}

export function down(db) {
    db.exec(`
        DROP TABLE IF EXISTS mood_history;
        DROP TABLE IF EXISTS user_relationships;
        DROP TABLE IF EXISTS personality_state;
    `);
}

export default { name, up, down };
