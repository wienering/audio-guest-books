import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "@/db/schema";

type DrizzleMw = ReturnType<typeof drizzle>;

type GlobalWithMiddlewareDb = typeof globalThis & {
  __middlewareDb?: DrizzleMw;
};

const edgeGlobal =
  typeof globalThis !== "undefined"
    ? (globalThis as GlobalWithMiddlewareDb)
    : { __middlewareDb: undefined as DrizzleMw | undefined };

export function getMiddlewareDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!edgeGlobal.__middlewareDb) {
    edgeGlobal.__middlewareDb = drizzle(neon(url), { schema });
  }
  return edgeGlobal.__middlewareDb ?? null;
}
