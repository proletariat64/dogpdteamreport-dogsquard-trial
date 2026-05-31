import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import "dotenv/config";

// This script is for standalone DB migration.
// In normal operation, src/lib/db.ts handles schema init automatically.
// Use this for manual migration or pre-deployment schema check.

const DB_PATH = process.env.DB_PATH || "./data/app.db";
const SCHEMA_PATH = join(process.cwd(), "ddd", "schema.sql");

function main() {
  console.log(`Migrating database: ${DB_PATH}`);

  if (!existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  // Since we use sql.js at runtime, this script uses better-sqlite3
  // for standalone migrations. If better-sqlite3 is not available,
  // use sql.js instead.
  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    const schema = readFileSync(SCHEMA_PATH, "utf-8");
    db.exec(schema);

    console.log("Migration complete. Tables:");
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(tables.map((t: any) => `  - ${t.name}`).join("\n"));

    db.close();
  } catch (e: any) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.log("better-sqlite3 not available. Schema is auto-applied at server startup (src/lib/db.ts).");
      console.log("No manual migration needed.");
    } else {
      throw e;
    }
  }
}

main();
