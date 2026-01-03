/**
 * Migration 003: Add chat_history table
 * Creates table for persistent chat history across bot restarts
 */

export const name = '003_add_chat_history';

export function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT NOT NULL,
            content TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chat_history_created ON chat_history(created_at DESC);
    `);
}

export default { name, up };
