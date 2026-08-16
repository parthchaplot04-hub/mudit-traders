import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Truck, Building2,
  RefreshCcw, Trash2, ClipboardList, LogOut, Menu, X, FileText
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "Sales (POS)", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/orders", label: "Orders (Large)", icon: ClipboardList },
  { to: "/purchases", label: "Purchases", icon: Truck },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/reorder", label: "Reorder", icon: RefreshCcw },
  { to: "/wastage", label: "Wastage", icon: Trash2 },
  { to: "/stocktake", label: "Stocktake", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: FileText },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="print-hidden hidden md:flex md:flex-col w-60 bg-slate-900 text-slate-100 shrink-0">
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
          <img src="/logo.jpg" alt="Mudit Traders Logo" className="w-10 h-10 rounded-full border border-slate-700" />
          <div>
            <h1 className="text-lg font-bold leading-tight">Mudit Traders</h1>
            <p className="text-xs text-slate-400 mt-0.5">{user?.name} · {user?.role}</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-5 py-4 text-sm text-slate-300 hover:bg-slate-800 border-t border-slate-800"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="print-hidden md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Mudit Traders Logo" className="w-8 h-8 rounded-full border border-slate-700" />
          <h1 className="text-base font-bold">Mudit Traders</h1>
        </div>
        <button onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-900 text-white pt-16 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium ${
                    isActive ? "bg-emerald-600" : "text-slate-300"
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 text-base text-slate-300"
            >
              <LogOut size={20} /> Logout
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav for the most-used screens */}
      <nav className="print-hidden md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex justify-around py-2">
        {[navItems[0], navItems[1], navItems[2], navItems[4]].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
                isActive ? "text-emerald-600" : "text-slate-500"
              }`
            }
          >
            <item.icon size={20} />
            {item.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
