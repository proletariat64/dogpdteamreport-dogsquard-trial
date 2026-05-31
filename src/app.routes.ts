import { Router } from "express";
import { sendSuccess } from "./lib/response.js";
import tagRoutes from "./organization/tag.routes.js";
import teamRoutes from "./organization/team.routes.js";
import personRoutes from "./organization/person.routes.js";
import l1ProductRoutes from "./product/l1-product.routes.js";
import l2ProductRoutes from "./product/l2-product.routes.js";
import goalRoutes from "./goal/goal.routes.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import adminRoutes from "./admin/admin.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

router.post("/analytics", (_req, res) => {
  // No-op analytics sink — accepts beacon data silently
  res.status(204).send();
});

router.use("/tags", tagRoutes);
router.use("/teams", teamRoutes);
router.use("/people", personRoutes);
router.use("/products/l1", l1ProductRoutes);
router.use("/products/l2", l2ProductRoutes);
router.use("/goals", goalRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/admin", adminRoutes);

export default router;
