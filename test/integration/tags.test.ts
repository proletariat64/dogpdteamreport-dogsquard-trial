import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("Tags API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  it("GET /api/tags returns empty list", async () => {
    const res = await request(app).get("/api/tags");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it("POST /api/tags creates a tag", async () => {
    const res = await request(app).post("/api/tags").send({ value: "外汇平台" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.value).toBe("外汇平台");
    expect(res.body.data.id).toMatch(/^tag-/);
  });

  it("POST /api/tags rejects duplicate value with 409", async () => {
    await request(app).post("/api/tags").send({ value: "外汇平台" });
    const res = await request(app).post("/api/tags").send({ value: "外汇平台" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("UNIQUE_VIOLATION");
  });

  it("POST /api/tags validates value max 50", async () => {
    const res = await request(app).post("/api/tags").send({ value: "x".repeat(51) });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/tags/:id deletes a tag", async () => {
    const create = await request(app).post("/api/tags").send({ value: "to-delete" });
    const id = create.body.data.id;

    const res = await request(app).delete(`/api/tags/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("DELETE /api/tags/:id returns 404 for missing tag", async () => {
    const res = await request(app).delete("/api/tags/nonexistent");
    expect(res.status).toBe(404);
  });
});
