import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import {
  fetchRemoteDeploymentVersion,
  isNewDeploymentAvailable,
} from "@/utils/deploymentUpdate";

const POLL_INTERVAL_MS = 60_000;
const MIN_CHECK_GAP_MS = 10_000;

function getCurrentBuildId(): string {
  return typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";
}

export const DeploymentUpdatePrompt: React.FC = () => {
  const currentBuildId = getCurrentBuildId();
  const [remoteBuildId, setRemoteBuildId] = useState<string | null>(null);
  const [dismissedBuildId, setDismissedBuildId] = useState<string | null>(null);
  const [dismissedSwPrompt, setDismissedSwPrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastCheckedAtRef = useRef<number>(0);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update().catch(() => {});
      }, POLL_INTERVAL_MS);
    },
  });

  const checkForUpdate = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckedAtRef.current < MIN_CHECK_GAP_MS) {
      return;
    }
    lastCheckedAtRef.current = now;

    const manifest = await fetchRemoteDeploymentVersion();
    if (manifest?.buildId) {
      setRemoteBuildId(manifest.buildId);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void checkForUpdate(true);
    }, 1500);

    const interval = window.setInterval(() => {
      void checkForUpdate(false);
    }, POLL_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate(false);
      }
    };

    const handleOnline = () => {
      void checkForUpdate(true);
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkForUpdate]);

  const hasRemoteUpdate = isNewDeploymentAvailable(
    currentBuildId,
    remoteBuildId,
    dismissedBuildId
  );
  const showPrompt =
    (swNeedRefresh && !dismissedSwPrompt) || hasRemoteUpdate;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 1. Tell the waiting service worker to take control immediately.
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
          // Give the new SW a moment to activate before we wipe caches.
          await new Promise((r) => window.setTimeout(r, 300));
        }
        // 2. Wipe all runtime caches so the new SW fetches fresh assets.
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      }

      // 3. If vite-plugin-pwa also tracks it, let it handle skipWaiting too.
      if (swNeedRefresh) {
        await Promise.race([
          updateServiceWorker(true),
          new Promise((resolve) => window.setTimeout(resolve, 800)),
        ]);
      }

      // 4. Hard-navigate: append a cache-bust query param so browsers
      //    (especially mobile Safari) don't serve from the HTTP cache.
      const url = new URL(window.location.href);
      url.searchParams.set("_cb", Date.now().toString());
      window.location.replace(url.toString());
    } catch {
      // Fallback: if anything throws, still do a hard reload.
      window.location.replace(
        window.location.href.split("?")[0] + "?_cb=" + Date.now()
      );
    }
  };

  const handleDismiss = () => {
    if (remoteBuildId) {
      setDismissedBuildId(remoteBuildId);
    }
    if (swNeedRefresh) {
      setDismissedSwPrompt(true);
      setSwNeedRefresh(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      data-testid="deployment-update-prompt"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[370px] z-[70] rounded-2xl border border-gold/45 bg-zinc-950/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/60 animate-fade-up"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/35 flex items-center justify-center shrink-0 mt-0.5">
          <RefreshCw
            className={`w-4 h-4 text-gold ${refreshing ? "animate-spin" : ""}`}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display font-bold text-sm text-foreground leading-snug">
              New Update Available
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss update notification"
              className="text-muted-foreground hover:text-foreground p-0.5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            A newer version of KSW 2026 has been deployed. Refresh to load the latest updates.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              disabled={refreshing}
              onClick={handleRefresh}
              data-testid="deployment-refresh-btn"
              className="rounded-xl bg-gradient-gold text-navy font-bold text-xs shadow-gold h-8 px-4 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh Now"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={refreshing}
              onClick={handleDismiss}
              className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-8 px-3"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DeploymentUpdatePrompt;
