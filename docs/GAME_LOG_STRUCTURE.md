# Game Log Structure

This document describes the structure of BGA game logs returned by the `getGameLog()` API.

## Response Structure

```typescript
{
  status: 1,
  data: {
    logs: [...],      // Array of log packets (chronological game events)
    players: [...]    // Array of player info
  }
}
```

## Players Array

Contains basic player information:

```typescript
{
  id: 96457033,
  color: "#000000",
  name: "AlabeSons",
  avatar: "2c316c76f4"
}
```

## Logs Array

Each log entry represents a "packet" of events that happened at a specific time:

```typescript
{
  channel: "/table/t798145204",
  table_id: 798145204,
  packet_id: "5",           // Sequential packet number
  packet_type: "resend",
  move_id: "5",             // Move number
  time: "1769726974",       // Unix timestamp
  data: [...]               // Array of events
}
```

## Event Types

Each packet contains multiple events in its `data` array. Key event types:

### 1. **notifyChooseRace** - Race Selection

Contains the race chosen by a player and their initial game state:

```typescript
{
  uid: "697be3fe95a21",
  type: "notifyChooseRace",
  log: "",
  args: {
    player_name: "AlabeSons",
    playerId: 96457033,
    raceId: 3,              // Race ID! (3 = Hadsch Hallas in this case)
    player: {
      raceId: 3,
      gold: 15,
      ore: 4,
      knowledge: 3,
      qic: 2,
      score: 10,
      research: [0, 0, 0, 1, 0, 0, 0],
      power: [0, 2, 4, 0],
      techs: [],
      fedTiles: [],
      buildings: {
        "4": 8,  // 8 mines available
        "5": 4,  // 4 trading stations
        "6": 3,  // 3 research labs
        "7": 1,  // 1 planetary institute
        "8": 1,  // 1 academy (left)
        "9": 1   // 1 academy (right)
      },
      numAvailGaiaformers: 0,
      boosterId: 0,
      // ... other state
    }
  }
}
```

**Key Data:**
- `raceId` - Race selected by player
- `player.buildings` - Available buildings (will decrease as they build)
- `player.gold`, `ore`, `knowledge`, `qic` - Initial resources
- `player.score` - Initial score

### 2. **notifyBanRaceDraft** - Race Banning

During setup, players ban races:

```typescript
{
  type: "notifyBanRaceDraft",
  log: "${player_name} bans [RACE${raceId}]",
  args: {
    player_name: "felipetoito",
    raceId: 2,
    playerId: "89923063"
  }
}
```

### 3. **gameStateChange** - State Transitions

Indicates game state changes:

```typescript
{
  type: "gameStateChange",
  args: {
    id: 13,                // State ID
    active_player: 96457033,
    type: "activeplayer",
    updateGameProgression: 0
  }
}
```

### 4. **notifyGeneric** - Generic Notifications

Various game actions and messages:

```typescript
{
  type: "notifyGeneric",
  log: "${player_name} wins the auction for <b>[RACE${raceId}]</b>, spending [VP${vp}]",
  args: {
    player_name: "AlabeSons",
    raceId: 3,
    vp: 0
  }
}
```

### 5. Building Actions

Building actions are likely in `notifyGeneric` or similar events. Need to search for patterns like:
- Building mines
- Upgrading to trading stations
- Building research labs
- etc.

### 6. End Game

Final event marking game end:

```typescript
{
  type: "simpleNode",
  log: "End of game",
  args: []
}
```

Before this, there's a game state with final scores:

```typescript
{
  type: "gameStateChange",
  args: {
    name: "gameEnd",
    description: "End of game",
    args: {
      allPlayersScores: [
        {
          id: "96457033",
          player: "96457033",
          name: "AlabeSons",
          score: "175",      // Final score!
          rank: 1
        },
        {
          id: "89923063",
          player: "89923063",
          name: "felipetoito",
          score: "166",
          rank: 2
        }
      ]
    }
  }
}
```

## Parsing Strategy

To extract searchable data:

1. **Find Race Selection:**
   - Search for events with `type: "notifyChooseRace"`
   - Extract `args.raceId` and `args.playerId`
   - Map player ID to race

2. **Find Building Actions:**
   - Search through all `notifyGeneric` and other event types
   - Look for log messages containing building keywords
   - Extract round number from packet sequence

3. **Find Final Scores:**
   - Look for final `gameStateChange` with `name: "gameEnd"`
   - Extract scores from `args.allPlayersScores`

4. **Calculate Rounds:**
   - Count round transitions in game states
   - Track which packet/move corresponds to which round

## Race ID Mapping

Need to determine race ID to race name mapping. From the example:
- Race ID 3 = ? (AlabeSons chose this)
- Race ID 9 = ? (felipetoito chose this)
- Race ID 2 = Banned
- Race ID 8 = Banned

**TODO:** Create complete race ID mapping for all 14 Gaia Project races.

## Next Steps

1. Build a parser to extract:
   - Player race mapping
   - Building actions with round numbers
   - Final scores
   - Game metadata

2. Create helper functions to traverse log events efficiently

3. Map extracted data to our database schema fields
