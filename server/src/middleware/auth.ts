import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";
import { UserRole } from "../models/User";

export interface AuthedRequest extends Request {
  user?: { userId: string; role: UserRole };
}

/**
 * Verifies the JWT and attaches { userId, role } to req.user.
 * Every route that touches business data must use this middleware -
 * there is no "trust the frontend" path anywhere in this API.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role gate. Usage: requireRole("OWNER") or requireRole("OWNER", "ADMIN").
 * ADMIN is treated as having OWNER-level access everywhere OWNER is required.
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const effectiveRoles: UserRole[] =
      req.user.role === "ADMIN" ? ["ADMIN", "OWNER"] : [req.user.role];
    const ok = effectiveRoles.some((r) => allowed.includes(r));
    if (!ok) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }
    next();
  };
}
