import { Router } from "express";
import { listTags, createTag, updateTag, deleteTag } from "./tag.service.js";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try {
    sendSuccess(res, listTags());
  } catch (e) {
    next(e);
  }
});

router.post("/", (req, res, next) => {
  try {
    const tag = createTag(req.body);
    sendSuccess(res, tag, 201);
  } catch (e) {
    next(e);
  }
});

router.put("/:id", (req, res, next) => {
  try { sendSuccess(res, updateTag(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/:id", (req, res, next) => {
  try {
    sendSuccess(res, deleteTag(req.params.id));
  } catch (e) {
    next(e);
  }
});

export default router;
