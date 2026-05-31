import { Router } from "express";
import { listPeople, getPerson, createPerson, updatePerson, deletePerson } from "./person.service.js";
import { sendSuccess } from "../lib/response.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const { name, teamId, location } = req.query;
    sendSuccess(res, listPeople({
      name: typeof name === "string" ? name : undefined,
      teamId: typeof teamId === "string" ? teamId : undefined,
      location: typeof location === "string" ? location : undefined,
    }));
  } catch (e) { next(e); }
});

router.get("/:id", (req, res, next) => {
  try { sendSuccess(res, getPerson(req.params.id)); } catch (e) { next(e); }
});

router.post("/", (req, res, next) => {
  try { sendSuccess(res, createPerson(req.body), 201); } catch (e) { next(e); }
});

router.put("/:id", (req, res, next) => {
  try { sendSuccess(res, updatePerson(req.params.id, req.body)); } catch (e) { next(e); }
});

router.delete("/:id", (req, res, next) => {
  try { sendSuccess(res, deletePerson(req.params.id)); } catch (e) { next(e); }
});

export default router;
