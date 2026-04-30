import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "@/db/schema";

let pool: Pool | null = null;
let workerDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getWorkerDb() {
  if (!workerDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString });
    workerDb = drizzle(pool, { schema });
  }
  return workerDb;
}

export async function closeWorkerDb() {
  if (pool) {
    await pool.end();
    pool = null;
    workerDb = null;
  }
}
