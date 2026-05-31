import { Router } from "express";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { sendSuccess, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getStatus, createBackup, listBackups, forceRelease } from "./admin.service.js";

const router = Router();

// Note: /api/admin/* routes are exempt from edit lock (in edit-lock middleware)

router.get("/status", (req, res, next) => {
  try { sendSuccess(res, getStatus(req.ip)); } catch (e) { next(e); }
});

router.post("/backup", (_req, res, next) => {
  try { sendSuccess(res, createBackup(), 201); } catch (e) { next(e); }
});

router.get("/backups", (_req, res, next) => {
  try { sendSuccess(res, listBackups()); } catch (e) { next(e); }
});

router.get("/backup/:filename", (req, res, next) => {
  try {
    const filepath = join(process.cwd(), "data", "backups", req.params.filename);
    if (!existsSync(filepath)) throw new NotFoundError(`备份文件 ${req.params.filename} 不存在`);
    res.download(filepath);
  } catch (e) { next(e); }
});

router.delete("/lock", (_req, res, next) => {
  try { sendSuccess(res, forceRelease()); } catch (e) { next(e); }
});

export default router;
