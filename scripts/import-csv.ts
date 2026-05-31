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

  // ── 1. Tags ──
  console.log("=== Importing tags ===");
  const tagRows = readCsv(join(csvDir, "标签.csv")).slice(1); // skip header
  const tagNameToId: Record<string, string> = {};

  for (const [id, value] of tagRows) {
    try {
      const t = await api("POST", "/tags", { value });
      tagNameToId[value] = t.id;
      console.log(`  tag: ${value} -> ${t.id}`);
    } catch (e: any) {
      if (e.message.includes("已存在")) {
        // Find existing
        const tags = await api("GET", "/tags") as Array<{ id: string; value: string }>;
        const existing = tags.find((t) => t.value === value);
        if (existing) { tagNameToId[value] = existing.id; console.log(`  tag: ${value} (existing) -> ${existing.id}`); }
      } else {
        console.error(`  tag failed: ${value} — ${e.message}`);
      }
    }
  }

  // Additional tags referenced in teams/people CSV but not in 标签.csv
  const extraTags = new Set<string>();
  const teamRows = readCsv(join(csvDir, "团队.csv")).slice(1);
  for (const [, , tags] of teamRows) {
    for (const t of parseSemicolons(tags)) extraTags.add(t);
  }
  const personRows = readCsv(join(csvDir, "人员.csv")).slice(1);
  for (const row of personRows) {
    const tags = row[8]; // column index for "tags"
    for (const t of parseSemicolons(tags)) extraTags.add(t);
  }

  for (const name of extraTags) {
    if (tagNameToId[name]) continue;
    try {
      const t = await api("POST", "/tags", { value: name });
      tagNameToId[name] = t.id;
      console.log(`  tag (extra): ${name} -> ${t.id}`);
    } catch (e: any) {
      if (e.message.includes("已存在")) {
        const tags = await api("GET", "/tags") as Array<{ id: string; value: string }>;
        const existing = tags.find((t) => t.value === name);
        if (existing) { tagNameToId[name] = existing.id; console.log(`  tag (extra, existing): ${name} -> ${existing.id}`); }
      }
    }
  }

  // ── 2. Teams ──
  console.log("=== Importing teams ===");
  const teamIdToNewId: Record<string, string> = {};
  for (const [id, name, tags] of teamRows) {
    const tagIds = parseSemicolons(tags).map((n) => tagNameToId[n]).filter(Boolean);
    try {
      const t = await api("POST", "/teams", { name, tagIds });
      teamIdToNewId[id] = t.id;
      console.log(`  team: ${name} (${id}) -> ${t.id} tags=${tagIds.length}`);
    } catch (e: any) {
      console.error(`  team failed: ${name} — ${e.message}`);
    }
  }

  // ── 3. People ──
  console.log("=== Importing people ===");
  const personIdToNewId: Record<string, string> = {};
  // First pass: create all people (except those with manager reference issues)
  const personData = personRows.map(([id, name, employeeId, level, teamId, location, managerId, , tags, l1Ids, l2Ids]) => ({
    csvId: id,
    name,
    employeeId: employeeId || null,
    level: level || null,
    teamId: teamIdToNewId[teamId] || null,
    location: location || null,
    managerCsvId: managerId || null,
    tagIds: parseSemicolons(tags).map((n) => tagNameToId[n]).filter(Boolean),
    l1ProductIds: parseSemicolons(l1Ids),
    l2ProductIds: parseSemicolons(l2Ids),
  }));

  // Create people (managerId will be set later via update)
  for (const p of personData) {
    try {
      const created = await api("POST", "/people", {
        name: p.name,
        employeeId: p.employeeId,
        level: p.level,
        teamId: p.teamId,
        location: p.location,
        tagIds: p.tagIds,
        l1ProductIds: [],
        l2ProductIds: [],
      });
      personIdToNewId[p.csvId] = created.id;
      console.log(`  person: ${p.name} (${p.csvId}) -> ${created.id}`);
    } catch (e: any) {
      console.error(`  person failed: ${p.name} — ${e.message}`);
    }
  }

  // Second pass: update manager references
  console.log("=== Updating manager references ===");
  for (const p of personData) {
    if (!p.managerCsvId || !personIdToNewId[p.managerCsvId]) continue;
    const newId = personIdToNewId[p.csvId];
    const mgrNewId = personIdToNewId[p.managerCsvId];
    if (!newId || !mgrNewId) continue;
    try {
      await api("PUT", `/people/${newId}`, { managerId: mgrNewId });
      console.log(`  manager: ${p.name} -> ${p.managerCsvId}`);
    } catch (e: any) {
      console.error(`  manager update failed: ${p.name} — ${e.message}`);
    }
  }

  // ── 4. L1 Products ──
  console.log("=== Importing L1 products ===");
  const l1Rows = readCsv(join(csvDir, "一级产品.csv")).slice(1);
  for (const [id, name, code, teamId, ownerIds] of l1Rows) {
    const owners = parseSemicolons(ownerIds).map((oid) => personIdToNewId[oid]).filter(Boolean);
    try {
      const p = await api("POST", "/products/l1", {
        name,
        code,
        teamId: teamIdToNewId[teamId] || null,
        ownerIds: owners,
      });
      console.log(`  L1: ${name} (${code}) -> ${p.id} owners=${owners.length}`);
    } catch (e: any) {
      console.error(`  L1 failed: ${name} — ${e.message}`);
    }
  }

  console.log("\n=== Import complete ===");
  console.log(`Tags: ${Object.keys(tagNameToId).length}`);
  console.log(`Teams: ${Object.keys(teamIdToNewId).length}`);
  console.log(`People: ${Object.keys(personIdToNewId).length}`);
}

main().catch((e) => {
  console.error("Import failed:", e.message);
  process.exit(1);
});
