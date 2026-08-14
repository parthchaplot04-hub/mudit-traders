import { Request, Response, NextFunction } from "express";

/** Centralized error handler. Never leaks stack traces in production;
 * always returns a structured, human-readable error the frontend can show. */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // eslint-disable-next-line no-console
  console.error("[error]", err);
  const status = err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV === "production"
      ? "Something went wrong. No changes were made."
      : err.message || "Something went wrong.";
  res.status(status).json({ error: message });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}
