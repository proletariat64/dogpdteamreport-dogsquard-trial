import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { NotFoundError } from "../lib/errors.js";

const CreateL2ProductSchema = z.object({
  l1Id: z.string().min(1),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  ownerIds: z.array(z.string()).default([]),
});

const UpdateL2ProductSchema = z.object({
  l1Id: z.string().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  ownerIds: z.array(z.string()).optional(),
});

interface L2Row {
  id: string; l1_id: string; name: string; code: string;
  created_at: string; updated_at: string;
}

function l2FromRow(row: L2Row) {
  const ownerIds = all<{ person_id: string }>(
    "SELECT person_id FROM l2_product_owners WHERE l2_product_id = ?", [row.id],
  ).map((r) => r.person_id);
  return {
    id: row.id,
    l1Id: row.l1_id,
    name: row.name,
    code: row.code,
    ownerIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function syncL2Relations(id: string, ownerIds?: string[]) {
  if (ownerIds !== undefined) {
    run("DELETE FROM l2_product_owners WHERE l2_product_id = ?", [id]);
    for (const pid of ownerIds) {
      run("INSERT OR IGNORE INTO l2_product_owners (l2_product_id, person_id) VALUES (?, ?)", [id, pid]);
    }
  }
}

export function listL2(l1Id?: string) {
  let sql = "SELECT * FROM l2_products";
  const params: string[] = [];
  if (l1Id) { sql += " WHERE l1_id = ?"; params.push(l1Id); }
  sql += " ORDER BY created_at DESC";
  return all<L2Row>(sql, params).map(l2FromRow);
}

export function getL2(id: string) {
  const row = get<L2Row>("SELECT * FROM l2_products WHERE id = ?", [id]);
  if (!row) throw new NotFoundError(`L2 产品 ${id} 不存在`);
  return l2FromRow(row);
}

export function createL2(data: unknown) {
  const parsed = CreateL2ProductSchema.parse(data);
  const id = generateId("l2");

  // Validate L1 exists
  const l1 = get("SELECT id FROM l1_products WHERE id = ?", [parsed.l1Id]);
  if (!l1) throw new NotFoundError(`L1 产品 ${parsed.l1Id} 不存在`);

  run(
    "INSERT INTO l2_products (id, l1_id, name, code) VALUES (?, ?, ?, ?)",
    [id, parsed.l1Id, parsed.name, parsed.code],
  );
  syncL2Relations(id, parsed.ownerIds);
  return getL2(id);
}

export function updateL2(id: string, data: unknown) {
  getL2(id);
  const parsed = UpdateL2ProductSchema.parse(data);

  if (parsed.l1Id) {
    const l1 = get("SELECT id FROM l1_products WHERE id = ?", [parsed.l1Id]);
    if (!l1) throw new NotFoundError(`L1 产品 ${parsed.l1Id} 不存在`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (val === undefined || key === "ownerIds") continue;
    fields.push(`${key === "l1Id" ? "l1_id" : key} = ?`);
    values.push(val);
  }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    run(`UPDATE l2_products SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  syncL2Relations(id, parsed.ownerIds);
  return getL2(id);
}

export function deleteL2(id: string) {
  getL2(id);
  run("DELETE FROM l2_products WHERE id = ?", [id]);
  return { deleted: true };
}

export { CreateL2ProductSchema, UpdateL2ProductSchema };
