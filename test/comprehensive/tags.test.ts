import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Database as SqlJsDatabase } from "sql.js";
import { createTestApp } from "../setup.js";
import { all, get } from "../../src/lib/db.js";

describe("Tags API - 全量 CRUD 测试", () => {
  let app: Express;
  let db: SqlJsDatabase;

  beforeEach(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    db = ctx.db;
  });

  // ================================================================
  // CREATE
  // ================================================================

  describe("POST /api/tags - 创建", () => {
    it("正常创建标签 → 201", async () => {
      const res = await request(app).post("/api/tags").send({ value: "前端" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.value).toBe("前端");
      expect(res.body.data.id).toMatch(/^tag-/);

      // API-DB 一致性：逐字段比对
      const row = get("SELECT * FROM tags WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.value).toBe("前端");
      expect(row.id).toBe(res.body.data.id);
      expect(row.created_at).toBe(res.body.data.created_at);
      expect(row.updated_at).toBe(res.body.data.updated_at);
    });

    it("边界值：value 最小长度 1", async () => {
      const res = await request(app).post("/api/tags").send({ value: "A" });
      expect(res.status).toBe(201);
      expect(res.body.data.value).toBe("A");

      const row = get("SELECT * FROM tags WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.value).toBe("A");
    });

    it("边界值：value 最大长度 50", async () => {
      const v = "A".repeat(50);
      const res = await request(app).post("/api/tags").send({ value: v });
      expect(res.status).toBe(201);
      expect(res.body.data.value).toBe(v);
      expect(res.body.data.value.length).toBe(50);

      const row = get("SELECT * FROM tags WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.value).toBe(v);
    });

    it("非法：value 超长 51 → 400", async () => {
      const res = await request(app).post("/api/tags").send({ value: "A".repeat(51) });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("非法：value 缺失 → 400", async () => {
      const res = await request(app).post("/api/tags").send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("非法：value 空字符串 → 400", async () => {
      const res = await request(app).post("/api/tags").send({ value: "" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("非法：value 为数字类型 → 400 (Zod 校验)", async () => {
      const res = await request(app).post("/api/tags").send({ value: 123 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("非法：value 为 null → 400", async () => {
      const res = await request(app).post("/api/tags").send({ value: null });
      expect(res.status).toBe(400);
    });

    it("唯一约束：重复 value → 409", async () => {
      await request(app).post("/api/tags").send({ value: "重复标签" });
      const res = await request(app).post("/api/tags").send({ value: "重复标签" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("UNIQUE_VIOLATION");

      // DB 中只有一条
      const rows = all("SELECT * FROM tags WHERE value = ?", ["重复标签"]);
      expect(rows.length).toBe(1);
    });

    it("安全：SQL 注入尝试 - 被当作普通字符串存储", async () => {
      const sqlPayload = "'; DROP TABLE tags; --";
      const res = await request(app).post("/api/tags").send({ value: sqlPayload });
      expect(res.status).toBe(201);

      // DB 验证：标签表仍然存在
      const row = get("SELECT * FROM tags WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.value).toBe(sqlPayload);

      // 验证表结构完好
      const tableCheck = all("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'");
      expect(tableCheck.length).toBe(1);
    });

    it("安全：XSS 尝试 - 被当作普通字符串存储", async () => {
      const xssPayload = "<script>alert('xss')</script>";
      const res = await request(app).post("/api/tags").send({ value: xssPayload });
      expect(res.status).toBe(201);

      const row = get("SELECT * FROM tags WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.value).toBe(xssPayload);
    });

    it("多余字段被忽略（Zod strip 默认行为）", async () => {
      const res = await request(app).post("/api/tags").send({ value: "正常", extra: "多余" });
      expect(res.status).toBe(201);
      expect(res.body.data.value).toBe("正常");
      // 确认 extra 没有造成异常
    });
  });

  // ================================================================
  // READ
  // ================================================================

  describe("GET /api/tags - 列表查询", () => {
    it("空列表 → 200", async () => {
      const res = await request(app).get("/api/tags");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);

      // DB 一致性
      const dbCount = all("SELECT COUNT(*) as cnt FROM tags")[0] as { cnt: number };
      expect(res.body.data.length).toBe(dbCount.cnt);
    });

    it("有数据列表 → 200", async () => {
      await request(app).post("/api/tags").send({ value: "标签A" });
      await request(app).post("/api/tags").send({ value: "标签B" });

      const res = await request(app).get("/api/tags");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);

      // DB 一致性：数量
      const dbCount = all("SELECT COUNT(*) as cnt FROM tags")[0] as { cnt: number };
      expect(res.body.data.length).toBe(dbCount.cnt);

      // DB 一致性：逐字段比对第一条
      const dbTags = all("SELECT * FROM tags ORDER BY created_at DESC") as Record<string, unknown>[];
      for (let i = 0; i < res.body.data.length; i++) {
        expect(res.body.data[i].id).toBe(dbTags[i].id);
        expect(res.body.data[i].value).toBe(dbTags[i].value);
        expect(res.body.data[i].created_at).toBe(dbTags[i].created_at);
        expect(res.body.data[i].updated_at).toBe(dbTags[i].updated_at);
      }
    });

    it("按创建时间倒序排列（同秒创建按 id 不定序，仅验证数量和字段完整性）", async () => {
      await request(app).post("/api/tags").send({ value: "第一个" });
      await new Promise((r) => setTimeout(r, 1100)); // SQLite CURRENT_TIMESTAMP 秒级精度
      await request(app).post("/api/tags").send({ value: "第二个" });

      const res = await request(app).get("/api/tags");
      expect(res.body.data.length).toBe(2);
      // 第二个后创建，应该排在前面
      expect(res.body.data[0].value).toBe("第二个");
      expect(res.body.data[1].value).toBe("第一个");
    });
  });

  // ================================================================
  // DELETE
  // ================================================================

  describe("DELETE /api/tags/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/tags").send({ value: "待删除" });
      const tagId = create.body.data.id;

      const res = await request(app).delete(`/api/tags/${tagId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      // DB 一致性：确认已删除
      const row = get("SELECT * FROM tags WHERE id = ?", [tagId]);
      expect(row).toBeUndefined();
    });

    it("删除不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/tags/tag-nonexistent");
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("重复删除 → 404", async () => {
      const create = await request(app).post("/api/tags").send({ value: "删一次" });
      const tagId = create.body.data.id;

      await request(app).delete(`/api/tags/${tagId}`);
      const res = await request(app).delete(`/api/tags/${tagId}`);
      expect(res.status).toBe(404);
    });

    it("级联删除：tag 被删除后 team_tags 关联自动清除", async () => {
      // 创建 tag 和 team 并关联
      const tag = await request(app).post("/api/tags").send({ value: "级联标签" });
      const tagId = tag.body.data.id;

      // 直接用 DB 创建 team 和关联
      const { run } = await import("../../src/lib/db.js");
      run("INSERT INTO teams (id, name) VALUES (?, ?)", ["team-cascade", "级联团队"]);
      run("INSERT INTO team_tags (team_id, tag_id) VALUES (?, ?)", ["team-cascade", tagId]);

      // 确认关联存在
      let link = get("SELECT * FROM team_tags WHERE team_id = ? AND tag_id = ?", ["team-cascade", tagId]);
      expect(link).toBeDefined();

      // 删除 tag
      await request(app).delete(`/api/tags/${tagId}`);

      // DB 验证：关联被级联删除
      link = get("SELECT * FROM team_tags WHERE team_id = ? AND tag_id = ?", ["team-cascade", tagId]);
      expect(link).toBeUndefined();

      // 但 team 还在
      const team = get("SELECT * FROM teams WHERE id = ?", ["team-cascade"]);
      expect(team).toBeDefined();
    });
  });
});
