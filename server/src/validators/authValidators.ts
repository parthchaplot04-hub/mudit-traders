import { z } from "zod";

export const loginSchema = z.object({
  phone: z.string().min(6).max(15),
  password: z.string().min(4),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6).max(15),
  password: z.string().min(6),
  role: z.enum(["OWNER", "STAFF", "ADMIN"]),
});
