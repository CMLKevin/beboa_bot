/**
 * Migration: Add Memory System Tables
 */

export const name = '004_add_memory_system';

export function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS semantic_memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            memory_type TEXT NOT NULL,
            content TEXT NOT NULL,
            importance REAL DEFAULT 0.5,
            embedding_id INTEGER,
            source_type TEXT DEFAULT 'conversation',
            source_id TEXT,
            metadata TEXT,
            access_count INTEGER DEFAULT 0,
            last_accessed_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (embedding_id) REFERENCES memory_embeddings(id)
        );

        CREATE TABLE IF NOT EXISTS memory_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            embedding TEXT NOT NULL,
            model TEXT DEFAULT 'text-embedding-3-small',
            dimensions INTEGER DEFAULT 1536,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tool_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            input_data TEXT,
            output_data TEXT,
            success INTEGER DEFAULT 1,
            error_message TEXT,
            execution_time_ms INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS personality_evolution (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trait_name TEXT NOT NULL,
            trait_value REAL DEFAULT 0.5,
            trigger_event TEXT,
            previous_value REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS user_interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            interaction_type TEXT NOT NULL,
            content TEXT,
            sentiment REAL,
            topics TEXT,
            extracted_facts TEXT,
            channel_id TEXT,
            message_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS admin_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL UNIQUE,
            permission_level INTEGER DEFAULT 0,
            can_execute_admin INTEGER DEFAULT 0,
            granted_by TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_memories_user ON semantic_memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_memories_type ON semantic_memories(memory_type);
        CREATE INDEX IF NOT EXISTS idx_memories_importance ON semantic_memories(importance DESC);
        CREATE INDEX IF NOT EXISTS idx_tool_usage_user ON tool_usage(user_id);
        CREATE INDEX IF NOT EXISTS idx_tool_usage_tool ON tool_usage(tool_name);
        CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_channel ON user_interactions(channel_id);
    `);
    console.log('[MIGRATION] Created memory system tables');
}

export function down(db) {
    db.exec(`
        DROP TABLE IF EXISTS admin_permissions;
        DROP TABLE IF EXISTS user_interactions;
        DROP TABLE IF EXISTS personality_evolution;
        DROP TABLE IF EXISTS tool_usage;
        DROP TABLE IF EXISTS memory_embeddings;
        DROP TABLE IF EXISTS semantic_memories;
    `);
}

export default { name, up, down };
