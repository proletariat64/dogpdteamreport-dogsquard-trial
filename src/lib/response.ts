import type { Response } from "express";

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendError(res: Response, err: unknown): void {
  if (err instanceof Error && "status" in err && "code" in err) {
    const e = err as Error & { status: number; code: string; details?: unknown };
    res.status(e.status).json({
      success: false,
      error: { code: e.code, message: e.message, details: e.details },
    });
    return;
  }
  if (err instanceof Error) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
    return;
  }
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Unknown error" },
  });
}
