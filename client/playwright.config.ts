import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load per-worktree port overrides (.env.local is gitignored)
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const clientPort = parseInt(process.env.VITE_PORT || '5173');
const backendPort = parseInt(process.env.VITE_BACKEND_PORT || '4000');

// Check if SSL certificates exist (same logic as vite.config.js and server.ts)
const certsDir = path.resolve(__dirname, '../certs');
const certsExist =
  (fs.existsSync(path.join(certsDir, 'server.crt')) &&
    fs.existsSync(path.join(certsDir, 'server.key'))) ||
  (fs.existsSync(path.join(certsDir, 'cert.pem')) &&
    fs.existsSync(path.join(certsDir, 'key.pem')));

const protocol = certsExist ? 'https' : 'http';

// Allow self-signed certs for Node fetch() calls in test helpers (e.g. launchGameFast)
// This ensures tests work regardless of whether they're run via `npm run test:e2e`
// (which sets this env var) or directly via `npx playwright test`.
if (certsExist) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Playwright Configuration for Extended Joust E2E Tests
 *
 * These tests require both server and client to be running:
 * - Server: cd server && npm run dev (port 3000)
 * - Client: cd client && npm run dev (port 5173)
 *
 * Run tests: npm run test:e2e
 * Run with UI: npm run test:e2e:ui
 * Debug mode: npm run test:e2e:debug
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests in files in parallel
  fullyParallel: false, // Sequential for game state consistency

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit workers for predictable state
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the client (HTTP or HTTPS based on cert presence)
    baseURL: `${protocol}://localhost:${clientPort}`,

    // Ignore HTTPS errors (self-signed certs)
    ignoreHTTPSErrors: true,

    // Collect trace on failure for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (very helpful for debugging)
    video: 'on-first-retry',

    // Reasonable timeout
    actionTimeout: 10000,
  },

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Can add mobile testing later
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 13'] },
    // },
  ],

  // Run local dev servers before starting tests
  webServer: [
    {
      command: 'cd ../server && npm run dev',
      port: backendPort,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      port: clientPort,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
