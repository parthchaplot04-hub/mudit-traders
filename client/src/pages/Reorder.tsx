import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

interface ReorderItem {
  productId: string;
  productName: string;
  currentStock: number;
  stockUnit: string;
  reorderLevel: number;
  suggestedOrderQuantity: number;
  purchaseUnit: string;
  supplier?: { supplierName: string } | null;
  status: string;
}

export default function Reorder() {
  const { data, isLoading } = useQuery<{ items: ReorderItem[] }>({
    queryKey: ["reorder"],
    queryFn: async () => (await api.get("/reorder")).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Reorder</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Current Stock</th>
              <th className="text-right px-4 py-3">Reorder Level</th>
              <th className="text-right px-4 py-3">Suggested Order</th>
              <th className="text-left px-4 py-3">Supplier</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading...</td></tr>}
            {data?.items.map((i) => (
              <tr key={i.productId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{i.productName}</td>
                <td className="px-4 py-3 text-right">{i.currentStock} {i.stockUnit}</td>
                <td className="px-4 py-3 text-right">{i.reorderLevel} {i.stockUnit}</td>
                <td className="px-4 py-3 text-right">{i.suggestedOrderQuantity} {i.purchaseUnit}</td>
                <td className="px-4 py-3 text-slate-600">{i.supplier?.supplierName || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
              </tr>
            ))}
            {data && data.items.length === 0 && !isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Everything is well stocked 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Orders are never placed automatically — this list is for the owner to review and approve.</p>
    </div>
  );
}
