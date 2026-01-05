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
import { storeMemory, searchMemories, MemoryTypes } from '../services/memory.js';
import { grantAdminPermission, revokeAdminPermission, canExecuteAdminCommands, getAvailableAdminCommands } from '../services/adminCommands.js';
import { getRegisteredTools } from '../services/tools.js';
import {
    getPersonalityState,
    setMood,
    evolveTrait,
    getRelationship,
    Moods,
    PersonalityDimensions
} from '../services/personality.js';

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
    )
    .addSubcommandGroup(group =>
        group
            .setName('memory')
            .setDescription('Manage Beboa\'s semantic memories')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('add')
                    .setDescription('Add a memory about a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User this memory is about')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option
                            .setName('content')
                            .setDescription('Memory content')
                            .setRequired(true)
                            .setMaxLength(500)
                    )
                    .addStringOption(option =>
                        option
                            .setName('type')
                            .setDescription('Type of memory')
                            .setRequired(false)
                            .addChoices(
                                { name: 'Fact', value: 'fact' },
                                { name: 'Preference', value: 'preference' },
                                { name: 'Event', value: 'event' },
                                { name: 'Relationship', value: 'relationship' },
                                { name: 'Lore', value: 'lore' }
                            )
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('search')
                    .setDescription('Search Beboa\'s memories')
                    .addStringOption(option =>
                        option
                            .setName('query')
                            .setDescription('Search query')
                            .setRequired(true)
                    )
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('Filter by user (optional)')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('View memory system status')
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('jarvis')
            .setDescription('Manage Jarvis-style admin permissions')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('grant')
                    .setDescription('Grant admin command permission to a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to grant permission')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('revoke')
                    .setDescription('Revoke admin command permission from a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to revoke permission from')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('commands')
                    .setDescription('List available Jarvis-style commands')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('tools')
            .setDescription('View registered AI tools')
    )
    .addSubcommandGroup(group =>
        group
            .setName('personality')
            .setDescription('Manage Beboa\'s dynamic personality')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('View current personality state and mood')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('mood')
                    .setDescription('Set Beboa\'s current mood')
                    .addStringOption(option =>
                        option
                            .setName('mood')
                            .setDescription('Mood to set')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Neutral', value: 'neutral' },
                                { name: 'Happy', value: 'happy' },
                                { name: 'Annoyed', value: 'annoyed' },
                                { name: 'Mischievous', value: 'mischievous' },
                                { name: 'Protective', value: 'protective' },
                                { name: 'Flustered', value: 'flustered' },
                                { name: 'Bored', value: 'bored' },
                                { name: 'Energetic', value: 'energetic' },
                                { name: 'Melancholic', value: 'melancholic' },
                                { name: 'Competitive', value: 'competitive' },
                                { name: 'Smug', value: 'smug' },
                                { name: 'Soft', value: 'soft' }
                            )
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('relationship')
                    .setDescription('View Beboa\'s relationship with a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to check relationship')
                            .setRequired(true)
                    )
            )
    );

export async function execute(interaction) {
    try {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        // Handle stats (no subcommand group)
        if (subcommand === 'stats') {
            return await handleStats(interaction);
        }

        // Handle tools (no subcommand group)
        if (subcommand === 'tools') {
            return await handleTools(interaction);
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

        // Handle memory subcommands
        if (subcommandGroup === 'memory') {
            if (subcommand === 'add') {
                return await handleMemoryAdd(interaction);
            }
            if (subcommand === 'search') {
                return await handleMemorySearch(interaction);
            }
            if (subcommand === 'status') {
                return await handleMemoryStatus(interaction);
            }
        }

        // Handle jarvis subcommands
        if (subcommandGroup === 'jarvis') {
            if (subcommand === 'grant') {
                return await handleJarvisGrant(interaction);
            }
            if (subcommand === 'revoke') {
                return await handleJarvisRevoke(interaction);
            }
            if (subcommand === 'commands') {
                return await handleJarvisCommands(interaction);
            }
        }

        // Handle personality subcommands
        if (subcommandGroup === 'personality') {
            if (subcommand === 'status') {
                return await handlePersonalityStatus(interaction);
            }
            if (subcommand === 'mood') {
                return await handlePersonalityMood(interaction);
            }
            if (subcommand === 'relationship') {
                return await handlePersonalityRelationship(interaction);
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

/**
 * Handle /admin memory add
 */
async function handleMemoryAdd(interaction) {
    const targetUser = interaction.options.getUser('user');
    const content = interaction.options.getString('content');
    const type = interaction.options.getString('type') || 'fact';

    await interaction.deferReply({ ephemeral: true });

    const result = await storeMemory({
        userId: targetUser.id,
        memoryType: type,
        content: content,
        importance: 0.7,
        sourceType: 'admin',
        metadata: { addedBy: interaction.user.id }
    });

    if (result.success) {
        console.log(`[ADMIN] ${interaction.user.tag} added memory for ${targetUser.tag}: "${content.substring(0, 50)}..."`);
        await interaction.editReply({
            content: `✅ Added memory about ${targetUser.tag}:\n\n**Type:** ${type}\n**Content:** ${content}`
        });
    } else {
        await interaction.editReply({
            content: `❌ Failed to add memory: ${result.error}`
        });
    }
}

/**
 * Handle /admin memory search
 */
async function handleMemorySearch(interaction) {
    const query = interaction.options.getString('query');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    const memories = await searchMemories(query, {
        userId: targetUser?.id,
        limit: 10
    });

    if (memories.length === 0) {
        await interaction.editReply({
            content: `🔍 No memories found for query: "${query}"`
        });
        return;
    }

    let response = `🔍 **Memory Search Results** (query: "${query}")\n\n`;
    for (const mem of memories) {
        const similarity = mem.similarity ? ` (${(mem.similarity * 100).toFixed(0)}% match)` : '';
        response += `• **[${mem.memoryType || mem.memory_type}]** ${mem.content}${similarity}\n`;
    }

    await interaction.editReply({ content: response });
}

/**
 * Handle /admin memory status
 */
async function handleMemoryStatus(interaction) {
    const { config } = await import('../config.js');

    await interaction.reply({
        content: `**Memory System Status**
**Enabled:** ${config.MEMORY_ENABLED ? 'Yes' : 'No'}
**Auto-Extract:** ${config.MEMORY_AUTO_EXTRACT ? 'Yes' : 'No'}
**Channel Context Limit:** ${config.CHANNEL_CONTEXT_LIMIT} messages
**Embedding Model:** ${config.EMBEDDING_MODEL}

*Use \`/admin memory search\` to search memories*
*Use \`/admin memory add\` to manually add memories*`,
        ephemeral: true
    });
}

/**
 * Handle /admin jarvis grant
 */
async function handleJarvisGrant(interaction) {
    const targetUser = interaction.options.getUser('user');

    grantAdminPermission(targetUser.id, interaction.user.id, 1);

    console.log(`[ADMIN] ${interaction.user.tag} granted Jarvis permission to ${targetUser.tag}`);

    await interaction.reply({
        content: `✅ Granted Jarvis-style admin permission to ${targetUser.tag}\n\nThey can now ask Beboa to execute admin commands naturally (e.g., "Beboa, give @user 100 bebits")`,
        ephemeral: true
    });
}

/**
 * Handle /admin jarvis revoke
 */
async function handleJarvisRevoke(interaction) {
    const targetUser = interaction.options.getUser('user');

    revokeAdminPermission(targetUser.id);

    console.log(`[ADMIN] ${interaction.user.tag} revoked Jarvis permission from ${targetUser.tag}`);

    await interaction.reply({
        content: `✅ Revoked Jarvis-style admin permission from ${targetUser.tag}`,
        ephemeral: true
    });
}

/**
 * Handle /admin jarvis commands
 */
async function handleJarvisCommands(interaction) {
    const commands = getAvailableAdminCommands();

    let response = `**Available Jarvis-Style Commands**\n\n`;
    response += `These commands can be executed by asking Beboa naturally:\n\n`;

    for (const cmd of commands) {
        response += `• **${cmd.name}**: ${cmd.description}\n`;
    }

    response += `\n*Example: "@Beboa give @user 100 bebits"*`;

    await interaction.reply({
        content: response,
        ephemeral: true
    });
}

/**
 * Handle /admin tools
 */
async function handleTools(interaction) {
    const tools = getRegisteredTools();

    let response = `**Registered AI Tools**\n\n`;

    if (tools.length === 0) {
        response += `*No tools registered*`;
    } else {
        for (const tool of tools) {
            const adminLabel = tool.requiresAdmin ? ' (Admin only)' : '';
            response += `• **${tool.name}**${adminLabel}: ${tool.description}\n`;
        }
    }

    await interaction.reply({
        content: response,
        ephemeral: true
    });
}

/**
 * Handle /admin personality status
 */
async function handlePersonalityStatus(interaction) {
    const state = getPersonalityState();
    const moodInfo = Moods[state.currentMood] || Moods.neutral;

    let response = `**Beboa's Current Personality State**\n\n`;
    response += `**Mood:** ${moodInfo.emoji} ${moodInfo.name} - ${moodInfo.description}\n`;
    response += `*Mood started:* ${state.moodStarted || 'Unknown'}\n\n`;

    response += `**Active Trait Levels:**\n`;

    // Show notable traits
    const traits = Object.entries(state.effectiveTraits || {})
        .sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5));

    for (const [trait, value] of traits.slice(0, 8)) {
        const bar = '█'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
        const traitName = trait.replace(/([A-Z])/g, ' $1').trim();
        response += `${traitName}: [${bar}] ${(value * 100).toFixed(0)}%\n`;
    }

    response += `\n**Recent Mood Triggers:**\n`;
    const triggers = state.moodTriggers || [];
    if (triggers.length === 0) {
        response += `*No recent triggers*\n`;
    } else {
        for (const t of triggers.slice(-3)) {
            response += `• ${t.mood} (${t.reason})\n`;
        }
    }

    await interaction.reply({
        content: response,
        ephemeral: true
    });
}

/**
 * Handle /admin personality mood
 */
async function handlePersonalityMood(interaction) {
    const moodName = interaction.options.getString('mood');

    const success = setMood(moodName, `admin_set_by_${interaction.user.tag}`);

    if (success) {
        const moodInfo = Moods[moodName];
        await interaction.reply({
            content: `${moodInfo.emoji} Set Beboa's mood to **${moodName}**\n\n*${moodInfo.description}*\n\nThis will last ~${moodInfo.duration} minutes.`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: `❌ Failed to set mood to ${moodName}`,
            ephemeral: true
        });
    }
}

/**
 * Handle /admin personality relationship
 */
async function handlePersonalityRelationship(interaction) {
    const targetUser = interaction.options.getUser('user');
    const rel = getRelationship(targetUser.id);

    let response = `**Beboa's Relationship with ${targetUser.tag}**\n\n`;

    response += `**Stage:** ${rel.stage?.label || 'Unknown'}\n`;
    response += `*${rel.stage?.behavior || 'Default behavior'}*\n\n`;

    response += `**Metrics:**\n`;
    const metrics = [
        ['Affection', rel.affection],
        ['Trust', rel.trust],
        ['Familiarity', rel.familiarity],
        ['Rivalry', rel.rivalry]
    ];

    for (const [name, value] of metrics) {
        const bar = '█'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
        response += `${name}: [${bar}] ${(value * 100).toFixed(0)}%\n`;
    }

    response += `\n**Interactions:** ${rel.interaction_count || 0}\n`;

    if (rel.nickname) {
        response += `**Nickname:** "${rel.nickname}"\n`;
    }

    if (rel.insideJokes && rel.insideJokes.length > 0) {
        response += `\n**Inside Jokes:**\n`;
        for (const joke of rel.insideJokes.slice(-3)) {
            response += `• ${joke}\n`;
        }
    }

    await interaction.reply({
        content: response,
        ephemeral: true
    });
}

export default { data, execute };
