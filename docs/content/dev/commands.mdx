# Extending Commands

Guide to adding new slash commands to Beboa.

## Command Structure

Each command is a module in `src/commands/` with two exports:

```javascript
// src/commands/example.js
import { SlashCommandBuilder } from 'discord.js';

// Command definition
export const data = new SlashCommandBuilder()
    .setName('example')
    .setDescription('An example command');

// Command handler
export async function execute(interaction) {
    await interaction.reply('Hello!');
}
```

## Creating a New Command

### Step 1: Create the File

```bash
touch src/commands/mycommand.js
```

### Step 2: Define the Command

```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser } from '../services/database.js';

export const data = new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Description of what this command does')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('The target user')
            .setRequired(false)
    )
    .addIntegerOption(option =>
        option
            .setName('amount')
            .setDescription('Amount value')
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(false)
    );

export async function execute(interaction) {
    // Get options
    const target = interaction.options.getUser('target') || interaction.user;
    const amount = interaction.options.getInteger('amount') || 10;

    // Do something
    const user = await getUser(target.id);

    // Build response
    const embed = new EmbedBuilder()
        .setTitle('My Command')
        .setDescription(`Target: ${target.username}`)
        .addFields({ name: 'Amount', value: String(amount) })
        .setColor(0x9B59B6);

    await interaction.reply({ embeds: [embed] });
}
```

### Step 3: Restart the Bot

Commands auto-load on startup. Just restart:

```bash
npm start
```

## Command Options

### User Options

```javascript
.addUserOption(option =>
    option.setName('user').setDescription('Target user').setRequired(true)
)

// In execute:
const user = interaction.options.getUser('user');
```

### String Options

```javascript
.addStringOption(option =>
    option.setName('message').setDescription('Your message').setRequired(true)
)

// With choices:
.addStringOption(option =>
    option
        .setName('mood')
        .setDescription('Select mood')
        .addChoices(
            { name: 'Happy', value: 'happy' },
            { name: 'Sad', value: 'sad' },
            { name: 'Angry', value: 'angry' }
        )
)

// In execute:
const message = interaction.options.getString('message');
const mood = interaction.options.getString('mood');
```

### Number Options

```javascript
.addIntegerOption(option =>
    option
        .setName('count')
        .setDescription('Number of items')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
)

.addNumberOption(option =>
    option
        .setName('percentage')
        .setDescription('Percentage value')
        .setMinValue(0)
        .setMaxValue(100)
)

// In execute:
const count = interaction.options.getInteger('count') || 10;
const percentage = interaction.options.getNumber('percentage');
```

### Boolean Options

```javascript
.addBooleanOption(option =>
    option.setName('ephemeral').setDescription('Only visible to you')
)

// In execute:
const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;
await interaction.reply({ content: 'Done!', ephemeral });
```

### Channel Options

```javascript
.addChannelOption(option =>
    option.setName('channel').setDescription('Target channel')
)

// In execute:
const channel = interaction.options.getChannel('channel') || interaction.channel;
```

### Role Options

```javascript
.addRoleOption(option =>
    option.setName('role').setDescription('Target role')
)

// In execute:
const role = interaction.options.getRole('role');
```

## Subcommands

For complex commands with multiple actions:

```javascript
export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Manage settings')
    .addSubcommand(sub =>
        sub.setName('view').setDescription('View current settings')
    )
    .addSubcommand(sub =>
        sub
            .setName('set')
            .setDescription('Change a setting')
            .addStringOption(opt =>
                opt.setName('key').setDescription('Setting name').setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('value').setDescription('New value').setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'view':
            await handleView(interaction);
            break;
        case 'set':
            await handleSet(interaction);
            break;
    }
}

async function handleView(interaction) {
    await interaction.reply('Current settings...');
}

async function handleSet(interaction) {
    const key = interaction.options.getString('key');
    const value = interaction.options.getString('value');
    await interaction.reply(`Set ${key} to ${value}`);
}
```

## Response Types

### Simple Reply

```javascript
await interaction.reply('Hello!');
```

### Ephemeral (Private) Reply

```javascript
await interaction.reply({ content: 'Only you can see this', ephemeral: true });
```

### Embed Reply

```javascript
const embed = new EmbedBuilder()
    .setTitle('Title')
    .setDescription('Description')
    .setColor(0x9B59B6)
    .addFields(
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2', inline: true }
    )
    .setFooter({ text: 'Footer text' })
    .setTimestamp();

await interaction.reply({ embeds: [embed] });
```

### Deferred Reply

For long operations (>3 seconds):

```javascript
await interaction.deferReply();

// Do long operation...
await someSlowFunction();

await interaction.editReply('Done!');
```

### Follow-up Messages

```javascript
await interaction.reply('First message');
await interaction.followUp('Second message');
await interaction.followUp({ content: 'Private', ephemeral: true });
```

## Permissions

### Require Permissions

```javascript
export const data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);
```

### Check Permissions in Handler

```javascript
export async function execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: 'You need Administrator permission!',
            ephemeral: true
        });
    }
    // Continue...
}
```

### Guild-Only Command

```javascript
export const data = new SlashCommandBuilder()
    .setName('serveronly')
    .setDescription('Only works in servers')
    .setDMPermission(false);
```

## Error Handling

```javascript
export async function execute(interaction) {
    try {
        // Command logic
        const result = await riskyOperation();
        await interaction.reply(`Success: ${result}`);
    } catch (error) {
        console.error('[COMMAND ERROR]', error);

        const errorMessage = {
            content: 'Something went wrong! Please try again.',
            ephemeral: true
        };

        // Handle both initial reply and deferred states
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}
```

## Complete Example

A full command with all features:

```javascript
// src/commands/gift.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addBebits, getUser } from '../services/database.js';

export const data = new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Gift bebits to another user')
    .addUserOption(option =>
        option
            .setName('recipient')
            .setDescription('Who to gift bebits to')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName('amount')
            .setDescription('Amount to gift')
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('message')
            .setDescription('Optional message')
            .setRequired(false)
    )
    .setDMPermission(false);

export async function execute(interaction) {
    const sender = interaction.user;
    const recipient = interaction.options.getUser('recipient');
    const amount = interaction.options.getInteger('amount');
    const message = interaction.options.getString('message');

    // Validation
    if (recipient.id === sender.id) {
        return interaction.reply({
            content: "You can't gift bebits to yourself!",
            ephemeral: true
        });
    }

    if (recipient.bot) {
        return interaction.reply({
            content: "You can't gift bebits to bots!",
            ephemeral: true
        });
    }

    // Check sender balance
    const senderData = await getUser(sender.id);
    if (senderData.bebits < amount) {
        return interaction.reply({
            content: `You don't have enough bebits! (Have: ${senderData.bebits})`,
            ephemeral: true
        });
    }

    // Defer for processing
    await interaction.deferReply();

    try {
        // Process gift
        await addBebits(sender.id, -amount);
        await addBebits(recipient.id, amount);

        // Build response
        const embed = new EmbedBuilder()
            .setTitle('🎁 Gift Sent!')
            .setDescription(`${sender} gifted **${amount} bebits** to ${recipient}!`)
            .setColor(0x9B59B6)
            .setTimestamp();

        if (message) {
            embed.addFields({ name: 'Message', value: message });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[GIFT ERROR]', error);
        await interaction.editReply('Failed to process gift. Please try again.');
    }
}
```
