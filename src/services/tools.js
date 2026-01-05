/**
 * Tool Framework
 * Extensible framework for AI tool calls
 * Supports image generation, web search, and custom tools
 */

import { config } from '../config.js';
import db from '../database.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Prepared statement for logging tool usage
const logToolUsage = db.prepare(`
    INSERT INTO tool_usage (user_id, tool_name, input_data, output_data, success, error_message, execution_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Tool registry - all available tools
 */
const tools = new Map();

/**
 * Tool definition schema for OpenRouter/OpenAI function calling
 */
export const toolDefinitions = [];

/**
 * Register a new tool
 * @param {Object} tool
 * @param {string} tool.name - Tool name
 * @param {string} tool.description - What the tool does
 * @param {Object} tool.parameters - JSON schema for parameters
 * @param {Function} tool.execute - Async function to execute the tool
 * @param {boolean} tool.requiresAdmin - Whether tool requires admin permission
 */
export function registerTool({ name, description, parameters, execute, requiresAdmin = false }) {
    tools.set(name, { name, description, parameters, execute, requiresAdmin });

    // Add to tool definitions for API
    toolDefinitions.push({
        type: 'function',
        function: {
            name,
            description,
            parameters
        }
    });

    console.log(`[TOOLS] Registered: ${name}`);
}

/**
 * Execute a tool by name
 * @param {string} toolName - Name of the tool
 * @param {Object} args - Tool arguments
 * @param {Object} context - Execution context (userId, etc.)
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function executeTool(toolName, args, context = {}) {
    const tool = tools.get(toolName);

    if (!tool) {
        return { success: false, error: `Unknown tool: ${toolName}` };
    }

    // Check admin requirement
    if (tool.requiresAdmin && !context.isAdmin) {
        return { success: false, error: 'This tool requires admin permission' };
    }

    const startTime = Date.now();

    try {
        const result = await tool.execute(args, context);
        const executionTime = Date.now() - startTime;

        // Log usage
        try {
            logToolUsage.run(
                context.userId || 'system',
                toolName,
                JSON.stringify(args),
                JSON.stringify(result),
                1,
                null,
                executionTime
            );
        } catch (logError) {
            console.error('[TOOLS] Failed to log usage:', logError);
        }

        console.log(`[TOOLS] ${toolName} executed in ${executionTime}ms`);

        return { success: true, result };

    } catch (error) {
        const executionTime = Date.now() - startTime;

        // Log failure
        try {
            logToolUsage.run(
                context.userId || 'system',
                toolName,
                JSON.stringify(args),
                null,
                0,
                error.message,
                executionTime
            );
        } catch (logError) {
            console.error('[TOOLS] Failed to log usage:', logError);
        }

        console.error(`[TOOLS] ${toolName} failed:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all registered tools
 */
export function getRegisteredTools() {
    return Array.from(tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        requiresAdmin: t.requiresAdmin
    }));
}

/**
 * Chat completion with tool calling support
 * @param {Array} messages - Message array
 * @param {Object} options - API options
 * @returns {Promise<Object>}
 */
export async function chatWithTools(messages, options = {}) {
    if (!config.OPENROUTER_API_KEY) {
        return { success: false, error: 'OpenRouter not configured' };
    }

    const requestBody = {
        model: options.model || config.OPENROUTER_MODEL,
        messages,
        max_tokens: options.maxTokens || config.OPENROUTER_MAX_TOKENS,
        temperature: options.temperature || config.OPENROUTER_TEMPERATURE,
    };

    // Add tools if available and enabled
    if (toolDefinitions.length > 0 && options.enableTools !== false) {
        requestBody.tools = toolDefinitions;
        requestBody.tool_choice = 'auto';
    }

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://discord.gg/bubblebebe',
                'X-Title': 'Beboa Discord Bot'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[TOOLS] API Error:', response.status, errorData);
            return { success: false, error: `API returned ${response.status}`, errorData };
        }

        const data = await response.json();
        const message = data.choices?.[0]?.message;

        if (!message) {
            return { success: false, error: 'No message in response' };
        }

        // Check for tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
            return {
                success: true,
                hasToolCalls: true,
                toolCalls: message.tool_calls,
                content: message.content,
                usage: data.usage
            };
        }

        return {
            success: true,
            hasToolCalls: false,
            content: message.content,
            usage: data.usage
        };

    } catch (error) {
        console.error('[TOOLS] Request failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Process tool calls from AI response
 * @param {Array} toolCalls - Tool calls from AI
 * @param {Object} context - Execution context
 * @returns {Promise<Array>}
 */
export async function processToolCalls(toolCalls, context = {}) {
    const results = [];

    for (const call of toolCalls) {
        const name = call.function?.name;
        let args = {};

        try {
            args = JSON.parse(call.function?.arguments || '{}');
        } catch (e) {
            args = {};
        }

        const result = await executeTool(name, args, context);
        results.push({
            tool_call_id: call.id,
            role: 'tool',
            content: JSON.stringify(result)
        });
    }

    return results;
}

// ============================================
// BUILT-IN TOOLS
// ============================================

/**
 * Image Generation Tool (using OpenRouter)
 */
registerTool({
    name: 'generate_image',
    description: 'Generate an image based on a text description. Use this when users ask for images, art, pictures, or visual content.',
    parameters: {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'Detailed description of the image to generate'
            },
            style: {
                type: 'string',
                enum: ['realistic', 'anime', 'cartoon', 'artistic', 'fantasy'],
                description: 'Art style for the image'
            }
        },
        required: ['prompt']
    },
    execute: async (args, context) => {
        const { prompt, style = 'artistic' } = args;

        // Use OpenRouter image generation model
        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://discord.gg/bubblebebe',
                'X-Title': 'Beboa Discord Bot'
            },
            body: JSON.stringify({
                model: config.IMAGE_MODEL,
                prompt: `${style} style: ${prompt}`,
                n: 1,
                size: '1024x1024'
            })
        });

        if (!response.ok) {
            throw new Error(`Image generation failed: ${response.status}`);
        }

        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error('No image URL in response');
        }

        return {
            imageUrl,
            prompt,
            style
        };
    }
});

/**
 * Memory Recall Tool
 */
registerTool({
    name: 'recall_memory',
    description: 'Search Beboa\'s memories about users or past conversations. Use when someone asks "do you remember" or references past interactions.',
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'What to search for in memories'
            },
            userId: {
                type: 'string',
                description: 'Discord user ID to filter memories (optional)'
            }
        },
        required: ['query']
    },
    execute: async (args, context) => {
        const { searchMemories } = await import('./memory.js');
        const memories = await searchMemories(args.query, {
            userId: args.userId || context.userId,
            limit: 5
        });
        return { memories };
    }
});

/**
 * Save Memory Tool
 */
registerTool({
    name: 'save_memory',
    description: 'Save something important to remember about a user. Use when users share personal info, preferences, or notable events.',
    parameters: {
        type: 'object',
        properties: {
            content: {
                type: 'string',
                description: 'The memory to save'
            },
            memoryType: {
                type: 'string',
                enum: ['fact', 'preference', 'event', 'relationship', 'joke'],
                description: 'Type of memory'
            },
            importance: {
                type: 'number',
                description: 'Importance score 0-1'
            }
        },
        required: ['content']
    },
    execute: async (args, context) => {
        const { storeMemory, MemoryTypes } = await import('./memory.js');
        const result = await storeMemory({
            userId: context.userId,
            memoryType: args.memoryType || MemoryTypes.FACT,
            content: args.content,
            importance: args.importance || 0.5,
            sourceType: 'tool_call',
            metadata: { savedBy: 'beboa_ai' }
        });
        return result;
    }
});

/**
 * Channel Context Tool
 */
registerTool({
    name: 'get_channel_context',
    description: 'Get recent messages from the current channel for context.',
    parameters: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Number of messages to retrieve (max 20)'
            }
        }
    },
    execute: async (args, context) => {
        // This will be filled in by the message handler
        if (!context.recentMessages) {
            return { messages: [], note: 'Channel context not available' };
        }
        return { messages: context.recentMessages };
    }
});

/**
 * Server Stats Tool
 */
registerTool({
    name: 'get_server_stats',
    description: 'Get statistics about the server, bebits, and leaderboard.',
    parameters: {
        type: 'object',
        properties: {}
    },
    execute: async (args, context) => {
        const { getStats, getTopUsers } = await import('../database.js');
        const stats = getStats();
        const topUsers = getTopUsers(5);
        return { stats, topUsers };
    }
});

export default {
    registerTool,
    executeTool,
    getRegisteredTools,
    chatWithTools,
    processToolCalls,
    toolDefinitions
};
