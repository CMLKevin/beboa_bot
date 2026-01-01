import { Collection } from 'discord.js';

// Import all commands
import checkin from '../commands/checkin.js';
import balance from '../commands/balance.js';
import leaderboard from '../commands/leaderboard.js';
import shop from '../commands/shop.js';
import admin from '../commands/admin.js';
import chat from '../commands/chat.js';

// Create commands collection
export const commands = new Collection();

// Register all commands
const commandModules = [checkin, balance, leaderboard, shop, admin, chat];

commandModules.forEach(command => {
    if (command.data && command.execute) {
        commands.set(command.data.name, command);
        console.log(`[COMMANDS] Registered: /${command.data.name}`);
    } else {
        console.warn('[COMMANDS] Invalid command module:', command);
    }
});

/**
 * Handle slash command interactions
 * @param {ChatInputCommandInteraction} interaction - The slash command interaction
 */
export async function handleCommand(interaction) {
    const command = commands.get(interaction.commandName);

    if (!command) {
        console.warn(`[COMMANDS] Unknown command: ${interaction.commandName}`);
        return;
    }

    try {
        console.log(`[COMMANDS] Executing: /${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction);
    } catch (error) {
        console.error(`[COMMANDS] Error executing /${interaction.commandName}:`, error);

        // Try to respond with error
        try {
            const content = '🐍 Hisss... something went wrong. Please try again~';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content, ephemeral: true });
            } else {
                await interaction.reply({ content, ephemeral: true });
            }
        } catch (replyError) {
            console.error('[COMMANDS] Failed to send error response:', replyError);
        }
    }
}

/**
 * Get all command data for registration
 * @returns {Array} Array of command JSON data
 */
export function getCommandData() {
    return commands.map(cmd => cmd.data.toJSON());
}

export default { commands, handleCommand, getCommandData };
