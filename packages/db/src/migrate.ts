import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";

const runMigrations = async () => {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:../../data/app.sqlite",
  });

  const db = drizzle(client);

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "./migrations" });

  // Enable WAL mode for better concurrency
  await client.execute("PRAGMA journal_mode = WAL;");
  console.log("WAL mode enabled");

  console.log("Migrations complete!");

  process.exit(0);
};

runMigrations().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  process.exit(1);
});
