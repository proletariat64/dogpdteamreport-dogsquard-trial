import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("Goals API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  describe("L0 Goals", () => {
    it("GET /api/goals/l0 returns empty list", async () => {
      const res = await request(app).get("/api/goals/l0");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("POST /api/goals/l0 creates an L0 goal", async () => {
      const res = await request(app).post("/api/goals/l0").send({
        content: "提升部门整体交付效率",
        standard: "Q3 交付准时率 ≥ 90%",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("提升部门整体交付效率");
      expect(res.body.data.standard).toBe("Q3 交付准时率 ≥ 90%");
      expect(res.body.data.l1GoalIds).toEqual([]);
    });

    it("PUT /api/goals/l0/:id updates L0", async () => {
      const created = await request(app).post("/api/goals/l0").send({ content: "旧目标" });
      const res = await request(app).put(`/api/goals/l0/${created.body.data.id}`).send({ content: "新目标" });
      expect(res.body.data.content).toBe("新目标");
    });

    it("DELETE /api/goals/l0/:id removes L0 and cascade links", async () => {
      const l0 = await request(app).post("/api/goals/l0").send({ content: "待删除" });
      const l1 = await request(app).post("/api/goals/l1").send({
        l1ProductId: (await request(app).post("/api/products/l1").send({ name: "P", code: "G001" })).body.data.id,
        content: "L1目标",
      });
      await request(app).post(`/api/goals/l0/${l0.body.data.id}/l1-goals`).send({ l1GoalIds: [l1.body.data.id] });

      const res = await request(app).delete(`/api/goals/l0/${l0.body.data.id}`);
      expect(res.body.data.deleted).toBe(true);

      // Links should be cascade-deleted
      const links = await request(app).get(`/api/goals/l0/${l0.body.data.id}/l1-goals`);
      expect(res.status).toBe(200);
    });
  });

  describe("L1 Goals", () => {
    let l1Product: { id: string };

    beforeEach(async () => {
      l1Product = (await request(app).post("/api/products/l1").send({
        name: "Test Product", code: `GP${Date.now()}`,
      })).body.data;
    });

    it("GET /api/goals/l1 filters by l1ProductId", async () => {
      const other = (await request(app).post("/api/products/l1").send({ name: "Other", code: `GO${Date.now()}` })).body.data;
      await request(app).post("/api/goals/l1").send({ l1ProductId: l1Product.id, content: "A" });
      await request(app).post("/api/goals/l1").send({ l1ProductId: other.id, content: "B" });

      const res = await request(app).get(`/api/goals/l1?l1ProductId=${l1Product.id}`);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].content).toBe("A");
    });

    it("POST /api/goals/l1 creates with links to L0 and L2", async () => {
      const l0 = await request(app).post("/api/goals/l0").send({ content: "L0" });
      const l2 = (await request(app).post("/api/products/l2").send({
        l1Id: l1Product.id,
        name: "L2P", code: "GL2001",
      })).body.data;
      const l2Goal = await request(app).post("/api/goals/l2").send({ l2ProductId: l2.id, content: "L2G" });

      const res = await request(app).post("/api/goals/l1").send({
        l1ProductId: l1Product.id,
        content: "L1目标",
        l0GoalIds: [l0.body.data.id],
        l2GoalIds: [l2Goal.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.l0GoalIds).toEqual([l0.body.data.id]);
      expect(res.body.data.l2GoalIds).toEqual([l2Goal.body.data.id]);
    });

    it("DELETE /api/goals/l1/:id cascade removes links", async () => {
      const l1Goal = await request(app).post("/api/goals/l1").send({ l1ProductId: l1Product.id, content: "X" });
      await request(app).delete(`/api/goals/l1/${l1Goal.body.data.id}`);
      const res = await request(app).get(`/api/goals/l1/${l1Goal.body.data.id}`);
      expect(res.status).toBe(404);
    });
  });

  describe("L2 Goals", () => {
    it("POST /api/goals/l2 creates L2", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "P", code: `GL3${Date.now()}` });
      const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1.body.data.id, name: "L2P", code: "GL4001" });
      const res = await request(app).post("/api/goals/l2").send({
        l2ProductId: l2.body.data.id,
        content: "L2目标",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("L2目标");
    });
  });

  describe("Goal Linking", () => {
    it("POST /api/goals/l0/:id/l1-goals links goals", async () => {
      const l0 = await request(app).post("/api/goals/l0").send({ content: "L0" });
      const l1 = await request(app).post("/api/goals/l1").send({
        l1ProductId: (await request(app).post("/api/products/l1").send({ name: "P", code: `GL5${Date.now()}` })).body.data.id,
        content: "L1",
      });
      const res = await request(app).post(`/api/goals/l0/${l0.body.data.id}/l1-goals`).send({ l1GoalIds: [l1.body.data.id] });
      expect(res.body.data.linked).toBe(1);
    });

    it("DELETE /api/goals/l0/:id/l1-goals/:l1GoalId unlinks", async () => {
      const l0 = await request(app).post("/api/goals/l0").send({ content: "L0" });
      const l1 = await request(app).post("/api/goals/l1").send({
        l1ProductId: (await request(app).post("/api/products/l1").send({ name: "P", code: `GL6${Date.now()}` })).body.data.id,
        content: "L1",
      });
      await request(app).post(`/api/goals/l0/${l0.body.data.id}/l1-goals`).send({ l1GoalIds: [l1.body.data.id] });
      const res = await request(app).delete(`/api/goals/l0/${l0.body.data.id}/l1-goals/${l1.body.data.id}`);
      expect(res.body.data.unlinked).toBe(true);
    });

    it("POST /api/goals/l1/:id/l2-goals links L1 to L2", async () => {
      const lProd = await request(app).post("/api/products/l1").send({ name: "P", code: `GL7${Date.now()}` });
      const l2Prod = await request(app).post("/api/products/l2").send({ l1Id: lProd.body.data.id, name: "L2P", code: `GL7${Date.now()}2` });
      const l1 = await request(app).post("/api/goals/l1").send({ l1ProductId: lProd.body.data.id, content: "L1" });
      const l2 = await request(app).post("/api/goals/l2").send({ l2ProductId: l2Prod.body.data.id, content: "L2" });
      const res = await request(app).post(`/api/goals/l1/${l1.body.data.id}/l2-goals`).send({ l2GoalIds: [l2.body.data.id] });
      expect(res.body.data.linked).toBe(1);
    });
  });
});
