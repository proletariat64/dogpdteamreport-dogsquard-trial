import { generateId } from "../src/lib/id.js";
import { run } from "../src/lib/db.js";

export function createTestTag(value = "test-tag") {
  const id = generateId("tag");
  run("INSERT INTO tags (id, value) VALUES (?, ?)", [id, value]);
  return { id, value };
}

export function createTestTeam(name = "test-team", tagIds: string[] = []) {
  const id = generateId("team");
  run("INSERT INTO teams (id, name) VALUES (?, ?)", [id, name]);
  for (const tagId of tagIds) {
    run("INSERT OR IGNORE INTO team_tags (team_id, tag_id) VALUES (?, ?)", [id, tagId]);
  }
  return { id, name, tagIds };
}

export function createTestPerson(name = "Test Person", overrides: Record<string, unknown> = {}) {
  const id = generateId("p");
  const defaults = {
    employee_id: null,
    level: null,
    team_id: null,
    location: null,
    manager_id: null,
    ...overrides,
  };
  run(
    `INSERT INTO people (id, name, employee_id, level, team_id, location, manager_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, defaults.employee_id, defaults.level, defaults.team_id, defaults.location, defaults.manager_id],
  );
  return { id, name, ...defaults };
}
