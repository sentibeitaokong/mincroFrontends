import { defineConfig } from "vite";

export default defineConfig({
  base: "http://localhost:7103/",
  server: {
    port: 7103,
    host: "0.0.0.0",
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
