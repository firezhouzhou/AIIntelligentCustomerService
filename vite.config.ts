import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 代理API请求到后端
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
      },
      // Chapter 15 - 多模态智能客服平台API (端口8015)
      // 注意：chapter15Service.ts 中使用完整URL直接请求8015端口
      // 如需通过代理，可配置如下：
      // '/api/multimodal-chat': {
      //   target: 'http://localhost:8015',
      //   changeOrigin: true,
      // },
      // '/api/analytics': {
      //   target: 'http://localhost:8015',
      //   changeOrigin: true,
      // },
      // '/api/agents': {
      //   target: 'http://localhost:8015',
      //   changeOrigin: true,
      // }
    }
  }
})
