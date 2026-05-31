import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });

  const backupDir = join(process.cwd(), "data", "backups");

  // Find latest backup by mtime
  const allFiles = readdirSync(backupDir).filter((f: string) => f.endsWith(".db"));
  const latest = allFiles.sort((a: string, b: string) => {
    return statSync(join(backupDir, b)).mtimeMs - statSync(join(backupDir, a)).mtimeMs;
  })[0];

  const dbPath = join(backupDir, latest);
  console.log(`读取备份: ${latest}`);

  const buffer = readFileSync(dbPath);
  const db = new SQL.Database(new Uint8Array(buffer));

  const outDir = join(process.cwd(), "backup", "521", "csv");
  mkdirSync(outDir, { recursive: true });

  const tables: Record<string, string> = {
    tags: "标签",
    teams: "团队",
    people: "人员",
    l1_products: "一级产品",
    l2_products: "二级产品",
    l0_goals: "L0目标",
    l1_goals: "L1目标",
    l2_goals: "L2目标",
  };

  for (const [table, label] of Object.entries(tables)) {
    const colRows: { name: string }[] = [];
    const pkStmt = db.prepare(`PRAGMA table_info(${table})`);
    while (pkStmt.step()) colRows.push(pkStmt.getAsObject() as { name: string });
    pkStmt.free();

    const cols = colRows.map((c) => c.name);
    const csvHeader = cols.join(",");
    const rows: string[] = [csvHeader];

    const stmt = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`);
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      const values = cols.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      rows.push(values.join(","));
    }
    stmt.free();

    writeFileSync(join(outDir, `${label}.csv`), rows.join("\n") + "\n", "utf-8");
    console.log(`  导出: ${label}.csv (${rows.length - 1} 条记录)`);
  }

  // Join tables
  const joinTables: Record<string, string> = {
    team_tags: "团队-标签关联",
    person_tags: "人员-标签关联",
    l1_product_owners: "L1产品-Owner关联",
    l2_product_owners: "L2产品-Owner关联",
    person_l1_products: "人员-L1产品关联",
    person_l2_products: "人员-L2产品关联",
    l0_goal_l1_goals: "L0目标-L1目标关联",
    l1_goal_l2_goals: "L1目标-L2目标关联",
  };

  for (const [table, label] of Object.entries(joinTables)) {
    const colRows: { name: string }[] = [];
    const pkStmt = db.prepare(`PRAGMA table_info(${table})`);
    while (pkStmt.step()) colRows.push(pkStmt.getAsObject() as { name: string });
    pkStmt.free();

    const cols = colRows.map((c) => c.name);
    const rows: string[] = [cols.join(",")];

    const stmt = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`);
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      const values = cols.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      rows.push(values.join(","));
    }
    stmt.free();

    if (rows.length > 1) {
      const safeName = label.replace(/[/\\?%*:|"<>]/g, "-");
      writeFileSync(join(outDir, `${safeName}.csv`), rows.join("\n") + "\n", "utf-8");
      console.log(`  导出: ${safeName}.csv (${rows.length - 1} 条记录)`);
    }
  }

  db.close();
  console.log(`\n导出完成，文件位置: ${outDir}`);
}

main().catch(console.error);
