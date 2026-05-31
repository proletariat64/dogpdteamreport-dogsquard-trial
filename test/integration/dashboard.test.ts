import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("Dashboard API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  it("GET /api/dashboard returns empty array with no data", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("GET /api/dashboard returns tree with L1 products", async () => {
    const team = await request(app).post("/api/teams").send({ name: "外汇" });
    await request(app).post("/api/products/l1").send({
      name: "集中清算产品", code: "FF4010000", teamId: team.body.data.id,
    });

    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].l1Product.name).toBe("集中清算产品");
    expect(res.body.data[0].l1Product.team).toBeDefined();
    expect(res.body.data[0].l1Product.team.name).toBe("外汇");
  });

  it("GET /api/dashboard filters by teamId", async () => {
    const teamA = await request(app).post("/api/teams").send({ name: "A" });
    const teamB = await request(app).post("/api/teams").send({ name: "B" });
    await request(app).post("/api/products/l1").send({ name: "P1", code: "AAA001", teamId: teamA.body.data.id });
    await request(app).post("/api/products/l1").send({ name: "P2", code: "BBB001", teamId: teamB.body.data.id });

    const res = await request(app).get(`/api/dashboard?teamId=${teamA.body.data.id}`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].l1Product.name).toBe("P1");
  });

  it("GET /api/dashboard includes metrics and coverage", async () => {
    await request(app).post("/api/products/l1").send({ name: "P1", code: "COV001" });
    const res = await request(app).get("/api/dashboard");
    expect(res.body.data[0].metrics).toBeDefined();
    expect(res.body.data[0].metrics.l2Count).toBe(0);
    expect(res.body.data[0].metrics.peopleCount).toBe(0);
    expect(res.body.data[0].metrics.coveragePercent).toBe(0);
  });

  it("GET /api/dashboard computes coverage correctly", async () => {
    const l1 = await request(app).post("/api/products/l1").send({ name: "P1", code: "COV002" });
    const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1.body.data.id, name: "L2", code: "COV003" });

    // Create person, assign as L1 owner + L2 participant
    const person = await request(app).post("/api/people").send({
      name: "张三",
      l1ProductIds: [l1.body.data.id],
      l2ProductIds: [l2.body.data.id],
    });

    const res = await request(app).get("/api/dashboard");
    expect(res.body.data[0].metrics.peopleCount).toBe(1);
    expect(res.body.data[0].metrics.coveragePercent).toBe(100);
  });
});
