import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

let SQL: SqlJsStatic;
let db: SqlJsDatabase;
let dbPath: string;

export async function initDb(path: string): Promise<SqlJsDatabase> {
  dbPath = path;

  SQL = await initSqlJs({
    locateFile: (file: string) => join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });

  // Ensure directory exists
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(new Uint8Array(buffer));
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");

  const schemaPath = join(process.cwd(), "ddd", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.run(schema);

  saveToDisk();
  return db;
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export function setDb(database: SqlJsDatabase): void {
  db = database;
}

export function saveToDisk(): void {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Convenience: execute SQL and return all rows as objects
export function all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const stmt = getDb().prepare(sql);
  if (params) stmt.bind(params as import("sql.js").BindParams);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

// Convenience: execute SQL and return first row or undefined
export function get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
  const rows = all<T>(sql, params);
  return rows[0];
}

// Convenience: execute SQL and return { changes, lastInsertRowid }
export function run(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
  const db = getDb();
  db.run(sql, params as import("sql.js").BindParams);
  const result = { changes: db.getRowsModified(), lastInsertRowid: 0 };
  const stmt = db.prepare("SELECT last_insert_rowid() as id");
  if (stmt.step()) {
    result.lastInsertRowid = stmt.getAsObject().id as number;
  }
  stmt.free();
  saveToDisk();
  return result;
}

// Convenience: execute raw SQL (for multi-statement, schema, etc.)
export function exec(sql: string): void {
  getDb().run(sql);
  saveToDisk();
}
