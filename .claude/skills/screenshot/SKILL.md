---
name: screenshot
description: Launch a bot game and take screenshots to visually inspect the UI. Use when verifying UI changes or debugging visual layouts without a phone.
disable-model-invocation: true
allowed-tools: Read, Write, Bash
---

Capture screenshots of the live game UI by launching a bot game via the debug API.

## Current worktree ports
- Backend port: !`grep VITE_BACKEND_PORT client/.env.local 2>/dev/null | cut -d= -f2 || echo "4000"`
- Client port: !`grep VITE_PORT client/.env.local 2>/dev/null | cut -d= -f2 || echo "5173"`

## Steps

1. Write a temporary Playwright script to `client/e2e/_screenshot.ts`:

```typescript
import { chromium } from "@playwright/test";

const BACKEND = `http://localhost:${process.env.VITE_BACKEND_PORT || 4000}`;
const CLIENT = `http://localhost:${process.env.VITE_PORT || 5173}`;

(async () => {
  // Reset state and create a bot game
  await fetch(`${BACKEND}/api/debug/reset`, { method: "POST" });
  await fetch(`${BACKEND}/api/debug/test/create`, { method: "POST" });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 800 });

  // Dashboard screenshot
  await page.goto(`${CLIENT}/dashboard`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/_screenshot_dashboard.png", fullPage: true });

  // Player view (join as a spectator to see the player UI)
  const playerPage = await browser.newPage();
  playerPage.setViewportSize({ width: 390, height: 844 }); // iPhone size
  await playerPage.goto(`${CLIENT}/player`);
  await playerPage.waitForTimeout(1000);
  await playerPage.screenshot({ path: "e2e/_screenshot_player.png", fullPage: true });

  await browser.close();
  console.log("Screenshots saved to client/e2e/_screenshot_*.png");
})();
```

2. Make sure the dev server is running. If not, start it:
   - In one terminal: `cd server && npm run dev`
   - In another: `cd client && npm run dev`

3. Run the script:
   ```bash
   cd client && npx tsx e2e/_screenshot.ts
   ```

4. Read and display the screenshots using the Read tool on `client/e2e/_screenshot_dashboard.png` and `client/e2e/_screenshot_player.png`.

5. Clean up: delete `client/e2e/_screenshot.ts` and the `.png` files after showing them.

## Notes
- Pass `$ARGUMENTS` to customize: e.g. `/screenshot active` to fast-forward to an active game state before capturing.
- For active game state, after creating the bot game call `POST /api/debug/fastforward` to skip countdown.
- If you need a specific game state (round-ended, finished), use `POST /api/debug/bot/:id/command` with `{ "command": "die" }` to eliminate bots.
