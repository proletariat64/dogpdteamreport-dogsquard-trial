import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { all, getDb } from "../lib/db.js";
import { getLockState, forceRelease as forceReleaseLock } from "../lib/middleware/edit-lock.js";

const startTime = Date.now();

export function getStatus(myIp?: string) {
  const dbPath = process.env.DB_PATH || "./data/app.db";
  const backupDir = join(process.cwd(), "data", "backups");

  let dbSize = 0;
  if (existsSync(dbPath)) {
    dbSize = statSync(dbPath).size;
  }

  const tables = ["tags", "teams", "people", "l1_products", "l2_products",
    "l0_goals", "l1_goals", "l2_goals"];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const row = (() => {
      const stmt = getDb().prepare(`SELECT COUNT(*) as cnt FROM ${table}`);
      stmt.step();
      const r = stmt.getAsObject();
      stmt.free();
      return r;
    })();
    counts[table] = row.cnt as number;
  }

  return {
    dbSize,
    dbSizeFormatted: `${(dbSize / 1024).toFixed(1)} KB`,
    recordCounts: counts,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    lock: { ...getLockState(), isOwn: myIp ? getLockState().holderIp === myIp : false },
    myIp: myIp || "unknown",
  };
}

export function createBackup() {
  const backupDir = join(process.cwd(), "data", "backups");
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const dbPath = process.env.DB_PATH || "./data/app.db";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `app-${timestamp}.db`;
  const dest = join(backupDir, filename);

  const data = readFileSync(join(process.cwd(), dbPath));
  writeFileSync(dest, data);

  return { filename, path: dest, size: data.length };
}

export function listBackups() {
  const backupDir = join(process.cwd(), "data", "backups");
  if (!existsSync(backupDir)) return [];

  return readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const fullPath = join(backupDir, f);
      const stat = statSync(fullPath);
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function forceRelease() {
  forceReleaseLock();
  return { released: true, lock: getLockState() };
}
