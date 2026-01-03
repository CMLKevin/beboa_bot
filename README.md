# Beboa Bot

A Discord loyalty/engagement bot for BubbleBebe's community server. Beboa is an AI-powered snake companion who tracks daily check-ins, awards "Bebits" currency, allows users to redeem rewards, and engages in conversations with her bratty personality.

## Features

- **Daily Check-ins** - Users earn 1 Bebit per day with `/checkin`
- **Streak System** - 72-hour grace period to maintain streaks (cosmetic only)
- **Leaderboard** - Top 10 users ranked by Bebits
- **Reward Shop** - 11 reward tiers from 1 to 500 Bebits
- **AI Chat with Beboa** - Talk to Beboa via `/chat` or @mentions
- **Admin Tools** - Manage Bebits, streaks, chat history, and view stats

## Quick Start

### Prerequisites

- Node.js 20 or higher
- A Discord bot application with a token
- OpenRouter API key (optional, for AI chat feature)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd beboa-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Discord credentials:
   ```env
   # Discord Configuration (Required)
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_client_id
   GUILD_ID=your_server_id
   CHECKIN_CHANNEL_ID=your_checkin_channel_id
   NOTIFICATION_CHANNEL_ID=your_notification_channel_id
   ADMIN_ROLE_ID=role_to_ping_for_redemptions

   # OpenRouter Configuration (Optional - for AI chat)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=deepseek/deepseek-v3.2
   OPENROUTER_MAX_TOKENS=200
   OPENROUTER_TEMPERATURE=1

   # Chat Settings
   CHAT_COOLDOWN_SECONDS=1
   CHAT_MAX_HISTORY=50
   CHAT_ENABLED=true
   ```

4. Enable MessageContent Intent (required for @mentions):
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application -> Bot
   - Enable "Message Content Intent" under Privileged Gateway Intents

5. Start the bot:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

### Getting Discord IDs

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on channels, roles, or the server to copy their IDs

### Bot Permissions

When inviting the bot, ensure it has these permissions:
- Send Messages
- Use Application Commands
- Embed Links
- Mention Everyone (for pinging the admin role)
- Read Message Content (privileged intent, for @mentions)

Invite URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147485696&scope=bot%20applications.commands
```

## Commands

### User Commands

| Command | Description | Channel |
|---------|-------------|---------|
| `/checkin` | Daily check-in to earn 1 Bebit | #log-in only |
| `/balance` | Check your Bebits and streak | Any |
| `/leaderboard` | View top 10 users | Any |
| `/shop` | Browse and redeem rewards | Any |
| `/chat` | Talk to Beboa | Any |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/admin bebits add @user <amount>` | Add Bebits to a user |
| `/admin bebits remove @user <amount>` | Remove Bebits from a user |
| `/admin bebits set @user <amount>` | Set a user's Bebits balance |
| `/admin streak reset @user` | Reset a user's streak |
| `/admin stats` | View server statistics |
| `/admin chat clear` | Clear all shared conversation history |
| `/admin chat status` | View chat feature status and config |
| `/admin chat viewnote @user` | View Beboa's notes about a user |
| `/admin chat setnote @user <note>` | Set Beboa's notes about a user |
| `/admin chat clearnote @user` | Clear Beboa's notes about a user |

## AI Chat Feature

Beboa has an AI-powered personality that users can interact with. She's a bratty, arrogant snake who secretly cares about the community.

### Talking to Beboa

There are two ways to chat with Beboa:

1. **Slash Command**: Use `/chat message:Your message here`
2. **@Mention**: Simply mention @Beboa in any message

Both methods share the same conversation history, so Beboa remembers context across interactions.

### Shared Conversation Memory

- All users share a single conversation history - Beboa sees and remembers everyone's messages
- Messages are tagged with usernames: `[Username]: message`
- History persists across bot restarts (stored in database)
- History is limited to the last N exchanges (configurable via `CHAT_MAX_HISTORY`)
- Admins can clear history with `/admin chat clear`

### Beboa's Personality

- **Bratty & Arrogant** - Acts superior and condescending
- **Strict & Nagging** - Pushes users to be responsible and maintain their streaks
- **Secretly Caring** - Her strictness comes from genuine care
- **In-Character Always** - Never breaks character, insists she's a real snake

She knows about users' Bebits and streaks, and may reference them in conversation.

### Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | (required for chat) |
| `OPENROUTER_MODEL` | AI model to use | `deepseek/deepseek-chat` |
| `OPENROUTER_MAX_TOKENS` | Max response length | `300` |
| `OPENROUTER_TEMPERATURE` | Response creativity (0-2) | `0.9` |
| `CHAT_COOLDOWN_SECONDS` | Cooldown between messages per user | `30` |
| `CHAT_MAX_HISTORY` | Max conversation exchanges to remember | `10` |
| `CHAT_ENABLED` | Enable/disable chat feature | `true` |

Set `CHAT_ENABLED=false` to disable the chat feature entirely.

## Reward Tiers

| Reward | Cost |
|--------|------|
| A Bite From Bebe | 1 Bebit |
| Praise From Bebe | 2 Bebits |
| Degradation From Bebe | 5 Bebits |
| Simple Task/Punishment | 25 Bebits |
| Bebe Scam | 50 Bebits |
| Control Toy (5 min) | 100 Bebits |
| Voice Message (1-2 min) | 120 Bebits |
| 15 Minutes of Fame | 150 Bebits |
| Control Toy (15 min) | 200 Bebits |
| Voice Message (5-10 min) | 360 Bebits |
| GF For A Day | 500 Bebits |

## Mechanics

### Check-in Rules

- **Cooldown:** 24 hours between check-ins
- **Grace Period:** 72 hours to maintain streak
- **Bebits on Reset:** Kept (only streak resets)

### Streak Logic

| Time Since Last Check-in | Result |
|--------------------------|--------|
| < 24 hours | Cooldown - wait |
| 24-72 hours | Streak continues (+1) |
| > 72 hours | Streak resets to 1 |

## Project Structure

```
beboa-bot/
├── src/
│   ├── index.js              # Entry point
│   ├── config.js             # Environment config
│   ├── database.js           # SQLite database
│   ├── commands/
│   │   ├── checkin.js
│   │   ├── balance.js
│   │   ├── leaderboard.js
│   │   ├── shop.js
│   │   ├── chat.js           # AI chat command
│   │   ├── summarize.js      # Channel summarization
│   │   └── admin.js
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   ├── buttonHandler.js
│   │   └── messageHandler.js # @mention handler
│   ├── migrations/           # Database migrations
│   │   ├── runner.js         # Migration runner
│   │   ├── index.js          # Migration registry
│   │   └── 001_*.js          # Individual migrations
│   ├── services/
│   │   └── openrouter.js     # OpenRouter API client
│   └── utils/
│       ├── beboa-persona.js  # AI personality & prompts
│       ├── rewards.js
│       ├── messages.js
│       └── time.js
├── data/
│   └── beboa.db              # SQLite database (created at runtime)
├── .env
├── .env.example
├── package.json
└── README.md
```

## Database

The bot uses SQLite stored in `data/beboa.db`. The database is created automatically on first run.

### Migrations

Database schema changes are handled through migrations, ensuring safe updates without data loss.

**Migrations run automatically** when the bot starts - no manual steps required. The bot tracks which migrations have been applied in the `_migrations` table and only runs new ones.

To check migration status, look for log output on startup:
```
[MIGRATIONS] Running: 003_add_chat_history
[MIGRATIONS] Completed: 003_add_chat_history
[MIGRATIONS] Applied 1 migration(s)
```

Or if already up to date:
```
[MIGRATIONS] Database is up to date
```

### Creating New Migrations

When you need to change the database schema:

1. Create a new migration file in `src/migrations/`:
   ```javascript
   // src/migrations/004_your_change.js
   export const name = '004_your_change';

   export function up(db) {
       // Use db.exec() for schema changes
       db.exec(`ALTER TABLE users ADD COLUMN new_field TEXT`);
   }

   export default { name, up };
   ```

2. Register it in `src/migrations/index.js`:
   ```javascript
   import migration004 from './004_your_change.js';

   export const migrations = [
       // ... existing migrations
       migration004,
   ];
   ```

3. The migration will run automatically on next bot startup.

**Tips:**
- Use `IF NOT EXISTS` for tables/indexes to make migrations idempotent
- Check if columns exist before adding them (see `002_add_beboa_notes.js` for example)
- Migrations run in a transaction - if one fails, it rolls back

### Backup

To backup the database:
```bash
cp data/beboa.db backups/beboa_$(date +%Y%m%d).db
```

### Tables

- `users` - User data (discord_id, bebits, current_streak, last_checkin, total_checkins, beboa_notes)
- `redemptions` - Reward redemption history
- `chat_history` - Persistent AI conversation history
- `_migrations` - Tracks applied migrations

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in the Railway dashboard
3. Deploy

### VPS / DigitalOcean

1. Clone the repository to your server
2. Install Node.js 20+
3. Run `npm install --production`
4. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name beboa
   pm2 save
   pm2 startup
   ```

## License

ISC
