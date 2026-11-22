import { defineConfig, devices } from "@playwright/test";

const MOCK_API_PORT = 4010;
const APP_PORT = 3300;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Started in order: the mock API first, because the production build
  // pre-renders the popular fund pages and fetches their data.
  webServer: [
    {
      command: "node e2e/mock-mf-api.mjs",
      url: `http://localhost:${MOCK_API_PORT}/health`,
      env: { MOCK_MF_API_PORT: String(MOCK_API_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm build && pnpm start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      env: { MF_API_BASE_URL: `http://localhost:${MOCK_API_PORT}/mf` },
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
