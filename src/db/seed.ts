import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

import * as schema from "./schema";
import { features, plans, planFeatures } from "./schema";

const FEATURE_DEFS: { key: string; name: string; description: string }[] = [
  {
    key: "custom_branding",
    name: "Custom branding",
    description: "Logo and color palette on retail pages",
  },
  {
    key: "password_protection",
    name: "Password protection",
    description: "Protect retail pages with a password",
  },
  {
    key: "retail_analytics",
    name: "Retail page analytics",
    description: "Analytics for client-facing pages",
  },
  {
    key: "audit_log",
    name: "Audit log",
    description: "Audit log of company actions",
  },
  {
    key: "custom_email_templates",
    name: "Custom email templates",
    description: "Customize send-link email templates",
  },
  {
    key: "drag_reorder_files",
    name: "Drag to reorder files",
    description: "Reorder audio files in the event dashboard",
  },
  {
    key: "audio_transcoding",
    name: "Audio transcoding",
    description: "Automatic transcoding for WAV/FLAC/AIFF (Ultimate)",
  },
  {
    key: "remove_powered_by_footer",
    name: 'Remove "Powered by" footer',
    description: 'Hide the "Powered by Audio Guest Books" footer',
  },
  {
    key: "priority_support",
    name: "Priority support",
    description: "Priority support badge and handling",
  },
];

const PRO_FEATURES = new Set([
  "custom_branding",
  "password_protection",
  "retail_analytics",
  "audit_log",
  "remove_powered_by_footer",
]);

const ULTIMATE_FEATURES = new Set(FEATURE_DEFS.map((f) => f.key));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run seed");
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  await db
    .insert(plans)
    .values([
      {
        code: "free",
        name: "Free",
        priceCents: 0,
        fileLimitPerEvent: 10,
        stripePriceId: null,
      },
      {
        code: "pro",
        name: "Pro",
        priceCents: 0,
        fileLimitPerEvent: 100,
        stripePriceId: null,
      },
      {
        code: "ultimate",
        name: "Ultimate",
        priceCents: 500,
        fileLimitPerEvent: null,
        stripePriceId: null,
      },
    ])
    .onConflictDoNothing({ target: plans.code });

  for (const row of FEATURE_DEFS) {
    await db.insert(features).values(row).onConflictDoNothing({ target: features.key });
  }

  const [freePlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.code, "free"))
    .limit(1);
  const [proPlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.code, "pro"))
    .limit(1);
  const [ultimatePlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.code, "ultimate"))
    .limit(1);

  if (!freePlan || !proPlan || !ultimatePlan) {
    throw new Error("Plans missing after insert");
  }

  const allFeatRows = await db.select({ id: features.id, key: features.key }).from(features);
  const keyToId = new Map(allFeatRows.map((r) => [r.key, r.id]));

  async function linkFeatures(planId: string, keys: Set<string>) {
    for (const key of keys) {
      const fid = keyToId.get(key);
      if (!fid) {
        throw new Error(`Missing feature row for ${key}`);
      }
      await db
        .insert(planFeatures)
        .values({ planId, featureId: fid })
        .onConflictDoNothing();
    }
  }

  await linkFeatures(freePlan.id, new Set());
  await linkFeatures(proPlan.id, PRO_FEATURES);
  await linkFeatures(ultimatePlan.id, ULTIMATE_FEATURES);

  await db
    .update(plans)
    .set({ fileLimitPerEvent: 10 })
    .where(eq(plans.code, "free"));
  await db
    .update(plans)
    .set({ fileLimitPerEvent: 100 })
    .where(eq(plans.code, "pro"));
  await db
    .update(plans)
    .set({ fileLimitPerEvent: null })
    .where(eq(plans.code, "ultimate"));

  console.log("Seed completed: plans, features, plan_features.");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
