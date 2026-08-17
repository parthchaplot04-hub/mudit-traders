import { useQuery } from "@tanstack/react-query";
import { Users, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import { formatPaise } from "../../utils/format";
import { Link } from "react-router-dom";

export default function ReportsCredit() {
  const { data, isLoading } = useQuery<{ items: any[] }>({
    queryKey: ["customers-report"],
    queryFn: async () => (await api.get("/customers")).data,
  });

  if (isLoading) return <div className="text-slate-500 py-8 text-center">Loading credit report...</div>;

  const customers = data?.items || [];
  
  const customersWithCredit = customers.filter(c => c.outstandingPaise > 0);
  const totalOutstandingPaise = customersWithCredit.reduce((acc, c) => acc + c.outstandingPaise, 0);

  // Sort by highest outstanding balance first
  const sortedCustomers = [...customers].sort((a, b) => b.outstandingPaise - a.outstandingPaise);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase">Total Owed To Shop</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{formatPaise(totalOutstandingPaise)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase">Accounts in Debt</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{customersWithCredit.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Outstanding Balance</th>
                <th className="px-6 py-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCustomers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                  <td className="px-6 py-4 text-slate-600">{c.phone || "-"}</td>
                  <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{c.address || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${c.outstandingPaise > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatPaise(c.outstandingPaise)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center print:hidden">
                    <Link to={`/customers/${c._id}`} target="_blank" className="text-emerald-600 font-medium hover:underline text-xs">
                      View Ledger
                    </Link>
                  </td>
                </tr>
              ))}
              {sortedCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
