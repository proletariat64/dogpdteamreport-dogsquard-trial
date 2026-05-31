import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../errors.js";
import { sendError } from "../response.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    return sendError(
      res,
      new ValidationError("请求参数校验失败", err.errors),
    );
  }
  sendError(res, err);
}
