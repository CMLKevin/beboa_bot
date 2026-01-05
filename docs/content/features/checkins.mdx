# Daily Check-ins

The check-in system encourages daily engagement with streak tracking and rewards.

## How It Works

Users run `/checkin` once per day to:
- Earn base Bebits (default: 10)
- Build a streak for bonus rewards
- Compete on the leaderboard

## Streak System

Consecutive daily check-ins build a streak:

| Streak | Bonus | Total Earned |
|--------|-------|--------------|
| 1-6 days | +0 | 10 Bebits |
| 7 days | +5 | 15 Bebits |
| 14 days | +10 | 20 Bebits |
| 30 days | +20 | 30 Bebits |
| 60 days | +35 | 45 Bebits |
| 100 days | +50 | 60 Bebits |

### Grace Period

Miss a day? You have **72 hours** before your streak resets.

```
Day 1: Check-in ✅ (Streak: 1)
Day 2: Check-in ✅ (Streak: 2)
Day 3: Missed ⚠️ (72hr grace starts)
Day 4: Check-in ✅ (Streak: 3, saved!)
```

If you miss the grace period:
```
Day 1: Check-in ✅ (Streak: 1)
Day 2-4: Missed ❌ (Grace expired)
Day 5: Check-in ✅ (Streak: 1, reset)
```

## Commands

### `/checkin`
Perform your daily check-in.

**Response includes:**
- Bebits earned
- Current streak
- Streak bonus (if applicable)
- Next milestone

### `/streak`
View your current streak status.

**Shows:**
- Current streak count
- Grace period status
- Days until next bonus tier
- Streak history

## Check-in Channel

Check-ins are restricted to a designated channel:

```env
CHECKIN_CHANNEL_ID=1234567890
```

Attempting to check in elsewhere shows an error directing users to the correct channel.

## Database Schema

Check-in data is stored in the `users` table:

```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    bebits INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_checkin TEXT,
    longest_streak INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0
);
```

## Customization

### Adjust Base Reward

Edit `src/commands/checkin.js`:

```javascript
const BASE_REWARD = 10; // Change this value
```

### Modify Streak Bonuses

Edit the `calculateStreakBonus` function:

```javascript
function calculateStreakBonus(streak) {
    if (streak >= 100) return 50;
    if (streak >= 60) return 35;
    if (streak >= 30) return 20;
    if (streak >= 14) return 10;
    if (streak >= 7) return 5;
    return 0;
}
```

### Change Grace Period

Edit the grace period constant:

```javascript
const GRACE_PERIOD_HOURS = 72; // Change to desired hours
```

## Best Practices

1. **Announce the system** - Let users know about check-ins and rewards
2. **Pin check-in channel** - Make it easy to find
3. **Create leaderboard competition** - Highlight top streakers
4. **Celebrate milestones** - Announce when users hit 100-day streaks
