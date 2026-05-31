import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { NotFoundError } from "../lib/errors.js";

const LinkL1GoalsSchema = z.object({
  l1GoalIds: z.array(z.string()).min(1),
});

const LinkL2GoalsSchema = z.object({
  l2GoalIds: z.array(z.string()).min(1),
});

// ── L0 ↔ L1 ──

export function getL0L1Goals(l0GoalId: string) {
  const l0 = get("SELECT id FROM l0_goals WHERE id = ?", [l0GoalId]);
  if (!l0) throw new NotFoundError(`L0 目标 ${l0GoalId} 不存在`);

  const ids = all<{ l1_goal_id: string }>(
    "SELECT l1_goal_id FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [l0GoalId],
  ).map((r) => r.l1_goal_id);

  if (ids.length === 0) return [];
  return all("SELECT * FROM l1_goals WHERE id IN (" + ids.map(() => "?").join(",") + ")", ids);
}

export function linkL0ToL1(l0GoalId: string, data: unknown) {
  const l0 = get("SELECT id FROM l0_goals WHERE id = ?", [l0GoalId]);
  if (!l0) throw new NotFoundError(`L0 目标 ${l0GoalId} 不存在`);
  const parsed = LinkL1GoalsSchema.parse(data);

  // Filter to only valid L1 goal IDs
  const validIds = parsed.l1GoalIds.length
    ? all<{ id: string }>("SELECT id FROM l1_goals WHERE id IN (" + parsed.l1GoalIds.map(() => "?").join(",") + ")", parsed.l1GoalIds).map((r) => r.id)
    : [];

  let linked = 0;
  for (const gId of validIds) {
    run("INSERT OR IGNORE INTO l0_goal_l1_goals (l0_goal_id, l1_goal_id) VALUES (?, ?)", [l0GoalId, gId]);
    linked++;
  }
  return { linked };
}

export function unlinkL0FromL1(l0GoalId: string, l1GoalId: string) {
  run("DELETE FROM l0_goal_l1_goals WHERE l0_goal_id = ? AND l1_goal_id = ?", [l0GoalId, l1GoalId]);
  return { unlinked: true };
}

// ── L1 ↔ L2 ──

export function getL1L2Goals(l1GoalId: string) {
  const l1 = get("SELECT id FROM l1_goals WHERE id = ?", [l1GoalId]);
  if (!l1) throw new NotFoundError(`L1 目标 ${l1GoalId} 不存在`);

  const ids = all<{ l2_goal_id: string }>(
    "SELECT l2_goal_id FROM l1_goal_l2_goals WHERE l1_goal_id = ?", [l1GoalId],
  ).map((r) => r.l2_goal_id);

  if (ids.length === 0) return [];
  return all("SELECT * FROM l2_goals WHERE id IN (" + ids.map(() => "?").join(",") + ")", ids);
}

export function linkL1ToL2(l1GoalId: string, data: unknown) {
  const l1 = get("SELECT id FROM l1_goals WHERE id = ?", [l1GoalId]);
  if (!l1) throw new NotFoundError(`L1 目标 ${l1GoalId} 不存在`);
  const parsed = LinkL2GoalsSchema.parse(data);

  // Filter to only valid L2 goal IDs
  const validIds = parsed.l2GoalIds.length
    ? all<{ id: string }>("SELECT id FROM l2_goals WHERE id IN (" + parsed.l2GoalIds.map(() => "?").join(",") + ")", parsed.l2GoalIds).map((r) => r.id)
    : [];

  let linked = 0;
  for (const gId of validIds) {
    run("INSERT OR IGNORE INTO l1_goal_l2_goals (l1_goal_id, l2_goal_id) VALUES (?, ?)", [l1GoalId, gId]);
    linked++;
  }
  return { linked };
}

export function unlinkL1FromL2(l1GoalId: string, l2GoalId: string) {
  run("DELETE FROM l1_goal_l2_goals WHERE l1_goal_id = ? AND l2_goal_id = ?", [l1GoalId, l2GoalId]);
  return { unlinked: true };
}
