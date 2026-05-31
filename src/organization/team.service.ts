import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { NotFoundError } from "../lib/errors.js";

const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  tagIds: z.array(z.string()).default([]),
});

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagIds: z.array(z.string()).optional(),
});

function filterValidIds(table: string, ids: string[]): string[] {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return all<{ id: string }>(`SELECT id FROM ${table} WHERE id IN (${placeholders})`, ids).map((r) => r.id);
}

export function listTeams() {
  const teams = all<{ id: string; name: string; created_at: string; updated_at: string }>(
    "SELECT * FROM teams ORDER BY created_at DESC",
  );
  return teams.map((t) => ({
    ...t,
    tagIds: all<{ tag_id: string }>("SELECT tag_id FROM team_tags WHERE team_id = ?", [t.id]).map(
      (r) => r.tag_id,
    ),
  }));
}

export function getTeam(id: string) {
  const team = get<{ id: string; name: string; created_at: string; updated_at: string }>(
    "SELECT * FROM teams WHERE id = ?",
    [id],
  );
  if (!team) throw new NotFoundError(`团队 ${id} 不存在`);

  const tagIds = all<{ tag_id: string }>("SELECT tag_id FROM team_tags WHERE team_id = ?", [id]).map(
    (r) => r.tag_id,
  );
  return { ...team, tagIds };
}

export function createTeam(data: unknown) {
  const parsed = CreateTeamSchema.parse(data);
  const id = generateId("team");

  run("INSERT INTO teams (id, name) VALUES (?, ?)", [id, parsed.name]);

  const validTagIds = filterValidIds("tags", parsed.tagIds);
  for (const tagId of validTagIds) {
    run("INSERT OR IGNORE INTO team_tags (team_id, tag_id) VALUES (?, ?)", [id, tagId]);
  }

  return getTeam(id);
}

export function updateTeam(id: string, data: unknown) {
  const team = getTeam(id); // validates existence
  const parsed = UpdateTeamSchema.parse(data);

  if (parsed.name !== undefined) {
    run("UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [parsed.name, id]);
  }

  if (parsed.tagIds !== undefined) {
    run("DELETE FROM team_tags WHERE team_id = ?", [id]);
    const validTagIds = filterValidIds("tags", parsed.tagIds);
    for (const tagId of validTagIds) {
      run("INSERT OR IGNORE INTO team_tags (team_id, tag_id) VALUES (?, ?)", [id, tagId]);
    }
  }

  return getTeam(id);
}

export function deleteTeam(id: string) {
  getTeam(id); // validates existence
  run("DELETE FROM teams WHERE id = ?", [id]);
  return { deleted: true };
}

export { CreateTeamSchema, UpdateTeamSchema };
