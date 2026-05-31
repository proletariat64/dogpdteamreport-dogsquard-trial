import { Router } from "express";
import { sendSuccess } from "../lib/response.js";
import {
  listL0, getL0, createL0, updateL0, deleteL0,
  listL1, getL1, createL1, updateL1, deleteL1,
  listL2, getL2, createL2, updateL2, deleteL2,
} from "./goal.service.js";
import {
  getL0L1Goals, linkL0ToL1, unlinkL0FromL1,
  getL1L2Goals, linkL1ToL2, unlinkL1FromL2,
} from "./goal-link.service.js";

const router = Router();

// ── L0 Goals ──
router.get("/l0", (_req, res, next) => {
  try { sendSuccess(res, listL0()); } catch (e) { next(e); }
});

router.get("/l0/:id", (req, res, next) => {
  try { sendSuccess(res, getL0(req.params.id)); } catch (e) { next(e); }
});

router.post("/l0", (req, res, next) => {
  try { sendSuccess(res, createL0(req.body), 201); } catch (e) { next(e); }
});

router.put("/l0/:id", (req, res, next) => {
  try { sendSuccess(res, updateL0(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/l0/:id", (req, res, next) => {
  try { sendSuccess(res, deleteL0(req.params.id)); } catch (e) { next(e); }
});

// ── L1 Goals ──
router.get("/l1", (req, res, next) => {
  try {
    const l1ProductId = typeof req.query.l1ProductId === "string" ? req.query.l1ProductId : undefined;
    sendSuccess(res, listL1(l1ProductId));
  } catch (e) { next(e); }
});

router.get("/l1/:id", (req, res, next) => {
  try { sendSuccess(res, getL1(req.params.id)); } catch (e) { next(e); }
});

router.post("/l1", (req, res, next) => {
  try { sendSuccess(res, createL1(req.body), 201); } catch (e) { next(e); }
});

router.put("/l1/:id", (req, res, next) => {
  try { sendSuccess(res, updateL1(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/l1/:id", (req, res, next) => {
  try { sendSuccess(res, deleteL1(req.params.id)); } catch (e) { next(e); }
});

// ── L2 Goals ──
router.get("/l2", (req, res, next) => {
  try {
    const l2ProductId = typeof req.query.l2ProductId === "string" ? req.query.l2ProductId : undefined;
    sendSuccess(res, listL2(l2ProductId));
  } catch (e) { next(e); }
});

router.get("/l2/:id", (req, res, next) => {
  try { sendSuccess(res, getL2(req.params.id)); } catch (e) { next(e); }
});

router.post("/l2", (req, res, next) => {
  try { sendSuccess(res, createL2(req.body), 201); } catch (e) { next(e); }
});

router.put("/l2/:id", (req, res, next) => {
  try { sendSuccess(res, updateL2(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/l2/:id", (req, res, next) => {
  try { sendSuccess(res, deleteL2(req.params.id)); } catch (e) { next(e); }
});

// ── Goal Linking: L0 ↔ L1 ──
router.get("/l0/:id/l1-goals", (req, res, next) => {
  try { sendSuccess(res, getL0L1Goals(req.params.id)); } catch (e) { next(e); }
});

router.post("/l0/:id/l1-goals", (req, res, next) => {
  try { sendSuccess(res, linkL0ToL1(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/l0/:id/l1-goals/:l1GoalId", (req, res, next) => {
  try { sendSuccess(res, unlinkL0FromL1(req.params.id, req.params.l1GoalId)); } catch (e) { next(e); }
});

// ── Goal Linking: L1 ↔ L2 ──
router.get("/l1/:id/l2-goals", (req, res, next) => {
  try { sendSuccess(res, getL1L2Goals(req.params.id)); } catch (e) { next(e); }
});

router.post("/l1/:id/l2-goals", (req, res, next) => {
  try { sendSuccess(res, linkL1ToL2(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/l1/:id/l2-goals/:l2GoalId", (req, res, next) => {
  try { sendSuccess(res, unlinkL1FromL2(req.params.id, req.params.l2GoalId)); } catch (e) { next(e); }
});

export default router;
