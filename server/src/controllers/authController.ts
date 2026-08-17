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

export async function setupController(req: AuthedRequest, res: Response) {
  try {
    const owner = await User.findOneAndUpdate(
      { phone: "admin@owner" },
      {
        name: "Admin (Owner)",
        phone: "admin@owner",
        passwordHash: await authService.hashPassword("admin@46568"),
        role: "OWNER",
        active: true,
      },
      { upsert: true, new: true }
    );
    
    const staff = await User.findOneAndUpdate(
      { phone: "staff@shop" },
      {
        name: "Staff",
        phone: "staff@shop",
        passwordHash: await authService.hashPassword("staff@99509"),
        role: "STAFF",
        active: true,
      },
      { upsert: true, new: true }
    );
    
    return res.json({ 
      message: "Setup successful. Users created.",
      users: [
        { id: owner._id, name: owner.name, phone: owner.phone, role: owner.role },
        { id: staff._id, name: staff.name, phone: staff.phone, role: staff.role }
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Setup failed", details: err.message });
  }
}
