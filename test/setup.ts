import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setDb } from "../src/lib/db.js";
import { createApp } from "../src/app.js";
import { forceRelease } from "../src/lib/middleware/edit-lock.js";
import type { Express } from "express";

const schemaPath = join(process.cwd(), "ddd", "schema.sql");
let SQL: Awaited<ReturnType<typeof initSqlJs>>;

export async function createTestApp(): Promise<{ app: Express; db: SqlJsDatabase }> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }

  forceRelease(); // reset lock state per test

  const db = new SQL.Database();
  db.run("PRAGMA foreign_keys = ON");
  const schema = readFileSync(schemaPath, "utf-8");
  db.run(schema);
  setDb(db);

  const app = createApp();
  return { app, db };
}
