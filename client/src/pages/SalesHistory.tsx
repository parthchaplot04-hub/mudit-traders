import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Eye, X, ChevronLeft, ChevronRight, FileText, Package } from "lucide-react";

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  const limit = 25;

  useEffect(() => {
    async function fetchSales() {
      setLoading(true);
      try {
        const res = await axios.get("/api/sales", {
          params: { page, limit },
          withCredentials: true
        });
        
        if (res.data && res.data.items) {
          setSales(res.data.items);
          setTotal(res.data.total || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, [page]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <FileText className="h-6 w-6 text-emerald-600" />
          Sales History
        </h1>
        <p className="text-slate-500 text-sm mt-1">View all past POS sales and their details.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Bill No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Billed By</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400 animate-pulse">Loading sales...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">No sales found.</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50 print:break-inside-avoid cursor-pointer" onClick={() => setSelectedSale(s)}>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(s.createdAt), "dd MMM yyyy, p")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.billNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{s.customerId?.name || s.customerName || "Walk-in"}</td>
                    <td className="px-4 py-3">{s.createdBy?.name || "-"}</td>
                    <td className="px-4 py-3 text-right">₹{(s.subtotalPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">₹{(s.discountPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">₹{(s.totalGstPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{(s.totalPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {s.payments?.length > 0 ? s.payments.map((p: any) => p.method).join(", ") : (s.paymentType || "CASH")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center print:hidden">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedSale(s); }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between print:hidden bg-slate-50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{(page - 1) * limit + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, total)}</span> of <span className="font-medium text-slate-900">{total}</span> results
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded border border-slate-300 bg-white disabled:opacity-50 hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded border border-slate-300 bg-white disabled:opacity-50 hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" onClick={() => setSelectedSale(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Sale Details</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">{selectedSale.billNumber}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-sm">
                <div>
                  <span className="text-slate-400 block mb-1 text-xs uppercase font-bold tracking-wider">Date</span> 
                  <span className="font-medium text-slate-800">{format(new Date(selectedSale.createdAt), "dd MMM yyyy, p")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 text-xs uppercase font-bold tracking-wider">Customer</span> 
                  <span className="font-medium text-slate-800">{selectedSale.customerId?.name || selectedSale.customerName || "Walk-in"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 text-xs uppercase font-bold tracking-wider">Status</span> 
                  <span className="font-medium text-emerald-600">{selectedSale.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 text-xs uppercase font-bold tracking-wider">Payment</span> 
                  <span className="font-medium text-slate-800">{selectedSale.payments?.length > 0 ? selectedSale.payments.map((p: any) => p.method).join(", ") : selectedSale.paymentType}</span>
                </div>
              </div>
              
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Package size={18} className="text-slate-400" /> Items Sold
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold text-right">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Price</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedSale.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.productName}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">₹{(item.unitPricePaise / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{(item.totalPaise / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700">Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 text-lg">₹{(selectedSale.totalPaise / 100).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded font-bold hover:bg-slate-900 transition">
                 Print Bill
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
