import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Request, Response, NextFunction } from "express";
import { LockedError } from "../errors.js";
import { sendError } from "../response.js";

export interface LockState {
  locked: boolean;
  acquiredAt: string;
  lastActivityAt: string;
  holderIp: string;
}

const LOCK_FILE = join(process.cwd(), "data", "edit-lock.json");
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

let lock: LockState = { locked: false, acquiredAt: "", lastActivityAt: "", holderIp: "" };

function loadLock(): void {
  try {
    if (existsSync(LOCK_FILE)) {
      const raw = readFileSync(LOCK_FILE, "utf-8");
      const saved = JSON.parse(raw) as LockState;
      if (saved.locked) {
        const elapsed = Date.now() - new Date(saved.lastActivityAt).getTime();
        if (elapsed > INACTIVITY_TIMEOUT_MS) {
          lock = { locked: false, acquiredAt: "", lastActivityAt: "", holderIp: "" };
        } else {
          lock = saved;
        }
      }
    }
  } catch {
    lock = { locked: false, acquiredAt: "", lastActivityAt: "", holderIp: "" };
  }
}

function saveLock(): void {
  writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), "utf-8");
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function acquireLock(ip: string): boolean {
  if (lock.locked) return false;
  const now = new Date().toISOString();
  lock = { locked: true, acquiredAt: now, lastActivityAt: now, holderIp: ip };
  saveLock();
  return true;
}

export function releaseLock(): void {
  lock = { locked: false, acquiredAt: "", lastActivityAt: "", holderIp: "" };
  saveLock();
}

export function forceRelease(): void {
  releaseLock();
}

export function isLocked(): boolean {
  return lock.locked;
}

export function getLockState(): LockState {
  return { ...lock };
}

export function editLockMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith("/api/admin/")) return next();
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const ip = getClientIp(req);

  if (!lock.locked) {
    acquireLock(ip);
    return next();
  }

  if (lock.holderIp === ip) {
    lock.lastActivityAt = new Date().toISOString();
    saveLock();
    return next();
  }

  sendError(
    res,
    new LockedError(`系统正在由 ${lock.holderIp} 编辑中，自 ${lock.acquiredAt} 起`, {
      holderIp: lock.holderIp,
      acquiredAt: lock.acquiredAt,
      lastActivityAt: lock.lastActivityAt,
    }),
  );
}

// Cleanup interval: auto-expire inactive locks
setInterval(() => {
  if (lock.locked) {
    const elapsed = Date.now() - new Date(lock.lastActivityAt).getTime();
    if (elapsed > INACTIVITY_TIMEOUT_MS) {
      forceRelease();
    }
  }
}, 60_000);

// Load persisted lock state on startup
loadLock();
