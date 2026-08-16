import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { Eye, X, ChevronLeft, ChevronRight } from "lucide-react";

type ReportContext = {
  rangeType: string;
  customStart: string;
  customEnd: string;
};

export default function ReportsSales() {
  const { rangeType, customStart, customEnd } = useOutletContext<ReportContext>();
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
        let startDate = "";
        let endDate = "";

        const now = new Date();
        if (rangeType === "today") {
          startDate = format(now, "yyyy-MM-dd");
          endDate = format(now, "yyyy-MM-dd");
        } else if (rangeType === "yesterday") {
          const yest = subDays(now, 1);
          startDate = format(yest, "yyyy-MM-dd");
          endDate = format(yest, "yyyy-MM-dd");
        } else if (rangeType === "this_week") {
          startDate = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
          endDate = format(now, "yyyy-MM-dd");
        } else if (rangeType === "this_month") {
          startDate = format(startOfMonth(now), "yyyy-MM-dd");
          endDate = format(now, "yyyy-MM-dd");
        } else if (rangeType === "this_year") {
          startDate = format(startOfYear(now), "yyyy-MM-dd");
          endDate = format(now, "yyyy-MM-dd");
        } else if (rangeType === "custom") {
          startDate = customStart;
          endDate = customEnd;
        }

        const res = await axios.get("/api/reports/sales", {
          params: { startDate, endDate, page, limit },
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

    if (rangeType === "custom" && (!customStart || !customEnd)) return;
    fetchSales();
  }, [rangeType, customStart, customEnd, page]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Bill No</th>
                <th className="px-4 py-3">Customer</th>
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
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400 animate-pulse">Loading sales...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No sales found for this period.</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50 print:break-inside-avoid">
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(s.createdAt), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3 font-medium">{s.billNumber}</td>
                    <td className="px-4 py-3">{s.customerId?.name || "-"}</td>
                    <td className="px-4 py-3 text-right">₹{(s.subtotalPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">₹{(s.discountPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">₹{(s.totalGstPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{(s.totalPaise / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">{s.paymentType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center print:hidden">
                      <button onClick={() => setSelectedSale(s)} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="View Details">
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
          <div className="p-4 border-t border-slate-200 flex items-center justify-between print:hidden">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50 print:break-inside-avoid"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded border border-slate-200 disabled:opacity-50 hover:bg-slate-50 print:break-inside-avoid"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" onClick={() => setSelectedSale(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Sale Details: {selectedSale.billNumber}</h3>
              <button onClick={() => setSelectedSale(null)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-slate-500 block mb-1">Date</span> {format(new Date(selectedSale.createdAt), "dd MMM yyyy, hh:mm a")}</div>
                <div><span className="text-slate-500 block mb-1">Customer</span> {selectedSale.customerId?.name || "-"}</div>
                <div><span className="text-slate-500 block mb-1">Status</span> {selectedSale.status}</div>
                <div><span className="text-slate-500 block mb-1">Payment Method</span> {selectedSale.paymentType}</div>
              </div>
              
              <h4 className="font-medium text-slate-800 mb-3">Items Sold</h4>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{(item.unitPricePaise / 100).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">₹{(item.totalPaise / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
