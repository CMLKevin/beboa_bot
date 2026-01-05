# Admin Commands

Slash commands for server administrators and moderators.

## Access Control

Admin commands require specific roles or permissions:
- Server Administrator permission, or
- Role specified in `ADMIN_ROLE_ID`

## /admin Command Tree

All admin functions are under the `/admin` parent command.

---

### /admin bebits

Manage user Bebits.

#### /admin bebits give
Award Bebits to a user.

**Usage:** `/admin bebits give @user amount`

**Example:** `/admin bebits give @CoolUser 100`

---

#### /admin bebits remove
Remove Bebits from a user.

**Usage:** `/admin bebits remove @user amount`

**Example:** `/admin bebits remove @BadUser 50`

---

#### /admin bebits set
Set exact balance for a user.

**Usage:** `/admin bebits set @user amount`

**Example:** `/admin bebits set @User 500`

---

#### /admin bebits reset
Reset a user's Bebits to zero.

**Usage:** `/admin bebits reset @user`

**Requires confirmation.**

---

### /admin streak

Manage user streaks.

#### /admin streak reset
Reset a user's check-in streak.

**Usage:** `/admin streak reset @user`

**Example:** `/admin streak reset @User`

---

#### /admin streak set
Set a user's streak to specific value.

**Usage:** `/admin streak set @user days`

**Example:** `/admin streak set @User 30`

---

### /admin jarvis

Manage Jarvis Mode access.

#### /admin jarvis grant
Grant Jarvis Mode access to a user.

**Usage:** `/admin jarvis grant @user`

**Example:** `/admin jarvis grant @TrustedMod`

---

#### /admin jarvis revoke
Revoke Jarvis Mode access.

**Usage:** `/admin jarvis revoke @user`

---

#### /admin jarvis list
List all users with Jarvis access.

**Usage:** `/admin jarvis list`

---

#### /admin jarvis commands
Show all available Jarvis Mode commands.

**Usage:** `/admin jarvis commands`

**Response:**
```
🐍 Jarvis Mode Commands

💰 Bebits Management
• give_bebits - "give @user 100 bebits"
• remove_bebits - "take 50 from @user"
...

📊 Information
• user_info - "tell me about @user"
...

🎭 Fun
• bonk - "bonk @user"
• roast - "roast @user"
...
```

---

### /admin personality

View and modify Beboa's personality.

#### /admin personality view
View current personality traits.

**Usage:** `/admin personality view`

**Response:**
```
🧬 Beboa's Personality

Openness:        ████████░░ 0.70
Conscientiousness: ████░░░░░░ 0.40
Extraversion:    ██████░░░░ 0.60
Agreeableness:   ███░░░░░░░ 0.30
Neuroticism:     █████░░░░░ 0.50

Sarcasm:         █████████░ 0.85
Playfulness:     ████████░░ 0.80
...
```

---

#### /admin personality set
Set a personality trait.

**Usage:** `/admin personality set trait value`

**Example:** `/admin personality set sarcasm 0.7`

**Valid traits:** openness, conscientiousness, extraversion, agreeableness, neuroticism, playfulness, sarcasm, protectiveness, curiosity, stubbornness, affection_hidden, mischief, drama, loyalty

---

#### /admin personality reset
Reset personality to defaults.

**Usage:** `/admin personality reset`

**Requires confirmation.**

---

### /admin mood

Manage Beboa's mood.

#### /admin mood view
View current mood.

**Usage:** `/admin mood view`

---

#### /admin mood set
Set Beboa's mood.

**Usage:** `/admin mood set mood_name`

**Example:** `/admin mood set mischievous`

**Valid moods:** neutral, happy, excited, mischievous, annoyed, sleepy, curious, affectionate, dramatic, grumpy, playful, protective

---

### /admin memory

Manage the memory system.

#### /admin memory view
View memories for a user.

**Usage:** `/admin memory view @user`

---

#### /admin memory add
Add a memory about a user.

**Usage:** `/admin memory add @user "memory content"`

**Example:** `/admin memory add @User "Likes pizza, hates olives"`

---

#### /admin memory search
Search memories.

**Usage:** `/admin memory search query`

**Example:** `/admin memory search birthday`

---

#### /admin memory clear
Clear all memories for a user.

**Usage:** `/admin memory clear @user`

**Requires confirmation.**

---

### /admin stats

View server statistics.

**Usage:** `/admin stats`

**Response:**
```
📊 Server Statistics

Users: 150 total, 45 active this week
Total Bebits: 45,000
Average Balance: 300

Top Streaker: @User (45 days)
Most Bebits: @RichUser (5,000)

Check-ins Today: 23
AI Messages Today: 156
```

---

### /admin announce

Send an announcement via Beboa.

**Usage:** `/admin announce message channel`

**Example:** `/admin announce "Server event tonight at 8pm!" #general`

---

## Permissions Matrix

| Command | Admin | Mod | Jarvis User |
|---------|-------|-----|-------------|
| /admin bebits | ✅ | ✅ | ❌ |
| /admin streak | ✅ | ✅ | ❌ |
| /admin jarvis grant | ✅ | ❌ | ❌ |
| /admin jarvis revoke | ✅ | ❌ | ❌ |
| /admin personality | ✅ | ❌ | ✅* |
| /admin mood | ✅ | ❌ | ✅* |
| /admin memory | ✅ | ✅ | ✅* |
| /admin stats | ✅ | ✅ | ✅* |
| /admin announce | ✅ | ❌ | ❌ |

*Jarvis users can access via natural language in chat

## Audit Logging

All admin commands are logged:

```javascript
// data/admin_log.json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "admin": "123456789",
    "command": "bebits_give",
    "target": "987654321",
    "details": { "amount": 100 },
    "result": "success"
}
```

Access logs via:
```bash
cat data/admin_log.json | jq '.[] | select(.command == "bebits_give")'
```
