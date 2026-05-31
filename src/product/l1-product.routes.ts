import { Router } from "express";
import { listL1, getL1, createL1, updateL1, deleteL1 } from "./l1-product.service.js";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try { sendSuccess(res, listL1()); } catch (e) { next(e); }
});

router.get("/:id", (req, res, next) => {
  try { sendSuccess(res, getL1(req.params.id)); } catch (e) { next(e); }
});

router.post("/", (req, res, next) => {
  try { sendSuccess(res, createL1(req.body), 201); } catch (e) { next(e); }
});

router.put("/:id", (req, res, next) => {
  try { sendSuccess(res, updateL1(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/:id", (req, res, next) => {
  try { sendSuccess(res, deleteL1(req.params.id)); } catch (e) { next(e); }
});

export default router;
