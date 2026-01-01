/**
 * OpenRouter API Service
 * Handles communication with OpenRouter for AI chat functionality
 */

import { config } from '../config.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Check if OpenRouter is configured and available
 * @returns {boolean} True if API key is configured
 */
export function isOpenRouterConfigured() {
    return !!(config.OPENROUTER_API_KEY && config.CHAT_ENABLED);
}

/**
 * Send a chat completion request to OpenRouter
 *
 * @param {Array} messages - Array of message objects {role: 'user'|'assistant'|'system', content: string}
 * @param {Object} options - Optional overrides for API parameters
 * @returns {Promise<Object>} Response object with content or error
 */
export async function chatCompletion(messages, options = {}) {
    if (!isOpenRouterConfigured()) {
        return {
            success: false,
            error: 'OpenRouter not configured',
            content: null
        };
    }

    const requestBody = {
        model: options.model || config.OPENROUTER_MODEL,
        messages: messages,
        max_tokens: options.maxTokens || config.OPENROUTER_MAX_TOKENS,
        temperature: options.temperature || config.OPENROUTER_TEMPERATURE,
    };

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
            console.error('[OPENROUTER] API Error:', response.status, errorData);

            return {
                success: false,
                error: `API returned ${response.status}`,
                errorData,
                content: null
            };
        }

        const data = await response.json();

        // Extract the assistant's response
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('[OPENROUTER] No content in response:', data);
            return {
                success: false,
                error: 'No content in response',
                content: null
            };
        }

        // Log usage for monitoring
        if (data.usage) {
            console.log(`[OPENROUTER] Tokens used: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
        }

        return {
            success: true,
            content: content,
            usage: data.usage || null,
            model: data.model || config.OPENROUTER_MODEL
        };

    } catch (error) {
        console.error('[OPENROUTER] Request failed:', error);
        return {
            success: false,
            error: error.message,
            content: null
        };
    }
}

/**
 * Get current model info (useful for debugging/status)
 * @returns {Object} Model configuration info
 */
export function getModelInfo() {
    return {
        configured: isOpenRouterConfigured(),
        model: config.OPENROUTER_MODEL,
        maxTokens: config.OPENROUTER_MAX_TOKENS,
        temperature: config.OPENROUTER_TEMPERATURE
    };
}

export default {
    isOpenRouterConfigured,
    chatCompletion,
    getModelInfo
};
