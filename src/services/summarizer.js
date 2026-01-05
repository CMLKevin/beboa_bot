/**
 * Summarizer Service
 *
 * Generates periodic summaries of channel activity using LLM.
 * Supports hourly, daily, and weekly summarization with topic extraction.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { generateEmbedding, isEmbeddingAvailable } from './embedding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'data', 'beboa.db');

// Database connection
let db = null;
let statements = null;

// Scheduler state
let hourlyInterval = null;
let dailyInterval = null;

/**
 * Initialize database connection
 */
function initDatabase() {
    if (db) return;

    try {
        db = new Database(dbPath);

        statements = {
            // Get messages for summarization
            getMessagesForPeriod: db.prepare(`
                SELECT author_name, content, discord_created_at
                FROM server_messages
                WHERE channel_id = ?
                AND discord_created_at BETWEEN ? AND ?
                ORDER BY discord_created_at ASC
                LIMIT 200
            `),

            // Get all channels with recent activity
            getActiveChannels: db.prepare(`
                SELECT DISTINCT channel_id, COUNT(*) as message_count
                FROM server_messages
                WHERE guild_id = ?
                AND discord_created_at > datetime('now', ?)
                GROUP BY channel_id
                HAVING message_count >= ?
            `),

            // Store summary
            storeSummary: db.prepare(`
                INSERT OR REPLACE INTO channel_summaries
                (channel_id, guild_id, period_type, period_start, period_end, summary, key_topics, key_participants, message_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),

            // Get recent summaries
            getRecentSummaries: db.prepare(`
                SELECT * FROM channel_summaries
                WHERE guild_id = ?
                AND period_type = ?
                ORDER BY period_start DESC
                LIMIT ?
            `),

            // Update topic
            upsertTopic: db.prepare(`
                INSERT INTO active_topics (guild_id, topic_name, description, keywords, last_seen_at, mention_count)
                VALUES (?, ?, ?, ?, datetime('now'), 1)
                ON CONFLICT(guild_id, topic_name) DO UPDATE SET
                    last_seen_at = datetime('now'),
                    mention_count = mention_count + 1,
                    status = 'active'
            `),

            // Cool down old topics
            coolDownTopics: db.prepare(`
                UPDATE active_topics
                SET status = 'cooling'
                WHERE guild_id = ?
                AND status = 'active'
                AND last_seen_at < datetime('now', '-24 hours')
            `),

            // Archive dormant topics
            archiveTopics: db.prepare(`
                UPDATE active_topics
                SET status = 'dormant'
                WHERE guild_id = ?
                AND status = 'cooling'
                AND last_seen_at < datetime('now', '-7 days')
            `)
        };

        console.log('[SUMMARIZER] Database initialized');
    } catch (error) {
        console.error('[SUMMARIZER] Database init error:', error.message);
    }
}

/**
 * Generate a summary for a channel over a time period
 */
async function generateSummary(channelId, guildId, periodType, startTime, endTime) {
    initDatabase();
    if (!statements) return null;

    try {
        const messages = statements.getMessagesForPeriod.all(channelId, startTime, endTime);

        if (messages.length < 3) {
            console.log(`[SUMMARIZER] Not enough messages for ${periodType} summary in ${channelId}`);
            return null;
        }

        // Build conversation text for summarization
        const conversationText = messages
            .map(m => `${m.author_name}: ${m.content}`)
            .join('\n');

        // Use LLM for summarization
        const summary = await summarizeWithLLM(conversationText, periodType);

        if (!summary) {
            return null;
        }

        // Extract key participants
        const participantCounts = {};
        for (const msg of messages) {
            participantCounts[msg.author_name] = (participantCounts[msg.author_name] || 0) + 1;
        }
        const keyParticipants = Object.entries(participantCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        // Store summary
        statements.storeSummary.run(
            channelId,
            guildId,
            periodType,
            startTime,
            endTime,
            summary.summary,
            JSON.stringify(summary.topics || []),
            JSON.stringify(keyParticipants),
            messages.length
        );

        // Update active topics
        if (summary.topics && summary.topics.length > 0) {
            for (const topic of summary.topics) {
                try {
                    statements.upsertTopic.run(
                        guildId,
                        topic,
                        null,
                        JSON.stringify([topic.toLowerCase()]),
                    );
                } catch (e) {
                    // Topic table might not have unique constraint, ignore
                }
            }
        }

        console.log(`[SUMMARIZER] Generated ${periodType} summary for ${channelId}: ${messages.length} messages`);
        return summary;

    } catch (error) {
        console.error('[SUMMARIZER] generateSummary error:', error.message);
        return null;
    }
}

/**
 * Use LLM to generate summary and extract topics
 */
async function summarizeWithLLM(conversationText, periodType) {
    if (!config.OPENROUTER_API_KEY) {
        return fallbackSummary(conversationText);
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/CMLKevin/beboa_evo',
                'X-Title': 'Beboa Discord Bot - Summarizer'
            },
            body: JSON.stringify({
                model: config.LLM_EVALUATOR_MODEL || 'x-ai/grok-4.1-fast',
                messages: [
                    {
                        role: 'system',
                        content: `You are a Discord conversation summarizer. Analyze the conversation and provide a JSON response with:
1. "summary": A brief 1-2 sentence summary of what was discussed
2. "topics": An array of 1-3 key topics/themes (short phrases)
3. "mood": Overall mood (casual, heated, supportive, creative, etc.)

Keep it natural and conversational. This is a ${periodType} summary.
Response must be valid JSON only.`
                    },
                    {
                        role: 'user',
                        content: `Summarize this Discord conversation:\n\n${conversationText.substring(0, 3000)}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 300,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            console.error('[SUMMARIZER] LLM API error:', response.status);
            return fallbackSummary(conversationText);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return fallbackSummary(conversationText);
        }

        return JSON.parse(content);

    } catch (error) {
        console.error('[SUMMARIZER] LLM summarization error:', error.message);
        return fallbackSummary(conversationText);
    }
}

/**
 * Fallback summary when LLM is unavailable
 */
function fallbackSummary(conversationText) {
    const lines = conversationText.split('\n');
    const messageCount = lines.length;
    const participants = new Set(lines.map(l => l.split(':')[0]).filter(Boolean));

    return {
        summary: `${messageCount} messages from ${participants.size} participants`,
        topics: [],
        mood: 'unknown'
    };
}

/**
 * Run hourly summarization for all active channels
 */
export async function runHourlySummaries(guildId) {
    if (!config.HOURLY_SUMMARY_ENABLED) return;

    initDatabase();
    if (!statements) return;

    try {
        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        // Get channels with activity in the last hour
        const activeChannels = statements.getActiveChannels.all(guildId, '-1 hour', 5);

        for (const channel of activeChannels) {
            await generateSummary(channel.channel_id, guildId, 'hourly', startTime, endTime);
        }

        // Cool down old topics
        statements.coolDownTopics.run(guildId);

        console.log(`[SUMMARIZER] Hourly summaries complete for ${activeChannels.length} channels`);

    } catch (error) {
        console.error('[SUMMARIZER] runHourlySummaries error:', error.message);
    }
}

/**
 * Run daily summarization
 */
export async function runDailySummaries(guildId) {
    if (!config.DAILY_SUMMARY_ENABLED) return;

    initDatabase();
    if (!statements) return;

    try {
        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get channels with significant activity
        const activeChannels = statements.getActiveChannels.all(guildId, '-24 hours', 20);

        for (const channel of activeChannels) {
            await generateSummary(channel.channel_id, guildId, 'daily', startTime, endTime);
        }

        // Archive dormant topics
        statements.archiveTopics.run(guildId);

        console.log(`[SUMMARIZER] Daily summaries complete for ${activeChannels.length} channels`);

    } catch (error) {
        console.error('[SUMMARIZER] runDailySummaries error:', error.message);
    }
}

/**
 * Start the summarization scheduler
 */
export function startScheduler(guildId) {
    if (!config.SERVER_MEMORY_ENABLED) {
        console.log('[SUMMARIZER] Server memory disabled, not starting scheduler');
        return;
    }

    // Hourly summaries at the top of each hour
    if (config.HOURLY_SUMMARY_ENABLED && !hourlyInterval) {
        // Calculate ms until next hour
        const now = new Date();
        const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;

        setTimeout(() => {
            runHourlySummaries(guildId);
            hourlyInterval = setInterval(() => runHourlySummaries(guildId), 60 * 60 * 1000);
        }, msUntilNextHour);

        console.log(`[SUMMARIZER] Hourly scheduler starting in ${Math.round(msUntilNextHour / 60000)} minutes`);
    }

    // Daily summaries at 2 AM
    if (config.DAILY_SUMMARY_ENABLED && !dailyInterval) {
        const now = new Date();
        const target = new Date(now);
        target.setHours(2, 0, 0, 0);
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
        const msUntilDaily = target - now;

        setTimeout(() => {
            runDailySummaries(guildId);
            dailyInterval = setInterval(() => runDailySummaries(guildId), 24 * 60 * 60 * 1000);
        }, msUntilDaily);

        console.log(`[SUMMARIZER] Daily scheduler starting in ${Math.round(msUntilDaily / 3600000)} hours`);
    }
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
    if (hourlyInterval) {
        clearInterval(hourlyInterval);
        hourlyInterval = null;
    }
    if (dailyInterval) {
        clearInterval(dailyInterval);
        dailyInterval = null;
    }
    console.log('[SUMMARIZER] Scheduler stopped');
}

/**
 * Get recent summaries for a guild
 */
export function getRecentSummaries(guildId, periodType = 'daily', limit = 5) {
    initDatabase();
    if (!statements) return [];

    try {
        return statements.getRecentSummaries.all(guildId, periodType, limit);
    } catch (error) {
        console.error('[SUMMARIZER] getRecentSummaries error:', error.message);
        return [];
    }
}

/**
 * Manually trigger summary generation
 */
export async function triggerSummary(channelId, guildId, periodType = 'hourly') {
    const now = new Date();
    let startTime;

    switch (periodType) {
        case 'hourly':
            startTime = new Date(now - 60 * 60 * 1000);
            break;
        case 'daily':
            startTime = new Date(now - 24 * 60 * 60 * 1000);
            break;
        case 'weekly':
            startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = new Date(now - 60 * 60 * 1000);
    }

    return await generateSummary(channelId, guildId, periodType, startTime.toISOString(), now.toISOString());
}

export default {
    startScheduler,
    stopScheduler,
    runHourlySummaries,
    runDailySummaries,
    getRecentSummaries,
    triggerSummary
};
