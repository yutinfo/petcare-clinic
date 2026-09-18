const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function tenantSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return process.env.DEV_TENANT_SLUG ?? null;
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (LOCAL_HOSTS.has(host)) {
    return process.env.DEV_TENANT_SLUG ?? "demo";
  }
  const parts = host.split(".");
  if (parts.length < 2) return process.env.DEV_TENANT_SLUG ?? null;
  const slug = parts[0];
  if (!slug || slug === "www" || slug === "app") return null;
  return slug;
}

const PUBLIC_FIRST = new Set(["login", "portal", "api"]);

export function isStaffAppPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  const first = parts[0]!.toLowerCase();
  if (PUBLIC_FIRST.has(first)) return false;
  return true;
}
