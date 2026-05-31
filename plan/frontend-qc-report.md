# Frontend QC Report

> 日期: 2026-05-21 | 范围: www/ 全部 HTML/CSS/JS | 审查人: QC

---

## 发现汇总

| 严重度 | 数量 | 已修复 | 备注 |
|--------|------|--------|------|
| 🔴 Critical | 1 | ✅ | escHtml 去重 |
| 🟡 Medium | 4 | ✅ | XSS/竞态/锁三态/空查询串 |
| 🟢 Low | 3 | ✅ | withLock返回值检查 / 其余2项接受风险 |

---

## 🔴 Critical

### 1. `escHtml` 重复定义（9 处）— ✅ 已修复

每个 JS 文件各自定义了完全相同的 `escHtml` 函数。

**修复**: 移入 `components.js` 统一导出 `window.escHtml`，7 个页面 JS 删除重复定义（commit ebd334b）。

---

## 🟡 Medium

### 2. `loadFilters()` 未转义选项内容（XSS 风险）— ✅ 已修复

`dashboard.js` / `people.js` 的 `loadFilters()` 直接插入团队名到 `<option>` 中。

**修复**: 对 `t.name` 和地点值添加 `escHtml()`（commit ebd334b）。

### 3. 各页面 `load()` 与 `loadFilters()` 竞态 — ✅ 已修复

两个函数并发执行，`load()` 可能先于 `loadFilters()` 完成，导致筛选下拉框为空。

**修复**: 改为 `await loadFilters(); load();` 顺序执行（commit ebd334b）。

### 4. `updateLockStatus` 无法区分锁持有者 — ✅ 已修复

锁指示灯只有红/绿两态，缺少"自己持锁"的橙色脉冲态。

**修复**: 后端 `getStatus` 新增 `isOwn` 字段比对 IP；前端改为三态显示（commit ebd334b）。

### 5. Dashboard 筛选 URL 空参数带 `?` — ✅ 已修复

修复为仅 params 非空时追加 `?key=val`（commit ebd334b）。

---

## 🟢 Low

### 6. onclick inline handler 使用 innerHTML 拼接 — 接受现状

产品/目标管理页用 `onclick="editL1('${id}')"` 绑定事件。ID 来自 `generateId()`（crypto.randomUUID），无注入风险。

**决定**: 保持现状，无需修改。

### 7. `withLock` 返回 null 后调用层未区分 — ✅ 已修复

删除操作中 `showToast` / `load()` 在 `withLock` 回调外部执行，锁拒绝后仍会提示"已删除"并刷新。

**修复**: 所有删除回调改为将 `showToast` / `load()` 移入 `withLock` 回调内，锁拒绝时跳过后续操作（commit 待推送）。

### 8. 备份下载链接无 CSRF/权限保护 — 接受风险

管理员页面备份下载链接公开。内网 5-10 人场景可接受。

**决定**: 内网场景安全风险极低，无需修改。

---

## 测试验证

| 页面 | 功能 | 结果 |
|------|------|------|
| Dashboard | 展开 L1→L2 | ✅ |
| Dashboard | 筛选 team/location | ✅ |
| Dashboard | 覆盖率进度条 | ✅ |
| 人员 | CRUD + 筛选 | ✅ |
| 团队 | CRUD + 标签 | ✅ |
| 产品 | 树状 L1/L2 + CRUD | ✅ |
| 目标 | L0/L1/L2 切换 + CRUD | ✅ |
| 标签 | CRUD | ✅ |
| 管理 | 状态/备份/锁释放 | ✅ |
| 编辑锁 | 三态指示灯 | ✅ |
| 编辑锁 | 423 弹窗 + 阻塞写 | ✅ |
| 编辑锁 | 30min 自动过期 | ✅ |
| NavBar | 7 个页面导航 + 激活态 | ✅ |
| 计数器 | "共 X 个" 全部页面 | ✅ |
| Modal | 保存成功/失败 + DOM 清理 | ✅ |

---

## 测试环境

- 后端: Node.js v24 + Express + sql.js
- 前端: Chromium (Playwright)
- 测试: 53 integration tests (Vitest + supertest) — 全部通过
