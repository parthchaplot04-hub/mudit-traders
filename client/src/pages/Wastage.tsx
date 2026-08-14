import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatPaise } from "../utils/format";
import type { Product } from "../types";

const REASONS = ["Damaged", "Expired", "Leakage", "Spoiled", "Broken", "Other"];

export default function Wastage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ items: any[] }>({
    queryKey: ["wastage"],
    queryFn: async () => (await api.get("/wastage")).data,
  });

  const { data: productResults } = useQuery<{ items: Product[] }>({
    queryKey: ["product-search-wastage", productQuery],
    queryFn: async () => (await api.get("/products", { params: { q: productQuery, limit: 10 } })).data,
    enabled: productQuery.trim().length > 0,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post("/wastage", { productId: selected!._id, quantity: parseFloat(quantity), reason })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wastage"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setSelected(null);
      setQuantity("");
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Wastage</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
        >
          <Plus size={16} /> Record Wastage
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="text-right px-4 py-3">Quantity</th>
              <th className="text-right px-4 py-3">Est. Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={4} className="text-center py-10 text-slate-400">Loading...</td></tr>}
            {data?.items.map((w) => (
              <tr key={w._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{new Date(w.createdAt).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-700">{w.reason}</td>
                <td className="px-4 py-3 text-right">{w.quantity} {w.unit}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatPaise(w.estimatedCostPaise)}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && !isLoading && (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400">No wastage recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Record Wastage</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  value={selected ? selected.productName : productQuery}
                  onChange={(e) => { setSelected(null); setProductQuery(e.target.value); }}
                  placeholder="Search product..."
                  className="input w-full"
                />
                {!selected && productResults && productResults.items.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {productResults.items.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => { setSelected(p); setProductQuery(""); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-slate-100 last:border-0 text-sm"
                      >
                        {p.productName} <span className="text-xs text-slate-400">({p.currentStock} {p.stockUnit} in stock)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Quantity${selected ? ` (${selected.stockUnit})` : ""}`} className="input w-full"
              />
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="input w-full">
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={() => mutation.mutate()}
                disabled={!selected || !quantity || mutation.isPending}
                className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
