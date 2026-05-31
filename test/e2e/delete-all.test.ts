/**
 * Test Case 1: 全量删除 E2E
 * 目标环境: ifundaitest.inc.alipay.net:8887
 * 使用 Playwright 模拟真实用户操作，逐条删除所有记录
 * 验证方式：SSH 到目标服务器直接 SQL 查询数据库确认
 */
import { chromium, type Page } from "playwright";
import { execSync } from "node:child_process";
import { join } from "node:path";

const BASE_URL = "http://ifundaitest.inc.alipay.net:8887";
const SSH_HOST = "ifundaitest";
const DB_PATH = "www/data/app.db";

// 主表
const MAIN_TABLES = ["tags", "teams", "people", "l1_products", "l2_products",
  "l0_goals", "l1_goals", "l2_goals"];
// 关联表
const JOIN_TABLES = ["team_tags", "person_tags", "l1_product_owners",
  "l2_product_owners", "person_l1_products", "person_l2_products",
  "l0_goal_l1_goals", "l1_goal_l2_goals"];

// ── SSH SQL 查询（上传 Python 脚本到远端执行，避免 shell 转义问题） ──
const REMOTE_SCRIPT = "/tmp/e2e-count.py";

function buildPyScript(tables: string[]): string {
  const tblArr = tables.map(t => `"${t}"`).join(",");
  return `import sqlite3
db=sqlite3.connect("${DB_PATH}")
for t in [${tblArr}]:
    c=db.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(f"{t}:{c}")
db.close()`;
}

function sshCount(tables: string[]): Record<string, number> {
  // 写入本地临时脚本并上传
  const script = buildPyScript(tables);
  execSync(`ssh ${SSH_HOST} "cat > ${REMOTE_SCRIPT}"`, {
    encoding: "utf-8",
    timeout: 10000,
    input: script,
  });
  // 执行
  const raw = execSync(`ssh ${SSH_HOST} "python3 ${REMOTE_SCRIPT}"`, {
    encoding: "utf-8",
    timeout: 15000,
  }).trim();
  // 解析
  const counts: Record<string, number> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^(\w+):(\d+)$/);
    if (m) counts[m[1]] = parseInt(m[2], 10);
  }
  return counts;
}

function queryCounts(tables: string[]): Record<string, number> {
  return sshCount(tables);
}

function assertTableEmpty(table: string, label: string): void {
  const counts = sshCount([table]);
  const cnt = counts[table] ?? -1;
  if (cnt !== 0) {
    throw new Error(`断言失败: ${label}(${table}) 仍有 ${cnt} 条记录`);
  }
  console.log(`  ✓ ${label} 已清空`);
}

// ── 删除辅助函数 ──

/** 在页面上找到所有删除按钮，逐个点击并确认，直到全部删完 */
async function deleteAllFromPage(
  page: Page,
  deleteBtnSelector: string,
  label: string,
  expandSelector?: string,
) {
  let total = 0;
  while (true) {
    // 如果需要先展开
    if (expandSelector) {
      const expandBtns = page.locator(expandSelector);
      const expandCount = await expandBtns.count();
      for (let i = 0; i < expandCount; i++) {
        await expandBtns.nth(i).click();
        await page.waitForTimeout(200);
      }
    }

    const btns = page.locator(deleteBtnSelector);
    const n = await btns.count();
    if (n === 0) break;

    // evaluate 触发原生 click 创建 modal（mouse.click 坐标可能因远程页面布局偏移而失败）
    await btns.first().evaluate((el: HTMLElement) => el.click());
    await page.waitForSelector(".modal-overlay", { timeout: 3000 });
    // 确认删除（evaluate 点击，避免远程页面 mouse.click 坐标偏移）
    await page.locator(".modal .btn-danger").first().evaluate((el: HTMLElement) => el.click());
    await page.waitForSelector(".toast", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    total++;
  }
  console.log(`  删除了 ${total} 个${label}`);
  return total;
}

// ── 主测试流程 ──

async function main() {
  const startCounts = queryCounts(MAIN_TABLES);
  console.log("初始数据:");
  for (const [k, v] of Object.entries(startCounts)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
  console.log("");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  let totalDeleted = 0;

  try {
    // === 1. 目标页面：先删 L2 → L1 → L0 ===
    console.log("【1/6】删除目标...");
    await page.goto(`${BASE_URL}/goals.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // L2 目标
    await page.locator('button[data-tab="l2"]').evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);
    totalDeleted += await deleteAllFromPage(page,
      'button[onclick^="deleteGoal("]', "L2目标",
    );

    // L1 目标
    await page.locator('button[data-tab="l1"]').evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);
    totalDeleted += await deleteAllFromPage(page,
      'button[onclick^="deleteGoal("]', "L1目标",
    );

    // L0 目标
    await page.locator('button[data-tab="l0"]').evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);
    totalDeleted += await deleteAllFromPage(page,
      'button[onclick^="deleteGoal("]', "L0目标",
    );

    assertTableEmpty("l0_goals", "L0目标");
    assertTableEmpty("l1_goals", "L1目标");
    assertTableEmpty("l2_goals", "L2目标");

    // === 2. 产品页面：先删 L2（需展开 L1），再删 L1 ===
    console.log("\n【2/6】删除产品...");
    await page.goto(`${BASE_URL}/products.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    await deleteAllFromPage(page,
      'button[onclick^="deleteL2("]', "L2产品",
      '.card div[style*="display:flex"]',
    );

    await deleteAllFromPage(page,
      'button[onclick*="deleteL1("]', "L1产品",
    );

    assertTableEmpty("l2_products", "L2产品");
    assertTableEmpty("l1_products", "L1产品");

    // === 3. 人员页面 ===
    console.log("\n【3/6】删除人员...");
    await page.goto(`${BASE_URL}/people.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    totalDeleted += await deleteAllFromPage(page,
      'button[onclick^="deletePerson("]', "人员",
    );
    assertTableEmpty("people", "人员");

    // === 4. 团队页面 ===
    console.log("\n【4/6】删除团队...");
    await page.goto(`${BASE_URL}/teams.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    totalDeleted += await deleteAllFromPage(page,
      'button[onclick^="deleteTeam("]', "团队",
    );
    assertTableEmpty("teams", "团队");

    // === 5. 标签页面 ===
    console.log("\n【5/6】删除标签...");
    await page.goto(`${BASE_URL}/tags.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    totalDeleted += await deleteAllFromPage(page,
      'button[onclick^="deleteTag("]', "标签",
    );
    assertTableEmpty("tags", "标签");

    // === 6. SSH SQL 最终验证 ===
    console.log("\n【6/6】最终 SQL 验证 (SSH)...");
    const finalCounts = queryCounts(MAIN_TABLES);
    let allEmpty = true;
    for (const [k, v] of Object.entries(finalCounts)) {
      if (v !== 0) {
        console.log(`  ✗ ${k}: ${v} 条未删干净`);
        allEmpty = false;
      }
    }
    if (allEmpty) {
      console.log("  ✓ 所有主表记录已全部清空（0 条）");
    }

    // 关联表验证
    const joinCounts = queryCounts(JOIN_TABLES);
    for (const [k, v] of Object.entries(joinCounts)) {
      if (v !== 0) {
        console.log(`  ✗ 关联表 ${k}: ${v} 条残留`);
        allEmpty = false;
      }
    }
    if (allEmpty) {
      console.log("  ✓ 所有关联表也已清空（0 条）");
    }

    console.log(`\n=== 测试完成 ===`);
    console.log(`删除操作总数: ${totalDeleted}`);
    console.log(`测试结果: ${allEmpty ? "通过" : "失败"}`);
  } catch (err) {
    console.error("\n测试执行异常:", err);
    await page.screenshot({ path: join(process.cwd(), "test", "error-screenshot.png") });
    console.error("已保存错误截图到 test/error-screenshot.png");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
