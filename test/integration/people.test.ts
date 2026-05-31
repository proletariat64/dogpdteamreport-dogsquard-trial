import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("People API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  it("GET /api/people returns empty list", async () => {
    const res = await request(app).get("/api/people");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("POST /api/people creates a person", async () => {
    const res = await request(app).post("/api/people").send({
      name: "戴顺(顺凯)",
      employeeId: "242537",
      level: "18",
      location: "上海",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("戴顺(顺凯)");
    expect(res.body.data.employeeId).toBe("242537");
    expect(res.body.data.tagIds).toEqual([]);
  });

  it("POST /api/people creates a person with tags and team", async () => {
    const tag = await request(app).post("/api/tags").send({ value: "主管" });
    const team = await request(app).post("/api/teams").send({ name: "外汇" });
    const res = await request(app).post("/api/people").send({
      name: "张三",
      tagIds: [tag.body.data.id],
      teamId: team.body.data.id,
    });
    expect(res.body.data.tagIds).toEqual([tag.body.data.id]);
    expect(res.body.data.teamId).toBe(team.body.data.id);
  });

  it("GET /api/people filters by name", async () => {
    await request(app).post("/api/people").send({ name: "Alice" });
    await request(app).post("/api/people").send({ name: "Bob" });
    const res = await request(app).get("/api/people?name=Ali");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Alice");
  });

  it("GET /api/people filters by teamId", async () => {
    const team = await request(app).post("/api/teams").send({ name: "T1" });
    await request(app).post("/api/people").send({ name: "P1", teamId: team.body.data.id });
    await request(app).post("/api/people").send({ name: "P2" });
    const res = await request(app).get(`/api/people?teamId=${team.body.data.id}`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("P1");
  });

  it("GET /api/people filters by location", async () => {
    await request(app).post("/api/people").send({ name: "P1", location: "上海" });
    await request(app).post("/api/people").send({ name: "P2", location: "北京" });
    const res = await request(app).get("/api/people?location=上海");
    expect(res.body.data).toHaveLength(1);
  });

  it("POST /api/people rejects self-referencing managerId", async () => {
    const person = await request(app).post("/api/people").send({ name: "张三" });
    const res = await request(app).post("/api/people").send({
      name: "李四",
      managerId: "will-be-self-ref",
    });
    // The refine rule checks against the id field in the DTO, not the person's own id
    // This test checks that a direct self-ref in the body is caught
    const selfTest = await request(app).post("/api/people").send({
      name: "王五",
    });
    // Create person then try to update with self-ref
    const res2 = await request(app).put(`/api/people/${person.body.data.id}`).send({
      managerId: person.body.data.id,
    });
    expect(res2.status).toBe(400);
  });

  it("PUT /api/people/:id updates a person", async () => {
    const created = await request(app).post("/api/people").send({ name: "旧名" });
    const res = await request(app).put(`/api/people/${created.body.data.id}`).send({ name: "新名" });
    expect(res.body.data.name).toBe("新名");
  });

  it("DELETE /api/people/:id deletes and cascades", async () => {
    // Create manager and subordinate
    const mgr = await request(app).post("/api/people").send({ name: "经理" });
    const sub = await request(app).post("/api/people").send({
      name: "下属",
      managerId: mgr.body.data.id,
    });
    expect(sub.body.data.managerId).toBe(mgr.body.data.id);

    await request(app).delete(`/api/people/${mgr.body.data.id}`);

    // Subordinate's managerId should be set to null
    const updated = await request(app).get(`/api/people/${sub.body.data.id}`);
    expect(updated.body.data.managerId).toBeNull();
  });

  it("GET /api/people/:id returns 404 for missing", async () => {
    const res = await request(app).get("/api/people/nonexistent");
    expect(res.status).toBe(404);
  });
});
