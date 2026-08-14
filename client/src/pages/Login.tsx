import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../lib/api";

interface LoginForm {
  phone: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    setError(null);
    setSubmitting(true);
    try {
      await login(data.phone, data.password);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 text-center">Mudit Traders</h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">Store management sign in</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
            <input
              {...register("phone", { required: true })}
              type="tel"
              inputMode="numeric"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="10-digit phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              {...register("password", { required: true })}
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
