import { Router } from "express";
import { listTeams, getTeam, createTeam, updateTeam, deleteTeam } from "./team.service.js";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try { sendSuccess(res, listTeams()); } catch (e) { next(e); }
});

router.get("/:id", (req, res, next) => {
  try { sendSuccess(res, getTeam(req.params.id)); } catch (e) { next(e); }
});

router.post("/", (req, res, next) => {
  try { sendSuccess(res, createTeam(req.body), 201); } catch (e) { next(e); }
});

router.put("/:id", (req, res, next) => {
  try { sendSuccess(res, updateTeam(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/:id", (req, res, next) => {
  try { sendSuccess(res, deleteTeam(req.params.id)); } catch (e) { next(e); }
});

export default router;
