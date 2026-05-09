import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const alt =
  "Audio Guest Books — Deliver Audio Guest Books the Professional Way";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export async function generateBrandOgImage() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "brand",
    "lockup-horizontal.svg",
  );
  const svg = await readFile(logoPath, "utf8");
  const logoSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f6f4ef",
          backgroundImage:
            "linear-gradient(180deg, rgba(240,233,219,0.9) 0%, #f6f4ef 42%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          height={120}
          style={{ height: 120, width: "auto" }}
        />
        <p
          style={{
            marginTop: 36,
            fontSize: 34,
            fontWeight: 600,
            color: "#1a1a1a",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            textAlign: "center",
            maxWidth: 920,
            lineHeight: 1.25,
            letterSpacing: "-0.025em",
          }}
        >
          Deliver Audio Guest Books the Professional Way
        </p>
        <div
          style={{
            marginTop: 28,
            width: 100,
            height: 3,
            backgroundColor: "#c9a96e",
            borderRadius: 2,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
