export interface DeploymentVersionManifest {
  buildId: string;
  builtAt?: string;
}

export function parseVersionManifest(payload: unknown): DeploymentVersionManifest | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const buildId = typeof record.buildId === "string" ? record.buildId.trim() : "";
  if (!buildId) return null;
  const builtAt = typeof record.builtAt === "string" ? record.builtAt.trim() : undefined;
  return builtAt ? { buildId, builtAt } : { buildId };
}

export function isNewDeploymentAvailable(
  currentBuildId: string | null | undefined,
  remoteBuildId: string | null | undefined,
  dismissedBuildId?: string | null
): boolean {
  const current = (currentBuildId || "").trim();
  const remote = (remoteBuildId || "").trim();
  if (!current || !remote) return false;
  if (remote === current) return false;
  if (dismissedBuildId && dismissedBuildId.trim() === remote) return false;
  return true;
}

export async function fetchRemoteDeploymentVersion(
  fetchImpl: typeof fetch = fetch,
  endpoint = "/version.json"
): Promise<DeploymentVersionManifest | null> {
  try {
    const separator = endpoint.includes("?") ? "&" : "?";
    const res = await fetchImpl(`${endpoint}${separator}t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers?.get?.("content-type") || "";
    if (contentType && !contentType.includes("json")) return null;
    const data = await res.json();
    return parseVersionManifest(data);
  } catch {
    return null;
  }
}
