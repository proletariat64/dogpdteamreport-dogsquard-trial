# 更新日志

---

## v2.0.5 (2026-05-21)

### 人员管理增强

- **标签筛选**: 新增「全部标签」下拉框，按标签过滤人员
- **表头排序**: 姓名/工号/职级/团队/所在地/上级 可点击排序，再次点击切换升序/降序，箭头指示

### 产品管理增强

- **排序下拉**: 新增排序下拉框（默认/按团队/按名称/按产品编号），L1 排序后 L2 跟随

### CSV 数据导入

- `scripts/import-csv.ts`: 从 `backup/521/csv/` 导入标签/团队/人员/L1 产品
- `scripts/import-csv-l2-goals.ts`: 导入 L2 产品 + L1/L2 目标，自动映射旧 ID → 新 ID

---

## v2.0.4 (2026-05-21)

### UAT 环境部署

- **地址**: `http://ifundaitest.inc.alipay.net:8887`
- **服务器**: `ssh ifundaitest` → `~/www`
- **数据库**: `~/www/data/app.db`

### E2E 全量删除测试

- 基于 Playwright 的 UAT 测试 (`test/e2e/delete-all.test.ts`)
- 模拟真实用户逐条删除工作流：目标(L2→L1→L0) → 产品(L2→L1) → 人员 → 团队 → 标签
- 验证方式：SSH 远程执行 Python3 sqlite3 查询，逐表确认计数为 0
- **发现**: L1 产品删除按钮 `onclick` 前缀为 `event.stopPropagation()`，选择器需用 `*=` 而非 `^=`
- **发现**: 远程测试环境中 `page.mouse.click()` 坐标偏移，统一改用 `locator.evaluate(el => el.click())` 触发点击

### 已知项

- Playwright `locator.click()` 与 Modal overlay 存在动作性检查冲突，需绕过

---

## v2.0.3 (2026-05-21)

### QC 代码审查

- **escHtml 去重**: 9 处重复定义统一移入 `components.js`
- **XSS 修复**: 筛选下拉框选项添加 HTML 转义
- **竞态修复**: Dashboard/人员页 `load()` 等待 `loadFilters()` 完成
- **锁三态指示灯**: 绿(空闲) / 橙脉冲(自己持锁) / 红(他人持锁)
- **withLock 回调**: 删除操作 `showToast`/`load()` 移入回调内部，锁拒绝后不再误提示成功

### Bug 修复

- #12: 创建团队/人员时引用不存在的 tagId → 过滤无效 ID 后插入
- #13: `linkL0ToL1`/`linkL1ToL2` 目标不存在 → 404 + ID 过滤
- 编辑锁 `isOwn` 字段: 后端 `getStatus` 新增 IP 比对，前端三态指示

---

## v2.0.2 (2026-05-21)

### 新增

- **标签管理页**: `/tags.html` 独立标签 CRUD，统一管理
- **PUT /api/tags/:id**: 标签更新端点（保留关联，不走删+建）

### 产品管理重构

- L1/L2 从分 tab 切换改为**层级树状**统一界面
- L1 行展开显示嵌套 L2 子产品
- 每行 L2 列表末尾「+ 添加 L2」按钮，自动预选父 L1
- L2 owner 靠右对齐，与 L1 保持视觉一致

### Bug 修复

- 产品页「+」按钮双重监听 → 双 Modal 叠加 + 取消失效
- `showModal` 先 `remove()` 再读表单 → 编辑保存全部失效
- 右上角锁指示灯持续红色（锁状态残留）

---

## v2.0.1 (2026-05-21)

### Bug 修复

- 编辑 Modal 中 MultiSelect（标签/负责人/L1产品/L2产品）无法显示和操作
- 人员/团队/产品/目标所有管理页面添加「共 X 个」统一计数器

---

## v2.0.0 (2026-05-21)

### 完整重构

基于 `ddd/v1.0` + `spec/v1.0` 设计文档从零重建全栈系统。

### 后端

| 项目 | 选型 |
|------|------|
| 运行时 | Node.js + Express + TypeScript |
| 数据库 | sql.js (WASM SQLite)，启动时从 `ddd/schema.sql` 自动建表 |
| 校验 | Zod |
| 测试 | Vitest + supertest，53 项集成测试 |
| 架构 | 按限界上下文扁平分组（organization / product / goal / dashboard / admin） |

### 前端

| 项目 | 选型 |
|------|------|
| 技术 | 纯 HTML/CSS/JS，零框架，零构建 |
| 设计 | warm-editorial (cream + coral + dark navy)，详见 `DESIGN.md` |
| 字体 | Cormorant Garamond / Inter / JetBrains Mono (Google Fonts CDN) |

### 功能

- **Dashboard**: L1 → L2 → 人员 → 目标逐层下钻，覆盖率进度条
- **人员管理**: 姓名/工号/职级/所在地/团队/上级/标签/产品参与，多条件筛选
- **团队管理**: 团队 + 标签关联，删除级联提示
- **产品管理**: L1/L2 树状层级，负责人分配
- **目标管理**: L0(部门)/L1(产品)/L2(模块) 三级，多对多分解关联
- **标签管理**: 独立标签库，全局统一管理
- **编辑锁**: 全局独占自动获取/续期/过期，423 冲突提示
- **管理后台**: 系统状态、编辑锁管理、数据库备份下载

---

## v1.x 及更早

原型阶段数据已归档，不再维护。设计文档保留于 `ddd/` 和 `spec/v1.0/`。
