/**
 * Message Ingestion Service
 *
 * Captures and stores ALL server messages (not just @mentions) for
 * server-wide semantic memory. Uses importance scoring to determine
 * which messages should be embedded.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'data', 'beboa.db');

// Database connection (separate from main to avoid circular deps)
let db = null;
let statements = null;

// Track last message time per channel for importance scoring
const channelLastMessage = new Map();

/**
 * Initialize the database connection and prepared statements
 */
function initDatabase() {
    if (db) return;

    try {
        db = new Database(dbPath);

        statements = {
            insertMessage: db.prepare(`
                INSERT OR IGNORE INTO server_messages
                (message_id, channel_id, guild_id, author_id, author_name,
                 content, content_length, has_attachments, reply_to_id,
                 importance_score, embedding_status, discord_created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),

            updateEmbeddingStatus: db.prepare(`
                UPDATE server_messages SET embedding_status = ? WHERE message_id = ?
            `),

            getMessageById: db.prepare(`
                SELECT * FROM server_messages WHERE message_id = ?
            `),

            getRecentMessages: db.prepare(`
                SELECT * FROM server_messages
                WHERE channel_id = ? AND discord_created_at > datetime('now', ?)
                ORDER BY discord_created_at DESC
                LIMIT ?
            `),

            getMessagesByChannel: db.prepare(`
                SELECT * FROM server_messages
                WHERE channel_id = ?
                ORDER BY discord_created_at DESC
                LIMIT ?
            `),

            getMessagesByAuthor: db.prepare(`
                SELECT * FROM server_messages
                WHERE author_id = ?
                ORDER BY discord_created_at DESC
                LIMIT ?
            `),

            getPendingEmbeddings: db.prepare(`
                SELECT * FROM server_messages
                WHERE embedding_status = 'pending'
                AND importance_score >= ?
                ORDER BY importance_score DESC, discord_created_at DESC
                LIMIT ?
            `),

            getMessageCount: db.prepare(`
                SELECT COUNT(*) as count FROM server_messages WHERE guild_id = ?
            `),

            queueForEmbedding: db.prepare(`
                INSERT OR IGNORE INTO embedding_queue (message_id, priority, status)
                VALUES (?, ?, 'pending')
            `),

            updateChannelMetadata: db.prepare(`
                INSERT INTO channel_metadata (channel_id, guild_id, channel_name, total_messages, last_message_at, updated_at)
                VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
                ON CONFLICT(channel_id) DO UPDATE SET
                    total_messages = total_messages + 1,
                    last_message_at = datetime('now'),
                    updated_at = datetime('now')
            `)
        };

        console.log('[MESSAGE_INGESTION] Database initialized');
    } catch (error) {
        console.error('[MESSAGE_INGESTION] Database init error:', error.message);
    }
}

// Topic keywords that increase importance
const TOPIC_KEYWORDS = [
    'project', 'idea', 'plan', 'decision', 'announce', 'update',
    'problem', 'solution', 'help', 'question', 'opinion', 'think',
    'remember', 'important', 'meeting', 'event', 'date', 'deadline',
    'agree', 'disagree', 'proposal', 'suggest', 'recommend', 'vote',
    'finally', 'actually', 'honestly', 'seriously', 'literally'
];

// Question patterns
const QUESTION_PATTERN = /\b(what|why|how|when|where|who|which|would|could|should|can|is there|are there|do you|does anyone|has anyone|will|shall)\b|\?$/i;

// Emotional intensity patterns
const EMOTIONAL_PATTERN = /(!{2,}|[A-Z]{3,}|\b(love|hate|amazing|terrible|excited|angry|sad|happy|awesome|awful|incredible|horrible|best|worst)\b)/i;

/**
 * Calculate importance score for a message (0.0 to 1.0)
 * Higher scores indicate messages more worth embedding
 */
export function calculateImportanceScore(message, channelState = {}) {
    let score = 0.0;
    const content = message.content?.toLowerCase() || '';
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // 1. Content Length (0.15 max) - 10-50 words is optimal
    if (wordCount >= 10 && wordCount <= 50) {
        score += 0.15;
    } else if (wordCount >= 5 && wordCount < 10) {
        score += 0.08;
    } else if (wordCount >= 3 && wordCount < 5) {
        score += 0.03;
    }
    // Very short messages (<3 words) get 0

    // 2. Question Detection (0.20 max)
    if (QUESTION_PATTERN.test(content)) {
        score += 0.20;
    }

    // 3. Named Entities (0.15 max) - mentions of users, roles, channels
    const mentionCount = (message.mentions?.users?.size || 0) +
                         (message.mentions?.roles?.size || 0) +
                         (message.mentions?.channels?.size || 0);
    score += Math.min(0.15, mentionCount * 0.05);

    // 4. Topic Keywords (0.15 max)
    const topicMatches = TOPIC_KEYWORDS.filter(kw => content.includes(kw)).length;
    score += Math.min(0.15, topicMatches * 0.03);

    // 5. Emotional Intensity (0.10 max)
    if (EMOTIONAL_PATTERN.test(message.content || '')) {
        score += 0.10;
    }

    // 6. First Message After Quiet Period (0.10 max)
    const lastMessageTime = channelState.lastMessageTime || 0;
    const timeSinceLastMessage = Date.now() - lastMessageTime;
    if (timeSinceLastMessage > 30 * 60 * 1000) { // 30 minutes
        score += 0.10;
    } else if (timeSinceLastMessage > 10 * 60 * 1000) { // 10 minutes
        score += 0.05;
    }

    // 7. Media Attachments (0.05 max)
    if ((message.attachments?.size || 0) > 0) {
        score += 0.05;
    }

    // 8. Reply to another message (0.05 bonus) - indicates conversation
    if (message.reference?.messageId) {
        score += 0.05;
    }

    return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Check if a message should be embedded based on score and config
 */
export function shouldEmbed(score, threshold = null) {
    const importanceThreshold = threshold ?? (config.IMPORTANCE_THRESHOLD || 0.3);
    return score >= importanceThreshold;
}

/**
 * Ingest a Discord message into server memory
 * This is called for EVERY message in the server (non-blocking)
 *
 * @param {Message} message - Discord.js Message object
 * @returns {Promise<Object>} Result with messageId, importance, willEmbed
 */
export async function ingestMessage(message) {
    // Skip if server memory is disabled
    if (!config.SERVER_MEMORY_ENABLED) {
        return { skipped: true, reason: 'disabled' };
    }

    // Skip bot messages
    if (message.author?.bot) {
        return { skipped: true, reason: 'bot' };
    }

    // Skip empty messages
    if (!message.content || message.content.trim().length === 0) {
        return { skipped: true, reason: 'empty' };
    }

    // Skip DMs (no guild)
    if (!message.guild) {
        return { skipped: true, reason: 'dm' };
    }

    // Check if channel is excluded
    const excludedChannels = config.SERVER_MEMORY_EXCLUDED_CHANNELS || [];
    if (excludedChannels.includes(message.channel.id)) {
        return { skipped: true, reason: 'excluded_channel' };
    }

    // Check if we're limiting to specific channels
    const allowedChannels = config.SERVER_MEMORY_CHANNELS || [];
    if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) {
        return { skipped: true, reason: 'not_in_allowlist' };
    }

    // Initialize database if needed
    initDatabase();
    if (!statements) {
        return { skipped: true, reason: 'db_not_ready' };
    }

    try {
        // Get channel state for importance scoring
        const channelState = {
            lastMessageTime: channelLastMessage.get(message.channel.id) || 0
        };

        // Calculate importance score
        const importanceScore = calculateImportanceScore(message, channelState);

        // Update channel last message time
        channelLastMessage.set(message.channel.id, Date.now());

        // Determine embedding status
        const willEmbed = shouldEmbed(importanceScore);
        const embeddingStatus = willEmbed ? 'pending' : 'skipped';

        // Store the message
        const result = statements.insertMessage.run(
            message.id,
            message.channel.id,
            message.guild.id,
            message.author.id,
            message.author.displayName || message.author.username,
            message.content,
            message.content.length,
            message.attachments?.size > 0 ? 1 : 0,
            message.reference?.messageId || null,
            importanceScore,
            embeddingStatus,
            message.createdAt.toISOString()
        );

        // Update channel metadata
        try {
            statements.updateChannelMetadata.run(
                message.channel.id,
                message.guild.id,
                message.channel.name || 'unknown'
            );
        } catch (metaError) {
            // Non-critical, just log
            console.error('[MESSAGE_INGESTION] Metadata update error:', metaError.message);
        }

        // Queue for embedding if important
        if (willEmbed && result.changes > 0) {
            const storedMessage = statements.getMessageById.get(message.id);
            if (storedMessage) {
                const priority = Math.round(importanceScore * 100); // 0-100
                statements.queueForEmbedding.run(storedMessage.id, priority);
            }
        }

        // Log high-importance messages
        if (importanceScore >= 0.5) {
            console.log(`[MESSAGE_INGESTION] High importance (${importanceScore.toFixed(2)}): "${message.content.substring(0, 50)}..."`);
        }

        return {
            success: true,
            messageId: message.id,
            importanceScore,
            willEmbed,
            stored: result.changes > 0
        };
    } catch (error) {
        // Don't throw - ingestion should not block normal operation
        console.error('[MESSAGE_INGESTION] Error:', error.message);
        return { skipped: true, reason: 'error', error: error.message };
    }
}

/**
 * Get recent messages from a channel
 */
export function getRecentChannelMessages(channelId, limit = 20, timeWindow = '-1 hour') {
    initDatabase();
    if (!statements) return [];

    try {
        return statements.getRecentMessages.all(channelId, timeWindow, limit);
    } catch (error) {
        console.error('[MESSAGE_INGESTION] getRecentChannelMessages error:', error.message);
        return [];
    }
}

/**
 * Get messages by author
 */
export function getMessagesByAuthor(authorId, limit = 50) {
    initDatabase();
    if (!statements) return [];

    try {
        return statements.getMessagesByAuthor.all(authorId, limit);
    } catch (error) {
        console.error('[MESSAGE_INGESTION] getMessagesByAuthor error:', error.message);
        return [];
    }
}

/**
 * Get messages pending embedding
 */
export function getPendingEmbeddings(threshold = 0.3, limit = 50) {
    initDatabase();
    if (!statements) return [];

    try {
        return statements.getPendingEmbeddings.all(threshold, limit);
    } catch (error) {
        console.error('[MESSAGE_INGESTION] getPendingEmbeddings error:', error.message);
        return [];
    }
}

/**
 * Update embedding status for a message
 */
export function updateEmbeddingStatus(messageId, status) {
    initDatabase();
    if (!statements) return false;

    try {
        statements.updateEmbeddingStatus.run(status, messageId);
        return true;
    } catch (error) {
        console.error('[MESSAGE_INGESTION] updateEmbeddingStatus error:', error.message);
        return false;
    }
}

/**
 * Get message count for a guild
 */
export function getMessageCount(guildId) {
    initDatabase();
    if (!statements) return 0;

    try {
        const result = statements.getMessageCount.get(guildId);
        return result?.count || 0;
    } catch (error) {
        console.error('[MESSAGE_INGESTION] getMessageCount error:', error.message);
        return 0;
    }
}

/**
 * Check if server memory is available and ready
 */
export function isAvailable() {
    return config.SERVER_MEMORY_ENABLED && db !== null;
}

export default {
    ingestMessage,
    calculateImportanceScore,
    shouldEmbed,
    getRecentChannelMessages,
    getMessagesByAuthor,
    getPendingEmbeddings,
    updateEmbeddingStatus,
    getMessageCount,
    isAvailable
};
