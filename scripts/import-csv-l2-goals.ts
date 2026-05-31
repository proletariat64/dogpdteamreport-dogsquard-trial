import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.API_URL || "http://localhost:8888/api";

async function api(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const json = await res.json();
  if (!json.success) throw new Error(`${method} ${path}: ${json.error?.message}`);
  return json.data;
}

function parseSemicolons(v: string): string[] {
  if (!v || !v.trim()) return [];
  return v.split(";").map((s) => s.trim()).filter(Boolean);
}

function readCsv(filename: string): string[][] {
  const text = readFileSync(filename, "utf-8").replace(/\r\n/g, "\n");
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.split(",").map((c) => c.trim()));
}

async function main() {
  const csvDir = join(process.cwd(), "backup", "521", "csv");

  // Build old-ID → code mapping from L1 CSV
  const l1CsvRows = readCsv(join(csvDir, "一级产品.csv")).slice(1);
  const oldL1IdToCode: Record<string, string> = {};
  for (const [id, , code] of l1CsvRows) oldL1IdToCode[id] = code;

  // Fetch current L1 products to map code → new ID
  const l1Products = await api("GET", "/products/l1") as Array<{ id: string; code: string }>;
  const codeToNewL1Id: Record<string, string> = {};
  for (const p of l1Products) codeToNewL1Id[p.code] = p.id;

  // Build old L1 → new L1 ID mapping
  const oldL1ToNew: Record<string, string> = {};
  for (const [oldId, code] of Object.entries(oldL1IdToCode)) {
    if (codeToNewL1Id[code]) oldL1ToNew[oldId] = codeToNewL1Id[code];
  }

  console.log("Old L1 → New L1:");
  for (const [k, v] of Object.entries(oldL1ToNew)) console.log(`  ${k} -> ${v}`);

  // ── 1. L2 Products ──
  console.log("\n=== Importing L2 products ===");
  const l2Rows = readCsv(join(csvDir, "二级产品.csv")).slice(1);
  const l2OldToNew: Record<string, string> = {};
  // CSV: id, l1Id(old), name, code, ownerIds
  for (const [id, oldL1Id, name, code] of l2Rows) {
    const newL1Id = oldL1ToNew[oldL1Id];
    if (!newL1Id) {
      console.error(`  L2 ${name} (${code}): L1 ${oldL1Id} not found`);
      continue;
    }
    try {
      const p = await api("POST", "/products/l2", { l1Id: newL1Id, name, code });
      l2OldToNew[id] = p.id;
      console.log(`  L2: ${name} (${code}) -> ${p.id}`);
    } catch (e: any) {
      if (e.message.includes("已存在") || e.message.includes("UNIQUE")) {
        // Find existing by scanning L2 products
        const existing = await api("GET", "/products/l2") as Array<{ id: string; code: string }>;
        const found = existing.find((p) => p.code === code);
        if (found) { l2OldToNew[id] = found.id; console.log(`  L2: ${name} (existing) -> ${found.id}`); }
      } else {
        console.error(`  L2 failed: ${name} — ${e.message}`);
      }
    }
  }

  // ── 2. L1 Goals ──
  console.log("\n=== Importing L1 goals ===");
  const l1GoalRows = readCsv(join(csvDir, "L1目标.csv")).slice(1);
  const l1GoalOldToNew: Record<string, string> = {};
  // CSV: id, content, standard, l1ProductTagIds (semicolon old L1 IDs)
  for (const [id, content, standard, l1ProductTagIds] of l1GoalRows) {
    const oldL1Ids = parseSemicolons(l1ProductTagIds);
    const newL1Id = oldL1Ids.map((oid) => oldL1ToNew[oid]).find(Boolean);
    if (!newL1Id) {
      console.error(`  L1 goal ${content}: no L1 for ${l1ProductTagIds}`);
      continue;
    }
    try {
      const g = await api("POST", "/goals/l1", { l1ProductId: newL1Id, content, standard: standard || null });
      l1GoalOldToNew[id] = g.id;
      console.log(`  L1 goal: ${content.slice(0,50)} -> ${g.id}`);
    } catch (e: any) {
      console.error(`  L1 goal failed: ${content} — ${e.message}`);
    }
  }

  // ── 3. L2 Goals ──
  console.log("\n=== Importing L2 goals ===");
  const l2GoalRows = readCsv(join(csvDir, "L2目标.csv")).slice(1);
  let imported = 0;
  // CSV: id, content, standard, l1ProductTagIds, l2ProductTagIds, l1GoalTagIds
  for (const [id, content, standard, , l2ProductTagIds, l1GoalTagIds] of l2GoalRows) {
    const oldL2Ids = parseSemicolons(l2ProductTagIds);
    const oldL1GoalIds = parseSemicolons(l1GoalTagIds);
    const newL2Id = oldL2Ids.map((oid) => l2OldToNew[oid]).find(Boolean);
    if (!newL2Id) {
      console.error(`  L2 goal ${content}: no L2 for ${l2ProductTagIds}`);
      continue;
    }
    const newL1GoalIds = oldL1GoalIds.map((oid) => l1GoalOldToNew[oid]).filter(Boolean);
    try {
      const g = await api("POST", "/goals/l2", { l2ProductId: newL2Id, content, standard: standard || null, l1GoalIds: newL1GoalIds });
      console.log(`  L2 goal: ${content.slice(0,50)} -> ${g.id}`);
      imported++;
    } catch (e: any) {
      console.error(`  L2 goal failed: ${content} — ${e.message}`);
    }
  }

  console.log(`\n=== Import complete ===`);
  console.log(`L2 Products: ${Object.keys(l2OldToNew).length}`);
  console.log(`L1 Goals: ${Object.keys(l1GoalOldToNew).length}`);
  console.log(`L2 Goals: ${imported}`);
}

main().catch((e) => {
  console.error("Import failed:", e.message);
  process.exit(1);
});
