import { Client, GatewayIntentBits, REST, Routes, Events } from 'discord.js';
import { config } from './config.js';
import { closeDatabase } from './database.js';
import { handleCommand, getCommandData } from './handlers/commandHandler.js';
import { handleButton } from './handlers/buttonHandler.js';
import { handleMention } from './handlers/messageHandler.js';
import { ingestMessage } from './services/messageIngestion.js';
import { startProcessor as startEmbeddingProcessor, stopProcessor as stopEmbeddingProcessor } from './services/embeddingQueue.js';
import { startScheduler as startSummaryScheduler, stopScheduler as stopSummaryScheduler } from './services/summarizer.js';

// Create Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent  // Required for reading message content (@mentions)
    ]
});

// Logging helper
function log(level, message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] [${level}] ${message}`);
}

// Register slash commands with Discord
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    try {
        log('INFO', 'Registering slash commands...');

        const commandData = getCommandData();

        await rest.put(
            Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
            { body: commandData }
        );

        log('INFO', `Successfully registered ${commandData.length} commands`);
    } catch (error) {
        log('ERROR', `Failed to register commands: ${error.message}`);
        throw error;
    }
}

// Handle client ready event
client.once(Events.ClientReady, async (readyClient) => {
    log('INFO', `Logged in as ${readyClient.user.tag}`);
    log('INFO', `Serving guild: ${config.GUILD_ID}`);

    // Register slash commands
    await registerCommands();

    // Start server memory background processors
    if (config.SERVER_MEMORY_ENABLED) {
        log('INFO', '📝 Server-wide memory: ENABLED');
        startEmbeddingProcessor();
        startSummaryScheduler(config.GUILD_ID);
    }

    log('INFO', '🐍 Beboa is ready to serve~');
});

// Handle all interactions
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
            return;
        }

        // Handle button clicks
        if (interaction.isButton()) {
            await handleButton(interaction);
            return;
        }

        // Handle other interaction types (autocomplete, modals, etc.)
        // Currently none implemented

    } catch (error) {
        log('ERROR', `Unhandled interaction error: ${error.message}`);
        console.error(error);

        // Try to respond with error
        try {
            const content = '🐍 Hisss... something went wrong. Please try again~';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content, ephemeral: true });
            } else if (interaction.isRepliable()) {
                await interaction.reply({ content, ephemeral: true });
            }
        } catch (replyError) {
            log('ERROR', `Failed to send error response: ${replyError.message}`);
        }
    }
});

// Handle all messages - capture for server memory AND handle @mentions
client.on(Events.MessageCreate, async (message) => {
    // Capture ALL messages for server-wide memory (non-blocking)
    // This runs in the background and doesn't affect normal operation
    if (config.SERVER_MEMORY_ENABLED && !message.author?.bot) {
        ingestMessage(message).catch(error => {
            // Silent failure - ingestion should never block normal operation
            if (error.message !== 'disabled') {
                log('DEBUG', `[SERVER_MEMORY] Ingestion skipped: ${error.message}`);
            }
        });
    }

    // Handle @Beboa mentions for chat (existing behavior)
    try {
        await handleMention(message);
    } catch (error) {
        log('ERROR', `Message handler error: ${error.message}`);
    }
});

// Handle errors
client.on(Events.Error, (error) => {
    log('ERROR', `Client error: ${error.message}`);
    console.error(error);
});

// Handle warnings
client.on(Events.Warn, (warning) => {
    log('WARN', warning);
});

// Graceful shutdown
function shutdown(signal) {
    log('INFO', `Received ${signal}, shutting down gracefully...`);

    // Stop background processors
    stopEmbeddingProcessor();
    stopSummaryScheduler();

    // Close database connection
    closeDatabase();

    // Destroy Discord client
    client.destroy();

    log('INFO', 'Beboa has slithered away~ Goodbye!');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    log('ERROR', `Unhandled rejection: ${error.message}`);
    console.error(error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('ERROR', `Uncaught exception: ${error.message}`);
    console.error(error);
    shutdown('uncaughtException');
});

// Login to Discord
log('INFO', 'Starting Beboa bot...');
client.login(config.DISCORD_TOKEN).catch((error) => {
    log('ERROR', `Failed to login: ${error.message}`);
    process.exit(1);
});
