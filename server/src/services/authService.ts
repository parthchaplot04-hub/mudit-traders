import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, IUser, UserRole } from "../models/User";

interface TokenPayload {
  userId: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

export function signToken(user: IUser): string {
  const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function login(phone: string, password: string) {
  const user = await User.findOne({ phone, active: true });
  if (!user) throw new AuthError("Invalid phone number or password");

  const valid = await user.comparePassword(password);
  if (!valid) throw new AuthError("Invalid phone number or password");

  const token = signToken(user);
  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  };
}

export async function createUser(input: {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
}) {
  const existing = await User.findOne({ phone: input.phone });
  if (existing) throw new AuthError("A user with this phone number already exists", 409);

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    phone: input.phone,
    passwordHash,
    role: input.role,
  });
  return user;
}
