import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "@/db/schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

type DbSingleton = typeof globalThis & {
  audioGuestBooksDb?: ReturnType<typeof createDb>;
};

const g = globalThis as DbSingleton;

export const db = g.audioGuestBooksDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  g.audioGuestBooksDb = db;
}

export type AppDatabase = typeof db;
