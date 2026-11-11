import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/EssentialStudy/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "EssentialStudy",
        short_name: "EssentialStudy",
        description: "Your learning, organised.",
        theme_color: "#edf7f4",
        background_color: "#f5faf8",
        display: "standalone",
        start_url: "/EssentialStudy/",
        scope: "/EssentialStudy/",
        icons: [
          {
            src: "/EssentialStudy/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/EssentialStudy/index.html",
        globPatterns: ["**/*.{js,css,html,svg,woff2}"]
      }
    })
  ]
});
