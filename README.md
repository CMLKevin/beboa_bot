# Beboa Bot

A Discord loyalty/engagement bot for BubbleBebe's community server. Beboa is an AI-powered snake companion with a dynamic evolving personality who tracks daily check-ins, awards "Bebits" currency, remembers conversations through semantic memory, and builds genuine relationships with community members over time.

**[View Full Documentation](https://cmlkevin.github.io/beboa_evo/)** | [GitHub](https://github.com/CMLKevin/beboa_evo)

## Features

### Core Features
- **Daily Check-ins** - Users earn 1 Bebit per day with `/checkin`
- **Streak System** - 72-hour grace period to maintain streaks
- **Leaderboard** - Top 10 users ranked by Bebits
- **Reward Shop** - 11 reward tiers from 1 to 500 Bebits

### AI Evolution System
- **Dynamic Personality** - 14 personality traits that evolve through interactions
- **Mood System** - 11 distinct moods affecting behavior in real-time
- **Relationship Tracking** - Per-user relationship stages from Stranger to Family
- **User Memory** - Vector-based semantic memory with auto-extraction per user
- **Server Memory** - Ambient awareness of all server conversations across channels
- **LLM Evaluator** - Centralized intelligent evaluation for mood detection and interaction quality
- **Tool Calls** - Image generation, memory recall, dice rolling, and extensible tools
- **Jarvis Mode 2.0** - Smart natural language admin commands with 25+ commands

### Admin Tools
- Manage Bebits, streaks, and view stats
- Memory management (add, search, view status)
- Personality control (view state, set mood, view relationships)
- Jarvis permission management

## Quick Start

### Prerequisites

- Node.js 20 or higher
- A Discord bot application with a token
- OpenRouter API key (required for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/CMLKevin/beboa_evo.git
cd beboa_evo

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start the bot
npm start
```

Enable **Message Content Intent** in the [Discord Developer Portal](https://discord.com/developers/applications) under Bot → Privileged Gateway Intents.

## Configuration

### Required Variables

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id
CHECKIN_CHANNEL_ID=your_checkin_channel_id
NOTIFICATION_CHANNEL_ID=your_notification_channel_id
ADMIN_ROLE_ID=role_to_ping_for_redemptions

# OpenRouter API (Required for AI)
OPENROUTER_API_KEY=your_openrouter_api_key
```

### AI Configuration

```env
# Models
OPENROUTER_MODEL=x-ai/grok-4.1-fast
EMBEDDING_MODEL=openai/text-embedding-3-small
IMAGE_MODEL=bytedance-seed/seedream-4.5
LLM_EVALUATOR_MODEL=x-ai/grok-4.1-fast

# Enable/Disable Features
CHAT_ENABLED=true
MEMORY_ENABLED=true
MEMORY_AUTO_EXTRACT=true
SERVER_MEMORY_ENABLED=true
TOOLS_ENABLED=true
LLM_EVALUATOR_ENABLED=true
```

See the [Configuration Guide](https://cmlkevin.github.io/beboa_evo/getting-started/configuration) for all options.

## Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/checkin` | Daily check-in to earn 1 Bebit |
| `/balance` | Check your Bebits and streak |
| `/leaderboard` | View top 10 users |
| `/shop` | Browse and redeem rewards |
| `/chat` | Talk to Beboa |
| `/summarize` | Summarize channel messages |
| `@Beboa` | Mention Beboa to chat |

### Admin Commands

See the [Admin Commands Reference](https://cmlkevin.github.io/beboa_evo/commands/admin) for the full list.

## AI Systems

### How It Works

```
User Message
     ↓
┌─────────────────────────────────────────────────┐
│              LLM Evaluator                      │
│  (Mood detection, intent analysis, quality)     │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  User Memory    │  │  Server Memory  │  │  Relationship   │
│  (Per-user)     │  │  (All channels) │  │  (Trust/Stage)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     ↓                      ↓                      ↓
┌─────────────────────────────────────────────────┐
│              Personality Engine                 │
│  (14 traits + current mood + relationship)      │
└─────────────────────────────────────────────────┘
     ↓
   Response (with optional tool calls)
```

### Key Systems

| System | Description |
|--------|-------------|
| **Dynamic Personality** | 14 evolving traits (Big Five + custom) that change through interactions |
| **Mood System** | 11 moods (happy, annoyed, mischievous, etc.) affecting tone and behavior |
| **Relationships** | 6 stages from Stranger → Family with individual trust/affection metrics |
| **User Memory** | Per-user semantic memory with vector search and auto-extraction |
| **Server Memory** | Ambient awareness of all conversations with hourly/daily summaries |
| **LLM Evaluator** | Centralized evaluation for mood impact, intent, and interaction quality |

See the [AI Systems Documentation](https://cmlkevin.github.io/beboa_evo/ai) for deep dives into each system.

### Jarvis Mode 2.0

Natural language admin commands for the server owner:

```
"give Kevin 100 bebits"
"what do you remember about cats"
"set mood to mischievous"
"bonk @user"
"ship @user1 x @user2"
```

Features smart intent parsing with synonym support, context memory, and AI fallback. See [Jarvis Mode Documentation](https://cmlkevin.github.io/beboa_evo/jarvis).

## Project Structure

```
beboa-bot/
├── src/
│   ├── index.js              # Entry point
│   ├── config.js             # Environment config
│   ├── database.js           # SQLite database
│   ├── commands/             # Slash commands
│   ├── handlers/             # Event handlers
│   ├── migrations/           # Database migrations
│   ├── services/
│   │   ├── openrouter.js     # OpenRouter API client
│   │   ├── embedding.js      # Vector embeddings
│   │   ├── memory.js         # User semantic memory
│   │   ├── serverMemory.js   # Server-wide memory
│   │   ├── llmEvaluator.js   # Centralized LLM evaluation
│   │   ├── personality.js    # Dynamic personality
│   │   ├── tools.js          # AI tool framework
│   │   ├── channelContext.js # Channel awareness
│   │   └── adminCommands.js  # Jarvis-style commands
│   └── utils/
│       └── beboa-persona.js  # AI personality & prompts
├── docs/                     # Next.js documentation site
├── data/
│   └── beboa.db              # SQLite database
└── README.md
```

## Documentation

The full documentation is available at **[cmlkevin.github.io/beboa_evo](https://cmlkevin.github.io/beboa_evo/)**.

- [Quick Start Guide](https://cmlkevin.github.io/beboa_evo/getting-started/quickstart)
- [Configuration Reference](https://cmlkevin.github.io/beboa_evo/getting-started/configuration)
- [AI Systems Overview](https://cmlkevin.github.io/beboa_evo/ai)
- [Jarvis Mode 2.0](https://cmlkevin.github.io/beboa_evo/jarvis)
- [Commands Reference](https://cmlkevin.github.io/beboa_evo/commands/user)
- [Architecture](https://cmlkevin.github.io/beboa_evo/architecture/structure)

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in the Railway dashboard
3. Deploy

### VPS / DigitalOcean

```bash
git clone https://github.com/CMLKevin/beboa_evo.git
cd beboa_evo
npm install --production

# Use PM2 for process management
npm install -g pm2
pm2 start src/index.js --name beboa
pm2 save && pm2 startup
```

## License

ISC
