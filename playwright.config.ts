import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3001",
    browserName: "chromium",
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
  },
});
