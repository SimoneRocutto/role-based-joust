# Extended Joust - Frontend

Motion-based multiplayer party game with role-based gameplay.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (runs on :5173)
npm run dev

# Make sure backend is running on :3000
cd ../server
npm run dev
```

Visit `http://localhost:5173` on your computer or `http://YOUR_IP:5173` on your phone.

### Production Build

```bash
# Build frontend
npm run build

# Output: dist/
# Backend will serve these static files
```

## 📱 Mobile Access

1. Connect your phone to the same WiFi as your computer
2. Find your computer's IP address:
   - Mac/Linux: `ifconfig | grep inet`
   - Windows: `ipconfig`
3. Visit `http://YOUR_IP:5173` on your phone's browser

**For iOS:** You need HTTPS for accelerometer access. Use ngrok:

```bash
ngrok http 5173
# Then visit the https:// URL on your iPhone
```

## 🎮 User Flows

### Players (Phone View)

1. Navigate to server URL on phone
2. Enter name → Join game
3. Wait in lobby
4. Game starts → Receive role via earbud
5. Play (keep phone still to survive)
6. See results → Next round

### Dashboard (Projected Screen)

1. Open dashboard on laptop/tablet
2. Select game mode + theme
3. Wait for players to join
4. Start game
5. Watch scoreboard
6. Manual next round / end game

## 🏗️ Project Structure

```
client/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router
│   ├── pages/                # Views (Join, Player, Dashboard)
│   ├── components/           # UI components
│   ├── hooks/                # Custom hooks
│   ├── services/             # API, Socket, Audio, Accelerometer
│   ├── store/                # Zustand state
│   ├── types/                # TypeScript types
│   └── utils/                # Helpers
│
├── public/sounds/            # Audio files
├── index.html
├── vite.config.ts
└── package.json
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Development
VITE_API_BASE_URL=http://localhost:3000

# Production
VITE_API_BASE_URL=http://YOUR_IP:3000
```

### Tailwind CSS

Health colors and animations configured in `tailwind.config.js`.

## 🎨 Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.IO** - Real-time communication
- **Howler.js** - Audio
- **Framer Motion** - Animations

## 📝 Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## 🐛 Troubleshooting

### Accelerometer not working on iOS

- **Solution**: Use HTTPS (ngrok or mkcert)
- iOS 13+ requires HTTPS for DeviceMotionEvent

### Screen keeps turning off

- **Solution**: Wake Lock API is enabled automatically
- iOS fallback: Stay on the app tab

### Audio not playing

- **Solution**: Tap screen once to unlock audio context
- This is required by mobile browsers

### Cannot connect to server

- **Check**: Both devices on same WiFi
- **Check**: Firewall allows port 3000
- **Check**: Backend is running

## 📄 License

MIT
