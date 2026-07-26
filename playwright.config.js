import { defineConfig, devices } from '@playwright/test'

// e2e 测试配置：自动拉起 vite dev server 后跑 e2e/ 下的用例
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    // 仅失败用例保留视频，避免日常跑产生大量产物
    video: 'retain-on-failure',
    // 仅失败时截图，便于排查
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --no-open',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
