# AI Chat

Beboa responds to @mentions with context-aware, personality-driven conversation.

## How It Works

1. User @mentions Beboa
2. Bot gathers context (history, memories, mood)
3. AI generates response with personality
4. Response is sent to channel
5. Memory extraction runs (if enabled)

## Triggering Chat

Beboa responds when:
- Directly @mentioned: `@Beboa hello!`
- Replied to: Reply to any Beboa message
- In DMs: Direct messages (if enabled)

## Context System

Each response considers multiple context sources:

### Channel Context
Recent messages in the channel (configurable):
```env
CHANNEL_CONTEXT_LIMIT=20
```

### Conversation History
Per-user conversation memory:
```env
CHAT_MAX_HISTORY=150
```

### Semantic Memories
Relevant facts about the user retrieved via vector search.

### Relationship Data
- Trust level (0-100)
- Relationship stage
- Total interactions
- Last interaction time

### Current Mood
One of 12 mood states affecting response tone.

## Configuration

```env
# Enable/disable chat
CHAT_ENABLED=true

# Cooldown between responses (seconds)
CHAT_COOLDOWN_SECONDS=1

# AI model for chat
OPENROUTER_MODEL=deepseek/deepseek-chat

# Response length
OPENROUTER_MAX_TOKENS=1000

# Creativity (0.0-2.0)
OPENROUTER_TEMPERATURE=0.9
```

## Rate Limiting

Prevents spam and controls API costs:

- **Per-user cooldown**: `CHAT_COOLDOWN_SECONDS`
- **Global rate limit**: Built-in Discord.js handling
- **Token budget**: `OPENROUTER_MAX_TOKENS` per response

## Response Flow

```
@mention detected
       │
       ▼
┌──────────────────┐
│ Check cooldown   │──── Too fast → "Slow down!"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Build context    │
│ - Channel msgs   │
│ - User memories  │
│ - Personality    │
│ - Current mood   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Send to AI       │
│ - System prompt  │
│ - Context        │
│ - User message   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check for tools  │──── Tool detected → Execute
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Post-process     │
│ - Extract memory │
│ - Update mood    │
│ - Log stats      │
└────────┬─────────┘
         │
         ▼
    Send response
```

## Personality in Responses

Beboa's responses reflect:

1. **Base Personality**: Bratty, snarky, secretly caring
2. **Dynamic Traits**: Extraversion, agreeableness, etc.
3. **Current Mood**: Happy, mischievous, sleepy, etc.
4. **Relationship**: Warmer to trusted users
5. **Context**: Aware of conversation flow

Example personality differences:

**High Trust User:**
> "Ugh, FINE, I'll help you with that... but only because you're not completely annoying. Don't let it go to your head! 🐍"

**New User:**
> "Hmph. Who are you and why are you bothering me? ...I suppose I can answer ONE question."

## Tool Integration

When `TOOLS_ENABLED=true`, Beboa can:

- Generate images (`IMAGE_GEN_ENABLED=true`)
- Roll dice for users
- Check weather (if configured)
- Search memories
- And more via [Tool Calls](../ai/tools.md)

## Summarize Command

Use `/summarize` to get an AI summary of recent channel activity:

```
/summarize [count]
```

- `count`: Number of messages to summarize (5-100, default 25)
- Provides bullet-point summary
- Useful for catching up on missed conversations

## Best Practices

1. **Set appropriate cooldown** - Balance responsiveness with costs
2. **Monitor token usage** - Watch OpenRouter dashboard
3. **Tune temperature** - Lower for consistent, higher for creative
4. **Use context limits wisely** - More context = better responses = more tokens
5. **Enable memory gradually** - Start without, add once stable
