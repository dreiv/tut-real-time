import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/stream": { target: "http://localhost:3001", changeOrigin: true },
      "/api/sse": { target: "http://localhost:3002", changeOrigin: true },
    },
  },
});
