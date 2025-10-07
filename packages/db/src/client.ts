import { type Client, createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type DbInstance = LibSQLDatabase<typeof schema> & {
    $client: Client;
};

let _db: DbInstance | null = null;

export function getDb(): NonNullable<typeof _db> {
  if (!_db) {
    const client = createClient({
      url: process.env.DATABASE_URL ?? "file:../../data/app.sqlite",
    });
    _db = drizzle(client, { schema });
  }

  return _db;
}

// For backward compatibility, export db as well
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return getDb()[prop as keyof DbInstance];
  },
}) as DbInstance;
