import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Frontend talks to the backend only through VITE_API_URL - never a
// hardcoded production URL (spec section 60).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Mudit Traders",
        short_name: "Mudit Traders",
        theme_color: "#0f172a",
        icons: [],
      },
      // Only cache the app shell; never cache API responses as if they
      // were confirmed-saved data (spec section 41 - no false "saved"
      // claims when offline).
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: { port: 5173 },
});
