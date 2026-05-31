import { z } from "zod";
import { all, get, run } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors.js";

const CreateTagSchema = z.object({
  value: z.string().min(1).max(50),
});

export function listTags() {
  return all<{ id: string; value: string; created_at: string; updated_at: string }>(
    "SELECT * FROM tags ORDER BY created_at DESC",
  );
}

export function createTag(data: unknown) {
  const parsed = CreateTagSchema.parse(data);
  const id = generateId("tag");

  // Check uniqueness
  const existing = get("SELECT id FROM tags WHERE value = ?", [parsed.value]);
  if (existing) throw new ConflictError(`标签 "${parsed.value}" 已存在`);

  run("INSERT INTO tags (id, value) VALUES (?, ?)", [id, parsed.value]);
  return getTag(id);
}

export function getTag(id: string) {
  const tag = get<{ id: string; value: string; created_at: string; updated_at: string }>(
    "SELECT * FROM tags WHERE id = ?",
    [id],
  );
  if (!tag) throw new NotFoundError(`标签 ${id} 不存在`);
  return tag;
}

export function updateTag(id: string, data: unknown) {
  getTag(id); // validates existence
  const parsed = CreateTagSchema.parse(data);

  const existing = get("SELECT id FROM tags WHERE value = ? AND id != ?", [parsed.value, id]);
  if (existing) throw new ConflictError(`标签 "${parsed.value}" 已存在`);

  run("UPDATE tags SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [parsed.value, id]);
  return getTag(id);
}

export function deleteTag(id: string) {
  const tag = getTag(id); // validates existence
  run("DELETE FROM tags WHERE id = ?", [id]);
  return { deleted: true };
}

export { CreateTagSchema };
