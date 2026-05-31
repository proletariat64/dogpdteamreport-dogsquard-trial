import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";

const CreateL1ProductSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  teamId: z.string().nullable().default(null),
  ownerIds: z.array(z.string()).default([]),
});

const UpdateL1ProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  teamId: z.string().nullable().optional(),
  ownerIds: z.array(z.string()).optional(),
});

interface L1Row {
  id: string; name: string; code: string; team_id: string | null;
  created_at: string; updated_at: string;
}

function l1FromRow(row: L1Row) {
  const ownerIds = all<{ person_id: string }>(
    "SELECT person_id FROM l1_product_owners WHERE l1_product_id = ?", [row.id],
  ).map((r) => r.person_id);
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    teamId: row.team_id,
    ownerIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncL1Relations(id: string, ownerIds?: string[]) {
  if (ownerIds !== undefined) {
    run("DELETE FROM l1_product_owners WHERE l1_product_id = ?", [id]);
    for (const pid of ownerIds) {
      run("INSERT OR IGNORE INTO l1_product_owners (l1_product_id, person_id) VALUES (?, ?)", [id, pid]);
    }
  }
}

export function listL1() {
  return all<L1Row>("SELECT * FROM l1_products ORDER BY created_at DESC").map(l1FromRow);
}

export function getL1(id: string) {
  const row = get<L1Row>("SELECT * FROM l1_products WHERE id = ?", [id]);
  if (!row) throw new NotFoundError(`L1 产品 ${id} 不存在`);

  const l2Products = all<{ id: string; l1_id: string; name: string; code: string; created_at: string; updated_at: string }>(
    "SELECT * FROM l2_products WHERE l1_id = ? ORDER BY created_at", [id],
  ).map((l2) => {
    const l2Owners = all<{ person_id: string }>(
      "SELECT person_id FROM l2_product_owners WHERE l2_product_id = ?", [l2.id],
    ).map((r) => r.person_id);
    return {
      id: l2.id,
      l1Id: l2.l1_id,
      name: l2.name,
      code: l2.code,
      ownerIds: l2Owners,
      createdAt: l2.created_at,
      updatedAt: l2.updated_at,
    };
  });

  return { ...l1FromRow(row), l2Products };
}

export function createL1(data: unknown) {
  const parsed = CreateL1ProductSchema.parse(data);
  const id = generateId("l1");

  // Check code uniqueness
  const existing = get("SELECT id FROM l1_products WHERE code = ?", [parsed.code]);
  if (existing) throw new ConflictError(`产品编码 "${parsed.code}" 已存在`);

  run(
    "INSERT INTO l1_products (id, name, code, team_id) VALUES (?, ?, ?, ?)",
    [id, parsed.name, parsed.code, parsed.teamId],
  );
  syncL1Relations(id, parsed.ownerIds);
  return getL1(id);
}

export function updateL1(id: string, data: unknown) {
  const existing = getL1(id);
  const parsed = UpdateL1ProductSchema.parse(data);

  if (parsed.code && parsed.code !== existing.code) {
    const dup = get("SELECT id FROM l1_products WHERE code = ? AND id != ?", [parsed.code, id]);
    if (dup) throw new ConflictError(`产品编码 "${parsed.code}" 已存在`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (val === undefined || key === "ownerIds") continue;
    fields.push(`${key === "teamId" ? "team_id" : key} = ?`);
    values.push(val);
  }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    run(`UPDATE l1_products SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  syncL1Relations(id, parsed.ownerIds);
  return getL1(id);
}

export function deleteL1(id: string) {
  getL1(id);
  run("DELETE FROM l1_products WHERE id = ?", [id]);
  return { deleted: true };
}

export { CreateL1ProductSchema, UpdateL1ProductSchema };
