import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Edit2, Search } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatPaise } from "../utils/format";
import type { Product, Supplier } from "../types";

interface DraftLine {
  product: Product;
  purchaseQuantity: number | string;
  rateBeforeGstRupees: number | string;
}

export default function Purchases() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<"CASH" | "UPI" | "CHEQUE" | "CREDIT">("CREDIT");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: purchases, isLoading } = useQuery<{ items: any[] }>({
    queryKey: ["purchases"],
    queryFn: async () => (await api.get("/purchases", { params: { limit: 50 } })).data,
  });

  const { data: suppliers } = useQuery<{ items: Supplier[] }>({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data,
  });

  const { data: productResults } = useQuery<{ items: Product[] }>({
    queryKey: ["product-search-purchase", productQuery],
    queryFn: async () => (await api.get("/products", { params: { q: productQuery, limit: 10 } })).data,
    enabled: productQuery.trim().length > 0,
  });

  function addLine(product: Product) {
    setLines((prev) => [...prev, { product, purchaseQuantity: 1, rateBeforeGstRupees: "" }]);
    setProductQuery("");
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        supplierId,
        invoiceNumber,
        invoiceDate,
        paymentType,
        items: lines.map((l) => ({
          productId: l.product._id,
          purchaseQuantity: parseFloat(l.purchaseQuantity as string) || 0,
          rateBeforeGstRupees: parseFloat(l.rateBeforeGstRupees as string) || 0,
        })),
      };
      if (editingPurchaseId) {
        return (await api.put(`/purchases/${editingPurchaseId}`, payload)).data;
      }
      return (await api.post("/purchases", payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setEditingPurchaseId(null);
      setLines([]);
      setSupplierId("");
      setInvoiceNumber("");
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function submit() {
    setError(null);
    if (!supplierId || !invoiceNumber || lines.length === 0) {
      setError("Select a supplier, enter an invoice number, and add at least one product.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Purchases</h1>
        <button
          onClick={() => {
            setEditingPurchaseId(null);
            setSupplierId("");
            setInvoiceNumber("");
            setInvoiceDate(new Date().toISOString().slice(0, 10));
            setPaymentType("CREDIT");
            setLines([]);
            setError(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
        >
          <Plus size={16} /> New Purchase
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by invoice number, supplier name, or date..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Invoice</th>
              <th className="text-left px-4 py-3">Supplier</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>}
            {purchases?.items
              .filter((p) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                const invoiceMatch = p.invoiceNumber.toLowerCase().includes(q);
                const supplierMatch = (suppliers?.items.find((s) => s._id === p.supplierId)?.supplierName || "Unknown").toLowerCase().includes(q);
                const dateMatch = new Date(p.invoiceDate).toLocaleDateString("en-IN").includes(q);
                return invoiceMatch || supplierMatch || dateMatch;
              })
              .map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.invoiceNumber}</td>
                <td className="px-4 py-3 text-slate-800 font-medium">
                  {suppliers?.items.find((s) => s._id === p.supplierId)?.supplierName || "Unknown"}
                </td>
                <td className="px-4 py-3 text-slate-600">{new Date(p.invoiceDate).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-slate-600">{p.items.length} product(s)</td>
                <td className="px-4 py-3 text-slate-600">{p.paymentType}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatPaise(p.totalAmountPaise)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingPurchaseId(p._id);
                      setSupplierId(p.supplierId);
                      setInvoiceNumber(p.invoiceNumber);
                      setInvoiceDate(new Date(p.invoiceDate).toISOString().slice(0, 10));
                      setPaymentType(p.paymentType as any);
                      setLines(
                        p.items.map((item: any) => ({
                          product: {
                            _id: item.productId,
                            productName: item.productName,
                            purchaseUnit: item.purchaseUnit,
                            conversionFactor: item.conversionFactor,
                            stockUnit: "",
                          } as any,
                          purchaseQuantity: item.purchaseQuantity,
                          rateBeforeGstRupees: item.rateBeforeGstPaise / 100,
                        }))
                      );
                      setError(null);
                      setShowForm(true);
                    }}
                    className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {purchases && purchases.items.length === 0 && !isLoading && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">No purchases recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editingPurchaseId ? "Edit Purchase" : "New Purchase"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
                <option value="">Select supplier...</option>
                {suppliers?.items.map((s) => <option key={s._id} value={s._id}>{s.supplierName}</option>)}
              </select>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as any)} className="input">
                <option value="CREDIT">Credit</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Invoice number" className="input" />
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input" />
            </div>

            <div className="relative mb-3">
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search product to add to this invoice..."
                className="input w-full"
              />
              {productResults && productResults.items.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {productResults.items.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => addLine(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-slate-100 last:border-0 text-sm"
                    >
                      {p.productName} <span className="text-xs text-slate-400">({p.purchaseUnit} → {p.conversionFactor} {p.stockUnit})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{line.product.productName}</p>
                    <p className="text-xs text-slate-400">
                      = {((parseFloat(line.purchaseQuantity as string) || 0) * line.product.conversionFactor).toFixed(3)} {line.product.stockUnit} added to stock
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Qty ({line.product.purchaseUnit})</label>
                    <input
                      type="number" step="0.001" value={line.purchaseQuantity}
                      onChange={(e) => updateLine(idx, { purchaseQuantity: e.target.value })}
                      className="w-20 border border-slate-200 rounded-lg py-1 px-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Rate ₹ (before GST)</label>
                    <input
                      type="number" step="0.01" value={line.rateBeforeGstRupees}
                      onChange={(e) => updateLine(idx, { rateBeforeGstRupees: e.target.value })}
                      className="w-24 border border-slate-200 rounded-lg py-1 px-2 text-sm"
                    />
                  </div>
                  <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {lines.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No products added yet</p>}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <button
              onClick={submit}
              disabled={createMutation.isPending}
              className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {createMutation.isPending ? "Saving..." : (editingPurchaseId ? "Save Changes" : "Save Purchase")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
