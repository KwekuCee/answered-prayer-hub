import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function deploymentVersionPlugin(buildId: string): Plugin {
  const payload = JSON.stringify({
    buildId,
    builtAt: new Date().toISOString(),
  });

  return {
    name: "ksw-deployment-version",
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.end(payload);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: payload,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const appBuildId =
    process.env.VITE_APP_BUILD_ID ||
    (mode === "production"
      ? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      : "dev");

  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(appBuildId),
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR === "true" ? false : { overlay: false },
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      deploymentVersionPlugin(appBuildId),
      VitePWA({
        registerType: "prompt",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "mask-icon.svg",
          "pwa-192x192.png",
          "pwa-512x512.png",
        ],
        manifest: {
          id: "/",
          name: "Korle Bu Stands in Worship 2026",
          short_name: "KSW 2026",
          description:
            "Official App of Korle Bu Stands in Worship - Registration, resources, live stream, prayer wall, and testimonies.",
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
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
          ],
        },
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectManifest: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,jpg,jpeg}"],
          globIgnores: ["**/version.json"],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
