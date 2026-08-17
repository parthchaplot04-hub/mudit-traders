import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(phone, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to login. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        <div className="bg-slate-900 px-8 py-10 text-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
          <img 
            src="/logo.jpg" 
            alt="Mudit Traders Logo" 
            className="w-20 h-20 rounded-full border-4 border-slate-800 mx-auto mb-4" 
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">Mudit Traders</h1>
          <p className="text-slate-400 text-sm mt-1">Store Management System</p>
        </div>

        <form onSubmit={handleLogin} className="p-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">User ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors bg-slate-50 focus:bg-white"
                  placeholder="e.g. admin@owner"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !phone || !password}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30 disabled:opacity-50 disabled:shadow-none transition-all mt-4"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </div>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
            Nimish Web Services
          </p>
        </div>
      </div>
    </div>
  );
}
