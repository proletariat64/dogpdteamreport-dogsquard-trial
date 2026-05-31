import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all, get } from "../../src/lib/db.js";

describe("Goal Linking API - 全量测试", () => {
  let app: Express;

  // 辅助：创建测试前置数据
  async function setupLinking() {
    const l1P = await request(app).post("/api/products/l1").send({ name: "关联产品", code: "LINKP" });
    const l1ProductId = l1P.body.data.id;

    const l2P = await request(app).post("/api/products/l2").send({ l1Id: l1ProductId, name: "关联L2", code: "LINKL2" });
    const l2ProductId = l2P.body.data.id;

    const g0 = await request(app).post("/api/goals/l0").send({ content: "L0目标" });
    const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId, content: "L1目标" });
    const g2 = await request(app).post("/api/goals/l2").send({ l2ProductId, content: "L2目标" });

    return {
      g0Id: g0.body.data.id,
      g1Id: g1.body.data.id,
      g2Id: g2.body.data.id,
    };
  }

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  // ================================================================
  // L0 ↔ L1 Linking
  // ================================================================

  describe("L0-L1 Goal Linking", () => {
    it("GET /api/goals/l0/:id/l1-goals - 空列表 → 200", async () => {
      const g0 = await request(app).post("/api/goals/l0").send({ content: "独立L0" });
      const res = await request(app).get(`/api/goals/l0/${g0.body.data.id}/l1-goals`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("GET /api/goals/l0/:id/l1-goals - 有数据 → 200", async () => {
      const { g0Id, g1Id } = await setupLinking();

      // 先建立关联
      await request(app).post(`/api/goals/l0/${g0Id}/l1-goals`).send({ l1GoalIds: [g1Id] });

      const res = await request(app).get(`/api/goals/l0/${g0Id}/l1-goals`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(g1Id);

      // DB 一致性
      const dbLinks = all("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [g0Id]);
      expect(dbLinks.length).toBe(res.body.data.length);
    });

    it("GET 不存在的 L0 → 404", async () => {
      const res = await request(app).get("/api/goals/l0/g0-void/l1-goals");
      expect(res.status).toBe(404);
    });

    it("POST /api/goals/l0/:id/l1-goals - 正常关联 → 200", async () => {
      const { g0Id, g1Id } = await setupLinking();

      const res = await request(app).post(`/api/goals/l0/${g0Id}/l1-goals`).send({ l1GoalIds: [g1Id] });
      expect(res.status).toBe(200);
      expect(res.body.data.linked).toBe(1);

      // DB 验证
      const link = get("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ? AND l1_goal_id = ?", [g0Id, g1Id]);
      expect(link).toBeDefined();
    });

    it("POST 关联多个 L1 → 200", async () => {
      const l1P = await request(app).post("/api/products/l1").send({ name: "多关联", code: "MULTI" });
      const g0 = await request(app).post("/api/goals/l0").send({ content: "多关联L0" });
      const g1a = await request(app).post("/api/goals/l1").send({ l1ProductId: l1P.body.data.id, content: "A" });
      const g1b = await request(app).post("/api/goals/l1").send({ l1ProductId: l1P.body.data.id, content: "B" });

      const res = await request(app).post(`/api/goals/l0/${g0.body.data.id}/l1-goals`).send({
        l1GoalIds: [g1a.body.data.id, g1b.body.data.id],
      });
      expect(res.body.data.linked).toBe(2);

      const dbLinks = all("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ?", [g0.body.data.id]);
      expect(dbLinks).toHaveLength(2);
    });

    it("POST 重复关联（幂等，INSERT OR IGNORE）→ 200", async () => {
      const { g0Id, g1Id } = await setupLinking();
      await request(app).post(`/api/goals/l0/${g0Id}/l1-goals`).send({ l1GoalIds: [g1Id] });

      const res = await request(app).post(`/api/goals/l0/${g0Id}/l1-goals`).send({ l1GoalIds: [g1Id] });
      expect(res.status).toBe(200);
      // linked 返回 1 因为循环计数（即使 INSERT OR IGNORE 跳过也计数）
      // DB 只有一条
      const dbLinks = all("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ? AND l1_goal_id = ?", [g0Id, g1Id]);
      expect(dbLinks).toHaveLength(1);
    });

    it("POST 空 l1GoalIds → 400", async () => {
      const g0 = await request(app).post("/api/goals/l0").send({ content: "空关联" });
      const res = await request(app).post(`/api/goals/l0/${g0.body.data.id}/l1-goals`).send({ l1GoalIds: [] });
      expect(res.status).toBe(400);
    });

    it("POST 不存在的 L0 → 404", async () => {
      const { g1Id } = await setupLinking();
      const res = await request(app).post("/api/goals/l0/g0-fake-id/l1-goals").send({ l1GoalIds: [g1Id] });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/goals/l0/:id/l1-goals/:l1GoalId - 正常解除 → 200", async () => {
      const { g0Id, g1Id } = await setupLinking();
      await request(app).post(`/api/goals/l0/${g0Id}/l1-goals`).send({ l1GoalIds: [g1Id] });

      const res = await request(app).delete(`/api/goals/l0/${g0Id}/l1-goals/${g1Id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.unlinked).toBe(true);

      // DB 验证
      const link = get("SELECT * FROM l0_goal_l1_goals WHERE l0_goal_id = ? AND l1_goal_id = ?", [g0Id, g1Id]);
      expect(link).toBeUndefined();
    });

    it("DELETE 解除不存在的关联 → 200（no-op）", async () => {
      const { g0Id, g1Id } = await setupLinking();
      const res = await request(app).delete(`/api/goals/l0/${g0Id}/l1-goals/${g1Id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.unlinked).toBe(true);
    });
  });

  // ================================================================
  // L1 ↔ L2 Linking
  // ================================================================

  describe("L1-L2 Goal Linking", () => {
    it("GET /api/goals/l1/:id/l2-goals - 空列表 → 200", async () => {
      const l1P = await request(app).post("/api/products/l1").send({ name: "空L1", code: "EML1" });
      const g1 = await request(app).post("/api/goals/l1").send({ l1ProductId: l1P.body.data.id, content: "空L1G" });
      const res = await request(app).get(`/api/goals/l1/${g1.body.data.id}/l2-goals`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("GET 有数据 → 200 + DB 一致性", async () => {
      const { g1Id, g2Id } = await setupLinking();
      await request(app).post(`/api/goals/l1/${g1Id}/l2-goals`).send({ l2GoalIds: [g2Id] });

      const res = await request(app).get(`/api/goals/l1/${g1Id}/l2-goals`);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(g2Id);

      const dbLinks = all("SELECT * FROM l1_goal_l2_goals WHERE l1_goal_id = ?", [g1Id]);
      expect(dbLinks.length).toBe(res.body.data.length);
    });

    it("GET 不存在的 L1 → 404", async () => {
      const res = await request(app).get("/api/goals/l1/g1-void/l2-goals");
      expect(res.status).toBe(404);
    });

    it("POST 正常关联 → 200", async () => {
      const { g1Id, g2Id } = await setupLinking();

      const res = await request(app).post(`/api/goals/l1/${g1Id}/l2-goals`).send({ l2GoalIds: [g2Id] });
      expect(res.status).toBe(200);
      expect(res.body.data.linked).toBe(1);

      const link = get("SELECT * FROM l1_goal_l2_goals WHERE l1_goal_id = ? AND l2_goal_id = ?", [g1Id, g2Id]);
      expect(link).toBeDefined();
    });

    it("POST 空 l2GoalIds → 400", async () => {
      const { g1Id } = await setupLinking();
      const res = await request(app).post(`/api/goals/l1/${g1Id}/l2-goals`).send({ l2GoalIds: [] });
      expect(res.status).toBe(400);
    });

    it("DELETE 正常解除 → 200", async () => {
      const { g1Id, g2Id } = await setupLinking();
      await request(app).post(`/api/goals/l1/${g1Id}/l2-goals`).send({ l2GoalIds: [g2Id] });

      const res = await request(app).delete(`/api/goals/l1/${g1Id}/l2-goals/${g2Id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.unlinked).toBe(true);

      const link = get("SELECT * FROM l1_goal_l2_goals WHERE l1_goal_id = ? AND l2_goal_id = ?", [g1Id, g2Id]);
      expect(link).toBeUndefined();
    });

    it("DELETE 解除不存在的关联 → 200（no-op）", async () => {
      const { g1Id, g2Id } = await setupLinking();
      const res = await request(app).delete(`/api/goals/l1/${g1Id}/l2-goals/${g2Id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.unlinked).toBe(true);
    });
  });
});
