import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";

const CreatePersonSchema = z.object({
  name: z.string().min(1).max(100),
  employeeId: z.string().max(20).nullable().default(null),
  level: z.string().max(10).nullable().default(null),
  tagIds: z.array(z.string()).default([]),
  teamId: z.string().nullable().default(null),
  location: z.string().max(50).nullable().default(null),
  managerId: z.string().nullable().default(null),
  l1ProductIds: z.array(z.string()).default([]),
  l2ProductIds: z.array(z.string()).default([]),
}).refine((d) => !d.managerId || d.managerId !== (d as Record<string,unknown>).id, {
  message: "managerId 不能引用自身",
});

const UpdatePersonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  employeeId: z.string().max(20).nullable().optional(),
  level: z.string().max(10).nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  teamId: z.string().nullable().optional(),
  location: z.string().max(50).nullable().optional(),
  managerId: z.string().nullable().optional(),
  l1ProductIds: z.array(z.string()).optional(),
  l2ProductIds: z.array(z.string()).optional(),
});

interface PersonRow {
  id: string; name: string; employee_id: string | null; level: string | null;
  team_id: string | null; location: string | null; manager_id: string | null;
  created_at: string; updated_at: string;
}

function personFromRow(row: PersonRow) {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employee_id,
    level: row.level,
    teamId: row.team_id,
    location: row.location,
    managerId: row.manager_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function personWithRelations(row: PersonRow) {
  const tagIds = all<{ tag_id: string }>(
    "SELECT tag_id FROM person_tags WHERE person_id = ?", [row.id],
  ).map((r) => r.tag_id);
  const l1ProductIds = all<{ l1_product_id: string }>(
    "SELECT l1_product_id FROM person_l1_products WHERE person_id = ?", [row.id],
  ).map((r) => r.l1_product_id);
  const l2ProductIds = all<{ l2_product_id: string }>(
    "SELECT l2_product_id FROM person_l2_products WHERE person_id = ?", [row.id],
  ).map((r) => r.l2_product_id);
  return { ...personFromRow(row), tagIds, l1ProductIds, l2ProductIds };
}

export function listPeople(filters?: { name?: string; teamId?: string; location?: string }) {
  let sql = "SELECT * FROM people WHERE 1=1";
  const params: string[] = [];

  if (filters?.name) {
    sql += " AND name LIKE ?";
    params.push(`%${filters.name}%`);
  }
  if (filters?.teamId) {
    sql += " AND team_id = ?";
    params.push(filters.teamId);
  }
  if (filters?.location) {
    sql += " AND location = ?";
    params.push(filters.location);
  }

  sql += " ORDER BY created_at DESC";
  return all<PersonRow>(sql, params).map(personWithRelations);
}

export function getPerson(id: string) {
  const row = get<PersonRow>("SELECT * FROM people WHERE id = ?", [id]);
  if (!row) throw new NotFoundError(`人员 ${id} 不存在`);
  return personWithRelations(row);
}

function filterValidIds(table: string, ids: string[]): string[] {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return all<{ id: string }>(`SELECT id FROM ${table} WHERE id IN (${placeholders})`, ids).map((r) => r.id);
}

function syncPersonRelations(
  id: string,
  tagIds?: string[],
  l1ProductIds?: string[],
  l2ProductIds?: string[],
) {
  if (tagIds !== undefined) {
    run("DELETE FROM person_tags WHERE person_id = ?", [id]);
    for (const tagId of filterValidIds("tags", tagIds)) {
      run("INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)", [id, tagId]);
    }
  }
  if (l1ProductIds !== undefined) {
    run("DELETE FROM person_l1_products WHERE person_id = ?", [id]);
    for (const pid of filterValidIds("l1_products", l1ProductIds)) {
      run("INSERT OR IGNORE INTO person_l1_products (person_id, l1_product_id) VALUES (?, ?)", [id, pid]);
    }
  }
  if (l2ProductIds !== undefined) {
    run("DELETE FROM person_l2_products WHERE person_id = ?", [id]);
    for (const pid of filterValidIds("l2_products", l2ProductIds)) {
      run("INSERT OR IGNORE INTO person_l2_products (person_id, l2_product_id) VALUES (?, ?)", [id, pid]);
    }
  }
}

export function createPerson(data: unknown) {
  const parsed = CreatePersonSchema.parse(data);
  const id = generateId("p");

  // Validate managerId exists if provided
  if (parsed.managerId) {
    const mgr = get("SELECT id FROM people WHERE id = ?", [parsed.managerId]);
    if (!mgr) throw new ValidationError(`上级人员 ${parsed.managerId} 不存在`);
  }

  run(
    `INSERT INTO people (id, name, employee_id, level, team_id, location, manager_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, parsed.name, parsed.employeeId, parsed.level, parsed.teamId, parsed.location, parsed.managerId],
  );

  syncPersonRelations(id, parsed.tagIds, parsed.l1ProductIds, parsed.l2ProductIds);
  return getPerson(id);
}

export function updatePerson(id: string, data: unknown) {
  const existing = getPerson(id);
  const parsed = UpdatePersonSchema.parse(data);

  // Validate managerId
  if (parsed.managerId) {
    if (parsed.managerId === id) throw new ValidationError("managerId 不能引用自身");
    const mgr = get("SELECT id FROM people WHERE id = ?", [parsed.managerId]);
    if (!mgr) throw new ValidationError(`上级人员 ${parsed.managerId} 不存在`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(parsed)) {
    if (val === undefined) continue;
    if (["tagIds", "l1ProductIds", "l2ProductIds"].includes(key)) continue;
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    fields.push(`${col} = ?`);
    values.push(val);
  }

  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    run(`UPDATE people SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  syncPersonRelations(id, parsed.tagIds, parsed.l1ProductIds, parsed.l2ProductIds);
  return getPerson(id);
}

export function deletePerson(id: string) {
  getPerson(id); // validates existence
  run("DELETE FROM people WHERE id = ?", [id]);
  return { deleted: true };
}

export { CreatePersonSchema, UpdatePersonSchema };
