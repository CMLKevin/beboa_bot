/**
 * Channel Context Service
 * Fetches and caches recent messages from Discord channels
 * Provides ambient awareness of channel conversations
 */

import { config } from '../config.js';

// Cache for channel messages (to avoid repeated API calls)
const channelCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Fetch recent messages from a channel
 * @param {TextChannel} channel - Discord channel object
 * @param {number} limit - Number of messages to fetch
 * @returns {Promise<Array<{author: string, content: string, timestamp: Date}>>}
 */
export async function fetchChannelContext(channel, limit = null) {
    const messageLimit = limit || config.CHANNEL_CONTEXT_LIMIT || 20;

    // Check cache
    const cacheKey = channel.id;
    const cached = channelCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.messages;
    }

    try {
        const messages = await channel.messages.fetch({ limit: messageLimit });

        // Convert to simple format (newest first in Discord, we reverse for chronological)
        const formatted = messages
            .filter(msg => !msg.author.bot || msg.author.id === channel.client.user.id) // Include bot's own messages
            .map(msg => ({
                authorId: msg.author.id,
                author: msg.author.displayName || msg.author.username,
                content: msg.content,
                timestamp: msg.createdAt,
                isBot: msg.author.bot
            }))
            .reverse(); // Chronological order

        // Cache the result
        channelCache.set(cacheKey, {
            messages: formatted,
            timestamp: Date.now()
        });

        return formatted;

    } catch (error) {
        console.error('[CHANNEL_CONTEXT] Failed to fetch messages:', error);
        return [];
    }
}

/**
 * Build context string from channel messages
 * @param {Array} messages - Channel messages
 * @param {string} botId - Bot's user ID to identify own messages
 * @returns {string}
 */
export function buildChannelContextString(messages, botId) {
    if (!messages || messages.length === 0) {
        return '';
    }

    let context = '\n[RECENT CHANNEL ACTIVITY - For awareness, not direct response]\n';
    context += 'These are recent messages in the channel. Use for context awareness:\n\n';

    for (const msg of messages) {
        const role = msg.authorId === botId ? '(You)' : '';
        const truncated = msg.content.length > 200
            ? msg.content.substring(0, 200) + '...'
            : msg.content;
        context += `${msg.author}${role}: ${truncated}\n`;
    }

    context += '\n[Respond naturally to the user who mentioned you, using this context if relevant]\n';

    return context;
}

/**
 * Extract topics from channel messages
 * @param {Array} messages - Channel messages
 * @returns {string[]} - Array of detected topics
 */
export function extractChannelTopics(messages) {
    const topics = new Set();
    const topicPatterns = [
        { pattern: /\b(game|gaming|playing|stream)\b/i, topic: 'gaming' },
        { pattern: /\b(art|draw|drawing|sketch|paint)\b/i, topic: 'art' },
        { pattern: /\b(music|song|listen|spotify)\b/i, topic: 'music' },
        { pattern: /\b(code|coding|programming|dev)\b/i, topic: 'coding' },
        { pattern: /\b(anime|manga|weeb)\b/i, topic: 'anime' },
        { pattern: /\b(meme|funny|lol|lmao)\b/i, topic: 'humor' },
        { pattern: /\b(sad|upset|depressed|anxious)\b/i, topic: 'emotional' },
        { pattern: /\b(bebits|streak|checkin|check-in)\b/i, topic: 'bebits' },
        { pattern: /\b(beboa|snake|crystal)\b/i, topic: 'beboa' }
    ];

    for (const msg of messages) {
        for (const { pattern, topic } of topicPatterns) {
            if (pattern.test(msg.content)) {
                topics.add(topic);
            }
        }
    }

    return Array.from(topics);
}

/**
 * Get conversation participants from recent messages
 * @param {Array} messages - Channel messages
 * @returns {Array<{id: string, name: string, messageCount: number}>}
 */
export function getParticipants(messages) {
    const participants = new Map();

    for (const msg of messages) {
        if (msg.isBot) continue;

        const existing = participants.get(msg.authorId);
        if (existing) {
            existing.messageCount++;
        } else {
            participants.set(msg.authorId, {
                id: msg.authorId,
                name: msg.author,
                messageCount: 1
            });
        }
    }

    return Array.from(participants.values())
        .sort((a, b) => b.messageCount - a.messageCount);
}

/**
 * Clear cache for a specific channel
 * @param {string} channelId
 */
export function clearChannelCache(channelId) {
    channelCache.delete(channelId);
}

/**
 * Clear all cached channel data
 */
export function clearAllChannelCache() {
    channelCache.clear();
}

export default {
    fetchChannelContext,
    buildChannelContextString,
    extractChannelTopics,
    getParticipants,
    clearChannelCache,
    clearAllChannelCache
};
