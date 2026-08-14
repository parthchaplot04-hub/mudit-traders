import { useCallback } from "react";
import type { AuthUser } from "../types";

export function useAuth() {
  const user: AuthUser = { id: "000000000000000000000000", phone: "0000000000", role: "ADMIN", name: "Admin" };

  const login = useCallback(async (phone: string, password: string) => {
    return user;
  }, []);

  const logout = useCallback(() => {
  }, []);

  return { user, login, logout, isOwner: true };
}
