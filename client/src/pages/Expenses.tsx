import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Receipt } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatPaise } from "../utils/format";

export default function Expenses() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [expenseDate, setExpenseDate] = useState(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ items: any[] }>({
    queryKey: ["expenses"],
    queryFn: async () => (await api.get("/expenses")).data,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/expenses", { 
        title, 
        amountRupees: parseFloat(amount),
        description,
        paymentMode,
        expenseDate: new Date(expenseDate).toISOString()
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
      setTitle("");
      setAmount("");
      setDescription("");
      setPaymentMode("CASH");
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="text-emerald-600" />
            Expenses
          </h1>
          <p className="text-slate-500 text-sm mt-1">Record and track store expenses.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
        >
          <Plus size={16} /> Record Expense
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td>
                </tr>
              )}
              {data && data.items.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">No expenses recorded yet.</td>
                </tr>
              )}
              {data?.items.map((exp) => (
                <tr key={exp._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    {new Date(exp.expenseDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{exp.title}</p>
                    {exp.description && <p className="text-xs text-slate-500 line-clamp-1">{exp.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                      {exp.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {exp.userId?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-rose-600">
                    -{formatPaise(exp.amountPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-slate-900">Record Expense</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title / Category</label>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Electricity Bill, Tea, Maintenance" 
                  className="input w-full" 
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="input w-full font-semibold text-rose-600" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={expenseDate} 
                    onChange={(e) => setExpenseDate(e.target.value)} 
                    className="input w-full" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-5 gap-2">
                  {['CASH', 'UPI', 'NEFT', 'CHEQUE', 'OTHER'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMode(method)}
                      className={`py-1.5 text-xs font-bold rounded border transition-colors ${
                        paymentMode === method 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Any additional notes..." 
                  className="input w-full resize-none h-20" 
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              
              <button
                onClick={() => createMutation.mutate()}
                disabled={!title || !amount || createMutation.isPending}
                className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors mt-2 shadow-sm"
              >
                {createMutation.isPending ? "Recording..." : "Record Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
