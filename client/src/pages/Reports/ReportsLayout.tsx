import { Outlet, NavLink } from "react-router-dom";
import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { FileText, Download, Printer } from "lucide-react";

export type DateRangeType = "today" | "yesterday" | "this_week" | "this_month" | "this_year" | "custom";

export default function ReportsLayout() {
  const [rangeType, setRangeType] = useState<DateRangeType>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { name: "Overview", path: "/reports" },
    { name: "Sales", path: "/reports/sales" },
    { name: "Purchases", path: "/reports/purchases" },
    { name: "Stock Movement", path: "/reports/stock" },
    { name: "Profit & Loss", path: "/reports/profit" },
    { name: "All Transactions", path: "/reports/transactions" },
    { name: "Audit Log", path: "/reports/audit" }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header (Hidden when printing) */}
      <div className="print:hidden p-6 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-slate-600" />
              Reports & Business Records
            </h1>
            <p className="text-slate-500 text-sm mt-1">Complete overview of sales, purchases, inventory, and activity.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value as DateRangeType)}
              className="px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {rangeType === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            )}

            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition">
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-6 border-b border-slate-200 overflow-x-auto hide-scrollbar pb-[1px]">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === "/reports"}
              className={({ isActive }) => 
                `whitespace-nowrap py-2 border-b-2 font-medium transition-colors ${
                  isActive 
                  ? "border-slate-800 text-slate-800" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`
              }
            >
              {tab.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-auto print:p-0 print:overflow-visible bg-slate-50 print:bg-white">
        
        {/* Professional Print Header */}
        <div className="hidden print:flex flex-col mb-8 border-b-2 border-slate-800 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src="/logo.jpg" alt="Mudit Traders Logo" className="w-16 h-16 rounded-full grayscale" />
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900">MUDIT TRADERS</h1>
                <p className="text-slate-600 font-medium">Kirana Store & Wholesale</p>
                <p className="text-slate-500 text-sm mt-1">123 Market Street, Indore, MP 452001</p>
                <p className="text-slate-500 text-sm">Phone: +91 98765 43210</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-800 uppercase">BUSINESS REPORT</h2>
              <div className="mt-2 text-slate-600 bg-slate-100 px-3 py-1 rounded inline-block font-medium">
                Period: {rangeType === 'custom' ? `${customStart} to ${customEnd}` : rangeType.replace("_", " ").toUpperCase()}
              </div>
              <p className="text-xs text-slate-500 mt-2">Generated on: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
            </div>
          </div>
        </div>

        {/* The child routes will need access to the selected date range. 
            We can pass it via context or just use React Router Outlet context. */}
        <div className="print:text-sm">
          <Outlet context={{ rangeType, customStart, customEnd }} />
        </div>

        {/* Professional Print Footer */}
        <div className="hidden print:flex justify-between items-end mt-16 pt-8 border-t border-slate-300 page-break-inside-avoid">
          <div className="text-xs text-slate-400">
            * This is a computer generated report and does not require a physical signature.
            <br />
            * Page 1 of 1
          </div>
          <div className="text-center mr-8">
            <div className="w-40 border-b border-slate-800 mb-2"></div>
            <p className="text-sm font-semibold text-slate-800">Authorized Signatory</p>
            <p className="text-xs text-slate-500">For MUDIT TRADERS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
