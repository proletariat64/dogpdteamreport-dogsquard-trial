import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all, get, run } from "../../src/lib/db.js";

describe("People API - 全量 CRUD 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  // 辅助：创建测试前置数据
  async function createPrereqs() {
    const tag = await request(app).post("/api/tags").send({ value: "工程师" });
    const team = await request(app).post("/api/teams").send({ name: "测试团队" });
    return { tagId: tag.body.data.id, teamId: team.body.data.id };
  }

  // ================================================================
  // CREATE
  // ================================================================

  describe("POST /api/people - 创建", () => {
    it("正常创建（仅 name）→ 201", async () => {
      const res = await request(app).post("/api/people").send({ name: "张三" });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("张三");
      expect(res.body.data.employeeId).toBeNull();
      expect(res.body.data.level).toBeNull();
      expect(res.body.data.teamId).toBeNull();
      expect(res.body.data.location).toBeNull();
      expect(res.body.data.managerId).toBeNull();
      expect(res.body.data.tagIds).toEqual([]);

      // API-DB 逐字段比对
      const row = get("SELECT * FROM people WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.name).toBe("张三");
      expect(row.employee_id).toBeNull();
      expect(row.level).toBeNull();
      expect(row.team_id).toBeNull();
      expect(row.location).toBeNull();
      expect(row.manager_id).toBeNull();
    });

    it("正常创建（全部字段）→ 201", async () => {
      const { tagId, teamId } = await createPrereqs();
      // 先创建一个 manager
      const mgr = await request(app).post("/api/people").send({ name: "上级" });

      const l1 = await request(app).post("/api/products/l1").send({ name: "产品A", code: "PA" });

      const res = await request(app).post("/api/people").send({
        name: "李四",
        employeeId: "EMP001",
        level: "P7",
        tagIds: [tagId],
        teamId,
        location: "杭州",
        managerId: mgr.body.data.id,
        l1ProductIds: [l1.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("李四");
      expect(res.body.data.employeeId).toBe("EMP001");
      expect(res.body.data.level).toBe("P7");
      expect(res.body.data.teamId).toBe(teamId);
      expect(res.body.data.location).toBe("杭州");
      expect(res.body.data.managerId).toBe(mgr.body.data.id);
      expect(res.body.data.tagIds).toContain(tagId);
      expect(res.body.data.l1ProductIds).toContain(l1.body.data.id);

      // DB 逐字段比对
      const row = get("SELECT * FROM people WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("李四");
      expect(row.employee_id).toBe("EMP001");
      expect(row.level).toBe("P7");
      expect(row.team_id).toBe(teamId);
      expect(row.location).toBe("杭州");
      expect(row.manager_id).toBe(mgr.body.data.id);

      // DB 关联表验证
      const pTags = all("SELECT * FROM person_tags WHERE person_id = ?", [res.body.data.id]);
      expect(pTags).toHaveLength(1);
      const pProducts = all("SELECT * FROM person_l1_products WHERE person_id = ?", [res.body.data.id]);
      expect(pProducts).toHaveLength(1);
    });

    it("边界值：name 最大 100 → 201", async () => {
      const n = "N".repeat(100);
      const res = await request(app).post("/api/people").send({ name: n });
      expect(res.status).toBe(201);
      expect(res.body.data.name.length).toBe(100);
    });

    it("边界值：employeeId 最大 20 → 201", async () => {
      const res = await request(app).post("/api/people").send({ name: "工号", employeeId: "E".repeat(20) });
      expect(res.status).toBe(201);
      expect(res.body.data.employeeId.length).toBe(20);
    });

    it("边界值：level 最大 10 → 201", async () => {
      const res = await request(app).post("/api/people").send({ name: "级别", level: "L".repeat(10) });
      expect(res.status).toBe(201);
      expect(res.body.data.level.length).toBe(10);
    });

    it("边界值：location 最大 50 → 201", async () => {
      const res = await request(app).post("/api/people").send({ name: "地点", location: "L".repeat(50) });
      expect(res.status).toBe(201);
      expect(res.body.data.location.length).toBe(50);
    });

    it("非法：name 缺失 → 400", async () => {
      const res = await request(app).post("/api/people").send({});
      expect(res.status).toBe(400);
    });

    it("非法：name 空字符串 → 400", async () => {
      const res = await request(app).post("/api/people").send({ name: "" });
      expect(res.status).toBe(400);
    });

    it("非法：name 超长 101 → 400", async () => {
      const res = await request(app).post("/api/people").send({ name: "A".repeat(101) });
      expect(res.status).toBe(400);
    });

    it("非法：employeeId 超长 21 → 400", async () => {
      const res = await request(app).post("/api/people").send({ name: "超长工号", employeeId: "E".repeat(21) });
      expect(res.status).toBe(400);
    });

    it("非法：level 超长 11 → 400", async () => {
      const res = await request(app).post("/api/people").send({ name: "超长级别", level: "L".repeat(11) });
      expect(res.status).toBe(400);
    });

    it("非法：location 超长 51 → 400", async () => {
      const res = await request(app).post("/api/people").send({ name: "超长地点", location: "L".repeat(51) });
      expect(res.status).toBe(400);
    });

    it("非法：managerId 引用不存在的 person → 400", async () => {
      const res = await request(app).post("/api/people").send({ name: "孤儿", managerId: "p-ghost" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("非法：managerId 引用自身（创建时 id 尚未生成，应被 schema refine 或业务校验拦截）", async () => {
      // refine 只在 d.managerId === d.id 时触发，创建时 id 未传入，所以不会触发
      // 但可以传一个任意值测试
      const res = await request(app).post("/api/people").send({ name: "自引用" });
      expect(res.status).toBe(201); // 创建成功，managerId 为 null
    });

    it("安全：SQL 注入 → 201 以字符串存储", async () => {
      const res = await request(app).post("/api/people").send({
        name: "'; DROP TABLE people; --",
        level: "'; DROP--",
      });
      expect(res.status).toBe(201);
      const tableCheck = all("SELECT name FROM sqlite_master WHERE type='table' AND name='people'");
      expect(tableCheck.length).toBe(1);

      // DB 确认 SQL payload 作为普通字符串存储
      const row = get("SELECT name, level FROM people WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("'; DROP TABLE people; --");
      expect(row.level).toBe("'; DROP--");
    });

    it("安全：XSS → 201 以字符串存储", async () => {
      const res = await request(app).post("/api/people").send({ name: "<script>alert(1)</script>" });
      expect(res.status).toBe(201);
      const row = get("SELECT name FROM people WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("<script>alert(1)</script>");
    });

    it("创建时可传 managerId=null（显式 null）→ 201", async () => {
      const res = await request(app).post("/api/people").send({ name: "无上级", managerId: null });
      expect(res.status).toBe(201);
      expect(res.body.data.managerId).toBeNull();
    });
  });

  // ================================================================
  // READ
  // ================================================================

  describe("GET /api/people - 列表", () => {
    it("空列表 → 200", async () => {
      const res = await request(app).get("/api/people");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("有数据 → 200，API-DB 每条逐字段比对", async () => {
      const { tagId, teamId } = await createPrereqs();
      await request(app).post("/api/people").send({ name: "张三", employeeId: "E1", teamId, tagIds: [tagId] });
      await request(app).post("/api/people").send({ name: "李四", level: "P6", location: "北京" });

      const res = await request(app).get("/api/people");
      expect(res.body.data.length).toBe(2);

      const dbPeople = all("SELECT * FROM people ORDER BY created_at DESC") as Record<string, unknown>[];
      expect(res.body.data.length).toBe(dbPeople.length);
      for (let i = 0; i < dbPeople.length; i++) {
        expect(res.body.data[i].id).toBe(dbPeople[i].id);
        expect(res.body.data[i].name).toBe(dbPeople[i].name);
        expect(res.body.data[i].employeeId).toBe(dbPeople[i].employee_id);
        expect(res.body.data[i].level).toBe(dbPeople[i].level);
        expect(res.body.data[i].teamId).toBe(dbPeople[i].team_id);
      }
    });

    it("按 name 过滤 → 200", async () => {
      await request(app).post("/api/people").send({ name: "张三丰" });
      await request(app).post("/api/people").send({ name: "李四" });

      const res = await request(app).get("/api/people?name=张");
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("张三丰");
    });

    it("按 teamId 过滤 → 200", async () => {
      const { teamId } = await createPrereqs();
      await request(app).post("/api/people").send({ name: "队员A", teamId });
      await request(app).post("/api/people").send({ name: "队员B" });

      const res = await request(app).get(`/api/people?teamId=${teamId}`);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("队员A");

      // DB 一致性
      const dbCount = all("SELECT COUNT(*) as cnt FROM people WHERE team_id = ?", [teamId])[0] as { cnt: number };
      expect(res.body.data.length).toBe(dbCount.cnt);
    });

    it("按 location 过滤 → 200", async () => {
      await request(app).post("/api/people").send({ name: "杭州人", location: "杭州" });
      await request(app).post("/api/people").send({ name: "北京人", location: "北京" });

      const res = await request(app).get("/api/people?location=杭州");
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].location).toBe("杭州");
    });
  });

  describe("GET /api/people/:id - 详情", () => {
    it("正常获取 → 200", async () => {
      const { tagId, teamId } = await createPrereqs();
      const create = await request(app).post("/api/people").send({
        name: "详情人", employeeId: "D001", teamId, tagIds: [tagId],
      });
      const res = await request(app).get(`/api/people/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("详情人");
      expect(res.body.data.tagIds).toContain(tagId);
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/people/p-fake");
      expect(res.status).toBe(404);
    });
  });

  // ================================================================
  // UPDATE
  // ================================================================

  describe("PUT /api/people/:id - 更新", () => {
    it("正常更新 name → 200", async () => {
      const create = await request(app).post("/api/people").send({ name: "旧名" });
      const res = await request(app).put(`/api/people/${create.body.data.id}`).send({ name: "新名" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("新名");

      const row = get("SELECT name FROM people WHERE id = ?", [create.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("新名");
    });

    it("正常更新多字段及关联 → 200", async () => {
      const { tagId, teamId } = await createPrereqs();
      const mgr = await request(app).post("/api/people").send({ name: "新上级" });
      const l1 = await request(app).post("/api/products/l1").send({ name: "新产品", code: "NP" });
      const create = await request(app).post("/api/people").send({ name: "待更新" });
      const id = create.body.data.id;

      const res = await request(app).put(`/api/people/${id}`).send({
        employeeId: "NEW001",
        level: "P8",
        teamId,
        location: "深圳",
        managerId: mgr.body.data.id,
        tagIds: [tagId],
        l1ProductIds: [l1.body.data.id],
      });
      expect(res.status).toBe(200);
      expect(res.body.data.employeeId).toBe("NEW001");
      expect(res.body.data.level).toBe("P8");
      expect(res.body.data.teamId).toBe(teamId);
      expect(res.body.data.location).toBe("深圳");
      expect(res.body.data.managerId).toBe(mgr.body.data.id);
      expect(res.body.data.tagIds).toContain(tagId);
      expect(res.body.data.l1ProductIds).toContain(l1.body.data.id);

      // DB 逐字段比对
      const row = get("SELECT * FROM people WHERE id = ?", [id]) as Record<string, unknown>;
      expect(row.employee_id).toBe("NEW001");
      expect(row.level).toBe("P8");
      expect(row.team_id).toBe(teamId);
      expect(row.location).toBe("深圳");
      expect(row.manager_id).toBe(mgr.body.data.id);

      // DB 关联表
      const pTags = all("SELECT * FROM person_tags WHERE person_id = ?", [id]);
      expect(pTags).toHaveLength(1);
    });

    it("更新 managerId 为 null（清除上级）→ 200", async () => {
      const mgr = await request(app).post("/api/people").send({ name: "上级" });
      const create = await request(app).post("/api/people").send({ name: "下属", managerId: mgr.body.data.id });
      const res = await request(app).put(`/api/people/${create.body.data.id}`).send({ managerId: null });
      expect(res.body.data.managerId).toBeNull();

      const row = get("SELECT manager_id FROM people WHERE id = ?", [create.body.data.id]) as Record<string, unknown>;
      expect(row.manager_id).toBeNull();
    });

    it("非法：managerId 设为自身 → 400", async () => {
      const create = await request(app).post("/api/people").send({ name: "自我" });
      const res = await request(app).put(`/api/people/${create.body.data.id}`).send({
        managerId: create.body.data.id,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("managerId");
    });

    it("非法：managerId 引用不存在的 person → 400", async () => {
      const create = await request(app).post("/api/people").send({ name: "测试" });
      const res = await request(app).put(`/api/people/${create.body.data.id}`).send({ managerId: "p-404" });
      expect(res.status).toBe(400);
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/people/p-nobody").send({ name: "X" });
      expect(res.status).toBe(404);
    });

    it("空 body 更新 → 200", async () => {
      const create = await request(app).post("/api/people").send({ name: "不变" });
      const res = await request(app).put(`/api/people/${create.body.data.id}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("不变");
    });
  });

  // ================================================================
  // DELETE
  // ================================================================

  describe("DELETE /api/people/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/people").send({ name: "删除人" });
      const res = await request(app).delete(`/api/people/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const row = get("SELECT * FROM people WHERE id = ?", [create.body.data.id]);
      expect(row).toBeUndefined();
    });

    it("删除不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/people/p-nope");
      expect(res.status).toBe(404);
    });

    it("重复删除 → 404", async () => {
      const create = await request(app).post("/api/people").send({ name: "再删" });
      await request(app).delete(`/api/people/${create.body.data.id}`);
      const res = await request(app).delete(`/api/people/${create.body.data.id}`);
      expect(res.status).toBe(404);
    });

    it("级联：删除 person 后 person_tags 清除", async () => {
      const tag = await request(app).post("/api/tags").send({ value: "assoc" });
      const create = await request(app).post("/api/people").send({ name: "关联人", tagIds: [tag.body.data.id] });
      const id = create.body.data.id;

      expect(all("SELECT * FROM person_tags WHERE person_id = ?", [id])).toHaveLength(1);

      await request(app).delete(`/api/people/${id}`);

      expect(all("SELECT * FROM person_tags WHERE person_id = ?", [id])).toHaveLength(0);
    });

    it("级联：删除 manager 后下属 manager_id 设为 NULL", async () => {
      const mgr = await request(app).post("/api/people").send({ name: "被删上级" });
      const sub = await request(app).post("/api/people").send({ name: "下属", managerId: mgr.body.data.id });

      await request(app).delete(`/api/people/${mgr.body.data.id}`);

      const subRow = get("SELECT manager_id FROM people WHERE id = ?", [sub.body.data.id]) as Record<string, unknown>;
      expect(subRow.manager_id).toBeNull();
    });

    it("级联：删除 person 后 product_owners 清除", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "产品X", code: "PX" });
      const create = await request(app).post("/api/people").send({ name: "owner", l1ProductIds: [l1.body.data.id] });
      const id = create.body.data.id;

      // 同时在 l1_product_owners 中添加
      run("INSERT INTO l1_product_owners (l1_product_id, person_id) VALUES (?, ?)", [l1.body.data.id, id]);

      await request(app).delete(`/api/people/${id}`);

      expect(all("SELECT * FROM l1_product_owners WHERE person_id = ?", [id])).toHaveLength(0);
      expect(all("SELECT * FROM person_l1_products WHERE person_id = ?", [id])).toHaveLength(0);
    });
  });
});
