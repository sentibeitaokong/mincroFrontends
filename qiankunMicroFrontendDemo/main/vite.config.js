import { defineConfig } from "vite";

export default defineConfig({
  base: "http://localhost:7100/",
  server: {
    port: 7100,
    host: "0.0.0.0",
    cors: true,
  },
});
