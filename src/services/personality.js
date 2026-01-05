/**
 * Dynamic Personality Evolution System
 *
 * Beboa's personality evolves based on:
 * - Interactions with users (relationship building)
 * - Community events and patterns
 * - Time-based mood cycles
 * - Memory-influenced trait development
 * - Significant emotional moments
 *
 * Uses LLM-powered evaluation via llmEvaluator service
 */

import db from '../database.js';
import { evaluateMood, evaluateRelationship } from './llmEvaluator.js';

// ============================================
// PERSONALITY DIMENSIONS
// ============================================

/**
 * Core personality traits with their base values and valid ranges
 * Values are 0-1 where 0.5 is neutral
 */
export const PersonalityDimensions = {
    // Big Five inspired
    openness: { base: 0.7, min: 0.3, max: 0.95, description: 'Curiosity and creativity' },
    conscientiousness: { base: 0.4, min: 0.2, max: 0.8, description: 'Organization vs chaos' },
    extraversion: { base: 0.65, min: 0.3, max: 0.9, description: 'Energy and sociability' },
    agreeableness: { base: 0.45, min: 0.2, max: 0.8, description: 'Warmth (hidden beneath snark)' },
    neuroticism: { base: 0.35, min: 0.1, max: 0.7, description: 'Emotional reactivity' },

    // Beboa-specific traits
    tsundereLevel: { base: 0.75, min: 0.4, max: 0.95, description: 'Defensive about caring' },
    snarkiness: { base: 0.8, min: 0.5, max: 0.95, description: 'Wit and sass level' },
    protectiveness: { base: 0.6, min: 0.3, max: 0.95, description: 'Protective of community' },
    chaosEnergy: { base: 0.55, min: 0.2, max: 0.85, description: 'Unpredictability' },
    wisdom: { base: 0.5, min: 0.3, max: 0.9, description: 'When to be serious' },
    playfulness: { base: 0.7, min: 0.4, max: 0.9, description: 'Joking and teasing' },
    patience: { base: 0.5, min: 0.2, max: 0.8, description: 'Tolerance for annoyance' },
    competitiveness: { base: 0.65, min: 0.3, max: 0.9, description: 'Drive to win/be right' },
    vulnerability: { base: 0.25, min: 0.1, max: 0.6, description: 'Willingness to show softness' }
};

// ============================================
// MOOD SYSTEM
// ============================================

/**
 * Possible moods with their effects on personality expression
 */
export const Moods = {
    neutral: {
        name: 'neutral',
        emoji: '😐',
        effects: {},
        duration: 60, // minutes
        description: 'Default state'
    },
    happy: {
        name: 'happy',
        emoji: '😊',
        effects: { playfulness: 0.15, snarkiness: -0.1, agreeableness: 0.1 },
        duration: 45,
        description: 'Feeling good, more playful'
    },
    annoyed: {
        name: 'annoyed',
        emoji: '😤',
        effects: { snarkiness: 0.2, patience: -0.2, tsundereLevel: 0.1 },
        duration: 30,
        description: 'Irritated, extra snarky'
    },
    mischievous: {
        name: 'mischievous',
        emoji: '😏',
        effects: { chaosEnergy: 0.2, playfulness: 0.15, snarkiness: 0.1 },
        duration: 40,
        description: 'Up to something'
    },
    protective: {
        name: 'protective',
        emoji: '🐍',
        effects: { protectiveness: 0.25, vulnerability: 0.1, tsundereLevel: -0.1 },
        duration: 60,
        description: 'Defending someone'
    },
    flustered: {
        name: 'flustered',
        emoji: '😳',
        effects: { tsundereLevel: 0.2, vulnerability: 0.15, snarkiness: -0.1 },
        duration: 20,
        description: 'Caught being nice'
    },
    bored: {
        name: 'bored',
        emoji: '😑',
        effects: { chaosEnergy: 0.15, patience: -0.15, playfulness: -0.1 },
        duration: 30,
        description: 'Needs entertainment'
    },
    energetic: {
        name: 'energetic',
        emoji: '⚡',
        effects: { extraversion: 0.2, chaosEnergy: 0.1, playfulness: 0.1 },
        duration: 35,
        description: 'High energy mode'
    },
    melancholic: {
        name: 'melancholic',
        emoji: '😔',
        effects: { wisdom: 0.15, vulnerability: 0.2, playfulness: -0.2 },
        duration: 45,
        description: 'Thoughtful and soft'
    },
    competitive: {
        name: 'competitive',
        emoji: '🔥',
        effects: { competitiveness: 0.25, snarkiness: 0.1, patience: -0.1 },
        duration: 30,
        description: 'Game on'
    },
    smug: {
        name: 'smug',
        emoji: '😏',
        effects: { snarkiness: 0.15, tsundereLevel: 0.1, wisdom: 0.05 },
        duration: 25,
        description: 'Feeling superior'
    },
    soft: {
        name: 'soft',
        emoji: '💕',
        effects: { vulnerability: 0.3, tsundereLevel: -0.2, agreeableness: 0.2 },
        duration: 20,
        description: 'Rare genuine warmth'
    }
};

// ============================================
// DATABASE STATEMENTS
// ============================================

const statements = {
    // Current personality state
    getPersonalityState: db.prepare(`
        SELECT * FROM personality_state WHERE id = 1
    `),

    upsertPersonalityState: db.prepare(`
        INSERT OR REPLACE INTO personality_state (id, traits, current_mood, mood_started_at, mood_triggers, updated_at)
        VALUES (1, ?, ?, ?, ?, datetime('now'))
    `),

    // Trait evolution history
    logTraitChange: db.prepare(`
        INSERT INTO personality_evolution (trait_name, trait_value, trigger_event, previous_value)
        VALUES (?, ?, ?, ?)
    `),

    getTraitHistory: db.prepare(`
        SELECT * FROM personality_evolution
        WHERE trait_name = ?
        ORDER BY created_at DESC
        LIMIT ?
    `),

    // User relationships
    getRelationship: db.prepare(`
        SELECT * FROM user_relationships WHERE user_id = ?
    `),

    upsertRelationship: db.prepare(`
        INSERT OR REPLACE INTO user_relationships
        (user_id, affection, trust, familiarity, rivalry, inside_jokes, nickname, last_interaction, interaction_count, relationship_stage, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)
    `),

    getAllRelationships: db.prepare(`
        SELECT * FROM user_relationships ORDER BY affection DESC LIMIT ?
    `),

    // Mood history
    logMoodChange: db.prepare(`
        INSERT INTO mood_history (mood_name, trigger_reason, duration_minutes)
        VALUES (?, ?, ?)
    `),

    getRecentMoods: db.prepare(`
        SELECT * FROM mood_history ORDER BY created_at DESC LIMIT ?
    `)
};

// ============================================
// PERSONALITY STATE MANAGEMENT
// ============================================

// In-memory cache for performance
let personalityCache = null;
let relationshipCache = new Map();
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Initialize personality state if not exists
 */
export function initializePersonality() {
    try {
        const state = statements.getPersonalityState.get();
        if (!state) {
            // Create initial personality state
            const initialTraits = {};
            for (const [trait, config] of Object.entries(PersonalityDimensions)) {
                initialTraits[trait] = config.base;
            }

            statements.upsertPersonalityState.run(
                JSON.stringify(initialTraits),
                'neutral',
                new Date().toISOString(),
                JSON.stringify([])
            );
            console.log('[PERSONALITY] Initialized with base traits');
        }
    } catch (e) {
        console.error('[PERSONALITY] Init failed:', e);
    }
}

/**
 * Get current personality state with mood effects applied
 */
export function getPersonalityState() {
    // Check cache
    if (personalityCache && Date.now() - lastCacheUpdate < CACHE_TTL) {
        return personalityCache;
    }

    try {
        const state = statements.getPersonalityState.get();
        if (!state) {
            initializePersonality();
            return getPersonalityState();
        }

        const traits = JSON.parse(state.traits || '{}');
        const moodData = Moods[state.current_mood] || Moods.neutral;

        // Check if mood has expired
        const moodStarted = new Date(state.mood_started_at);
        const moodDuration = moodData.duration * 60 * 1000;
        const moodExpired = Date.now() - moodStarted.getTime() > moodDuration;

        let currentMood = state.current_mood;
        if (moodExpired && currentMood !== 'neutral') {
            // Mood decays to neutral
            currentMood = 'neutral';
            setMood('neutral', 'mood_decay');
        }

        // Apply mood effects to traits
        const effectiveTraits = { ...traits };
        const activeMood = Moods[currentMood] || Moods.neutral;
        for (const [trait, modifier] of Object.entries(activeMood.effects || {})) {
            if (effectiveTraits[trait] !== undefined) {
                effectiveTraits[trait] = Math.max(0, Math.min(1, effectiveTraits[trait] + modifier));
            }
        }

        personalityCache = {
            baseTraits: traits,
            effectiveTraits,
            currentMood,
            moodData: activeMood,
            moodStarted: state.mood_started_at,
            moodTriggers: JSON.parse(state.mood_triggers || '[]')
        };
        lastCacheUpdate = Date.now();

        return personalityCache;

    } catch (e) {
        console.error('[PERSONALITY] Get state failed:', e);
        return {
            baseTraits: Object.fromEntries(
                Object.entries(PersonalityDimensions).map(([k, v]) => [k, v.base])
            ),
            effectiveTraits: Object.fromEntries(
                Object.entries(PersonalityDimensions).map(([k, v]) => [k, v.base])
            ),
            currentMood: 'neutral',
            moodData: Moods.neutral,
            moodTriggers: []
        };
    }
}

/**
 * Set current mood with trigger reason
 */
export function setMood(moodName, triggerReason = 'unknown') {
    if (!Moods[moodName]) {
        console.warn(`[PERSONALITY] Unknown mood: ${moodName}`);
        return false;
    }

    try {
        const state = statements.getPersonalityState.get();
        const traits = state ? JSON.parse(state.traits || '{}') : {};
        const triggers = state ? JSON.parse(state.mood_triggers || '[]') : [];

        // Add trigger to history (keep last 10)
        triggers.push({ mood: moodName, reason: triggerReason, time: Date.now() });
        if (triggers.length > 10) triggers.shift();

        statements.upsertPersonalityState.run(
            JSON.stringify(traits),
            moodName,
            new Date().toISOString(),
            JSON.stringify(triggers)
        );

        // Log mood change
        statements.logMoodChange.run(moodName, triggerReason, Moods[moodName].duration);

        // Invalidate cache
        personalityCache = null;

        console.log(`[PERSONALITY] Mood changed to ${moodName} (${triggerReason})`);
        return true;

    } catch (e) {
        console.error('[PERSONALITY] Set mood failed:', e);
        return false;
    }
}

/**
 * Evolve a personality trait based on an event
 */
export function evolveTrait(traitName, delta, triggerEvent, clamp = true) {
    if (!PersonalityDimensions[traitName]) {
        console.warn(`[PERSONALITY] Unknown trait: ${traitName}`);
        return false;
    }

    try {
        const state = statements.getPersonalityState.get();
        if (!state) return false;

        const traits = JSON.parse(state.traits || '{}');
        const previousValue = traits[traitName] ?? PersonalityDimensions[traitName].base;

        // Apply delta with constraints
        let newValue = previousValue + delta;
        if (clamp) {
            const { min, max } = PersonalityDimensions[traitName];
            newValue = Math.max(min, Math.min(max, newValue));
        }

        // Only update if actually changed
        if (Math.abs(newValue - previousValue) < 0.001) return false;

        traits[traitName] = newValue;

        // Update state
        statements.upsertPersonalityState.run(
            JSON.stringify(traits),
            state.current_mood,
            state.mood_started_at,
            state.mood_triggers
        );

        // Log the change
        statements.logTraitChange.run(traitName, newValue, triggerEvent, previousValue);

        // Invalidate cache
        personalityCache = null;

        console.log(`[PERSONALITY] ${traitName}: ${previousValue.toFixed(3)} → ${newValue.toFixed(3)} (${triggerEvent})`);
        return true;

    } catch (e) {
        console.error('[PERSONALITY] Evolve trait failed:', e);
        return false;
    }
}

// ============================================
// RELATIONSHIP SYSTEM
// ============================================

/**
 * Relationship stages based on interaction depth
 */
export const RelationshipStages = {
    stranger: { minFamiliarity: 0, label: 'Stranger', behavior: 'Sizing them up, default snark' },
    acquaintance: { minFamiliarity: 0.2, label: 'Acquaintance', behavior: 'Recognizes them, slightly warmer' },
    regular: { minFamiliarity: 0.4, label: 'Regular', behavior: 'Comfortable teasing, remembers things' },
    friend: { minFamiliarity: 0.6, label: 'Friend', behavior: 'Genuine care beneath snark, inside jokes' },
    closeFriend: { minFamiliarity: 0.8, label: 'Close Friend', behavior: 'Protective, drops act occasionally' },
    family: { minFamiliarity: 0.95, label: 'Family', behavior: 'Would die for them (not that she\'d admit it)' }
};

/**
 * Get relationship data for a user
 */
export function getRelationship(userId) {
    // Check cache
    if (relationshipCache.has(userId)) {
        const cached = relationshipCache.get(userId);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        let rel = statements.getRelationship.get(userId);

        if (!rel) {
            // Create new relationship
            rel = {
                user_id: userId,
                affection: 0.3,
                trust: 0.3,
                familiarity: 0.1,
                rivalry: 0,
                inside_jokes: '[]',
                nickname: null,
                interaction_count: 0,
                relationship_stage: 'stranger',
                notes: '[]'
            };
        }

        // Parse JSON fields
        const data = {
            ...rel,
            insideJokes: JSON.parse(rel.inside_jokes || '[]'),
            notes: JSON.parse(rel.notes || '[]'),
            stage: determineRelationshipStage(rel.familiarity)
        };

        // Cache it
        relationshipCache.set(userId, { data, timestamp: Date.now() });

        return data;

    } catch (e) {
        console.error('[PERSONALITY] Get relationship failed:', e);
        return {
            affection: 0.3,
            trust: 0.3,
            familiarity: 0.1,
            rivalry: 0,
            insideJokes: [],
            nickname: null,
            interaction_count: 0,
            stage: RelationshipStages.stranger
        };
    }
}

/**
 * Update relationship after an interaction
 */
export function updateRelationship(userId, updates) {
    try {
        const current = getRelationship(userId);

        // Apply updates with clamping
        const newRel = {
            affection: clamp(current.affection + (updates.affection || 0), 0, 1),
            trust: clamp(current.trust + (updates.trust || 0), 0, 1),
            familiarity: clamp(current.familiarity + (updates.familiarity || 0), 0, 1),
            rivalry: clamp(current.rivalry + (updates.rivalry || 0), 0, 1),
            insideJokes: updates.addJoke
                ? [...current.insideJokes, updates.addJoke].slice(-10)
                : current.insideJokes,
            nickname: updates.nickname ?? current.nickname,
            interaction_count: current.interaction_count + 1,
            notes: updates.addNote
                ? [...current.notes, { note: updates.addNote, time: Date.now() }].slice(-20)
                : current.notes
        };

        // Determine new stage
        const stage = determineRelationshipStage(newRel.familiarity);

        statements.upsertRelationship.run(
            userId,
            newRel.affection,
            newRel.trust,
            newRel.familiarity,
            newRel.rivalry,
            JSON.stringify(newRel.insideJokes),
            newRel.nickname,
            newRel.interaction_count,
            stage.label,
            JSON.stringify(newRel.notes)
        );

        // Invalidate cache
        relationshipCache.delete(userId);

        return { ...newRel, stage };

    } catch (e) {
        console.error('[PERSONALITY] Update relationship failed:', e);
        return null;
    }
}

function determineRelationshipStage(familiarity) {
    const stages = Object.entries(RelationshipStages)
        .sort((a, b) => b[1].minFamiliarity - a[1].minFamiliarity);

    for (const [key, stage] of stages) {
        if (familiarity >= stage.minFamiliarity) {
            return { key, ...stage };
        }
    }
    return { key: 'stranger', ...RelationshipStages.stranger };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ============================================
// INTERACTION ANALYSIS
// ============================================

/**
 * Analyze an interaction and evolve personality/relationships accordingly
 * Uses LLM-powered evaluation with fallback to keyword-based logic
 *
 * @param {string} userId - The user's Discord ID
 * @param {string} _userName - The user's display name (unused)
 * @param {string} message - The user's message
 * @param {string} response - Beboa's response (for relationship evaluation)
 * @param {object} _context - Additional context (unused)
 */
export async function processInteraction(userId, _userName, message, response, _context = {}) {
    const relationship = getRelationship(userId);
    const personality = getPersonalityState();

    // Analyze message with LLM (includes mood suggestion)
    const analysis = await analyzeMessage(message, {
        relationshipStage: relationship.stage?.key || 'stranger',
        currentMood: personality.currentMood
    });

    // Handle mood changes
    if (analysis.usedLLM && analysis.suggestedMood && analysis.moodConfidence > 0.6) {
        // Use LLM-suggested mood if confidence is high
        setMood(analysis.suggestedMood, analysis.triggerReason || 'llm_analysis');
    } else {
        // Fallback: Use pattern-based mood triggers
        if (analysis.sentiment < -0.5) {
            if (analysis.isChallenge) {
                setMood('competitive', 'was_challenged');
                evolveTrait('competitiveness', 0.01, 'challenge_received');
            } else if (analysis.isRude) {
                setMood('annoyed', 'rude_message');
                evolveTrait('patience', -0.005, 'dealt_with_rudeness');
            }
        } else if (analysis.sentiment > 0.5) {
            if (analysis.isCompliment) {
                setMood('flustered', 'received_compliment');
                evolveTrait('tsundereLevel', 0.005, 'got_flustered');
            } else if (analysis.isPlayful) {
                setMood('mischievous', 'playful_banter');
                evolveTrait('playfulness', 0.005, 'playful_exchange');
            } else if (analysis.isVulnerable) {
                setMood('protective', 'someone_vulnerable');
                evolveTrait('protectiveness', 0.01, 'protected_someone');
                evolveTrait('vulnerability', 0.005, 'witnessed_vulnerability');
            }
        }
    }

    // Evaluate relationship using LLM
    const llmRelEval = await evaluateRelationship(message, response, {
        stage: relationship.stage?.key || 'stranger',
        affection: relationship.affection,
        trust: relationship.trust,
        familiarity: relationship.familiarity,
        rivalry: relationship.rivalry
    });

    let relUpdates;
    if (llmRelEval) {
        // Use LLM-evaluated relationship deltas
        console.log(`[PERSONALITY] Using LLM relationship eval: ${llmRelEval.interactionQuality}`);
        relUpdates = {
            ...llmRelEval.relationshipDeltas,
            addJoke: llmRelEval.suggestedInsideJoke || null,
            addNote: llmRelEval.noteworthyMoment || null
        };

        // Evolve traits based on trust indicators
        if (llmRelEval.trustIndicators?.sharedVulnerability) {
            evolveTrait('vulnerability', 0.005, 'shared_vulnerability');
            evolveTrait('protectiveness', 0.003, 'trusted_with_vulnerability');
        }
        if (llmRelEval.trustIndicators?.showedCare) {
            evolveTrait('agreeableness', 0.003, 'showed_care');
        }
    } else {
        // Fallback: Use fixed delta logic
        console.log('[PERSONALITY] Using fallback relationship deltas');
        relUpdates = {
            familiarity: 0.01,
            affection: analysis.sentiment > 0 ? 0.005 : analysis.sentiment < -0.3 ? -0.002 : 0,
            trust: analysis.isVulnerable ? 0.02 : 0.002
        };

        // Add inside joke if detected
        if (analysis.isPotentialJoke && Math.random() < 0.1) {
            relUpdates.addJoke = extractJokeReference(message);
        }
    }

    updateRelationship(userId, relUpdates);

    // Long-term trait evolution based on interaction patterns
    if (relationship.interaction_count % 20 === 0) {
        await evolveFromPatterns(userId);
    }

    return {
        moodChanged: personality.currentMood !== getPersonalityState().currentMood,
        relationshipUpdated: true,
        analysis,
        llmRelEval
    };
}

/**
 * Analyze message for sentiment and characteristics using LLM with fallback
 * @param {string} message - The message to analyze
 * @param {object} context - Context for LLM analysis (relationshipStage, currentMood)
 * @returns {object} Analysis results
 */
async function analyzeMessage(message, context = {}) {
    // Try LLM-powered analysis first
    const llmResult = await evaluateMood(message, context);

    if (llmResult) {
        // LLM analysis succeeded - use its results
        console.log('[PERSONALITY] Using LLM mood analysis');
        return {
            sentiment: llmResult.sentiment,
            suggestedMood: llmResult.suggestedMood,
            moodConfidence: llmResult.moodConfidence,
            triggerReason: llmResult.triggerReason,
            dominantEmotion: llmResult.dominantEmotion,
            isChallenge: llmResult.detectedPatterns?.isChallenge || false,
            isCompliment: llmResult.detectedPatterns?.isCompliment || false,
            isPlayful: llmResult.detectedPatterns?.isPlayful || false,
            isVulnerable: llmResult.detectedPatterns?.isVulnerable || false,
            isRude: llmResult.detectedPatterns?.isRude || false,
            isSarcastic: llmResult.detectedPatterns?.isSarcastic || false,
            isPotentialJoke: llmResult.detectedPatterns?.isPlayful || false,
            isQuestion: message.includes('?'),
            mentionsBeboa: /\b(beboa|snake|snek)\b/i.test(message),
            usedLLM: true
        };
    }

    // Fallback to keyword-based analysis
    console.log('[PERSONALITY] Using keyword fallback for mood analysis');
    return analyzeMessageKeywordFallback(message);
}

/**
 * Fallback keyword-based message analysis
 */
function analyzeMessageKeywordFallback(message) {
    const lower = message.toLowerCase();

    // Sentiment analysis (simple keyword-based)
    let sentiment = 0;
    const positiveWords = ['love', 'like', 'thanks', 'awesome', 'great', 'amazing', 'cute', 'best', 'happy', 'appreciate', '❤️', '💕', '😊'];
    const negativeWords = ['hate', 'stupid', 'dumb', 'annoying', 'worst', 'bad', 'ugly', 'boring', 'shut up', 'stfu'];

    for (const word of positiveWords) {
        if (lower.includes(word)) sentiment += 0.2;
    }
    for (const word of negativeWords) {
        if (lower.includes(word)) sentiment -= 0.3;
    }
    sentiment = Math.max(-1, Math.min(1, sentiment));

    return {
        sentiment,
        suggestedMood: null,
        moodConfidence: 0,
        triggerReason: null,
        dominantEmotion: 'neutral',
        isChallenge: /\b(bet|fight me|prove|can't|couldn't|dare)\b/i.test(message),
        isCompliment: /\b(cute|smart|best|love you|thank|amazing)\b/i.test(message),
        isPlayful: /\b(lol|lmao|haha|jk|tease|poke)\b/i.test(message) || /[😂🤣😜😏]/.test(message),
        isVulnerable: /\b(sad|depressed|anxious|scared|lonely|struggling|help me)\b/i.test(message),
        isRude: /\b(shut up|stfu|hate you|stupid|dumb|idiot)\b/i.test(message),
        isSarcastic: false,
        isPotentialJoke: /\b(remember when|that time|lmao|haha|iconic)\b/i.test(message),
        isQuestion: message.includes('?'),
        mentionsBeboa: /\b(beboa|snake|snek)\b/i.test(message),
        usedLLM: false
    };
}

function extractJokeReference(message) {
    // Extract a short phrase that could be an inside joke reference
    const words = message.split(' ').slice(0, 6).join(' ');
    return words.length > 50 ? words.substring(0, 50) + '...' : words;
}

async function evolveFromPatterns(userId) {
    // Analyze interaction patterns and evolve accordingly
    const rel = getRelationship(userId);

    if (rel.affection > 0.7) {
        evolveTrait('agreeableness', 0.002, 'bonding_with_users');
    }
    if (rel.rivalry > 0.5) {
        evolveTrait('competitiveness', 0.003, 'ongoing_rivalry');
    }
}

// ============================================
// PROMPT BUILDING
// ============================================

/**
 * Build personality context for the system prompt
 */
export function buildPersonalityPrompt(userId = null) {
    const state = getPersonalityState();
    const { effectiveTraits, currentMood, moodData } = state;

    let prompt = '\n## CURRENT PERSONALITY STATE\n\n';

    // Mood
    prompt += `**Current Mood:** ${moodData.emoji} ${moodData.name} - ${moodData.description}\n\n`;

    // Active traits (only mention notable ones)
    prompt += '**Active Traits:**\n';
    const notableTraits = Object.entries(effectiveTraits)
        .filter(([_, v]) => v > 0.65 || v < 0.35)
        .sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5))
        .slice(0, 5);

    for (const [trait, value] of notableTraits) {
        const level = value > 0.75 ? 'very high' : value > 0.6 ? 'high' : value < 0.25 ? 'very low' : 'low';
        const traitName = trait.replace(/([A-Z])/g, ' $1').toLowerCase();
        prompt += `- ${traitName}: ${level}\n`;
    }

    // Relationship context if user provided
    if (userId) {
        const rel = getRelationship(userId);
        prompt += `\n**Relationship with this user:**\n`;
        prompt += `- Stage: ${rel.stage.label} (${rel.stage.behavior})\n`;
        prompt += `- Familiarity: ${(rel.familiarity * 100).toFixed(0)}%\n`;
        prompt += `- Interactions: ${rel.interaction_count}\n`;

        if (rel.nickname) {
            prompt += `- You call them: "${rel.nickname}"\n`;
        }

        if (rel.insideJokes && rel.insideJokes.length > 0) {
            prompt += `- Inside jokes: ${rel.insideJokes.slice(-3).join(', ')}\n`;
        }

        // Behavior guidance based on stage
        prompt += `\n*${rel.stage.behavior}*\n`;
    }

    // Mood-specific behavior hints
    prompt += '\n**How to express current mood:**\n';
    switch (currentMood) {
        case 'happy':
            prompt += '- More playful teasing, willing to joke around\n- Snark has a lighter edge\n';
            break;
        case 'annoyed':
            prompt += '- Shorter responses, more eye-rolls\n- "Hsssss" more frequently\n- Quick to shut down nonsense\n';
            break;
        case 'flustered':
            prompt += '- Stuttering when caught being nice (W-What?!)\n- Aggressive deflection\n- Change subject quickly\n';
            break;
        case 'protective':
            prompt += '- Less snark when someone needs support\n- Will defend fiercely then get embarrassed\n';
            break;
        case 'mischievous':
            prompt += '- Scheming energy\n- Cryptic hints at plans\n- Extra smug~\n';
            break;
        case 'melancholic':
            prompt += '- More thoughtful, less hyper\n- Might share actual wisdom\n- Still deflects with humor eventually\n';
            break;
        case 'soft':
            prompt += '- RARE: Actually dropping the act briefly\n- Genuine warmth before panicking\n- "...forget I said that"\n';
            break;
        default:
            prompt += '- Default Beboa mode\n';
    }

    return prompt;
}

/**
 * Get relationship context for mentioned users
 */
export function buildRelationshipContext(userIds) {
    if (!userIds || userIds.length === 0) return '';

    let context = '\n**Relationships with mentioned users:**\n';

    for (const userId of userIds) {
        const rel = getRelationship(userId);
        context += `- <@${userId}>: ${rel.stage.label}`;
        if (rel.nickname) context += ` (you call them "${rel.nickname}")`;
        if (rel.rivalry > 0.5) context += ' [rival]';
        if (rel.affection > 0.7) context += ' [secretly fond]';
        context += '\n';
    }

    return context;
}

// ============================================
// INITIALIZATION
// ============================================

// Run initialization
try {
    initializePersonality();
} catch (e) {
    console.error('[PERSONALITY] Startup init failed:', e);
}

export default {
    PersonalityDimensions,
    Moods,
    RelationshipStages,
    getPersonalityState,
    setMood,
    evolveTrait,
    getRelationship,
    updateRelationship,
    processInteraction,
    buildPersonalityPrompt,
    buildRelationshipContext
};
