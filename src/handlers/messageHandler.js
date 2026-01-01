/**
 * Message Handler
 * Handles @Beboa mentions as an alternative to /chat
 */

import { config } from '../config.js';
import { getUser } from '../database.js';
import { isOpenRouterConfigured, chatCompletion } from '../services/openrouter.js';
import {
    BEBOA_SYSTEM_PROMPT,
    buildUserContext,
    getErrorMessage,
    getCooldownMessage,
    getDisabledMessage
} from '../utils/beboa-persona.js';

// Cooldowns for mention-based chat
const mentionCooldowns = new Map();

// SHARED conversation history - all users in one history so Beboa remembers everyone
let sharedConversationCache = { messages: [], lastMessageTime: Date.now() };

/**
 * Handle incoming messages that mention the bot
 * @param {Message} message - Discord message object
 */
export async function handleMention(message) {
    // Ignore bots
    if (message.author.bot) return;

    // Check if bot is mentioned
    if (!message.mentions.has(message.client.user)) return;

    // Check if feature is enabled
    if (!config.CHAT_ENABLED || !isOpenRouterConfigured()) {
        return await message.reply(getDisabledMessage());
    }

    const userId = message.author.id;
    const displayName = message.author.displayName || message.author.username;

    // Check cooldown
    const cooldownRemaining = checkMentionCooldown(userId);
    if (cooldownRemaining > 0) {
        return await message.reply(getCooldownMessage(cooldownRemaining));
    }

    // Extract the actual message (remove the mention)
    const content = message.content
        .replace(/<@!?\d+>/g, '') // Remove mentions
        .trim();

    // If empty message after removing mention
    if (!content) {
        return await message.reply("🐍 You summoned Beboa but said nothing? How rude! Speak, mortal~");
    }

    // Limit message length
    if (content.length > 500) {
        return await message.reply("🐍 Hsssss... that's too many words, mortal! Keep it under 500 characters~");
    }

    // Show typing indicator
    await message.channel.sendTyping();

    try {
        // Get user data for context
        const userData = getUser(userId);

        // Build messages with shared history
        const messages = buildMentionMessageArray(displayName, userData, content);

        // Call API
        const result = await chatCompletion(messages);

        if (!result.success) {
            console.error(`[MENTION] API failed for ${message.author.tag}:`, result.error);
            return await message.reply(getErrorMessage());
        }

        // Update shared history
        updateSharedHistory(displayName, content, result.content);

        // Set cooldown
        setMentionCooldown(userId);

        console.log(`[MENTION] ${message.author.tag}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" -> Response sent`);

        // Reply
        await message.reply(result.content);

    } catch (error) {
        console.error('[MENTION] Error:', error);
        await message.reply(getErrorMessage());
    }
}

/**
 * Build the messages array for the API call
 * Uses SHARED history so Beboa remembers all users naturally
 */
function buildMentionMessageArray(displayName, userData, content) {
    // Get shared conversation history (all users together)
    const history = getSharedHistory();

    // Build system prompt with current user context
    const userContext = buildUserContext(userData, displayName);
    const fullSystemPrompt = BEBOA_SYSTEM_PROMPT + '\n' + userContext;

    // Construct messages array
    const messages = [{ role: 'system', content: fullSystemPrompt }];

    // Add shared conversation history - each message tagged with who said it
    history.forEach(msg => {
        if (msg.role === 'user') {
            messages.push({ role: 'user', content: `[${msg.displayName}]: ${msg.content}` });
        } else {
            messages.push({ role: 'assistant', content: msg.content });
        }
    });

    // Add current message with user identification
    messages.push({ role: 'user', content: `[${displayName}]: ${content}` });
    return messages;
}

/**
 * Get shared conversation history (all users together)
 */
function getSharedHistory() {
    // Check if history is stale (more than 30 minutes since last message)
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - sharedConversationCache.lastMessageTime > thirtyMinutes) {
        sharedConversationCache = { messages: [], lastMessageTime: Date.now() };
        return [];
    }

    return sharedConversationCache.messages;
}

/**
 * Update shared conversation history with new exchange
 */
function updateSharedHistory(displayName, userMessage, assistantResponse) {
    // Add user message
    sharedConversationCache.messages.push({
        displayName: displayName,
        content: userMessage,
        role: 'user'
    });

    // Add assistant response
    sharedConversationCache.messages.push({
        displayName: 'Beboa',
        content: assistantResponse,
        role: 'assistant'
    });

    // Trim to max history length (counting message pairs)
    const maxHistory = (config.CHAT_MAX_HISTORY || 10) * 2;
    if (sharedConversationCache.messages.length > maxHistory) {
        sharedConversationCache.messages = sharedConversationCache.messages.slice(-maxHistory);
    }

    sharedConversationCache.lastMessageTime = Date.now();
}

/**
 * Check if user is on cooldown for mentions
 */
function checkMentionCooldown(userId) {
    const lastTime = mentionCooldowns.get(userId);
    if (!lastTime) return 0;

    const cooldownMs = (config.CHAT_COOLDOWN_SECONDS || 30) * 1000;
    const elapsed = Date.now() - lastTime;

    if (elapsed >= cooldownMs) {
        mentionCooldowns.delete(userId);
        return 0;
    }

    return Math.ceil((cooldownMs - elapsed) / 1000);
}

/**
 * Set cooldown for mentions
 */
function setMentionCooldown(userId) {
    mentionCooldowns.set(userId, Date.now());
}

/**
 * Clear shared mention history
 */
export function clearMentionHistory() {
    sharedConversationCache = { messages: [], lastMessageTime: Date.now() };
}

/**
 * Get mention chat statistics
 */
export function getMentionChatStats() {
    return {
        activeConversations: sharedConversationCache.messages.length > 0 ? 1 : 0,
        totalMessages: sharedConversationCache.messages.length,
        activeCooldowns: mentionCooldowns.size
    };
}

export default { handleMention, clearMentionHistory, getMentionChatStats };
