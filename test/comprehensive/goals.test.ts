import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all, get, run } from "../../src/lib/db.js";

// ================================================================
// L0 Goals
// ================================================================
describe("L0 Goals API - 全量 CRUD 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  // CREATE
  describe("POST /api/goals/l0 - 创建", () => {
    it("正常创建 → 201", async () => {
      const res = await request(app).post("/api/goals/l0").send({ content: "提升系统稳定性" });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("提升系统稳定性");
      expect(res.body.data.standard).toBeNull();
      expect(res.body.data.l1GoalIds).toEqual([]);

      // API-DB 一致性
      const row = get("SELECT * FROM l0_goals WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.content).toBe("提升系统稳定性");
      expect(row.standard).toBeNull();
    });

    it("正常创建（含 standard 和 l1GoalIds）→ 201", async () => {
      // 先创建 L1 product 和 L1 goal
      const l1 = await request(app).post("/api/products/l1").send({ name: "产品1", code: "G1P" });
      const g1 = await request(app).post("/api/goals/l1").send({
        l1ProductId: l1.body.data.id, content: "L1目标内容",
      });

      const res = await request(app).post("/api/goals/l0").send({
        content: "部门目标",
        standard: "完成率>95%",
        l1GoalIds: [g1.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.standard).toBe("完成率>95%");
      expect(res.body.data.l1GoalIds).toContain(g1.body.data.id);

      // DB 关联表
      const links = all("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [res.body.data.id]);
      expect(links).toHaveLength(1);
    });

    it("边界值：content 最大 2000 → 201", async () => {
      const res = await request(app).post("/api/goals/l0").send({ content: "C".repeat(2000) });
      expect(res.status).toBe(201);
      expect(res.body.data.content.length).toBe(2000);
    });

    it("边界值：standard 最大 2000 → 201", async () => {
      const res = await request(app).post("/api/goals/l0").send({
        content: "目标", standard: "S".repeat(2000),
      });
      expect(res.status).toBe(201);
    });

    it("非法：content 缺失 → 400", async () => {
      const res = await request(app).post("/api/goals/l0").send({});
      expect(res.status).toBe(400);
    });

    it("非法：content 空字符串 → 400", async () => {
      const res = await request(app).post("/api/goals/l0").send({ content: "" });
      expect(res.status).toBe(400);
    });

    it("非法：content 超长 2001 → 400", async () => {
      const res = await request(app).post("/api/goals/l0").send({ content: "X".repeat(2001) });
      expect(res.status).toBe(400);
    });

    it("非法：standard 超长 2001 → 400", async () => {
      const res = await request(app).post("/api/goals/l0").send({
        content: "目标", standard: "Y".repeat(2001),
      });
      expect(res.status).toBe(400);
    });

    it("安全：SQL 注入 → 201", async () => {
      const res = await request(app).post("/api/goals/l0").send({ content: "'; DROP TABLE l0_goals; --" });
      expect(res.status).toBe(201);
      const t = get("SELECT name FROM sqlite_master WHERE type='table' AND name='l0_goals'");
      expect(t).toBeDefined();
    });

    it("安全：XSS → 201", async () => {
      const res = await request(app).post("/api/goals/l0").send({ content: "<script>alert(1)</script>" });
      expect(res.status).toBe(201);
      const row = get("SELECT content FROM l0_goals WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.content).toBe("<script>alert(1)</script>");
    });
  });

  // READ
  describe("GET /api/goals/l0 - 列表", () => {
    it("空列表 → 200", async () => {
      const res = await request(app).get("/api/goals/l0");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("有数据 → API-DB 逐字段比对", async () => {
      const g1 = await request(app).post("/api/goals/l0").send({ content: "目标A" });
      const g2 = await request(app).post("/api/goals/l0").send({ content: "目标B", standard: "标准B" });

      const res = await request(app).get("/api/goals/l0");
      expect(res.body.data.length).toBe(2);

      const dbGoals = all("SELECT * FROM l0_goals ORDER BY created_at DESC") as Record<string, unknown>[];
      for (let i = 0; i < dbGoals.length; i++) {
        expect(res.body.data[i].id).toBe(dbGoals[i].id);
        expect(res.body.data[i].content).toBe(dbGoals[i].content);
        expect(res.body.data[i].standard).toBe(dbGoals[i].standard);
      }
    });
  });

  describe("GET /api/goals/l0/:id - 详情", () => {
    it("正常获取（含 l1Goals）→ 200", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "P", code: "PL0" });
      const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId: l1.body.data.id, content: "子目标" });

      const create = await request(app).post("/api/goals/l0").send({
        content: "父目标", l1GoalIds: [g1.body.data.id],
      });

      const res = await request(app).get(`/api/goals/l0/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.l1Goals).toHaveLength(1);
      expect(res.body.data.l1Goals[0].content).toBe("子目标");
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/goals/l0/g0-fake");
      expect(res.status).toBe(404);
    });
  });

  // UPDATE
  describe("PUT /api/goals/l0/:id - 更新", () => {
    it("正常更新 content → 200", async () => {
      const create = await request(app).post("/api/goals/l0").send({ content: "旧目标" });
      const res = await request(app).put(`/api/goals/l0/${create.body.data.id}`).send({ content: "新目标" });
      expect(res.body.data.content).toBe("新目标");

      const row = get("SELECT content FROM l0_goals WHERE id = ?", [create.body.data.id]) as Record<string, unknown>;
      expect(row.content).toBe("新目标");
    });

    it("正常更新 l1GoalIds → 200", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "P2", code: "UP2" });
      const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId: l1.body.data.id, content: "关联目标" });
      const create = await request(app).post("/api/goals/l0").send({ content: "待关联" });

      const res = await request(app).put(`/api/goals/l0/${create.body.data.id}`).send({ l1GoalIds: [g1.body.data.id] });
      expect(res.body.data.l1GoalIds).toContain(g1.body.data.id);

      const links = all("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [create.body.data.id]);
      expect(links).toHaveLength(1);
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/goals/l0/g0-nope").send({ content: "X" });
      expect(res.status).toBe(404);
    });

    it("空 body → 200", async () => {
      const create = await request(app).post("/api/goals/l0").send({ content: "不变" });
      const res = await request(app).put(`/api/goals/l0/${create.body.data.id}`).send({});
      expect(res.status).toBe(200);
    });
  });

  // DELETE
  describe("DELETE /api/goals/l0/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/goals/l0").send({ content: "删L0" });
      const res = await request(app).delete(`/api/goals/l0/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const row = get("SELECT * FROM l0_goals WHERE id = ?", [create.body.data.id]);
      expect(row).toBeUndefined();
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/goals/l0/g0-ghost");
      expect(res.status).toBe(404);
    });

    it("重复删除 → 404", async () => {
      const create = await request(app).post("/api/goals/l0").send({ content: "再删" });
      await request(app).delete(`/api/goals/l0/${create.body.data.id}`);
      const res = await request(app).delete(`/api/goals/l0/${create.body.data.id}`);
      expect(res.status).toBe(404);
    });

    it("级联：删除 L0 goal 后 l0_goal_l1_goals 关联清除", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "CP", code: "CP3" });
      const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId: l1.body.data.id, content: "子" });
      const create = await request(app).post("/api/goals/l0").send({ content: "父", l1GoalIds: [g1.body.data.id] });

      await request(app).delete(`/api/goals/l0/${create.body.data.id}`);

      const links = all("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [create.body.data.id]);
      expect(links).toHaveLength(0);

      // L1 goal 还在
      const still = get("SELECT * FROM l1_goals WHERE id = ?", [g1.body.data.id]);
      expect(still).toBeDefined();
    });
  });
});

// ================================================================
// L1 Goals
// ================================================================
describe("L1 Goals API - 全量 CRUD 测试", () => {
  let app: Express;
  let l1ProductId: string;

  beforeEach(async () => {
    app = (await createTestApp()).app;
    const l1 = await request(app).post("/api/products/l1").send({ name: "L1目标产品", code: "L1GL" });
    l1ProductId = l1.body.data.id;
  });

  // CREATE
  describe("POST /api/goals/l1 - 创建", () => {
    it("正常创建 → 201", async () => {
      const res = await request(app).post("/api/goals/l1").send({
        l1ProductId, content: "L1目标内容",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("L1目标内容");
      expect(res.body.data.l1ProductId).toBe(l1ProductId);

      const row = get("SELECT * FROM l1_goals WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.content).toBe("L1目标内容");
      expect(row.l1_product_id).toBe(l1ProductId);
    });

    it("正常创建（含 l0GoalIds 和 l2GoalIds）→ 201", async () => {
      const g0 = await request(app).post("/api/goals/l0").send({ content: "L0目标" });
      const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1ProductId, name: "L2品", code: "L2G" });
      const g2 = await request(app).post("/api/goals/l2").send({ l2ProductId: l2.body.data.id, content: "L2目标" });

      const res = await request(app).post("/api/goals/l1").send({
        l1ProductId, content: "中间目标", l0GoalIds: [g0.body.data.id], l2GoalIds: [g2.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.l0GoalIds).toContain(g0.body.data.id);
      expect(res.body.data.l2GoalIds).toContain(g2.body.data.id);

      // DB 双向关联验证
      expect(all("SELECT * FROM l0_goal_l1_goals WHERE l1_goal_id = ?", [res.body.data.id])).toHaveLength(1);
      expect(all("SELECT * FROM l1_goal_l2_goals WHERE l1_goal_id = ?", [res.body.data.id])).toHaveLength(1);
    });

    it("非法：l1ProductId 缺失 → 400", async () => {
      const res = await request(app).post("/api/goals/l1").send({ content: "无产品" });
      expect(res.status).toBe(400);
    });

    it("非法：l1ProductId 引用不存在的产品 → 404", async () => {
      const res = await request(app).post("/api/goals/l1").send({ l1ProductId: "l1-fake", content: "幽灵目标" });
      expect(res.status).toBe(404);
    });

    it("非法：content 缺失 → 400", async () => {
      const res = await request(app).post("/api/goals/l1").send({ l1ProductId });
      expect(res.status).toBe(400);
    });

    it("边界值：content 最大 2000 → 201", async () => {
      const res = await request(app).post("/api/goals/l1").send({ l1ProductId, content: "X".repeat(2000) });
      expect(res.status).toBe(201);
    });
  });

  // READ
  describe("GET /api/goals/l1 - 列表", () => {
    it("按 l1ProductId 过滤 → 200", async () => {
      const l1b = await request(app).post("/api/products/l1").send({ name: "产品B", code: "L1B" });
      await request(app).post("/api/goals/l1").send({ l1ProductId, content: "A的目标" });
      await request(app).post("/api/goals/l1").send({ l1ProductId: l1b.body.data.id, content: "B的目标" });

      const res = await request(app).get(`/api/goals/l1?l1ProductId=${l1ProductId}`);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].content).toBe("A的目标");
    });

    it("API-DB 逐字段比对 → 200", async () => {
      await request(app).post("/api/goals/l1").send({ l1ProductId, content: "G1", standard: "S1" });
      const res = await request(app).get("/api/goals/l1");
      const dbGoals = all("SELECT * FROM l1_goals ORDER BY created_at DESC") as Record<string, unknown>[];
      for (let i = 0; i < dbGoals.length; i++) {
        expect(res.body.data[i].id).toBe(dbGoals[i].id);
        expect(res.body.data[i].content).toBe(dbGoals[i].content);
        expect(res.body.data[i].standard).toBe(dbGoals[i].standard);
      }
    });
  });

  describe("GET /api/goals/l1/:id - 详情", () => {
    it("含 l2Goals → 200", async () => {
      const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1ProductId, name: "子L2", code: "SL2" });
      const g2 = await request(app).post("/api/goals/l2").send({ l2ProductId: l2.body.data.id, content: "L2G" });

      const create = await request(app).post("/api/goals/l1").send({
        l1ProductId, content: "含子目标", l2GoalIds: [g2.body.data.id],
      });

      const res = await request(app).get(`/api/goals/l1/${create.body.data.id}`);
      expect(res.body.data.l2Goals).toHaveLength(1);
      expect(res.body.data.l2Goals[0].content).toBe("L2G");
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/goals/l1/g1-ghost");
      expect(res.status).toBe(404);
    });
  });

  // UPDATE
  describe("PUT /api/goals/l1/:id - 更新", () => {
    it("正常更新 → 200", async () => {
      const create = await request(app).post("/api/goals/l1").send({ l1ProductId, content: "旧" });
      const res = await request(app).put(`/api/goals/l1/${create.body.data.id}`).send({ content: "新", standard: "达标" });
      expect(res.body.data.content).toBe("新");
      expect(res.body.data.standard).toBe("达标");
    });

    it("更新 l1ProductId → 200", async () => {
      const l1b = await request(app).post("/api/products/l1").send({ name: "迁移目标", code: "MOV" });
      const create = await request(app).post("/api/goals/l1").send({ l1ProductId, content: "迁移" });
      const res = await request(app).put(`/api/goals/l1/${create.body.data.id}`).send({ l1ProductId: l1b.body.data.id });
      expect(res.body.data.l1ProductId).toBe(l1b.body.data.id);
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/goals/l1/g1-nope").send({ content: "X" });
      expect(res.status).toBe(404);
    });
  });

  // DELETE
  describe("DELETE /api/goals/l1/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/goals/l1").send({ l1ProductId, content: "删" });
      const res = await request(app).delete(`/api/goals/l1/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it("级联：删除 L1 goal 后 l0_goal_l1_goals 和 l1_goal_l2_goals 清除", async () => {
      const g0 = await request(app).post("/api/goals/l0").send({ content: "L0" });
      const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1ProductId, name: "L2p", code: "L2PC" });
      const g2 = await request(app).post("/api/goals/l2").send({ l2ProductId: l2.body.data.id, content: "L2G" });

      const create = await request(app).post("/api/goals/l1").send({
        l1ProductId, content: "关联目标", l0GoalIds: [g0.body.data.id], l2GoalIds: [g2.body.data.id],
      });
      const g1Id = create.body.data.id;

      await request(app).delete(`/api/goals/l1/${g1Id}`);

      expect(all("SELECT * FROM l0_goal_l1_goals WHERE l1_goal_id = ?", [g1Id])).toHaveLength(0);
      expect(all("SELECT * FROM l1_goal_l2_goals WHERE l1_goal_id = ?", [g1Id])).toHaveLength(0);

      // L0 和 L2 goal 还在
      expect(get("SELECT * FROM l0_goals WHERE id = ?", [g0.body.data.id])).toBeDefined();
      expect(get("SELECT * FROM l2_goals WHERE id = ?", [g2.body.data.id])).toBeDefined();
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/goals/l1/g1-none");
      expect(res.status).toBe(404);
    });
  });
});

// ================================================================
// L2 Goals
// ================================================================
describe("L2 Goals API - 全量 CRUD 测试", () => {
  let app: Express;
  let l2ProductId: string;

  beforeEach(async () => {
    app = (await createTestApp()).app;
    const l1 = await request(app).post("/api/products/l1").send({ name: "L2Goal-L1", code: "L2GL1" });
    const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1.body.data.id, name: "L2Goal-L2", code: "L2GL2" });
    l2ProductId = l2.body.data.id;
  });

  // CREATE
  describe("POST /api/goals/l2 - 创建", () => {
    it("正常创建 → 201", async () => {
      const res = await request(app).post("/api/goals/l2").send({
        l2ProductId, content: "L2目标",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("L2目标");

      // API-DB
      const row = get("SELECT * FROM l2_goals WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.l2_product_id).toBe(l2ProductId);
    });

    it("正常创建（含 l1GoalIds）→ 201", async () => {
      const l1P = get("SELECT l1_id FROM l2_products WHERE id = ?", [l2ProductId]) as Record<string, unknown>;
      const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId: l1P.l1_id, content: "L1G" });

      const res = await request(app).post("/api/goals/l2").send({
        l2ProductId, content: "关联L1的L2", l1GoalIds: [g1.body.data.id],
      });
      expect(res.body.data.l1GoalIds).toContain(g1.body.data.id);

      const links = all("SELECT * FROM l1_goal_l2_goals WHERE l2_goal_id = ?", [res.body.data.id]);
      expect(links).toHaveLength(1);
    });

    it("非法：l2ProductId 缺失 → 400", async () => {
      const res = await request(app).post("/api/goals/l2").send({ content: "无产品" });
      expect(res.status).toBe(400);
    });

    it("非法：l2ProductId 引用不存在的 L2 → 404", async () => {
      const res = await request(app).post("/api/goals/l2").send({ l2ProductId: "l2-fake", content: "幽灵" });
      expect(res.status).toBe(404);
    });

    it("非法：content 缺失 → 400", async () => {
      const res = await request(app).post("/api/goals/l2").send({ l2ProductId });
      expect(res.status).toBe(400);
    });

    it("边界值：content 最大 2000 → 201", async () => {
      const res = await request(app).post("/api/goals/l2").send({ l2ProductId, content: "C".repeat(2000) });
      expect(res.status).toBe(201);
    });

    it("非法：content 超长 2001 → 400", async () => {
      const res = await request(app).post("/api/goals/l2").send({ l2ProductId, content: "X".repeat(2001) });
      expect(res.status).toBe(400);
    });
  });

  // READ
  describe("GET /api/goals/l2 - 列表", () => {
    it("按 l2ProductId 过滤 → 200", async () => {
      const res = await request(app).get(`/api/goals/l2?l2ProductId=${l2ProductId}`);
      expect(res.status).toBe(200);
    });

    it("API-DB 逐字段比对 → 200", async () => {
      await request(app).post("/api/goals/l2").send({ l2ProductId, content: "G2-A", standard: "标准A" });
      const res = await request(app).get("/api/goals/l2");
      const dbGoals = all("SELECT * FROM l2_goals ORDER BY created_at DESC") as Record<string, unknown>[];
      for (let i = 0; i < dbGoals.length; i++) {
        expect(res.body.data[i].id).toBe(dbGoals[i].id);
        expect(res.body.data[i].content).toBe(dbGoals[i].content);
      }
    });
  });

  describe("GET /api/goals/l2/:id - 详情", () => {
    it("正常获取 → 200", async () => {
      const create = await request(app).post("/api/goals/l2").send({ l2ProductId, content: "详情L2G" });
      const res = await request(app).get(`/api/goals/l2/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe("详情L2G");
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/goals/l2/g2-nope");
      expect(res.status).toBe(404);
    });
  });

  // UPDATE
  describe("PUT /api/goals/l2/:id - 更新", () => {
    it("正常更新 → 200", async () => {
      const create = await request(app).post("/api/goals/l2").send({ l2ProductId, content: "旧L2" });
      const res = await request(app).put(`/api/goals/l2/${create.body.data.id}`).send({ content: "新L2", standard: "新标准" });
      expect(res.body.data.content).toBe("新L2");
      expect(res.body.data.standard).toBe("新标准");
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/goals/l2/g2-void").send({ content: "X" });
      expect(res.status).toBe(404);
    });
  });

  // DELETE
  describe("DELETE /api/goals/l2/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/goals/l2").send({ l2ProductId, content: "删L2" });
      const res = await request(app).delete(`/api/goals/l2/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it("级联：删除 L2 goal 后 l1_goal_l2_goals 清除", async () => {
      const l1P = get("SELECT l1_id FROM l2_products WHERE id = ?", [l2ProductId]) as Record<string, unknown>;
      const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId: l1P.l1_id, content: "父L1G" });
      const create = await request(app).post("/api/goals/l2").send({
        l2ProductId, content: "子L2G", l1GoalIds: [g1.body.data.id],
      });

      await request(app).delete(`/api/goals/l2/${create.body.data.id}`);

      expect(all("SELECT * FROM l1_goal_l2_goals WHERE l2_goal_id = ?", [create.body.data.id])).toHaveLength(0);
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/goals/l2/g2-ghost");
      expect(res.status).toBe(404);
    });
  });
});
