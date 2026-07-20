import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 保留根路径，极简运行时会用子应用入口地址注入 base 并解析资源。
export default defineConfig({
  base: '/',
  plugins: [
    vue(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3002,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:3002',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
