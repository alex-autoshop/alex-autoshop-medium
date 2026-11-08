import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    manifest: true,
  },
  server: {
    port: 8081,
    host: true,
    proxy: {
      // Nur lokal: die Vercel-Funktionen laufen in der Vorschau, nicht in Vite.
      "/api": { target: "https://www.alex-autoshop.de", changeOrigin: true, secure: true },
    },
  },
});
