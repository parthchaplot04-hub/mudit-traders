import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatPaise } from "../utils/format";

interface DashboardResponse {
  today: {
    salesPaise: number;
    billCount: number;
    averageBillPaise: number;
    cashSalesPaise: number;
    upiSalesPaise: number;
    creditSalesPaise: number;
    purchasesPaise: number;
    estimatedGrossProfitPaise: number;
  };
  inventory: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    inventoryValuePaise: number;
    wastageValueThisMonthPaise: number;
  };
  suppliers: {
    totalOutstandingPaise: number;
    topOutstandingSuppliers: { supplierName: string; outstandingPaise: number }[];
  };
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
    refetchInterval: 60_000,
  });

  if (isLoading) return <p className="text-slate-500">Loading dashboard...</p>;
  if (isError || !data) return <p className="text-red-600">Unable to load dashboard data.</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Today at a glance</h1>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Sales</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Today's Sales" value={formatPaise(data.today.salesPaise)} />
          <Card label="Today's Bills" value={String(data.today.billCount)} />
          <Card label="Average Bill" value={formatPaise(data.today.averageBillPaise)} />
          <Card label="Est. Gross Profit" value={formatPaise(data.today.estimatedGrossProfitPaise)} />
          <Card label="Cash Sales" value={formatPaise(data.today.cashSalesPaise)} />
          <Card label="UPI Sales" value={formatPaise(data.today.upiSalesPaise)} />
          <Card label="Credit Sales" value={formatPaise(data.today.creditSalesPaise)} />
          <Card label="Today's Purchases" value={formatPaise(data.today.purchasesPaise)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Total Products" value={String(data.inventory.totalProducts)} />
          <Card label="Low Stock" value={String(data.inventory.lowStock)} />
          <Card label="Out of Stock" value={String(data.inventory.outOfStock)} />
          <Card label="Inventory Value" value={formatPaise(data.inventory.inventoryValuePaise)} />
          <Card label="Wastage (this month)" value={formatPaise(data.inventory.wastageValueThisMonthPaise)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Suppliers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card label="Total Outstanding" value={formatPaise(data.suppliers.totalOutstandingPaise)} />
        </div>
        {data.suppliers.topOutstandingSuppliers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {data.suppliers.topOutstandingSuppliers.map((s) => (
              <div key={s.supplierName} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-slate-700">{s.supplierName}</span>
                <span className="font-semibold text-slate-900">{formatPaise(s.outstandingPaise)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
