import { NextResponse } from "next/server";

import {
  reportFilenameDate,
  sanitizeReportFilenameSegment,
} from "@/lib/client-report-filename";
import {
  computeClientReportFingerprint,
  getCachedClientReportPdf,
} from "@/lib/client-report-server";
import { requireEventCompanyOwner } from "@/lib/event-route-auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await ctx.params;

  const gated = await requireEventCompanyOwner(eventId);
  if ("error" in gated) return gated.error;

  if (gated.event.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fingerprint = await computeClientReportFingerprint(eventId);
  if (!fingerprint) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let pdf: Buffer;
  try {
    pdf = await getCachedClientReportPdf(eventId, fingerprint.hash);
  } catch (e) {
    console.error("client_report_pdf", e);
    return NextResponse.json(
      { error: "Could not generate PDF" },
      { status: 500 }
    );
  }

  const slug = sanitizeReportFilenameSegment(gated.event.retailClientSlug);
  const filename = `${slug}-report-${reportFilenameDate()}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
