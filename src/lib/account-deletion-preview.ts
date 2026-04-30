import "server-only";

import { and, count, eq, isNull, sum } from "drizzle-orm";

import { db } from "@/db/index";
import { audioFiles, emailTemplates, events } from "@/db/schema";

export type AccountDeletionPreview = {
  eventCount: number;
  audioFileCount: number;
  storageBytesTotal: number;
  emailTemplateCount: number;
};

export async function loadAccountDeletionPreview(
  companyId: string
): Promise<AccountDeletionPreview> {
  const [eventRow] = await db
    .select({ n: count() })
    .from(events)
    .where(and(eq(events.companyId, companyId), isNull(events.deletedAt)));

  const eventCount = Number(eventRow?.n ?? 0);

  const [audioRow] = await db
    .select({
      n: count(),
      bytes: sum(audioFiles.sizeBytes),
    })
    .from(audioFiles)
    .innerJoin(events, eq(audioFiles.eventId, events.id))
    .where(
      and(
        eq(events.companyId, companyId),
        isNull(events.deletedAt),
        isNull(audioFiles.deletedAt)
      )
    );

  const [tplRow] = await db
    .select({ n: count() })
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.companyId, companyId),
        isNull(emailTemplates.deletedAt)
      )
    );

  return {
    eventCount,
    audioFileCount: Number(audioRow?.n ?? 0),
    storageBytesTotal: Number(audioRow?.bytes ?? 0),
    emailTemplateCount: Number(tplRow?.n ?? 0),
  };
}
