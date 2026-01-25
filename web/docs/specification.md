Extended Joust - Frontend Specification
Table of Contents

    Project Overview
    System Architecture
    Technology Stack
    Project Structure
    User Interfaces
    Communication Layer
    Audio System
    Mobile Optimizations
    Design System
    User Flows

Project Overview
Game Concept

Extended Joust is a physical multiplayer game inspired by Johann Sebastian Joust, where players use motion-sensing smartphones as controllers. Players bind their phones to their chests (landscape orientation, screen facing outward) and must manage their movement carefully - excessive movement causes damage and eventual elimination.
Key Differentiators from Original Joust

    Role-based gameplay: Players are secretly assigned roles (Vampire, Beast, Angel, etc.) with unique abilities
    Targeting mechanics: Some roles must eliminate specific other players (e.g., Beast Hunter must kill the Beast)
    Multi-round scoring: Points accumulate across multiple rounds
    Audio-driven feedback: Players wear single earbuds for private role reveals and game updates
    Visual player identification: Large numbers displayed on each phone for easy recognition

Physical Setup

    Player phones: Bound to chest in portrait mode, screen visible to others
    Dashboard display: Projected on wall or large screen, visible to all players
    Audio: Each player has one earbud for private audio cues
    Scale: 2-20 players per game

System Architecture
Deployment Model

Development Environment (2 separate processes):

Backend:  npm run dev  → localhost:3000 (Express + Socket.IO)
Frontend: npm run dev  → localhost:5173 (Vite dev server with HMR)
          - Proxies API requests to :3000
          - Hot module reload enabled

Production Environment (1 unified process):

Backend serves both API and static frontend:
- Express server on port 3000
- Serves compiled frontend from /dist
- Single WiFi endpoint for all devices

Network Topology

┌─────────────────────────────────────────┐
│  Host Machine (Laptop/Desktop)          │
│  - Runs Node.js server (port 3000)      │
│  - Serves both API and web interface    │
│  - WiFi: 192.168.x.x:3000               │
└─────────────────────────────────────────┘
                  │
                  │ WiFi Network
                  │
    ┌─────────────┴─────────────┬─────────────┬─────────────┐
    │                           │             │             │
┌───▼────┐  ┌──────────┐  ┌───▼────┐    ┌───▼────┐   ┌───▼────┐
│Phone #1│  │Phone #2  │  │Phone #3│    │Tablet/ │   │Phone #N│
│Player  │  │Player    │  │Player  │... │Laptop  │   │Player  │
│View    │  │View      │  │View    │    │Dashboard│   │View    │
└────────┘  └──────────┘  └────────┘    └────────┘   └────────┘

Why This Architecture?

Benefits:

    ✅ Fast development with hot reload
    ✅ Simple production deployment (single process)
    ✅ No CORS issues
    ✅ Easy to migrate to native mobile app later (just change API endpoint)
    ✅ All devices connect to same server
    ✅ Session tokens enable reconnection

Technology Stack
Core Framework

    Vite - Build tool (fast dev server, optimized production builds)
    React 18 - UI framework
    TypeScript - Type safety matching backend
    React Router - Client-side routing (/player, /dashboard, /join)

Real-time Communication

    socket.io-client - WebSocket client for real-time game state

State Management

    Zustand - Lightweight, TypeScript-friendly global state
        Chosen over Redux for simplicity
        Minimal boilerplate
        Good TypeScript support
        No context provider wrapper needed

UI & Styling

    Tailwind CSS - Utility-first CSS framework
    Framer Motion - Animation library (death transitions, pulses, fades)
    Lucide React - Icon library

Audio

    Howler.js - Cross-browser audio library
        Better than native Web Audio API for sound effects
        Handles audio sprite sheets
        Built-in volume control and pooling
        Works well on mobile

Mobile APIs

    DeviceMotionEvent API - Accelerometer access
    Screen Wake Lock API - Prevent screen sleep
    Fullscreen API - Immersive mode
    Web Speech API - Text-to-speech for dashboard

Project Structure

client/
├── src/
│   ├── main.tsx                 # Entry point, router setup
│   ├── App.tsx                  # Root component
│   │
│   ├── pages/
│   │   ├── JoinView.tsx         # Player name entry + join lobby
│   │   ├── PlayerView.tsx       # Main player controller interface
│   │   └── DashboardView.tsx    # Admin/projected scoreboard
│   │
│   ├── components/
│   │   ├── player/
│   │   │   ├── PlayerNumber.tsx       # Giant number display
│   │   │   ├── HealthBackground.tsx   # Colored background based on health
│   │   │   ├── StatusEffects.tsx      # Active effects (invuln, bloodlust)
│   │   │   ├── TargetDisplay.tsx      # "Target: #3" for role objectives
│   │   │   └── ConnectionStatus.tsx   # Connected/reconnecting indicator
│   │   │
│   │   ├── dashboard/
│   │   │   ├── PlayerGrid.tsx         # Grid of player cards
│   │   │   ├── PlayerCard.tsx         # Individual player status card
│   │   │   ├── Scoreboard.tsx         # Points leaderboard
│   │   │   ├── GameState.tsx          # Round/mode/timer display
│   │   │   ├── EventFeed.tsx          # Live event announcements
│   │   │   └── AdminControls.tsx      # Start/stop/mode selection
│   │   │
│   │   └── shared/
│   │       ├── Logo.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── hooks/
│   │   ├── useSocket.ts              # Socket.IO connection management
│   │   ├── useAccelerometer.ts       # Motion sensor access + throttling
│   │   ├── useWakeLock.ts            # Keep screen awake
│   │   ├── useFullscreen.ts          # Fullscreen mode toggle
│   │   ├── useAudio.ts               # Sound effects player
│   │   ├── useReconnect.ts           # Auto-reconnection with session token
│   │   └── useGameState.ts           # Zustand store wrapper
│   │
│   ├── services/
│   │   ├── socket.ts                 # Socket.IO client setup + event handlers
│   │   ├── api.ts                    # HTTP API calls (REST endpoints)
│   │   ├── audio.ts                  # Audio manager (preload, play, queue)
│   │   └── accelerometer.ts          # Motion sensor handler + normalization
│   │
│   ├── store/
│   │   └── gameStore.ts              # Zustand global state
│   │
│   ├── types/
│   │   ├── player.types.ts           # Player, health, status types
│   │   ├── game.types.ts             # Game state, round, mode types
│   │   └── socket.types.ts           # Socket event payload types
│   │
│   └── utils/
│       ├── permissions.ts            # Request sensor/fullscreen permissions
│       ├── constants.ts              # Colors, thresholds, config
│       └── formatters.ts             # Display helpers (time, health %)
│
├── public/
│   ├── sounds/                       # Audio files
│   │   ├── role-reveal.mp3           # Role assignment announcement
│   │   ├── damage.mp3                # Taking damage
│   │   ├── death.mp3                 # Player elimination
│   │   ├── too-much-movement.mp3     # Movement warning
│   │   ├── bloodlust.mp3             # Vampire bloodlust activation
│   │   ├── heartbeat.mp3             # Bloodlust heartbeat loop
│   │   ├── wolf-howl.mp3             # Full moon event (Halloween)
│   │   ├── tension-low.mp3           # Background music (lobby)
│   │   ├── tension-medium.mp3        # Background music (active)
│   │   ├── tension-high.mp3          # Background music (few players left)
│   │   └── victory.mp3               # Round/game end
│   │
│   └── manifest.json                 # PWA manifest (optional future enhancement)
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json

User Interfaces
1. Join View (/join)

Purpose: Player enters their name and joins the lobby.

Layout:

┌─────────────────────────────┐
│                             │
│    EXTENDED JOUST           │
│                             │
│  ┌───────────────────────┐  │
│  │ Enter your name...    │  │
│  └───────────────────────┘  │
│                             │
│      [JOIN GAME]            │
│                             │
│  Lobby Code: #GAME-1234     │
│                             │
└─────────────────────────────┘

Functionality:

    Text input for player name (1-20 characters)
    Validates name is not empty
    Connects to server via Socket.IO
    Emits player:join event with name
    Receives player:joined response with:
        Player ID
        Player number assignment (#1-20)
        Session token (for reconnection)
    Stores session token in localStorage
    Redirects to /player on success

Error Handling:

    Server connection failed → Show retry button
    Name already taken → Prompt for different name
    Game already started → Show "Game in progress" message

2. Player View (/player)

Purpose: Main game interface displayed on player's phone (chest-mounted, portrait mode).
Layout Philosophy

    Fullscreen, portrait-only (block landscape with overlay message)
    Minimal UI - Battery saving, reduce distraction
    Maximum visibility - Large elements visible from 5+ meters
    Color-coded health - Entire background changes color based on health status

Screen Layout (Portrait)

┌─────────────────┐
│ ●          75%  │ ← Status bar (5% height): Connection dot + Battery
│─────────────────│
│█████████████████│
│█████████████████│
│█████████████████│
│███████ 7 ███████│ ← Number area (70% height): Colored background + number
│█████████████████│   Background color = health status
│█████████████████│   Number = white (high contrast)
│█████████████████│
│─────────────────│
│   🛡️ 2s        │ ← Info bar (25% height): Status effects, target, points
│                 │   Dark background for text readability
│   🎯 Target:#3  │
│     Pts: 15     │
└─────────────────┘

Number Area (Main Focus)

    Size: 40vh (40% of viewport height) font size
    Font: Impact or similar bold, sans-serif
    Color: Always white for maximum contrast
    Background: Changes based on health status (see Design System)
    Special effects:
        Invulnerable: White pulsing glow
        Bloodlust: Red pulsing with heartbeat rhythm
        Critical health: Red pulsing background
        Dead: Gray static with skull overlay

Status Bar (Top 5%)

    Connection indicator (green dot = connected, red = disconnected, yellow = reconnecting)
    Battery percentage (small text)
    Minimal, semi-transparent dark background

Info Bar (Bottom 25%)

    Status effects: Icon + countdown (e.g., "🛡️ 2s" for invulnerability)
        Only show active effects
        Max 2-3 effects displayed at once
        Auto-hide after 1 second if no interaction
    Target display: For roles with objectives (e.g., "🎯 Target: #3")
        Shows target number
        Persists throughout game
    Points: Current round points (small text, bottom-right)
    Dark background for text readability against colored main area

Player States & Visuals

Healthy (80-100% health):

Background: Dark green gradient (#065f46 → #047857)
Number: White (#ffffff)
Feeling: Calm, safe

Damaged (40-79% health):

Background: Amber gradient (#92400e → #d97706)
Number: Black (#000000) for better contrast on yellow
Feeling: Caution, warning

Critical (<40% health):

Background: Red gradient (#7f1d1d → #dc2626) + pulsing
Number: White (#ffffff)
Animation: Pulse (opacity 80% → 100% → 80%, 1s cycle)
Feeling: Danger, urgency

Dead:

Background: Dark gray (#1f2937)
Number: Gray (#6b7280)
Overlay: Large 💀 skull emoji
Text: "ELIMINATED"
Feeling: Game over

Invulnerable (special state):

Background: White gradient (#e5e5e5 → #ffffff) + glow pulse
Number: Black (#000000)
Animation: Glow pulse (1s cycle)
Override: Replaces health-based background

Bloodlust (Vampire, special state):

Background: Deep red gradient (#450a0a → #dc2626)
Number: White (#ffffff)
Animation: Heartbeat pulse (0.8s cycle)
Icon: ♥ heartbeat icons pulsing
Override: Replaces health-based background

Responsive Behavior

    Small phones (iPhone SE, <375px width): Number = 180px
    Normal phones (375-767px): Number = 220px
    Large phones/tablets (>768px): Number = 280px
    Portrait lock: If landscape detected, show fullscreen overlay: "↻ ROTATE TO PORTRAIT"

3. Dashboard View (/dashboard)

Purpose: Public scoreboard projected on wall, showing all players' status in real-time.
Layout Philosophy

    Information density - Show 16-20 players simultaneously
    Instant status recognition - Color-coded borders and glows
    Smart sorting - Critical players first for attention
    Minimal text - Readable from 3-5 meters away
    Dynamic audio - Background music + TTS announcements

Screen Layout (Landscape, 1920x1080+)

┌─────────────────────────────────────────────────────────────────────┐
│ EXTENDED JOUST          Round 2/3                  [ROLE-BASED]     │
│ ⏱️ 02:35 remaining                                🎵 Playing...     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┏━━━━━━━┓  ┏━━━━━━━┓  ┏━━━━━━━┓  ┏━━━━━━━┓    [Grid 4x4 for   │
│  ┃ #1    ┃  ┃ #2    ┃  ┃ #3    ┃  ┃ #4    ┃     16 players,     │
│  ┃ Alice ┃  ┃ Bob   ┃  ┃ Carol ┃  ┃ Dave  ┃     5x4 for 20]     │
│  ┃ ████░ ┃  ┃ ███░░ ┃  ┃ █████ ┃  ┃ 💀    ┃                     │
│  ┃ 🛡️     ┃  ┃       ┃  ┃ 🧛    ┃  ┃       ┃                     │
│  ┗━━━━━━━┛  ┗━━━━━━━┛  ┗━━━━━━━┛  ┗━━━━━━━┛                     │
│  [... more rows ...]                                               │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  🔴 LIVE: "Player #4 eliminated!"              ALIVE: 12 / 16      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Header Section

    Title: "EXTENDED JOUST" (large, bold)
    Game info: "Round 2/3" + Game mode badge
    Timer: Countdown showing time remaining in round
    Audio indicator: Small music note icon + "Playing..." when audio active

Player Grid

    Layout: 4x4 grid for 12-16 players, 5x4 grid for 17-20 players
    Auto-resize: Cards shrink slightly for more players
    Gap: 16px between cards for visual separation

Player Card Design

Dimensions:

    Width: ~250px (adjusts based on player count)
    Height: ~180px
    Border: 4px solid (color changes based on health)
    Border-radius: 8px

Card Contents:

┏━━━━━━━━━━━┓ ← Glowing colored border
┃ #7  Grace ┃ ← Number (48px) + Name (32px), both bold
┃ ████████  ┃ ← Health bar (24px tall, colored)
┃ 🛡️        ┃ ← Status icon (40px, if active)
┗━━━━━━━━━━━┛
  ↑ Subtle colored tint background (10% opacity)

Border & Background Colors:

Healthy (80-100%):

Border: 4px solid rgba(16, 185, 129, 0.8) - green
Background: rgba(16, 185, 129, 0.1) - 10% green tint
Glow: 0 0 20px rgba(16, 185, 129, 0.4) - soft green glow

Damaged (40-79%):

Border: 4px solid rgba(245, 158, 11, 0.8) - amber
Background: rgba(245, 158, 11, 0.1) - 10% amber tint
Glow: 0 0 20px rgba(245, 158, 11, 0.4) - soft amber glow

Critical (<40%):

Border: 4px solid rgba(239, 68, 68, 0.9) - red
Background: rgba(239, 68, 68, 0.15) - 15% red tint (stronger)
Glow: 0 0 30px rgba(239, 68, 68, 0.6) - strong red glow + PULSING
Animation: Pulse glow intensity (1s cycle)

Dead:

Border: 2px solid rgba(107, 114, 128, 0.3) - dim gray
Background: rgba(31, 41, 55, 0.5) - darker tint
Opacity: 0.6 - entire card faded
Content: 💀 emoji instead of health bar

Health Bar

    Style: Simple progress bar (e.g., ████████░░ = 80% full)
    Color: Matches health status (green/amber/red)
    Hidden when dead: Replaced with 💀 emoji

Status Icons (Priority Display)

Show only ONE icon per card, priority order:

    🛡️ Invulnerable
    🧛 Vampire bloodlust (red pulse)
    🎯 Being hunted (for Beast, shows crosshair)
    🔥 Berserker rage
    ❄️ Frozen/stunned

Smart Sorting Algorithm

Players are sorted in this order:

    Alive first, dead last (alive players at top)
    Among alive: Critical health (<40%) first for attention
    Among non-critical alive: Healthiest first (descending health)
    Tiebreaker: Player number (ascending)

Visual Result:

Top rows:    Critical players (red, pulsing) - NEEDS ATTENTION
Middle rows: Healthy/damaged players (green/yellow)
Bottom rows: Dead players (gray, faded) - LESS VISUAL NOISE

Event Feed (Bottom Bar)

    Live announcements: "Player #4 eliminated!", "Vampire bloodlust active!"
    Alive counter: "ALIVE: 12 / 16" (right-aligned)
    TTS indicator: 🔴 when text-to-speech is speaking

Between-Rounds Screen

When round ends, dashboard transitions to full-screen leaderboard:

┌─────────────────────────────────────────────────────────────┐
│              ROUND 2 COMPLETE                               │
│                                                             │
│  🏆 LEADERBOARD                                             │
│                                                             │
│  1st  🥇  #7  Grace      25 pts  (+10 this round)          │
│  2nd  🥈  #1  Alice      20 pts  (+5 this round)           │
│  3rd  🥉  #13 Mia        18 pts  (+8 this round)           │
│  [... all players ...]                                      │
│                                                             │
│  STATS:                                                     │
│  • Round Winner: Grace (Last Standing)                     │
│  • First Death: Dave (#4) at 0:45                          │
│  • Longest Survivor: Grace (2:30)                          │
│                                                             │
│              Next round starting in 10...                   │
└─────────────────────────────────────────────────────────────┘

Auto-advances to next round after 15 seconds
Responsive Grid Layouts

12 players: 4x3 grid
css

grid-template-columns: repeat(4, 1fr);
gap: 16px;
card-width: ~280px;

16 players: 4x4 grid
css

grid-template-columns: repeat(4, 1fr);
gap: 16px;
card-width: ~250px;

20 players: 5x4 grid
css

grid-template-columns: repeat(5, 1fr);
gap: 12px;
card-width: ~220px;

Communication Layer
Socket.IO Events
Client → Server Events

player:join
ts

// When player joins lobby
socket.emit('player:join', {
  playerId: string,    // Generated client-side
  name: string         // Player's chosen name
})

player:move
ts

// Accelerometer data (throttled to 10Hz)
socket.emit('player:move', {
  playerId: string,
  x: number,           // -10 to +10
  y: number,           // -10 to +10
  z: number,           // -10 to +10
  timestamp: number,   // Date.now()
  deviceType: 'phone'  // Optional: 'phone' | 'joycon' | 'custom'
})

player:reconnect
ts

// When reconnecting with session token
socket.emit('player:reconnect', {
  token: string,       // Session token from localStorage
  socketId: string     // New socket ID
})

ping
ts

// Heartbeat every 5s
socket.emit('ping')

Server → Client Events

player:joined
ts

// Response to join request
socket.on('player:joined', ({
  success: boolean,
  playerId: string,
  playerNumber: number,     // 1-20
  socketId: string,
  sessionToken: string      // Save to localStorage
}) => {})

player:reconnected
ts

// Response to reconnect request
socket.on('player:reconnected', ({
  success: boolean,
  playerId: string,
  player: {
    id: string,
    name: string,
    role: string,          // Role class name
    isAlive: boolean,
    points: number
  }
}) => {})

game:tick
ts

// Every 100ms during active game
socket.on('game:tick', ({
  gameTime: number      // Milliseconds since round start
}) => {})

player:death
ts

// When any player dies
socket.on('player:death', ({
  victimId: string,
  victimName: string,
  victimNumber: number,
  gameTime: number
}) => {
  // If victim is me: play death sound, show eliminated screen
  // If victim is my target: notify role completion
})

round:start
ts

// Round beginning
socket.on('round:start', ({
  roundNumber: number,
  totalRounds: number,
  gameTime: number
}) => {})

round:end
ts

// Round conclusion
socket.on('round:end', ({
  roundNumber: number,
  scores: Array<{
    playerId: string,
    playerName: string,
    playerNumber: number,
    score: number,
    rank: number,
    status: string
  }>,
  gameTime: number
}) => {})

game:end
ts

// Game finished
socket.on('game:end', ({
  winner: {
    id: string,
    name: string,
    number: number
  } | null,
  scores: Array<{...}>,
  totalRounds: number
}) => {})

vampire:bloodlust
ts

// Vampire bloodlust state change
socket.on('vampire:bloodlust', ({
  vampireId: string,
  vampireName: string,
  vampireNumber: number,
  active: boolean      // true = started, false = ended
}) => {
  // If vampire is me: show bloodlust UI, play heartbeat
  // If vampire is another player: update dashboard
})

role:assigned
ts

// Role assignment (private, only to player)
socket.on('role:assigned', ({
  role: string,              // e.g., "Vampire", "Beast Hunter"
  displayName: string,       // e.g., "Vampire"
  description: string,       // Role description
  targetNumber?: number,     // For targeted roles (Beast Hunter → Beast)
  targetName?: string
}) => {
  // Play TTS: "You are the [role]. Your goal is to [objective]."
})

pong
ts

// Heartbeat response
socket.on('pong', () => {
  // Update last ping time
})

error
ts

// Error notifications
socket.on('error', ({
  message: string,
  code: string          // e.g., 'INVALID_MOVEMENT_DATA', 'GAME_FULL'
}) => {})

Auto-Reconnection Logic
ts

// On disconnect
socket.on('disconnect', (reason) => {
  setConnected(false)
  
  // Start reconnection attempts
  const reconnectInterval = setInterval(() => {
    if (sessionToken) {
      socket.emit('player:reconnect', {
        token: sessionToken,
        socketId: socket.id
      })
    }
  }, 2000) // Try every 2 seconds
  
  // Stop trying after 30 seconds
  setTimeout(() => clearInterval(reconnectInterval), 30000)
})

// On successful reconnection
socket.on('player:reconnected', (data) => {
  if (data.success) {
    setConnected(true)
    // Restore player state from server response
  }
})

HTTP REST API Endpoints

GET /api/game/modes
ts

// List available game modes
Response: {
  success: boolean,
  modes: Array<{
    key: string,           // 'classic', 'role-based', etc.
    name: string,
    description: string,
    minPlayers: number,
    maxPlayers: number,
    useRoles: boolean,
    multiRound: boolean,
    roundCount: number
  }>
}

POST /api/game/create
ts

// Create game lobby (dashboard only)
Request: {
  mode: string,          // 'classic' | 'role-based'
  theme?: string         // For role-based: 'standard' | 'halloween' | 'mafia'
}

Response: {
  success: boolean,
  gameId: string,
  mode: {
    name: string,
    description: string,
    minPlayers: number,
    maxPlayers: number
  }
}

POST /api/game/start
ts

// Start game with connected players (dashboard only)
Request: {
  players: Array<{
    id: string,
    name: string,
    socketId: string
  }>
}

Response: {
  success: boolean,
  gameState: {...}      // Full game snapshot
}

GET /api/game/state
ts

// Get current game state
Response: {
  success: boolean,
  state: {
    gameTime: number,
    state: 'waiting' | 'active' | 'round-ended' | 'finished',
    currentRound: number,
    mode: string,
    playerCount: number,
    alivePlayers: number,
    players: Array<{
      id: string,
      name: string,
      number: number,
      role: string,
      isAlive: boolean,
      points: number,
      totalPoints: number
    }>
  }
}

GET /api/player/:playerId/role
ts

// Get player's role info
Response: {
  success: boolean,
  role: {
    name: string,
    displayName: string,
    description: string,
    difficulty: string
  },
  player: {
    id: string,
    name: string,
    number: number,
    isAlive: boolean,
    points: number
  }
}

Audio System
Audio Architecture

Three audio layers running simultaneously:

    Background Music - Continuous ambient/tension music
    TTS Announcements - Text-to-speech for events (ducks music)
    Sound Effects - Overlays for specific events