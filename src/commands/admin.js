import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { getUser, updateBebits, resetStreak, getStats, getUserNotes, setUserNotes } from '../database.js';
import {
    adminBebitsAdded,
    adminBebitsRemoved,
    adminBebitsSet,
    adminStreakReset,
    databaseError
} from '../utils/messages.js';
import { clearHistory, getChatStats } from './chat.js';
import { getModelInfo } from '../services/openrouter.js';
import { clearMentionHistory, getMentionChatStats } from '../handlers/messageHandler.js';

export const data = new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for managing Bebits')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
        group
            .setName('bebits')
            .setDescription('Manage user Bebits')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('add')
                    .setDescription('Add Bebits to a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('The user to add Bebits to')
                            .setRequired(true)
                    )
                    .addIntegerOption(option =>
                        option
                            .setName('amount')
                            .setDescription('Amount of Bebits to add')
                            .setRequired(true)
                            .setMinValue(1)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('remove')
                    .setDescription('Remove Bebits from a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('The user to remove Bebits from')
                            .setRequired(true)
                    )
                    .addIntegerOption(option =>
                        option
                            .setName('amount')
                            .setDescription('Amount of Bebits to remove')
                            .setRequired(true)
                            .setMinValue(1)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('set')
                    .setDescription('Set a user\'s Bebits balance')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('The user to set Bebits for')
                            .setRequired(true)
                    )
                    .addIntegerOption(option =>
                        option
                            .setName('amount')
                            .setDescription('New Bebits balance')
                            .setRequired(true)
                            .setMinValue(0)
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('streak')
            .setDescription('Manage user streaks')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('reset')
                    .setDescription('Reset a user\'s streak')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('The user to reset streak for')
                            .setRequired(true)
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('chat')
            .setDescription('Manage chat feature')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('clear')
                    .setDescription('Clear all shared conversation history')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('View chat feature status')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('viewnote')
                    .setDescription('View Beboa\'s notes about a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to view notes for')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('setnote')
                    .setDescription('Set Beboa\'s notes about a user (replaces existing)')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to set notes for')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option
                            .setName('note')
                            .setDescription('Note content (Beboa\'s memory about this user)')
                            .setRequired(true)
                            .setMaxLength(1000)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('clearnote')
                    .setDescription('Clear Beboa\'s notes about a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to clear notes for')
                            .setRequired(true)
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stats')
            .setDescription('View server statistics')
    );

export async function execute(interaction) {
    try {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        // Handle stats (no subcommand group)
        if (subcommand === 'stats') {
            return await handleStats(interaction);
        }

        // Handle bebits subcommands
        if (subcommandGroup === 'bebits') {
            switch (subcommand) {
                case 'add':
                    return await handleBebitsAdd(interaction);
                case 'remove':
                    return await handleBebitsRemove(interaction);
                case 'set':
                    return await handleBebitsSet(interaction);
            }
        }

        // Handle streak subcommands
        if (subcommandGroup === 'streak') {
            if (subcommand === 'reset') {
                return await handleStreakReset(interaction);
            }
        }

        // Handle chat subcommands
        if (subcommandGroup === 'chat') {
            if (subcommand === 'clear') {
                return await handleChatClear(interaction);
            }
            if (subcommand === 'status') {
                return await handleChatStatus(interaction);
            }
            if (subcommand === 'viewnote') {
                return await handleViewNote(interaction);
            }
            if (subcommand === 'setnote') {
                return await handleSetNote(interaction);
            }
            if (subcommand === 'clearnote') {
                return await handleClearNote(interaction);
            }
        }

    } catch (error) {
        console.error('[ADMIN ERROR]', error);

        const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        await interaction[replyMethod]({
            content: databaseError(),
            ephemeral: true
        });
    }
}

/**
 * Handle /admin bebits add
 */
async function handleBebitsAdd(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // Get or create user
    const user = getUser(targetUser.id);
    const newBalance = user.bebits + amount;

    // Update bebits
    updateBebits(targetUser.id, newBalance);

    console.log(`[ADMIN] ${interaction.user.tag} added ${amount} bebits to ${targetUser.tag}. New balance: ${newBalance}`);

    await interaction.reply({
        content: adminBebitsAdded(`<@${targetUser.id}>`, amount, newBalance),
        ephemeral: true
    });
}

/**
 * Handle /admin bebits remove
 */
async function handleBebitsRemove(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // Get or create user
    const user = getUser(targetUser.id);
    const newBalance = Math.max(0, user.bebits - amount);

    // Update bebits
    updateBebits(targetUser.id, newBalance);

    console.log(`[ADMIN] ${interaction.user.tag} removed ${amount} bebits from ${targetUser.tag}. New balance: ${newBalance}`);

    await interaction.reply({
        content: adminBebitsRemoved(`<@${targetUser.id}>`, amount, newBalance),
        ephemeral: true
    });
}

/**
 * Handle /admin bebits set
 */
async function handleBebitsSet(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // Get or create user (to know old balance)
    const user = getUser(targetUser.id);
    const oldBalance = user.bebits;

    // Update bebits
    updateBebits(targetUser.id, amount);

    console.log(`[ADMIN] ${interaction.user.tag} set ${targetUser.tag}'s bebits to ${amount}. Previous: ${oldBalance}`);

    await interaction.reply({
        content: adminBebitsSet(`<@${targetUser.id}>`, amount, oldBalance),
        ephemeral: true
    });
}

/**
 * Handle /admin streak reset
 */
async function handleStreakReset(interaction) {
    const targetUser = interaction.options.getUser('user');

    // Get user (to know old streak)
    const user = getUser(targetUser.id);
    const oldStreak = user.current_streak;

    // Reset streak
    resetStreak(targetUser.id);

    console.log(`[ADMIN] ${interaction.user.tag} reset ${targetUser.tag}'s streak. Previous: ${oldStreak}`);

    await interaction.reply({
        content: adminStreakReset(`<@${targetUser.id}>`, oldStreak, user.bebits),
        ephemeral: true
    });
}

/**
 * Handle /admin stats
 */
async function handleStats(interaction) {
    const stats = getStats();

    // Build stats description
    let description = `**Total Users:** ${stats.totalUsers}
**Total Bebits in Circulation:** ${stats.totalBebits}
**Total Redemptions:** ${stats.totalRedemptions}

`;

    // Top earner
    if (stats.topEarner) {
        description += `**Top Earner:** <@${stats.topEarner.discord_id}> (${stats.topEarner.bebits} Bebits)\n`;
    } else {
        description += '**Top Earner:** None yet\n';
    }

    // Longest streak
    if (stats.longestStreak) {
        description += `**Longest Streak:** <@${stats.longestStreak.discord_id}> (${stats.longestStreak.current_streak} days)\n`;
    } else {
        description += '**Longest Streak:** None yet\n';
    }

    // Redemption breakdown
    if (stats.redemptionBreakdown.length > 0) {
        description += '\n**Redemption Breakdown:**\n';
        stats.redemptionBreakdown.forEach(item => {
            description += `- ${item.reward_name}: ${item.count}\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📊 BEBOA SERVER STATISTICS')
        .setDescription(description)
        .setColor(0x3498DB) // Blue
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

/**
 * Handle /admin chat clear
 */
async function handleChatClear(interaction) {
    // Clear shared history from both /chat command and @mentions
    clearHistory();
    clearMentionHistory();

    console.log(`[ADMIN] ${interaction.user.tag} cleared all shared chat history`);

    await interaction.reply({
        content: `✅ Cleared all shared conversation history`,
        ephemeral: true
    });
}

/**
 * Handle /admin chat status
 */
async function handleChatStatus(interaction) {
    const chatStats = getChatStats();
    const mentionStats = getMentionChatStats();
    const modelInfo = getModelInfo();

    const totalMessages = (chatStats.totalMessages || 0) + (mentionStats.totalMessages || 0);
    const totalCooldowns = chatStats.activeCooldowns + mentionStats.activeCooldowns;

    await interaction.reply({
        content: `**Chat Feature Status**
**Enabled:** ${modelInfo.configured ? 'Yes' : 'No'}
**Model:** ${modelInfo.model}
**Max Tokens:** ${modelInfo.maxTokens}
**Temperature:** ${modelInfo.temperature}

**Shared History:** ${totalMessages} messages (${chatStats.totalMessages || 0} slash, ${mentionStats.totalMessages || 0} mentions)
**Users on Cooldown:** ${totalCooldowns}`,
        ephemeral: true
    });
}

/**
 * Handle /admin chat viewnote
 */
async function handleViewNote(interaction) {
    const targetUser = interaction.options.getUser('user');
    const notes = getUserNotes(targetUser.id);

    console.log(`[ADMIN] ${interaction.user.tag} viewed notes for ${targetUser.tag}`);

    if (!notes) {
        await interaction.reply({
            content: `📝 **Notes for ${targetUser.tag}**\n\n*No notes recorded for this user yet.*\n\nUse \`/admin chat setnote\` to add notes about this user.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: `📝 **Notes for ${targetUser.tag}**\n\n${notes}`,
            ephemeral: true
        });
    }
}

/**
 * Handle /admin chat setnote
 */
async function handleSetNote(interaction) {
    const targetUser = interaction.options.getUser('user');
    const note = interaction.options.getString('note');

    setUserNotes(targetUser.id, note);

    console.log(`[ADMIN] ${interaction.user.tag} set notes for ${targetUser.tag}: "${note.substring(0, 50)}..."`);

    await interaction.reply({
        content: `✅ Set notes for ${targetUser.tag}:\n\n${note}`,
        ephemeral: true
    });
}

/**
 * Handle /admin chat clearnote
 */
async function handleClearNote(interaction) {
    const targetUser = interaction.options.getUser('user');

    setUserNotes(targetUser.id, null);

    console.log(`[ADMIN] ${interaction.user.tag} cleared notes for ${targetUser.tag}`);

    await interaction.reply({
        content: `✅ Cleared notes for ${targetUser.tag}`,
        ephemeral: true
    });
}

export default { data, execute };
