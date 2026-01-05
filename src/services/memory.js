/**
 * Memory Service
 * Handles semantic memory storage, retrieval, and auto-extraction
 * Provides long-term memory capabilities for Beboa
 */

import db from '../database.js';
import { generateEmbedding, cosineSimilarity, isEmbeddingAvailable } from './embedding.js';

// Prepared statements for memory operations
const statements = {
    // Memory embeddings
    insertEmbedding: db.prepare(`
        INSERT INTO memory_embeddings (embedding, model, dimensions)
        VALUES (?, ?, ?)
    `),

    getEmbedding: db.prepare(`
        SELECT embedding FROM memory_embeddings WHERE id = ?
    `),

    getAllEmbeddings: db.prepare(`
        SELECT me.id, me.embedding, sm.id as memory_id, sm.content, sm.memory_type, sm.user_id, sm.importance
        FROM memory_embeddings me
        JOIN semantic_memories sm ON sm.embedding_id = me.id
        WHERE sm.user_id IS NULL OR sm.user_id = ?
        ORDER BY sm.importance DESC
        LIMIT ?
    `),

    // Semantic memories
    insertMemory: db.prepare(`
        INSERT INTO semantic_memories (user_id, memory_type, content, importance, embedding_id, source_type, source_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    getMemoryById: db.prepare(`
        SELECT * FROM semantic_memories WHERE id = ?
    `),

    getMemoriesByUser: db.prepare(`
        SELECT * FROM semantic_memories
        WHERE user_id = ?
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
    `),

    getMemoriesByType: db.prepare(`
        SELECT * FROM semantic_memories
        WHERE memory_type = ?
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
    `),

    getRecentMemories: db.prepare(`
        SELECT * FROM semantic_memories
        ORDER BY created_at DESC
        LIMIT ?
    `),

    updateMemoryAccess: db.prepare(`
        UPDATE semantic_memories
        SET access_count = access_count + 1, last_accessed_at = datetime('now')
        WHERE id = ?
    `),

    updateMemoryImportance: db.prepare(`
        UPDATE semantic_memories
        SET importance = ?, updated_at = datetime('now')
        WHERE id = ?
    `),

    deleteMemory: db.prepare(`
        DELETE FROM semantic_memories WHERE id = ?
    `),

    // User interactions
    insertInteraction: db.prepare(`
        INSERT INTO user_interactions (user_id, interaction_type, content, sentiment, topics, extracted_facts, channel_id, message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    getRecentInteractions: db.prepare(`
        SELECT * FROM user_interactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `),

    // Personality evolution
    insertTraitChange: db.prepare(`
        INSERT INTO personality_evolution (trait_name, trait_value, trigger_event, previous_value)
        VALUES (?, ?, ?, ?)
    `),

    getCurrentTraits: db.prepare(`
        SELECT trait_name, trait_value, created_at
        FROM personality_evolution pe1
        WHERE created_at = (
            SELECT MAX(created_at) FROM personality_evolution pe2
            WHERE pe2.trait_name = pe1.trait_name
        )
    `)
};

// In-memory cache for embeddings (for fast similarity search)
let embeddingCache = new Map();
let cacheLastUpdated = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Memory types for categorization
 */
export const MemoryTypes = {
    FACT: 'fact',           // Facts about users (e.g., "loves cats")
    PREFERENCE: 'preference', // User preferences
    EVENT: 'event',         // Notable events
    RELATIONSHIP: 'relationship', // Relationship dynamics
    TOPIC: 'topic',         // Topics discussed
    EMOTION: 'emotion',     // Emotional moments
    JOKE: 'joke',           // Jokes or funny moments
    LORE: 'lore'            // Server lore and inside jokes
};

/**
 * Store a new memory with embedding
 * @param {Object} options
 * @param {string} options.userId - Discord user ID (null for global memories)
 * @param {string} options.memoryType - Type from MemoryTypes
 * @param {string} options.content - Memory content
 * @param {number} options.importance - Importance score (0-1)
 * @param {string} options.sourceType - Where it came from (conversation, admin, etc.)
 * @param {string} options.sourceId - Message ID or other reference
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<{success: boolean, memoryId?: number, error?: string}>}
 */
export async function storeMemory({ userId, memoryType, content, importance = 0.5, sourceType = 'conversation', sourceId = null, metadata = null }) {
    try {
        let embeddingId = null;

        // Generate embedding if service is available
        if (isEmbeddingAvailable()) {
            const embeddingResult = await generateEmbedding(content);
            if (embeddingResult.success && embeddingResult.embeddings?.[0]) {
                const embedding = embeddingResult.embeddings[0];
                const result = statements.insertEmbedding.run(
                    JSON.stringify(embedding),
                    embeddingResult.model,
                    embedding.length
                );
                embeddingId = result.lastInsertRowid;
            }
        }

        // Store memory
        const result = statements.insertMemory.run(
            userId,
            memoryType,
            content,
            importance,
            embeddingId,
            sourceType,
            sourceId,
            metadata ? JSON.stringify(metadata) : null
        );

        // Invalidate cache
        cacheLastUpdated = 0;

        console.log(`[MEMORY] Stored: "${content.substring(0, 50)}..." (type: ${memoryType}, importance: ${importance})`);

        return { success: true, memoryId: result.lastInsertRowid };

    } catch (error) {
        console.error('[MEMORY] Store failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search memories by semantic similarity
 * @param {string} query - Search query
 * @param {Object} options
 * @param {string} options.userId - Filter by user (null for all)
 * @param {number} options.limit - Max results
 * @param {number} options.threshold - Minimum similarity
 * @returns {Promise<Array>}
 */
export async function searchMemories(query, { userId = null, limit = 5, threshold = 0.3 } = {}) {
    try {
        // If embeddings not available, fall back to recent memories
        if (!isEmbeddingAvailable()) {
            return getRecentMemoriesForContext(userId, limit);
        }

        // Generate query embedding
        const queryResult = await generateEmbedding(query);
        if (!queryResult.success) {
            return getRecentMemoriesForContext(userId, limit);
        }

        const queryEmbedding = queryResult.embeddings[0];

        // Refresh cache if stale
        if (Date.now() - cacheLastUpdated > CACHE_TTL) {
            await refreshEmbeddingCache(userId);
        }

        // Find similar memories
        const results = [];
        for (const [, cached] of embeddingCache) {
            if (userId && cached.userId && cached.userId !== userId) continue;

            const similarity = cosineSimilarity(queryEmbedding, cached.embedding);
            if (similarity >= threshold) {
                results.push({
                    ...cached,
                    similarity
                });

                // Update access count
                statements.updateMemoryAccess.run(cached.memoryId);
            }
        }

        // Sort by similarity and return top results
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, limit);

    } catch (error) {
        console.error('[MEMORY] Search failed:', error);
        return [];
    }
}

/**
 * Refresh the embedding cache from database
 */
async function refreshEmbeddingCache(userId = null) {
    try {
        embeddingCache.clear();
        const rows = statements.getAllEmbeddings.all(userId, 500);

        for (const row of rows) {
            if (row.embedding) {
                embeddingCache.set(row.id, {
                    embeddingId: row.id,
                    memoryId: row.memory_id,
                    content: row.content,
                    memoryType: row.memory_type,
                    userId: row.user_id,
                    importance: row.importance,
                    embedding: JSON.parse(row.embedding)
                });
            }
        }

        cacheLastUpdated = Date.now();
        console.log(`[MEMORY] Cache refreshed: ${embeddingCache.size} embeddings`);

    } catch (error) {
        console.error('[MEMORY] Cache refresh failed:', error);
    }
}

/**
 * Get recent memories for context (fallback when embeddings unavailable)
 */
function getRecentMemoriesForContext(userId, limit) {
    if (userId) {
        return statements.getMemoriesByUser.all(userId, limit);
    }
    return statements.getRecentMemories.all(limit);
}

/**
 * Extract and store memories from a conversation exchange
 * Uses AI to identify important information worth remembering
 * @param {string} userId - Discord user ID
 * @param {string} userName - Display name
 * @param {string} userMessage - What user said
 * @param {string} botResponse - Beboa's response
 * @param {Object} context - Additional context (channel, etc.)
 */
export async function extractAndStoreMemories(userId, userName, userMessage, botResponse, context = {}) {
    // Store the interaction first
    try {
        statements.insertInteraction.run(
            userId,
            'conversation',
            `${userName}: ${userMessage}\nBeboa: ${botResponse}`,
            null, // sentiment (could be computed)
            null, // topics
            null, // extracted facts (will be filled below)
            context.channelId || null,
            context.messageId || null
        );
    } catch (e) {
        console.error('[MEMORY] Failed to store interaction:', e);
    }

    // Extract memories using pattern matching (fast, no API call)
    const memories = extractMemoriesFromText(userMessage, userId, userName);

    // Store each extracted memory
    for (const mem of memories) {
        await storeMemory({
            userId,
            memoryType: mem.type,
            content: mem.content,
            importance: mem.importance,
            sourceType: 'auto_extraction',
            sourceId: context.messageId,
            metadata: { userName, originalMessage: userMessage }
        });
    }

    return memories;
}

/**
 * Extract memories from text using pattern matching
 * This is a lightweight alternative to AI extraction
 */
function extractMemoriesFromText(text, _userId, userName) {
    const memories = [];

    // Patterns for different memory types
    const patterns = [
        // Preferences: "I love/like/hate X"
        {
            pattern: /\bi\s+(love|like|really like|adore|hate|dislike|can't stand)\s+(.+?)(?:[.!,]|$)/gi,
            type: MemoryTypes.PREFERENCE,
            importance: 0.6,
            extract: (match) => `${userName} ${match[1]}s ${match[2].trim()}`
        },
        // Facts: "I am/I'm X"
        {
            pattern: /\bi(?:'m| am)\s+(a\s+)?(.+?)(?:[.!,]|$)/gi,
            type: MemoryTypes.FACT,
            importance: 0.5,
            extract: (match) => `${userName} is ${match[2].trim()}`
        },
        // Events: "I just/recently did X"
        {
            pattern: /\bi\s+(just|recently)\s+(.+?)(?:[.!,]|$)/gi,
            type: MemoryTypes.EVENT,
            importance: 0.4,
            extract: (match) => `${userName} ${match[1]} ${match[2].trim()}`
        },
        // Personal info: mentions of pets, family, hobbies
        {
            pattern: /\bmy\s+(cat|dog|pet|mom|dad|brother|sister|friend|hobby|job|work)\s+(?:is\s+)?(.+?)(?:[.!,]|$)/gi,
            type: MemoryTypes.FACT,
            importance: 0.7,
            extract: (match) => `${userName}'s ${match[1]}: ${match[2].trim()}`
        }
    ];

    for (const { pattern, type, importance, extract } of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(text)) !== null) {
            const content = extract(match);
            if (content.length > 10 && content.length < 200) {
                memories.push({ type, content, importance });
            }
        }
    }

    return memories;
}

/**
 * Build memory context for AI prompt
 * @param {string} userId - Current user ID
 * @param {string} query - Current message/context
 * @returns {Promise<string>}
 */
export async function buildMemoryContext(userId, query) {
    const relevantMemories = await searchMemories(query, { userId, limit: 5 });

    if (relevantMemories.length === 0) {
        return '';
    }

    let context = '\n[BEBOA\'S MEMORIES - Reference naturally, don\'t recite]\n';

    for (const mem of relevantMemories) {
        const typeLabel = mem.memoryType || 'memory';
        context += `- (${typeLabel}) ${mem.content}\n`;
    }

    context += '\n[Use these memories naturally in conversation when relevant]\n';

    return context;
}

/**
 * Get personality traits for dynamic personality
 */
export function getPersonalityTraits() {
    try {
        const traits = statements.getCurrentTraits.all();
        const traitMap = {};
        for (const t of traits) {
            traitMap[t.trait_name] = t.trait_value;
        }
        return traitMap;
    } catch (e) {
        return {};
    }
}

/**
 * Evolve a personality trait
 */
export function evolvePersonalityTrait(traitName, newValue, triggerEvent) {
    const traits = getPersonalityTraits();
    const previousValue = traits[traitName] || 0.5;

    statements.insertTraitChange.run(traitName, newValue, triggerEvent, previousValue);
    console.log(`[PERSONALITY] ${traitName}: ${previousValue.toFixed(2)} -> ${newValue.toFixed(2)} (${triggerEvent})`);
}

export default {
    MemoryTypes,
    storeMemory,
    searchMemories,
    extractAndStoreMemories,
    buildMemoryContext,
    getPersonalityTraits,
    evolvePersonalityTrait
};
