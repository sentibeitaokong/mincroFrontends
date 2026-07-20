import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const remoteEntry =
    env.VITE_REMOTE_ENTRY ||
    "http://localhost:4174/assets/remoteEntry.js";

  return {
    plugins: [
      react(),
      federation({
        name: "hostApp",
        remotes: {
          productApp: remoteEntry,
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: "^18.3.1",
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^18.3.1",
          },
        },
      }),
    ],
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      target: "esnext",
    },
  };
});

