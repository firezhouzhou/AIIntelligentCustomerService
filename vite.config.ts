import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 为 sockjs-client 提供 global 变量兼容
    global: 'globalThis',
  },
  server: {
    port: 5173,
    proxy: {
      // 代理API请求到后端
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
      },
      // Chapter 15 WebSocket 代理
      '/ws': {
        target: 'http://localhost:8015',
        changeOrigin: true,
        ws: true,  // 启用 WebSocket 代理
      },
    }
  }
})
