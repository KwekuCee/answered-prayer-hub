import { BackgroundSyncPlugin } from "workbox-background-sync";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, NetworkOnly } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/version\.json$/],
  }),
);

registerRoute(({ url }) => url.pathname === "/version.json", new NetworkOnly());

registerRoute(
  ({ url }) =>
    /\/(?:rest\/v1|rpc)\//i.test(url.pathname) &&
    (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")),
  new NetworkOnly({
    plugins: [
      new BackgroundSyncPlugin("supabase-form-submissions", {
        maxRetentionTime: 60 * 24 * 7,
      }),
    ],
  }),
  "POST",
);

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: "gstatic-fonts-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 15, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    /^\/rest\/v1\/(testimonials|resources|programs|prayer_points|prayer_wall|churches)/i.test(url.pathname) &&
    (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")),
  new NetworkFirst({
    cacheName: "supabase-api-offline-cache",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

registerRoute(
  /^https:\/\/actions\.google\.com\/sounds\/v1\/.*/i,
  new CacheFirst({
    cacheName: "worship-audio-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

declare global {
  interface WorkerGlobalScope {
    __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
  }
}

export {};
