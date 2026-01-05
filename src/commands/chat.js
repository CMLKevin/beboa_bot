/**
 * /chat command - Talk to Beboa
 * Full memory, tools, and context awareness integration
 */

import { SlashCommandBuilder } from 'discord.js';
import { config } from '../config.js';
import {
    getUser,
    addChatMessage,
    getChatHistory,
    clearAllChatHistory
} from '../database.js';
import { isOpenRouterConfigured, chatCompletion } from '../services/openrouter.js';
import { fetchChannelContext, buildChannelContextString } from '../services/channelContext.js';
import { buildMemoryContext, extractAndStoreMemories, getPersonalityTraits } from '../services/memory.js';
import { parseAndExecuteAdminCommand, canExecuteAdminCommands } from '../services/adminCommands.js';
import { chatWithTools, processToolCalls, toolDefinitions } from '../services/tools.js';
import {
    buildFullContext,
    shouldExtractMemory,
    getErrorMessage,
    getCooldownMessage,
    getDisabledMessage
} from '../utils/beboa-persona.js';

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
            .setMaxLength(2000)
    );

export async function execute(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.user.displayName || interaction.user.username;
    const userMessage = interaction.options.getString('message');
    const isAdmin = canExecuteAdminCommands(userId);
    const isBebe = config.BEBE_USER_ID && userId === config.BEBE_USER_ID;

    // Check if feature is enabled
    if (!config.CHAT_ENABLED || !isOpenRouterConfigured()) {
        return await interaction.reply({
            content: getDisabledMessage(),
            ephemeral: true
        });
    }

    // Check cooldown (skip for bebe)
    if (!isBebe) {
        const cooldownRemaining = checkCooldown(userId);
        if (cooldownRemaining > 0) {
            return await interaction.reply({
                content: getCooldownMessage(cooldownRemaining),
                ephemeral: true
            });
        }
    }

    // Defer reply since API call might take a moment
    await interaction.deferReply();

    try {
        // Check for admin commands first (Jarvis-style)
        if (isAdmin) {
            const adminResult = await parseAndExecuteAdminCommand(userMessage, {
                userId,
                displayName,
                channelId: interaction.channel?.id,
                guild: interaction.guild
            });

            if (adminResult.matched) {
                await interaction.editReply({ content: adminResult.result.message });
                if (!isBebe) setCooldown(userId);
                return;
            }
        }

        // Get user data for context
        const userData = getUser(userId);

        // Fetch channel context (past 20 messages)
        let channelContext = '';
        if (config.CHANNEL_CONTEXT_LIMIT > 0 && interaction.channel) {
            const recentMessages = await fetchChannelContext(interaction.channel, config.CHANNEL_CONTEXT_LIMIT);
            channelContext = buildChannelContextString(recentMessages, interaction.client.user.id);
        }

        // Get memory context
        let memoryContext = '';
        if (config.MEMORY_ENABLED) {
            memoryContext = await buildMemoryContext(userId, userMessage);
        }

        // Get personality traits
        const personalityTraits = getPersonalityTraits();

        // Build the full system prompt with all context
        const fullSystemPrompt = buildFullContext({
            userData,
            displayName,
            memoryContext,
            channelContext,
            personalityTraits,
            isAdmin: isBebe
        });

        // Build the messages array with shared history
        const messages = buildMessageArray(fullSystemPrompt, displayName, userMessage);

        // Call API with tool support
        let result;
        if (config.TOOLS_ENABLED && toolDefinitions.length > 0) {
            result = await chatWithTools(messages, { enableTools: true });

            // Handle tool calls if any
            if (result.success && result.hasToolCalls) {
                const toolResults = await processToolCalls(result.toolCalls, {
                    userId,
                    displayName,
                    isAdmin,
                    channelId: interaction.channel?.id,
                    recentMessages: interaction.channel ? await fetchChannelContext(interaction.channel) : []
                });

                // Add tool results and get final response
                const messagesWithTools = [
                    ...messages,
                    { role: 'assistant', content: result.content, tool_calls: result.toolCalls },
                    ...toolResults
                ];

                result = await chatCompletion(messagesWithTools);
            }
        } else {
            result = await chatCompletion(messages);
        }

        if (!result.success) {
            console.error(`[CHAT] API call failed for ${interaction.user.tag}:`, result.error);
            return await interaction.editReply({
                content: getErrorMessage()
            });
        }

        // Store in persistent conversation history
        saveConversation(displayName, userMessage, result.content);

        // Auto-extract memories if applicable
        if (config.MEMORY_ENABLED && shouldExtractMemory(userMessage)) {
            extractAndStoreMemories(userId, displayName, userMessage, result.content, {
                channelId: interaction.channel?.id
            }).catch(e => console.error('[MEMORY] Extraction failed:', e));
        }

        // Set cooldown
        if (!isBebe) setCooldown(userId);

        // Log the interaction
        console.log(`[CHAT] ${interaction.user.tag}: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}" -> Response sent`);

        // Handle long responses
        const responseContent = result.content;
        if (responseContent.length > 2000) {
            // Split and send multiple responses
            const chunks = splitMessage(responseContent);
            await interaction.editReply({ content: chunks[0] });
            for (let i = 1; i < chunks.length; i++) {
                await interaction.followUp({ content: chunks[i] });
            }
        } else {
            await interaction.editReply({ content: responseContent });
        }

    } catch (error) {
        console.error('[CHAT] Error:', error);
        await interaction.editReply({
            content: getErrorMessage()
        });
    }
}

/**
 * Build the messages array for the API call
 * Uses SHARED history from database so Beboa remembers all users across restarts
 */
function buildMessageArray(systemPrompt, displayName, currentMessage) {
    // Get shared conversation history from database (limited by CHAT_MAX_HISTORY)
    const maxHistory = (config.CHAT_MAX_HISTORY || 10) * 2; // *2 because each exchange is 2 messages
    const history = getChatHistory(maxHistory);

    // Construct messages array
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    // Add shared conversation history - each message tagged with who said it
    history.forEach(msg => {
        if (msg.role === 'user') {
            messages.push({ role: 'user', content: `[${msg.display_name}]: ${msg.content}` });
        } else {
            messages.push({ role: 'assistant', content: msg.content });
        }
    });

    // Add current message with user identification
    messages.push({ role: 'user', content: `[${displayName}]: ${currentMessage}` });

    return messages;
}

/**
 * Save conversation exchange to database
 */
function saveConversation(displayName, userMessage, assistantResponse) {
    addChatMessage(displayName, userMessage, 'user');
    addChatMessage('Beboa', assistantResponse, 'assistant');
}

/**
 * Split long messages for Discord's 2000 char limit
 */
function splitMessage(content, maxLength = 2000) {
    const chunks = [];
    let remaining = content;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        let breakPoint = remaining.lastIndexOf('\n', maxLength);
        if (breakPoint === -1 || breakPoint < maxLength / 2) {
            breakPoint = remaining.lastIndexOf(' ', maxLength);
        }
        if (breakPoint === -1 || breakPoint < maxLength / 2) {
            breakPoint = maxLength;
        }

        chunks.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint).trim();
    }

    return chunks;
}

/**
 * Check if user is on cooldown
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
 */
function setCooldown(userId) {
    cooldowns.set(userId, Date.now());
}

/**
 * Clear all conversation history
 */
export function clearHistory() {
    clearAllChatHistory();
}

/**
 * Get chat statistics
 */
export function getChatStats() {
    const history = getChatHistory(100);
    return {
        activeConversations: history.length > 0 ? 1 : 0,
        totalMessages: history.length,
        activeCooldowns: cooldowns.size
    };
}

export default { data, execute, clearHistory, getChatStats };
