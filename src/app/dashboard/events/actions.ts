"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { randomUUID } from "node:crypto";

import { db } from "@/db/index";
import { events } from "@/db/schema";
import { getMembershipWithCompany } from "@/lib/company";
import { computeRetentionUntil } from "@/lib/retention";

const eventTypeSchema = z.enum([
  "wedding",
  "birthday",
  "corporate",
  "anniversary",
  "other",
]);

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Use lowercase letters, numbers, and hyphens only (cannot start/end with hyphen).",
  });

const formSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    eventType: eventTypeSchema,
    eventTypeOther: z.string().trim().max(200).optional(),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    retailClientName: z.string().trim().min(1).max(200),
    retailClientEmail: z.string().trim().email().max(320),
    retailClientSlug: slugSchema,
  })
  .superRefine((data, ctx) => {
    if (data.eventType === "other") {
      const o = data.eventTypeOther?.trim();
      if (!o) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Describe the custom event type.",
          path: ["eventTypeOther"],
        });
      }
    }
  });

function stringField(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export type CreateEventFormValues = {
  name: string;
  eventType: string;
  eventTypeOther: string;
  eventDate: string;
  retailClientName: string;
  retailClientEmail: string;
  retailClientSlug: string;
};

function readEventFormValues(formData: FormData): CreateEventFormValues {
  const eventTypeRaw = formData.get("eventType");
  const eventType =
    typeof eventTypeRaw === "string" && eventTypeRaw ? eventTypeRaw : "wedding";
  return {
    name: stringField(formData, "name"),
    eventType,
    eventTypeOther: stringField(formData, "eventTypeOther"),
    eventDate: stringField(formData, "eventDate"),
    retailClientName: stringField(formData, "retailClientName"),
    retailClientEmail: stringField(formData, "retailClientEmail"),
    retailClientSlug: stringField(formData, "retailClientSlug"),
  };
}

export type CreateEventState =
  | { ok: true }
  | {
      ok: false;
      replayKey: string;
      message: string;
      values: CreateEventFormValues;
      fieldErrors?: Partial<
        Record<
          | "name"
          | "eventType"
          | "eventTypeOther"
          | "eventDate"
          | "retailClientName"
          | "retailClientEmail"
          | "retailClientSlug",
          string
        >
      >;
    };

function failCreateEvent(
  args: Omit<Extract<CreateEventState, { ok: false }>, "ok" | "replayKey">
): Extract<CreateEventState, { ok: false }> {
  return { ok: false, replayKey: randomUUID(), ...args };
}

export async function createEvent(
  _prev: CreateEventState | undefined,
  formData: FormData
): Promise<CreateEventState> {
  const submittedValues = readEventFormValues(formData);

  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return failCreateEvent({
      message: "You must sign in to create an event.",
      values: submittedValues,
    });
  }

  const eventTypeRaw = formData.get("eventType");
  const eventType = typeof eventTypeRaw === "string" ? eventTypeRaw : "";

  const parsed = formSchema.safeParse({
    name: formData.get("name"),
    eventType,
    eventTypeOther:
      eventType === "other" ? formData.get("eventTypeOther") : undefined,
    eventDate: formData.get("eventDate"),
    retailClientName: formData.get("retailClientName"),
    retailClientEmail: formData.get("retailClientEmail"),
    retailClientSlug: formData.get("retailClientSlug"),
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return failCreateEvent({
      message: "Please fix the fields below.",
      values: submittedValues,
      fieldErrors: {
        name: fe.name?.[0],
        eventType: fe.eventType?.[0],
        eventTypeOther: fe.eventTypeOther?.[0],
        eventDate: fe.eventDate?.[0],
        retailClientName: fe.retailClientName?.[0],
        retailClientEmail: fe.retailClientEmail?.[0],
        retailClientSlug: fe.retailClientSlug?.[0],
      },
    });
  }

  const membership = await getMembershipWithCompany(userId);
  if (!membership) {
    return failCreateEvent({
      message: "Complete onboarding first.",
      values: submittedValues,
    });
  }

  const plan = membership.company.plan;
  if (!plan) {
    return failCreateEvent({
      message: "Plan not found for your company.",
      values: submittedValues,
    });
  }

  const [slugDup] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.companyId, membership.company.id),
        eq(events.retailClientSlug, parsed.data.retailClientSlug),
        isNull(events.deletedAt)
      )
    )
    .limit(1);

  if (slugDup) {
    return failCreateEvent({
      message:
        "That client URL slug is already used for another event in your workspace.",
      values: submittedValues,
      fieldErrors: {
        retailClientSlug: "This slug is already taken.",
      },
    });
  }

  const eventDate = new Date(`${parsed.data.eventDate}T12:00:00.000Z`);
  const retentionUntil = computeRetentionUntil(plan.code, new Date());

  const [created] = await db
    .insert(events)
    .values({
      companyId: membership.company.id,
      name: parsed.data.name,
      eventType: parsed.data.eventType,
      eventTypeOther:
        parsed.data.eventType === "other"
          ? String(parsed.data.eventTypeOther).trim()
          : null,
      eventDate,
      retailClientName: parsed.data.retailClientName,
      retailClientEmail: parsed.data.retailClientEmail,
      retailClientSlug: parsed.data.retailClientSlug,
      retentionUntil,
      passwordHash: null,
      coverImageKey: null,
    })
    .returning({ id: events.id });

  if (!created) {
    return failCreateEvent({
      message: "Could not create event.",
      values: submittedValues,
    });
  }

  redirect(`/dashboard/events/${created.id}`);
}
