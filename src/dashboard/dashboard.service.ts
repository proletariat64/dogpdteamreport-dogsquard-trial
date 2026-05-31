import { all, getDb } from "../lib/db.js";

interface L1ProductRow { id: string; name: string; code: string; team_id: string | null; }
interface TeamRow { id: string; name: string; }
interface L2ProductRow { id: string; name: string; code: string; l1_id: string; }
interface PersonRow { id: string; name: string; level: string | null; }

export function getDashboard(teamId?: string, location?: string) {
  const db = getDb();

  let l1Where = "WHERE 1=1";
  const l1Params: string[] = [];
  if (teamId) { l1Where += " AND l1.team_id = ?"; l1Params.push(teamId); }

  const l1Products = all<L1ProductRow>(
    `SELECT l1.* FROM l1_products l1 ${l1Where} ORDER BY l1.created_at DESC`,
    l1Params,
  );

  return l1Products.map((l1) => {
    // Team
    const team = l1.team_id
      ? (() => {
          const stmt = db.prepare("SELECT id, name FROM teams WHERE id = ?");
          stmt.bind([l1.team_id]);
          let t: TeamRow | null = null;
          if (stmt.step()) t = stmt.getAsObject() as unknown as TeamRow;
          stmt.free();
          return t;
        })()
      : null;

    // L2 products under this L1
    const l2Products = all<L2ProductRow>(
      "SELECT * FROM l2_products WHERE l1_id = ? ORDER BY created_at", [l1.id],
    );

    // People count: distinct owners + participants for this L1
    const pplInL1 = new Set(
      all<{ person_id: string }>(
        "SELECT person_id FROM l1_product_owners WHERE l1_product_id = ? UNION SELECT person_id FROM person_l1_products WHERE l1_product_id = ?",
        [l1.id, l1.id],
      ).map((r) => r.person_id),
    );

    // People in L2s under this L1
    const pplInL2s = new Set<string>();
    for (const l2 of l2Products) {
      const l2People = all<{ person_id: string }>(
        "SELECT person_id FROM l2_product_owners WHERE l2_product_id = ? UNION SELECT person_id FROM person_l2_products WHERE l2_product_id = ?",
        [l2.id, l2.id],
      );
      for (const p of l2People) pplInL2s.add(p.person_id);
    }

    const peopleCount = pplInL1.size;
    const coveragePercent = peopleCount > 0
      ? Math.floor((pplInL2s.size / peopleCount) * 100)
      : 0;

    // L1 Goals
    const l1Goals = all<{ id: string; content: string; standard: string | null }>(
      "SELECT id, content, standard FROM l1_goals WHERE l1_product_id = ? ORDER BY created_at", [l1.id],
    );

    // L2 Goals for all L2 products under this L1
    const l2GoalCount = l2Products.reduce((sum, l2) => {
      const stmt = db.prepare("SELECT COUNT(*) as cnt FROM l2_goals WHERE l2_product_id = ?");
      stmt.bind([l2.id]);
      if (stmt.step()) sum += stmt.getAsObject().cnt as number;
      stmt.free();
      return sum;
    }, 0);

    // Build L2 nodes
    const l2Nodes = l2Products.map((l2) => {
      const l2Ppl = all<PersonRow>(
        `SELECT DISTINCT p.id, p.name, p.level
         FROM people p
         LEFT JOIN l2_product_owners o ON p.id = o.person_id AND o.l2_product_id = ?
         LEFT JOIN person_l2_products pl ON p.id = pl.person_id AND pl.l2_product_id = ?
         WHERE o.person_id IS NOT NULL OR pl.person_id IS NOT NULL`,
        [l2.id, l2.id],
      );

      const l2Goals = all<{ id: string; content: string; standard: string | null }>(
        "SELECT id, content, standard FROM l2_goals WHERE l2_product_id = ? ORDER BY created_at", [l2.id],
      );

      return {
        l2Product: { id: l2.id, name: l2.name, code: l2.code },
        people: l2Ppl,
        l2Goals,
      };
    });

    // Unassigned: people in L1 but not in any L2
    const unassignedPeople: PersonRow[] = [];
    for (const pid of pplInL1) {
      if (!pplInL2s.has(pid)) {
        const p = (() => {
          const stmt = db.prepare("SELECT id, name, level FROM people WHERE id = ?");
          stmt.bind([pid]);
          let r: PersonRow | null = null;
          if (stmt.step()) r = stmt.getAsObject() as unknown as PersonRow;
          stmt.free();
          return r;
        })();
        if (p) unassignedPeople.push(p);
      }
    }

    // Apply location filter
    const filterPeople = (ppl: PersonRow[]) => {
      if (!location) return ppl;
      return ppl.filter((p) => {
        const stmt = db.prepare("SELECT location FROM people WHERE id = ?");
        stmt.bind([p.id]);
        let loc: string | null = null;
        if (stmt.step()) loc = stmt.getAsObject().location as string | null;
        stmt.free();
        return loc === location;
      });
    };

    return {
      l1Product: {
        id: l1.id,
        name: l1.name,
        code: l1.code,
        team,
      },
      metrics: {
        l2Count: l2Products.length,
        peopleCount,
        l1GoalCount: l1Goals.length,
        l2GoalCount,
        coveragePercent,
      },
      l1Goals,
      l2Nodes: l2Nodes.map((n) => ({
        ...n,
        people: filterPeople(n.people),
      })),
      unassignedPeople: filterPeople(unassignedPeople),
    };
  });
}
