import { defineConfig } from 'vite'

// 注意：base 必须设置为 "/"，让 Micro App 自动拼接子应用的完整资源地址。
// 如果设为完整 URL (http://localhost:3001/)，MicroApp 无法正确重写 HTML 中的资源路径，
// 会导致子应用 JS 在顶层 window 执行，覆盖主应用内容。
export default defineConfig({
  base: '/',
  esbuild: {
    jsx: 'automatic',
  },
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
