import test from "node:test";
import assert from "node:assert/strict";
import {
  parseVersionManifest,
  isNewDeploymentAvailable,
  fetchRemoteDeploymentVersion,
} from "./deploymentUpdate";

test("parseVersionManifest extracts valid buildId and optional builtAt", () => {
  assert.deepEqual(
    parseVersionManifest({ buildId: "abc123", builtAt: "2026-11-27T08:00:00Z" }),
    { buildId: "abc123", builtAt: "2026-11-27T08:00:00Z" }
  );
  assert.deepEqual(parseVersionManifest({ buildId: "  xyz  " }), { buildId: "xyz" });
  assert.equal(parseVersionManifest({ buildId: "" }), null);
  assert.equal(parseVersionManifest(null), null);
  assert.equal(parseVersionManifest("invalid"), null);
});

test("isNewDeploymentAvailable triggers only when remote build differs and is not dismissed", () => {
  assert.equal(isNewDeploymentAvailable("build-1", "build-1"), false);
  assert.equal(isNewDeploymentAvailable("build-1", "build-2"), true);
  assert.equal(isNewDeploymentAvailable("build-1", "build-2", "build-2"), false);
  assert.equal(isNewDeploymentAvailable("build-1", "build-3", "build-2"), true);
  assert.equal(isNewDeploymentAvailable("build-1", ""), false);
  assert.equal(isNewDeploymentAvailable("", "build-2"), false);
});

test("fetchRemoteDeploymentVersion fetches with no-store and handles non-json or failed responses", async () => {
  let capturedUrl = "";
  const manifest = await fetchRemoteDeploymentVersion(
    (async (url: string) => {
      capturedUrl = url;
      return new Response(JSON.stringify({ buildId: "prod-99" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as any,
    "/version.json"
  );

  assert.ok(capturedUrl.startsWith("/version.json?t="));
  assert.deepEqual(manifest, { buildId: "prod-99" });

  const htmlFallback = await fetchRemoteDeploymentVersion(
    (async () =>
      new Response("<!doctype html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })) as any
  );
  assert.equal(htmlFallback, null);

  const errorRes = await fetchRemoteDeploymentVersion(
    (async () => new Response("Not found", { status: 404 })) as any
  );
  assert.equal(errorRes, null);
});
