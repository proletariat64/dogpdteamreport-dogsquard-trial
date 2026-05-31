import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface L1Product {
  id: string; name: string; code: string; teamId: string;
  ownerIds?: string[];
}
interface L2Product {
  id: string; l1Id: string; name: string; code: string;
  ownerIds?: string[];
}
interface Team {
  id: string; name: string; tags: string[];
}
interface Person {
  id: string; name: string; employeeId: string; level: string;
  tags: string[]; teamId: string; location: string;
  l1ProductIds: string[]; l2ProductIds: string[];
  managerId: string; manager?: string;
}
interface L1Goal {
  id: string; content: string; standard?: string;
  l1TagIds: string[];
}
interface L2Goal {
  id: string; content: string; standard?: string;
  l1TagIds: string[]; l2TagIds: string[]; l1GoalTagIds: string[];
}

const raw = readFileSync("D:/Downloads/data-export (4).json", "utf-8");
const data = JSON.parse(raw);

const l1Products: L1Product[] = data.products?.l1 ?? [];
const l2Products: L2Product[] = data.products?.l2 ?? [];
const teams: Team[] = data.teams ?? [];
const people: Person[] = data.people ?? [];
const l1Goals: L1Goal[] = data.goals?.l1 ?? [];
const l2Goals: L2Goal[] = data.goals?.l2 ?? [];

const outDir = join(process.cwd(), "backup", "521", "csv");
mkdirSync(outDir, { recursive: true });

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  writeFileSync(join(outDir, filename), lines.join("\n") + "\n", "utf-8");
  console.log(`  ${filename} (${rows.length} 条)`);
  return rows.length;
}

// 1. 标签 — 从 teams 和 people 中提取唯一的 tag 名称
const tagSet = new Set<string>();
for (const t of teams) for (const tag of t.tags) tagSet.add(tag);
for (const p of people) for (const tag of p.tags) tagSet.add(tag);
const tags = [...tagSet].sort();

// 2. 团队
// 3. 人员
// 4. 一级产品
// 5. 二级产品
// 6. L1 目标
// 7. L2 目标

console.log("导出主数据表到 backup/521/csv/:\n");

// 标签
writeCsv("标签.csv", ["id", "value"],
  tags.map((v, i) => [`tag-seq-${i + 1}`, v]));

// 团队
writeCsv("团队.csv", ["id", "name", "tags"],
  teams.map(t => [t.id, t.name, t.tags.join(";")]));

// 人员
writeCsv("人员.csv",
  ["id", "name", "employeeId", "level", "teamId", "location", "managerId", "manager", "tags", "l1ProductIds", "l2ProductIds"],
  people.map(p => [
    p.id, p.name, p.employeeId || "", p.level || "",
    p.teamId || "", p.location || "",
    p.managerId || "", p.manager || "",
    p.tags.join(";"),
    p.l1ProductIds.join(";"),
    p.l2ProductIds.join(";"),
  ]));

// 一级产品
writeCsv("一级产品.csv", ["id", "name", "code", "teamId", "ownerIds"],
  l1Products.map(p => [p.id, p.name, p.code, p.teamId, (p.ownerIds || []).join(";")]));

// 二级产品
writeCsv("二级产品.csv", ["id", "l1Id", "name", "code", "ownerIds"],
  l2Products.map(p => [p.id, p.l1Id, p.name, p.code, (p.ownerIds || []).join(";")]));

// L1 目标
writeCsv("L1目标.csv", ["id", "content", "standard", "l1ProductTagIds"],
  l1Goals.map(g => [g.id, g.content, g.standard || "", g.l1TagIds.join(";")]));

// L2 目标
writeCsv("L2目标.csv", ["id", "content", "standard", "l1ProductTagIds", "l2ProductTagIds", "l1GoalTagIds"],
  l2Goals.map(g => [g.id, g.content, g.standard || "", g.l1TagIds.join(";"), g.l2TagIds.join(";"), g.l1GoalTagIds.join(";")]));

console.log("\n完成.");
