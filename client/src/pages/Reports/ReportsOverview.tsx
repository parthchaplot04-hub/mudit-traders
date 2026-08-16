import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

type ReportContext = {
  rangeType: string;
  customStart: string;
  customEnd: string;
};

// Colors for charts
const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8'];
// Print Colors (high contrast grayscale)
const PRINT_COLORS = ['#000000', '#444444', '#888888', '#CCCCCC'];

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
}

export default function ReportsOverview() {
  const { rangeType, customStart, customEnd } = useOutletContext<ReportContext>();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
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

        const res = await axios.get("/api/reports/summary", {
          params: { startDate, endDate },
          withCredentials: true
        });
        setSummary(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch if dates are somewhat valid
    if (rangeType === "custom" && (!customStart || !customEnd)) return;
    
    fetchSummary();
  }, [rangeType, customStart, customEnd]);

  if (loading || !summary) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading summary...</div>;

  const paymentData = [
    { name: 'CASH', value: summary.cashCollected },
    { name: 'UPI', value: summary.upiCollected },
    { name: 'CREDIT', value: summary.creditSales },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Sales" value={formatINR(summary.totalSales)} desc={`${summary.itemsSold} items sold`} />
        <SummaryCard title="Total Purchases" value={formatINR(summary.totalPurchases)} desc={`${summary.itemsPurchased} items purchased`} />
        <SummaryCard title="Gross Profit (Est.)" value={formatINR(summary.grossProfit)} desc="Revenue minus estimated COGS" />
        <SummaryCard title="Inventory Value" value={formatINR(summary.currentInventoryValue)} desc="Current stock at cost price" />
        
        <SummaryCard title="Stock Added" value={summary.stockAdded.toString()} desc="Units across all purchases/returns" />
        <SummaryCard title="Stock Removed" value={summary.stockRemoved.toString()} desc="Units across all sales/wastage" />
        <SummaryCard title="UPI Collected" value={formatINR(summary.upiCollected)} desc="Via sales" />
        <SummaryCard title="Cash Collected" value={formatINR(summary.cashCollected)} desc="Via sales" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Sales vs Purchases Bar Chart (mock data for shape, ideally backend returns timeline data) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm print:break-inside-avoid">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Overall Financials</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Sales', amount: summary.totalSales / 100 },
                { name: 'Purchases', amount: summary.totalPurchases / 100 },
                { name: 'Gross Profit', amount: summary.grossProfit / 100 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={60} className="print:fill-slate-800" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm print:break-inside-avoid">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sales by Payment Method</h3>
          <div className="h-64">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="print:hidden" />
                    ))}
                    {/* Add high-contrast cells for print */}
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-print-${index}`} fill={PRINT_COLORS[index % PRINT_COLORS.length]} className="hidden print:block" />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => `₹${(Number(val)/100).toLocaleString('en-IN')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No payment data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, desc }: { title: string, value: string, desc: string }) {
  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-shadow print:shadow-none print:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider print:text-slate-800">{title}</h3>
      <div className="mt-2 text-2xl font-bold text-slate-800 print:text-slate-900 print:text-xl">{value}</div>
      <p className="mt-1 text-xs text-slate-400 print:text-slate-600">{desc}</p>
    </div>
  );
}
