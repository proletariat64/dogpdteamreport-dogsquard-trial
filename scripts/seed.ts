// Seed the database with sample data via API calls
const BASE = process.env.SEED_URL || "http://localhost:8888/api";

async function post(path: string, body: unknown) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${path}: ${json.error?.message}`);
  return json.data;
}

async function seed() {
  console.log("Seeding database...");

  // Tags
  const tagFx = await post("/tags", { value: "外汇平台" });
  const tagCore = await post("/tags", { value: "核心产品" });
  const tagLead = await post("/tags", { value: "部门主管" });
  const tagSenior = await post("/tags", { value: "资深员工" });
  console.log("Tags created");

  // Teams
  const teamFx = await post("/teams", { name: "外汇团队", tagIds: [tagFx.id] });
  const teamPay = await post("/teams", { name: "支付团队", tagIds: [tagCore.id] });
  const teamPlat = await post("/teams", { name: "平台团队" });
  console.log("Teams created");

  // People
  const p1 = await post("/people", { name: "戴顺(顺凯)", employeeId: "242537", level: "18", location: "上海", teamId: teamFx.id, tagIds: [tagLead.id] });
  const p2 = await post("/people", { name: "秦彦迪(博望)", employeeId: "242538", level: "16", location: "上海", teamId: teamFx.id, managerId: p1.id, tagIds: [tagSenior.id] });
  const p3 = await post("/people", { name: "李明(子远)", employeeId: "242539", level: "15", location: "杭州", teamId: teamPay.id, managerId: p1.id });
  const p4 = await post("/people", { name: "王芳(如兰)", employeeId: "242540", level: "16", location: "上海", teamId: teamPay.id });
  const p5 = await post("/people", { name: "赵伟(鹏程)", employeeId: "242541", level: "14", location: "北京", teamId: teamPlat.id, managerId: p4.id });
  const p6 = await post("/people", { name: "孙丽(静雅)", employeeId: "242542", level: "17", location: "上海", teamId: teamPlat.id });
  const p7 = await post("/people", { name: "周强(致远)", employeeId: "242543", level: "15", location: "杭州", teamId: teamFx.id, managerId: p2.id });
  const p8 = await post("/people", { name: "吴敏(思齐)", employeeId: "242544", level: "14", location: "上海", teamId: teamPay.id, managerId: p4.id });
  console.log("People created");

  // L1 Products
  const l1a = await post("/products/l1", { name: "集中清算产品", code: "FF4010000", teamId: teamFx.id, ownerIds: [p1.id, p2.id] });
  const l1b = await post("/products/l1", { name: "跨境支付产品", code: "FF4020000", teamId: teamPay.id, ownerIds: [p3.id] });
  console.log("L1 Products created");

  // L2 Products
  const l2a1 = await post("/products/l2", { l1Id: l1a.id, name: "跨币种跨境集中清算", code: "FF4010100", ownerIds: [p2.id] });
  const l2a2 = await post("/products/l2", { l1Id: l1a.id, name: "外汇交易清算", code: "FF4010200", ownerIds: [p7.id] });
  const l2b1 = await post("/products/l2", { l1Id: l1b.id, name: "欧洲支付通道", code: "FF4020100", ownerIds: [p3.id] });
  const l2b2 = await post("/products/l2", { l1Id: l1b.id, name: "亚太支付通道", code: "FF4020200", ownerIds: [p4.id] });
  console.log("L2 Products created");

  // Assign people to L1/L2 products
  for (const pid of [p1.id, p2.id, p7.id]) {
    await fetch(BASE + `/people/${pid}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ l1ProductIds: [l1a.id], l2ProductIds: [l2a1.id] }) });
  }
  for (const pid of [p3.id, p4.id, p8.id]) {
    await fetch(BASE + `/people/${pid}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ l1ProductIds: [l1b.id] }) });
  }
  // Assign p3 to l2b1 and p4 to l2b2
  await fetch(BASE + `/people/${p3.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ l2ProductIds: [l2b1.id] }) });
  await fetch(BASE + `/people/${p4.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ l2ProductIds: [l2b2.id] }) });
  console.log("Product assignments done");

  // L0 Goals
  const g0a = await post("/goals/l0", { content: "提升部门整体交付效率", standard: "Q3 交付准时率 ≥ 90%" });
  const g0b = await post("/goals/l0", { content: "强化产品技术竞争力", standard: "完成 3 项核心技术升级" });
  console.log("L0 Goals created");

  // L1 Goals
  const g1a1 = await post("/goals/l1", { l1ProductId: l1a.id, content: "完成集中清算核心链路重构", standard: "接口响应时间 < 100ms" });
  const g1a2 = await post("/goals/l1", { l1ProductId: l1a.id, content: "优化跨境清算流程", standard: "清算成功率 ≥ 99.9%" });
  const g1b1 = await post("/goals/l1", { l1ProductId: l1b.id, content: "提升支付通道稳定性", standard: "支付通道可用性 ≥ 99.95%" });
  console.log("L1 Goals created");

  // Link L0-L1
  await post(`/goals/l0/${g0a.id}/l1-goals`, { l1GoalIds: [g1a1.id, g1a2.id] });
  await post(`/goals/l0/${g0b.id}/l1-goals`, { l1GoalIds: [g1a1.id, g1b1.id] });
  console.log("L0-L1 links created");

  // L2 Goals
  const g2a1 = await post("/goals/l2", { l2ProductId: l2a1.id, content: "完成跨境清算接口性能优化", standard: "P99 < 50ms" });
  const g2a2 = await post("/goals/l2", { l2ProductId: l2a2.id, content: "外汇交易风控规则升级", standard: "误拦截率 < 0.1%" });
  const g2b1 = await post("/goals/l2", { l2ProductId: l2b1.id, content: "欧洲支付 SEPA 接入", standard: "Q3 完成上线" });
  console.log("L2 Goals created");

  // Link L1-L2
  await post(`/goals/l1/${g1a1.id}/l2-goals`, { l2GoalIds: [g2a1.id, g2a2.id] });
  await post(`/goals/l1/${g1b1.id}/l2-goals`, { l2GoalIds: [g2b1.id] });
  console.log("L1-L2 links created");

  console.log("\nSeed complete!");
  console.log("Summary:");
  console.log(`  Tags: 4, Teams: 3, People: 8`);
  console.log(`  L1 Products: 2, L2 Products: 4`);
  console.log(`  L0 Goals: 2, L1 Goals: 3, L2 Goals: 3`);
}

seed().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
