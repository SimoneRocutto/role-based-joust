# 📡 API Reference - Extended Joust

## Base URL

```
http://localhost:3000/api
```

---

## 🎮 Game Endpoints

### GET /game/modes

List all available game modes

**Response:**

```json
{
  "success": true,
  "modes": [
    {
      "key": "classic",
      "name": "Classic",
      "description": "Pure movement survival. Last player standing wins!",
      "minPlayers": 2,
      "maxPlayers": 20,
      "useRoles": false,
      "multiRound": false,
      "roundCount": 1
    },
    {
      "key": "role-based",
      "name": "Role Based",
      "description": "Unique abilities. Earn points across multiple rounds!",
      "minPlayers": 2,
      "maxPlayers": 20,
      "useRoles": true,
      "multiRound": true,
      "roundCount": 3,
      "roleTheme": "standard"
    }
  ]
}
```

---

### POST /game/create

Create a new game lobby

**Request:**

```json
{
  "mode": "classic" // or "role-based"
}
```

**For Role-Based mode:**

```json
{
  "mode": "role-based",
  "theme": "standard" // or "halloween", "mafia", etc.
}
```

**Response:**

```json
{
  "success": true,
  "gameId": "game-1",
  "mode": {
    "name": "Classic",
    "description": "...",
    "minPlayers": 2,
    "maxPlayers": 20
  }
}
```

---

### POST /game/start

Start the game with players

**Request:**

```json
{
  "players": [
    {
      "id": "player-1",
      "name": "Alice",
      "socketId": "socket-abc123"
    },
    {
      "id": "player-2",
      "name": "Bob",
      "socketId": "socket-def456"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "gameState": {
    "gameTime": 0,
    "state": "active",
    "currentRound": 1,
    "mode": "Classic",
    "playerCount": 2,
    "alivePlayers": 2,
    "players": [...]
  }
}
```

---

### GET /game/state

Get current game state

**Response:**

```json
{
  "success": true,
  "state": {
    "gameTime": 15300,
    "state": "active",
    "currentRound": 1,
    "mode": "Role Based",
    "playerCount": 4,
    "alivePlayers": 3,
    "players": [
      {
        "id": "player-1",
        "name": "Alice",
        "role": "Vampire",
        "isAlive": true,
        "points": 5,
        "totalPoints": 5
      }
    ]
  }
}
```

---

### POST /game/stop

Stop the current game

**Response:**

```json
{
  "success": true,
  "message": "Game stopped"
}
```

---

## 👤 Player Endpoints

### POST /player/move

Submit movement data

**Request:**

```json
{
  "playerId": "player-1",
  "x": 2.5,
  "y": -1.3,
  "z": 0.8,
  "timestamp": 1234567890,
  "deviceType": "phone" // optional: "phone", "joycon", "custom"
}
```

**Response:**

```json
{
  "success": true
}
```

---

### GET /player/:playerId/role

Get player's assigned role

**Response:**

```json
{
  "success": true,
  "role": {
    "name": "Vampire",
    "displayName": "Vampire",
    "description": "Enter bloodlust every 30s. Kill or be killed!",
    "difficulty": "hard"
  },
  "player": {
    "id": "player-1",
    "name": "Alice",
    "isAlive": true,
    "points": 5,
    "totalPoints": 10
  }
}
```

---

### GET /player/:playerId/state

Get player's current state

**Response:**

```json
{
  "success": true,
  "player": {
    "id": "player-1",
    "name": "Alice",
    "role": "Vampire",
    "isAlive": true,
    "points": 5,
    "totalPoints": 10,
    "toughness": 1.0,
    "statusEffects": [
      {
        "type": "Invulnerability",
        "priority": 100,
        "timeLeft": 2500
      }
    ]
  }
}
```

---

### POST /player/reconnect

Reconnect with session token

**Request:**

```json
{
  "token": "abc123xyz789",
  "socketId": "new-socket-id"
}
```

**Response:**

```json
{
  "success": true,
  "playerId": "player-1",
  "player": {
    "id": "player-1",
    "name": "Alice",
    "role": "Vampire",
    "isAlive": true,
    "points": 5
  }
}
```

---

## 🔧 Debug Endpoints (Development Only)

### GET /debug/state

Get full game snapshot

**Response:**

```json
{
  "success": true,
  "snapshot": {...},
  "debug": {
    "testMode": false,
    "tickRate": 100,
    "isActive": true,
    "isFinished": false
  }
}
```

---

### POST /debug/test/create

Create test game with bots

**Request:**

```json
{
  "roles": ["vampire", "beast", "beasthunter", "angel"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test game created",
  "snapshot": {...}
}
```

---

### POST /debug/bot/:botId/command

Send command to bot

**Request:**

```json
{
  "action": "shake", // or "still", "die", "damage"
  "args": [100] // optional, for "damage" action
}
```

**Response:**

```json
{
  "success": true,
  "botId": "bot-0",
  "action": "shake",
  "state": {
    "isBot": true,
    "behavior": "random",
    "autoPlayEnabled": true,
    "isAlive": true,
    "lastIntensity": 0.85
  }
}
```

---

### POST /debug/fastforward

Fast-forward game time (test mode only)

**Request:**

```json
{
  "milliseconds": 10000
}
```

**Response:**

```json
{
  "success": true,
  "fastForwarded": 10000,
  "newGameTime": 25000
}
```

---

### GET /debug/logs

Query game logs

**Query Parameters:**

- `level`: debug | info | warn | error
- `category`: PLAYER | STATUS | GAME | ABILITY | DAMAGE | MOVEMENT | MODE
- `playerId`: filter by player
- `since`: game time in milliseconds
- `limit`: number of logs (default: 100)

**Example:**

```
GET /debug/logs?level=info&category=GAME&limit=20
```

**Response:**

```json
{
  "success": true,
  "logs": [...],
  "total": 450,
  "showing": 20,
  "filter": {...}
}
```

---

### POST /debug/logs/export

Export logs to file

**Request:**

```json
{
  "filename": "game-session-1.json" // optional
}
```

**Response:**

```json
{
  "success": true,
  "filename": "game-session-1.json",
  "message": "Logs exported successfully"
}
```

---

### POST /debug/logs/clear

Clear all logs

**Response:**

```json
{
  "success": true,
  "message": "Logs cleared"
}
```

---

### GET /debug/logs/summary

Get log statistics

**Response:**

```json
{
  "success": true,
  "summary": {
    "totalLogs": 1247,
    "byLevel": {
      "debug": 850,
      "info": 320,
      "warn": 50,
      "error": 27
    },
    "byCategory": {
      "GAME": 150,
      "PLAYER": 420,
      "MOVEMENT": 500,
      "STATUS": 100,
      "DAMAGE": 77
    },
    "timeRange": {
      "start": 0,
      "end": 45230
    }
  }
}
```

---

## 🔌 Socket.IO Events

### Client → Server

#### player:join

Join game as new player

```javascript
socket.emit("player:join", {
  playerId: "player-1",
  name: "Alice",
});
```

#### player:reconnect

Reconnect with session token

```javascript
socket.emit("player:reconnect", {
  token: "session-token-abc123",
});
```

#### player:move

Send movement data

```javascript
socket.emit("player:move", {
  playerId: "player-1",
  x: 2.5,
  y: -1.3,
  z: 0.8,
  timestamp: Date.now(),
  deviceType: "phone",
});
```

#### ping

Heartbeat

```javascript
socket.emit("ping");
```

---

### Server → Client

#### player:joined

Acknowledgment of join

```javascript
socket.on("player:joined", (data) => {
  // data: { success, playerId, socketId, sessionToken }
});
```

#### player:reconnected

Acknowledgment of reconnection

```javascript
socket.on("player:reconnected", (data) => {
  // data: { success, playerId, player }
});
```

#### game:tick

Game loop tick (every 100ms)

```javascript
socket.on("game:tick", (data) => {
  // data: { gameTime }
});
```

#### player:death

Player elimination

```javascript
socket.on("player:death", (data) => {
  // data: { victimId, victimName, gameTime }
});
```

#### round:start

Round started

```javascript
socket.on("round:start", (data) => {
  // data: { roundNumber, totalRounds, gameTime }
});
```

#### round:end

Round ended

```javascript
socket.on("round:end", (data) => {
  // data: { roundNumber, scores, gameTime }
});
```

#### game:end

Game finished

```javascript
socket.on("game:end", (data) => {
  // data: { winner, scores, totalRounds }
});
```

#### vampire:bloodlust

Vampire bloodlust state change

```javascript
socket.on("vampire:bloodlust", (data) => {
  // data: { vampireId, vampireName, active }
});
```

#### pong

Heartbeat response

```javascript
socket.on("pong", () => {
  // Heartbeat acknowledged
});
```

#### error

Error message

```javascript
socket.on("error", (data) => {
  // data: { message, code }
});
```

---

## 🎯 Common Workflows

### Starting a Classic Game

```javascript
// 1. Create game
const createRes = await fetch("/api/game/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mode: "classic" }),
});

// 2. Players connect via Socket.IO
socket.emit("player:join", {
  playerId: "player-1",
  name: "Alice",
});

// 3. Start game
const startRes = await fetch("/api/game/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    players: [
      { id: "player-1", name: "Alice", socketId: socket.id },
      { id: "player-2", name: "Bob", socketId: otherSocket.id },
    ],
  }),
});

// 4. Listen for events
socket.on("game:tick", handleTick);
socket.on("player:death", handleDeath);
socket.on("game:end", handleGameEnd);

// 5. Send movement
socket.emit("player:move", {
  playerId: "player-1",
  x: 2.5,
  y: -1.3,
  z: 0.8,
  timestamp: Date.now(),
});
```

---

## 📖 Error Codes

| Code | Description                                       |
| ---- | ------------------------------------------------- |
| 400  | Bad Request - Invalid input data                  |
| 401  | Unauthorized - Invalid session token              |
| 404  | Not Found - Player/resource not found             |
| 503  | Service Unavailable - Game engine not initialized |

**Error Response Format:**

```json
{
  "error": "ValidationError",
  "message": "Validation failed: x must be a number",
  "statusCode": 400,
  "timestamp": "2026-01-24T10:30:00.000Z",
  "path": "/api/player/move"
}
```
