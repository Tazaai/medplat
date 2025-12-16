# Firebase gamification_stats Collection Structure

## Collection: `gamification_stats`

### Document Structure

Each document represents a user's gamification progress.

```javascript
{
  // Document ID: user_uid
  uid: "user_uid_string",
  
  // Core gamification metrics
  xp: 1250,                    // Total experience points
  level: 5,                    // Current user level (1-10)
  streak: 7,                   // Current daily streak
  longest_streak: 12,          // Best streak achieved
  completed_cases: 45,         // Total cases completed
  
  // Specialty progress tracking
  specialty_progress: {
    "Cardiology": {
      xp: 350,
      cases: 12,
      mastery_level: "intermediate"
    },
    "Infectious Diseases": {
      xp: 280,
      cases: 8,
      mastery_level: "beginner"
    }
    // ... other specialties
  },
  
  // Timestamps
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-20T14:45:00Z",
  last_activity: "2024-01-20T14:45:00Z",
  
  // Level thresholds (for reference)
  level_thresholds: {
    1: 0,
    2: 100,
    3: 250,
    4: 500,
    5: 1000,
    6: 2000,
    7: 3500,
    8: 5500,
    9: 8000,
    10: 12000
  }
}
```

### Indexes

- `uid` (primary key)
- `level` (for leaderboard queries)
- `xp` (for ranking)
- `streak` (for streak leaderboards)
- `last_activity` (for active user queries)

### Usage

This collection is updated:
- When a user completes a case (XP gain, case count increment)
- When a user makes correct decisions in simulation mode (XP gain)
- Daily streak tracking (increment/reset)
- Specialty progress updates

### Security Rules

```javascript
{
  "rules": {
    "gamification_stats": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

