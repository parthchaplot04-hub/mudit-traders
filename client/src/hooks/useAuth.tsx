import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import type { AuthUser } from "../types";
import { api } from "../lib/api";

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isOwner: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, check if we have a token and try to fetch /me
    const token = localStorage.getItem("mt_token");
    if (token) {
      api.get("/auth/me")
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem("mt_user", JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem("mt_token");
          localStorage.removeItem("mt_user");
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.post("/auth/login", { phone, password });
    const { token, user: loggedInUser } = res.data;
    
    localStorage.setItem("mt_token", token);
    localStorage.setItem("mt_user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("mt_token");
    localStorage.removeItem("mt_user");
    setUser(null);
    api.post("/auth/logout").catch(console.error);
    window.location.href = "/login";
  }, []);

  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
