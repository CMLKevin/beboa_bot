import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Required environment variables
const requiredVars = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'CHECKIN_CHANNEL_ID',
    'NOTIFICATION_CHANNEL_ID',
    'ADMIN_ROLE_ID'
];

// Check for missing required variables
const missing = requiredVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease copy .env.example to .env and fill in all values.');
    process.exit(1);
}

// Export validated configuration
export const config = {
    // Discord bot token
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,

    // Application client ID (for registering commands)
    CLIENT_ID: process.env.CLIENT_ID,

    // Guild (server) ID
    GUILD_ID: process.env.GUILD_ID,

    // Channel where /checkin is allowed (#log-in)
    CHECKIN_CHANNEL_ID: process.env.CHECKIN_CHANNEL_ID,

    // Channel for reward redemption notifications (#beboas-command-center)
    NOTIFICATION_CHANNEL_ID: process.env.NOTIFICATION_CHANNEL_ID,

    // Role to ping for redemptions (@bebebebebebe)
    ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID,

    // OpenRouter Configuration (optional - chat feature)
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || null,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'x-ai/grok-4.1-fast',
    OPENROUTER_MAX_TOKENS: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 1000,
    OPENROUTER_TEMPERATURE: parseFloat(process.env.OPENROUTER_TEMPERATURE) || 0.9,

    // Embedding Model (for semantic memory)
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small',

    // Image Generation Model
    IMAGE_MODEL: process.env.IMAGE_MODEL || 'bytedance-seed/seedream-4.5',

    // Memory Extraction Model (lightweight for auto-extraction)
    EXTRACTION_MODEL: process.env.EXTRACTION_MODEL || 'x-ai/grok-4.1-fast',

    // LLM Evaluator Settings (mood, relationships, Jarvis intent parsing)
    LLM_EVALUATOR_MODEL: process.env.LLM_EVALUATOR_MODEL || 'x-ai/grok-4.1-fast',
    LLM_EVALUATOR_ENABLED: process.env.LLM_EVALUATOR_ENABLED !== 'false',
    LLM_EVALUATOR_CACHE_TTL: parseInt(process.env.LLM_EVALUATOR_CACHE_TTL) || 60000,
    LLM_EVALUATOR_RATE_LIMIT: parseInt(process.env.LLM_EVALUATOR_RATE_LIMIT) || 30,

    // Chat Feature Settings
    CHAT_COOLDOWN_SECONDS: parseInt(process.env.CHAT_COOLDOWN_SECONDS) || 30,
    CHAT_MAX_HISTORY: parseInt(process.env.CHAT_MAX_HISTORY) || 10,
    CHAT_ENABLED: process.env.CHAT_ENABLED !== 'false',

    // Memory Settings
    MEMORY_ENABLED: process.env.MEMORY_ENABLED !== 'false',
    MEMORY_AUTO_EXTRACT: process.env.MEMORY_AUTO_EXTRACT !== 'false',
    CHANNEL_CONTEXT_LIMIT: parseInt(process.env.CHANNEL_CONTEXT_LIMIT) || 20,

    // Tool Settings
    TOOLS_ENABLED: process.env.TOOLS_ENABLED !== 'false',
    IMAGE_GEN_ENABLED: process.env.IMAGE_GEN_ENABLED !== 'false',

    // Admin/Jarvis Settings
    BEBE_USER_ID: process.env.BEBE_USER_ID || null,

    // Server-Wide Memory Settings
    SERVER_MEMORY_ENABLED: process.env.SERVER_MEMORY_ENABLED !== 'false',
    SERVER_MEMORY_CHANNELS: process.env.SERVER_MEMORY_CHANNELS?.split(',').filter(Boolean) || [],
    SERVER_MEMORY_EXCLUDED_CHANNELS: process.env.SERVER_MEMORY_EXCLUDED_CHANNELS?.split(',').filter(Boolean) || [],
    IMPORTANCE_THRESHOLD: parseFloat(process.env.IMPORTANCE_THRESHOLD) || 0.3,
    EMBEDDING_BATCH_SIZE: parseInt(process.env.EMBEDDING_BATCH_SIZE) || 10,
    EMBEDDING_INTERVAL_MS: parseInt(process.env.EMBEDDING_INTERVAL_MS) || 30000,
    HOURLY_SUMMARY_ENABLED: process.env.HOURLY_SUMMARY_ENABLED !== 'false',
    DAILY_SUMMARY_ENABLED: process.env.DAILY_SUMMARY_ENABLED !== 'false',
    SERVER_MEMORY_RETENTION_DAYS: parseInt(process.env.SERVER_MEMORY_RETENTION_DAYS) || 30
};

export default config;
