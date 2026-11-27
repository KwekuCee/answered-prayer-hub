import test from "node:test";
import assert from "node:assert/strict";
import { importWithRetry, isDynamicImportError } from "./lazyWithRetry";

test("detects dynamic module fetch errors across browsers", () => {
  assert.equal(
    isDynamicImportError(new TypeError("Failed to fetch dynamically imported module: https://example.com/Register.tsx")),
    true,
  );
  assert.equal(
    isDynamicImportError(new Error("Loading chunk 42 failed")),
    true,
  );
  assert.equal(
    isDynamicImportError(new Error("Regular render failure")),
    false,
  );
});

test("retries transient dynamic import failures and clears reload marker on success", async () => {
  let calls = 0;
  const store = new Map<string, string>([["ksw_lazy_retry:Register", "1"]]);
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  const FakeComponent = (() => null) as any;
  const mod = await importWithRetry(
    async () => {
      calls++;
      if (calls < 3) {
        throw new TypeError("Failed to fetch dynamically imported module");
      }
      return { default: FakeComponent };
    },
    "Register",
    { maxRetries: 2, retryDelayMs: 0, storage },
  );

  assert.equal(calls, 3);
  assert.equal(mod.default, FakeComponent);
  assert.equal(store.has("ksw_lazy_retry:Register"), false);
});

test("rethrows after guarded reload has already been attempted once", async () => {
  let reloadCalls = 0;
  const store = new Map<string, string>([["ksw_lazy_retry:Donate", "1"]]);
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  await assert.rejects(
    () =>
      importWithRetry(
        async () => {
          throw new TypeError("Failed to fetch dynamically imported module");
        },
        "Donate",
        {
          maxRetries: 1,
          retryDelayMs: 0,
          storage,
          onReload: () => {
            reloadCalls++;
          },
        },
      ),
    /Failed to fetch dynamically imported module/,
  );

  assert.equal(reloadCalls, 0);
});
