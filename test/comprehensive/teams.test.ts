import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all, get, run } from "../../src/lib/db.js";

describe("Teams API - 全量 CRUD 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  // ================================================================
  // CREATE
  // ================================================================

  describe("POST /api/teams - 创建", () => {
    it("正常创建（仅 name）→ 201", async () => {
      const res = await request(app).post("/api/teams").send({ name: "基础平台部" });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("基础平台部");
      expect(res.body.data.tagIds).toEqual([]);

      // API-DB 一致性
      const row = get("SELECT * FROM teams WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.name).toBe("基础平台部");
      expect(row.id).toBe(res.body.data.id);
    });

    it("正常创建（含 tagIds）→ 201", async () => {
      // 先创建 tags
      const t1 = await request(app).post("/api/tags").send({ value: "核心" });
      const t2 = await request(app).post("/api/tags").send({ value: "支撑" });

      const res = await request(app).post("/api/teams").send({
        name: "质量效能部",
        tagIds: [t1.body.data.id, t2.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.tagIds).toHaveLength(2);
      expect(res.body.data.tagIds).toContain(t1.body.data.id);
      expect(res.body.data.tagIds).toContain(t2.body.data.id);

      // DB 关联表验证
      const links = all("SELECT * FROM team_tags WHERE team_id = ?", [res.body.data.id]);
      expect(links).toHaveLength(2);
    });

    it("BUG: tagIds 含不存在的 ID → 500（INSERT OR IGNORE 不抑制 FK 约束违反）", async () => {
      // BUG-001: INSERT OR IGNORE 在 SQLite foreign_keys=ON 时无法跳过 FK 约束违反
      // 应返回 201 静默跳过，或返回 400 提示 tagId 不存在
      const res = await request(app).post("/api/teams").send({
        name: "测试团队",
        tagIds: ["tag-nonexistent-12345"],
      });
      // 当前行为：500 内部错误
      expect(res.status).toBe(500);
    });

    it("边界值：name 最小长度 1 → 201", async () => {
      const res = await request(app).post("/api/teams").send({ name: "A" });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("A");
    });

    it("边界值：name 最大长度 100 → 201", async () => {
      const n = "B".repeat(100);
      const res = await request(app).post("/api/teams").send({ name: n });
      expect(res.status).toBe(201);
      expect(res.body.data.name.length).toBe(100);
    });

    it("非法：name 超长 101 → 400", async () => {
      const res = await request(app).post("/api/teams").send({ name: "C".repeat(101) });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("非法：name 缺失 → 400", async () => {
      const res = await request(app).post("/api/teams").send({});
      expect(res.status).toBe(400);
    });

    it("非法：name 空字符串 → 400", async () => {
      const res = await request(app).post("/api/teams").send({ name: "" });
      expect(res.status).toBe(400);
    });

    it("安全：SQL 注入 payload → 201 以字符串存储", async () => {
      const res = await request(app).post("/api/teams").send({ name: "'; DROP TABLE teams; --" });
      expect(res.status).toBe(201);
      // 表仍存在
      const t = get("SELECT name FROM sqlite_master WHERE type='table' AND name='teams'");
      expect(t).toBeDefined();
    });

    it("安全：XSS payload → 201 以字符串存储", async () => {
      const res = await request(app).post("/api/teams").send({ name: "<img src=x onerror=alert(1)>" });
      expect(res.status).toBe(201);
      const row = get("SELECT name FROM teams WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("<img src=x onerror=alert(1)>");
    });
  });

  // ================================================================
  // READ
  // ================================================================

  describe("GET /api/teams - 列表", () => {
    it("空列表 → 200", async () => {
      const res = await request(app).get("/api/teams");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("有数据 → 200，API-DB 每条逐字段比对", async () => {
      await request(app).post("/api/teams").send({ name: "团队A" });
      await request(app).post("/api/teams").send({ name: "团队B" });

      const res = await request(app).get("/api/teams");
      expect(res.body.data.length).toBe(2);

      const dbTeams = all("SELECT * FROM teams ORDER BY created_at DESC") as Record<string, unknown>[];
      expect(res.body.data.length).toBe(dbTeams.length);
      for (let i = 0; i < dbTeams.length; i++) {
        expect(res.body.data[i].id).toBe(dbTeams[i].id);
        expect(res.body.data[i].name).toBe(dbTeams[i].name);
      }
    });
  });

  describe("GET /api/teams/:id - 详情", () => {
    it("正常获取 → 200", async () => {
      const create = await request(app).post("/api/teams").send({ name: "详情团队" });
      const res = await request(app).get(`/api/teams/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("详情团队");
      expect(res.body.data.tagIds).toEqual([]);
    });

    it("含 tagIds → 200", async () => {
      const tag = await request(app).post("/api/tags").send({ value: "敏捷" });
      const create = await request(app).post("/api/teams").send({
        name: "敏捷团队",
        tagIds: [tag.body.data.id],
      });
      const res = await request(app).get(`/api/teams/${create.body.data.id}`);
      expect(res.body.data.tagIds).toContain(tag.body.data.id);
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/teams/team-nonexist");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
    });
  });

  // ================================================================
  // UPDATE
  // ================================================================

  describe("PUT /api/teams/:id - 更新", () => {
    it("正常更新 name → 200", async () => {
      const create = await request(app).post("/api/teams").send({ name: "旧名称" });
      const id = create.body.data.id;

      const res = await request(app).put(`/api/teams/${id}`).send({ name: "新名称" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("新名称");

      // DB 一致性
      const row = get("SELECT name FROM teams WHERE id = ?", [id]) as Record<string, unknown>;
      expect(row.name).toBe("新名称");
    });

    it("正常更新 tagIds → 200", async () => {
      const tag = await request(app).post("/api/tags").send({ value: "更新标签" });
      const create = await request(app).post("/api/teams").send({ name: "标签团队" });
      const id = create.body.data.id;

      const res = await request(app).put(`/api/teams/${id}`).send({ tagIds: [tag.body.data.id] });
      expect(res.body.data.tagIds).toContain(tag.body.data.id);

      // DB 关联表
      const links = all("SELECT * FROM team_tags WHERE team_id = ?", [id]);
      expect(links).toHaveLength(1);
    });

    it("更新 tagIds 为空数组 → 清空所有关联", async () => {
      const tag = await request(app).post("/api/tags").send({ value: "待清空" });
      const create = await request(app).post("/api/teams").send({
        name: "清空测试",
        tagIds: [tag.body.data.id],
      });
      const id = create.body.data.id;

      const res = await request(app).put(`/api/teams/${id}`).send({ tagIds: [] });
      expect(res.body.data.tagIds).toEqual([]);

      const links = all("SELECT * FROM team_tags WHERE team_id = ?", [id]);
      expect(links).toHaveLength(0);
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/teams/team-nope").send({ name: "X" });
      expect(res.status).toBe(404);
    });

    it("非法：name 空字符串 → 400", async () => {
      const create = await request(app).post("/api/teams").send({ name: "有效" });
      const res = await request(app).put(`/api/teams/${create.body.data.id}`).send({ name: "" });
      expect(res.status).toBe(400);
    });

    it("空 body 更新 → 200（无变更，返回原数据）", async () => {
      const create = await request(app).post("/api/teams").send({ name: "不变" });
      const res = await request(app).put(`/api/teams/${create.body.data.id}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("不变");
    });
  });

  // ================================================================
  // DELETE
  // ================================================================

  describe("DELETE /api/teams/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/teams").send({ name: "待删除" });
      const res = await request(app).delete(`/api/teams/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      // DB 验证
      const row = get("SELECT * FROM teams WHERE id = ?", [create.body.data.id]);
      expect(row).toBeUndefined();
    });

    it("删除不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/teams/team-ghost");
      expect(res.status).toBe(404);
    });

    it("重复删除 → 404", async () => {
      const create = await request(app).post("/api/teams").send({ name: "删完再删" });
      await request(app).delete(`/api/teams/${create.body.data.id}`);
      const res = await request(app).delete(`/api/teams/${create.body.data.id}`);
      expect(res.status).toBe(404);
    });

    it("级联：删除 team 后 people.team_id 设为 NULL", async () => {
      const create = await request(app).post("/api/teams").send({ name: "人员归属" });
      const teamId = create.body.data.id;

      // 直接 DB 插入 person 引用此 team
      run("INSERT INTO people (id, name, team_id) VALUES (?, ?, ?)", ["p-test", "测试人", teamId]);

      await request(app).delete(`/api/teams/${teamId}`);

      // DB 验证：person 还在但 team_id 为 NULL
      const person = get("SELECT * FROM people WHERE id = ?", ["p-test"]) as Record<string, unknown>;
      expect(person).toBeDefined();
      expect(person.team_id).toBeNull();
    });

    it("级联：删除 team 后 team_tags 关联清除", async () => {
      const tag = await request(app).post("/api/tags").send({ value: "关联标签" });
      const create = await request(app).post("/api/teams").send({
        name: "关联团队",
        tagIds: [tag.body.data.id],
      });
      const teamId = create.body.data.id;

      // 确认关联存在
      expect(all("SELECT * FROM team_tags WHERE team_id = ?", [teamId])).toHaveLength(1);

      await request(app).delete(`/api/teams/${teamId}`);

      // 关联清除
      expect(all("SELECT * FROM team_tags WHERE team_id = ?", [teamId])).toHaveLength(0);
    });
  });
});
