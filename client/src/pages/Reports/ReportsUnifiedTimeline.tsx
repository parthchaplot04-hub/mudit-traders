import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { List } from "lucide-react";

type ReportContext = {
  rangeType: string;
  customStart: string;
  customEnd: string;
};

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
}

export default function ReportsUnifiedTimeline() {
  const { rangeType, customStart, customEnd } = useOutletContext<ReportContext>();
  const [data, setData] = useState<{items: any[], total: number, page: number, pages: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rangeType, customStart, customEnd]);

  useEffect(() => {
    async function fetchTransactions() {
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

        const res = await axios.get("/api/reports/transactions", {
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
    fetchTransactions();
  }, [rangeType, customStart, customEnd, page]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center gap-2 print:hidden">
        <List className="text-slate-600" size={20} />
        <h2 className="text-lg font-semibold text-slate-800">Unified Transaction Timeline</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Date & Time</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Reference ID</th>
              <th className="px-6 py-3">Party (Cust/Supp)</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3">Payment</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">User</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading timeline...</td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No transactions found for this period.</td>
              </tr>
            ) : (
              data?.items.map((item) => {
                return (
                  <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      {format(new Date(item.date), "dd MMM yyyy, p")}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.type === "SALE" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">{item.referenceId}</td>
                    <td className="px-6 py-3 text-slate-700">{item.party || "-"}</td>
                    <td className={`px-6 py-3 text-right font-bold ${
                      item.type === "SALE" ? "text-emerald-600" : "text-blue-600"
                    }`}>
                      {formatINR(item.amount)}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{item.paymentMethod}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === "COMPLETED" ? "text-slate-600 bg-slate-100" : "text-red-700 bg-red-100"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{item.user}</td>
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
