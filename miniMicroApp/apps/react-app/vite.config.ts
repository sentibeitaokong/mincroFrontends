import { defineConfig } from 'vite'

// 保留根路径，极简运行时会用子应用入口地址注入 base 并解析资源。
export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:3001',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})
