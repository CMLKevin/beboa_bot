/**
 * Migration: Add Server-Wide Memory System
 *
 * Enables Beboa to have semantic memory of ALL messages across ALL channels,
 * not just @mentions. Supports ambient awareness, deep knowledge recall,
 * and topic tracking.
 */

export const name = '006_add_server_memory';

export function up(db) {
    db.exec(`
        -- Raw storage for ALL server messages (not just mentions)
        CREATE TABLE IF NOT EXISTS server_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE NOT NULL,
            channel_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            author_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            content_length INTEGER NOT NULL,
            has_attachments INTEGER DEFAULT 0,
            reply_to_id TEXT,
            importance_score REAL DEFAULT 0.0,
            embedding_status TEXT DEFAULT 'pending',
            topic_ids TEXT,
            discord_created_at TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Indexes for server_messages
        CREATE INDEX IF NOT EXISTS idx_sm_channel ON server_messages(channel_id, discord_created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sm_author ON server_messages(author_id);
        CREATE INDEX IF NOT EXISTS idx_sm_time ON server_messages(discord_created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sm_status ON server_messages(embedding_status);
        CREATE INDEX IF NOT EXISTS idx_sm_importance ON server_messages(importance_score DESC);
        CREATE INDEX IF NOT EXISTS idx_sm_guild ON server_messages(guild_id);

        -- Embeddings for important server messages (separate from user memory embeddings)
        CREATE TABLE IF NOT EXISTS server_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER,
            summary_id INTEGER,
            embedding BLOB NOT NULL,
            source_text TEXT NOT NULL,
            source_type TEXT DEFAULT 'message',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (message_id) REFERENCES server_messages(id) ON DELETE CASCADE,
            FOREIGN KEY (summary_id) REFERENCES channel_summaries(id) ON DELETE CASCADE
        );

        -- Indexes for server_embeddings
        CREATE INDEX IF NOT EXISTS idx_se_message ON server_embeddings(message_id);
        CREATE INDEX IF NOT EXISTS idx_se_summary ON server_embeddings(summary_id);
        CREATE INDEX IF NOT EXISTS idx_se_type ON server_embeddings(source_type);

        -- Periodic channel summaries (hourly, daily, weekly)
        CREATE TABLE IF NOT EXISTS channel_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT NOT NULL,
            channel_name TEXT,
            guild_id TEXT NOT NULL,
            period_type TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            summary TEXT NOT NULL,
            key_topics TEXT,
            key_participants TEXT,
            message_count INTEGER NOT NULL,
            embedding_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(channel_id, period_type, period_start)
        );

        -- Indexes for channel_summaries
        CREATE INDEX IF NOT EXISTS idx_cs_channel ON channel_summaries(channel_id, period_start DESC);
        CREATE INDEX IF NOT EXISTS idx_cs_guild ON channel_summaries(guild_id);
        CREATE INDEX IF NOT EXISTS idx_cs_period ON channel_summaries(period_type, period_start DESC);

        -- Active topics being tracked across the server
        CREATE TABLE IF NOT EXISTS active_topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            topic_name TEXT NOT NULL,
            description TEXT,
            keywords TEXT,
            first_seen_at TEXT DEFAULT (datetime('now')),
            last_seen_at TEXT DEFAULT (datetime('now')),
            mention_count INTEGER DEFAULT 1,
            channel_mentions TEXT,
            status TEXT DEFAULT 'active',
            embedding_id INTEGER
        );

        -- Indexes for active_topics
        CREATE INDEX IF NOT EXISTS idx_at_guild ON active_topics(guild_id);
        CREATE INDEX IF NOT EXISTS idx_at_status ON active_topics(status, last_seen_at DESC);
        CREATE INDEX IF NOT EXISTS idx_at_name ON active_topics(topic_name);

        -- Embedding queue for background processing
        CREATE TABLE IF NOT EXISTS embedding_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            priority INTEGER DEFAULT 0,
            retry_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            processed_at TEXT,
            FOREIGN KEY (message_id) REFERENCES server_messages(id) ON DELETE CASCADE
        );

        -- Indexes for embedding_queue
        CREATE INDEX IF NOT EXISTS idx_eq_status ON embedding_queue(status, priority DESC, created_at);

        -- Channel metadata cache
        CREATE TABLE IF NOT EXISTS channel_metadata (
            channel_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            channel_name TEXT NOT NULL,
            channel_type TEXT,
            parent_id TEXT,
            total_messages INTEGER DEFAULT 0,
            last_message_at TEXT,
            track_messages INTEGER DEFAULT 1,
            embed_messages INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    `);
    console.log('[MIGRATION] Created server-wide memory system tables');
}

export function down(db) {
    db.exec(`
        DROP TABLE IF EXISTS channel_metadata;
        DROP TABLE IF EXISTS embedding_queue;
        DROP TABLE IF EXISTS active_topics;
        DROP TABLE IF EXISTS channel_summaries;
        DROP TABLE IF EXISTS server_embeddings;
        DROP TABLE IF EXISTS server_messages;
    `);
}

export default { name, up, down };
