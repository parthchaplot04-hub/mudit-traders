import { Response } from "express";
import { loginSchema } from "../validators/authValidators";
import * as authService from "../services/authService";
import { AuthedRequest } from "../middleware/auth";
import { User } from "../models/User";

export async function loginController(req: AuthedRequest, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const result = await authService.login(parsed.data.phone, parsed.data.password);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Login failed" });
  }
}

export async function meController(req: AuthedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const user = await User.findById(req.user.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
}

export function logoutController(_req: AuthedRequest, res: Response) {
  // Stateless JWT: logout is a client-side token discard. Documented here so
  // the intent is explicit rather than silently doing nothing.
  return res.json({ status: "ok" });
}
