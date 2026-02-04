# Game Log Structure

This document describes the structure of BGA game logs returned by the `getGameLog()` API and how we parse them.

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

## Parsed Output Structure

Our parser extracts and organizes the data into a compact structure:

```typescript
{
  tableId: string;
  gameId: number;
  gameName: string;
  playerCount: number;
  winnerName: string;
  players: [
    {
      playerId: number;
      playerName: string;
      raceId: number;
      raceName: string;
      finalScore: number;
      buildings: number[][]; // buildings[round] = [buildingId1, buildingId2, ...]
    }
  ];
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

### 5. **notifyBuild** - Building Mines

When a player builds a mine (building ID 4):

```typescript
{
  type: "notifyBuild",
  args: {
    playerId: "96457033",
    player_name: "AlabeSons"
    // Building is always a mine (ID 4)
  }
}
```

### 6. **notifyUpgrade** - Building/Upgrading Structures

When a player builds or upgrades to other structures:

```typescript
{
  type: "notifyUpgrade",
  args: {
    playerId: "96457033",
    player_name: "AlabeSons",
    buildingId: 5  // The building type (5-9)
  }
}
```

**Building IDs:**
- 4 = Mine
- 5 = Trading Station
- 6 = Research Lab
- 7 = Academy (Knowledge)
- 8 = Academy (QIC)
- 9 = Planetary Institute

### 7. **notifyRoundEnd** - Round Tracking

Marks the end of a game round:

```typescript
{
  type: "notifyRoundEnd",
  args: {
    // Round end information
  }
}
```

We track the current round counter by counting these events.

### 8. End Game

The game end sequence contains two events:

**Game State with Final Scores:**
```typescript
{
  type: "gameStateChange",
  args: {
    id: 99,
    args: {
      result: [  // ← Note: Field is "result", not "allPlayersScores"
        {
          id: "96457033",
          player: "96457033",
          name: "AlabeSons",
          score: "175",      // Final score!
          rank: 1,
          color: "...",
          // ... other fields
        },
        {
          id: "89923063",
          player: "89923063",
          name: "felipetoito",
          score: "166",
          rank: 2,
          // ...
        }
      ]
    }
  }
}
```

**End Game Marker:**
```typescript
{
  type: "simpleNode",
  log: "End of game",
  args: []
}
```

## Parsing Strategy

Our parser processes events in chronological order:

### 1. Track Rounds
- Count `notifyRoundEnd` events to track current round number
- Start at round 0 (setup phase)

### 2. Parse Race Selection
- Search for `type: "notifyChooseRace"` events
- Extract `args.raceId` and `args.playerId`
- Initialize player with empty buildings array

### 3. Parse Building Actions
- **Mines:** Watch for `type: "notifyBuild"` → building ID 4
- **Other structures:** Watch for `type: "notifyUpgrade"` → extract `args.buildingId`
- Group buildings by player and round: `player.buildings[currentRound].push(buildingId)`

### 4. Parse Final Scores
- Look for `gameStateChange` event with `args.args.result` array
- Extract `score` for each player
- Determine winner (player with highest score)

### 5. Output Compact Structure
- Players array contains all data (race, score, buildings)
- Buildings stored as 2D array: `buildings[round][buildingIndex]`
- Only building IDs stored (no names or duplicate data)

## Race ID Mapping

Complete mapping of race IDs to race names:

| ID | Race Name |
|----|-----------|
| 1 | Terrans |
| 2 | Lantids |
| 3 | Xenos |
| 4 | Gleens |
| 5 | Taklons |
| 6 | Ambas |
| 7 | Hadsch Hallas |
| 8 | Ivits |
| 9 | Geodens |
| 10 | Bal T'aks |
| 11 | Firacs |
| 12 | Bescods |
| 13 | Nevlas |
| 14 | Itars |

## Example Parsed Output

```json
{
  "tableId": "798145204",
  "gameId": 1495,
  "gameName": "gaiaproject",
  "playerCount": 2,
  "winnerName": "AlabeSons",
  "players": [
    {
      "playerId": 96457033,
      "playerName": "AlabeSons",
      "raceId": 3,
      "raceName": "Xenos",
      "finalScore": 175,
      "buildings": [
        [5, 6],      // Round 0: Trading Station, Research Lab
        [7],         // Round 1: Academy (Knowledge)
        [5],         // Round 2: Trading Station
        [5, 9, 6],   // Round 3: Trading Station, PI, Research Lab
        [5, 6],      // Round 4: Trading Station, Research Lab
        [5, 6]       // Round 5: Trading Station, Research Lab
      ]
    },
    {
      "playerId": 89923063,
      "playerName": "felipetoito",
      "raceId": 9,
      "raceName": "Geodens",
      "finalScore": 166,
      "buildings": [
        [5, 9],      // Round 0: Trading Station, PI
        [5],         // Round 1: Trading Station
        [6],         // Round 2: Research Lab
        [7],         // Round 3: Academy (Knowledge)
        [5, 6],      // Round 4: Trading Station, Research Lab
        [8, 5, 6]    // Round 5: Academy (QIC), Trading Station, Research Lab
      ]
    }
  ]
}
```

## Key Event Types Used

Our parser uses these event types:

- `notifyChooseRace` - Player race selection
- `notifyBuild` - Building mines (ID 4)
- `notifyUpgrade` - Building/upgrading other structures (IDs 5-9)
- `notifyRoundEnd` - Round boundaries
- `gameStateChange` (with `args.args.result`) - Final scores
