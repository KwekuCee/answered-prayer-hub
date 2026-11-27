import React, { type ComponentType } from "react";

const RELOAD_PREFIX = "ksw_lazy_retry:";

export interface LazyRetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  onReload?: () => void;
}

export function isDynamicImportError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|error loading dynamically imported module/i.test(
    message,
  );
}

export async function importWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  chunkKey: string,
  options: LazyRetryOptions = {},
): Promise<{ default: T }> {
  const {
    maxRetries = 2,
    retryDelayMs = 250,
    storage = typeof window !== "undefined" ? window.sessionStorage : null,
    onReload =
      typeof window !== "undefined" ? () => window.location.reload() : undefined,
  } = options;

  let lastError: unknown;
  const storageKey = `${RELOAD_PREFIX}${chunkKey}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const mod = await importer();
      try {
        storage?.removeItem(storageKey);
      } catch {
        // Ignore restricted storage errors.
      }
      return mod;
    } catch (error) {
      lastError = error;
      if (!isDynamicImportError(error)) {
        throw error;
      }
      if (attempt < maxRetries && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      }
    }
  }

  let hasReloaded = false;
  try {
    hasReloaded = storage?.getItem(storageKey) === "1";
    if (!hasReloaded && onReload) {
      storage?.setItem(storageKey, "1");
      onReload();
      // Keep the promise pending while the browser navigates/reloads cleanly.
      return await new Promise<{ default: T }>(() => {});
    }
  } catch {
    // Fall through and let RouteErrorBoundary present a recovery button.
  }

  throw lastError;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  chunkKey: string,
) {
  return React.lazy(() => importWithRetry(importer, chunkKey));
}
