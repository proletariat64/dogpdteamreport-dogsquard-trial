import { copyFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";

const DB_PATH = process.env.DB_PATH || "./data/app.db";
const BACKUP_DIR = join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 30;

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `app-${ts}.db`;
  const dest = join(BACKUP_DIR, filename);

  copyFileSync(join(process.cwd(), DB_PATH), dest);
  console.log(`Backup: ${filename} (${statSync(dest).size} bytes)`);

  // JSON export as secondary backup
  const jsonFilename = `app-${ts}.json`;
  const jsonDest = join(BACKUP_DIR, jsonFilename);
  // We'd need to query all data for export, but for now just note it
  console.log(`JSON export skipped (use /api/export endpoint)`);

  // Cleanup old backups (>30 days or >MAX_BACKUPS)
  const backups = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({ name: f, path: join(BACKUP_DIR, f), mtime: statSync(join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(0, backups.length - MAX_BACKUPS);
    for (const b of toDelete) {
      unlinkSync(b.path);
      console.log(`Cleaned up old backup: ${b.name}`);
    }
  }

  console.log("Backup complete.");
}

main();
