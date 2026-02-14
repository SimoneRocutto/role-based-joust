# Extended Joust - Complete Specification

## Project Overview & Architecture

---

## 🎮 Project Overview

**Extended Joust** is a physical multiplayer party game inspired by Johann Sebastian Joust, where players use motion-sensing smartphones as controllers combined with role-based gameplay similar to Werewolf.

### Key Features

- **Motion-based gameplay**: Phone accelerometers detect movement → excessive movement = damage
- **Role-based mechanics**: Secret roles (Vampire, Beast Hunter, Angel, etc.) with unique abilities
- **Multi-round scoring**: Points accumulate across 3 rounds
- **Audio-driven feedback**: Private role reveals via earbuds + public dashboard announcements
- **Visual identification**: Large player numbers (1-20) on each phone for recognition

### Physical Setup

- **Player phones**: Chest-mounted in **portrait mode**, screen facing outward, visible to other players
- **Dashboard display**: Large screen/projector on wall, visible to all players (landscape)
- **Audio setup**: Each player wears **one earbud** for private audio cues
- **Player count**: 2-20 players per game

---

## 🏗️ System Architecture

### Deployment Model

#### Development (2 Processes)

```
Backend:  npm run dev → localhost:4000 (Express + Socket.IO)
Frontend: npm run dev → localhost:5173 (Vite dev server)
          ├─ Proxies API to :4000
          └─ Hot module reload enabled
```

#### Production (1 Process)

```
Backend serves everything on port 4000:
├─ Express API endpoints
├─ Socket.IO server
└─ Static frontend from /dist
```

### Network Topology

```
┌─────────────────────────────────────┐
│  Host Machine (Laptop/Desktop)      │
│  ├─ Node.js server (port 4000)      │
│  ├─ Serves API + web interface      │
│  └─ WiFi: 192.168.x.x:4000          │
└─────────────────────────────────────┘
                │
        WiFi Network
                │
    ┌───────────┴────────────┬──────────┬──────────┐
    │                        │          │          │
┌───▼────┐  ┌────────┐  ┌───▼────┐  ┌──▼─────┐  ┌──▼─────┐
│Phone #1│  │Phone #2│  │Phone #3│  │Dashboard│  │Phone #N│
│Player  │  │Player  │  │Player  │  │(Tablet/ │  │Player  │
│View    │  │View    │  │View    │  │Laptop)  │  │View    │
└────────┘  └────────┘  └────────┘  └─────────┘  └────────┘
```

### Architecture Benefits

✅ Fast development with hot reload  
✅ Simple production deployment (single process)  
✅ No CORS issues  
✅ Easy migration to native mobile app (just change API endpoint)  
✅ Session tokens enable reconnection  
✅ Server-authoritative - phones are "dumb terminals"

---

## 💻 Technology Stack

### Core Framework

- **Vite** - Build tool (fast dev server, optimized production builds)
- **React 18** - UI framework
- **TypeScript** - Type safety matching backend
- **React Router** - Client-side routing (`/join`, `/player`, `/dashboard`)

### Real-time Communication

- **socket.io-client** - WebSocket client for real-time game state

### State Management

- **Zustand** - Lightweight, TypeScript-friendly global state
  - Chosen over Redux for simplicity
  - Minimal boilerplate
  - Excellent TypeScript support
  - No context provider wrapper needed

### UI & Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library (death transitions, pulses, fades)
- **Lucide React** - Icon library

### Audio

- **Howler.js** - Cross-browser audio library
  - Better than native Web Audio API for sound effects
  - Handles audio sprite sheets
  - Built-in volume control and pooling
  - Works well on mobile (critical requirement)

### Mobile APIs

- **DeviceMotionEvent API** - Accelerometer access
- **Screen Wake Lock API** - Prevent screen sleep during gameplay
- **Fullscreen API** - Immersive mode for player view
- **Web Speech API** - Text-to-speech for dashboard announcements

---

## 📊 Game Flow

### 1. Lobby Phase

1. Admin opens dashboard (`/dashboard`)
2. Players navigate to host's IP (`http://192.168.x.x:5173`)
3. Players enter names and join (`/join` → `/player`)
4. Dashboard shows connected players (no ready state in lobby)
5. Admin configures game settings (mode, sensitivity, theme) and clicks "Start Game"

### 2. Pre-Game Phase

1. Game enters `pre-game` state. Players see a mode recap screen (mode name, round count, sensitivity label) and their player number/name.
2. Players shake their device (or click in dev mode) to indicate readiness.
3. Game auto-starts (transitions to countdown) when all players are ready.
4. Alternatively, the admin can force-start the game at any time via the dashboard's "START GAME" button (calls `POST /api/game/proceed`).
5. In test mode and during auto-relaunch (between rounds), the pre-game phase is skipped automatically.

### 3. Countdown + Role Assignment

1. Server assigns roles randomly based on theme
2. Each player receives private `role:assigned` event with role name, description, and difficulty
3. **TTS plays in earbud**: "You are the Vampire." + role description
4. Dashboard shows countdown (default 10 seconds, configurable)

### 4. Active Gameplay

1. Game loop ticks every 100ms
2. Phones send accelerometer data at 10Hz (every 100ms)
3. Server calculates movement intensity (0-1 scale)
4. Excessive movement → damage applied
5. Damage accumulates → health decreases → background color changes
6. Death → phone screen goes gray
7. Round continues until 0-1 players remain alive

### 5. Round End

1. Last standing player gets +5 points
2. Dashboard transitions to leaderboard showing round scores + cumulative totals
3. Players shake to ready up for the next round
4. Once all players are ready, the next round starts automatically (no admin action needed between rounds)
5. Roles are re-assigned randomly each round. Points carry through.

### 6. Game End (After 3 rounds)

1. Final leaderboard displayed ranked by total points
2. Winner announced
3. Victory audio plays
4. Admin clicks to return to main dashboard, where a new game can start

---

## 🔌 Connection & Reconnection

### Initial Connection

1. Player joins → Server assigns `playerId`, `playerNumber` (1-20)
2. Server generates `sessionToken` (random string)
3. Client stores `sessionToken` in `localStorage`
4. Socket connection established with `socketId`

### Disconnection Handling

1. Player disconnects (WiFi drop, battery dies, etc.)
2. Server keeps session data for **5 minutes** (heartbeat monitor runs every 30s)
3. Player can reconnect using `sessionToken`
4. If reconnects: Resume with same `playerNumber` and game state
5. If session expires: Player must rejoin

### Reconnection Flow

```typescript
socket.on("disconnect", () => {
  setConnected(false);

  const token = localStorage.getItem("sessionToken");
  // On reconnect, send only the token. Server gets socketId from the connection.
  socket.emit("player:reconnect", { token });
});

socket.on("player:reconnected", (data) => {
  if (data.success) {
    setConnected(true);
    // Restore player state from data.player
  }
});
```

---

## 🎯 Design Principles

### Server Authority

- **Controllers are "dumb"**: Phones only send raw accelerometer data
- **All game logic on server**: Movement intensity, damage calculation, role abilities
- **Server broadcasts state**: Clients display what server tells them

### Tick-Based Timing

- **Central clock**: Ticks every 100ms (configurable)
- **No `setTimeout` in game logic**: All timing relative to `gameTime`
- **Deterministic**: Reproducible game states for debugging

### Priority-Based Execution

- **Status effects** sorted by priority (Invulnerability = 100 executes first)
- **Roles** sorted by priority (Angel = 50 prevents death before Vampire = 20 reacts)
- **Predictable behavior**: Higher priority = earlier execution

### Event-Driven Communication

- **Loose coupling**: Roles/effects communicate via events, not direct calls
- **GameEvents singleton**: Central event bus for `player:death`, `vampire:bloodlust`, etc.
- **Easy extension**: Add new roles without modifying existing code

### Mobile-First Performance

- **Minimal re-renders**: Zustand subscriptions only to needed state slices
- **Throttled sensor input**: 10Hz max (100ms between readings)
- **Optimized animations**: Framer Motion with `transform` (GPU-accelerated)
- **Wake lock**: Prevent screen sleep to avoid reconnection issues
- **Battery consideration**: Dead players show static skull (no updates)

---

## 🔐 Security Considerations

### Session Tokens

- Random string (not JWTs - unnecessary for this use case)
- Stored in `localStorage` on client
- Server maps `token → playerId` for reconnection
- **5-minute expiry** after disconnect (heartbeat monitor runs every 30s)

### Input Validation

- Server validates all accelerometer data (range -10 to +10)
- Malformed movement data rejected with error event
- Rate limiting on movement events (max 20Hz, throttled to 10Hz recommended)

### Game State Authority

- Dashboard is the only client that can start/stop games
- Players cannot trigger admin actions via Socket.IO
- All game logic calculated server-side (prevents cheating)

---

## 📱 Browser Compatibility

### Required Features

| Feature           | Chrome Mobile | Safari iOS        | Firefox Android |
| ----------------- | ------------- | ----------------- | --------------- |
| DeviceMotionEvent | ✅            | ⚠️ Requires HTTPS | ✅              |
| Wake Lock API     | ✅            | ❌ Use NoSleep.js | ✅              |
| Fullscreen API    | ✅            | ❌                | ✅              |
| Web Speech API    | ✅            | ✅                | ✅              |
| Socket.IO         | ✅            | ✅                | ✅              |

### iOS Quirks

1. **HTTPS Required**: DeviceMotion only works over HTTPS (or localhost)
2. **No Wake Lock**: Use [NoSleep.js](https://github.com/richtr/NoSleep.js/) polyfill
3. **Permission Prompt**: iOS 13+ requires user gesture to enable motion sensors
4. **No Fullscreen**: Safari doesn't support Fullscreen API on iPhone

### Production Deployment for iOS

```bash
# Use ngrok or similar for HTTPS tunnel
ngrok http 5173

# Or use mkcert for local HTTPS
mkcert -install
mkcert localhost 192.168.1.x
```

---

## 🎲 Game Events System

Game events are temporary, game-wide effects that alter gameplay for all players simultaneously. They are distinct from the `GameEvents` Socket.IO event bus — `GameEvent` (singular) is the base class for game-wide effects, while `GameEvents` (plural) is the message bus.

### Architecture

- **GameEvent base class** (`server/src/gameEvents/GameEvent.ts`) — abstract class with lifecycle hooks (`onStart`, `onEnd`, `onTick`, `shouldActivate`, `shouldDeactivate`)
- **GameEventFactory** (`server/src/factories/GameEventFactory.ts`) — auto-discovers event classes from `server/src/gameEvents/` directory
- **GameEventManager** (`server/src/managers/GameEventManager.ts`) — manages event lifecycle during a round, owned by each GameMode instance
- **SpeedShift** (`server/src/gameEvents/SpeedShift.ts`) — first concrete event: alternates between slow/fast phases with escalating probability

### How It Works

1. Each GameMode creates a `GameEventManager` and registers events via `GameEventFactory` in `onRoundStart`
2. On each tick, the manager checks inactive events for activation, ticks active events, and checks deactivation
3. Events communicate to clients via `mode:event` Socket.IO messages (emitted through `GameEvents.emitModeEvent()`)
4. Client listens for `mode:event` and dispatches to handlers (e.g., music speed change for speed-shift)

### Adding New Events

Add a `.ts` file to `server/src/gameEvents/` extending `GameEvent` with a static `eventKey`. It will be auto-discovered. See `docs/extending-the-game.ts` for a full example.

---

## 🎨 Visual Design Philosophy

### Player View (Phone Screen)

- **Fullscreen, portrait-only**: Landscape shows "Rotate to Portrait" overlay
- **Minimal UI**: Battery saving + reduce distraction
- **Maximum visibility**: Giant number visible from 5+ meters
- **Color-coded health**: Background color = health status (no text needed)

### Dashboard View (Projected Screen)

- **Information density**: Show 16-20 players simultaneously
- **Instant status recognition**: Color-coded borders + glows
- **Smart sorting**: Critical players first, dead players last
- **Minimal text**: Readable from 3-5 meters

### Accessibility

- High contrast ratios (WCAG AAA where possible)
- Large touch targets (min 44x44px)
- No critical info conveyed by color alone (icons + color)
- Screen reader friendly (semantic HTML)

---

Next: see `audio.md` →
