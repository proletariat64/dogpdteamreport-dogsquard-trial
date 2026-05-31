import { Router } from "express";
import { getDashboard } from "./dashboard.service.js";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const teamId = typeof req.query.teamId === "string" ? req.query.teamId : undefined;
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    sendSuccess(res, getDashboard(teamId, location));
  } catch (e) { next(e); }
});

export default router;
