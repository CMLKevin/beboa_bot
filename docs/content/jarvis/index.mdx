# Jarvis Mode 2.0

Natural language admin commands for server owners. Control Beboa through casual conversation.

## What is Jarvis Mode?

Jarvis Mode lets authorized users manage the bot through natural chat instead of rigid slash commands. Named after Iron Man's AI assistant, it interprets intent rather than requiring exact syntax.

**Instead of:**
```
/admin bebits give user:@CoolUser amount:100
```

**Just say:**
```
"give @CoolUser 100 bebits"
"award cooluser a hundred points"
"bless that guy with 100"
```

## Getting Access

### Primary Owner
Set in environment:
```env
BEBE_USER_ID=your_discord_user_id
```
This user always has full Jarvis access.

### Additional Users
Grant via slash command:
```
/admin jarvis grant @user
```

Revoke access:
```
/admin jarvis revoke @user
```

## How to Use

### @Mention Beboa
```
@Beboa give @user 50 bebits
```

### Reply to Beboa
Reply to any Beboa message with your command.

### DM Beboa (if enabled)
Send a direct message with your command.

## The 5-Stage Intent Parser

Jarvis Mode uses sophisticated parsing to understand your requests:

### Stage 1: Pattern Matching
Exact regex patterns for common commands:
```
"give @user 100 bebits" → give_bebits command
"show stats" → server_stats command
```

### Stage 2: Intent Analysis
Keyword scoring across 25+ command types:
```javascript
// Keywords for give_bebits
['give', 'award', 'grant', 'add', 'bless', 'bebits', 'points']

// "bless user with points" scores high for give_bebits
```

### Stage 3: Entity Extraction
Identifies users, amounts, and targets:
```
"give the top person 50" →
  target: @top_user (from leaderboard)
  amount: 50
```

### Stage 4: AI Fallback
For ambiguous requests, AI interprets intent:
```
"make cooluser rich" → give_bebits with large amount
```

### Stage 5: Context Substitution
Uses conversation history for follow-ups:
```
"give @user 50 bebits"
"give them 50 more" → same user, +50
```

## Command Categories

### Bebits Management
```
"give @user 100 bebits"
"take 50 from @user"
"set @user balance to 500"
"transfer 100 from @user1 to @user2"
"give everyone 10 bebits"
```

### Information
```
"user info @user"
"compare @user1 and @user2"
"show server stats"
"what's @user's balance"
```

### Memory System
```
"remember that @user likes cats"
"what do you remember about @user"
"search memories for birthday"
```

### Personality
```
"what mood are you in"
"set mood to sleepy"
"show personality stats"
```

### Fun Commands
```
"bonk @user"
"roast @user"
"praise @user"
"fortune @user"
"spin the wheel @user1 @user2 @user3"
```

### Admin
```
"announce: Server event at 8pm!"
"help" / "what can you do"
```

## Conversation Context

Jarvis Mode remembers recent interactions:

```
Bebe: "give @user 100 bebits"
Beboa: "Done! @user now has 150 bebits."

Bebe: "give them 50 more"
Beboa: "Added 50 more to @user. They now have 200."

Bebe: "actually take 25 back"
Beboa: "Removed 25 from @user. Balance: 175."
```

### Context Memory
- Last mentioned user
- Last action type
- Last amount used
- Recent conversation topic

## Confirmation Flow

Destructive or large actions require confirmation:

```
Bebe: "give everyone 1000 bebits"
Beboa: "⚠️ This will give 1000 bebits to 50 users (50,000 total). Type 'confirm' to proceed."

Bebe: "confirm"
Beboa: "Done! Mass gifted 1000 bebits to 50 users."
```

### Actions Requiring Confirmation
- Mass bebits operations (>5 users)
- Large amounts (>500 bebits)
- Balance resets
- Memory deletions

## Error Handling

### Ambiguous Commands
```
Bebe: "do the thing"
Beboa: "I'm not sure what you want me to do. Could you be more specific? Try 'help' to see what I can do!"
```

### Missing Information
```
Bebe: "give bebits"
Beboa: "Give bebits to whom? And how many? Try: 'give @user 100 bebits'"
```

### Permission Issues
```
User without access: "give @user 100 bebits"
Beboa: *ignores or responds normally without executing*
```

## Best Practices

1. **Be conversational** - Talk naturally, don't worry about exact syntax
2. **Mention users** - Use @mentions for clarity
3. **Use context** - "them", "that user", "same amount" work in follow-ups
4. **Confirm big actions** - Always review confirmations before proceeding
5. **Ask for help** - "what can you do" lists all available commands
