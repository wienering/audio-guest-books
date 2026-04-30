import { UAParser } from "ua-parser-js";

const parser = new UAParser();

/**
 * Short label for dashboards — avoids exposing full raw UA strings.
 */
export function formatUserAgentShort(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Unknown device";
  parser.setUA(raw);
  const r = parser.getResult();
  const browser =
    r.browser.name ??
    (raw.includes("Instagram") ? "Instagram" : undefined) ??
    (raw.includes("FBAN") || raw.includes("FBAV") ? "Facebook" : undefined) ??
    "Browser";
  const osName = r.os.name ?? "";
  const device = r.device.type;
  if (device === "mobile" || device === "tablet") {
    const model = r.device.model;
    if (model && osName === "iOS") return `${browser} on ${model}`;
    if (osName === "iOS" || osName === "Android") {
      return `${browser} on ${osName}`;
    }
    return `${browser} on mobile`;
  }
  if (osName) return `${browser} on ${osName}`;
  return browser;
}
