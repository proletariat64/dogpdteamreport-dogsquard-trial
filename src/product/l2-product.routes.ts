import { Router } from "express";
import { listL2, getL2, createL2, updateL2, deleteL2 } from "./l2-product.service.js";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const l1Id = typeof req.query.l1Id === "string" ? req.query.l1Id : undefined;
    sendSuccess(res, listL2(l1Id));
  } catch (e) { next(e); }
});

router.get("/:id", (req, res, next) => {
  try { sendSuccess(res, getL2(req.params.id)); } catch (e) { next(e); }
});

router.post("/", (req, res, next) => {
  try { sendSuccess(res, createL2(req.body), 201); } catch (e) { next(e); }
});

router.put("/:id", (req, res, next) => {
  try { sendSuccess(res, updateL2(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/:id", (req, res, next) => {
  try { sendSuccess(res, deleteL2(req.params.id)); } catch (e) { next(e); }
});

export default router;
