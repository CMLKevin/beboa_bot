# API Reference

Complete API documentation for Beboa's services.

## Database Service

`src/services/database.js`

### User Operations

#### getUser(userId)
Get user data by Discord ID.

```javascript
import { getUser } from './services/database.js';

const user = await getUser('123456789');
// Returns:
{
    user_id: '123456789',
    username: 'CoolUser',
    bebits: 150,
    streak: 7,
    longest_streak: 14,
    total_checkins: 30,
    last_checkin: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
}
```

#### createUser(userId, username)
Create new user record.

```javascript
const user = await createUser('123456789', 'CoolUser');
```

#### updateUser(userId, data)
Update user fields.

```javascript
await updateUser('123456789', {
    username: 'NewName',
    bebits: 200
});
```

---

### Bebits Operations

#### addBebits(userId, amount)
Add bebits to user balance.

```javascript
const newBalance = await addBebits('123456789', 100);
// Returns: 250 (new balance)
```

#### removeBebits(userId, amount)
Remove bebits from user balance.

```javascript
const newBalance = await removeBebits('123456789', 50);
// Returns: 200 (new balance)
// Throws if insufficient balance
```

#### setBebits(userId, amount)
Set exact bebits balance.

```javascript
await setBebits('123456789', 500);
```

#### transferBebits(fromId, toId, amount)
Transfer bebits between users.

```javascript
await transferBebits('123456789', '987654321', 100);
// Throws if sender has insufficient balance
```

---

### Check-in Operations

#### performCheckin(userId)
Process daily check-in.

```javascript
const result = await performCheckin('123456789');
// Returns:
{
    success: true,
    bebitsEarned: 15,       // base + streak bonus
    baseReward: 10,
    streakBonus: 5,
    newStreak: 8,
    newBalance: 265,
    nextMilestone: { days: 14, bonus: 10 }
}

// Or if already checked in:
{
    success: false,
    error: 'already_checked_in',
    nextCheckin: '2024-01-16T00:00:00Z'
}
```

#### getStreak(userId)
Get user's streak info.

```javascript
const streak = await getStreak('123456789');
// Returns:
{
    current: 7,
    longest: 14,
    lastCheckin: '2024-01-15T10:00:00Z',
    graceRemaining: 48,  // hours
    nextBonus: { days: 14, bonus: 10 }
}
```

---

### Leaderboard

#### getLeaderboard(limit = 10)
Get top users by bebits.

```javascript
const leaders = await getLeaderboard(10);
// Returns:
[
    { rank: 1, user_id: '111', username: 'Top', bebits: 5000 },
    { rank: 2, user_id: '222', username: 'Second', bebits: 3000 },
    // ...
]
```

#### getUserRank(userId)
Get user's rank on leaderboard.

```javascript
const rank = await getUserRank('123456789');
// Returns: 15
```

---

## OpenRouter Service

`src/services/openrouter.js`

### generateResponse(messages, options)
Generate AI chat response.

```javascript
import { generateResponse } from './services/openrouter.js';

const response = await generateResponse([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
], {
    model: 'deepseek/deepseek-chat',  // optional
    maxTokens: 1000,                   // optional
    temperature: 0.9,                  // optional
    tools: [/* tool definitions */]    // optional
});

// Returns OpenRouter API response
```

### generateEmbedding(text)
Generate vector embedding.

```javascript
const embedding = await generateEmbedding('Some text to embed');
// Returns: Float64Array[1536]
```

### generateImage(prompt, options)
Generate image.

```javascript
const result = await generateImage('A cute snake with a top hat', {
    model: 'bytedance-seed/seedream-4.5',  // optional
    size: '1024x1024'                       // optional
});
// Returns: { url: 'https://...' }
```

---

## Memory Service

`src/services/memory.js`

### addMemory(userId, content, type, importance)
Store a new memory.

```javascript
import { addMemory } from './services/memory.js';

const memory = await addMemory(
    '123456789',
    'User likes cats',
    'preference',
    0.7
);
// Returns: { id: 1, ... }
```

### searchMemories(userId, query, limit)
Search memories by semantic similarity.

```javascript
const memories = await searchMemories('123456789', 'pets', 5);
// Returns:
[
    {
        id: 1,
        content: 'User likes cats',
        memory_type: 'preference',
        importance: 0.7,
        similarity: 0.85,
        created_at: '2024-01-10T00:00:00Z'
    },
    // ...
]
```

### getMemories(userId, limit)
Get all memories for user.

```javascript
const memories = await getMemories('123456789', 20);
```

### deleteMemory(memoryId)
Delete a specific memory.

```javascript
await deleteMemory(1);
```

### extractMemories(userId, conversation)
Auto-extract memories from conversation.

```javascript
const extracted = await extractMemories('123456789', [
    { role: 'user', content: 'I just got a new puppy named Max!' },
    { role: 'assistant', content: 'Aww, congratulations!' }
]);
// Returns:
[
    { content: 'User has a puppy named Max', type: 'fact', importance: 0.8 }
]
```

---

## Personality Service

`src/services/personality.js`

### getPersonality()
Get current personality state.

```javascript
import { getPersonality } from './services/personality.js';

const personality = await getPersonality();
// Returns:
{
    openness: 0.7,
    conscientiousness: 0.4,
    extraversion: 0.6,
    agreeableness: 0.3,
    neuroticism: 0.5,
    playfulness: 0.8,
    sarcasm: 0.85,
    // ... all 14 traits
}
```

### updateTrait(trait, value)
Set a personality trait.

```javascript
await updateTrait('sarcasm', 0.7);
```

### evolveTrait(trait, delta)
Adjust trait by delta (clamped 0.1-0.9).

```javascript
await evolveTrait('agreeableness', 0.05);  // Increase by 0.05
await evolveTrait('agreeableness', -0.02); // Decrease by 0.02
```

### getCurrentMood()
Get current mood state.

```javascript
const mood = await getCurrentMood();
// Returns:
{
    mood: 'mischievous',
    intensity: 0.7,
    lastChanged: '2024-01-15T10:00:00Z'
}
```

### setMood(mood, intensity)
Set current mood.

```javascript
await setMood('sleepy', 0.8);
```

### getRelationship(userId)
Get relationship data for user.

```javascript
const relationship = await getRelationship('123456789');
// Returns:
{
    trust_level: 65.5,
    relationship_stage: 'friend',
    total_interactions: 150,
    positive_interactions: 120,
    negative_interactions: 5,
    first_interaction: '2024-01-01T00:00:00Z',
    last_interaction: '2024-01-15T10:00:00Z'
}
```

---

## Admin Commands Service

`src/services/adminCommands.js`

### parseAndExecuteAdminCommand(message, context)
Main Jarvis Mode entry point.

```javascript
import { parseAndExecuteAdminCommand } from './services/adminCommands.js';

const result = await parseAndExecuteAdminCommand(message, {
    userId: message.author.id,
    guildId: message.guild.id
});

// Returns:
{
    handled: true,
    response: 'Gave 100 bebits to @User!',
    command: 'give_bebits',
    params: { target: '123456789', amount: 100 }
}

// Or if not a command:
{
    handled: false
}
```

### getAvailableAdminCommands()
Get all registered commands by category.

```javascript
const commands = getAvailableAdminCommands();
// Returns:
{
    bebits: ['give_bebits', 'remove_bebits', 'set_bebits', ...],
    info: ['user_info', 'server_stats', ...],
    memory: ['add_note', 'search_memories'],
    personality: ['set_mood', 'personality_status'],
    fun: ['bonk', 'roast', 'praise', ...],
    admin: ['announce', 'jarvis_help']
}
```

### isJarvisUser(userId)
Check if user has Jarvis access.

```javascript
const hasAccess = await isJarvisUser('123456789');
// Returns: true/false
```

---

## Chat Service

`src/services/chat.js`

### handleChat(message, context)
Process a chat message.

```javascript
import { handleChat } from './services/chat.js';

const response = await handleChat(message, {
    includeMemories: true,
    includePersonality: true
});
```

### buildContext(userId, channelId)
Build context for AI.

```javascript
const context = await buildContext('123456789', '111222333');
// Returns:
{
    history: [/* recent messages */],
    memories: [/* relevant memories */],
    personality: {/* current traits */},
    mood: {/* current mood */},
    relationship: {/* user relationship */}
}
```

### addToHistory(userId, role, content)
Add message to conversation history.

```javascript
await addToHistory('123456789', 'user', 'Hello!');
await addToHistory('123456789', 'assistant', 'Hi there!');
```

### getHistory(userId, limit)
Get conversation history.

```javascript
const history = await getHistory('123456789', 50);
// Returns:
[
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there!' },
    // ...
]
```

### clearHistory(userId)
Clear user's conversation history.

```javascript
await clearHistory('123456789');
```

---

## Tools Service

`src/services/tools.js`

### getEnabledTools()
Get tool definitions for enabled tools.

```javascript
import { getEnabledTools } from './services/tools.js';

const tools = getEnabledTools();
// Returns array of tool definitions for OpenRouter
```

### executeToolCall(name, args, userId)
Execute a tool call.

```javascript
const result = await executeToolCall('roll_dice', { dice: '2d6' }, '123456789');
// Returns:
{
    success: true,
    result: { rolls: [4, 2], total: 6 }
}
```
