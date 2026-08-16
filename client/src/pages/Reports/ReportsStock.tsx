import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, AlertCircle, Search } from "lucide-react";

type ReportContext = {
  rangeType: string;
  customStart: string;
  customEnd: string;
};

function getTransactionBadge(type: string) {
  switch (type) {
    case "PURCHASE":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><ArrowUpRight size={14}/> Purchase</span>;
    case "SALE":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><ArrowDownRight size={14}/> Sale</span>;
    case "DAMAGE":
    case "EXPIRY":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle size={14}/> {type}</span>;
    case "CUSTOMER_RETURN":
    case "SUPPLIER_RETURN":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><RefreshCw size={14}/> Return</span>;
    case "POSITIVE_ADJUSTMENT":
    case "NEGATIVE_ADJUSTMENT":
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><AlertCircle size={14}/> Adjustment</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{type}</span>;
  }
}

export default function ReportsStock() {
  const { rangeType, customStart, customEnd } = useOutletContext<ReportContext>();
  const [data, setData] = useState<{items: any[], total: number, page: number, pages: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rangeType, customStart, customEnd]);

  useEffect(() => {
    async function fetchStock() {
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

        const res = await axios.get("/api/reports/stock-movements", {
          params: { startDate, endDate, page, limit: 25 },
          withCredentials: true
        });
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    if (rangeType === "custom" && (!customStart || !customEnd)) return;
    fetchStock();
  }, [rangeType, customStart, customEnd, page]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
        <h2 className="text-lg font-semibold text-slate-800">Stock Movements</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Date & Time</th>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Transaction Type</th>
              <th className="px-6 py-3 text-right">Qty Change</th>
              <th className="px-6 py-3 text-right">Stock Before</th>
              <th className="px-6 py-3 text-right">Stock After</th>
              <th className="px-6 py-3">User</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading stock movements...</td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No stock movements found for this period.</td>
              </tr>
            ) : (
              data?.items.map((item) => {
                const isOut = ["SALE", "DAMAGE", "EXPIRY", "SUPPLIER_RETURN", "NEGATIVE_ADJUSTMENT", "OTHER_OUT"].includes(item.transactionType);
                return (
                  <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      {format(new Date(item.createdAt), "dd MMM yyyy, p")}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {item.productId?.productName || "Unknown"}
                      <div className="text-xs text-slate-400 font-normal">{item.productId?.sku}</div>
                    </td>
                    <td className="px-6 py-3">
                      {getTransactionBadge(item.transactionType)}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isOut ? "-" : "+"}{item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500">{item.stockBeforeQty}</td>
                    <td className="px-6 py-3 text-right font-medium text-slate-800">{item.stockAfterQty}</td>
                    <td className="px-6 py-3 text-slate-600">{item.userId?.name || "System"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && data && data.pages > 1 && (
        <div className="p-4 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-sm text-slate-500">
            Showing page {data.page} of {data.pages} ({data.total} records)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={page === data.pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
