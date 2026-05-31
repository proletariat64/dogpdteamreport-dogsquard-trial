import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("Teams API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  it("GET /api/teams returns empty list", async () => {
    const res = await request(app).get("/api/teams");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("POST /api/teams creates a team without tags", async () => {
    const res = await request(app).post("/api/teams").send({ name: "外汇团队" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("外汇团队");
    expect(res.body.data.tagIds).toEqual([]);
  });

  it("POST /api/teams creates a team with tags", async () => {
    const tag = await request(app).post("/api/tags").send({ value: "核心" });
    const res = await request(app).post("/api/teams").send({
      name: "外汇团队",
      tagIds: [tag.body.data.id],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.tagIds).toEqual([tag.body.data.id]);
  });

  it("GET /api/teams/:id returns a single team", async () => {
    const created = await request(app).post("/api/teams").send({ name: "测试团队" });
    const res = await request(app).get(`/api/teams/${created.body.data.id}`);
    expect(res.body.data.name).toBe("测试团队");
  });

  it("PUT /api/teams/:id updates a team", async () => {
    const created = await request(app).post("/api/teams").send({ name: "旧名称" });
    const res = await request(app).put(`/api/teams/${created.body.data.id}`).send({ name: "新名称" });
    expect(res.body.data.name).toBe("新名称");
  });

  it("DELETE /api/teams/:id deletes a team", async () => {
    const created = await request(app).post("/api/teams").send({ name: "待删除" });
    const res = await request(app).delete(`/api/teams/${created.body.data.id}`);
    expect(res.body.data.deleted).toBe(true);
  });

  it("DELETE /api/teams/:id cascades teamId to NULL on people", async () => {
    const team = await request(app).post("/api/teams").send({ name: "测试团队" });
    const person = await request(app).post("/api/people").send({
      name: "张三",
      teamId: team.body.data.id,
    });
    expect(person.body.data.teamId).toBe(team.body.data.id);

    await request(app).delete(`/api/teams/${team.body.data.id}`);

    const updated = await request(app).get(`/api/people/${person.body.data.id}`);
    expect(updated.body.data.teamId).toBeNull();
  });
});
