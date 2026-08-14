import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const token = localStorage.getItem("mt_token");
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
