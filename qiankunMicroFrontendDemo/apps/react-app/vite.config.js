import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import qiankun from "vite-plugin-qiankun";

export default defineConfig({
  base: "http://localhost:7102/",
  plugins: [react(), qiankun("react-app", { useDevMode: true })],
  server: {
    port: 7102,
    host: "0.0.0.0",
    origin: "http://localhost:7102",
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
