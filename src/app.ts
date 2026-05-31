import express from "express";
import helmet from "helmet";
import compression from "compression";
import { join } from "node:path";
import { editLockMiddleware } from "./lib/middleware/edit-lock.js";
import { errorHandler } from "./lib/middleware/error-handler.js";
import appRoutes from "./app.routes.js";

export function createApp(): express.Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json());
  app.use(editLockMiddleware);

  app.use("/api", appRoutes);

  const wwwRoot = join(process.cwd(), "www");
  app.use(express.static(wwwRoot));

  app.use(errorHandler);

  return app;
}
