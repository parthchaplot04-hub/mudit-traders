import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { TrendingUp, Activity, DollarSign } from "lucide-react";

type ReportContext = {
  rangeType: string;
  customStart: string;
  customEnd: string;
};

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
}

export default function ReportsProfit() {
  const { rangeType, customStart, customEnd } = useOutletContext<ReportContext>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProfit() {
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

        const res = await axios.get("/api/reports/profit", {
          params: { startDate, endDate },
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
    fetchProfit();
  }, [rangeType, customStart, customEnd]);

  if (loading || !data) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading profit analysis...</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 print:border-slate-300">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
            <DollarSign size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Gross Sales</h3>
            <div className="text-2xl font-bold text-slate-800">{formatINR(data.totalSales)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 print:border-slate-300">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Cost of Goods Sold (Est.)</h3>
            <div className="text-2xl font-bold text-slate-800">{formatINR(data.cogs)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 print:border-slate-300">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Gross Margin</h3>
            <div className="text-2xl font-bold text-slate-800">{data.grossMargin.toFixed(2)}%</div>
            <p className="text-xs text-emerald-600 font-medium">Profit: {formatINR(data.grossProfit)}</p>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800">Product Profitability Analysis</h2>
          <p className="text-sm text-slate-500">Products sold during this period ranked by total profit generated.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3 text-right">Qty Sold</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">COGS</th>
                <th className="px-6 py-3 text-right">Gross Profit</th>
                <th className="px-6 py-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No sales recorded for this period.</td>
                </tr>
              ) : (
                data.products.map((p: any, idx: number) => {
                  const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 print:break-inside-avoid">
                      <td className="px-6 py-3 font-medium text-slate-800">{p.productName}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{p.qtySold}</td>
                      <td className="px-6 py-3 text-right text-slate-800 font-medium">{formatINR(p.revenue)}</td>
                      <td className="px-6 py-3 text-right text-slate-500">{formatINR(p.cogs)}</td>
                      <td className="px-6 py-3 text-right text-emerald-600 font-bold">{formatINR(p.profit)}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
