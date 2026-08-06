import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 转发到 Parse Server（默认 1337 端口）
      '/parse': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Parse SDK 依赖 Node 的 events 模块，浏览器端需要显式预构建 polyfill
    include: ['events'],
  },
  // Vitest 配置（单元 + 集成测试）
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    include: ['src/**/*.test.{js,jsx}', 'tests/integration/**/*.test.{js,jsx}'],
    css: false,
  },
})
