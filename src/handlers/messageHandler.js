/**
 * Message Handler
 * Handles @Beboa mentions with full memory, tools, and context awareness
 */

import { config } from '../config.js';
import { getUser, addChatMessage, getChatHistory } from '../database.js';
import { isOpenRouterConfigured, chatCompletion } from '../services/openrouter.js';
import { fetchChannelContext, buildChannelContextString } from '../services/channelContext.js';
import { buildMemoryContext, extractAndStoreMemories } from '../services/memory.js';
import { parseAndExecuteAdminCommand, canExecuteAdminCommands } from '../services/adminCommands.js';
import { chatWithTools, processToolCalls, toolDefinitions } from '../services/tools.js';
import {
    getPersonalityState,
    buildPersonalityPrompt,
    processInteraction,
    getRelationship
} from '../services/personality.js';
import {
    BEBOA_SYSTEM_PROMPT,
    buildFullContext,
    shouldExtractMemory,
    getErrorMessage,
    getCooldownMessage,
    getDisabledMessage
} from '../utils/beboa-persona.js';
import { buildServerMemoryContext } from '../services/serverMemory.js';

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
    const isAdmin = canExecuteAdminCommands(userId);
    const isBebe = config.BEBE_USER_ID && userId === config.BEBE_USER_ID;

    // Check cooldown (skip for bebe)
    if (!isBebe) {
        const cooldownRemaining = checkMentionCooldown(userId);
        if (cooldownRemaining > 0) {
            return await message.reply(getCooldownMessage(cooldownRemaining));
        }
    }

    // Extract the actual message (remove the mention)
    const content = message.content
        .replace(/<@!?\d+>/g, '') // Remove mentions
        .trim();

    // If empty message after removing mention
    if (!content) {
        return await message.reply("You summoned Beboa but said nothing? How rude! Speak, mortal~");
    }

    // Limit message length
    if (content.length > 500) {
        return await message.reply("Hsssss... that's too many words, mortal! Keep it under 500 characters~");
    }

    // Show typing indicator
    await message.channel.sendTyping();

    try {
        // Check for admin commands first (Jarvis-style)
        if (isAdmin) {
            const adminResult = await parseAndExecuteAdminCommand(content, {
                userId,
                displayName,
                channelId: message.channel.id,
                guild: message.guild
            });

            if (adminResult.matched) {
                // Handle special actions
                if (adminResult.result?.action === 'announce') {
                    // TODO: Send to announcement channel
                }
                await message.reply(adminResult.result.message);

                // Set cooldown
                if (!isBebe) setMentionCooldown(userId);
                return;
            }
        }

        // Get user data for context
        const userData = getUser(userId);

        // Fetch channel context (past 20 messages)
        let channelContext = '';
        if (config.CHANNEL_CONTEXT_LIMIT > 0) {
            const recentMessages = await fetchChannelContext(message.channel, config.CHANNEL_CONTEXT_LIMIT);
            channelContext = buildChannelContextString(recentMessages, message.client.user.id);
        }

        // Get memory context
        let memoryContext = '';
        if (config.MEMORY_ENABLED) {
            memoryContext = await buildMemoryContext(userId, content);
        }

        // Get server-wide memory context (ambient awareness)
        let serverMemoryContext = '';
        if (config.SERVER_MEMORY_ENABLED && message.guild) {
            serverMemoryContext = await buildServerMemoryContext(
                message.guild.id,
                message.channel.id,
                content,
                userId
            );
        }

        // Get dynamic personality state and relationship
        const personalityState = getPersonalityState();
        const relationship = getRelationship(userId);
        const personalityPrompt = buildPersonalityPrompt(userId);

        // Build full system prompt with all context
        const fullSystemPrompt = buildFullContext({
            userData,
            displayName,
            memoryContext,
            serverMemoryContext,
            channelContext,
            personalityTraits: personalityState.effectiveTraits,
            personalityPrompt,
            relationship,
            isAdmin: isBebe
        });

        // Build messages array
        const messages = buildMentionMessageArray(fullSystemPrompt, displayName, content);

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
                    channelId: message.channel.id,
                    recentMessages: channelContext ? await fetchChannelContext(message.channel) : []
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
            console.error(`[MENTION] API failed for ${message.author.tag}:`, result.error);
            return await message.reply(getErrorMessage());
        }

        // Update shared history
        updateSharedHistory(displayName, content, result.content);

        // Store in persistent chat history
        addChatMessage(displayName, content, 'user');
        addChatMessage('Beboa', result.content, 'assistant');

        // Auto-extract memories if applicable
        if (config.MEMORY_ENABLED && shouldExtractMemory(content)) {
            extractAndStoreMemories(userId, displayName, content, result.content, {
                channelId: message.channel.id,
                messageId: message.id
            }).catch(e => console.error('[MEMORY] Extraction failed:', e));
        }

        // Process interaction for personality evolution
        processInteraction(userId, displayName, content, result.content, {
            channelId: message.channel.id
        }).catch(e => console.error('[PERSONALITY] Processing failed:', e));

        // Set cooldown
        if (!isBebe) setMentionCooldown(userId);

        console.log(`[MENTION] ${message.author.tag}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}" -> Response sent`);

        // Check for image URLs in tool results and attach
        const responseContent = result.content;

        // Handle long responses
        if (responseContent.length > 2000) {
            const chunks = splitMessage(responseContent);
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(responseContent);
        }

    } catch (error) {
        console.error('[MENTION] Error:', error);
        await message.reply(getErrorMessage());
    }
}

/**
 * Build the messages array for the API call
 * Uses SHARED history so Beboa remembers all users naturally
 */
function buildMentionMessageArray(systemPrompt, displayName, content) {
    // Get shared conversation history (all users together)
    const history = getSharedHistory();

    // Also get persistent history from database
    const dbHistory = getChatHistory((config.CHAT_MAX_HISTORY || 10) * 2);

    // Merge histories, preferring in-memory for recent, DB for older
    const mergedHistory = mergeHistories(history, dbHistory);

    // Construct messages array
    const messages = [{ role: 'system', content: systemPrompt }];

    // Add merged conversation history - each message tagged with who said it
    mergedHistory.forEach(msg => {
        const name = msg.displayName || msg.display_name;
        if (msg.role === 'user') {
            messages.push({ role: 'user', content: `[${name}]: ${msg.content}` });
        } else {
            messages.push({ role: 'assistant', content: msg.content });
        }
    });

    // Add current message with user identification
    messages.push({ role: 'user', content: `[${displayName}]: ${content}` });
    return messages;
}

/**
 * Merge in-memory and database histories
 */
function mergeHistories(inMemory, fromDb) {
    // If in-memory has recent messages, prioritize those
    if (inMemory.length > 0) {
        // Find messages in DB that aren't in memory (older)
        const memoryContents = new Set(inMemory.map(m => m.content));
        const olderFromDb = fromDb.filter(m => !memoryContents.has(m.content));

        // Combine older DB messages with newer memory messages
        return [...olderFromDb.slice(0, 10), ...inMemory].slice(-(config.CHAT_MAX_HISTORY || 10) * 2);
    }
    return fromDb;
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

        // Find a good break point
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
