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
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
    OPENROUTER_MAX_TOKENS: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 300,
    OPENROUTER_TEMPERATURE: parseFloat(process.env.OPENROUTER_TEMPERATURE) || 0.9,

    // Chat Feature Settings
    CHAT_COOLDOWN_SECONDS: parseInt(process.env.CHAT_COOLDOWN_SECONDS) || 30,
    CHAT_MAX_HISTORY: parseInt(process.env.CHAT_MAX_HISTORY) || 10,
    CHAT_ENABLED: process.env.CHAT_ENABLED !== 'false'
};

export default config;
