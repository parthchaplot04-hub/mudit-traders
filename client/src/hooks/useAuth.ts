import { useCallback, useState } from "react";
import { api } from "../lib/api";
import type { AuthUser } from "../types";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("mt_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.post("/auth/login", { phone, password });
    localStorage.setItem("mt_token", res.data.token);
    localStorage.setItem("mt_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user as AuthUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("mt_token");
    localStorage.removeItem("mt_user");
    setUser(null);
  }, []);

  return { user, login, logout, isOwner: user?.role === "OWNER" || user?.role === "ADMIN" };
}
