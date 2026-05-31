-- =============================================
-- 产品管理信息录入系统 — 数据库 Schema
-- 版本: v1.0
-- 日期: 2026-05-20
-- 说明: 本文件为 DDD 领域模型的物理映射，与迁移脚本保持一致
-- =============================================

PRAGMA foreign_keys = ON;

-- =============================================
-- 组织上下文 (Organization Context)
-- 聚合根: Tag, Team, Person
-- =============================================

CREATE TABLE IF NOT EXISTS tags (
  id          TEXT PRIMARY KEY,
  value       TEXT NOT NULL UNIQUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_value ON tags(value);

CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- Tag ↔ Team 多对多关联
CREATE TABLE IF NOT EXISTS team_tags (
  team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, tag_id)
);

CREATE TABLE IF NOT EXISTS people (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  employee_id  TEXT,
  level        TEXT,
  team_id      TEXT REFERENCES teams(id) ON DELETE SET NULL,
  location     TEXT,
  manager_id   TEXT REFERENCES people(id) ON DELETE SET NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_people_name     ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_team     ON people(team_id);
CREATE INDEX IF NOT EXISTS idx_people_location ON people(location);
CREATE INDEX IF NOT EXISTS idx_people_manager  ON people(manager_id);

-- Tag ↔ Person 多对多关联
CREATE TABLE IF NOT EXISTS person_tags (
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, tag_id)
);

-- =============================================
-- 产品管理上下文 (Product Management Context)
-- 聚合根: L1Product（L2Product 为其内部实体）
-- =============================================

CREATE TABLE IF NOT EXISTS l1_products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  team_id     TEXT REFERENCES teams(id) ON DELETE SET NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_l1_products_name ON l1_products(name);
CREATE INDEX IF NOT EXISTS idx_l1_products_code ON l1_products(code);
CREATE INDEX IF NOT EXISTS idx_l1_products_team ON l1_products(team_id);

-- L2Product 严格隶属 L1Product 聚合，ON DELETE CASCADE 保证聚合一致性
CREATE TABLE IF NOT EXISTS l2_products (
  id          TEXT PRIMARY KEY,
  l1_id       TEXT NOT NULL REFERENCES l1_products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_l2_products_l1   ON l2_products(l1_id);
CREATE INDEX IF NOT EXISTS idx_l2_products_name ON l2_products(name);

-- L1 Product Owner 关联（多对多）
CREATE TABLE IF NOT EXISTS l1_product_owners (
  l1_product_id TEXT NOT NULL REFERENCES l1_products(id) ON DELETE CASCADE,
  person_id     TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (l1_product_id, person_id)
);

-- L2 Product Owner 关联（多对多）
CREATE TABLE IF NOT EXISTS l2_product_owners (
  l2_product_id TEXT NOT NULL REFERENCES l2_products(id) ON DELETE CASCADE,
  person_id     TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (l2_product_id, person_id)
);

-- 人员 ↔ L1 产品关联（多对多，表示人员所参与的产品）
CREATE TABLE IF NOT EXISTS person_l1_products (
  person_id     TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  l1_product_id TEXT NOT NULL REFERENCES l1_products(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, l1_product_id)
);

-- 人员 ↔ L2 产品关联（多对多）
CREATE TABLE IF NOT EXISTS person_l2_products (
  person_id     TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  l2_product_id TEXT NOT NULL REFERENCES l2_products(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, l2_product_id)
);

-- =============================================
-- 目标管理上下文 (Goal Management Context)
-- 聚合根: L0Goal, L1Goal, L2Goal
-- 说明: L1Goal/L2Goal 虽有自己的表，但在领域上分别严格隶属 L1Product/L2Product
-- =============================================

-- L0 目标：部门级目标（独立聚合根）
CREATE TABLE IF NOT EXISTS l0_goals (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  standard    TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- L1 目标：严格隶属于一个 L1 产品（1:N）
CREATE TABLE IF NOT EXISTS l1_goals (
  id             TEXT PRIMARY KEY,
  l1_product_id  TEXT NOT NULL REFERENCES l1_products(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  standard       TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_l1_goals_product ON l1_goals(l1_product_id);

-- L2 目标：严格隶属于一个 L2 产品（1:N）
CREATE TABLE IF NOT EXISTS l2_goals (
  id             TEXT PRIMARY KEY,
  l2_product_id  TEXT NOT NULL REFERENCES l2_products(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  standard       TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_l2_goals_product ON l2_goals(l2_product_id);

-- L0 目标 ↔ L1 目标：many-to-many（领域上表示目标分解关系）
CREATE TABLE IF NOT EXISTS l0_goal_l1_goals (
  l0_goal_id  TEXT NOT NULL REFERENCES l0_goals(id) ON DELETE CASCADE,
  l1_goal_id  TEXT NOT NULL REFERENCES l1_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (l0_goal_id, l1_goal_id)
);

-- L1 目标 ↔ L2 目标：many-to-many
CREATE TABLE IF NOT EXISTS l1_goal_l2_goals (
  l1_goal_id  TEXT NOT NULL REFERENCES l1_goals(id) ON DELETE CASCADE,
  l2_goal_id  TEXT NOT NULL REFERENCES l2_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (l1_goal_id, l2_goal_id)
);
