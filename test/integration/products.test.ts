import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("Products API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  describe("L1 Products", () => {
    it("GET /api/products/l1 returns empty list", async () => {
      const res = await request(app).get("/api/products/l1");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("POST /api/products/l1 creates an L1 product", async () => {
      const res = await request(app).post("/api/products/l1").send({
        name: "集中清算产品",
        code: "FF4010000",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("集中清算产品");
      expect(res.body.data.code).toBe("FF4010000");
      expect(res.body.data.ownerIds).toEqual([]);
      expect(res.body.data.l2Products).toEqual([]);
    });

    it("POST /api/products/l1 creates L1 with team and owners", async () => {
      const team = await request(app).post("/api/teams").send({ name: "外汇" });
      const person = await request(app).post("/api/people").send({ name: "张三" });
      const res = await request(app).post("/api/products/l1").send({
        name: "集中清算产品",
        code: "FF4010001",
        teamId: team.body.data.id,
        ownerIds: [person.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.teamId).toBe(team.body.data.id);
      expect(res.body.data.ownerIds).toEqual([person.body.data.id]);
    });

    it("POST /api/products/l1 rejects duplicate code with 409", async () => {
      await request(app).post("/api/products/l1").send({ name: "P1", code: "DUP001" });
      const res = await request(app).post("/api/products/l1").send({ name: "P2", code: "DUP001" });
      expect(res.status).toBe(409);
    });

    it("GET /api/products/l1/:id returns L1 with embedded L2s", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "L1", code: "L1001" });
      await request(app).post("/api/products/l2").send({
        l1Id: l1.body.data.id,
        name: "L2 Child",
        code: "L2001",
      });
      const res = await request(app).get(`/api/products/l1/${l1.body.data.id}`);
      expect(res.body.data.l2Products).toHaveLength(1);
      expect(res.body.data.l2Products[0].name).toBe("L2 Child");
    });

    it("PUT /api/products/l1/:id updates L1", async () => {
      const created = await request(app).post("/api/products/l1").send({ name: "旧名", code: "OLD001" });
      const res = await request(app).put(`/api/products/l1/${created.body.data.id}`).send({ name: "新名" });
      expect(res.body.data.name).toBe("新名");
    });

    it("DELETE /api/products/l1/:id cascades to L2s", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "L1", code: "CAS001" });
      const l2 = await request(app).post("/api/products/l2").send({
        l1Id: l1.body.data.id,
        name: "L2",
        code: "CAS002",
      });
      await request(app).delete(`/api/products/l1/${l1.body.data.id}`);
      const res = await request(app).get(`/api/products/l2/${l2.body.data.id}`);
      expect(res.status).toBe(404);
    });
  });

  describe("L2 Products", () => {
    it("GET /api/products/l2 filters by l1Id", async () => {
      const l1a = await request(app).post("/api/products/l1").send({ name: "L1A", code: "AAA001" });
      const l1b = await request(app).post("/api/products/l1").send({ name: "L1B", code: "BBB001" });
      await request(app).post("/api/products/l2").send({ l1Id: l1a.body.data.id, name: "A1", code: "A1001" });
      await request(app).post("/api/products/l2").send({ l1Id: l1b.body.data.id, name: "B1", code: "B1001" });

      const res = await request(app).get(`/api/products/l2?l1Id=${l1a.body.data.id}`);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("A1");
    });

    it("PUT /api/products/l2/:id can move to different L1", async () => {
      const l1a = await request(app).post("/api/products/l1").send({ name: "L1-A", code: "MV001" });
      const l1b = await request(app).post("/api/products/l1").send({ name: "L1-B", code: "MV002" });
      const l2 = await request(app).post("/api/products/l2").send({
        l1Id: l1a.body.data.id,
        name: "Movable",
        code: "MV003",
      });

      const res = await request(app).put(`/api/products/l2/${l2.body.data.id}`).send({ l1Id: l1b.body.data.id });
      expect(res.body.data.l1Id).toBe(l1b.body.data.id);
    });

    it("DELETE /api/products/l2/:id removes L2", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "L1", code: "DEL001" });
      const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1.body.data.id, name: "L2", code: "DEL002" });
      const res = await request(app).delete(`/api/products/l2/${l2.body.data.id}`);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
