/** Normalize #rgb / #rrggbb to lowercase #rrggbb */
export function normalizeHex(input: string | null | undefined): string | null {
  if (input == null || typeof input !== "string") return null;
  const s = input.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const h = n.slice(1);
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

export function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** Pick dark or light foreground for WCAG-ish contrast on background */
export function contrastingTextHex(backgroundHex: string): string {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) return "#171717";
  const L = relativeLuminance(rgb);
  return L > 0.179 ? "#171717" : "#fafafa";
}

export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return a;
  const clamp = (x: number) => Math.round(Math.min(255, Math.max(0, x)));
  const r = clamp(A.r + (B.r - A.r) * t);
  const g = clamp(A.g + (B.g - A.g) * t);
  const bl = clamp(A.b + (B.b - A.b) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
