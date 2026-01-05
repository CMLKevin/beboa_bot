/**
 * Server Memory Retrieval Service
 *
 * Provides retrieval and context building for server-wide semantic memory.
 * Supports multiple retrieval modes: ambient, deep knowledge, and topic tracking.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { generateEmbedding, cosineSimilarity, isEmbeddingAvailable } from './embedding.js';
import { bufferToEmbedding } from './embeddingQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'data', 'beboa.db');

// Retrieval modes
export const RetrievalMode = {
    AMBIENT: 'ambient',       // Recent activity awareness
    DEEP: 'deep',             // Specific quotes and details
    TOPIC_TRACK: 'topic_track' // Ongoing discussions
};

// Database connection
let db = null;
let statements = null;

// Cache for embeddings (to avoid reloading from DB)
const embeddingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let lastCacheRefresh = 0;

/**
 * Initialize database connection
 */
function initDatabase() {
    if (db) return;

    try {
        db = new Database(dbPath);

        statements = {
            // Get recent messages from a channel (for ambient awareness)
            getRecentChannelMessages: db.prepare(`
                SELECT sm.*, se.embedding
                FROM server_messages sm
                LEFT JOIN server_embeddings se ON se.message_id = sm.id
                WHERE sm.channel_id = ?
                AND sm.discord_created_at > datetime('now', ?)
                ORDER BY sm.discord_created_at DESC
                LIMIT ?
            `),

            // Get recent messages across all channels
            getRecentGuildMessages: db.prepare(`
                SELECT sm.*, se.embedding
                FROM server_messages sm
                LEFT JOIN server_embeddings se ON se.message_id = sm.id
                WHERE sm.guild_id = ?
                AND sm.discord_created_at > datetime('now', ?)
                ORDER BY sm.discord_created_at DESC
                LIMIT ?
            `),

            // Get messages with embeddings for semantic search
            getEmbeddedMessages: db.prepare(`
                SELECT sm.id, sm.message_id, sm.content, sm.author_name, sm.channel_id,
                       sm.importance_score, sm.discord_created_at, se.embedding
                FROM server_messages sm
                JOIN server_embeddings se ON se.message_id = sm.id
                WHERE sm.guild_id = ?
                ORDER BY sm.discord_created_at DESC
                LIMIT ?
            `),

            // Get active topics
            getActiveTopics: db.prepare(`
                SELECT * FROM active_topics
                WHERE guild_id = ? AND status = 'active'
                ORDER BY last_seen_at DESC
                LIMIT ?
            `),

            // Get channel summaries
            getChannelSummaries: db.prepare(`
                SELECT * FROM channel_summaries
                WHERE guild_id = ?
                AND period_start > datetime('now', ?)
                ORDER BY period_start DESC
                LIMIT ?
            `),

            // Get messages by author (for context about specific users)
            getMessagesByAuthor: db.prepare(`
                SELECT sm.*, se.embedding
                FROM server_messages sm
                LEFT JOIN server_embeddings se ON se.message_id = sm.id
                WHERE sm.author_id = ?
                AND sm.guild_id = ?
                ORDER BY sm.discord_created_at DESC
                LIMIT ?
            `),

            // Get channel metadata
            getChannelMetadata: db.prepare(`
                SELECT * FROM channel_metadata WHERE channel_id = ?
            `),

            // Get message count
            getMessageCount: db.prepare(`
                SELECT COUNT(*) as count FROM server_messages WHERE guild_id = ?
            `)
        };

        console.log('[SERVER_MEMORY] Database initialized');
    } catch (error) {
        console.error('[SERVER_MEMORY] Database init error:', error.message);
    }
}

/**
 * Refresh embedding cache from database
 */
async function refreshEmbeddingCache(guildId, limit = 500) {
    const now = Date.now();
    if (now - lastCacheRefresh < CACHE_TTL) {
        return;
    }

    initDatabase();
    if (!statements) return;

    try {
        const messages = statements.getEmbeddedMessages.all(guildId, limit);

        embeddingCache.clear();
        for (const msg of messages) {
            if (msg.embedding) {
                embeddingCache.set(msg.id, {
                    ...msg,
                    embedding: bufferToEmbedding(msg.embedding)
                });
            }
        }

        lastCacheRefresh = now;
        console.log(`[SERVER_MEMORY] Refreshed cache with ${embeddingCache.size} embeddings`);
    } catch (error) {
        console.error('[SERVER_MEMORY] Cache refresh error:', error.message);
    }
}

/**
 * Get time ago string for display
 */
function getTimeAgo(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
}

/**
 * Get ambient context - recent activity the bot has "noticed"
 */
export async function getAmbientContext(guildId, channelId, options = {}) {
    const {
        lookbackMinutes = 60,
        limit = 10,
        mentionedUserIds = []
    } = options;

    initDatabase();
    if (!statements) return [];

    try {
        const timeWindow = `-${lookbackMinutes} minutes`;
        const messages = statements.getRecentChannelMessages.all(channelId, timeWindow, limit);

        // Also get recent messages from other channels for broader awareness
        const guildMessages = statements.getRecentGuildMessages.all(guildId, timeWindow, limit * 2);

        // Combine and dedupe
        const seen = new Set(messages.map(m => m.id));
        const otherChannels = guildMessages.filter(m => !seen.has(m.id));

        // Format for context
        const result = [];

        for (const msg of messages.slice(0, 5)) {
            result.push({
                type: 'same_channel',
                channelId: msg.channel_id,
                authorId: msg.author_id,
                authorName: msg.author_name,
                content: msg.content.substring(0, 150),
                timeAgo: getTimeAgo(msg.discord_created_at),
                isPriority: mentionedUserIds.includes(msg.author_id)
            });
        }

        // Add a few from other channels
        for (const msg of otherChannels.slice(0, 3)) {
            result.push({
                type: 'other_channel',
                channelId: msg.channel_id,
                authorId: msg.author_id,
                authorName: msg.author_name,
                content: msg.content.substring(0, 100),
                timeAgo: getTimeAgo(msg.discord_created_at),
                isPriority: mentionedUserIds.includes(msg.author_id)
            });
        }

        // Sort: priority users first, then by recency
        result.sort((a, b) => {
            if (a.isPriority !== b.isPriority) return b.isPriority ? 1 : -1;
            return 0; // Keep original order (already by time)
        });

        return result;
    } catch (error) {
        console.error('[SERVER_MEMORY] getAmbientContext error:', error.message);
        return [];
    }
}

/**
 * Search server memories semantically
 */
export async function searchServerMemories(query, options = {}) {
    const {
        guildId,
        channelId = null,
        limit = 5,
        threshold = 0.3
    } = options;

    if (!guildId) return [];
    if (!isEmbeddingAvailable()) return [];

    initDatabase();
    if (!statements) return [];

    try {
        // Refresh cache if needed
        await refreshEmbeddingCache(guildId);

        // Generate query embedding
        const result = await generateEmbedding(query);
        if (!result.success) {
            console.error('[SERVER_MEMORY] Query embedding failed:', result.error);
            return [];
        }

        const queryEmbedding = result.embeddings[0];

        // Search through cached embeddings
        const matches = [];
        for (const [id, msg] of embeddingCache) {
            if (channelId && msg.channel_id !== channelId) continue;

            const similarity = cosineSimilarity(queryEmbedding, msg.embedding);
            if (similarity >= threshold) {
                matches.push({
                    ...msg,
                    similarity
                });
            }
        }

        // Sort by similarity and limit
        matches.sort((a, b) => b.similarity - a.similarity);
        return matches.slice(0, limit);
    } catch (error) {
        console.error('[SERVER_MEMORY] searchServerMemories error:', error.message);
        return [];
    }
}

/**
 * Get active topics in the server
 */
export function getActiveTopics(guildId, limit = 5) {
    initDatabase();
    if (!statements) return [];

    try {
        return statements.getActiveTopics.all(guildId, limit);
    } catch (error) {
        console.error('[SERVER_MEMORY] getActiveTopics error:', error.message);
        return [];
    }
}

/**
 * Get channel summaries
 */
export function getChannelSummaries(guildId, lookbackHours = 24, limit = 5) {
    initDatabase();
    if (!statements) return [];

    try {
        const timeWindow = `-${lookbackHours} hours`;
        return statements.getChannelSummaries.all(guildId, timeWindow, limit);
    } catch (error) {
        console.error('[SERVER_MEMORY] getChannelSummaries error:', error.message);
        return [];
    }
}

/**
 * Build complete server memory context string for system prompt
 *
 * @param {string} guildId - Server ID
 * @param {string} channelId - Current channel ID
 * @param {string} query - Current message content
 * @param {string} userId - Current user ID
 * @returns {Promise<string>} Formatted context for system prompt
 */
export async function buildServerMemoryContext(guildId, channelId, query, userId) {
    if (!config.SERVER_MEMORY_ENABLED) {
        return '';
    }

    initDatabase();
    if (!statements) return '';

    let context = '';

    try {
        // 1. Get ambient context (recent activity)
        const ambientLimit = config.SERVER_MEMORY_AMBIENT_LIMIT || 3;
        const ambient = await getAmbientContext(guildId, channelId, {
            lookbackMinutes: config.SERVER_MEMORY_LOOKBACK_MINUTES || 60,
            limit: ambientLimit * 2,
            mentionedUserIds: [userId]
        });

        if (ambient.length > 0) {
            context += '\n[SERVER AWARENESS - What you\'ve noticed around the server]\n';
            context += 'You\'ve been aware of these recent happenings:\n';

            for (const item of ambient.slice(0, ambientLimit)) {
                const channelPrefix = item.type === 'same_channel' ? '(here)' : '(other channel)';
                context += `- ${channelPrefix} ${item.authorName}: "${item.content.substring(0, 80)}..." (${item.timeAgo})\n`;
            }

            context += '\n[Reference casually if relevant - don\'t force it]\n';
        }

        // 2. Semantic search for relevant messages (if query is substantial)
        if (query && query.length > 10) {
            const deepLimit = config.SERVER_MEMORY_DEEP_LIMIT || 3;
            const relevant = await searchServerMemories(query, {
                guildId,
                limit: deepLimit,
                threshold: 0.4
            });

            if (relevant.length > 0) {
                context += '\n[RELEVANT SERVER MEMORIES - Details you remember]\n';

                for (const msg of relevant) {
                    const timeAgo = getTimeAgo(msg.discord_created_at);
                    context += `- ${msg.author_name} said: "${msg.content.substring(0, 100)}..." (${timeAgo})\n`;
                }

                context += '\n[Reference specific details when relevant to the conversation]\n';
            }
        }

        // 3. Active topics (if available)
        const topics = getActiveTopics(guildId, 3);
        if (topics.length > 0) {
            context += '\n[ONGOING DISCUSSIONS - Topics people keep bringing up]\n';

            for (const topic of topics) {
                const mentions = topic.mention_count || 1;
                context += `- "${topic.topic_name}" (${mentions} mentions)\n`;
            }

            context += '\n[You can reference these naturally]\n';
        }

        // 4. Channel summaries (if available)
        const summaries = getChannelSummaries(guildId, 24, 2);
        if (summaries.length > 0) {
            context += '\n[RECENT CHANNEL ACTIVITY]\n';

            for (const summary of summaries) {
                context += `- ${summary.summary.substring(0, 150)}...\n`;
            }
        }

        return context;
    } catch (error) {
        console.error('[SERVER_MEMORY] buildServerMemoryContext error:', error.message);
        return '';
    }
}

/**
 * Get server memory statistics
 */
export function getStats(guildId) {
    initDatabase();
    if (!statements) return { totalMessages: 0, cachedEmbeddings: 0 };

    try {
        const countResult = statements.getMessageCount.get(guildId);
        return {
            totalMessages: countResult?.count || 0,
            cachedEmbeddings: embeddingCache.size,
            lastCacheRefresh: lastCacheRefresh ? new Date(lastCacheRefresh).toISOString() : null
        };
    } catch (error) {
        console.error('[SERVER_MEMORY] getStats error:', error.message);
        return { totalMessages: 0, cachedEmbeddings: 0 };
    }
}

/**
 * Check if server memory is available
 */
export function isAvailable() {
    return config.SERVER_MEMORY_ENABLED;
}

/**
 * Clear the embedding cache
 */
export function clearCache() {
    embeddingCache.clear();
    lastCacheRefresh = 0;
    console.log('[SERVER_MEMORY] Cache cleared');
}

export default {
    RetrievalMode,
    getAmbientContext,
    searchServerMemories,
    getActiveTopics,
    getChannelSummaries,
    buildServerMemoryContext,
    getStats,
    isAvailable,
    clearCache
};
