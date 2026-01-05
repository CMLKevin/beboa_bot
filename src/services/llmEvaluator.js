/**
 * LLM Evaluator Service
 *
 * Centralized LLM-powered evaluation for:
 * - Mood detection and analysis
 * - Relationship quality assessment
 * - Jarvis intent parsing
 *
 * Uses x-ai/grok-4.1-fast via OpenRouter
 */

import config from '../config.js';

// Configuration (from config, with fallbacks)
const EVALUATOR_MODEL = config.LLM_EVALUATOR_MODEL || 'x-ai/grok-4.1-fast';
const EVALUATOR_TEMPERATURE = 0.1;  // Deterministic for consistent evaluations
const EVALUATOR_MAX_TOKENS = 500;
const CACHE_TTL = config.LLM_EVALUATOR_CACHE_TTL || 60000;  // 1 minute cache
const RATE_LIMIT_CALLS = config.LLM_EVALUATOR_RATE_LIMIT || 30;
const RATE_LIMIT_WINDOW = 60000;  // 1 minute
const EVALUATOR_ENABLED = config.LLM_EVALUATOR_ENABLED !== false;

// Rate limiting state
const rateLimitState = {
    calls: [],
    queue: []
};

// Response cache
const responseCache = new Map();

/**
 * Hash content for caching
 */
function hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

/**
 * Check and update rate limit
 */
function checkRateLimit() {
    const now = Date.now();
    // Remove old calls outside the window
    rateLimitState.calls = rateLimitState.calls.filter(t => now - t < RATE_LIMIT_WINDOW);

    if (rateLimitState.calls.length >= RATE_LIMIT_CALLS) {
        return false;
    }

    rateLimitState.calls.push(now);
    return true;
}

/**
 * Make LLM API call with caching and rate limiting
 */
async function callLLM(systemPrompt, userPrompt, cacheKey = null) {
    // Check cache first
    if (cacheKey) {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.response;
        }
    }

    // Check rate limit
    if (!checkRateLimit()) {
        console.log('[LLM_EVALUATOR] Rate limited, using fallback');
        return null;
    }

    // Check if OpenRouter is configured
    if (!config.OPENROUTER_API_KEY) {
        console.log('[LLM_EVALUATOR] OpenRouter not configured');
        return null;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/CMLKevin/beboa_evo',
                'X-Title': 'Beboa Discord Bot - LLM Evaluator'
            },
            body: JSON.stringify({
                model: EVALUATOR_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: EVALUATOR_TEMPERATURE,
                max_tokens: EVALUATOR_MAX_TOKENS,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            console.error('[LLM_EVALUATOR] API error:', response.status);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('[LLM_EVALUATOR] No content in response');
            return null;
        }

        // Parse JSON response
        const parsed = JSON.parse(content);

        // Cache the response
        if (cacheKey) {
            responseCache.set(cacheKey, {
                response: parsed,
                timestamp: Date.now()
            });
        }

        return parsed;

    } catch (error) {
        console.error('[LLM_EVALUATOR] Error:', error.message);
        return null;
    }
}

// ============================================================================
// MOOD EVALUATOR
// ============================================================================

const MOOD_SYSTEM_PROMPT = `You are an emotional analysis system for a Discord bot named Beboa (a sassy snake character).
Analyze the user's message to detect emotional tone and suggest an appropriate mood response.

Available moods: neutral, happy, annoyed, mischievous, protective, flustered, bored, energetic, melancholic, competitive, smug, soft

Guidelines:
- "flustered" for compliments or affection that makes Beboa embarrassed
- "protective" when user shows vulnerability or needs comfort
- "mischievous" for playful teasing or jokes
- "competitive" when challenged or during rivalries
- "annoyed" for rude or dismissive messages
- "soft" for genuine emotional moments
- Detect sarcasm - it should NOT trigger negative moods if playful

Return valid JSON only.`;

/**
 * Evaluate mood from a message using LLM
 * @param {string} message - The user's message
 * @param {object} context - Context about the user
 * @returns {object|null} Mood analysis or null if fallback needed
 */
export async function evaluateMood(message, context = {}) {
    const { relationshipStage = 'stranger', currentMood = 'neutral' } = context;

    const cacheKey = `mood_${hashContent(message + relationshipStage + currentMood)}`;

    const userPrompt = `Analyze this Discord message for emotional content.

Message: "${message}"
Author relationship stage: ${relationshipStage}
Current bot mood: ${currentMood}

Return JSON:
{
  "sentiment": <number from -1.0 to 1.0>,
  "dominantEmotion": "<happy|sad|angry|playful|vulnerable|challenging|neutral>",
  "suggestedMood": "<one of the available moods>",
  "moodConfidence": <number from 0.0 to 1.0>,
  "triggerReason": "<brief explanation>",
  "detectedPatterns": {
    "isChallenge": <boolean>,
    "isCompliment": <boolean>,
    "isPlayful": <boolean>,
    "isVulnerable": <boolean>,
    "isRude": <boolean>,
    "isSarcastic": <boolean>
  }
}`;

    const result = await callLLM(MOOD_SYSTEM_PROMPT, userPrompt, cacheKey);

    if (result) {
        // Validate and clamp values
        return {
            sentiment: Math.max(-1, Math.min(1, result.sentiment || 0)),
            dominantEmotion: result.dominantEmotion || 'neutral',
            suggestedMood: result.suggestedMood || 'neutral',
            moodConfidence: Math.max(0, Math.min(1, result.moodConfidence || 0.5)),
            triggerReason: result.triggerReason || '',
            detectedPatterns: {
                isChallenge: !!result.detectedPatterns?.isChallenge,
                isCompliment: !!result.detectedPatterns?.isCompliment,
                isPlayful: !!result.detectedPatterns?.isPlayful,
                isVulnerable: !!result.detectedPatterns?.isVulnerable,
                isRude: !!result.detectedPatterns?.isRude,
                isSarcastic: !!result.detectedPatterns?.isSarcastic
            }
        };
    }

    return null;  // Signal to use fallback
}

// ============================================================================
// RELATIONSHIP EVALUATOR
// ============================================================================

const RELATIONSHIP_SYSTEM_PROMPT = `You are a relationship dynamics analyzer for a Discord bot named Beboa.
Evaluate the quality and emotional significance of user-bot interactions.

Guidelines for deltas:
- Most interactions should have small deltas (±0.01 range)
- Meaningful conversations: affection +0.02-0.03
- Vulnerability shared: trust +0.02-0.03
- Rude/hostile: affection -0.02-0.03
- Playful rivalry: rivalry +0.01-0.02
- Deep emotional moments: can go up to ±0.05

Never suggest deltas outside the -0.05 to +0.05 range.
Familiarity should always be positive (0.005 to 0.02).

Return valid JSON only.`;

/**
 * Evaluate relationship impact from an interaction
 * @param {string} userMessage - The user's message
 * @param {string} botResponse - Beboa's response
 * @param {object} context - Current relationship state
 * @returns {object|null} Relationship deltas or null if fallback needed
 */
export async function evaluateRelationship(userMessage, botResponse, context = {}) {
    const {
        stage = 'stranger',
        affection = 0.3,
        trust = 0.3,
        familiarity = 0.1,
        rivalry = 0
    } = context;

    const cacheKey = `rel_${hashContent(userMessage + botResponse + stage)}`;

    const userPrompt = `Evaluate this interaction for relationship development.

User message: "${userMessage}"
Bot response: "${botResponse}"
Current relationship:
- Stage: ${stage}
- Affection: ${affection.toFixed(2)}
- Trust: ${trust.toFixed(2)}
- Familiarity: ${familiarity.toFixed(2)}
- Rivalry: ${rivalry.toFixed(2)}

Return JSON:
{
  "interactionQuality": "<shallow|normal|meaningful|deep>",
  "emotionalDepth": <number from 0.0 to 1.0>,
  "trustIndicators": {
    "sharedVulnerability": <boolean>,
    "askedForHelp": <boolean>,
    "showedCare": <boolean>,
    "wasHonest": <boolean>
  },
  "relationshipDeltas": {
    "affection": <number from -0.05 to 0.05>,
    "trust": <number from -0.03 to 0.03>,
    "familiarity": <number from 0.005 to 0.02>,
    "rivalry": <number from -0.02 to 0.02>
  },
  "suggestedInsideJoke": <null or string if a potential inside joke was detected>,
  "noteworthyMoment": <null or string describing something memorable>,
  "reasoning": "<brief explanation>"
}`;

    const result = await callLLM(RELATIONSHIP_SYSTEM_PROMPT, userPrompt, cacheKey);

    if (result) {
        // Validate and clamp deltas to prevent exploitation
        const deltas = result.relationshipDeltas || {};
        return {
            interactionQuality: result.interactionQuality || 'normal',
            emotionalDepth: Math.max(0, Math.min(1, result.emotionalDepth || 0.3)),
            trustIndicators: {
                sharedVulnerability: !!result.trustIndicators?.sharedVulnerability,
                askedForHelp: !!result.trustIndicators?.askedForHelp,
                showedCare: !!result.trustIndicators?.showedCare,
                wasHonest: !!result.trustIndicators?.wasHonest
            },
            relationshipDeltas: {
                affection: Math.max(-0.05, Math.min(0.05, deltas.affection || 0.005)),
                trust: Math.max(-0.03, Math.min(0.03, deltas.trust || 0.002)),
                familiarity: Math.max(0.005, Math.min(0.02, deltas.familiarity || 0.01)),
                rivalry: Math.max(-0.02, Math.min(0.02, deltas.rivalry || 0))
            },
            suggestedInsideJoke: result.suggestedInsideJoke || null,
            noteworthyMoment: result.noteworthyMoment || null,
            reasoning: result.reasoning || ''
        };
    }

    return null;  // Signal to use fallback
}

// ============================================================================
// JARVIS INTENT PARSER
// ============================================================================

const JARVIS_SYSTEM_PROMPT = `You are a natural language command parser for Beboa Discord bot's admin mode (Jarvis Mode).
Parse user messages to identify admin commands and extract parameters.

Available commands:
- give_bebits: Award currency (params: targetUserId, amount)
- remove_bebits: Deduct currency (params: targetUserId, amount)
- set_bebits: Set exact balance (params: targetUserId, amount)
- transfer_bebits: Move between users (params: fromUserId, toUserId, amount)
- reset_streak: Clear check-in streak (params: targetUserId)
- user_info: Get user statistics (params: targetUserId)
- compare_users: Compare two users (params: userId1, userId2)
- server_stats: Server-wide statistics (no params)
- set_mood: Change bot mood (params: moodName - one of: neutral, happy, annoyed, mischievous, protective, flustered, competitive, soft)
- bonk: Send to horny jail (params: targetUserId)
- shame: Public ridicule (params: targetUserId, reason)
- praise: Public praise (params: targetUserId, reason)
- roast: Playful roast (params: targetUserId)
- simp_check: Analyze simp level (params: targetUserId)
- fortune: Fortune telling (params: targetUserId)
- compatibility: Ship compatibility (params: userId1, userId2)
- spin_wheel: Random wheel spin (params: options as text)
- announce: Server announcement (params: message text)
- jarvis_help: Show available commands (no params)

Parse casual language:
- "give @user 100 bebits" → give_bebits
- "yeet 50 coins to @user" → give_bebits
- "check @user's stats" → user_info
- "who's the bigger simp, @user1 or @user2" → compare_users
- "roast that fool @user" → roast

Extract user IDs from mentions like <@123456789> or raw IDs.
If a command needs confirmation for dangerous operations (remove_bebits, reset_streak), set requiresConfirmation to true.

Return valid JSON only.`;

/**
 * Parse Jarvis intent from a message using LLM
 * @param {string} message - The admin's message
 * @param {object} context - Context about recent commands
 * @returns {object|null} Parsed intent or null if fallback needed
 */
export async function parseJarvisIntent(message, context = {}) {
    const { recentCommands = [], userId = null } = context;

    const cacheKey = `jarvis_${hashContent(message)}`;

    const contextStr = recentCommands.length > 0
        ? `Recent commands: ${recentCommands.slice(-3).join(', ')}`
        : 'No recent command context';

    const userPrompt = `Parse this admin command for Beboa Discord bot.

Message: "${message}"
${contextStr}

Return JSON:
{
  "isCommand": <boolean - true if this looks like an admin command>,
  "command": "<command_name or null if not a command>",
  "confidence": <number from 0.0 to 1.0>,
  "params": {
    "targetUserId": "<extracted user ID or null>",
    "userId1": "<for compare/compat - first user ID>",
    "userId2": "<for compare/compat - second user ID>",
    "fromUserId": "<for transfer - source user>",
    "toUserId": "<for transfer - destination user>",
    "amount": <number or null>,
    "text": "<any text content like reason or message>",
    "moodName": "<for set_mood command>"
  },
  "requiresConfirmation": <boolean - true for dangerous operations>,
  "clarificationNeeded": <null or string with question to ask user>,
  "reasoning": "<brief explanation of parsing>"
}`;

    const result = await callLLM(JARVIS_SYSTEM_PROMPT, userPrompt, cacheKey);

    if (result) {
        return {
            isCommand: !!result.isCommand,
            command: result.command || null,
            confidence: Math.max(0, Math.min(1, result.confidence || 0)),
            params: {
                targetUserId: extractUserId(result.params?.targetUserId),
                userId1: extractUserId(result.params?.userId1),
                userId2: extractUserId(result.params?.userId2),
                fromUserId: extractUserId(result.params?.fromUserId),
                toUserId: extractUserId(result.params?.toUserId),
                amount: typeof result.params?.amount === 'number' ? result.params.amount : null,
                text: result.params?.text || null,
                moodName: result.params?.moodName || null
            },
            requiresConfirmation: !!result.requiresConfirmation,
            clarificationNeeded: result.clarificationNeeded || null,
            reasoning: result.reasoning || ''
        };
    }

    return null;  // Signal to use fallback
}

/**
 * Extract and validate user ID from various formats
 */
function extractUserId(value) {
    if (!value) return null;

    // Handle mention format <@123456789> or <@!123456789>
    const mentionMatch = String(value).match(/<@!?(\d+)>/);
    if (mentionMatch) return mentionMatch[1];

    // Handle raw ID (17-20 digits)
    const idMatch = String(value).match(/^(\d{17,20})$/);
    if (idMatch) return idMatch[1];

    // Check if the value itself is a valid ID
    if (/^\d{17,20}$/.test(value)) return value;

    return null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear the response cache
 */
export function clearCache() {
    responseCache.clear();
    console.log('[LLM_EVALUATOR] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return {
        size: responseCache.size,
        rateLimitCalls: rateLimitState.calls.length,
        rateLimitRemaining: RATE_LIMIT_CALLS - rateLimitState.calls.length
    };
}

/**
 * Check if LLM evaluator is available
 */
export function isAvailable() {
    return EVALUATOR_ENABLED && !!config.OPENROUTER_API_KEY && checkRateLimit();
}
