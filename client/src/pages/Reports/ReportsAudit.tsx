import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ShieldCheck } from "lucide-react";

type ReportContext = {
  rangeType: string;
  customStart: string;
  customEnd: string;
};

export default function ReportsAudit() {
  const { rangeType, customStart, customEnd } = useOutletContext<ReportContext>();
  const [data, setData] = useState<{items: any[], total: number, page: number, pages: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rangeType, customStart, customEnd]);

  useEffect(() => {
    async function fetchAudit() {
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

        const res = await axios.get("/api/reports/audit", {
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
    fetchAudit();
  }, [rangeType, customStart, customEnd, page]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center gap-2 print:hidden">
        <ShieldCheck className="text-slate-600" size={20} />
        <div>
          <h2 className="text-lg font-semibold text-slate-800">System Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track modifications, deletions, and adjustments for security.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Date & Time</th>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Module/Entity</th>
              <th className="px-6 py-3 w-1/3">Notes / Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading audit logs...</td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No audit records found for this period.</td>
              </tr>
            ) : (
              data?.items.map((item) => (
                <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                    {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm:ss")}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">
                    {item.userId?.name || "System"}
                    <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.userId?.role}</span>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {item.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {item.entityType} <br/>
                    <span className="text-xs text-slate-400">ID: {item.entityId}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {item.notes || "-"}
                    {item.oldValue && (
                      <div className="mt-1 text-xs bg-slate-50 p-2 rounded border border-slate-200">
                        <strong>Changed:</strong> {JSON.stringify(item.newValue)}
                      </div>
                    )}
                  </td>
                </tr>
              ))
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
