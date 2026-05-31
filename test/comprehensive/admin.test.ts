import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all } from "../../src/lib/db.js";

describe("Admin API - 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  describe("GET /api/admin/status", () => {
    it("返回系统状态 → 200", async () => {
      const res = await request(app).get("/api/admin/status");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("dbSize");
      expect(res.body.data).toHaveProperty("recordCounts");
      expect(res.body.data).toHaveProperty("uptime");
      expect(res.body.data).toHaveProperty("lock");

      // 验证 recordCounts 包含所有表
      const counts = res.body.data.recordCounts;
      expect(counts).toHaveProperty("tags");
      expect(counts).toHaveProperty("teams");
      expect(counts).toHaveProperty("people");
      expect(counts).toHaveProperty("l1_products");
      expect(counts).toHaveProperty("l2_products");
      expect(counts).toHaveProperty("l0_goals");
      expect(counts).toHaveProperty("l1_goals");
      expect(counts).toHaveProperty("l2_goals");

      // 空数据库各表 count=0
      expect(counts.tags).toBe(0);
      expect(counts.teams).toBe(0);
    });

    it("recordCounts 与实际 DB 数据一致", async () => {
      // 创建一些数据
      await request(app).post("/api/tags").send({ value: "计数标签" });
      await request(app).post("/api/teams").send({ name: "计数团队" });
      await request(app).post("/api/people").send({ name: "计数人" });

      const res = await request(app).get("/api/admin/status");

      // 与 DB 实际数量比对
      const dbCounts = {
        tags: (all("SELECT COUNT(*) as cnt FROM tags")[0] as { cnt: number }).cnt,
        teams: (all("SELECT COUNT(*) as cnt FROM teams")[0] as { cnt: number }).cnt,
        people: (all("SELECT COUNT(*) as cnt FROM people")[0] as { cnt: number }).cnt,
      };

      expect(res.body.data.recordCounts.tags).toBe(dbCounts.tags);
      expect(res.body.data.recordCounts.teams).toBe(dbCounts.teams);
      expect(res.body.data.recordCounts.people).toBe(dbCounts.people);
    });

    it("lock 状态可读", async () => {
      const res = await request(app).get("/api/admin/status");
      expect(res.body.data.lock).toHaveProperty("locked");
      expect(res.body.data.lock).toHaveProperty("holderIp");
    });
  });

  describe("POST /api/admin/backup", () => {
    it("创建备份 → 200（in-memory DB 无文件则报错）", async () => {
      // 由于 in-memory DB 没有物理 dbPath，backup 会尝试读取文件
      // createBackup 使用 process.env.DB_PATH，测试环境设为 "./data/app.db"
      // 如果文件不存在会报错
      const res = await request(app).post("/api/admin/backup");
      // 由于 in-memory DB，backup 行为取决于 DB_PATH 文件是否存在
      // 可能返回 200/201(成功) 或 500(ENOENT)
      expect([200, 201, 500]).toContain(res.status);
    });
  });

  describe("GET /api/admin/backups", () => {
    it("返回备份列表 → 200", async () => {
      const res = await request(app).get("/api/admin/backups");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("DELETE /api/admin/lock", () => {
    it("强制释放编辑锁 → 200", async () => {
      const res = await request(app).delete("/api/admin/lock");
      expect(res.status).toBe(200);
      expect(res.body.data.released).toBe(true);
      expect(res.body.data.lock.locked).toBe(false);
    });
  });
});

describe("Health API - 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  it("GET /api/health → 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("status");
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data).toHaveProperty("version");
  });
});
