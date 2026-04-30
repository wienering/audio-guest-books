const URL_RE = /https?:\/\/[^\s<]+/g;

function stripTrailingUrlPunct(href: string): { href: string; trailing: string } {
  let h = href;
  let trailing = "";
  while (h.length > 0 && /[.,;:!?)\]}»'"」]$/.test(h)) {
    trailing = h.slice(-1) + trailing;
    h = h.slice(0, -1);
  }
  return { href: h, trailing };
}

export type InvitationTextSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; href: string };

/**
 * Split a single line into text + link segments (for previews and HTML email).
 */
export function segmentLineForUrls(line: string): InvitationTextSegment[] {
  const out: InvitationTextSegment[] = [];
  let last = 0;
  for (const m of line.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (start > last) {
      out.push({ kind: "text", text: line.slice(last, start) });
    }
    const raw = m[0];
    const { href, trailing } = stripTrailingUrlPunct(raw);
    if (href.length > 0) {
      out.push({ kind: "link", href });
    }
    if (trailing) {
      out.push({ kind: "text", text: trailing });
    }
    last = start + raw.length;
  }
  if (last < line.length) {
    out.push({ kind: "text", text: line.slice(last) });
  }
  return out.length > 0 ? out : [{ kind: "text", text: line }];
}

/** Paragraphs are separated by blank lines (\\n\\n+). */
export function splitInvitationBodyParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
