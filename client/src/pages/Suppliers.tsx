import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatPaise } from "../utils/format";
import type { Supplier } from "../types";
import CsvToolbar from "../components/CsvToolbar";

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const [historyTarget, setHistoryTarget] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery<{ items: Supplier[] }>({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data,
  });

  const { data: ledgerHistory, isLoading: loadingHistory } = useQuery<{ items: any[] }>({
    queryKey: ["supplier-ledger", historyTarget?._id],
    queryFn: async () => (await api.get(`/suppliers/${historyTarget!._id}/ledger`)).data,
    enabled: !!historyTarget,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/suppliers", { supplierName: name, phone, openingOutstandingRupees: 0 })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowForm(false);
      setName("");
      setPhone("");
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/suppliers/${payTarget!._id}/payments`, { 
        amountRupees: parseFloat(payAmount),
        paymentMode: payMode
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setPayTarget(null);
      setPayAmount("");
      setPayMode("CASH");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <div className="flex items-center gap-3">
          <CsvToolbar
            exportPath="/csv/suppliers/export"
            importPath="/csv/suppliers/import"
            downloadFilename="suppliers.csv"
            onImported={() => queryClient.invalidateQueries({ queryKey: ["suppliers"] })}
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {isLoading && <p className="text-center py-10 text-slate-400">Loading...</p>}
        {data?.items.map((s) => (
          <div key={s._id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-slate-800">{s.supplierName}</p>
              {s.phone && <p className="text-xs text-slate-400">{s.phone}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-semibold ${s.currentOutstandingPaise > 0 ? "text-orange-600" : "text-slate-700"}`}>
                {formatPaise(s.currentOutstandingPaise)}
              </span>
              <button
                onClick={() => setHistoryTarget(s)}
                className="text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50"
              >
                History
              </button>
              <button
                onClick={() => setPayTarget(s)}
                className="text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-50"
              >
                Record Payment
              </button>
            </div>
          </div>
        ))}
        {data && data.items.length === 0 && !isLoading && (
          <p className="text-center py-10 text-slate-400">No suppliers yet</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Supplier</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" className="input w-full" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="input w-full" />
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {createMutation.isPending ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Pay {payTarget.supplierName}</h2>
              <button onClick={() => setPayTarget(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              Current outstanding: <span className="font-semibold text-orange-600">{formatPaise(payTarget.currentOutstandingPaise)}</span>
            </p>
            
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['CASH', 'UPI', 'NEFT', 'CHEQUE', 'OTHER'].map(method => (
                <button
                  key={method}
                  onClick={() => setPayMode(method)}
                  className={`py-1.5 text-xs font-bold rounded border ${payMode === method ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {method}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1">Amount</label>
            <input
              type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount (₹)" className="input w-full mb-4"
            />
            <button
              onClick={() => paymentMutation.mutate()}
              disabled={!payAmount || paymentMutation.isPending}
              className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {paymentMutation.isPending ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </div>
      )}

      {historyTarget && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{historyTarget.supplierName}</h2>
                <p className="text-xs text-slate-500">Ledger History</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Current Outstanding:</span>
              <span className={`font-bold text-lg ${historyTarget.currentOutstandingPaise > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {formatPaise(historyTarget.currentOutstandingPaise)}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <p className="text-center text-slate-400 mt-10">Loading history...</p>
              ) : ledgerHistory?.items.length === 0 ? (
                <p className="text-center text-slate-400 mt-10">No transactions recorded yet.</p>
              ) : (
                ledgerHistory?.items.map(entry => (
                  <div key={entry._id} className={`p-3 rounded-lg border ${entry.type === 'PAYMENT' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-orange-50/50 border-orange-100'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${entry.type === 'PAYMENT' ? 'text-emerald-700' : 'text-orange-700'}`}>
                          {entry.type === 'PAYMENT' ? 'PAYMENT' : 'PURCHASE'}
                          {entry.paymentMode && ` • ${entry.paymentMode}`}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(entry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <span className={`font-bold text-sm ${entry.type === 'PAYMENT' ? 'text-emerald-700' : 'text-orange-700'}`}>
                        {entry.type === 'PAYMENT' ? '-' : '+'}{formatPaise(Math.abs(entry.amountPaise))}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-end">
                      Balance: {formatPaise(entry.balanceAfterPaise)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
