/**
 * /chat command - Talk to Beboa
 * Allows users to have AI-powered conversations with the Beboa persona
 */

import { SlashCommandBuilder } from 'discord.js';
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

// SHARED conversation history - all users in one history so Beboa remembers everyone
// Format: { messages: [{displayName, content, role}, ...], lastMessageTime: timestamp }
let sharedConversationCache = { messages: [], lastMessageTime: Date.now() };

// Cooldown tracking
const cooldowns = new Map();

export const data = new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Talk to Beboa, the bratty snake companion')
    .addStringOption(option =>
        option
            .setName('message')
            .setDescription('What do you want to say to Beboa?')
            .setRequired(true)
            .setMaxLength(500)
    );

export async function execute(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.user.displayName || interaction.user.username;
    const userMessage = interaction.options.getString('message');

    // Check if feature is enabled
    if (!config.CHAT_ENABLED || !isOpenRouterConfigured()) {
        return await interaction.reply({
            content: getDisabledMessage(),
            ephemeral: true
        });
    }

    // Check cooldown
    const cooldownRemaining = checkCooldown(userId);
    if (cooldownRemaining > 0) {
        return await interaction.reply({
            content: getCooldownMessage(cooldownRemaining),
            ephemeral: true
        });
    }

    // Defer reply since API call might take a moment
    await interaction.deferReply();

    try {
        // Get user data for context
        const userData = getUser(userId);

        // Build the messages array with shared history
        const messages = buildMessageArray(displayName, userData, userMessage);

        // Call OpenRouter API
        const result = await chatCompletion(messages);

        if (!result.success) {
            console.error(`[CHAT] API call failed for ${interaction.user.tag}:`, result.error);
            return await interaction.editReply({
                content: getErrorMessage()
            });
        }

        // Store in shared conversation history
        updateSharedHistory(displayName, userMessage, result.content);

        // Set cooldown
        setCooldown(userId);

        // Log the interaction
        console.log(`[CHAT] ${interaction.user.tag}: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}" -> Response sent`);

        // Send response (public)
        await interaction.editReply({
            content: result.content
        });

    } catch (error) {
        console.error('[CHAT] Error:', error);
        await interaction.editReply({
            content: getErrorMessage()
        });
    }
}

/**
 * Build the messages array for the API call
 * Uses SHARED history so Beboa remembers all users naturally
 */
function buildMessageArray(displayName, userData, currentMessage) {
    // Get shared conversation history (all users together)
    const history = getSharedHistory();

    // Build system prompt with current user context
    const userContext = buildUserContext(userData, displayName);
    const fullSystemPrompt = BEBOA_SYSTEM_PROMPT + '\n' + userContext;

    // Construct messages array
    const messages = [
        { role: 'system', content: fullSystemPrompt }
    ];

    // Add shared conversation history - each message tagged with who said it
    history.forEach(msg => {
        if (msg.role === 'user') {
            messages.push({ role: 'user', content: `[${msg.displayName}]: ${msg.content}` });
        } else {
            messages.push({ role: 'assistant', content: msg.content });
        }
    });

    // Add current message with user identification
    messages.push({ role: 'user', content: `[${displayName}]: ${currentMessage}` });

    return messages;
}

/**
 * Get shared conversation history (all users together)
 * @returns {Array} Array of {displayName, content, role} messages
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
 * @param {string} displayName - User's display name
 * @param {string} userMessage - User's message
 * @param {string} assistantResponse - Beboa's response
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
    const maxHistory = (config.CHAT_MAX_HISTORY || 10) * 2; // *2 because each exchange is 2 messages
    if (sharedConversationCache.messages.length > maxHistory) {
        sharedConversationCache.messages = sharedConversationCache.messages.slice(-maxHistory);
    }

    sharedConversationCache.lastMessageTime = Date.now();
}

/**
 * Check if user is on cooldown
 * @param {string} userId - Discord user ID
 * @returns {number} Seconds remaining, or 0 if not on cooldown
 */
function checkCooldown(userId) {
    const lastTime = cooldowns.get(userId);
    if (!lastTime) return 0;

    const cooldownMs = (config.CHAT_COOLDOWN_SECONDS || 30) * 1000;
    const elapsed = Date.now() - lastTime;

    if (elapsed >= cooldownMs) {
        cooldowns.delete(userId);
        return 0;
    }

    return Math.ceil((cooldownMs - elapsed) / 1000);
}

/**
 * Set cooldown for a user
 * @param {string} userId - Discord user ID
 */
function setCooldown(userId) {
    cooldowns.set(userId, Date.now());
}

/**
 * Clear shared conversation history
 */
export function clearHistory() {
    sharedConversationCache = { messages: [], lastMessageTime: Date.now() };
}

/**
 * Get chat statistics (for admin/debugging)
 * @returns {Object} Statistics about chat usage
 */
export function getChatStats() {
    return {
        activeConversations: sharedConversationCache.messages.length > 0 ? 1 : 0,
        totalMessages: sharedConversationCache.messages.length,
        activeCooldowns: cooldowns.size
    };
}

export default { data, execute, clearHistory, getChatStats };
