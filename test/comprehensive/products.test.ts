import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../setup.js";
import { all, get, run } from "../../src/lib/db.js";

// ================================================================
// L1 Products
// ================================================================
describe("L1 Products API - 全量 CRUD 测试", () => {
  let app: Express;

  beforeEach(async () => {
    app = (await createTestApp()).app;
  });

  // CREATE
  describe("POST /api/products/l1 - 创建", () => {
    it("正常创建 → 201", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "支付平台", code: "PAY" });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("支付平台");
      expect(res.body.data.code).toBe("PAY");
      expect(res.body.data.teamId).toBeNull();
      expect(res.body.data.ownerIds).toEqual([]);

      // API-DB 一致性
      const row = get("SELECT * FROM l1_products WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("支付平台");
      expect(row.code).toBe("PAY");
      expect(row.team_id).toBeNull();
    });

    it("正常创建（含 teamId 和 ownerIds）→ 201", async () => {
      const team = await request(app).post("/api/teams").send({ name: "支付团队" });
      const person = await request(app).post("/api/people").send({ name: "负责人" });

      const res = await request(app).post("/api/products/l1").send({
        name: "风控平台",
        code: "RISK",
        teamId: team.body.data.id,
        ownerIds: [person.body.data.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.teamId).toBe(team.body.data.id);
      expect(res.body.data.ownerIds).toContain(person.body.data.id);

      // DB 关联表
      const owners = all("SELECT * FROM l1_product_owners WHERE l1_product_id = ?", [res.body.data.id]);
      expect(owners).toHaveLength(1);
    });

    it("边界值：name 最大 100 → 201", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "A".repeat(100), code: "MAXN" });
      expect(res.status).toBe(201);
    });

    it("边界值：code 最大 20 → 201", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "编码测试", code: "C".repeat(20) });
      expect(res.status).toBe(201);
      expect(res.body.data.code.length).toBe(20);
    });

    it("唯一约束：重复 code → 409", async () => {
      await request(app).post("/api/products/l1").send({ name: "第一", code: "DUP" });
      const res = await request(app).post("/api/products/l1").send({ name: "第二", code: "DUP" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("UNIQUE_VIOLATION");

      const rows = all("SELECT * FROM l1_products WHERE code = ?", ["DUP"]);
      expect(rows).toHaveLength(1);
    });

    it("非法：name 缺失 → 400", async () => {
      const res = await request(app).post("/api/products/l1").send({ code: "NONAME" });
      expect(res.status).toBe(400);
    });

    it("非法：code 缺失 → 400", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "无编码" });
      expect(res.status).toBe(400);
    });

    it("非法：name 空字符串 → 400", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "", code: "EMPTY" });
      expect(res.status).toBe(400);
    });

    it("非法：code 空字符串 → 400", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "空编码", code: "" });
      expect(res.status).toBe(400);
    });

    it("非法：name 超长 101 → 400", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "X".repeat(101), code: "LONG" });
      expect(res.status).toBe(400);
    });

    it("非法：code 超长 21 → 400", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "超长编码", code: "C".repeat(21) });
      expect(res.status).toBe(400);
    });

    it("安全：SQL 注入 → 201 以字符串存储", async () => {
      const res = await request(app).post("/api/products/l1").send({ name: "注入", code: "'; DROP--" });
      expect(res.status).toBe(201);
      const t = get("SELECT name FROM sqlite_master WHERE type='table' AND name='l1_products'");
      expect(t).toBeDefined();
    });
  });

  // READ
  describe("GET /api/products/l1 - 列表", () => {
    it("空列表 → 200", async () => {
      const res = await request(app).get("/api/products/l1");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("有数据 → 200，API-DB 逐字段比对", async () => {
      await request(app).post("/api/products/l1").send({ name: "产品A", code: "PA" });
      await request(app).post("/api/products/l1").send({ name: "产品B", code: "PB" });

      const res = await request(app).get("/api/products/l1");
      expect(res.body.data.length).toBe(2);

      const dbProducts = all("SELECT * FROM l1_products ORDER BY created_at DESC") as Record<string, unknown>[];
      for (let i = 0; i < dbProducts.length; i++) {
        expect(res.body.data[i].id).toBe(dbProducts[i].id);
        expect(res.body.data[i].name).toBe(dbProducts[i].name);
        expect(res.body.data[i].code).toBe(dbProducts[i].code);
      }
    });
  });

  describe("GET /api/products/l1/:id - 详情", () => {
    it("正常获取（含 l2Products）→ 200", async () => {
      const create = await request(app).post("/api/products/l1").send({ name: "L1产品", code: "L1P" });
      const res = await request(app).get(`/api/products/l1/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.l2Products).toEqual([]);
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/products/l1/l1-fake");
      expect(res.status).toBe(404);
    });
  });

  // UPDATE
  describe("PUT /api/products/l1/:id - 更新", () => {
    it("正常更新 name → 200", async () => {
      const create = await request(app).post("/api/products/l1").send({ name: "旧名", code: "OLD" });
      const res = await request(app).put(`/api/products/l1/${create.body.data.id}`).send({ name: "新名" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("新名");

      const row = get("SELECT name FROM l1_products WHERE id = ?", [create.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("新名");
    });

    it("更新 code（唯一）→ 200", async () => {
      const create = await request(app).post("/api/products/l1").send({ name: "编码变更", code: "OLDCODE" });
      const res = await request(app).put(`/api/products/l1/${create.body.data.id}`).send({ code: "NEWCODE" });
      expect(res.body.data.code).toBe("NEWCODE");
    });

    it("更新 code 为已存在的 code → 409", async () => {
      await request(app).post("/api/products/l1").send({ name: "A", code: "EXISTING" });
      const b = await request(app).post("/api/products/l1").send({ name: "B", code: "OTHER" });

      const res = await request(app).put(`/api/products/l1/${b.body.data.id}`).send({ code: "EXISTING" });
      expect(res.status).toBe(409);
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/products/l1/l1-ghost").send({ name: "X" });
      expect(res.status).toBe(404);
    });

    it("空 body → 200 无变更", async () => {
      const create = await request(app).post("/api/products/l1").send({ name: "不变", code: "SAME" });
      const res = await request(app).put(`/api/products/l1/${create.body.data.id}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("不变");
    });
  });

  // DELETE
  describe("DELETE /api/products/l1/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/products/l1").send({ name: "删除品", code: "DEL" });
      const res = await request(app).delete(`/api/products/l1/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const row = get("SELECT * FROM l1_products WHERE id = ?", [create.body.data.id]);
      expect(row).toBeUndefined();
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/products/l1/l1-nope");
      expect(res.status).toBe(404);
    });

    it("级联删除：L1 被删后 L2 也被删除", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "父产品", code: "PAR" });
      const l1Id = l1.body.data.id;

      run("INSERT INTO l2_products (id, l1_id, name, code) VALUES (?, ?, ?, ?)", ["l2-child", l1Id, "子产品", "CHD"]);

      await request(app).delete(`/api/products/l1/${l1Id}`);

      const l2 = get("SELECT * FROM l2_products WHERE id = ?", ["l2-child"]);
      expect(l2).toBeUndefined();
    });

    it("级联删除：L1 被删后关联的 l1_goals 也被删除", async () => {
      const l1 = await request(app).post("/api/products/l1").send({ name: "目标产品", code: "GL1" });
      const l1Id = l1.body.data.id;

      run("INSERT INTO l1_goals (id, l1_product_id, content) VALUES (?, ?, ?)", ["g1-child", l1Id, "目标内容"]);

      await request(app).delete(`/api/products/l1/${l1Id}`);

      const goal = get("SELECT * FROM l1_goals WHERE id = ?", ["g1-child"]);
      expect(goal).toBeUndefined();
    });

    it("重复删除 → 404", async () => {
      const create = await request(app).post("/api/products/l1").send({ name: "二次删", code: "DEL2" });
      await request(app).delete(`/api/products/l1/${create.body.data.id}`);
      const res = await request(app).delete(`/api/products/l1/${create.body.data.id}`);
      expect(res.status).toBe(404);
    });
  });
});

// ================================================================
// L2 Products
// ================================================================
describe("L2 Products API - 全量 CRUD 测试", () => {
  let app: Express;
  let l1Id: string;

  beforeEach(async () => {
    app = (await createTestApp()).app;
    const l1 = await request(app).post("/api/products/l1").send({ name: "父L1", code: "L2PAR" });
    l1Id = l1.body.data.id;
  });

  // CREATE
  describe("POST /api/products/l2 - 创建", () => {
    it("正常创建 → 201", async () => {
      const res = await request(app).post("/api/products/l2").send({
        l1Id, name: "子产品", code: "CHD1",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("子产品");
      expect(res.body.data.l1Id).toBe(l1Id);

      // API-DB 一致性
      const row = get("SELECT * FROM l2_products WHERE id = ?", [res.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("子产品");
      expect(row.l1_id).toBe(l1Id);
    });

    it("正常创建（含 ownerIds）→ 201", async () => {
      const person = await request(app).post("/api/people").send({ name: "L2负责人" });
      const res = await request(app).post("/api/products/l2").send({
        l1Id, name: "有Owner", code: "OWN1", ownerIds: [person.body.data.id],
      });
      expect(res.body.data.ownerIds).toContain(person.body.data.id);

      const owners = all("SELECT * FROM l2_product_owners WHERE l2_product_id = ?", [res.body.data.id]);
      expect(owners).toHaveLength(1);
    });

    it("非法：l1Id 缺失 → 400", async () => {
      const res = await request(app).post("/api/products/l2").send({ name: "孤儿", code: "ORP" });
      expect(res.status).toBe(400);
    });

    it("非法：l1Id 引用不存在的 L1 → 404", async () => {
      const res = await request(app).post("/api/products/l2").send({
        l1Id: "l1-ghost", name: "幽灵产品", code: "GHOST",
      });
      expect(res.status).toBe(404);
    });

    it("非法：name 缺失 → 400", async () => {
      const res = await request(app).post("/api/products/l2").send({ l1Id, code: "NC" });
      expect(res.status).toBe(400);
    });

    it("非法：code 缺失 → 400", async () => {
      const res = await request(app).post("/api/products/l2").send({ l1Id, name: "无编码" });
      expect(res.status).toBe(400);
    });

    it("边界值：name 最大 100 → 201", async () => {
      const res = await request(app).post("/api/products/l2").send({
        l1Id, name: "B".repeat(100), code: "MAXN",
      });
      expect(res.status).toBe(201);
    });

    it("非法：name 超长 101 → 400", async () => {
      const res = await request(app).post("/api/products/l2").send({
        l1Id, name: "C".repeat(101), code: "LNG",
      });
      expect(res.status).toBe(400);
    });
  });

  // READ
  describe("GET /api/products/l2 - 列表", () => {
    it("空列表 → 200", async () => {
      const res = await request(app).get("/api/products/l2");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("按 l1Id 过滤 → 200", async () => {
      const l1b = await request(app).post("/api/products/l1").send({ name: "另一L1", code: "L1B" });
      await request(app).post("/api/products/l2").send({ l1Id, name: "A的子", code: "CA" });
      await request(app).post("/api/products/l2").send({ l1Id: l1b.body.data.id, name: "B的子", code: "CB" });

      const res = await request(app).get(`/api/products/l2?l1Id=${l1Id}`);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].l1Id).toBe(l1Id);

      // DB 一致性
      const dbCount = all("SELECT COUNT(*) as cnt FROM l2_products WHERE l1_id = ?", [l1Id])[0] as { cnt: number };
      expect(res.body.data.length).toBe(dbCount.cnt);
    });

    it("列表数据 API-DB 逐字段比对 → 200", async () => {
      await request(app).post("/api/products/l2").send({ l1Id, name: "L2-A", code: "A1" });
      await request(app).post("/api/products/l2").send({ l1Id, name: "L2-B", code: "B1" });

      const res = await request(app).get("/api/products/l2");
      const dbAll = all("SELECT * FROM l2_products ORDER BY created_at DESC") as Record<string, unknown>[];
      for (let i = 0; i < dbAll.length; i++) {
        expect(res.body.data[i].id).toBe(dbAll[i].id);
        expect(res.body.data[i].name).toBe(dbAll[i].name);
        expect(res.body.data[i].code).toBe(dbAll[i].code);
        expect(res.body.data[i].l1Id).toBe(dbAll[i].l1_id);
      }
    });
  });

  describe("GET /api/products/l2/:id - 详情", () => {
    it("正常获取 → 200", async () => {
      const create = await request(app).post("/api/products/l2").send({ l1Id, name: "详情L2", code: "DTL" });
      const res = await request(app).get(`/api/products/l2/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("详情L2");
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).get("/api/products/l2/l2-none");
      expect(res.status).toBe(404);
    });
  });

  // UPDATE
  describe("PUT /api/products/l2/:id - 更新", () => {
    it("正常更新 name 和 l1Id → 200", async () => {
      const l1b = await request(app).post("/api/products/l1").send({ name: "新父", code: "L1NEW" });
      const create = await request(app).post("/api/products/l2").send({ l1Id, name: "旧名", code: "OLD" });
      const res = await request(app).put(`/api/products/l2/${create.body.data.id}`).send({
        name: "新名", l1Id: l1b.body.data.id,
      });
      expect(res.body.data.name).toBe("新名");
      expect(res.body.data.l1Id).toBe(l1b.body.data.id);

      const row = get("SELECT name, l1_id FROM l2_products WHERE id = ?", [create.body.data.id]) as Record<string, unknown>;
      expect(row.name).toBe("新名");
      expect(row.l1_id).toBe(l1b.body.data.id);
    });

    it("非法：l1Id 引用不存在的 L1 → 404", async () => {
      const create = await request(app).post("/api/products/l2").send({ l1Id, name: "变更", code: "CHG" });
      const res = await request(app).put(`/api/products/l2/${create.body.data.id}`).send({ l1Id: "l1-fake" });
      expect(res.status).toBe(404);
    });

    it("更新不存在的 ID → 404", async () => {
      const res = await request(app).put("/api/products/l2/l2-nada").send({ name: "X" });
      expect(res.status).toBe(404);
    });
  });

  // DELETE
  describe("DELETE /api/products/l2/:id - 删除", () => {
    it("正常删除 → 200", async () => {
      const create = await request(app).post("/api/products/l2").send({ l1Id, name: "删L2", code: "DEL2" });
      const res = await request(app).delete(`/api/products/l2/${create.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      const row = get("SELECT * FROM l2_products WHERE id = ?", [create.body.data.id]);
      expect(row).toBeUndefined();
    });

    it("不存在的 ID → 404", async () => {
      const res = await request(app).delete("/api/products/l2/l2-ghost");
      expect(res.status).toBe(404);
    });

    it("重复删除 → 404", async () => {
      const create = await request(app).post("/api/products/l2").send({ l1Id, name: "重删", code: "RDL" });
      await request(app).delete(`/api/products/l2/${create.body.data.id}`);
      const res = await request(app).delete(`/api/products/l2/${create.body.data.id}`);
      expect(res.status).toBe(404);
    });

    it("级联删除：L2 被删后 l2_goals 也被删除", async () => {
      const create = await request(app).post("/api/products/l2").send({ l1Id, name: "带目标", code: "WGL2" });
      const l2Id = create.body.data.id;

      run("INSERT INTO l2_goals (id, l2_product_id, content) VALUES (?, ?, ?)", ["g2-link", l2Id, "L2目标"]);

      await request(app).delete(`/api/products/l2/${l2Id}`);

      const goal = get("SELECT * FROM l2_goals WHERE id = ?", ["g2-link"]);
      expect(goal).toBeUndefined();
    });
  });
});
