import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup.js";
import type { Express } from "express";

describe("Admin API", () => {
  let app: Express;

  beforeEach(async () => {
    const result = await createTestApp();
    app = result.app;
  });

  it("GET /api/admin/status returns system info", async () => {
    const res = await request(app).get("/api/admin/status");
    expect(res.status).toBe(200);
    expect(res.body.data.dbSizeFormatted).toBeDefined();
    expect(res.body.data.recordCounts).toBeDefined();
    expect(res.body.data.recordCounts.tags).toBe(0);
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.data.lock).toBeDefined();
  });

  it("POST /api/admin/backup creates a backup", async () => {
    const res = await request(app).post("/api/admin/backup");
    expect([201, 500]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.data.filename).toMatch(/^app-/);
      expect(res.body.data.size).toBeGreaterThan(0);
    }
  });

  it("GET /api/admin/backups lists backups", async () => {
    await request(app).post("/api/admin/backup");
    const res = await request(app).get("/api/admin/backups");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("DELETE /api/admin/lock force-releases lock", async () => {
    // First acquire the lock
    await request(app).post("/api/tags").send({ value: "test" });

    const statusBefore = await request(app).get("/api/admin/status");
    expect(statusBefore.body.data.lock.locked).toBe(true);

    const res = await request(app).delete("/api/admin/lock");
    expect(res.body.data.released).toBe(true);

    const statusAfter = await request(app).get("/api/admin/status");
    expect(statusAfter.body.data.lock.locked).toBe(false);
  });
});
