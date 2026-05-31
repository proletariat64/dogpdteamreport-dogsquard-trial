import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { NotFoundError } from "../lib/errors.js";

// ── Schemas ──

const CreateL0GoalSchema = z.object({
  content: z.string().min(1).max(2000),
  standard: z.string().max(2000).nullable().default(null),
  l1GoalIds: z.array(z.string()).default([]),
});

const UpdateL0GoalSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  standard: z.string().max(2000).nullable().optional(),
  l1GoalIds: z.array(z.string()).optional(),
});

const CreateL1GoalSchema = z.object({
  l1ProductId: z.string().min(1),
  content: z.string().min(1).max(2000),
  standard: z.string().max(2000).nullable().default(null),
  l0GoalIds: z.array(z.string()).default([]),
  l2GoalIds: z.array(z.string()).default([]),
});

const UpdateL1GoalSchema = z.object({
  l1ProductId: z.string().min(1).optional(),
  content: z.string().min(1).max(2000).optional(),
  standard: z.string().max(2000).nullable().optional(),
  l0GoalIds: z.array(z.string()).optional(),
  l2GoalIds: z.array(z.string()).optional(),
});

const CreateL2GoalSchema = z.object({
  l2ProductId: z.string().min(1),
  content: z.string().min(1).max(2000),
  standard: z.string().max(2000).nullable().default(null),
  l1GoalIds: z.array(z.string()).default([]),
});

const UpdateL2GoalSchema = z.object({
  l2ProductId: z.string().min(1).optional(),
  content: z.string().min(1).max(2000).optional(),
  standard: z.string().max(2000).nullable().optional(),
  l1GoalIds: z.array(z.string()).optional(),
});

// ── Row types ──

interface GoalRow {
  id: string; content: string; standard: string | null;
  created_at: string; updated_at: string;
}

interface L1GoalRow extends GoalRow { l1_product_id: string; }
interface L2GoalRow extends GoalRow { l2_product_id: string; }

function goalFromRow(row: GoalRow) {
  return {
    id: row.id,
    content: row.content,
    standard: row.standard,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── L0 Goals ──

export function listL0() {
  return all<GoalRow>("SELECT * FROM l0_goals ORDER BY created_at DESC").map((row) => ({
    ...goalFromRow(row),
    l1GoalIds: all<{ l1_goal_id: string }>(
      "SELECT l1_goal_id FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [row.id],
    ).map((r) => r.l1_goal_id),
  }));
}

export function getL0(id: string) {
  const row = get<GoalRow>("SELECT * FROM l0_goals WHERE id = ?", [id]);
  if (!row) throw new NotFoundError(`L0 目标 ${id} 不存在`);

  const l1GoalIds = all<{ l1_goal_id: string }>(
    "SELECT l1_goal_id FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [id],
  ).map((r) => r.l1_goal_id);

  const l1Goals = l1GoalIds.length
    ? all<L1GoalRow>("SELECT * FROM l1_goals WHERE id IN (" + l1GoalIds.map(() => "?").join(",") + ")", l1GoalIds).map(goalFromRow)
    : [];

  return { ...goalFromRow(row), l1GoalIds, l1Goals };
}

export function createL0(data: unknown) {
  const parsed = CreateL0GoalSchema.parse(data);
  const id = generateId("g0");

  run("INSERT INTO l0_goals (id, content, standard) VALUES (?, ?, ?)", [id, parsed.content, parsed.standard]);

  for (const gId of parsed.l1GoalIds) {
    run("INSERT OR IGNORE INTO l0_goal_l1_goals (l0_goal_id, l1_goal_id) VALUES (?, ?)", [id, gId]);
  }

  return getL0(id);
}

export function updateL0(id: string, data: unknown) {
  getL0(id);
  const parsed = UpdateL0GoalSchema.parse(data);

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (val === undefined || key === "l1GoalIds") continue;
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    run(`UPDATE l0_goals SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (parsed.l1GoalIds !== undefined) {
    run("DELETE FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [id]);
    for (const gId of parsed.l1GoalIds) {
      run("INSERT OR IGNORE INTO l0_goal_l1_goals (l0_goal_id, l1_goal_id) VALUES (?, ?)", [id, gId]);
    }
  }

  return getL0(id);
}

export function deleteL0(id: string) {
  getL0(id);
  run("DELETE FROM l0_goals WHERE id = ?", [id]);
  return { deleted: true };
}

// ── L1 Goals ──

function l1GoalFromRow(row: L1GoalRow) {
  const l0GoalIds = all<{ l0_goal_id: string }>(
    "SELECT l0_goal_id FROM l0_goal_l1_goals WHERE l1_goal_id = ?", [row.id],
  ).map((r) => r.l0_goal_id);
  const l2GoalIds = all<{ l2_goal_id: string }>(
    "SELECT l2_goal_id FROM l1_goal_l2_goals WHERE l1_goal_id = ?", [row.id],
  ).map((r) => r.l2_goal_id);
  return {
    ...goalFromRow(row),
    l1ProductId: row.l1_product_id,
    l0GoalIds,
    l2GoalIds,
  };
}

export function listL1(l1ProductId?: string) {
  let sql = "SELECT * FROM l1_goals";
  const params: string[] = [];
  if (l1ProductId) { sql += " WHERE l1_product_id = ?"; params.push(l1ProductId); }
  sql += " ORDER BY created_at DESC";
  return all<L1GoalRow>(sql, params).map(l1GoalFromRow);
}

export function getL1(id: string) {
  const row = get<L1GoalRow>("SELECT * FROM l1_goals WHERE id = ?", [id]);
  if (!row) throw new NotFoundError(`L1 目标 ${id} 不存在`);

  const result = l1GoalFromRow(row);
  const l2Goals = result.l2GoalIds.length
    ? all<L2GoalRow>(
      "SELECT * FROM l2_goals WHERE id IN (" + result.l2GoalIds.map(() => "?").join(",") + ")",
      result.l2GoalIds,
    ).map(goalFromRow)
    : [];

  return { ...result, l2Goals };
}

export function createL1(data: unknown) {
  const parsed = CreateL1GoalSchema.parse(data);
  const id = generateId("g1");

  // Validate product exists
  const prod = get("SELECT id FROM l1_products WHERE id = ?", [parsed.l1ProductId]);
  if (!prod) throw new NotFoundError(`L1 产品 ${parsed.l1ProductId} 不存在`);

  run("INSERT INTO l1_goals (id, l1_product_id, content, standard) VALUES (?, ?, ?, ?)",
    [id, parsed.l1ProductId, parsed.content, parsed.standard]);

  for (const gId of parsed.l0GoalIds) {
    run("INSERT OR IGNORE INTO l0_goal_l1_goals (l0_goal_id, l1_goal_id) VALUES (?, ?)", [gId, id]);
  }
  for (const gId of parsed.l2GoalIds) {
    run("INSERT OR IGNORE INTO l1_goal_l2_goals (l1_goal_id, l2_goal_id) VALUES (?, ?)", [id, gId]);
  }

  return getL1(id);
}

export function updateL1(id: string, data: unknown) {
  getL1(id);
  const parsed = UpdateL1GoalSchema.parse(data);

  if (parsed.l1ProductId) {
    const prod = get("SELECT id FROM l1_products WHERE id = ?", [parsed.l1ProductId]);
    if (!prod) throw new NotFoundError(`L1 产品 ${parsed.l1ProductId} 不存在`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (val === undefined || ["l0GoalIds", "l2GoalIds"].includes(key)) continue;
    fields.push(`${key === "l1ProductId" ? "l1_product_id" : key} = ?`);
    values.push(val);
  }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    run(`UPDATE l1_goals SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (parsed.l0GoalIds !== undefined) {
    run("DELETE FROM l0_goal_l1_goals WHERE l1_goal_id = ?", [id]);
    for (const gId of parsed.l0GoalIds) {
      run("INSERT OR IGNORE INTO l0_goal_l1_goals (l0_goal_id, l1_goal_id) VALUES (?, ?)", [gId, id]);
    }
  }
  if (parsed.l2GoalIds !== undefined) {
    run("DELETE FROM l1_goal_l2_goals WHERE l1_goal_id = ?", [id]);
    for (const gId of parsed.l2GoalIds) {
      run("INSERT OR IGNORE INTO l1_goal_l2_goals (l1_goal_id, l2_goal_id) VALUES (?, ?)", [id, gId]);
    }
  }

  return getL1(id);
}

export function deleteL1(id: string) {
  getL1(id);
  run("DELETE FROM l1_goals WHERE id = ?", [id]);
  return { deleted: true };
}

// ── L2 Goals ──

function l2GoalFromRow(row: L2GoalRow) {
  const l1GoalIds = all<{ l1_goal_id: string }>(
    "SELECT l1_goal_id FROM l1_goal_l2_goals WHERE l2_goal_id = ?", [row.id],
  ).map((r) => r.l1_goal_id);
  return {
    ...goalFromRow(row),
    l2ProductId: row.l2_product_id,
    l1GoalIds,
  };
}

export function listL2(l2ProductId?: string) {
  let sql = "SELECT * FROM l2_goals";
  const params: string[] = [];
  if (l2ProductId) { sql += " WHERE l2_product_id = ?"; params.push(l2ProductId); }
  sql += " ORDER BY created_at DESC";
  return all<L2GoalRow>(sql, params).map(l2GoalFromRow);
}

export function getL2(id: string) {
  const row = get<L2GoalRow>("SELECT * FROM l2_goals WHERE id = ?", [id]);
  if (!row) throw new NotFoundError(`L2 目标 ${id} 不存在`);
  return l2GoalFromRow(row);
}

export function createL2(data: unknown) {
  const parsed = CreateL2GoalSchema.parse(data);
  const id = generateId("g2");

  const prod = get("SELECT id FROM l2_products WHERE id = ?", [parsed.l2ProductId]);
  if (!prod) throw new NotFoundError(`L2 产品 ${parsed.l2ProductId} 不存在`);

  run("INSERT INTO l2_goals (id, l2_product_id, content, standard) VALUES (?, ?, ?, ?)",
    [id, parsed.l2ProductId, parsed.content, parsed.standard]);

  for (const gId of parsed.l1GoalIds) {
    run("INSERT OR IGNORE INTO l1_goal_l2_goals (l1_goal_id, l2_goal_id) VALUES (?, ?)", [gId, id]);
  }

  return getL2(id);
}

export function updateL2(id: string, data: unknown) {
  getL2(id);
  const parsed = UpdateL2GoalSchema.parse(data);

  if (parsed.l2ProductId) {
    const prod = get("SELECT id FROM l2_products WHERE id = ?", [parsed.l2ProductId]);
    if (!prod) throw new NotFoundError(`L2 产品 ${parsed.l2ProductId} 不存在`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (val === undefined || key === "l1GoalIds") continue;
    fields.push(`${key === "l2ProductId" ? "l2_product_id" : key} = ?`);
    values.push(val);
  }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    run(`UPDATE l2_goals SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (parsed.l1GoalIds !== undefined) {
    run("DELETE FROM l1_goal_l2_goals WHERE l2_goal_id = ?", [id]);
    for (const gId of parsed.l1GoalIds) {
      run("INSERT OR IGNORE INTO l1_goal_l2_goals (l1_goal_id, l2_goal_id) VALUES (?, ?)", [gId, id]);
    }
  }

  return getL2(id);
}

export function deleteL2(id: string) {
  getL2(id);
  run("DELETE FROM l2_goals WHERE id = ?", [id]);
  return { deleted: true };
}

export { CreateL0GoalSchema, UpdateL0GoalSchema, CreateL1GoalSchema, UpdateL1GoalSchema, CreateL2GoalSchema, UpdateL2GoalSchema };
