export function withBase(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  if (!path.startsWith("/")) return path;
  return `${base}${path}`;
}

export const OPS_HUB_URL =
  "https://drawerboxspecialties-ops.github.io/ops-dashboard/";
