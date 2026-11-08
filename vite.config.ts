import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "/",
        name: "Korle Bu Stands in Worship 2026",
        short_name: "KSW 2026",
        description: "Official App of Korle Bu Stands in Worship - Registration, resources, live stream, prayer wall, and testimonies.",
        theme_color: "#d4af37",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,jpg,jpeg}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Cache Google Fonts Stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts Webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 15,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Supabase API calls: core resources, recent testimonials, programs, prayer wall
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(testimonials|resources|programs|prayer_points|prayer_wall|churches).*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-offline-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days offline availability
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache soundtrack ambient streams & audio
            urlPattern: /^https:\/\/actions\.google\.com\/sounds\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "worship-audio-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
