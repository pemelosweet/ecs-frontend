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
      // 转发到 Python 服务（build/server，uvicorn 默认 8000 端口）
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
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
