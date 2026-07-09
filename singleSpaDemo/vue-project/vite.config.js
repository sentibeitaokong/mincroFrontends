import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vitePluginSingleSpa from 'vite-plugin-single-spa';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueDevTools(),
        vitePluginSingleSpa({
            serverPort: 8082,
            spaEntryPoints: 'src/spa.js',
            projectId: 'vue-project'
        })
    ],
    server: {
        cors: true
    },
    optimizeDeps: {
        include: ['vue', 'single-spa-vue']
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
