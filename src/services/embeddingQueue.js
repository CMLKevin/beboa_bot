/**
 * Embedding Queue Service
 *
 * Background batch processing for server message embeddings.
 * Processes messages in batches to efficiently use the embedding API
 * while respecting rate limits and managing costs.
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

// Queue state
let processorInterval = null;
let isProcessing = false;
let stats = {
    processed: 0,
    failed: 0,
    lastProcessedAt: null
};

/**
 * Initialize database connection
 */
function initDatabase() {
    if (db) return;

    try {
        db = new Database(dbPath);

        statements = {
            // Get pending items from queue
            getPendingQueue: db.prepare(`
                SELECT eq.*, sm.content, sm.author_name, sm.channel_id
                FROM embedding_queue eq
                JOIN server_messages sm ON sm.id = eq.message_id
                WHERE eq.status = 'pending'
                ORDER BY eq.priority DESC, eq.created_at ASC
                LIMIT ?
            `),

            // Update queue item status
            updateQueueStatus: db.prepare(`
                UPDATE embedding_queue
                SET status = ?, processed_at = datetime('now'), error_message = ?
                WHERE id = ?
            `),

            // Increment retry count
            incrementRetry: db.prepare(`
                UPDATE embedding_queue
                SET retry_count = retry_count + 1, error_message = ?
                WHERE id = ?
            `),

            // Store embedding (as BLOB)
            storeEmbedding: db.prepare(`
                INSERT INTO server_embeddings (message_id, embedding, source_text, source_type)
                VALUES (?, ?, ?, 'message')
            `),

            // Update message embedding status
            updateMessageStatus: db.prepare(`
                UPDATE server_messages SET embedding_status = ? WHERE id = ?
            `),

            // Get queue stats
            getQueueStats: db.prepare(`
                SELECT
                    status,
                    COUNT(*) as count
                FROM embedding_queue
                GROUP BY status
            `),

            // Clean up old completed items
            cleanupQueue: db.prepare(`
                DELETE FROM embedding_queue
                WHERE status IN ('completed', 'failed')
                AND processed_at < datetime('now', ?)
            `)
        };

        console.log('[EMBEDDING_QUEUE] Database initialized');
    } catch (error) {
        console.error('[EMBEDDING_QUEUE] Database init error:', error.message);
    }
}

/**
 * Convert Float64Array or number[] to Buffer for BLOB storage
 */
function embeddingToBuffer(embedding) {
    const floatArray = new Float64Array(embedding);
    return Buffer.from(floatArray.buffer);
}

/**
 * Convert Buffer back to number[]
 */
export function bufferToEmbedding(buffer) {
    const floatArray = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8);
    return Array.from(floatArray);
}

/**
 * Process a batch of pending embeddings
 */
async function processBatch() {
    if (isProcessing) {
        console.log('[EMBEDDING_QUEUE] Already processing, skipping...');
        return;
    }

    if (!isEmbeddingAvailable()) {
        console.log('[EMBEDDING_QUEUE] Embedding service not available');
        return;
    }

    initDatabase();
    if (!statements) return;

    isProcessing = true;
    const batchSize = config.EMBEDDING_BATCH_SIZE || 10;

    try {
        // Get pending items
        const pending = statements.getPendingQueue.all(batchSize);

        if (pending.length === 0) {
            return;
        }

        console.log(`[EMBEDDING_QUEUE] Processing batch of ${pending.length} messages`);

        // Extract texts for batch embedding
        const texts = pending.map(item => item.content);

        // Generate embeddings in batch
        const result = await generateEmbedding(texts);

        if (!result.success) {
            console.error('[EMBEDDING_QUEUE] Batch embedding failed:', result.error);

            // Mark all as retry (if under max retries)
            for (const item of pending) {
                if (item.retry_count < 3) {
                    statements.incrementRetry.run(result.error, item.id);
                } else {
                    statements.updateQueueStatus.run('failed', result.error, item.id);
                    statements.updateMessageStatus.run('failed', item.message_id);
                    stats.failed++;
                }
            }
            return;
        }

        // Store each embedding
        for (let i = 0; i < pending.length; i++) {
            const item = pending[i];
            const embedding = result.embeddings[i];

            try {
                // Store embedding as BLOB
                const embeddingBuffer = embeddingToBuffer(embedding);
                statements.storeEmbedding.run(
                    item.message_id,
                    embeddingBuffer,
                    item.content.substring(0, 500) // Truncate source text
                );

                // Update queue and message status
                statements.updateQueueStatus.run('completed', null, item.id);
                statements.updateMessageStatus.run('embedded', item.message_id);

                stats.processed++;
            } catch (storeError) {
                console.error(`[EMBEDDING_QUEUE] Store error for item ${item.id}:`, storeError.message);
                statements.updateQueueStatus.run('failed', storeError.message, item.id);
                statements.updateMessageStatus.run('failed', item.message_id);
                stats.failed++;
            }
        }

        stats.lastProcessedAt = new Date().toISOString();
        console.log(`[EMBEDDING_QUEUE] Batch complete. Total processed: ${stats.processed}, failed: ${stats.failed}`);

    } catch (error) {
        console.error('[EMBEDDING_QUEUE] Process batch error:', error.message);
    } finally {
        isProcessing = false;
    }
}

/**
 * Start the background embedding processor
 */
export function startProcessor() {
    if (processorInterval) {
        console.log('[EMBEDDING_QUEUE] Processor already running');
        return;
    }

    if (!config.SERVER_MEMORY_ENABLED) {
        console.log('[EMBEDDING_QUEUE] Server memory disabled, not starting processor');
        return;
    }

    const interval = config.EMBEDDING_INTERVAL_MS || 30000;
    console.log(`[EMBEDDING_QUEUE] Starting processor (interval: ${interval}ms)`);

    // Initial run after short delay
    setTimeout(() => processBatch(), 5000);

    // Schedule regular processing
    processorInterval = setInterval(() => {
        processBatch();
    }, interval);
}

/**
 * Stop the background processor
 */
export function stopProcessor() {
    if (processorInterval) {
        clearInterval(processorInterval);
        processorInterval = null;
        console.log('[EMBEDDING_QUEUE] Processor stopped');
    }
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
    initDatabase();
    if (!statements) return { pending: 0, completed: 0, failed: 0 };

    try {
        const rows = statements.getQueueStats.all();
        const queueStats = { pending: 0, completed: 0, failed: 0 };

        for (const row of rows) {
            queueStats[row.status] = row.count;
        }

        return {
            ...queueStats,
            ...stats,
            isProcessing,
            isRunning: processorInterval !== null
        };
    } catch (error) {
        console.error('[EMBEDDING_QUEUE] getQueueStats error:', error.message);
        return { pending: 0, completed: 0, failed: 0 };
    }
}

/**
 * Clean up old completed/failed queue items
 */
export function cleanupOldItems(olderThan = '-1 day') {
    initDatabase();
    if (!statements) return 0;

    try {
        const result = statements.cleanupQueue.run(olderThan);
        if (result.changes > 0) {
            console.log(`[EMBEDDING_QUEUE] Cleaned up ${result.changes} old queue items`);
        }
        return result.changes;
    } catch (error) {
        console.error('[EMBEDDING_QUEUE] Cleanup error:', error.message);
        return 0;
    }
}

/**
 * Manually trigger a batch process
 */
export async function processNow() {
    await processBatch();
    return getQueueStats();
}

/**
 * Check if processor is running
 */
export function isRunning() {
    return processorInterval !== null;
}

export default {
    startProcessor,
    stopProcessor,
    getQueueStats,
    cleanupOldItems,
    processNow,
    isRunning,
    bufferToEmbedding
};
