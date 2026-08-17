import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Search, Plus, X, Edit2, Trash2 } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatPaise } from "../utils/format";
import type { Product } from "../types";
import { useAuth } from "../hooks/useAuth";
import StatusBadge from "../components/StatusBadge";
import CsvToolbar from "../components/CsvToolbar";

const UNITS = ["kg", "g", "mg", "L", "ml", "pcs", "packet", "box", "carton", "tin", "bag"];

interface ProductForm {
  productCode: string;
  productName: string;
  hindiName?: string;
  category: string;
  stockUnit: string;
  purchaseUnit: string;
  salesUnit: string;
  conversionFactor: number;
  sellingPriceRupees: number;
  purchaseCostRupees: number;
  gstRate: number;
  reorderLevel: number;
  reorderQuantity: number;
  initialStock?: number;
}

export default function Products() {
  const { isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ items: Product[] }>({
    queryKey: ["products", search],
    queryFn: async () => (await api.get("/products", { params: { q: search, limit: 100 } })).data,
  });

  const { register, handleSubmit, reset } = useForm<ProductForm>({
    defaultValues: { gstRate: 0, purchaseCostRupees: 0, conversionFactor: 1, initialStock: 0 },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: ProductForm) => {
      if (editingProduct) {
        return (await api.put(`/products/${editingProduct._id}`, form)).data;
      }
      return (await api.post("/products", form)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setFormError(null);
      if (editingProduct) {
        setShowForm(false);
        setEditingProduct(null);
      } else {
        reset();
        setFormSuccess("Product added successfully! You can add another.");
        setTimeout(() => setFormSuccess(null), 3000);
      }
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/products/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => {
      alert("Could not delete product: " + getApiErrorMessage(err));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <div className="flex items-center gap-3">
          {isOwner && (
            <CsvToolbar
              exportPath="/csv/products/export"
              importPath="/csv/products/import"
              downloadFilename="products.csv"
              onImported={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
            />
          )}
          {isOwner && (
            <button
              onClick={() => {
                setEditingProduct(null);
                reset({ gstRate: 0, purchaseCostRupees: 0, conversionFactor: 1, initialStock: 0 });
                setFormError(null);
                setFormSuccess(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, category, Hindi name..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td></tr>
            )}
            {data?.items.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{p.productName}</p>
                  <p className="text-xs text-slate-400">{p.productCode}{p.hindiName ? ` · ${p.hindiName}` : ""}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.category}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {p.currentStock} {p.stockUnit}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  {formatPaise(p.sellingPricePaise)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.reorderStatus || (p.currentStock <= p.reorderLevel ? "ORDER_REQUIRED" : "OK")} />
                </td>
                <td className="px-4 py-3 text-right">
                  {isOwner && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          reset({
                            productCode: p.productCode,
                            productName: p.productName,
                            hindiName: p.hindiName || "",
                            category: p.category,
                            stockUnit: p.stockUnit,
                            purchaseUnit: p.purchaseUnit,
                            salesUnit: p.salesUnit,
                            conversionFactor: p.conversionFactor,
                            sellingPriceRupees: p.sellingPricePaise / 100,
                            purchaseCostRupees: p.purchaseCostPaise / 100,
                            gstRate: p.gstRate,
                            reorderLevel: p.reorderLevel,
                            reorderQuantity: p.reorderQuantity,
                            initialStock: undefined,
                          });
                          setFormError(null);
                          setFormSuccess(null);
                          setShowForm(true);
                        }}
                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                        title="Edit Product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to completely delete "${p.productName}"?`)) {
                            deleteMutation.mutate(p._id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && !isLoading && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form
              onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input {...register("productCode", { required: true })} placeholder="Product code" className="input" />
                <input {...register("category", { required: true })} placeholder="Category" className="input" />
              </div>
              <input {...register("productName", { required: true })} placeholder="Product name" className="input w-full" />
              <input {...register("hindiName")} placeholder="Hindi name (optional)" className="input w-full" />

              <div className="grid grid-cols-3 gap-3">
                <select {...register("stockUnit", { required: true })} className="input">
                  {UNITS.map((u) => <option key={u} value={u}>{u} (stock)</option>)}
                </select>
                <select {...register("purchaseUnit", { required: true })} className="input">
                  {UNITS.map((u) => <option key={u} value={u}>{u} (purchase)</option>)}
                </select>
                <select {...register("salesUnit", { required: true })} className="input">
                  {UNITS.map((u) => <option key={u} value={u}>{u} (sales)</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500">
                  Conversion factor: how many stock units in 1 purchase unit (e.g. 1 tin = 15kg → 15)
                </label>
                <input
                  {...register("conversionFactor", { required: true, valueAsNumber: true })}
                  type="number" step="1" className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Selling price (₹)</label>
                  <input {...register("sellingPriceRupees", { required: true, valueAsNumber: true })} type="number" step="0.01" className="input w-full" />
                </div>
                {!editingProduct && (
                  <div>
                    <label className="text-xs text-slate-500">Current available quantity</label>
                    <input {...register("initialStock", { valueAsNumber: true })} type="number" step="0.001" className="input w-full" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Reorder level</label>
                  <input {...register("reorderLevel", { required: true, valueAsNumber: true })} type="number" step="0.001" className="input w-full" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Reorder quantity</label>
                  <input {...register("reorderQuantity", { required: true, valueAsNumber: true })} type="number" step="0.001" className="input w-full" />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              {formSuccess && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{formSuccess}</p>}

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving..." : (editingProduct ? "Save Changes" : "Save Product")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
