# Settings Persistence

Extended Joust persists user preferences to disk so they survive server restarts. This document explains how the settings system works and what is stored.

## Overview

Settings are stored in `server/data/settings.json`. This file is automatically created when settings are changed and contains all user preferences.

## Stored Settings

The settings file contains:

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `sensitivity` | string | Sensitivity preset key | `"medium"` |
| `gameMode` | string | Default game mode | `"role-based"` |
| `theme` | string | Default role theme | `"standard"` |
| `roundCount` | number | Number of rounds per game | `3` |
| `roundDuration` | number | Round duration in seconds (30-300), used by timed modes | `90` |
| `movement` | object | Movement detection config | See below |

### Movement Config

The `movement` object contains:

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `dangerThreshold` | number | 0-1, intensity above which damage occurs | `0.1` |
| `damageMultiplier` | number | Multiplier for excess movement damage | `50` |
| `historySize` | number | Movements to keep for smoothing | `5` |
| `smoothingEnabled` | boolean | Use averaged movement or instant | `true` |
| `oneshotMode` | boolean | Any movement above threshold = instant death | `false` |

## Sensitivity Presets

Available presets:

| Key | Damage Multiplier | Description |
|-----|-------------------|-------------|
| `low` | 30 | Forgiving — need big movements to take damage |
| `medium` | 50 | Default — balanced |
| `high` | 70 | Punishing — small movements hurt |
| `extreme` | 100 | Brutal — almost any movement is deadly |
| `oneshot` | 50 (+ oneshotMode) | Any movement above threshold = instant death |

## API Endpoints

### GET /api/game/settings

Returns current settings and available options.

**Response:**
```json
{
  "success": true,
  "sensitivity": "medium",
  "gameMode": "role-based",
  "theme": "standard",
  "roundCount": 3,
  "roundDuration": 90,
  "movement": {
    "dangerThreshold": 0.1,
    "damageMultiplier": 50,
    "oneshotMode": false
  },
  "presets": [...],
  "modes": [...],
  "themes": [...]
}
```

### POST /api/game/settings

Update settings. All fields are optional — only provided fields are updated.

**Request body:**
```json
{
  "sensitivity": "high",
  "gameMode": "classic",
  "theme": "halloween",
  "roundCount": 3,
  "roundDuration": 90
}
```

Or for custom sensitivity values:
```json
{
  "dangerThreshold": 0.05,
  "damageMultiplier": 80
}
```

**Response:** Returns updated settings in same format as GET.

## How Persistence Works

1. **On startup:** The server loads settings from `server/data/settings.json` if it exists
2. **On change:** When any setting is updated, the entire settings object is written to disk
3. **On reset:** Calling `resetMovementConfig()` deletes the settings file, restoring defaults

### File Location

The settings file is stored at:
```
server/data/settings.json
```

This directory is created automatically if it doesn't exist.

### Example settings.json

```json
{
  "movement": {
    "dangerThreshold": 0.1,
    "damageMultiplier": 70,
    "historySize": 5,
    "smoothingEnabled": true,
    "oneshotMode": false
  },
  "sensitivity": "high",
  "gameMode": "role-based",
  "theme": "standard",
  "roundCount": 3,
  "roundDuration": 90
}
```

## Backwards Compatibility

The settings system handles legacy format (flat MovementConfig without preferences). If an old-format settings file is loaded, it's automatically migrated to the new structure with `sensitivity: "custom"`.

## Test Mode

During tests, the global `settingsStore` is disabled to prevent tests from affecting the actual settings file. Each test that needs persistence creates a temporary store pointing to a temp directory.

## Using Settings in Game Launch

When launching a game via `POST /api/game/launch`:

- If `mode` is not provided, uses `userPreferences.gameMode`
- If `theme` is not provided, uses `userPreferences.theme`

This allows the dashboard to launch games with just "Start Game" and the server uses remembered preferences.

## Code Reference

- **SettingsStore:** `server/src/config/settingsStore.ts` — Low-level file I/O
- **gameConfig:** `server/src/config/gameConfig.ts` — Settings types, presets, update functions
- **Routes:** `server/src/routes/game.routes.ts` — HTTP API endpoints
