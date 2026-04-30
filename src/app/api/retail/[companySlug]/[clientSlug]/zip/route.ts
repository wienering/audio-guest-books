import { GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
import { NextResponse } from "next/server";
import { PassThrough } from "node:stream";
import { Readable } from "node:stream";

import { hashIp, logRetailAnalytics } from "@/lib/retail-analytics";
import {
  resolveRetailEventForSlugs,
  sanitizeZipBaseName,
} from "@/lib/retail-public";
import { takeRetailRateLimit } from "@/lib/retail-rate-limit";
import {
  analyticsContextFromRequest,
  getClientIpFromRequest,
} from "@/lib/retail-request-meta";
import { getR2BucketName, getR2Client } from "@/lib/r2";

type RouteCtx = {
  params: Promise<{ companySlug: string; clientSlug: string }>;
};

export async function GET(req: Request, ctx: RouteCtx) {
  const { companySlug, clientSlug } = await ctx.params;
  const ip = getClientIpFromRequest(req);
  const rl = takeRetailRateLimit(ip, "retail:zip");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const resolved = await resolveRetailEventForSlugs(
    decodeURIComponent(companySlug),
    decodeURIComponent(clientSlug)
  );
  if ("error" in resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { event } = resolved;
  const ac = analyticsContextFromRequest(req);
  try {
    await logRetailAnalytics({
      eventId: event.id,
      eventType: "zip_download",
      ipHash: hashIp(ac.ip),
      userAgent: ac.userAgent,
      referrer: ac.referrer,
    });
  } catch (e) {
    console.error("retail zip_download log", e);
  }

  const pass = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.on("error", (err: Error) => {
    pass.destroy(err);
  });
  archive.pipe(pass);

  const bucket = getR2BucketName();
  const s3 = getR2Client();

  (async () => {
    try {
      let i = 0;
      for (const f of event.audioFiles) {
        const out = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: f.storageKey })
        );
        const body = out.Body;
        if (!body) continue;
        const safeName = f.originalFilename.replace(/[/\\]/g, "_");
        const nameInZip = `${String(i + 1).padStart(2, "0")}_${safeName}`;
        archive.append(body as import("node:stream").Readable, {
          name: nameInZip,
        });
        i += 1;
      }
      await archive.finalize();
    } catch (err) {
      pass.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  const body = Readable.toWeb(pass) as unknown as ReadableStream;
  const baseName = sanitizeZipBaseName(event.name);
  const filename = `${baseName}-recordings.zip`;
  const asciiFallback = `${baseName}-recordings.zip`.replace(/[^\x20-\x7E]/g, "_");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
