/**
 * Embedding Service
 * Handles text-to-vector conversion using OpenRouter API
 * Used for semantic memory search and context retrieval
 */

import { config } from '../config.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/embeddings';

/**
 * Generate embeddings for text using OpenRouter
 * @param {string|string[]} input - Text or array of texts to embed
 * @returns {Promise<{success: boolean, embeddings?: number[][], error?: string}>}
 */
export async function generateEmbedding(input) {
    if (!config.OPENROUTER_API_KEY) {
        return { success: false, error: 'OpenRouter API key not configured' };
    }

    const texts = Array.isArray(input) ? input : [input];

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://discord.gg/bubblebebe',
                'X-Title': 'Beboa Discord Bot'
            },
            body: JSON.stringify({
                model: config.EMBEDDING_MODEL,
                input: texts
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[EMBEDDING] API Error:', response.status, errorData);
            return { success: false, error: `API returned ${response.status}` };
        }

        const data = await response.json();
        const embeddings = data.data?.map(item => item.embedding) || [];

        if (embeddings.length === 0) {
            return { success: false, error: 'No embeddings returned' };
        }

        console.log(`[EMBEDDING] Generated ${embeddings.length} embeddings (dim: ${embeddings[0]?.length})`);

        return {
            success: true,
            embeddings: embeddings,
            model: data.model || config.EMBEDDING_MODEL,
            usage: data.usage
        };

    } catch (error) {
        console.error('[EMBEDDING] Request failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Similarity score (0-1)
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Find most similar items from a list based on embedding similarity
 * @param {number[]} queryEmbedding - Query vector
 * @param {Array<{id: any, embedding: number[]}>} items - Items with embeddings
 * @param {number} topK - Number of results to return
 * @param {number} threshold - Minimum similarity threshold
 * @returns {Array<{id: any, similarity: number}>}
 */
export function findSimilar(queryEmbedding, items, topK = 5, threshold = 0.3) {
    const results = items
        .map(item => ({
            id: item.id,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
        }))
        .filter(r => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

    return results;
}

/**
 * Check if embedding service is available
 * @returns {boolean}
 */
export function isEmbeddingAvailable() {
    return !!(config.OPENROUTER_API_KEY && config.EMBEDDING_MODEL);
}

export default {
    generateEmbedding,
    cosineSimilarity,
    findSimilar,
    isEmbeddingAvailable
};
