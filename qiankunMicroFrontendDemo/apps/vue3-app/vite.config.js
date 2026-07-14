import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import qiankun from "vite-plugin-qiankun";

export default defineConfig({
  base: "http://localhost:7101/",
  plugins: [vue(), qiankun("vue3-app", { useDevMode: true })],
  server: {
    port: 7101,
    host: "0.0.0.0",
    origin: "http://localhost:7101",
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
