import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all, get } from "../../src/lib/db.js";

describe("Dashboard API - 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  it("GET /api/dashboard - 空数据库 → 200 空数组", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("GET /api/dashboard - 完整场景：含 L1 产品、团队、目标、人员", async () => {
    // 创建完整数据
    const team = await request(app).post("/api/teams").send({ name: "看板团队" });
    const p1 = await request(app).post("/api/people").send({ name: "员工A", level: "P7", location: "杭州" });
    const p2 = await request(app).post("/api/people").send({ name: "员工B", level: "P6", location: "北京" });

    const l1 = await request(app).post("/api/products/l1").send({
      name: "看板产品", code: "DASH", teamId: team.body.data.id,
      ownerIds: [p1.body.data.id],
    });

    // 人员关联到 L1 产品
    await request(app).put(`/api/people/${p1.body.data.id}`).send({ l1ProductIds: [l1.body.data.id] });
    await request(app).put(`/api/people/${p2.body.data.id}`).send({ l1ProductIds: [l1.body.data.id] });

    // 创建 L1 goal
    await request(app).post("/api/goals/l1").send({ l1ProductId: l1.body.data.id, content: "L1看板目标" });

    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const node = res.body.data[0];
    expect(node.l1Product.id).toBe(l1.body.data.id);
    expect(node.l1Product.name).toBe("看板产品");
    expect(node.l1Product.team.name).toBe("看板团队");
    expect(node.metrics.l2Count).toBe(0);
    expect(node.metrics.peopleCount).toBe(2);
    expect(node.metrics.l1GoalCount).toBe(1);
    expect(node.metrics.l2GoalCount).toBe(0);
    expect(node.metrics.coveragePercent).toBe(0); // 无人分配到 L2
    expect(node.l1Goals).toHaveLength(1);
    expect(node.unassignedPeople).toHaveLength(2); // 两人都在 L1 但不在 L2
  });

  it("GET /api/dashboard?teamId=X - 按团队过滤 → 200", async () => {
    const teamA = await request(app).post("/api/teams").send({ name: "团队A" });
    const teamB = await request(app).post("/api/teams").send({ name: "团队B" });

    await request(app).post("/api/products/l1").send({ name: "产品A", code: "DA", teamId: teamA.body.data.id });
    await request(app).post("/api/products/l1").send({ name: "产品B", code: "DB", teamId: teamB.body.data.id });

    const res = await request(app).get(`/api/dashboard?teamId=${teamA.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].l1Product.name).toBe("产品A");
  });

  it("GET /api/dashboard?location=杭州 - 按地点过滤人员 → 200", async () => {
    const p1 = await request(app).post("/api/people").send({ name: "杭州人", location: "杭州" });
    const p2 = await request(app).post("/api/people").send({ name: "北京人", location: "北京" });

    const l1 = await request(app).post("/api/products/l1").send({
      name: "地点过滤", code: "LOCF", ownerIds: [p1.body.data.id, p2.body.data.id],
    });
    await request(app).put(`/api/people/${p1.body.data.id}`).send({ l1ProductIds: [l1.body.data.id] });
    await request(app).put(`/api/people/${p2.body.data.id}`).send({ l1ProductIds: [l1.body.data.id] });

    const res = await request(app).get("/api/dashboard?location=杭州");
    expect(res.status).toBe(200);
    expect(res.body.data[0].unassignedPeople).toHaveLength(1);
    expect(res.body.data[0].unassignedPeople[0].name).toBe("杭州人");
  });

  it("GET /api/dashboard - L1 产品含 L2 和 coverage → 200", async () => {
    const p1 = await request(app).post("/api/people").send({ name: "全覆盖人" });
    const l1 = await request(app).post("/api/products/l1").send({ name: "覆盖率", code: "COV", ownerIds: [p1.body.data.id] });
    await request(app).put(`/api/people/${p1.body.data.id}`).send({ l1ProductIds: [l1.body.data.id] });

    const l2 = await request(app).post("/api/products/l2").send({ l1Id: l1.body.data.id, name: "子产品", code: "SUB1", ownerIds: [p1.body.data.id] });
    await request(app).put(`/api/people/${p1.body.data.id}`).send({ l2ProductIds: [l2.body.data.id] });
    await request(app).post("/api/goals/l2").send({ l2ProductId: l2.body.data.id, content: "L2目标" });

    const res = await request(app).get("/api/dashboard");
    expect(res.body.data[0].metrics.l2Count).toBe(1);
    expect(res.body.data[0].metrics.peopleCount).toBe(1);
    expect(res.body.data[0].metrics.coveragePercent).toBe(100);
    expect(res.body.data[0].metrics.l2GoalCount).toBe(1);
    expect(res.body.data[0].unassignedPeople).toHaveLength(0);
  });
});
