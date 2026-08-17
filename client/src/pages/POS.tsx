import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Minus, Trash2 } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatPaise } from "../utils/format";
import type { CartLine, Product } from "../types";
import { useAuth } from "../hooks/useAuth";
import { Invoice } from "../components/Invoice";

type PaymentType = "CASH" | "UPI" | "CHEQUE" | "CREDIT";

export default function POS() {
  const { isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountRupees, setDiscountRupees] = useState(0);
  const [payments, setPayments] = useState<{ method: PaymentType, amount: number }[]>([]);
  const [currentPaymentMode, setCurrentPaymentMode] = useState<PaymentType>("CASH");
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<number | "">("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [lastBill, setLastBill] = useState<any>(null);

  const hasCredit = payments.some(p => p.method === "CREDIT");

  const { data: searchResults } = useQuery<{ items: Product[] }>({
    queryKey: ["product-search", search],
    queryFn: async () =>
      (await api.get("/products", { params: { q: search, active: "true", limit: 15 } })).data,
    enabled: search.trim().length > 0,
  });

  const { data: customers } = useQuery<{ items: { _id: string; name: string }[] }>({
    queryKey: ["customers-lite"],
    queryFn: async () => {
      try {
        return (await api.get("/customers")).data;
      } catch {
        return { items: [] }; // customer routes are optional in this slice
      }
    },
    enabled: hasCredit,
  });

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product._id === product._id);
      if (existing) {
        return prev.map((l) =>
          l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearch("");
  }

  function updateQty(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product._id !== productId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.product._id === productId ? { ...l, quantity } : l)));
  }

  const subtotalPaise = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.sellingPricePaise * l.quantity, 0),
    [cart]
  );
  const gstPaise = useMemo(
    () =>
      cart.reduce(
        (sum, l) =>
          sum + Math.round((l.product.sellingPricePaise * l.quantity * l.product.gstRate) / 100),
        0
      ),
    [cart]
  );
  const discountPaise = Math.round(discountRupees * 100);
  const totalPaise = subtotalPaise + gstPaise - discountPaise;
  const remainingBalance = Math.max(0, (totalPaise - payments.reduce((acc, p) => acc + p.amount * 100, 0)) / 100);

  const saleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: hasCredit ? customerId : undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((l) => ({ productId: l.product._id, quantity: l.quantity })),
        discountRupees,
        payments: payments.map(p => ({ method: p.method, amountPaise: Math.round(p.amount * 100) })),
      };
      return (await api.post("/sales", payload)).data;
    },
    onSuccess: (data) => {
      setMessage({ type: "success", text: `Sale completed successfully. Bill ${data.sale.billNumber}.` });
      setLastBill(data.sale);
      setCart([]);
      setDiscountRupees(0);
      setPayments([]);
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      setMessage({ type: "error", text: `Unable to complete sale. No changes were made. ${getApiErrorMessage(err)}` });
    },
  });

  function completeSale() {
    setMessage(null);
    if (cart.length === 0) return;
    if (hasCredit && !customerId) {
      setMessage({ type: "error", text: "Select a customer for a credit sale." });
      return;
    }
    if (payments.length === 0) {
      setMessage({ type: "error", text: "Please add at least one payment method." });
      return;
    }
    saleMutation.mutate();
  }

  return (
    <div>
      <div className="print-hidden grid lg:grid-cols-5 gap-6">
        {/* Search + cart */}
      <div className="lg:col-span-3 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product by name, Hindi name, code..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchResults && searchResults.items.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {searchResults.items.map((p) => (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-0"
                >
                  <span>
                    <span className="font-medium text-slate-800">{p.productName}</span>
                    <span className="block text-xs text-slate-400">
                      Stock: {p.currentStock} {p.stockUnit}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formatPaise(p.sellingPricePaise)}/{p.salesUnit}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 min-h-[300px]">
          {cart.length === 0 && (
            <p className="text-slate-400 text-center py-16">Cart is empty — search a product above</p>
          )}
          {cart.map((line) => (
            <div key={line.product._id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{line.product.productName}</p>
                <p className="text-xs text-slate-400">
                  {formatPaise(line.product.sellingPricePaise)} / {line.product.salesUnit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(line.product._id, roundTo(line.quantity - 1, line.product.stockUnit))}
                  className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={line.quantity}
                  step={line.product.stockUnit === "kg" || line.product.stockUnit === "g" ? 0.1 : 1}
                  onChange={(e) => updateQty(line.product._id, parseFloat(e.target.value) || 0)}
                  className="w-16 text-center border border-slate-200 rounded-lg py-1.5"
                />
                <button
                  onClick={() => updateQty(line.product._id, roundTo(line.quantity + 1, line.product.stockUnit))}
                  className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="w-24 text-right font-semibold text-slate-800">
                {formatPaise(line.product.sellingPricePaise * line.quantity)}
              </p>
              <button
                onClick={() => updateQty(line.product._id, 0)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bill summary */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-4 space-y-4">
          <h2 className="font-bold text-slate-900">Bill Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatPaise(subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST</span>
              <span>{formatPaise(gstPaise)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Discount (₹)</span>
              <input
                type="number"
                min={0}
                value={discountRupees}
                onChange={(e) => setDiscountRupees(parseFloat(e.target.value) || 0)}
                className="w-24 text-right border border-slate-200 rounded-lg py-1 px-2"
              />
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span>
              <span>{formatPaise(Math.max(totalPaise, 0))}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Payment</p>
            
            {payments.length > 0 && (
              <div className="space-y-2 mb-4">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-sm">
                    <span className="font-bold text-slate-700">{p.method}</span>
                    <span className="font-bold text-slate-900">₹{p.amount.toFixed(2)}</span>
                    <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold hover:text-red-700">X</button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Add Payment</span>
                <span className="text-red-500">Remaining: ₹{remainingBalance.toFixed(2)}</span>
              </div>
              <input
                type="number"
                placeholder="Amount"
                value={currentPaymentAmount}
                onChange={(e) => setCurrentPaymentAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <div className="grid grid-cols-4 gap-1 mb-2">
                {(["CASH", "UPI", "CHEQUE", "CREDIT"] as PaymentType[]).map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setCurrentPaymentMode(pt)}
                    className={`py-1.5 rounded text-xs font-semibold border ${
                      currentPaymentMode === pt
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (currentPaymentAmount && typeof currentPaymentAmount === "number" && currentPaymentAmount > 0) {
                    setPayments(prev => [...prev, { method: currentPaymentMode, amount: currentPaymentAmount }]);
                    setCurrentPaymentAmount("");
                  }
                }}
                disabled={!currentPaymentAmount}
                className="w-full py-2 bg-slate-800 text-white font-bold rounded text-xs hover:bg-slate-900 disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          </div>

          {hasCredit ? (
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg py-2.5 px-3"
            >
              <option value="">Select ledger customer...</option>
              {customers?.items.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Walk-in Customer (Optional)</p>
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          {message && (
            <p
              className={`text-sm rounded-lg px-3 py-2 border ${
                message.type === "success"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-red-700 bg-red-50 border-red-200"
              }`}
            >
              {message.text}
            </p>
          )}

          {!lastBill ? (
            <button
              onClick={completeSale}
              disabled={cart.length === 0 || saleMutation.isPending}
              className="w-full py-3.5 rounded-lg bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 disabled:opacity-50"
            >
              {saleMutation.isPending ? "Processing..." : `Complete Sale — ${formatPaise(Math.max(totalPaise, 0))}`}
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full py-3.5 rounded-lg bg-slate-800 text-white font-bold text-base hover:bg-slate-900"
              >
                Print Bill
              </button>
              <button
                onClick={() => setLastBill(null)}
                className="w-full py-3.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-base hover:bg-slate-200"
              >
                Start New Sale
              </button>
            </div>
          )}

          {!isOwner && (
            <p className="text-xs text-slate-400 text-center">Prices are set by the owner and cannot be edited here.</p>
          )}
        </div>
      </div>
      </div>
      
      <Invoice 
        sale={lastBill} 
        customerName={hasCredit ? customers?.items.find(c => c._id === customerId)?.name : undefined} 
      />
    </div>
  );
}

function roundTo(value: number, unit: string) {
  if (unit === "kg" || unit === "g" || unit === "L" || unit === "ml") {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value);
}
