import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    launchOptions: {
      ...(process.env.CHROMIUM_PATH
        ? {
            executablePath: process.env.CHROMIUM_PATH,
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
          }
        : {}),
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
